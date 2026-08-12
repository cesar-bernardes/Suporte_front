"use client";

import { ClipboardList, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Role = "suporte" | "desenvolvedor" | "administrador";
type PortalUser = { id: string; name: string; email: string; role: Role; title: string };
type DailyLogEntry = {
  id: string; workDate: string; time: string; activity: string; observations: string;
  actions: string; assigneeId: string; createdBy: string; createdAt: string; updatedAt: string;
};
type DailyLogDraft = Pick<DailyLogEntry, "workDate" | "time" | "activity" | "observations" | "actions" | "assigneeId">;

function emptyDraft(userId: string, date: string): DailyLogDraft {
  return { workDate: date, time: "08:00", activity: "", observations: "", actions: "", assigneeId: userId };
}

export default function DailyLogTable({ currentUser, users, onNotify, periodStart, periodEnd, assigneeFilter, refreshVersion }: {
  currentUser: PortalUser; users: PortalUser[]; onNotify: (message: string) => void;
  periodStart: string; periodEnd: string; assigneeFilter: string;
  refreshVersion: number;
}) {
  const [entries, setEntries] = useState<DailyLogEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DailyLogDraft>>({});
  const [dirtyRows, setDirtyRows] = useState<Set<string>>(() => new Set());
  const dirtyRowsRef = useRef(dirtyRows);
  const [newEntry, setNewEntry] = useState(() => emptyDraft(currentUser.id, periodStart));
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const request = useCallback(async function request<T>(url: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (init.body) headers.set("Content-Type", "application/json");
    const response = await fetch(url, { ...init, headers, credentials: "same-origin" });
    const payload = await response.json().catch(() => ({})) as T & { message?: string };
    if (!response.ok) throw new Error(payload.message || "Não foi possível concluir a operação.");
    return payload;
  }, []);

  useEffect(() => {
    dirtyRowsRef.current = dirtyRows;
  }, [dirtyRows]);

  useEffect(() => {
    let active = true;
    const load = (background = false) => {
      if (!background) setLoading(true);
      void request<{ entries: DailyLogEntry[] }>("/api/daily-log")
      .then(({ entries: loaded }) => {
        if (!active) return;
        setEntries(loaded);
        setDrafts((current) => Object.fromEntries(loaded.map((entry) => [entry.id,
          dirtyRowsRef.current.has(entry.id) && current[entry.id] ? current[entry.id] : {
            workDate: entry.workDate, time: entry.time, activity: entry.activity,
            observations: entry.observations, actions: entry.actions, assigneeId: entry.assigneeId,
          },
        ])));
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Não foi possível carregar o diário."))
      .finally(() => active && setLoading(false));
    };
    const timer = window.setTimeout(() => load(refreshVersion > 0), 0);
    return () => {
      window.clearTimeout(timer);
      active = false;
    };
  }, [refreshVersion, request]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNewEntry((current) => current.activity || current.observations || current.actions ? current : { ...current, workDate: periodStart });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [periodStart]);

  const visibleEntries = useMemo(() => entries
    .filter((entry) => entry.workDate >= periodStart && entry.workDate < periodEnd)
    .filter((entry) => assigneeFilter === "all" || entry.assigneeId === assigneeFilter)
    .sort((a, b) => `${a.workDate} ${a.time}`.localeCompare(`${b.workDate} ${b.time}`)),
  [entries, periodStart, periodEnd, assigneeFilter]);

  function change(id: string, field: keyof DailyLogDraft, value: string) {
    setDirtyRows((current) => new Set(current).add(id));
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  async function add() {
    setSavingId("new"); setError("");
    try {
      const { entry } = await request<{ entry: DailyLogEntry }>("/api/daily-log", { method: "POST", body: JSON.stringify(newEntry) });
      setEntries((current) => [...current, entry]);
      setDrafts((current) => ({ ...current, [entry.id]: { ...newEntry } }));
      setNewEntry(emptyDraft(currentUser.id, newEntry.workDate));
      onNotify("Atividade adicionada ao diário.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível adicionar a atividade."); }
    finally { setSavingId(null); }
  }

  async function save(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id); setError("");
    try {
      const { entry } = await request<{ entry: DailyLogEntry }>("/api/daily-log", { method: "PATCH", body: JSON.stringify({ id, ...draft }) });
      setEntries((current) => current.map((item) => item.id === id ? entry : item));
      setDrafts((current) => ({ ...current, [id]: { ...draft } }));
      setDirtyRows((current) => { const next = new Set(current); next.delete(id); return next; });
      onNotify("Linha do diário atualizada.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar a linha."); }
    finally { setSavingId(null); }
  }

  async function remove(entry: DailyLogEntry) {
    if (!window.confirm(`Remover “${entry.activity}” da visualização? O registro continuará preservado no banco de dados.`)) return;
    setSavingId(entry.id); setError("");
    try {
      await request(`/api/daily-log?id=${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setDrafts((current) => { const next = { ...current }; delete next[entry.id]; return next; });
      setDirtyRows((current) => { const next = new Set(current); next.delete(entry.id); return next; });
      onNotify("Atividade removida da visualização. O histórico foi preservado.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível remover a atividade."); }
    finally { setSavingId(null); }
  }

  const assignee = (draft: DailyLogDraft, update: (value: string) => void, label: string) => currentUser.role === "suporte"
    ? <span className="daily-log-assignee">{currentUser.name}</span>
    : <select aria-label={label} value={draft.assigneeId} onChange={(event) => update(event.target.value)}>{users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select>;

  return <section className="card daily-log-card" aria-labelledby="daily-log-title">
    <header className="daily-log-header">
      <div className="daily-log-heading"><span><ClipboardList size={20}/></span><div><h2 id="daily-log-title">Diário de atividades</h2><p>Registre tarefas, reuniões, observações e encaminhamentos fora da agenda.</p></div></div>
      <small>{visibleEntries.length} {visibleEntries.length === 1 ? "registro no período" : "registros no período"}</small>
    </header>
    {error && <div className="daily-log-error" role="alert">{error}</div>}
    <div className="daily-log-table-wrap"><table className="daily-log-table">
      <thead><tr><th>Data</th><th>Horário</th><th>Atividade</th><th>Observações</th><th>Ações / encaminhamentos</th><th>Responsável</th><th aria-label="Controles"/></tr></thead>
      <tbody>
        <tr className="daily-log-new-row">
          <td><input type="date" aria-label="Data da nova atividade" value={newEntry.workDate} onChange={(event) => setNewEntry({ ...newEntry, workDate: event.target.value })}/></td>
          <td><input type="time" aria-label="Horário da nova atividade" value={newEntry.time} onChange={(event) => setNewEntry({ ...newEntry, time: event.target.value })}/></td>
          <td><textarea rows={2} aria-label="Nova atividade" placeholder="Ex.: Fazer reunião com o líder" value={newEntry.activity} onChange={(event) => setNewEntry({ ...newEntry, activity: event.target.value })}/></td>
          <td><textarea rows={2} aria-label="Observações da nova atividade" placeholder="Informações importantes" value={newEntry.observations} onChange={(event) => setNewEntry({ ...newEntry, observations: event.target.value })}/></td>
          <td><textarea rows={2} aria-label="Ações da nova atividade" placeholder="Próximos passos e responsáveis" value={newEntry.actions} onChange={(event) => setNewEntry({ ...newEntry, actions: event.target.value })}/></td>
          <td>{assignee(newEntry, (value) => setNewEntry({ ...newEntry, assigneeId: value }), "Responsável pela nova atividade")}</td>
          <td><button className="daily-log-button add" onClick={() => void add()} disabled={savingId !== null || newEntry.activity.trim().length < 3}><Plus size={16}/><span>Adicionar</span></button></td>
        </tr>
        {loading ? <tr><td colSpan={7} className="daily-log-empty">Carregando o diário…</td></tr> : visibleEntries.length === 0 ? <tr><td colSpan={7} className="daily-log-empty">Nenhuma atividade registrada neste período. Use a primeira linha para começar.</td></tr> : visibleEntries.map((entry) => {
          const draft = drafts[entry.id];
          if (!draft) return null;
          return <tr key={entry.id}>
            <td><input type="date" aria-label={`Data de ${entry.activity}`} value={draft.workDate} onChange={(event) => change(entry.id, "workDate", event.target.value)}/></td>
            <td><input type="time" aria-label={`Horário de ${entry.activity}`} value={draft.time} onChange={(event) => change(entry.id, "time", event.target.value)}/></td>
            <td><textarea rows={2} aria-label={`Atividade ${entry.activity}`} value={draft.activity} onChange={(event) => change(entry.id, "activity", event.target.value)}/></td>
            <td><textarea rows={2} aria-label={`Observações de ${entry.activity}`} value={draft.observations} onChange={(event) => change(entry.id, "observations", event.target.value)}/></td>
            <td><textarea rows={2} aria-label={`Ações de ${entry.activity}`} value={draft.actions} onChange={(event) => change(entry.id, "actions", event.target.value)}/></td>
            <td>{assignee(draft, (value) => change(entry.id, "assigneeId", value), `Responsável por ${entry.activity}`)}</td>
            <td><div className="daily-log-row-actions"><button className="icon-button daily-log-save" aria-label={`Salvar ${entry.activity}`} title="Salvar linha" onClick={() => void save(entry.id)} disabled={savingId !== null}><Save size={16}/></button>{currentUser.role === "administrador" && <button className="icon-button danger-icon-button" aria-label={`Remover ${entry.activity}`} title="Remover da visualização" onClick={() => void remove(entry)} disabled={savingId !== null}><Trash2 size={16}/></button>}</div></td>
          </tr>;
        })}
      </tbody>
    </table></div>
  </section>;
}
