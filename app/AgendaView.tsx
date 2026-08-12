"use client";

import {
  AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, Pencil, Play, Plus, Search, Square, Trash2, UserRound, X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import DailyLogTable from "./DailyLogTable";

type Role = "suporte" | "desenvolvedor" | "administrador";
type PortalUser = { id: string; name: string; email: string; role: Role; title: string };
type PortalClient = { id: string; name: string };
type AgendaType = "agendado" | "inesperado" | "interno";
type AgendaStatus = "planejado" | "em_andamento" | "concluido" | "cancelado";
type AgendaEntry = {
  id: string; type: AgendaType; title: string; description: string;
  clientId: string | null; assigneeId: string; createdBy: string;
  scheduledStart: string | null; estimatedMinutes: number | null;
  status: AgendaStatus; actualStart: string | null; actualEnd: string | null;
  outcome: string | null; createdAt: string; updatedAt: string;
};

const typeLabel: Record<AgendaType, string> = {
  agendado: "Atendimento agendado", inesperado: "Atendimento inesperado", interno: "Atividade interna",
};
const statusLabel: Record<AgendaStatus, string> = {
  planejado: "Planejado", em_andamento: "Em andamento", concluido: "Concluído", cancelado: "Cancelado",
};
const emptyDraft = (userId: string, clientId: string, internal = false) => ({
  type: (internal ? "interno" : "agendado") as AgendaType,
  title: "", description: "", clientId: internal ? "" : clientId, assigneeId: userId,
  scheduledStart: "", estimatedMinutes: "", recordCompleted: internal,
  recordedMinutes: "30", outcome: "",
});

function dateInput(date: Date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 10);
}
function dateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}
function startOfDay(date: Date) { const copy = new Date(date); copy.setHours(0, 0, 0, 0); return copy; }
function addDays(date: Date, days: number) { const copy = new Date(date); copy.setDate(copy.getDate() + days); return copy; }
function duration(entry: AgendaEntry) {
  if (!entry.actualStart || !entry.actualEnd) return null;
  return Math.max(1, Math.round((Date.parse(entry.actualEnd) - Date.parse(entry.actualStart)) / 60_000));
}
function durationLabel(minutes: number | null) {
  if (!minutes) return "Ainda não estimado";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60); const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

export default function AgendaView({ currentUser, users, clients, onNotify }: {
  currentUser: PortalUser; users: PortalUser[]; clients: PortalClient[];
  onNotify: (message: string) => void;
}) {
  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(dateInput(new Date()));
  const [assigneeFilter, setAssigneeFilter] = useState(currentUser.role === "suporte" ? currentUser.id : "all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => emptyDraft(currentUser.id, clients[0]?.id || ""));
  const [finishEntry, setFinishEntry] = useState<AgendaEntry | null>(null);
  const [finishOutcome, setFinishOutcome] = useState("");

  async function request<T>(url: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (init.body) headers.set("Content-Type", "application/json");
    const response = await fetch(url, { ...init, headers, credentials: "same-origin" });
    const payload = await response.json().catch(() => ({})) as T & { message?: string };
    if (!response.ok) throw new Error(payload.message || "Não foi possível concluir a operação.");
    return payload;
  }

  async function load() {
    setLoading(true); setError("");
    try { const payload = await request<{ entries: AgendaEntry[] }>("/api/agenda"); setEntries(payload.entries); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar a agenda."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const selected = new Date(`${selectedDate}T12:00:00`);
  const range = useMemo(() => {
    if (mode === "day") return { start: startOfDay(selected), end: addDays(startOfDay(selected), 1) };
    if (mode === "week") {
      const start = startOfDay(addDays(selected, -((selected.getDay() + 6) % 7)));
      return { start, end: addDays(start, 7) };
    }
    const start = new Date(selected.getFullYear(), selected.getMonth(), 1);
    return { start, end: new Date(selected.getFullYear(), selected.getMonth() + 1, 1) };
  }, [selectedDate, mode]);

  const filtered = entries.filter((entry) => {
    const moment = Date.parse(entry.scheduledStart || entry.actualStart || entry.createdAt);
    const text = `${entry.title} ${entry.description} ${clients.find((c) => c.id === entry.clientId)?.name || ""}`.toLocaleLowerCase("pt-BR");
    return moment >= range.start.getTime() && moment < range.end.getTime()
      && (assigneeFilter === "all" || entry.assigneeId === assigneeFilter)
      && (typeFilter === "all" || entry.type === typeFilter)
      && (statusFilter === "all" || entry.status === statusFilter)
      && (!query.trim() || text.includes(query.trim().toLocaleLowerCase("pt-BR")));
  });
  const plannedMinutes = filtered.filter((e) => e.status !== "cancelado").reduce((sum, e) => sum + (e.estimatedMinutes || 0), 0);
  const actualMinutes = filtered.reduce((sum, e) => sum + (duration(e) || 0), 0);
  const overlapping = useMemo(() => new Set(filtered.filter((entry, index) => {
    if (!entry.scheduledStart || !entry.estimatedMinutes || entry.status === "cancelado") return false;
    const start = Date.parse(entry.scheduledStart); const end = start + entry.estimatedMinutes * 60_000;
    return filtered.some((other, otherIndex) => {
      if (index === otherIndex || other.assigneeId !== entry.assigneeId || !other.scheduledStart || !other.estimatedMinutes || other.status === "cancelado") return false;
      const otherStart = Date.parse(other.scheduledStart); return start < otherStart + other.estimatedMinutes * 60_000 && end > otherStart;
    });
  }).map((entry) => entry.id)), [filtered]);

  function openNew(internal = false) {
    setEditingId(null); setDraft(emptyDraft(currentUser.id, clients[0]?.id || "", internal)); setFormOpen(true); setError("");
  }
  function openEdit(entry: AgendaEntry) {
    setEditingId(entry.id);
    setDraft({ type: entry.type, title: entry.title, description: entry.description, clientId: entry.clientId || "", assigneeId: entry.assigneeId, scheduledStart: dateTimeInput(entry.scheduledStart), estimatedMinutes: entry.estimatedMinutes ? String(entry.estimatedMinutes) : "", recordCompleted: false, recordedMinutes: "30", outcome: entry.outcome || "" });
    setFormOpen(true); setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const body = { ...draft, id: editingId, scheduledStart: draft.scheduledStart ? new Date(draft.scheduledStart).toISOString() : null, estimatedMinutes: draft.estimatedMinutes ? Number(draft.estimatedMinutes) : null, recordedMinutes: Number(draft.recordedMinutes) };
      const payload = await request<{ entry: AgendaEntry; overlap: boolean }>("/api/agenda", { method: editingId ? "PATCH" : "POST", body: JSON.stringify(body) });
      setEntries((current) => editingId ? current.map((entry) => entry.id === payload.entry.id ? payload.entry : entry) : [...current, payload.entry]);
      setFormOpen(false); onNotify(editingId ? "Compromisso atualizado." : payload.overlap ? "Item salvo. Atenção: existe conflito de horário." : "Item adicionado à agenda.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }
  async function action(entry: AgendaEntry, actionName: "start" | "finish", outcome = "") {
    setSaving(true); setError("");
    try {
      const payload = await request<{ entry: AgendaEntry }>("/api/agenda", { method: "PATCH", body: JSON.stringify({ id: entry.id, action: actionName, outcome }) });
      setEntries((current) => current.map((item) => item.id === entry.id ? payload.entry : item));
      setFinishEntry(null); setFinishOutcome(""); onNotify(actionName === "start" ? "Atividade iniciada. O tempo já está sendo contado." : "Atividade finalizada e tempo registrado.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível atualizar."); }
    finally { setSaving(false); }
  }
  async function remove(entry: AgendaEntry) {
    if (!window.confirm(`Remover “${entry.title}” da agenda? O histórico continuará preservado.`)) return;
    setSaving(true); setError("");
    try { await request(`/api/agenda?id=${encodeURIComponent(entry.id)}`, { method: "DELETE" }); setEntries((current) => current.filter((item) => item.id !== entry.id)); onNotify("Item removido da visualização. O histórico foi preservado."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível remover."); }
    finally { setSaving(false); }
  }
  function move(direction: number) {
    const amount = mode === "day" ? 1 : mode === "week" ? 7 : 32;
    const next = new Date(selected); next.setDate(next.getDate() + direction * amount); setSelectedDate(dateInput(next));
  }
  const days = mode === "month"
    ? Array.from({ length: 42 }, (_, index) => addDays(new Date(selected.getFullYear(), selected.getMonth(), 1), index - ((new Date(selected.getFullYear(), selected.getMonth(), 1).getDay() + 6) % 7)))
    : mode === "week" ? Array.from({ length: 7 }, (_, index) => addDays(range.start, index)) : [selected];

  return <>
    <div className="page-heading agenda-heading">
      <div><span className="eyebrow">Organização do suporte</span><h1>Agenda</h1><p>Planeje atendimentos, acompanhe o tempo real e registre as atividades do dia.</p></div>
      <div className="agenda-heading-actions"><button className="button button-secondary" onClick={() => openNew(true)}><CheckCircle2 size={18}/>Registrar atividade</button><button className="button button-primary" onClick={() => openNew()}><Plus size={18}/>Novo compromisso</button></div>
    </div>

    {error && <div className="agenda-alert" role="alert"><AlertTriangle size={18}/><span>{error}</span><button onClick={() => setError("")} aria-label="Fechar"><X size={16}/></button></div>}
    <section className="agenda-metrics">
      <div><span className="agenda-metric-icon blue"><CalendarDays size={20}/></span><p><strong>{filtered.length}</strong> itens no período</p></div>
      <div><span className="agenda-metric-icon amber"><Clock3 size={20}/></span><p><strong>{durationLabel(plannedMinutes)}</strong> tempo planejado</p></div>
      <div><span className="agenda-metric-icon green"><CheckCircle2 size={20}/></span><p><strong>{durationLabel(actualMinutes)}</strong> tempo realizado</p></div>
      <div><span className="agenda-metric-icon teal"><UserRound size={20}/></span><p><strong>{filtered.filter((e) => e.status === "em_andamento").length}</strong> em andamento</p></div>
    </section>

    <section className="card agenda-board">
      <div className="agenda-toolbar">
        <div className="agenda-period-control"><button onClick={() => move(-1)} aria-label="Período anterior"><ChevronLeft size={18}/></button><button className="agenda-today" onClick={() => setSelectedDate(dateInput(new Date()))}>Hoje</button><button onClick={() => move(1)} aria-label="Próximo período"><ChevronRight size={18}/></button><strong>{range.start.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</strong></div>
        <div className="agenda-mode" aria-label="Modo da agenda">{(["day", "week", "month"] as const).map((item) => <button key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item === "day" ? "Dia" : item === "week" ? "Semana" : "Mês"}</button>)}</div>
      </div>
      <div className="agenda-filters">
        <label className="search-control"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar na agenda" aria-label="Buscar na agenda"/></label>
        {currentUser.role !== "suporte" && <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} aria-label="Responsável"><option value="all">Toda a equipe</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>}
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Tipo"><option value="all">Todos os tipos</option><option value="agendado">Agendado</option><option value="inesperado">Inesperado</option><option value="interno">Atividade interna</option></select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status"><option value="all">Todos os status</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} aria-label="Data da agenda"/>
      </div>

      {loading ? <div className="agenda-loading"><span className="spinner"/>Carregando agenda…</div> : mode === "month" ?
        <div className="agenda-month">{days.map((day) => { const dayEntries = filtered.filter((entry) => dateInput(new Date(entry.scheduledStart || entry.actualStart || entry.createdAt)) === dateInput(day)); return <div key={day.toISOString()} className={day.getMonth() === selected.getMonth() ? "agenda-month-day" : "agenda-month-day muted"}><span>{day.getDate()}</span>{dayEntries.slice(0, 3).map((entry) => <button key={entry.id} className={`month-entry type-${entry.type}`} onClick={() => openEdit(entry)} title={entry.title}>{entry.scheduledStart ? new Date(entry.scheduledStart).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"} {entry.title}</button>)}{dayEntries.length > 3 && <small>+{dayEntries.length - 3} itens</small>}</div>; })}</div>
        : <div className={`agenda-days ${mode}`}>{days.map((day) => { const dayEntries = filtered.filter((entry) => dateInput(new Date(entry.scheduledStart || entry.actualStart || entry.createdAt)) === dateInput(day)); return <section className="agenda-day" key={day.toISOString()}><header><span>{day.toLocaleDateString("pt-BR", { weekday: "short" })}</span><strong>{day.getDate()}</strong></header><div className="agenda-day-list">{dayEntries.length ? dayEntries.map((entry) => <article className={`agenda-entry type-${entry.type}`} key={entry.id}><div className="agenda-entry-time"><strong>{entry.scheduledStart ? new Date(entry.scheduledStart).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Sem horário"}</strong><span>{durationLabel(entry.estimatedMinutes)}</span></div><div className="agenda-entry-content"><div className="agenda-entry-top"><span className={`agenda-type type-${entry.type}`}>{typeLabel[entry.type]}</span><span className={`agenda-status status-${entry.status}`}>{statusLabel[entry.status]}</span></div><h3>{entry.title}</h3><p>{entry.clientId ? clients.find((c) => c.id === entry.clientId)?.name : "Rotina interna"} · {users.find((u) => u.id === entry.assigneeId)?.name || "Responsável"}</p>{entry.description && <small>{entry.description}</small>}{entry.status === "concluido" && <div className="agenda-result"><CheckCircle2 size={14}/>Realizado em {durationLabel(duration(entry))}{entry.outcome ? ` · ${entry.outcome}` : ""}</div>}{overlapping.has(entry.id) && <div className="agenda-conflict"><AlertTriangle size={14}/>Conflito de horário</div>}<div className="agenda-entry-actions">{entry.status === "planejado" && <button className="agenda-action start" onClick={() => void action(entry, "start")} disabled={saving}><Play size={14}/>Iniciar</button>}{entry.status === "em_andamento" && <button className="agenda-action finish" onClick={() => { setFinishEntry(entry); setFinishOutcome(""); }} disabled={saving}><Square size={13}/>Finalizar</button>}<button className="icon-button" onClick={() => openEdit(entry)} aria-label="Editar"><Pencil size={15}/></button>{currentUser.role === "administrador" && <button className="icon-button danger-icon-button" onClick={() => void remove(entry)} aria-label="Remover"><Trash2 size={15}/></button>}</div></div></article>) : <div className="agenda-empty-day"><Clock3 size={18}/><span>Horário disponível</span></div>}</div></section>; })}</div>}
    </section>

    {formOpen && <div className="modal-backdrop" onMouseDown={() => !saving && setFormOpen(false)}><form className="modal modal-large" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}><header className="modal-header"><div><h2>{editingId ? "Editar compromisso" : draft.type === "interno" ? "Registrar atividade" : "Novo compromisso"}</h2><p>Você pode salvar sem estimativa e completar essa informação depois.</p></div><button type="button" className="icon-button" onClick={() => setFormOpen(false)} aria-label="Fechar"><X size={20}/></button></header><div className="modal-body"><div className="form-grid">
      <label className="field"><span>Tipo <b>*</b></span><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as AgendaType, clientId: e.target.value === "interno" ? "" : draft.clientId || clients[0]?.id || "" })}><option value="agendado">Atendimento agendado</option><option value="inesperado">Atendimento inesperado</option><option value="interno">Atividade interna</option></select></label>
      <label className="field"><span>Responsável <b>*</b></span><select value={draft.assigneeId} disabled={currentUser.role === "suporte"} onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <label className="field field-span-2"><span>Título <b>*</b></span><input required minLength={3} maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={draft.type === "interno" ? "Ex.: Atualizar documentação do atendimento" : "Ex.: Revisar falha de sincronização"}/></label>
      {draft.type !== "interno" && <label className="field"><span>Cliente <b>*</b></span><select value={draft.clientId} onChange={(e) => setDraft({ ...draft, clientId: e.target.value })}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>}
      <label className="field"><span>Data e horário</span><input type="datetime-local" value={draft.scheduledStart} onChange={(e) => setDraft({ ...draft, scheduledStart: e.target.value })}/></label>
      <label className="field"><span>Tempo estimado</span><select value={draft.estimatedMinutes} onChange={(e) => setDraft({ ...draft, estimatedMinutes: e.target.value })}><option value="">Ainda não estimado</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="120">1 a 2 horas</option><option value="180">Mais de 2 horas</option></select></label>
      <label className="field field-span-2"><span>Descrição</span><textarea maxLength={1000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Contexto, objetivo e informações importantes…"/></label>
      {!editingId && draft.type === "interno" && <div className="agenda-completed-box field-span-2"><label><input type="checkbox" checked={draft.recordCompleted} onChange={(e) => setDraft({ ...draft, recordCompleted: e.target.checked })}/><span>Registrar como uma atividade que já foi concluída</span></label>{draft.recordCompleted && <div className="form-grid"><label className="field"><span>Tempo realizado</span><input type="number" min="1" max="720" value={draft.recordedMinutes} onChange={(e) => setDraft({ ...draft, recordedMinutes: e.target.value })}/></label><label className="field"><span>Resultado</span><input value={draft.outcome} onChange={(e) => setDraft({ ...draft, outcome: e.target.value })} placeholder="O que foi entregue?"/></label></div>}</div>}
    </div></div><footer className="modal-footer"><button type="button" className="button button-ghost" onClick={() => setFormOpen(false)}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? "Salvando…" : editingId ? "Salvar alterações" : "Adicionar à agenda"}</button></footer></form></div>}

    {finishEntry && <div className="modal-backdrop" onMouseDown={() => setFinishEntry(null)}><section className="modal" onMouseDown={(e) => e.stopPropagation()}><header className="modal-header"><div><h2>Finalizar atividade</h2><p>O tempo decorrido será calculado automaticamente.</p></div><button className="icon-button" onClick={() => setFinishEntry(null)} aria-label="Fechar"><X size={20}/></button></header><div className="modal-body"><label className="field"><span>Resultado ou observação</span><textarea value={finishOutcome} onChange={(e) => setFinishOutcome(e.target.value)} placeholder="Descreva brevemente o que foi resolvido ou entregue."/></label></div><footer className="modal-footer"><button className="button button-ghost" onClick={() => setFinishEntry(null)}>Cancelar</button><button className="button button-primary" disabled={saving} onClick={() => void action(finishEntry, "finish", finishOutcome)}>Finalizar e registrar tempo</button></footer></section></div>}
    <DailyLogTable currentUser={currentUser} users={users} onNotify={onNotify}
      periodStart={dateInput(range.start)} periodEnd={dateInput(range.end)} assigneeFilter={assigneeFilter}/>
  </>;
}
