"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Gauge,
  LayoutDashboard,
  ListFilter,
  LockKeyhole,
  LogOut,
  Menu,
  Paperclip,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  UserCog,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import AgendaView from "./AgendaView";

type Role = "suporte" | "gestor" | "administrador";
type Severity = "Baixa" | "Média" | "Alta" | "Crítica";
type OccurrenceStatus =
  | "Novo"
  | "Em análise"
  | "Aguardando"
  | "Resolvido"
  | "Cancelado";
type View =
  | "dashboard"
  | "registros"
  | "novo"
  | "detalhe"
  | "agenda"
  | "catalogo"
  | "usuarios";

type PortalUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
};

type PortalClient = { id: string; name: string };
type PortalModule = { id: string; name: string; isGeneral: boolean };
type PortalSystem = { id: string; name: string; modules: PortalModule[] };

type ManagedUser = PortalUser & {
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

type CatalogItem = {
  id: string;
  systemId: string;
  moduleId: string;
  name: string;
  aliases: string[];
  active: boolean;
  updatedAt: string;
};

type Occurrence = {
  id: string;
  number: string;
  occurredAt: string;
  clientId: string;
  systemId: string;
  moduleId: string;
  catalogItemId?: string;
  otherError?: string;
  description: string;
  severity: Severity;
  status: OccurrenceStatus;
  responsibleId: string;
  authorId: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
};

const STATUS_OPTIONS: OccurrenceStatus[] = [
  "Novo",
  "Em análise",
  "Aguardando",
  "Resolvido",
  "Cancelado",
];
const SEVERITIES: Severity[] = ["Baixa", "Média", "Alta", "Crítica"];

const roleLabel: Record<Role, string> = {
  suporte: "Suporte",
  gestor: "Gestor",
  administrador: "Administrador",
};

const rolePermissions: Record<Role, string[]> = {
  suporte: [
    "Dashboard próprio",
    "Criar registros",
    "Atualizar ocorrências próprias",
    "Manter o Catálogo",
  ],
  gestor: ["Dashboard completo", "Gerenciar ocorrências", "Manter o Catálogo"],
  administrador: [
    "Acesso completo",
    "Manter o Catálogo",
    "Gerenciar usuários e permissões",
  ],
};

const RECORDS_PER_PAGE = 10;

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

function formatDate(value: string, withTime = true) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function toDateTimeLocal(value: Date) {
  const localValue = new Date(
    value.getTime() - value.getTimezoneOffset() * 60_000,
  );
  return localValue.toISOString().slice(0, 16);
}

function toDateInput(value: Date) {
  const localValue = new Date(
    value.getTime() - value.getTimezoneOffset() * 60_000,
  );
  return localValue.toISOString().slice(0, 10);
}

function getPeriodBounds(
  period: string,
  customStart = "",
  customEnd = "",
) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  let start = 0;
  let end = Number.POSITIVE_INFINITY;

  if (period === "today") {
    start = today.getTime();
    end = now.getTime();
  } else if (period === "week") {
    const weekStart = new Date(today);
    const daysSinceMonday = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - daysSinceMonday);
    start = weekStart.getTime();
    end = now.getTime();
  } else if (period === "7" || period === "30") {
    const periodStart = new Date(today);
    periodStart.setDate(periodStart.getDate() - (period === "7" ? 6 : 29));
    start = periodStart.getTime();
    end = now.getTime();
  } else if (period === "custom") {
    start = customStart
      ? new Date(customStart + "T00:00:00").getTime()
      : 0;
    end = customEnd
      ? new Date(customEnd + "T23:59:59.999").getTime()
      : Number.POSITIVE_INFINITY;
  }

  return { start, end };
}

function getLocalDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDailyLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value + "T12:00:00"));
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function evidenceName(path: string) {
  const name = path.split("/").pop() || path;
  return name.replace(/^[0-9a-f-]{36}-/i, "");
}

function toneClass(value: string) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function Badge({ children, tone }: { children: ReactNode; tone: string }) {
  return <span className={"badge badge-" + toneClass(tone)}>{children}</span>;
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <ListFilter size={22} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function Modal({
  title,
  description,
  children,
  onClose,
  footer,
  size = "default",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: "default" | "large";
}) {
  const modalRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const modal = modalRef.current;
    const selector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = modal
      ? Array.from(modal.querySelectorAll<HTMLElement>(selector))
      : [];
    focusable[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={modalRef}
        className={"modal modal-" + size}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p id="modal-description">{description}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </div>
  );
}

export default function PortalOcorrencias() {
  const [currentUser, setCurrentUser] = useState<PortalUser | null>(null);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [systems, setSystems] = useState<PortalSystem[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userModal, setUserModal] = useState<{
    mode: "new" | "edit";
    id?: string;
  } | null>(null);
  const [userDraft, setUserDraft] = useState({
    name: "",
    email: "",
    role: "suporte" as Role,
    password: "",
  });
  const [userFormError, setUserFormError] = useState("");
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [confirmUserDeleteId, setConfirmUserDeleteId] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [apiError, setApiError] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [toast, setToast] = useState("");
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState("");
  const [recordSearch, setRecordSearch] = useState("");
  const [recordPeriod, setRecordPeriod] = useState("all");
  const [recordSystem, setRecordSystem] = useState("all");
  const [recordModule, setRecordModule] = useState("all");
  const [recordStatus, setRecordStatus] = useState("all");
  const [recordSeverity, setRecordSeverity] = useState("all");
  const [recordPage, setRecordPage] = useState(1);
  const [dashPeriod, setDashPeriod] = useState("week");
  const [dashCustomStart, setDashCustomStart] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return toDateInput(date);
  });
  const [dashCustomEnd, setDashCustomEnd] = useState(() =>
    toDateInput(new Date()),
  );
  const [dashSystem, setDashSystem] = useState("all");
  const [dashModule, setDashModule] = useState("all");
  const [dashStatus, setDashStatus] = useState("all");
  const [dashSeverity, setDashSeverity] = useState("all");
  const [dashQuery, setDashQuery] = useState("");
  const [editingOccurrence, setEditingOccurrence] = useState(false);
  const [confirmOccurrenceDeleteId, setConfirmOccurrenceDeleteId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    description: "",
    severity: "Média" as Severity,
    status: "Em análise" as OccurrenceStatus,
    responsibleId: "",
    attachments: [] as string[],
  });
  const [editEvidenceFiles, setEditEvidenceFiles] = useState<File[]>([]);
  const [editEvidenceError, setEditEvidenceError] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogSystem, setCatalogSystem] = useState("all");
  const [catalogStatus, setCatalogStatus] = useState("all");
  const [catalogModal, setCatalogModal] = useState<{
    mode: "new" | "edit";
    id?: string;
  } | null>(null);
  const [catalogDraft, setCatalogDraft] = useState({
    systemId: "",
    moduleId: "",
    name: "",
    aliases: "",
    active: true,
  });
  const [catalogError, setCatalogError] = useState("");
  const [confirmCatalogId, setConfirmCatalogId] = useState<string | null>(null);
  const [referenceManagerOpen, setReferenceManagerOpen] = useState(false);
  const [systemDraft, setSystemDraft] = useState("");
  const [editingSystemId, setEditingSystemId] = useState<string | null>(null);
  const [moduleDraft, setModuleDraft] = useState({
    systemId: "",
    name: "",
    isGeneral: false,
  });
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState("");
  const [confirmReferenceDelete, setConfirmReferenceDelete] = useState<{
    kind: "system" | "module";
    id: string;
    name: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState({
    clientId: "",
    systemId: "",
    moduleId: "",
    catalogChoice: "",
    otherError: "",
    description: "",
    severity: "Média" as Severity,
    occurredAt: "",
    status: "Novo" as OccurrenceStatus,
    responsibleId: "",
    attachments: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { user: PortalUser };
      })
      .then((payload) => {
        if (active && payload?.user) {
          setCurrentUser(payload.user);
          setPortalUsers((current) =>
            current.some((user) => user.id === payload.user.id)
              ? current.map((user) =>
                  user.id === payload.user.id ? payload.user : user,
                )
              : [...current, payload.user],
          );
          setNewForm((current) => ({
            ...current,
            responsibleId: payload.user.id,
          }));
        }
      })
      .catch(() => {
        // Sem uma sessão válida, o portal apresenta o login normalmente.
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    const loadUsers = async () => {
      if (currentUser.role === "administrador") setUsersLoading(true);
      setUsersError("");
      try {
        const occurrencesResponse = await fetch("/api/occurrences", {
          credentials: "same-origin",
        });
        if (occurrencesResponse.ok) {
          const payload = (await occurrencesResponse.json()) as {
            occurrences: Occurrence[];
          };
          if (active) {
            setOccurrences(payload.occurrences);
            setSelectedOccurrenceId((current) =>
              current && payload.occurrences.some((item) => item.id === current)
                ? current
                : payload.occurrences[0]?.id || "",
            );
          }
        }
        const catalogResponse = await fetch("/api/catalog", {
          credentials: "same-origin",
        });
        if (catalogResponse.ok) {
          const payload = (await catalogResponse.json()) as {
            items: CatalogItem[];
          };
          if (active) setCatalog(payload.items);
        }
        const referenceResponse = await fetch("/api/reference-data", {
          credentials: "same-origin",
        });
        if (!referenceResponse.ok) {
          const payload = (await referenceResponse.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(
            payload.message || "Não foi possível carregar os dados de referência.",
          );
        }
        const referencePayload = (await referenceResponse.json()) as {
          clients: PortalClient[];
          systems: PortalSystem[];
        };
        if (active) {
          setClients(referencePayload.clients);
          setSystems(referencePayload.systems);
          const firstSystem = referencePayload.systems[0];
          setCatalogDraft((current) => ({
            ...current,
            systemId: current.systemId || firstSystem?.id || "",
            moduleId: current.moduleId || firstSystem?.modules[0]?.id || "",
          }));
        }
        const assignableResponse = await fetch(
          "/api/users?scope=assignable",
          { credentials: "same-origin" },
        );
        if (assignableResponse.ok) {
          const payload = (await assignableResponse.json()) as {
            users: PortalUser[];
          };
          if (active) setPortalUsers(payload.users);
        }
        if (currentUser.role === "administrador") {
          const managedResponse = await fetch("/api/users", {
            credentials: "same-origin",
          });
          const payload = (await managedResponse.json().catch(() => ({}))) as {
            users?: ManagedUser[];
            message?: string;
          };
          if (!managedResponse.ok) {
            throw new Error(payload.message || "Não foi possível carregar os usuários.");
          }
          if (active) setManagedUsers(payload.users || []);
        }
      } catch (error) {
        if (active) {
          setUsersError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os usuários.",
          );
        }
      } finally {
        if (active) setUsersLoading(false);
      }
    };
    void loadUsers();
    return () => {
      active = false;
    };
  }, [currentUser]);

  const getClient = (id: string) =>
    clients.find((client) => client.id === id)?.name || "Cliente";
  const getSystem = (id: string) =>
    systems.find((system) => system.id === id)?.name || "Sistema";
  const getModule = (systemId: string, moduleId: string) =>
    systems.find((system) => system.id === systemId)?.modules.find(
      (module) => module.id === moduleId,
    )?.name || "Módulo";
  const getCatalogName = (item: Occurrence) =>
    item.catalogItemId
      ? catalog.find((entry) => entry.id === item.catalogItemId)?.name ||
        "Item inativo"
      : item.otherError || "Outro erro";
  const getUser = (id: string) =>
    portalUsers.find((user) => user.id === id)?.name || "Sem responsável";

  const visibleOccurrences =
    currentUser?.role === "suporte"
      ? occurrences.filter((item) => item.responsibleId === currentUser.id)
      : occurrences;

  const currentOccurrence = visibleOccurrences.find(
    (item) => item.id === selectedOccurrenceId,
  );
  const canManageCatalog = Boolean(currentUser);
  const generalModuleIds = new Set(
    systems.flatMap((system) =>
      system.modules.filter((module) => module.isGeneral).map((module) => module.id),
    ),
  );
  const canEditOccurrence = (item: Occurrence) =>
    Boolean(
      currentUser &&
        (currentUser.role !== "suporte" ||
          item.responsibleId === currentUser.id),
    );

  async function portalRequest<T>(
    url: string,
    init: RequestInit,
  ): Promise<T> {
    setApiError("");
    const headers = new Headers(init.headers);
    if (init.body) headers.set("Content-Type", "application/json");
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        credentials: "same-origin",
        headers,
      });
    } catch {
      const message =
        "Não foi possível conectar ao portal. Verifique a conexão e tente novamente.";
      setApiError(message);
      throw new Error(message);
    }
    const payload = (await response.js…34719 tokens truncated…
                        ...moduleDraft,
                        name: event.target.value.slice(0, 80),
                      })
                    }
                    placeholder="Ex.: Checklist"
                    disabled={!moduleDraft.systemId}
                  />
                </label>
                <label className="reference-checkbox">
                  <input
                    type="checkbox"
                    checked={moduleDraft.isGeneral}
                    onChange={(event) =>
                      setModuleDraft({
                        ...moduleDraft,
                        isGeneral: event.target.checked,
                      })
                    }
                    disabled={!moduleDraft.systemId}
                  />
                  Usar como módulo geral
                </label>
                <div className="reference-form-actions">
                  <button
                    className="button button-primary"
                    onClick={saveModuleReference}
                    disabled={
                      saving ||
                      !moduleDraft.systemId ||
                      moduleDraft.name.trim().length < 2
                    }
                  >
                    {saving ? <span className="spinner" /> : <Check size={17} />}
                    {editingModuleId ? "Atualizar" : "Adicionar"}
                  </button>
                  {editingModuleId && (
                    <button
                      className="button button-ghost"
                      onClick={() => {
                        setEditingModuleId(null);
                        setModuleDraft((current) => ({
                          ...current,
                          name: "",
                          isGeneral: false,
                        }));
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
              <div className="reference-list">
                {systems
                  .find((system) => system.id === moduleDraft.systemId)
                  ?.modules.map((module) => (
                    <div className="reference-list-item" key={module.id}>
                      <div>
                        <strong>{module.name}</strong>
                        <small>{module.isGeneral ? "Módulo geral" : "Módulo específico"}</small>
                      </div>
                      <div className="reference-list-actions">
                        <button
                          className="icon-button"
                          onClick={() => {
                            setEditingModuleId(module.id);
                            setModuleDraft({
                              systemId: moduleDraft.systemId,
                              name: module.name,
                              isGeneral: module.isGeneral,
                            });
                            setReferenceError("");
                          }}
                          aria-label={`Editar módulo ${module.name}`}
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger-icon-button"
                          onClick={() =>
                            setConfirmReferenceDelete({
                              kind: "module",
                              id: module.id,
                              name: module.name,
                            })
                          }
                          aria-label={`Excluir módulo ${module.name}`}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )) || (
                  <p className="reference-list-empty">
                    Selecione um sistema para ver os módulos.
                  </p>
                )}
              </div>
            </section>
          </div>
        </Modal>
      )}

      {confirmReferenceDelete && (
        <Modal
          title={
            confirmReferenceDelete.kind === "system"
              ? "Excluir sistema da visualização?"
              : "Excluir módulo da visualização?"
          }
          description="O cadastro continuará preservado no banco para auditoria."
          onClose={() => setConfirmReferenceDelete(null)}
          footer={
            <>
              <button
                className="button button-ghost"
                onClick={() => setConfirmReferenceDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="button button-danger"
                onClick={deleteReference}
                disabled={saving}
              >
                {saving ? <span className="spinner" /> : <Trash2 size={17} />}
                Excluir da visualização
              </button>
            </>
          }
        >
          <div className="safe-delete-copy">
            <strong>{confirmReferenceDelete.name}</strong>
            <p>
              Se estiver sendo usado em um item do Catálogo ou ocorrência, o
              sistema impedirá a exclusão e mostrará como corrigir.
            </p>
          </div>
        </Modal>
      )}

      {catalogModal && (
        <Modal
          title={
            catalogModal.mode === "new"
              ? "Novo item do Catálogo"
              : "Editar item do Catálogo"
          }
          description="Use um nome curto, oficial e reconhecível pela equipe."
          onClose={() => setCatalogModal(null)}
          footer={
            <>
              <button
                className="button button-ghost"
                onClick={() => setCatalogModal(null)}
              >
                Cancelar
              </button>
              <button
                className="button button-primary"
                onClick={saveCatalog}
                disabled={saving}
              >
                {saving ? <span className="spinner" /> : <Check size={17} />}
                {saving ? "Salvando…" : "Salvar item"}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <label className="field">
              <span>
                Sistema <b>*</b>
              </span>
              <select
                value={catalogDraft.systemId}
                onChange={(event) => {
                  const system = systems.find(
                    (item) => item.id === event.target.value,
                  );
                  setCatalogDraft({
                    ...catalogDraft,
                    systemId: event.target.value,
                    moduleId: system?.modules[0].id || "",
                  });
                }}
              >
                {systems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                Módulo <b>*</b>
              </span>
              <select
                value={catalogDraft.moduleId}
                onChange={(event) =>
                  setCatalogDraft({
                    ...catalogDraft,
                    moduleId: event.target.value,
                  })
                }
              >
                {systems.find(
                  (system) => system.id === catalogDraft.systemId,
                )?.modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-span-2">
              <span>
                Nome padronizado do erro <b>*</b>
              </span>
              <input
                value={catalogDraft.name}
                onChange={(event) =>
                  setCatalogDraft({
                    ...catalogDraft,
                    name: event.target.value.slice(0, 120),
                  })
                }
                placeholder="Ex.: Falha ao carregar checklist"
                aria-invalid={Boolean(catalogError)}
              />
              {catalogError && (
                <small className="field-error">{catalogError}</small>
              )}
              {catalogDraft.name.length > 4 &&
                catalog.some(
                  (item) =>
                    item.id !== catalogModal.id &&
                    normalizeText(item.name).includes(
                      normalizeText(catalogDraft.name),
                    ),
                ) && (
                  <small className="field-warning">
                    Encontramos itens parecidos. Revise antes de salvar.
                  </small>
                )}
            </label>
            <label className="field field-span-2">
              <span>Termos alternativos para busca</span>
              <input
                value={catalogDraft.aliases}
                onChange={(event) =>
                  setCatalogDraft({
                    ...catalogDraft,
                    aliases: event.target.value.slice(0, 220),
                  })
                }
                placeholder="Separe os termos por vírgula"
              />
              <small className="field-help">
                Estes termos ajudam na busca sem criar duplicidades.
              </small>
            </label>
            <label className="field field-span-2">
              <span>Status</span>
              <select
                value={catalogDraft.active ? "active" : "inactive"}
                disabled={catalogModal.mode === "edit"}
                onChange={(event) =>
                  setCatalogDraft({
                    ...catalogDraft,
                    active: event.target.value === "active",
                  })
                }
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
              {catalogModal.mode === "edit" && (
                <small className="field-help">
                  Use Ativar ou Inativar na lista para confirmar esta alteração.
                </small>
              )}
            </label>
          </div>
        </Modal>
      )}

      {confirmCatalogId && (
        <Modal
          title={
            catalog.find((item) => item.id === confirmCatalogId)?.active
              ? "Inativar item?"
              : "Reativar item?"
          }
          description="Os registros históricos continuarão vinculados a este item."
          onClose={() => setConfirmCatalogId(null)}
          footer={
            <>
              <button
                className="button button-ghost"
                onClick={() => setConfirmCatalogId(null)}
              >
                Cancelar
              </button>
              <button
                className="button button-primary"
                onClick={() => toggleCatalogItem(confirmCatalogId)}
                disabled={saving}
              >
                {saving ? "Processando…" : "Confirmar"}
              </button>
            </>
          }
        >
          <div className="confirm-message">
            <span>
              <AlertTriangle size={23} />
            </span>
            <p>
              <strong>
                {catalog.find((item) => item.id === confirmCatalogId)?.name}
              </strong>
              {catalog.find((item) => item.id === confirmCatalogId)?.active
                ? " deixará de aparecer em novos registros."
                : " voltará a aparecer para novos registros."}
            </p>
          </div>
        </Modal>
      )}

      {userModal && currentUser.role === "administrador" && (
        <Modal
          title={userModal.mode === "new" ? "Novo usuário" : "Editar usuário"}
          description={
            userModal.mode === "new"
              ? "Crie a conta e entregue a senha temporária de forma segura."
              : "Atualize o perfil, as permissões ou redefina a senha."
          }
          onClose={() => setUserModal(null)}
          footer={
            <>
              <button className="button button-ghost" onClick={() => setUserModal(null)}>
                Cancelar
              </button>
              <button className="button button-primary" onClick={saveUser} disabled={saving}>
                {saving ? <span className="spinner" /> : <Check size={17} />}
                {saving ? "Salvando…" : "Salvar usuário"}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <label className="field field-span-2">
              <span>Nome completo <b>*</b></span>
              <input
                value={userDraft.name}
                onChange={(event) => setUserDraft({ ...userDraft, name: event.target.value.slice(0, 100) })}
                placeholder="Nome da pessoa"
              />
            </label>
            <label className="field field-span-2">
              <span>E-mail de acesso <b>*</b></span>
              <input
                type="email"
                value={userDraft.email}
                disabled={userModal.mode === "edit"}
                onChange={(event) => setUserDraft({ ...userDraft, email: event.target.value.slice(0, 160) })}
                placeholder="nome@empresa.com"
              />
              {userModal.mode === "edit" && (
                <small className="field-help">O e-mail de acesso não pode ser alterado.</small>
              )}
            </label>
            <label className="field field-span-2">
              <span>Perfil de acesso <b>*</b></span>
              <select
                value={userDraft.role}
                onChange={(event) => setUserDraft({ ...userDraft, role: event.target.value as Role })}
              >
                <option value="suporte">Suporte</option>
                <option value="gestor">Gestor</option>
                <option value="administrador">Administrador</option>
              </select>
            </label>
            <div className="permission-preview field-span-2">
              <span className="metric-icon metric-blue"><ShieldCheck size={18} /></span>
              <div>
                <strong>Permissões do perfil {roleLabel[userDraft.role]}</strong>
                <ul>
                  {rolePermissions[userDraft.role].map((permission) => (
                    <li key={permission}>{permission}</li>
                  ))}
                </ul>
              </div>
            </div>
            <label className="field field-span-2">
              <span>{userModal.mode === "new" ? "Senha temporária *" : "Nova senha"}</span>
              <input
                type="password"
                value={userDraft.password}
                onChange={(event) => setUserDraft({ ...userDraft, password: event.target.value })}
                placeholder={userModal.mode === "new" ? "Mínimo de 8 caracteres" : "Deixe em branco para manter"}
              />
              <small className="field-help">
                {userModal.mode === "new"
                  ? "A senha deve ter pelo menos 8 caracteres."
                  : "Ao redefinir a senha, as sessões abertas serão encerradas."}
              </small>
            </label>
            {userFormError && (
              <div className="form-alert field-span-2" role="alert">{userFormError}</div>
            )}
          </div>
        </Modal>
      )}

      {confirmUserId && currentUser.role === "administrador" && (
        <Modal
          title={managedUsers.find((user) => user.id === confirmUserId)?.active ? "Bloquear acesso?" : "Reativar acesso?"}
          description="O histórico e os registros associados a esta pessoa serão preservados."
          onClose={() => setConfirmUserId(null)}
          footer={
            <>
              <button className="button button-ghost" onClick={() => setConfirmUserId(null)}>
                Cancelar
              </button>
              <button className="button button-primary" onClick={() => toggleUserAccess(confirmUserId)} disabled={saving}>
                {saving ? "Processando…" : "Confirmar"}
              </button>
            </>
          }
        >
          <div className="confirm-message">
            <span><AlertTriangle size={23} /></span>
            <p>
              <strong>{managedUsers.find((user) => user.id === confirmUserId)?.name}</strong>
              {managedUsers.find((user) => user.id === confirmUserId)?.active
                ? " perderá o acesso imediatamente e suas sessões serão encerradas."
                : " poderá entrar novamente no sistema com sua senha atual."}
            </p>
          </div>
        </Modal>
      )}

      {confirmOccurrenceDeleteId && currentUser.role === "administrador" && (
        <Modal
          title="Excluir registro da visualização?"
          description="Esta é uma exclusão segura: o registro deixará de aparecer no portal, mas continuará armazenado para recuperação e auditoria."
          onClose={() => setConfirmOccurrenceDeleteId(null)}
          footer={
            <>
              <button className="button button-ghost" onClick={() => setConfirmOccurrenceDeleteId(null)}>
                Cancelar
              </button>
              <button className="button button-danger" onClick={() => deleteOccurrence(confirmOccurrenceDeleteId)} disabled={saving}>
                {saving ? <span className="spinner" /> : <Trash2 size={17} />}
                {saving ? "Excluindo…" : "Excluir da visualização"}
              </button>
            </>
          }
        >
          <div className="safe-delete-message">
            <span><ShieldCheck size={23} /></span>
            <p>
              <strong>
                {occurrences.find((item) => item.id === confirmOccurrenceDeleteId)?.number}
              </strong>
              Nenhum dado será apagado definitivamente do banco de dados.
            </p>
          </div>
        </Modal>
      )}

      {confirmUserDeleteId && currentUser.role === "administrador" && (
        <Modal
          title="Excluir usuário da visualização?"
          description="A conta será ocultada e perderá o acesso, mas seus dados e vínculos históricos continuarão armazenados."
          onClose={() => setConfirmUserDeleteId(null)}
          footer={
            <>
              <button className="button button-ghost" onClick={() => setConfirmUserDeleteId(null)}>
                Cancelar
              </button>
              <button className="button button-danger" onClick={() => deleteUser(confirmUserDeleteId)} disabled={saving}>
                {saving ? <span className="spinner" /> : <Trash2 size={17} />}
                {saving ? "Excluindo…" : "Excluir usuário"}
              </button>
            </>
          }
        >
          <div className="safe-delete-message">
            <span><ShieldCheck size={23} /></span>
            <p>
              <strong>
                {managedUsers.find((user) => user.id === confirmUserDeleteId)?.name}
              </strong>
              A exclusão não apaga ocorrências, histórico de acesso ou dados de auditoria.
            </p>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          {toast}
          <button onClick={() => setToast("")} aria-label="Fechar mensagem">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
