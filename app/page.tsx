"use client";

import {
  Activity,
  AlertTriangle,
  Archive,
  ArchiveRestore,
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
  Code2,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Gauge,
  GripVertical,
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
  type DragEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import AgendaView from "./AgendaView";

type Role = "suporte" | "desenvolvedor" | "administrador";
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
  | "acoes"
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

type DevelopmentActionStatus =
  | "Encaminhada"
  | "Em análise"
  | "Em desenvolvimento"
  | "Aguardando validação"
  | "Reprovada"
  | "Resolvida";
type DevelopmentActionUrgency = "Leve" | "Médio" | "Urgente";

type DevelopmentAction = {
  id: string;
  number: string;
  title: string;
  problemDescription: string;
  actionPlan: string;
  analysisInformation: string;
  identifiedAt: string;
  supportId: string;
  developerId: string;
  systemId: string | null;
  moduleId: string | null;
  urgency: DevelopmentActionUrgency;
  dueAt: string | null;
  status: DevelopmentActionStatus;
  developerNotes: string;
  resolutionNotes: string;
  evidencePaths: string[];
  resolvedAt: string | null;
  archivedAt: string | null;
  archivedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type ActionDetailsDraft = {
  title: string;
  problemDescription: string;
  identifiedAt: string;
  developerId: string;
  systemId: string;
  moduleId: string;
  urgency: DevelopmentActionUrgency;
};

const STATUS_OPTIONS: OccurrenceStatus[] = [
  "Novo",
  "Em análise",
  "Aguardando",
  "Resolvido",
  "Cancelado",
];
const DEVELOPMENT_STATUS_OPTIONS: DevelopmentActionStatus[] = [
  "Encaminhada",
  "Em desenvolvimento",
  "Resolvida",
  "Reprovada",
];
const DEVELOPMENT_URGENCY_OPTIONS: DevelopmentActionUrgency[] = ["Leve", "Médio", "Urgente"];
const SEVERITIES: Severity[] = ["Baixa", "Média", "Alta", "Crítica"];

const roleLabel: Record<Role, string> = {
  suporte: "Suporte",
  desenvolvedor: "Desenvolvedor",
  administrador: "Administrador",
};

const rolePermissions: Record<Role, string[]> = {
  suporte: [
    "Dashboard próprio",
    "Criar registros",
    "Atualizar ocorrências próprias",
    "Manter o Catálogo",
  ],
  desenvolvedor: [
    "Visualizar ações atribuídas",
    "Definir previsão de resolução",
    "Atualizar andamento e enviar para validação",
  ],
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
  const [dataRefreshVersion, setDataRefreshVersion] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
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
  const [recordError, setRecordError] = useState("all");
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
  const [developmentActions, setDevelopmentActions] = useState<DevelopmentAction[]>([]);
  const [archivedDevelopmentActions, setArchivedDevelopmentActions] = useState<DevelopmentAction[]>([]);
  const [actionListMode, setActionListMode] = useState<"active" | "archived">("active");
  const [developerUsers, setDeveloperUsers] = useState<PortalUser[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState("");
  const [actionSearch, setActionSearch] = useState("");
  const [actionDatePeriod, setActionDatePeriod] = useState("all");
  const [actionDateStart, setActionDateStart] = useState("");
  const [actionDateEnd, setActionDateEnd] = useState("");
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<DevelopmentActionStatus | null>(null);
  const [movingActionId, setMovingActionId] = useState<string | null>(null);
  const draggedActionIdRef = useRef<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [confirmActionDeleteId, setConfirmActionDeleteId] = useState<string | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionEvidenceFiles, setActionEvidenceFiles] = useState<File[]>([]);
  const [actionUpdateEvidenceFiles, setActionUpdateEvidenceFiles] = useState<File[]>([]);
  const [actionFormError, setActionFormError] = useState("");
  const [editingActionDetails, setEditingActionDetails] = useState(false);
  const [actionDetailsDraft, setActionDetailsDraft] = useState<ActionDetailsDraft>({
    title: "", problemDescription: "", identifiedAt: "", developerId: "",
    systemId: "", moduleId: "", urgency: "Médio",
  });
  const [actionDraft, setActionDraft] = useState({
    title: "",
    problemDescription: "",
    identifiedAt: "",
    developerId: "",
    systemId: "",
    moduleId: "",
    urgency: "Médio" as DevelopmentActionUrgency,
  });
  const [developerActionDraft, setDeveloperActionDraft] = useState({
    dueAt: "",
    status: "Em desenvolvimento" as DevelopmentActionStatus,
    developerNotes: "",
  });
  const [validationNotes, setValidationNotes] = useState("");
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
          if (payload.user.role === "desenvolvedor") setView("acoes");
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
      if (dataRefreshVersion === 0) {
        if (currentUser.role === "administrador") setUsersLoading(true);
        setActionsLoading(true);
      }
      setUsersError("");
      setActionsError("");
      try {
        const occurrencesResponse = await fetch("/api/occurrences", {
          credentials: "same-origin",
          cache: "no-store",
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
          cache: "no-store",
        });
        if (catalogResponse.ok) {
          const payload = (await catalogResponse.json()) as {
            items: CatalogItem[];
          };
          if (active) setCatalog(payload.items);
        }
        const referenceResponse = await fetch("/api/reference-data", {
          credentials: "same-origin",
          cache: "no-store",
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
          setActionDraft((current) => {
            const selectedSystem = referencePayload.systems.find((system) => system.id === current.systemId) || firstSystem;
            const selectedModule = selectedSystem?.modules.find((module) => module.id === current.moduleId) || selectedSystem?.modules[0];
            return {
              ...current,
              systemId: selectedSystem?.id || "",
              moduleId: selectedModule?.id || "",
            };
          });
        }
        const assignableResponse = await fetch(
          "/api/users?scope=assignable",
          { credentials: "same-origin", cache: "no-store" },
        );
        if (assignableResponse.ok) {
          const payload = (await assignableResponse.json()) as {
            users: PortalUser[];
          };
          if (active) setPortalUsers(payload.users);
        }
        const developersResponse = await fetch("/api/users?scope=developers", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (developersResponse.ok) {
          const payload = (await developersResponse.json()) as { users: PortalUser[] };
          if (active) {
            setDeveloperUsers(payload.users);
            setActionDraft((current) => ({
              ...current,
              developerId: current.developerId || payload.users[0]?.id || "",
            }));
          }
        }
        const actionsResponse = await fetch("/api/catalog?scope=development-actions", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const actionsPayload = (await actionsResponse.json().catch(() => ({}))) as {
          actions?: DevelopmentAction[];
          message?: string;
        };
        if (actionsResponse.ok) {
          if (active) setDevelopmentActions((actionsPayload.actions || []).map((action) =>
            action.status === "Em análise" || action.status === "Aguardando validação" ? { ...action, status: "Em desenvolvimento" } : action,
          ));
        } else if (active) {
          setActionsError(actionsPayload.message || "Não foi possível carregar as ações de desenvolvimento.");
        }
        if (currentUser.role === "administrador") {
          const managedResponse = await fetch("/api/users", {
            credentials: "same-origin",
            cache: "no-store",
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
        if (active) {
          setUsersLoading(false);
          setActionsLoading(false);
        }
      }
    };
    void loadUsers();
    return () => {
      active = false;
    };
  }, [currentUser, dataRefreshVersion]);

  useEffect(() => {
    if (!currentUser) return;
    const refresh = () => {
      setCurrentTime(Date.now());
      setDataRefreshVersion((current) => current + 1);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const intervalId = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
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
  const getActionSystemModule = (action: DevelopmentAction) =>
    action.systemId && action.moduleId
      ? `${getSystem(action.systemId)} / ${getModule(action.systemId, action.moduleId)}`
      : "Não informado";
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
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    if (response.status === 401 && !url.endsWith("/login")) {
      setCurrentUser(null);
      setLoginError("Sua sessão expirou. Entre novamente para continuar.");
    }
    if (!response.ok) {
      const message =
        payload.message || "Não foi possível concluir a operação.";
      setApiError(message);
      throw new Error(message);
    }
    return payload as T;
  }

  const dashboardPeriodBounds = getPeriodBounds(
    dashPeriod,
    dashCustomStart,
    dashCustomEnd,
  );

  const dashboardData = (() => {
    const query = normalizeText(dashQuery);
    return visibleOccurrences.filter((item) => {
      const occurredAt = new Date(item.occurredAt).getTime();
      const searchable = normalizeText(
        [
          getClient(item.clientId),
          getUser(item.responsibleId),
          getCatalogName(item),
        ].join(" "),
      );
      return (
        occurredAt >= dashboardPeriodBounds.start &&
        occurredAt <= dashboardPeriodBounds.end &&
        (dashSystem === "all" || item.systemId === dashSystem) &&
        (dashModule === "all" || item.moduleId === dashModule) &&
        (dashStatus === "all" || item.status === dashStatus) &&
        (dashSeverity === "all" || item.severity === dashSeverity) &&
        (!query || searchable.includes(query))
      );
    });
  })();

  const filteredRecords = (() => {
    const periodBounds = getPeriodBounds(recordPeriod);
    const query = normalizeText(recordSearch);
    return [...visibleOccurrences]
      .filter((item) => {
        const occurredAt = new Date(item.occurredAt).getTime();
        const searchable = normalizeText(
          [
            item.number,
            getClient(item.clientId),
            getSystem(item.systemId),
            getCatalogName(item),
            getUser(item.responsibleId),
          ].join(" "),
        );
        return (
          (!query || searchable.includes(query)) &&
          occurredAt >= periodBounds.start &&
          occurredAt <= periodBounds.end &&
          (recordSystem === "all" || item.systemId === recordSystem) &&
          (recordModule === "all" || item.moduleId === recordModule) &&
          (recordStatus === "all" || item.status === recordStatus) &&
          (recordError === "all" || getCatalogName(item) === recordError)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() -
          new Date(a.occurredAt).getTime(),
      );
  })();

  const recordErrorOptions = Array.from(
    new Set(
      visibleOccurrences
        .filter(
          (item) =>
            (recordSystem === "all" || item.systemId === recordSystem) &&
            (recordModule === "all" || item.moduleId === recordModule),
        )
        .map((item) => getCatalogName(item)),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const recordPageCount = Math.max(
    1,
    Math.ceil(filteredRecords.length / RECORDS_PER_PAGE),
  );
  const currentRecordPage = Math.min(recordPage, recordPageCount);
  const recordPageStart = (currentRecordPage - 1) * RECORDS_PER_PAGE;
  const paginatedRecords = filteredRecords.slice(
    recordPageStart,
    recordPageStart + RECORDS_PER_PAGE,
  );

  const filteredCatalog = (() => {
    const query = normalizeText(catalogSearch);
    return catalog.filter((item) => {
      const searchable = normalizeText(
        [item.name, ...item.aliases, getSystem(item.systemId)].join(" "),
      );
      return (
        (!query || searchable.includes(query)) &&
        (catalogSystem === "all" || item.systemId === catalogSystem) &&
        (catalogStatus === "all" ||
          (catalogStatus === "active" ? item.active : !item.active))
      );
    });
  })();

  const filteredManagedUsers = (() => {
    const query = normalizeText(userSearch);
    return managedUsers.filter((user) => {
      const searchable = normalizeText(
        [user.name, user.email, roleLabel[user.role], user.title].join(" "),
      );
      return (
        (!query || searchable.includes(query)) &&
        (userRoleFilter === "all" || user.role === userRoleFilter) &&
        (userStatusFilter === "all" ||
          (userStatusFilter === "active" ? user.active : !user.active))
      );
    });
  })();

  const catalogUsage = (id: string) =>
    visibleOccurrences.filter((item) => item.catalogItemId === id).length;

  const getActionUser = (id: string) =>
    [...developerUsers, ...portalUsers, ...managedUsers].find((user) => user.id === id)?.name || "Usuário indisponível";
  const isActionClosed = (action: DevelopmentAction) => action.status === "Resolvida" || action.status === "Reprovada";
  const isActionOverdue = (action: DevelopmentAction) =>
    Boolean(action.dueAt && !isActionClosed(action) && new Date(action.dueAt).getTime() <= currentTime);
  const overdueActions = developmentActions.filter(isActionOverdue);
  const selectedAction = [...developmentActions, ...archivedDevelopmentActions].find((action) => action.id === selectedActionId) || null;
  const selectedActionIsBeforeDeadline = Boolean(
    selectedAction?.dueAt && new Date(selectedAction.dueAt).getTime() > currentTime,
  );
  const actionDateBounds = getPeriodBounds(actionDatePeriod, actionDateStart, actionDateEnd);
  const listedDevelopmentActions = actionListMode === "archived" ? archivedDevelopmentActions : developmentActions;
  const periodDevelopmentActions = listedDevelopmentActions.filter((action) => {
    const createdAt = new Date(action.createdAt).getTime();
    return createdAt >= actionDateBounds.start && createdAt <= actionDateBounds.end;
  });
  const periodOverdueActions = periodDevelopmentActions.filter(isActionOverdue);
  const filteredDevelopmentActions = periodDevelopmentActions.filter((action) => {
    const query = normalizeText(actionSearch);
    const searchable = normalizeText([
      action.number, action.title, action.problemDescription,
      getActionSystemModule(action), getActionUser(action.developerId),
      action.urgency || "Médio", action.status,
    ].join(" "));
    return !query || searchable.includes(query);
  });

  function openNewDevelopmentAction() {
    const firstSystem = systems[0];
    setActionDraft({
      title: "", problemDescription: "",
      identifiedAt: toDateTimeLocal(new Date()), developerId: developerUsers[0]?.id || "",
      systemId: firstSystem?.id || "", moduleId: firstSystem?.modules[0]?.id || "",
      urgency: "Médio",
    });
    setActionEvidenceFiles([]);
    setActionFormError("");
    setActionModalOpen(true);
  }

  function handleActionEvidence(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    const allowed = files.filter((file) =>
      /image\/(png|jpeg|webp)/.test(file.type) || file.type === "application/pdf",
    );
    if (allowed.length !== files.length) {
      setActionFormError("Use arquivos JPG, PNG, WEBP ou PDF.");
      return;
    }
    if (allowed.length > 5 || allowed.some((file) => file.size > 10 * 1024 * 1024)) {
      setActionFormError("Envie até 5 arquivos de no máximo 10 MB cada.");
      return;
    }
    setActionEvidenceFiles(allowed);
    setActionFormError("");
  }

  function handleActionUpdateEvidence(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    const allowed = files.filter((file) =>
      /image\/(png|jpeg|webp)/.test(file.type) || file.type === "application/pdf",
    );
    if (allowed.length !== files.length) {
      setActionFormError("Use arquivos JPG, PNG, WEBP ou PDF.");
      event.target.value = "";
      return;
    }
    if ((selectedAction?.evidencePaths.length || 0) + allowed.length > 5) {
      setActionFormError("A ação pode ter no máximo 5 evidências.");
      event.target.value = "";
      return;
    }
    if (allowed.some((file) => file.size > 10 * 1024 * 1024)) {
      setActionFormError("Cada evidência pode ter no máximo 10 MB.");
      event.target.value = "";
      return;
    }
    setActionUpdateEvidenceFiles(allowed);
    setActionFormError("");
  }

  async function uploadDevelopmentEvidence(actionId: string, files: File[]) {
    if (!files.length) return null;
    const form = new FormData();
    form.append("actionId", actionId);
    files.forEach((file) => form.append("files", file));
    const response = await fetch("/api/catalog?scope=development-actions", {
      method: "POST", credentials: "same-origin", body: form,
    });
    const payload = (await response.json().catch(() => ({}))) as { action?: DevelopmentAction; message?: string };
    if (!response.ok || !payload.action) throw new Error(payload.message || "Não foi possível enviar as evidências.");
    return payload.action;
  }

  async function createDevelopmentAction() {
    setActionFormError("");
    if (!actionDraft.systemId || !actionDraft.moduleId) {
      setActionFormError("Cadastre e selecione um Sistema e um Módulo ativos.");
      return;
    }
    if (!actionDraft.developerId) {
      setActionFormError("Cadastre e selecione um Desenvolvedor ativo.");
      return;
    }
    setSaving(true);
    try {
      const payload = await portalRequest<{ action: DevelopmentAction }>("/api/catalog?scope=development-actions", {
        method: "POST", body: JSON.stringify(actionDraft),
      });
      let action = payload.action;
      setDevelopmentActions((current) => [action, ...current]);
      if (actionEvidenceFiles.length) {
        action = (await uploadDevelopmentEvidence(action.id, actionEvidenceFiles)) || action;
        setDevelopmentActions((current) => current.map((item) => item.id === action.id ? action : item));
      }
      setActionModalOpen(false);
      setSelectedActionId(action.id);
      setToast("Ação encaminhada ao Desenvolvedor.");
    } catch (error) {
      setActionFormError(error instanceof Error ? error.message : "Não foi possível criar a ação.");
    } finally {
      setSaving(false);
    }
  }

  function openDevelopmentAction(action: DevelopmentAction) {
    setSelectedActionId(action.id);
    setEditingActionDetails(false);
    setValidationNotes(action.resolutionNotes);
    setDeveloperActionDraft({
      dueAt: action.dueAt ? toDateTimeLocal(new Date(action.dueAt)) : "",
      status: action.status === "Encaminhada" || action.status === "Em análise" || action.status === "Aguardando validação" || isActionClosed(action) ? "Em desenvolvimento" : action.status,
      developerNotes: action.developerNotes,
    });
    setActionUpdateEvidenceFiles([]);
    setActionFormError("");
  }

  function startEditingActionDetails(action: DevelopmentAction) {
    const selectedSystem = systems.find((system) => system.id === action.systemId) || systems[0];
    const selectedModule = selectedSystem?.modules.find((module) => module.id === action.moduleId) || selectedSystem?.modules[0];
    setActionDetailsDraft({
      title: action.title,
      problemDescription: action.problemDescription,
      identifiedAt: toDateTimeLocal(new Date(action.identifiedAt)),
      developerId: action.developerId,
      systemId: selectedSystem?.id || "",
      moduleId: selectedModule?.id || "",
      urgency: action.urgency || "Médio",
    });
    setActionFormError("");
    setEditingActionDetails(true);
  }

  async function saveActionDetails() {
    if (!selectedAction) return;
    if (!actionDetailsDraft.systemId || !actionDetailsDraft.moduleId) {
      setActionFormError("Selecione um Sistema e um Módulo ativos.");
      return;
    }
    setSaving(true);
    setActionFormError("");
    try {
      const payload = await portalRequest<{ action: DevelopmentAction }>("/api/catalog?scope=development-actions", {
        method: "PATCH",
        body: JSON.stringify({ id: selectedAction.id, mode: "metadata", ...actionDetailsDraft }),
      });
      setDevelopmentActions((current) => current.map((item) => item.id === payload.action.id ? payload.action : item));
      setEditingActionDetails(false);
      setToast("Informações da ação atualizadas.");
    } catch (error) {
      setActionFormError(error instanceof Error ? error.message : "Não foi possível atualizar a ação.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDeveloperAction() {
    if (!selectedAction) return;
    setSaving(true);
    setActionFormError("");
    try {
      if (actionUpdateEvidenceFiles.length) {
        const actionWithEvidence = await uploadDevelopmentEvidence(selectedAction.id, actionUpdateEvidenceFiles);
        if (actionWithEvidence) {
          setDevelopmentActions((current) => current.map((item) => item.id === actionWithEvidence.id ? actionWithEvidence : item));
        }
      }
      const payload = await portalRequest<{ action: DevelopmentAction }>("/api/catalog?scope=development-actions", {
        method: "PATCH",
        body: JSON.stringify({ id: selectedAction.id, ...developerActionDraft }),
      });
      setDevelopmentActions((current) => current.map((item) => item.id === payload.action.id ? payload.action : item));
      setActionUpdateEvidenceFiles([]);
      setToast(actionUpdateEvidenceFiles.length ? "Andamento e evidências salvos." : "Previsão e andamento salvos.");
    } catch (error) {
      setActionFormError(error instanceof Error ? error.message : "Não foi possível atualizar a ação.");
    } finally {
      setSaving(false);
    }
  }

  async function moveDevelopmentAction(actionId: string, status: DevelopmentActionStatus) {
    if (currentUser?.role !== "desenvolvedor") return;
    const previousAction = developmentActions.find((action) => action.id === actionId);
    if (!previousAction || previousAction.status === status || movingActionId) return;

    const now = new Date().toISOString();
    const optimisticAction: DevelopmentAction = {
      ...previousAction,
      status,
      resolvedAt: status === "Resolvida" ? previousAction.resolvedAt || now : null,
      updatedAt: now,
    };

    setMovingActionId(actionId);
    setActionsError("");
    setDevelopmentActions((current) => current.map((action) => action.id === actionId ? optimisticAction : action));

    try {
      const payload = await portalRequest<{ action: DevelopmentAction }>("/api/catalog?scope=development-actions", {
        method: "PATCH",
        body: JSON.stringify({ id: actionId, mode: "status", status }),
      });
      setDevelopmentActions((current) => current.map((action) => action.id === actionId ? payload.action : action));
      setToast(`Ação movida para ${status}.`);
    } catch (error) {
      setDevelopmentActions((current) => current.map((action) => action.id === actionId ? previousAction : action));
      setActionsError(error instanceof Error ? error.message : "Não foi possível mover a ação.");
    } finally {
      draggedActionIdRef.current = null;
      setDraggedActionId(null);
      setDragOverStatus(null);
      setMovingActionId(null);
    }
  }

  function startDevelopmentActionDrag(event: DragEvent<HTMLElement>, actionId: string) {
    if (currentUser?.role !== "desenvolvedor" || movingActionId) {
      event.preventDefault();
      return;
    }
    draggedActionIdRef.current = actionId;
    setDraggedActionId(actionId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", actionId);
  }

  function dropDevelopmentAction(event: DragEvent<HTMLElement>, status: DevelopmentActionStatus) {
    event.preventDefault();
    const actionId = event.dataTransfer.getData("text/plain") || draggedActionIdRef.current;
    draggedActionIdRef.current = null;
    setDraggedActionId(null);
    setDragOverStatus(null);
    if (actionId) void moveDevelopmentAction(actionId, status);
  }

  function finishDevelopmentActionDrag() {
    draggedActionIdRef.current = null;
    setDraggedActionId(null);
    setDragOverStatus(null);
  }

  async function validateDevelopmentAction(validation: "resolved" | "reopen") {
    if (!selectedAction) return;
    if (validation === "resolved" && !selectedAction.dueAt) {
      setActionFormError("O Desenvolvedor precisa definir uma previsão antes da finalização.");
      return;
    }
    if (
      validation === "resolved" &&
      selectedActionIsBeforeDeadline &&
      validationNotes.trim().length < 10
    ) {
      setActionFormError("Justifique a finalização antes do prazo com pelo menos 10 caracteres.");
      return;
    }
    setSaving(true);
    setActionFormError("");
    try {
      if (actionUpdateEvidenceFiles.length) {
        const actionWithEvidence = await uploadDevelopmentEvidence(selectedAction.id, actionUpdateEvidenceFiles);
        if (actionWithEvidence) {
          setDevelopmentActions((current) => current.map((item) => item.id === actionWithEvidence.id ? actionWithEvidence : item));
        }
      }
      const payload = await portalRequest<{ action: DevelopmentAction }>("/api/catalog?scope=development-actions", {
        method: "PATCH",
        body: JSON.stringify({ id: selectedAction.id, validation, resolutionNotes: validationNotes }),
      });
      setDevelopmentActions((current) => current.map((item) => item.id === payload.action.id ? payload.action : item));
      setActionUpdateEvidenceFiles([]);
      setToast(validation === "resolved" ? "Ação resolvida e encerrada." : "Ação reaberta para nova previsão.");
    } catch (error) {
      setActionFormError(error instanceof Error ? error.message : "Não foi possível validar a ação.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDevelopmentAction(id: string) {
    setSaving(true);
    setActionFormError("");
    try {
      await portalRequest<{ deleted: boolean }>(
        `/api/catalog?scope=development-actions&id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      setDevelopmentActions((current) => current.filter((action) => action.id !== id));
      setConfirmActionDeleteId(null);
      setSelectedActionId(null);
      setToast("Ação excluída da visualização com segurança.");
    } catch (error) {
      setActionFormError(error instanceof Error ? error.message : "Não foi possível excluir a ação.");
      setConfirmActionDeleteId(null);
    } finally {
      setSaving(false);
    }
  }

  async function loadArchivedDevelopmentActions() {
    if (currentUser?.role !== "administrador") return;
    setActionsLoading(true);
    setActionsError("");
    try {
      const payload = await portalRequest<{ actions: DevelopmentAction[] }>("/api/catalog?scope=development-actions&archived=1", {});
      setArchivedDevelopmentActions((payload.actions || []).map((action) =>
        action.status === "Em análise" || action.status === "Aguardando validação" ? { ...action, status: "Em desenvolvimento" } : action,
      ));
      setActionListMode("archived");
    } catch (error) {
      setActionsError(error instanceof Error ? error.message : "Não foi possível carregar as ações arquivadas.");
    } finally {
      setActionsLoading(false);
    }
  }

  async function setDevelopmentActionArchived(action: DevelopmentAction, archived: boolean) {
    if (currentUser?.role !== "administrador") return;
    setSaving(true);
    setActionFormError("");
    try {
      const payload = await portalRequest<{ action: DevelopmentAction }>("/api/catalog?scope=development-actions", {
        method: "PATCH",
        body: JSON.stringify({ id: action.id, mode: "archive", archived }),
      });
      if (archived) {
        setDevelopmentActions((current) => current.filter((item) => item.id !== action.id));
        setArchivedDevelopmentActions((current) => [payload.action, ...current.filter((item) => item.id !== action.id)]);
        setSelectedActionId(null);
        setToast("Ação arquivada com segurança.");
      } else {
        setArchivedDevelopmentActions((current) => current.filter((item) => item.id !== action.id));
        setDevelopmentActions((current) => [payload.action, ...current.filter((item) => item.id !== action.id)]);
        setSelectedActionId(null);
        setToast("Ação restaurada para o quadro ativo.");
      }
    } catch (error) {
      setActionFormError(error instanceof Error ? error.message : "Não foi possível atualizar o arquivamento.");
    } finally {
      setSaving(false);
    }
  }

  function navigate(next: View) {
    setView(next);
    setDataRefreshVersion((current) => current + 1);
    setSidebarOpen(false);
    setProfileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError("Preencha o usuário e a senha para continuar.");
      return;
    }
    setLoggingIn(true);
    try {
      const payload = await portalRequest<{ user: PortalUser }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: loginEmail.trim(),
            password: loginPassword,
          }),
        },
      );
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
      setView(payload.user.role === "desenvolvedor" ? "acoes" : "dashboard");
      setApiError("");
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Não foi possível entrar. Verifique os dados informados.",
      );
      setApiError("");
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      setCurrentUser(null);
      setProfileOpen(false);
      setLoginPassword("");
      setApiError("");
      setView("dashboard");
    }
  }

  function openDetail(id: string) {
    setSelectedOccurrenceId(id);
    navigate("detalhe");
  }

  function resetNewForm() {
    setNewForm({
      clientId: "",
      systemId: "",
      moduleId: "",
      catalogChoice: "",
      otherError: "",
      description: "",
      severity: "Média",
      occurredAt: toDateTimeLocal(new Date()),
      status: "Novo",
      responsibleId: currentUser?.id || "",
      attachments: [],
    });
    setFormErrors({});
  }

  function startNewOccurrence() {
    resetNewForm();
    navigate("novo");
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    const allowed = files.filter(
      (file) =>
        /image\/(png|jpeg|webp)/.test(file.type) ||
        file.type === "video/mp4" ||
        file.type === "text/plain",
    );
    if (allowed.length !== files.length) {
      setFormErrors((current) => ({
        ...current,
        attachments: "Use PNG, JPG, WEBP, MP4 ou TXT.",
      }));
    } else {
      setFormErrors((current) => ({ ...current, attachments: "" }));
    }
    setNewForm((current) => ({
      ...current,
      attachments: allowed.slice(0, 3).map((file) => file.name),
    }));
  }

  async function submitOccurrence(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!newForm.clientId) errors.clientId = "Selecione o cliente.";
    if (!newForm.systemId) errors.systemId = "Selecione o sistema.";
    if (!newForm.moduleId) errors.moduleId = "Selecione o módulo.";
    if (!newForm.catalogChoice) {
      errors.catalogChoice = "Selecione o erro.";
    }
    if (
      newForm.catalogChoice === "other" &&
      newForm.otherError.trim().length < 8
    ) {
      errors.otherError = "Descreva o erro com pelo menos 8 caracteres.";
    }
    if (!newForm.occurredAt) errors.occurredAt = "Informe data e horário.";
    if (!newForm.responsibleId) {
      errors.responsibleId = "Selecione o responsável.";
    }
    if (new Date(newForm.occurredAt).getTime() > Date.now()) {
      errors.occurredAt = "A data da ocorrência não pode estar no futuro.";
    }
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const payload = await portalRequest<{ occurrence: Occurrence }>(
        "/api/occurrences",
        {
          method: "POST",
          body: JSON.stringify(newForm),
        },
      );
      const newOccurrence = payload.occurrence;
      setOccurrences((current) => [newOccurrence, ...current]);
      setSelectedOccurrenceId(newOccurrence.id);
      setToast("Ocorrência registrada com sucesso.");
      setView("detalhe");
    } catch {
      // O banner global apresenta a mensagem devolvida pela API mockada.
    } finally {
      setSaving(false);
    }
  }

  function beginEditOccurrence(item: Occurrence) {
    setEditDraft({
      description: item.description,
      severity: item.severity,
      status: item.status,
      responsibleId: item.responsibleId,
      attachments: item.attachments,
    });
    setEditEvidenceFiles([]);
    setEditEvidenceError("");
    setEditingOccurrence(true);
  }

  function handleEditEvidence(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    const allowed = files.filter(
      (file) =>
        /image\/(png|jpeg|webp)/.test(file.type) ||
        file.type === "video/mp4" ||
        file.type === "text/plain",
    );
    if (allowed.length !== files.length) {
      setEditEvidenceError("Use PNG, JPG, WEBP, MP4 ou TXT.");
      return;
    }
    if (editDraft.attachments.length + allowed.length > 3) {
      setEditEvidenceError("Cada ocorrência pode ter no máximo 3 evidências.");
      return;
    }
    if (allowed.some((file) => file.size > 10 * 1024 * 1024)) {
      setEditEvidenceError("Cada evidência pode ter no máximo 10 MB.");
      return;
    }
    setEditEvidenceFiles(allowed);
    setEditEvidenceError("");
  }

  async function uploadOccurrenceEvidence(occurrenceId: string) {
    if (!editEvidenceFiles.length) return [] as string[];
    const form = new FormData();
    form.append("occurrenceId", occurrenceId);
    editEvidenceFiles.forEach((file) => form.append("files", file));
    const response = await fetch("/api/occurrences", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    });
    const payload = (await response.json().catch(() => ({}))) as {
      attachments?: string[];
      message?: string;
    };
    if (!response.ok || !payload.attachments) {
      throw new Error(payload.message || "Não foi possível enviar as evidências.");
    }
    return payload.attachments;
  }

  async function saveOccurrenceEdit() {
    if (!currentOccurrence) return;
    setSaving(true);
    try {
      const uploadedAttachments = await uploadOccurrenceEvidence(currentOccurrence.id);
      const attachments = [...editDraft.attachments, ...uploadedAttachments];
      const payload = await portalRequest<{
        changes: Pick<
          Occurrence,
          "description" | "severity" | "status" | "responsibleId" | "attachments" | "updatedAt"
        >;
      }>("/api/occurrences", {
        method: "PATCH",
        body: JSON.stringify({
          id: currentOccurrence.id,
          originalResponsibleId: currentOccurrence.responsibleId,
          ...editDraft,
          attachments,
        }),
      });
      setOccurrences((current) =>
        current.map((item) =>
          item.id === currentOccurrence.id
            ? { ...item, ...payload.changes }
            : item,
        ),
      );
      setEditingOccurrence(false);
      setEditEvidenceFiles([]);
      setToast(uploadedAttachments.length ? "Ocorrência e evidências atualizadas." : "Ocorrência atualizada.");
    } catch (error) {
      if (error instanceof Error) setEditEvidenceError(error.message);
      // Mantém o modal aberto para que a pessoa possa revisar ou tentar novamente.
    } finally {
      setSaving(false);
    }
  }

  async function deleteOccurrence(id: string) {
    setSaving(true);
    try {
      await portalRequest<{ deleted: true; id: string }>(
        `/api/occurrences?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      setOccurrences((current) => current.filter((item) => item.id !== id));
      setConfirmOccurrenceDeleteId(null);
      if (selectedOccurrenceId === id) navigate("registros");
      setToast("Registro removido da visualização. Os dados foram preservados com segurança.");
    } catch {
      // O diálogo permanece aberto para uma nova tentativa.
    } finally {
      setSaving(false);
    }
  }

  function openNewCatalog() {
    const firstSystem = systems[0];
    if (!firstSystem) {
      setReferenceError(
        "Cadastre um sistema primeiro. O módulo Geral será criado automaticamente.",
      );
      setReferenceManagerOpen(true);
      return;
    }
    setCatalogDraft({
      systemId: firstSystem?.id || "",
      moduleId: firstSystem?.modules[0]?.id || "",
      name: "",
      aliases: "",
      active: true,
    });
    setCatalogError("");
    setCatalogModal({ mode: "new" });
  }

  function applyReferenceData(payload: {
    clients: PortalClient[];
    systems: PortalSystem[];
  }) {
    setClients(payload.clients);
    setSystems(payload.systems);
    const firstSystem = payload.systems[0];
    setCatalogDraft((current) => {
      const selectedSystem =
        payload.systems.find((system) => system.id === current.systemId) ||
        firstSystem;
      return {
        ...current,
        systemId: selectedSystem?.id || "",
        moduleId:
          selectedSystem?.modules.find((module) => module.id === current.moduleId)
            ?.id ||
          selectedSystem?.modules[0]?.id ||
          "",
      };
    });
    setModuleDraft((current) => ({
      ...current,
      systemId:
        payload.systems.some((system) => system.id === current.systemId)
          ? current.systemId
          : firstSystem?.id || "",
    }));
  }

  function openReferenceManager() {
    setReferenceError("");
    setSystemDraft("");
    setEditingSystemId(null);
    setModuleDraft({
      systemId: systems[0]?.id || "",
      name: "",
      isGeneral: false,
    });
    setEditingModuleId(null);
    setReferenceManagerOpen(true);
  }

  async function saveSystemReference() {
    const name = systemDraft.trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      setReferenceError("Informe o nome do sistema.");
      return;
    }
    setSaving(true);
    setReferenceError("");
    try {
      const payload = await portalRequest<{
        clients: PortalClient[];
        systems: PortalSystem[];
      }>("/api/reference-data", {
        method: editingSystemId ? "PATCH" : "POST",
        body: JSON.stringify({
          kind: "system",
          id: editingSystemId,
          name,
        }),
      });
      applyReferenceData(payload);
      const savedSystem = payload.systems.find(
        (system) => normalizeText(system.name) === normalizeText(name),
      );
      setModuleDraft((current) => ({
        ...current,
        systemId: savedSystem?.id || current.systemId,
      }));
      setSystemDraft("");
      setEditingSystemId(null);
      setToast(editingSystemId ? "Sistema atualizado." : "Sistema criado com o módulo Geral.");
    } catch (error) {
      setReferenceError(
        error instanceof Error ? error.message : "Não foi possível salvar o sistema.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveModuleReference() {
    const name = moduleDraft.name.trim().replace(/\s+/g, " ");
    if (!moduleDraft.systemId) {
      setReferenceError("Selecione o sistema do módulo.");
      return;
    }
    if (name.length < 2) {
      setReferenceError("Informe o nome do módulo.");
      return;
    }
    setSaving(true);
    setReferenceError("");
    try {
      const payload = await portalRequest<{
        clients: PortalClient[];
        systems: PortalSystem[];
      }>("/api/reference-data", {
        method: editingModuleId ? "PATCH" : "POST",
        body: JSON.stringify({
          kind: "module",
          id: editingModuleId,
          systemId: moduleDraft.systemId,
          name,
          isGeneral: moduleDraft.isGeneral,
        }),
      });
      applyReferenceData(payload);
      setModuleDraft((current) => ({
        systemId: current.systemId,
        name: "",
        isGeneral: false,
      }));
      setEditingModuleId(null);
      setToast(editingModuleId ? "Módulo atualizado." : "Módulo criado.");
    } catch (error) {
      setReferenceError(
        error instanceof Error ? error.message : "Não foi possível salvar o módulo.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteReference() {
    if (!confirmReferenceDelete) return;
    setSaving(true);
    setReferenceError("");
    try {
      const payload = await portalRequest<{
        clients: PortalClient[];
        systems: PortalSystem[];
      }>(
        `/api/reference-data?kind=${confirmReferenceDelete.kind}&id=${encodeURIComponent(
          confirmReferenceDelete.id,
        )}`,
        { method: "DELETE" },
      );
      applyReferenceData(payload);
      setConfirmReferenceDelete(null);
      setToast(
        confirmReferenceDelete.kind === "system"
          ? "Sistema removido da visualização."
          : "Módulo removido da visualização.",
      );
    } catch (error) {
      setReferenceError(
        error instanceof Error ? error.message : "Não foi possível excluir o cadastro.",
      );
      setConfirmReferenceDelete(null);
    } finally {
      setSaving(false);
    }
  }

  function openEditCatalog(item: CatalogItem) {
    setCatalogDraft({
      systemId: item.systemId,
      moduleId: item.moduleId,
      name: item.name,
      aliases: item.aliases.join(", "),
      active: item.active,
    });
    setCatalogError("");
    setCatalogModal({ mode: "edit", id: item.id });
  }

  async function saveCatalog() {
    const name = catalogDraft.name.trim().replace(/\s+/g, " ");
    if (name.length < 5) {
      setCatalogError("Informe um nome oficial com pelo menos 5 caracteres.");
      return;
    }
    const duplicate = catalog.find(
      (item) =>
        item.id !== catalogModal?.id &&
        item.systemId === catalogDraft.systemId &&
        item.moduleId === catalogDraft.moduleId &&
        normalizeText(item.name) === normalizeText(name),
    );
    if (duplicate) {
      setCatalogError(
        "Já existe um item com este nome para o sistema e módulo selecionados.",
      );
      return;
    }
    const item: CatalogItem = {
      id: catalogModal?.id || "c" + String(Date.now()),
      systemId: catalogDraft.systemId,
      moduleId: catalogDraft.moduleId,
      name,
      aliases: catalogDraft.aliases
        .split(",")
        .map((alias) => alias.trim())
        .filter(Boolean),
      active: catalogDraft.active,
      updatedAt: new Date().toISOString(),
    };
    setSaving(true);
    try {
      const payload = await portalRequest<{ item: Partial<CatalogItem> }>(
        "/api/catalog",
        {
          method: catalogModal?.mode === "edit" ? "PATCH" : "POST",
          body: JSON.stringify({
            ...item,
            existingKeys: catalog
              .filter((entry) => entry.id !== item.id)
              .map(
                (entry) =>
                  entry.systemId +
                  "|" +
                  entry.moduleId +
                  "|" +
                  normalizeText(entry.name),
              ),
          }),
        },
      );
      const savedItem = { ...item, ...payload.item } as CatalogItem;
      setCatalog((current) =>
        catalogModal?.mode === "edit"
          ? current.map((entry) =>
              entry.id === savedItem.id ? savedItem : entry,
            )
          : [savedItem, ...current],
      );
      setCatalogModal(null);
      setToast(
        catalogModal?.mode === "edit"
          ? "Item do Catálogo atualizado."
          : "Item adicionado ao Catálogo.",
      );
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o item.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCatalogItem(id: string) {
    const item = catalog.find((entry) => entry.id === id);
    if (!item) return;
    setSaving(true);
    try {
      const payload = await portalRequest<{ item: Partial<CatalogItem> }>(
        "/api/catalog",
        {
          method: "PATCH",
          body: JSON.stringify({ ...item, active: !item.active }),
        },
      );
      setCatalog((current) =>
        current.map((entry) =>
          entry.id === id ? ({ ...entry, ...payload.item } as CatalogItem) : entry,
        ),
      );
      setConfirmCatalogId(null);
      setToast(item.active ? "Item inativado." : "Item reativado.");
    } catch {
      // O diálogo permanece aberto para uma nova tentativa.
    } finally {
      setSaving(false);
    }
  }

  function syncManagedUser(user: ManagedUser) {
    setManagedUsers((current) => {
      const exists = current.some((entry) => entry.id === user.id);
      return exists
        ? current.map((entry) => (entry.id === user.id ? user : entry))
        : [...current, user].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    });
    setPortalUsers((current) => {
      const withoutUser = current.filter((entry) => entry.id !== user.id);
      return user.active ? [...withoutUser, user] : withoutUser;
    });
  }

  async function reloadManagedUsers() {
    setUsersLoading(true);
    setUsersError("");
    try {
      const payload = await portalRequest<{ users: ManagedUser[] }>(
        "/api/users",
        { method: "GET" },
      );
      setManagedUsers(payload.users);
      setPortalUsers(payload.users.filter((user) => user.active));
    } catch (error) {
      setUsersError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os usuários.",
      );
    } finally {
      setUsersLoading(false);
    }
  }

  function openNewUser() {
    setUserDraft({ name: "", email: "", role: "suporte", password: "" });
    setUserFormError("");
    setUserModal({ mode: "new" });
  }

  function openEditUser(user: ManagedUser) {
    setUserDraft({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
    });
    setUserFormError("");
    setUserModal({ mode: "edit", id: user.id });
  }

  async function saveUser() {
    const name = userDraft.name.trim().replace(/\s+/g, " ");
    const email = userDraft.email.trim().toLocaleLowerCase("pt-BR");
    if (name.length < 2) {
      setUserFormError("Informe o nome completo do usuário.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setUserFormError("Informe um e-mail válido.");
      return;
    }
    if (userModal?.mode === "new" && userDraft.password.length < 8) {
      setUserFormError("A senha temporária deve ter pelo menos 8 caracteres.");
      return;
    }
    if (
      userModal?.mode === "edit" &&
      userDraft.password &&
      userDraft.password.length < 8
    ) {
      setUserFormError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    const existing = managedUsers.find((user) => user.id === userModal?.id);
    setSaving(true);
    setUserFormError("");
    try {
      const payload = await portalRequest<{ user: ManagedUser }>("/api/users", {
        method: userModal?.mode === "edit" ? "PATCH" : "POST",
        body: JSON.stringify(
          userModal?.mode === "edit"
            ? {
                id: userModal.id,
                name,
                role: userDraft.role,
                active: existing?.active ?? true,
                ...(userDraft.password ? { password: userDraft.password } : {}),
              }
            : {
                name,
                email,
                role: userDraft.role,
                password: userDraft.password,
              },
        ),
      });
      syncManagedUser(payload.user);
      setUserModal(null);
      setToast(
        userModal?.mode === "edit"
          ? "Usuário e permissões atualizados."
          : "Usuário criado com sucesso.",
      );
    } catch (error) {
      setUserFormError(
        error instanceof Error ? error.message : "Não foi possível salvar o usuário.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleUserAccess(id: string) {
    const user = managedUsers.find((entry) => entry.id === id);
    if (!user) return;
    setSaving(true);
    try {
      const payload = await portalRequest<{ user: ManagedUser }>("/api/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: user.id,
          name: user.name,
          role: user.role,
          active: !user.active,
        }),
      });
      syncManagedUser(payload.user);
      setConfirmUserId(null);
      setToast(user.active ? "Acesso do usuário bloqueado." : "Acesso reativado.");
    } catch {
      // O diálogo permanece aberto para uma nova tentativa.
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id: string) {
    setSaving(true);
    try {
      await portalRequest<{ deleted: true; id: string }>(
        `/api/users?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      setManagedUsers((current) => current.filter((user) => user.id !== id));
      setPortalUsers((current) => current.filter((user) => user.id !== id));
      setConfirmUserDeleteId(null);
      setToast("Usuário removido da visualização. O histórico foi preservado.");
    } catch {
      // O diálogo permanece aberto para uma nova tentativa.
    } finally {
      setSaving(false);
    }
  }

  function clearDashboardFilters() {
    setDashPeriod("week");
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    setDashCustomStart(toDateInput(sevenDaysAgo));
    setDashCustomEnd(toDateInput(today));
    setDashSystem("all");
    setDashModule("all");
    setDashStatus("all");
    setDashSeverity("all");
    setDashQuery("");
  }

  function clearRecordFilters() {
    setRecordSearch("");
    setRecordPeriod("all");
    setRecordSystem("all");
    setRecordModule("all");
    setRecordStatus("all");
    setRecordError("all");
    setRecordPage(1);
  }

  if (checkingSession) {
    return (
      <main className="session-loading" aria-live="polite">
        <span className="brand-mark">
          <ShieldCheck size={24} />
        </span>
        <span className="spinner" />
        <p>Verificando a sessão do portal…</p>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="login-page">
        <section className="login-story" aria-label="Apresentação do portal">
          <div className="story-glow story-glow-one" />
          <div className="story-glow story-glow-two" />
          <div className="brand brand-light">
            <span className="brand-mark">
              <ShieldCheck size={24} />
            </span>
            <span>
              <strong>Portal de Ocorrências</strong>
              <small>Suporte</small>
            </span>
          </div>
          <div className="story-copy">
            <span className="eyebrow eyebrow-light">Operação centralizada</span>
            <h1>Transforme relatos de suporte em decisões mais claras.</h1>
            <p>
              Registre ocorrências, acompanhe o impacto e mantenha os erros
              recorrentes organizados em um único lugar.
            </p>
            <div className="story-points">
              <div>
                <span>
                  <BarChart3 size={19} />
                </span>
                <p>
                  <strong>Visão gerencial</strong>
                  Indicadores que usam a mesma base de filtros.
                </p>
              </div>
              <div>
                <span>
                  <BookOpenCheck size={19} />
                </span>
                <p>
                  <strong>Erros padronizados</strong>
                  Menos duplicidade, métricas mais confiáveis.
                </p>
              </div>
            </div>
          </div>
          <div className="story-footer">
            <span className="status-dot" />
            Dados operacionais armazenados com segurança
          </div>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div className="mobile-brand brand">
              <span className="brand-mark">
                <ShieldCheck size={22} />
              </span>
              <span>
                <strong>Portal de Ocorrências</strong>
                <small>Suporte</small>
              </span>
            </div>
            <span className="eyebrow">Acesso seguro</span>
            <h2>Que bom ter você de volta</h2>
            <p className="login-intro">
              Entre com uma conta autorizada para acessar o portal.
            </p>
            <form onSubmit={handleLogin} noValidate>
              <label className="field">
                <span>E-mail ou usuário</span>
                <div className="input-with-icon">
                  <UserRound size={18} />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="nome@empresa.com"
                    autoComplete="username"
                    aria-invalid={Boolean(loginError)}
                    aria-describedby={loginError ? "login-error" : undefined}
                  />
                </div>
              </label>
              <label className="field">
                <span>Senha</span>
                <div className="input-with-icon password-field">
                  <LockKeyhole size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    aria-invalid={Boolean(loginError)}
                    aria-describedby={loginError ? "login-error" : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              {loginError && (
                <div className="form-alert" id="login-error" role="alert">
                  <CircleAlert size={18} />
                  {loginError}
                </div>
              )}
              <button
                type="submit"
                className="button button-primary button-wide"
                disabled={loggingIn}
              >
                {loggingIn ? (
                  <>
                    <span className="spinner" />
                    Autenticando…
                  </>
                ) : (
                  <>
                    Entrar
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  const dashboardOpen = dashboardData.filter(
    (item) => !["Resolvido", "Cancelado"].includes(item.status),
  ).length;
  const dashboardCritical = dashboardData.filter((item) =>
    ["Alta", "Crítica"].includes(item.severity),
  ).length;
  const catalogCounts = catalog
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      count: dashboardData.filter((item) => item.catalogItemId === entry.id)
        .length,
    }))
    .sort((a, b) => b.count - a.count);
  const recurrent = catalogCounts[0];
  const systemCounts = systems.map((system) => ({
    ...system,
    count: dashboardData.filter((item) => item.systemId === system.id).length,
  }));
  const mostAffected = [...systemCounts].sort((a, b) => b.count - a.count)[0];
  const maxSystemCount = Math.max(1, ...systemCounts.map((item) => item.count));
  const statusCounts = STATUS_OPTIONS.map((status) => ({
    status,
    count: dashboardData.filter((item) => item.status === status).length,
  })).filter((item) => item.count > 0);
  let donutCursor = 0;
  const donutColors = ["#0f766e", "#2d6ca2", "#e1a42f", "#42a474", "#94a3b8"];
  const donutParts = statusCounts.map((item, index) => {
    const start = donutCursor;
    const end =
      start + (dashboardData.length ? (item.count / dashboardData.length) * 100 : 0);
    donutCursor = end;
    return donutColors[index % donutColors.length] + " " + start + "% " + end + "%";
  });
  const donutStyle = {
    background:
      dashboardData.length > 0
        ? "conic-gradient(" + donutParts.join(", ") + ")"
        : "#e8eef3",
  } as CSSProperties;

  const dailyEvolution = (() => {
    const counts = dashboardData.reduce<Map<string, number>>((map, item) => {
      const key = getLocalDateKey(item.occurredAt);
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());
    const timestamps = dashboardData.map((item) =>
      new Date(item.occurredAt).getTime(),
    );
    const now = currentTime;
    const startTimestamp =
      dashboardPeriodBounds.start ||
      (timestamps.length ? Math.min(...timestamps) : now);
    const endTimestamp = Number.isFinite(dashboardPeriodBounds.end)
      ? Math.min(dashboardPeriodBounds.end, now)
      : now;
    const startDate = new Date(startTimestamp);
    const endDate = new Date(Math.max(startTimestamp, endTimestamp));
    startDate.setHours(12, 0, 0, 0);
    endDate.setHours(12, 0, 0, 0);

    const points: { key: string; label: string; count: number }[] = [];
    const cursor = new Date(startDate);
    while (cursor.getTime() <= endDate.getTime()) {
      const key = getLocalDateKey(cursor);
      points.push({ key, label: formatDailyLabel(key), count: counts.get(key) || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return points;
  })();
  const dailyChartWidth = 760;
  const dailyChartHeight = 210;
  const dailyChartLeft = 34;
  const dailyChartRight = 18;
  const dailyChartTop = 16;
  const dailyChartBottom = 32;
  const dailyChartBaseline = dailyChartHeight - dailyChartBottom;
  const dailyMax = Math.max(1, ...dailyEvolution.map((item) => item.count));
  const dailyChartPoints = dailyEvolution.map((item, index) => {
    const usableWidth = dailyChartWidth - dailyChartLeft - dailyChartRight;
    const usableHeight = dailyChartBaseline - dailyChartTop;
    const x =
      dailyEvolution.length === 1
        ? dailyChartLeft + usableWidth / 2
        : dailyChartLeft + (index / (dailyEvolution.length - 1)) * usableWidth;
    const y = dailyChartBaseline - (item.count / dailyMax) * usableHeight;
    return { ...item, x, y };
  });
  const dailyLinePoints = dailyChartPoints
    .map((item) => item.x + "," + item.y)
    .join(" ");
  const dailyAreaPoints = dailyChartPoints.length
    ? [
        dailyChartPoints[0].x + "," + dailyChartBaseline,
        dailyLinePoints,
        dailyChartPoints[dailyChartPoints.length - 1].x +
          "," +
          dailyChartBaseline,
      ].join(" ")
    : "";
  const dailyLabelStep = Math.max(1, Math.ceil(dailyEvolution.length / 7));

  const navItems = currentUser.role === "desenvolvedor"
    ? [{ id: "acoes" as View, label: "Ações para Desenvolvedores", icon: Code2 }]
    : [
        { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard },
        { id: "registros" as View, label: "Registro", icon: ClipboardList },
        { id: "agenda" as View, label: "Agenda", icon: CalendarDays },
        { id: "acoes" as View, label: "Ações para Desenvolvedores", icon: Code2 },
        { id: "catalogo" as View, label: "Catálogo", icon: BookOpenCheck },
        ...(currentUser.role === "administrador"
          ? [{ id: "usuarios" as View, label: "Usuários", icon: UsersRound }]
          : []),
      ];

  return (
    <div className="portal-shell">
      <div
        className={sidebarOpen ? "sidebar-scrim visible" : "sidebar-scrim"}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={sidebarOpen ? "sidebar sidebar-open" : "sidebar"}>
        <div className="brand sidebar-brand">
          <span className="brand-mark">
            <ShieldCheck size={22} />
          </span>
          <span>
            <strong>Portal de Ocorrências</strong>
            <small>Suporte</small>
          </span>
        </div>
        <nav className="main-nav" aria-label="Navegação principal">
          <p className="nav-label">Menu principal</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              view === item.id ||
              (item.id === "registros" &&
                ["novo", "detalhe"].includes(view));
            return (
              <button
                key={item.id}
                className={active ? "nav-item active" : "nav-item"}
                onClick={() => navigate(item.id)}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === "registros" && (
                  <small>{visibleOccurrences.length}</small>
                )}
                {item.id === "acoes" && (
                  <small>{currentUser.role === "desenvolvedor"
                    ? developmentActions.filter((action) => !isActionClosed(action)).length
                    : overdueActions.length}</small>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-insight">
          <span className="insight-icon">
            <Activity size={18} />
          </span>
          <p>
            {currentUser.role === "desenvolvedor" ? (
              <><strong>{developmentActions.filter((action) => !isActionClosed(action)).length} ações abertas</strong>atribuídas a você</>
            ) : (
              <><strong>{overdueActions.length} prazos atingidos</strong>aguardando verificação</>
            )}
          </p>
        </div>
        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>
            <strong>Ambiente operacional</strong>
            <small>Dados do Supabase</small>
          </span>
        </div>
      </aside>

      <div className="portal-content">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={21} />
          </button>
          <div className="topbar-context">
            <span className="status-dot" />
            Operação de suporte
          </div>
          <div className="topbar-actions">
            <span className="demo-pill">Dados reais</span>
            <div className="profile-menu">
              <button
                className="profile-trigger"
                onClick={() => setProfileOpen((current) => !current)}
                aria-expanded={profileOpen}
              >
                <span className="avatar">{initials(currentUser.name)}</span>
                <span className="profile-copy">
                  <strong>{currentUser.name}</strong>
                  <small>{roleLabel[currentUser.role]}</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {profileOpen && (
                <div className="profile-popover">
                  <div>
                    <span className="avatar avatar-large">
                      {initials(currentUser.name)}
                    </span>
                    <p>
                      <strong>{currentUser.name}</strong>
                      <span>{currentUser.email}</span>
                    </p>
                  </div>
                  <span className="role-line">
                    <ShieldCheck size={16} />
                    {currentUser.title}
                  </span>
                  <button onClick={logout}>
                    <LogOut size={17} />
                    Sair do portal
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="workspace">
          {apiError && (
            <div className="api-error-banner" role="alert">
              <CircleAlert size={20} />
              <div>
                <strong>Não foi possível concluir a operação</strong>
                <span>{apiError}</span>
              </div>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => window.location.reload()}
              >
                <RefreshCcw size={16} />
                Tentar novamente
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => setApiError("")}
                aria-label="Fechar aviso"
              >
                <X size={17} />
              </button>
            </div>
          )}
          {view === "agenda" && (
            <AgendaView
              currentUser={currentUser}
              users={portalUsers}
              clients={clients}
              onNotify={setToast}
              refreshVersion={dataRefreshVersion}
            />
          )}

          {view === "acoes" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">Desenvolvimento</span>
                  <h1>Ações para Desenvolvedores</h1>
                  <p>Acompanhe encaminhamentos, previsões, prazos e validações das correções.</p>
                </div>
                <div className="development-heading-actions">
                  {currentUser.role === "administrador" && (
                    <div className="development-view-switch" aria-label="Visualização das ações">
                      <button type="button" className={actionListMode === "active" ? "is-active" : ""} onClick={() => setActionListMode("active")}><Code2 size={16} />Quadro ativo</button>
                      <button type="button" className={actionListMode === "archived" ? "is-active" : ""} onClick={() => void loadArchivedDevelopmentActions()}><Archive size={16} />Arquivadas</button>
                    </div>
                  )}
                  {currentUser.role !== "desenvolvedor" && actionListMode === "active" && (
                    <button className="button button-primary" onClick={openNewDevelopmentAction}>
                      <Plus size={18} /> Nova ação
                    </button>
                  )}
                </div>
              </div>

              <section className="action-period-panel" aria-label="Filtro de período das ações">
                <div className="action-period-copy">
                  <span><CalendarDays size={18} /></span>
                  <div><strong>Período das ações</strong><small>O período filtra os indicadores e a relação abaixo.</small></div>
                </div>
                <div className="action-period-controls">
                  <label className="field field-compact">
                    <span>Período</span>
                    <select value={actionDatePeriod} onChange={(event) => setActionDatePeriod(event.target.value)}>
                      <option value="all">Todo o período</option>
                      <option value="today">Hoje</option>
                      <option value="week">Esta semana</option>
                      <option value="7">Últimos 7 dias</option>
                      <option value="30">Últimos 30 dias</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </label>
                  {actionDatePeriod === "custom" && (
                    <>
                      <label className="field field-compact"><span>Data inicial</span><input type="date" value={actionDateStart} onChange={(event) => {
                        const nextStart = event.target.value;
                        setActionDateStart(nextStart);
                        if (actionDateEnd && actionDateEnd < nextStart) setActionDateEnd(nextStart);
                      }} /></label>
                      <label className="field field-compact"><span>Data final</span><input type="date" value={actionDateEnd} min={actionDateStart || undefined} onChange={(event) => setActionDateEnd(event.target.value)} /></label>
                    </>
                  )}
                  {actionDatePeriod !== "all" && (
                    <button type="button" className="button button-ghost" onClick={() => { setActionDatePeriod("all"); setActionDateStart(""); setActionDateEnd(""); }}><RefreshCcw size={15} />Limpar</button>
                  )}
                </div>
              </section>

              {actionListMode === "active" && currentUser.role !== "desenvolvedor" && periodOverdueActions.length > 0 && (
                <div className="development-deadline-alert" role="alert">
                  <AlertTriangle size={22} />
                  <div>
                    <strong>{periodOverdueActions.length} {periodOverdueActions.length === 1 ? "prazo foi atingido" : "prazos foram atingidos"}</strong>
                    <span>Verifique com o Desenvolvedor e valide se o problema foi solucionado.</span>
                  </div>
                </div>
              )}

              {actionListMode === "active" ? <section className="catalog-summary development-summary">
                <div>
                  <span className="metric-icon metric-blue"><Code2 size={20} /></span>
                  <p><strong>{periodDevelopmentActions.filter((action) => !isActionClosed(action)).length}</strong>ações abertas</p>
                </div>
                <div>
                  <span className="metric-icon metric-amber"><Clock3 size={20} /></span>
                  <p><strong>{periodDevelopmentActions.filter((action) => !action.dueAt && !isActionClosed(action)).length}</strong>sem previsão</p>
                </div>
                <div>
                  <span className="metric-icon metric-teal"><CheckCircle2 size={20} /></span>
                  <p><strong>{periodDevelopmentActions.filter((action) => action.status === "Em desenvolvimento").length}</strong>em desenvolvimento</p>
                </div>
                <div>
                  <span className="metric-icon metric-red"><AlertTriangle size={20} /></span>
                  <p><strong>{periodOverdueActions.length}</strong>prazo atingido</p>
                </div>
              </section> : <section className="catalog-summary development-summary archived-summary">
                <div><span className="metric-icon metric-blue"><Archive size={20} /></span><p><strong>{periodDevelopmentActions.length}</strong>ações arquivadas</p></div>
                <div><span className="metric-icon metric-teal"><CheckCircle2 size={20} /></span><p><strong>{periodDevelopmentActions.filter((action) => action.status === "Resolvida").length}</strong>resolvidas</p></div>
                <div><span className="metric-icon metric-red"><CircleAlert size={20} /></span><p><strong>{periodDevelopmentActions.filter((action) => action.status === "Reprovada").length}</strong>reprovadas</p></div>
              </section>}

              {actionsError && <div className="users-error" role="alert"><CircleAlert size={18} /><span>{actionsError}</span></div>}
              <section className="card records-card development-actions-card">
                <div className="records-toolbar">
                  <label className="search-control">
                    <Search size={18} />
                    <input value={actionSearch} onChange={(event) => setActionSearch(event.target.value)} placeholder="Buscar ação, problema ou Desenvolvedor" aria-label="Buscar ações" />
                  </label>
                  <div className="development-kanban-summary"><strong>{filteredDevelopmentActions.length}</strong><span>{filteredDevelopmentActions.length === 1 ? "ação" : "ações"} {actionListMode === "archived" ? "arquivadas" : "no quadro"}</span>{actionListMode === "active" && currentUser.role === "desenvolvedor" && <small>Arraste os cartões para alterar o status</small>}</div>
                </div>
                {actionsLoading ? (
                  <div className="users-loading"><span className="spinner" />Carregando ações…</div>
                ) : (
                  <div className={`development-kanban${actionListMode === "archived" ? " is-archived" : ""}`} aria-label={actionListMode === "archived" ? "Ações arquivadas" : "Quadro Kanban das ações"}>
                    {(actionListMode === "archived" ? (["Resolvida", "Reprovada"] as DevelopmentActionStatus[]) : DEVELOPMENT_STATUS_OPTIONS).map((status) => {
                      const columnActions = filteredDevelopmentActions.filter((action) => action.status === status);
                      return (
                        <section
                          className={`development-kanban-column kanban-${toneClass(status)}${dragOverStatus === status ? " is-drag-over" : ""}`}
                          key={status}
                          aria-label={`${status}: ${columnActions.length} ações`}
                          onDragEnter={actionListMode === "active" && currentUser.role === "desenvolvedor" ? (event) => { event.preventDefault(); setDragOverStatus(status); } : undefined}
                          onDragOver={actionListMode === "active" && currentUser.role === "desenvolvedor" ? (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOverStatus(status); } : undefined}
                          onDragLeave={actionListMode === "active" && currentUser.role === "desenvolvedor" ? (event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOverStatus(null); } : undefined}
                          onDrop={actionListMode === "active" && currentUser.role === "desenvolvedor" ? (event) => dropDevelopmentAction(event, status) : undefined}
                        >
                          <header>
                            <span className="kanban-status-mark" aria-hidden="true" />
                            <strong>{status}</strong>
                            <b>{columnActions.length}</b>
                          </header>
                          <div className="development-kanban-list">
                            {columnActions.length === 0 ? (
                              <div className="development-kanban-empty"><Code2 size={20} /><span>Nenhuma ação</span></div>
                            ) : columnActions.map((action) => (
                              <button
                                type="button"
                                className={`development-kanban-card${isActionOverdue(action) ? " is-overdue" : ""}${draggedActionId === action.id ? " is-dragging" : ""}${movingActionId === action.id ? " is-saving" : ""}`}
                                key={action.id}
                                aria-label={`${action.title}. Status ${action.status}. Clique para ver detalhes.`}
                                aria-busy={movingActionId === action.id}
                                onClick={() => openDevelopmentAction(action)}
                              >
                                <span className="development-kanban-card-top">
                                  <span className="development-kanban-card-identity">
                                    {actionListMode === "active" && currentUser.role === "desenvolvedor" && <span
                                      className="development-kanban-drag-handle"
                                      draggable={movingActionId !== action.id}
                                      title="Arrastar cartão"
                                      onClick={(event) => event.stopPropagation()}
                                      onDragStart={(event) => startDevelopmentActionDrag(event, action.id)}
                                      onDragEnd={finishDevelopmentActionDrag}
                                    ><GripVertical size={16} /></span>}
                                    <small>{action.number}</small>
                                  </span>
                                  <Badge tone={action.urgency || "Médio"}>{action.urgency || "Médio"}</Badge>
                                </span>
                                <strong className="development-kanban-title">{action.title}</strong>
                                <span className="development-kanban-reference"><span><Code2 size={14} /></span><span><strong>{action.systemId ? getSystem(action.systemId) : "Sistema não informado"}</strong><small>{action.systemId && action.moduleId ? getModule(action.systemId, action.moduleId) : "Módulo não informado"}</small></span></span>
                                <span className="development-kanban-person"><UserRound size={14} />{getActionUser(action.developerId)}</span>
                                <span className="development-kanban-deadline"><Clock3 size={14} /><span><small>Previsão</small><strong>{action.dueAt ? formatDate(action.dueAt) : "Não definida"}</strong></span></span>
                                {isActionOverdue(action) && <span className="development-kanban-overdue"><AlertTriangle size={14} />Prazo atingido</span>}
                                {action.archivedAt && <span className="development-kanban-archived"><Archive size={14} />Arquivada em {formatDate(action.archivedAt)}</span>}
                                <span className="development-kanban-open"><Eye size={14} />Ver detalhes</span>
                              </button>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {view === "dashboard" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">Dashboard</span>
                  <h1>Visão geral da operação</h1>
                  <p>
                    Acompanhe volume, recorrência e impacto das ocorrências.
                  </p>
                </div>
                <button
                  className="button button-primary"
                  onClick={startNewOccurrence}
                >
                  <Plus size={18} />
                  Nova ocorrência
                </button>
              </div>

              <section className="filter-panel" aria-label="Filtros do Dashboard">
                <div className="filter-panel-title">
                  <span>
                    <SlidersHorizontal size={17} />
                    Filtros
                  </span>
                  <button onClick={clearDashboardFilters}>Limpar filtros</button>
                </div>
                <div className="filter-grid">
                  <label className="field field-compact">
                    <span>Período</span>
                    <select
                      value={dashPeriod}
                      onChange={(event) => setDashPeriod(event.target.value)}
                    >
                      <option value="today">Hoje</option>
                      <option value="week">Esta semana</option>
                      <option value="7">Últimos 7 dias</option>
                      <option value="30">Últimos 30 dias</option>
                      <option value="custom">Personalizado</option>
                      <option value="all">Todo o período</option>
                    </select>
                  </label>
                  {dashPeriod === "custom" && (
                    <div
                      className="custom-period-fields"
                      role="group"
                      aria-label="Período personalizado"
                    >
                      <label className="field field-compact">
                        <span>Data inicial</span>
                        <input
                          type="date"
                          value={dashCustomStart}
                          max={dashCustomEnd || toDateInput(new Date())}
                          onChange={(event) => {
                            const value = event.target.value;
                            setDashCustomStart(value);
                            if (dashCustomEnd && value > dashCustomEnd) {
                              setDashCustomEnd(value);
                            }
                          }}
                        />
                      </label>
                      <label className="field field-compact">
                        <span>Data final</span>
                        <input
                          type="date"
                          value={dashCustomEnd}
                          min={dashCustomStart}
                          max={toDateInput(new Date())}
                          onChange={(event) => {
                            const value = event.target.value;
                            setDashCustomEnd(value);
                            if (dashCustomStart && value < dashCustomStart) {
                              setDashCustomStart(value);
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                  <label className="field field-compact">
                    <span>Sistema</span>
                    <select
                      value={dashSystem}
                      onChange={(event) => {
                        setDashSystem(event.target.value);
                        setDashModule("all");
                      }}
                    >
                      <option value="all">Todos</option>
                      {systems.map((system) => (
                        <option key={system.id} value={system.id}>
                          {system.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field field-compact">
                    <span>Módulo</span>
                    <select
                      value={dashModule}
                      onChange={(event) => setDashModule(event.target.value)}
                      disabled={dashSystem === "all"}
                    >
                      <option value="all">Todos</option>
                      {systems.find(
                        (system) => system.id === dashSystem,
                      )?.modules.map((module) => (
                        <option key={module.id} value={module.id}>
                          {module.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field field-compact">
                    <span>Status</span>
                    <select
                      value={dashStatus}
                      onChange={(event) => setDashStatus(event.target.value)}
                    >
                      <option value="all">Todos</option>
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field field-compact">
                    <span>Gravidade</span>
                    <select
                      value={dashSeverity}
                      onChange={(event) => setDashSeverity(event.target.value)}
                    >
                      <option value="all">Todas</option>
                      {SEVERITIES.map((severity) => (
                        <option key={severity}>{severity}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field field-compact">
                    <span>Cliente ou responsável</span>
                    <div className="input-with-icon compact-input">
                      <Search size={16} />
                      <input
                        value={dashQuery}
                        onChange={(event) => setDashQuery(event.target.value)}
                        placeholder="Buscar"
                      />
                    </div>
                  </label>
                </div>
              </section>

              <section className="metric-grid" aria-label="Indicadores principais">
                <article className="metric-card">
                  <div className="metric-top">
                    <span className="metric-icon metric-blue">
                      <ClipboardList size={20} />
                    </span>
                    <span className="metric-trend">período</span>
                  </div>
                  <strong>{dashboardData.length}</strong>
                  <p>Total de ocorrências</p>
                </article>
                <article className="metric-card">
                  <div className="metric-top">
                    <span className="metric-icon metric-teal">
                      <Clock3 size={20} />
                    </span>
                    <span className="metric-trend">atenção</span>
                  </div>
                  <strong>{dashboardOpen}</strong>
                  <p>Ocorrências em aberto</p>
                </article>
                <article className="metric-card">
                  <div className="metric-top">
                    <span className="metric-icon metric-amber">
                      <AlertTriangle size={20} />
                    </span>
                    <span className="metric-trend">alta + crítica</span>
                  </div>
                  <strong>{dashboardCritical}</strong>
                  <p>Maior gravidade</p>
                </article>
                <article className="metric-card metric-wide">
                  <div className="metric-top">
                    <span className="metric-icon metric-purple">
                      <RefreshCcw size={20} />
                    </span>
                    <span className="metric-trend">{recurrent?.count || 0} casos</span>
                  </div>
                  <strong className="metric-name">
                    {recurrent?.count ? recurrent.name : "Sem recorrência"}
                  </strong>
                  <p>Erro mais recorrente</p>
                </article>
                <article className="metric-card">
                  <div className="metric-top">
                    <span className="metric-icon metric-slate">
                      <Gauge size={20} />
                    </span>
                    <span className="metric-trend">{mostAffected?.count || 0} casos</span>
                  </div>
                  <strong className="metric-name">
                    {mostAffected?.count ? mostAffected.name : "—"}
                  </strong>
                  <p>Sistema mais afetado</p>
                </article>
              </section>

              {dashboardData.length === 0 ? (
                <section className="card">
                  <EmptyState
                    title="Nenhuma ocorrência encontrada"
                    description="Ajuste os filtros para ampliar o período ou consultar outros critérios."
                    action={
                      <button
                        className="button button-secondary"
                        onClick={clearDashboardFilters}
                      >
                        Limpar filtros
                      </button>
                    }
                  />
                </section>
              ) : (
                <>
                  <section className="chart-grid">
                    <article className="card chart-card daily-evolution-card">
                      <header className="card-header">
                        <div>
                          <span className="card-kicker">Tendência</span>
                          <h2>Evolução diária das ocorrências</h2>
                        </div>
                        <Activity size={20} />
                      </header>
                      <div className="daily-chart-wrap">
                        <svg
                          className="daily-chart"
                          viewBox={`0 0 ${dailyChartWidth} ${dailyChartHeight}`}
                          role="img"
                          aria-labelledby="daily-chart-title daily-chart-description"
                        >
                          <title id="daily-chart-title">
                            Evolução diária das ocorrências filtradas
                          </title>
                          <desc id="daily-chart-description">
                            {dashboardData.length} ocorrências distribuídas em{" "}
                            {dailyEvolution.length} dias.
                          </desc>
                          <defs>
                            <linearGradient
                              id="daily-area-gradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="0%" stopColor="#0f766e" stopOpacity="0.24" />
                              <stop offset="100%" stopColor="#0f766e" stopOpacity="0.02" />
                            </linearGradient>
                          </defs>
                          {[dailyChartTop, (dailyChartTop + dailyChartBaseline) / 2, dailyChartBaseline].map(
                            (y) => (
                              <line
                                key={y}
                                className="daily-grid-line"
                                x1={dailyChartLeft}
                                x2={dailyChartWidth - dailyChartRight}
                                y1={y}
                                y2={y}
                              />
                            ),
                          )}
                          <text className="daily-y-label" x="2" y={dailyChartTop + 4}>
                            {dailyMax}
                          </text>
                          <text
                            className="daily-y-label"
                            x="2"
                            y={(dailyChartTop + dailyChartBaseline) / 2 + 4}
                          >
                            {Math.ceil(dailyMax / 2)}
                          </text>
                          <text className="daily-y-label" x="2" y={dailyChartBaseline + 4}>
                            0
                          </text>
                          <polygon
                            className="daily-area"
                            points={dailyAreaPoints}
                          />
                          <polyline
                            className="daily-line"
                            points={dailyLinePoints}
                          />
                          {dailyChartPoints.map((item) => (
                            <g key={item.key}>
                              {(dailyChartPoints.length <= 31 || item.count > 0) && (
                                <circle
                                  className="daily-point"
                                  cx={item.x}
                                  cy={item.y}
                                  r={item.count > 0 ? 4 : 2.5}
                                >
                                  <title>
                                    {item.label}: {item.count}{" "}
                                    {item.count === 1 ? "ocorrência" : "ocorrências"}
                                  </title>
                                </circle>
                              )}
                              {(dailyChartPoints.length === 1 ||
                                item === dailyChartPoints[dailyChartPoints.length - 1] ||
                                dailyChartPoints.indexOf(item) % dailyLabelStep === 0) && (
                                <text
                                  className="daily-x-label"
                                  x={item.x}
                                  y={dailyChartBaseline + 21}
                                  textAnchor={
                                    item === dailyChartPoints[0]
                                      ? "start"
                                      : item === dailyChartPoints[dailyChartPoints.length - 1]
                                        ? "end"
                                        : "middle"
                                  }
                                >
                                  {item.label}
                                </text>
                              )}
                            </g>
                          ))}
                        </svg>
                      </div>
                      <div className="daily-chart-summary" aria-hidden="true">
                        <span>
                          <i /> Pico diário
                        </span>
                        <strong>
                          {dailyMax} {dailyMax === 1 ? "ocorrência" : "ocorrências"}
                        </strong>
                      </div>
                    </article>
                    <article className="card chart-card chart-card-wide">
                      <header className="card-header">
                        <div>
                          <span className="card-kicker">Distribuição</span>
                          <h2>Ocorrências por sistema</h2>
                        </div>
                        <BarChart3 size={20} />
                      </header>
                      <div className="bar-list">
                        {systemCounts.map((item, index) => (
                          <div className="bar-row" key={item.id}>
                            <div className="bar-label">
                              <span>{item.name}</span>
                              <strong>{item.count}</strong>
                            </div>
                            <div className="bar-track">
                              <span
                                className={"bar-fill bar-fill-" + index}
                                style={{
                                  width:
                                    String((item.count / maxSystemCount) * 100) +
                                    "%",
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                    <article className="card chart-card">
                      <header className="card-header">
                        <div>
                          <span className="card-kicker">Situação atual</span>
                          <h2>Distribuição por status</h2>
                        </div>
                      </header>
                      <div className="donut-layout">
                        <div className="donut" style={donutStyle}>
                          <span>
                            <strong>{dashboardData.length}</strong>
                            registros
                          </span>
                        </div>
                        <div className="donut-legend">
                          {statusCounts.map((item, index) => (
                            <div key={item.status}>
                              <span
                                style={{
                                  background:
                                    donutColors[index % donutColors.length],
                                }}
                              />
                              <p>
                                {item.status}
                                <strong>{item.count}</strong>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                  </section>

                  <section className="split-grid">
                    <article className="card">
                      <header className="card-header">
                        <div>
                          <span className="card-kicker">Catálogo</span>
                          <h2>Erros mais recorrentes</h2>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => navigate("catalogo")}
                        >
                          Ver Catálogo
                          <ChevronRight size={16} />
                        </button>
                      </header>
                      <ol className="ranking-list">
                        {catalogCounts.slice(0, 4).map((item, index) => (
                          <li key={item.id}>
                            <span className="rank-number">{index + 1}</span>
                            <div>
                              <strong>{item.name}</strong>
                              <small>
                                {item.count}{" "}
                                {item.count === 1 ? "ocorrência" : "ocorrências"}
                              </small>
                            </div>
                            <span className="rank-bar">
                              <i
                                style={{
                                  width:
                                    String(
                                      recurrent?.count
                                        ? (item.count / recurrent.count) * 100
                                        : 0,
                                    ) + "%",
                                }}
                              />
                            </span>
                          </li>
                        ))}
                      </ol>
                    </article>
                    <article className="card">
                      <header className="card-header">
                        <div>
                          <span className="card-kicker">Prioridade</span>
                          <h2>Gravidade das ocorrências</h2>
                        </div>
                      </header>
                      <div className="severity-list">
                        {SEVERITIES.slice()
                          .reverse()
                          .map((severity) => {
                            const count = dashboardData.filter(
                              (item) => item.severity === severity,
                            ).length;
                            return (
                              <div key={severity}>
                                <span className={"severity-dot " + toneClass(severity)} />
                                <p>{severity}</p>
                                <strong>{count}</strong>
                                <span className="severity-track">
                                  <i
                                    className={toneClass(severity)}
                                    style={{
                                      width:
                                        String(
                                          dashboardData.length
                                            ? (count / dashboardData.length) * 100
                                            : 0,
                                        ) + "%",
                                    }}
                                  />
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </article>
                  </section>

                  <section className="card recent-card">
                    <header className="card-header">
                      <div>
                        <span className="card-kicker">Atualizações</span>
                        <h2>Ocorrências recentes</h2>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate("registros")}
                      >
                        Ver todos
                        <ChevronRight size={16} />
                      </button>
                    </header>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Ocorrência</th>
                            <th>Cliente</th>
                            <th>Erro</th>
                            <th>Gravidade</th>
                            <th>Status</th>
                            <th>Responsável</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.slice(0, 5).map((item) => (
                            <tr key={item.id}>
                              <td>
                                <button
                                  className="table-primary"
                                  onClick={() => openDetail(item.id)}
                                >
                                  {item.number}
                                </button>
                                <small>{formatDate(item.occurredAt)}</small>
                              </td>
                              <td>{getClient(item.clientId)}</td>
                              <td className="table-error">
                                {getCatalogName(item)}
                              </td>
                              <td>
                                <Badge tone={item.severity}>{item.severity}</Badge>
                              </td>
                              <td>
                                <Badge tone={item.status}>{item.status}</Badge>
                              </td>
                              <td>
                                <span className="person-cell">
                                  <span className="avatar avatar-tiny">
                                    {initials(getUser(item.responsibleId))}
                                  </span>
                                  {getUser(item.responsibleId)}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="icon-button"
                                  onClick={() => openDetail(item.id)}
                                  aria-label={"Abrir " + item.number}
                                >
                                  <ChevronRight size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          {view === "registros" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">Registro</span>
                  <h1>Ocorrências registradas</h1>
                  <p>
                    Consulte, filtre e acompanhe cada ocorrência da operação.
                  </p>
                </div>
                <button
                  className="button button-primary"
                  onClick={startNewOccurrence}
                >
                  <Plus size={18} />
                  Novo registro
                </button>
              </div>
              <section className="card records-card">
                <div className="records-toolbar">
                  <label className="search-control">
                    <Search size={18} />
                    <input
                      value={recordSearch}
                      onChange={(event) => {
                        setRecordSearch(event.target.value);
                        setRecordPage(1);
                      }}
                      placeholder="Buscar por cliente, erro, sistema ou responsável"
                      aria-label="Buscar registros"
                    />
                  </label>
                  <div className="toolbar-filters">
                    <label>
                      <span className="sr-only">Período</span>
                      <select
                        value={recordPeriod}
                        onChange={(event) => {
                          setRecordPeriod(event.target.value);
                          setRecordPage(1);
                        }}
                        aria-label="Filtrar registros por período"
                      >
                        <option value="all">Todo o período</option>
                        <option value="today">Hoje</option>
                        <option value="week">Esta semana</option>
                        <option value="7">Últimos 7 dias</option>
                        <option value="30">Últimos 30 dias</option>
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Sistema</span>
                      <select
                        value={recordSystem}
                        onChange={(event) => {
                          setRecordSystem(event.target.value);
                          setRecordModule("all");
                          setRecordError("all");
                          setRecordPage(1);
                        }}
                      >
                        <option value="all">Todos os sistemas</option>
                        {systems.map((system) => (
                          <option key={system.id} value={system.id}>
                            {system.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Módulo</span>
                      <select
                        value={recordModule}
                        onChange={(event) => {
                          setRecordModule(event.target.value);
                          setRecordError("all");
                          setRecordPage(1);
                        }}
                        disabled={recordSystem === "all"}
                        aria-label="Filtrar registros por módulo"
                      >
                        <option value="all">
                          {recordSystem === "all"
                            ? "Selecione o sistema"
                            : "Todos os módulos"}
                        </option>
                        {systems.find(
                          (system) => system.id === recordSystem,
                        )?.modules.map((module) => (
                          <option key={module.id} value={module.id}>
                            {module.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Status</span>
                      <select
                        value={recordStatus}
                        onChange={(event) => {
                          setRecordStatus(event.target.value);
                          setRecordPage(1);
                        }}
                      >
                        <option value="all">Todos os status</option>
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Erro</span>
                      <select
                        value={recordError}
                        onChange={(event) => {
                          setRecordError(event.target.value);
                          setRecordPage(1);
                        }}
                        aria-label="Filtrar registros por erro"
                      >
                        <option value="all">Todos os erros</option>
                        {recordErrorOptions.map((errorName) => (
                          <option key={errorName} value={errorName}>{errorName}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="icon-button filter-indicator"
                      aria-label="Filtros ativos"
                    >
                      <Filter size={18} />
                    </button>
                  </div>
                </div>
                <div className="results-summary">
                  <span>
                    <strong>{filteredRecords.length}</strong>{" "}
                    {filteredRecords.length === 1
                      ? "ocorrência encontrada"
                      : "ocorrências encontradas"}
                  </span>
                  <small>Ordenado por data mais recente</small>
                </div>
                {filteredRecords.length === 0 ? (
                  <EmptyState
                    title="Nenhum registro corresponde à busca"
                    description="Remova um filtro ou use outro termo de pesquisa."
                    action={
                      <button
                        className="button button-secondary"
                        onClick={clearRecordFilters}
                      >
                        Limpar filtros
                      </button>
                    }
                  />
                ) : (
                  <div className="table-wrap records-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Data e hora</th>
                          <th>Cliente</th>
                          <th>Sistema / módulo</th>
                          <th>Erro</th>
                          <th>Gravidade</th>
                          <th>Status</th>
                          <th>Responsável</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRecords.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <strong>{formatDate(item.occurredAt)}</strong>
                              <small>{item.number}</small>
                            </td>
                            <td>{getClient(item.clientId)}</td>
                            <td>
                              <strong>{getSystem(item.systemId)}</strong>
                              <small>
                                {getModule(item.systemId, item.moduleId)}
                              </small>
                            </td>
                            <td className="table-error">
                              {getCatalogName(item)}
                              {!item.catalogItemId && (
                                <small className="other-label">Outro erro</small>
                              )}
                            </td>
                            <td>
                              <Badge tone={item.severity}>{item.severity}</Badge>
                            </td>
                            <td>
                              <Badge tone={item.status}>{item.status}</Badge>
                            </td>
                            <td>
                              <span className="person-cell">
                                <span className="avatar avatar-tiny">
                                  {initials(getUser(item.responsibleId))}
                                </span>
                                {getUser(item.responsibleId)}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className="icon-button"
                                  onClick={() => openDetail(item.id)}
                                  aria-label={"Visualizar " + item.number}
                                  title="Visualizar"
                                >
                                  <Eye size={17} />
                                </button>
                                {canEditOccurrence(item) && (
                                  <button
                                    className="icon-button"
                                    onClick={() => {
                                      setSelectedOccurrenceId(item.id);
                                      beginEditOccurrence(item);
                                    }}
                                    aria-label={"Editar " + item.number}
                                    title="Editar"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                )}
                                {currentUser.role === "administrador" && (
                                  <button
                                    className="icon-button danger-icon-button"
                                    onClick={() => setConfirmOccurrenceDeleteId(item.id)}
                                    aria-label={"Excluir " + item.number}
                                    title="Excluir com segurança"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <footer className="table-footer">
                  <span>
                    Exibindo{" "}
                    {filteredRecords.length === 0 ? 0 : recordPageStart + 1}–
                    {Math.min(
                      recordPageStart + RECORDS_PER_PAGE,
                      filteredRecords.length,
                    )}{" "}
                    de {filteredRecords.length} registros
                  </span>
                  <div className="pagination" aria-label="Paginação">
                    <button
                      type="button"
                      disabled={currentRecordPage === 1}
                      onClick={() =>
                        setRecordPage((page) => Math.max(1, page - 1))
                      }
                    >
                      Anterior
                    </button>
                    <span className="page-indicator" aria-live="polite">
                      Página {currentRecordPage} de {recordPageCount}
                    </span>
                    <button
                      type="button"
                      disabled={currentRecordPage === recordPageCount}
                      onClick={() =>
                        setRecordPage((page) =>
                          Math.min(recordPageCount, page + 1),
                        )
                      }
                    >
                      Próxima
                    </button>
                  </div>
                </footer>
              </section>
            </>
          )}

          {view === "novo" && (
            <>
              <button
                className="back-button"
                onClick={() => navigate("registros")}
              >
                <ArrowLeft size={17} />
                Voltar para registros
              </button>
              <div className="page-heading form-heading">
                <div>
                  <span className="eyebrow">Registro</span>
                  <h1>Nova ocorrência</h1>
                  <p>
                    Registre o relato com dados suficientes para classificação e
                    acompanhamento.
                  </p>
                </div>
              </div>
              <form className="form-layout" onSubmit={submitOccurrence} noValidate>
                <div className="form-main">
                  <section className="card form-section">
                    <header>
                      <span className="step-number">1</span>
                      <div>
                        <h2>Contexto da ocorrência</h2>
                        <p>Identifique o cliente e a área afetada.</p>
                      </div>
                    </header>
                    <div className="form-grid">
                      <label className="field field-span-2">
                        <span>
                          Cliente afetado <b>*</b>
                        </span>
                        <select
                          value={newForm.clientId}
                          onChange={(event) =>
                            setNewForm({
                              ...newForm,
                              clientId: event.target.value,
                            })
                          }
                          aria-invalid={Boolean(formErrors.clientId)}
                          aria-describedby={
                            formErrors.clientId ? "client-error" : undefined
                          }
                        >
                          <option value="">Selecione um cliente</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                        {formErrors.clientId && (
                          <small className="field-error" id="client-error">
                            {formErrors.clientId}
                          </small>
                        )}
                      </label>
                      <label className="field">
                        <span>
                          Sistema <b>*</b>
                        </span>
                        <select
                          value={newForm.systemId}
                          onChange={(event) =>
                            setNewForm({
                              ...newForm,
                              systemId: event.target.value,
                              moduleId: "",
                              catalogChoice: "",
                            })
                          }
                          aria-invalid={Boolean(formErrors.systemId)}
                          aria-describedby={
                            formErrors.systemId ? "system-error" : undefined
                          }
                        >
                          <option value="">Selecione</option>
                          {systems.map((system) => (
                            <option key={system.id} value={system.id}>
                              {system.name}
                            </option>
                          ))}
                        </select>
                        {formErrors.systemId && (
                          <small className="field-error" id="system-error">
                            {formErrors.systemId}
                          </small>
                        )}
                      </label>
                      <label className="field">
                        <span>
                          Módulo ou funcionalidade <b>*</b>
                        </span>
                        <select
                          value={newForm.moduleId}
                          onChange={(event) =>
                            setNewForm({
                              ...newForm,
                              moduleId: event.target.value,
                              catalogChoice: "",
                            })
                          }
                          disabled={!newForm.systemId}
                          aria-invalid={Boolean(formErrors.moduleId)}
                          aria-describedby={
                            formErrors.moduleId ? "module-error" : undefined
                          }
                        >
                          <option value="">Selecione</option>
                          {systems.find(
                            (system) => system.id === newForm.systemId,
                          )?.modules.map((module) => (
                            <option key={module.id} value={module.id}>
                              {module.name}
                            </option>
                          ))}
                        </select>
                        {formErrors.moduleId && (
                          <small className="field-error" id="module-error">
                            {formErrors.moduleId}
                          </small>
                        )}
                      </label>
                    </div>
                  </section>

                  <section className="card form-section">
                    <header>
                      <span className="step-number">2</span>
                      <div>
                        <h2>Classificação do erro</h2>
                        <p>Use um item padronizado sempre que possível.</p>
                      </div>
                    </header>
                    <div className="form-grid">
                      <label className="field field-span-2">
                        <span>
                          Erro padronizado <b>*</b>
                        </span>
                        <select
                          value={newForm.catalogChoice}
                          onChange={(event) =>
                            setNewForm({
                              ...newForm,
                              catalogChoice: event.target.value,
                              otherError: "",
                            })
                          }
                          disabled={!newForm.moduleId}
                          aria-invalid={Boolean(formErrors.catalogChoice)}
                          aria-describedby={
                            formErrors.catalogChoice
                              ? "catalog-choice-error"
                              : undefined
                          }
                        >
                          <option value="">Selecione um erro do Catálogo</option>
                          {catalog
                            .filter(
                              (item) =>
                                item.active &&
                                item.systemId === newForm.systemId &&
                                (item.moduleId === newForm.moduleId ||
                                  generalModuleIds.has(item.moduleId)),
                            )
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          <option value="other">Outro erro</option>
                        </select>
                        {formErrors.catalogChoice && (
                          <small
                            className="field-error"
                            id="catalog-choice-error"
                          >
                            {formErrors.catalogChoice}
                          </small>
                        )}
                      </label>
                      {newForm.catalogChoice === "other" && (
                        <label className="field field-span-2">
                          <span>
                            Descreva o outro erro <b>*</b>
                          </span>
                          <input
                            value={newForm.otherError}
                            onChange={(event) =>
                              setNewForm({
                                ...newForm,
                                otherError: event.target.value.slice(0, 120),
                              })
                            }
                            placeholder="Nome curto e reconhecível para o erro"
                            aria-invalid={Boolean(formErrors.otherError)}
                            aria-describedby={
                              formErrors.otherError
                                ? "other-error-message"
                                : undefined
                            }
                          />
                          <small className="field-help">
                            {newForm.otherError.length}/120 caracteres
                          </small>
                          {formErrors.otherError && (
                            <small
                              className="field-error"
                              id="other-error-message"
                            >
                              {formErrors.otherError}
                            </small>
                          )}
                        </label>
                      )}
                      <label className="field field-span-2">
                        <span>Descrição complementar</span>
                        <textarea
                          value={newForm.description}
                          onChange={(event) =>
                            setNewForm({
                              ...newForm,
                              description: event.target.value.slice(0, 700),
                            })
                          }
                          placeholder="Inclua contexto, passos realizados e impacto observado."
                          rows={5}
                        />
                        <small className="field-help">
                          {newForm.description.length}/700 caracteres
                        </small>
                      </label>
                    </div>
                  </section>

                  <section className="card form-section">
                    <header>
                      <span className="step-number">3</span>
                      <div>
                        <h2>Impacto e acompanhamento</h2>
                        <p>Defina prioridade, momento e responsável.</p>
                      </div>
                    </header>
                    <div className="form-grid">
                      <label className="field">
                        <span>
                          Gravidade <b>*</b>
                        </span>
                        <select
                          value={newForm.severity}
                          onChange={(event) =>
                            setNewForm({
                              ...newForm,
                              severity: event.target.value as Severity,
                            })
                          }
                        >
                          {SEVERITIES.map((severity) => (
                            <option key={severity}>{severity}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>
                          Data e horário <b>*</b>
                        </span>
                        <input
                          type="datetime-local"
                          value={newForm.occurredAt}
                          max={toDateTimeLocal(new Date())}
                          onChange={(event) =>
                            setNewForm({
                              ...newForm,
                              occurredAt: event.target.value,
                            })
                          }
                          aria-invalid={Boolean(formErrors.occurredAt)}
                          aria-describedby={
                            formErrors.occurredAt ? "occurred-error" : undefined
                          }
                        />
                        {formErrors.occurredAt && (
                          <small className="field-error" id="occurred-error">
                            {formErrors.occurredAt}
                          </small>
                        )}
                      </label>
                      <label className="field">
                        <span>
                          Status inicial <b>*</b>
                        </span>
                        <select
                          value={newForm.status}
                          onChange={(event) =>
                            setNewForm({
                              ...newForm,
                              status: event.target.value as OccurrenceStatus,
                            })
                          }
                        >
                          {STATUS_OPTIONS.slice(0, 3).map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>
                          Responsável <b>*</b>
                        </span>
                        <select
                          value={newForm.responsibleId}
                          onChange={(event) =>
                            setNewForm({
                              ...newForm,
                              responsibleId: event.target.value,
                            })
                          }
                          disabled={currentUser.role === "suporte"}
                          aria-invalid={Boolean(formErrors.responsibleId)}
                          aria-describedby={
                            formErrors.responsibleId
                              ? "responsible-error"
                              : undefined
                          }
                        >
                          {portalUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                        {currentUser.role === "suporte" && (
                          <small className="field-help">
                            A ocorrência será atribuída a você.
                          </small>
                        )}
                        {formErrors.responsibleId && (
                          <small className="field-error" id="responsible-error">
                            {formErrors.responsibleId}
                          </small>
                        )}
                      </label>
                    </div>
                  </section>

                  <section className="card form-section">
                    <header>
                      <span className="step-number">4</span>
                      <div>
                        <h2>Evidências</h2>
                        <p>Anexe até 3 imagens, vídeos curtos ou arquivos TXT.</p>
                      </div>
                    </header>
                    <label className="upload-zone">
                      <UploadCloud size={26} />
                      <strong>Selecione os arquivos</strong>
                      <span>PNG, JPG, WEBP, MP4 ou TXT</span>
                      <input
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,.webp,.mp4,.txt"
                        onChange={handleFiles}
                        aria-describedby={
                          formErrors.attachments ? "attachments-error" : undefined
                        }
                      />
                    </label>
                    {formErrors.attachments && (
                      <small className="field-error" id="attachments-error">
                        {formErrors.attachments}
                      </small>
                    )}
                    {newForm.attachments.length > 0 && (
                      <div className="attachment-list">
                        {newForm.attachments.map((file) => (
                          <span key={file}>
                            <Paperclip size={15} />
                            {file}
                            <button
                              type="button"
                              onClick={() =>
                                setNewForm({
                                  ...newForm,
                                  attachments: newForm.attachments.filter(
                                    (item) => item !== file,
                                  ),
                                })
                              }
                              aria-label={"Remover " + file}
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
                <aside className="form-aside">
                  <section className="card summary-card">
                    <h2>Resumo do registro</h2>
                    <dl>
                      <div>
                        <dt>Cliente</dt>
                        <dd>
                          {newForm.clientId
                            ? getClient(newForm.clientId)
                            : "Não informado"}
                        </dd>
                      </div>
                      <div>
                        <dt>Área afetada</dt>
                        <dd>
                          {newForm.systemId
                            ? getSystem(newForm.systemId) +
                              (newForm.moduleId
                                ? " · " +
                                  getModule(
                                    newForm.systemId,
                                    newForm.moduleId,
                                  )
                                : "")
                            : "Não informada"}
                        </dd>
                      </div>
                      <div>
                        <dt>Gravidade</dt>
                        <dd>
                          <Badge tone={newForm.severity}>
                            {newForm.severity}
                          </Badge>
                        </dd>
                      </div>
                      <div>
                        <dt>Responsável</dt>
                        <dd>{getUser(newForm.responsibleId)}</dd>
                      </div>
                    </dl>
                    <div className="summary-note">
                      <ShieldCheck size={18} />
                      <p>
                        Os dados serão validados antes de integrar os
                        indicadores do Dashboard.
                      </p>
                    </div>
                    <button
                      type="submit"
                      className="button button-primary button-wide"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner" />
                          Salvando…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          Salvar ocorrência
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-wide"
                      onClick={() => navigate("registros")}
                    >
                      Cancelar
                    </button>
                  </section>
                </aside>
              </form>
            </>
          )}

          {view === "detalhe" && currentOccurrence && (
            <>
              <button
                className="back-button"
                onClick={() => navigate("registros")}
              >
                <ArrowLeft size={17} />
                Voltar para registros
              </button>
              <div className="detail-heading">
                <div>
                  <div className="detail-title-line">
                    <span className="eyebrow">Registro</span>
                    <span className="record-number">{currentOccurrence.number}</span>
                  </div>
                  <h1>{getCatalogName(currentOccurrence)}</h1>
                  <p>
                    Registrada em {formatDate(currentOccurrence.createdAt)} por{" "}
                    {getUser(currentOccurrence.authorId)}.
                  </p>
                </div>
                <div className="detail-actions">
                  <Badge tone={currentOccurrence.severity}>
                    {currentOccurrence.severity}
                  </Badge>
                  <Badge tone={currentOccurrence.status}>
                    {currentOccurrence.status}
                  </Badge>
                  {canEditOccurrence(currentOccurrence) && (
                    <button
                      className="button button-secondary"
                      onClick={() => beginEditOccurrence(currentOccurrence)}
                    >
                      <Pencil size={17} />
                      Editar
                    </button>
                  )}
                  {currentUser.role === "administrador" && (
                    <button
                      className="button button-danger-soft"
                      onClick={() => setConfirmOccurrenceDeleteId(currentOccurrence.id)}
                    >
                      <Trash2 size={17} />
                      Excluir
                    </button>
                  )}
                </div>
              </div>
              <div className="detail-layout">
                <div className="detail-main">
                  <section className="card detail-card">
                    <header className="card-header">
                      <div>
                        <span className="card-kicker">Informações</span>
                        <h2>Dados da ocorrência</h2>
                      </div>
                      <FileText size={20} />
                    </header>
                    <dl className="detail-grid">
                      <div>
                        <dt>Cliente afetado</dt>
                        <dd>{getClient(currentOccurrence.clientId)}</dd>
                      </div>
                      <div>
                        <dt>Data e horário</dt>
                        <dd>{formatDate(currentOccurrence.occurredAt)}</dd>
                      </div>
                      <div>
                        <dt>Sistema</dt>
                        <dd>{getSystem(currentOccurrence.systemId)}</dd>
                      </div>
                      <div>
                        <dt>Módulo</dt>
                        <dd>
                          {getModule(
                            currentOccurrence.systemId,
                            currentOccurrence.moduleId,
                          )}
                        </dd>
                      </div>
                      <div className="detail-span-2">
                        <dt>Erro classificado</dt>
                        <dd>
                          {getCatalogName(currentOccurrence)}
                          {!currentOccurrence.catalogItemId && (
                            <Badge tone="Outro erro">Outro erro</Badge>
                          )}
                        </dd>
                      </div>
                      <div className="detail-span-2">
                        <dt>Descrição complementar</dt>
                        <dd className="detail-description">
                          {currentOccurrence.description ||
                            "Nenhuma descrição complementar informada."}
                        </dd>
                      </div>
                    </dl>
                  </section>
                  <section className="card detail-card">
                    <header className="card-header">
                      <div>
                        <span className="card-kicker">Arquivos</span>
                        <h2>Evidências</h2>
                      </div>
                      <Paperclip size={20} />
                    </header>
                    {currentOccurrence.attachments.length ? (
                      <div className="evidence-grid">
                        {currentOccurrence.attachments.map((file) => (
                          <div key={file} className="evidence-item">
                            <span>
                              <FileText size={20} />
                            </span>
                            <p>
                              <strong>{evidenceName(file)}</strong>
                              <small>Arquivo anexado</small>
                            </p>
                            {file.includes("/") ? (
                              <a
                                className="icon-button"
                                aria-label={"Ver " + evidenceName(file)}
                                href={`/api/occurrences?evidence=1&occurrenceId=${encodeURIComponent(currentOccurrence.id)}&path=${encodeURIComponent(file)}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Eye size={17} />
                              </a>
                            ) : (
                              <span className="icon-button" title="Arquivo antigo sem conteúdo armazenado">
                                <FileText size={17} />
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted-copy">
                        Nenhuma evidência foi anexada a esta ocorrência.
                      </p>
                    )}
                  </section>
                </div>
                <aside className="detail-aside">
                  <section className="card owner-card">
                    <span className="card-kicker">Acompanhamento</span>
                    <h2>Responsável</h2>
                    <div className="owner-profile">
                      <span className="avatar avatar-large">
                        {initials(getUser(currentOccurrence.responsibleId))}
                      </span>
                      <p>
                        <strong>{getUser(currentOccurrence.responsibleId)}</strong>
                        <small>
                          {
                            portalUsers.find(
                              (user) =>
                                user.id === currentOccurrence.responsibleId,
                            )?.title
                          }
                        </small>
                      </p>
                    </div>
                    <dl>
                      <div>
                        <dt>Status atual</dt>
                        <dd>
                          <Badge tone={currentOccurrence.status}>
                            {currentOccurrence.status}
                          </Badge>
                        </dd>
                      </div>
                      <div>
                        <dt>Última atualização</dt>
                        <dd>{formatDate(currentOccurrence.updatedAt)}</dd>
                      </div>
                    </dl>
                  </section>
                  <section className="card timeline-card">
                    <span className="card-kicker">Histórico</span>
                    <h2>Atividade recente</h2>
                    <div className="timeline">
                      <div>
                        <i />
                        <p>
                          <strong>Ocorrência atualizada</strong>
                          <span>{formatDate(currentOccurrence.updatedAt)}</span>
                        </p>
                      </div>
                      <div>
                        <i />
                        <p>
                          <strong>Registro criado</strong>
                          <span>
                            {formatDate(currentOccurrence.createdAt)} por{" "}
                            {getUser(currentOccurrence.authorId)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}

          {view === "catalogo" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">Catálogo</span>
                  <h1>Erros padronizados</h1>
                  <p>
                    Mantenha uma base curta e consistente para classificar as
                    ocorrências.
                  </p>
                </div>
                {canManageCatalog && (
                  <div className="page-heading-actions">
                    <button
                      className="button button-secondary"
                      onClick={openReferenceManager}
                    >
                      <SlidersHorizontal size={18} />
                      Sistemas e módulos
                    </button>
                    <button
                      className="button button-primary"
                      onClick={openNewCatalog}
                    >
                      <Plus size={18} />
                      Novo item
                    </button>
                  </div>
                )}
              </div>
              {canManageCatalog && systems.length === 0 && (
                <section className="reference-empty-state">
                  <div>
                    <strong>Cadastre o primeiro sistema</strong>
                    <p>
                      Depois você poderá criar os módulos e usar ambos nos itens
                      do Catálogo.
                    </p>
                  </div>
                  <button
                    className="button button-primary"
                    onClick={openReferenceManager}
                  >
                    <Plus size={18} />
                    Criar sistema
                  </button>
                </section>
              )}
              <section className="catalog-summary">
                <div>
                  <span className="metric-icon metric-teal">
                    <BookOpenCheck size={20} />
                  </span>
                  <p>
                    <strong>{catalog.filter((item) => item.active).length}</strong>
                    itens ativos
                  </p>
                </div>
                <div>
                  <span className="metric-icon metric-blue">
                    <RefreshCcw size={20} />
                  </span>
                  <p>
                    <strong>
                      {
                        visibleOccurrences.filter((item) => item.catalogItemId)
                          .length
                      }
                    </strong>
                    ocorrências padronizadas
                  </p>
                </div>
                <div>
                  <span className="metric-icon metric-amber">
                    <AlertTriangle size={20} />
                  </span>
                  <p>
                    <strong>
                      {
                        visibleOccurrences.filter((item) => !item.catalogItemId)
                          .length
                      }
                    </strong>
                    outros erros para revisar
                  </p>
                </div>
              </section>
              {!canManageCatalog && (
                <div className="permission-note">
                  <ShieldCheck size={18} />
                  Você tem acesso de consulta. A manutenção do Catálogo é
                  reservada ao perfil Administrador.
                </div>
              )}
              <section className="card records-card">
                <div className="records-toolbar">
                  <label className="search-control">
                    <Search size={18} />
                    <input
                      value={catalogSearch}
                      onChange={(event) => setCatalogSearch(event.target.value)}
                      placeholder="Buscar pelo nome ou termo alternativo"
                      aria-label="Buscar no Catálogo"
                    />
                  </label>
                  <div className="toolbar-filters">
                    <label>
                      <span className="sr-only">Sistema</span>
                      <select
                        value={catalogSystem}
                        onChange={(event) => setCatalogSystem(event.target.value)}
                      >
                        <option value="all">Todos os sistemas</option>
                        {systems.map((system) => (
                          <option key={system.id} value={system.id}>
                            {system.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Status</span>
                      <select
                        value={catalogStatus}
                        onChange={(event) => setCatalogStatus(event.target.value)}
                      >
                        <option value="all">Ativos e inativos</option>
                        <option value="active">Ativos</option>
                        <option value="inactive">Inativos</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div className="results-summary">
                  <span>
                    <strong>{filteredCatalog.length}</strong>{" "}
                    {filteredCatalog.length === 1
                      ? "item encontrado"
                      : "itens encontrados"}
                  </span>
                  <small>Duplicidades são comparadas por sistema e módulo</small>
                </div>
                {filteredCatalog.length === 0 ? (
                  <EmptyState
                    title="Nenhum item encontrado"
                    description="Tente outro termo ou remova os filtros aplicados."
                  />
                ) : (
                  <div className="table-wrap catalog-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Nome padronizado</th>
                          <th>Sistema / módulo</th>
                          <th>Status</th>
                          <th>Usos</th>
                          <th>Última atualização</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCatalog.map((item) => (
                          <tr key={item.id}>
                            <td className="catalog-name">
                              <strong>{item.name}</strong>
                              <small>
                                {item.aliases.length
                                  ? item.aliases.join(" · ")
                                  : "Sem termos alternativos"}
                              </small>
                            </td>
                            <td>
                              <strong>{getSystem(item.systemId)}</strong>
                              <small>
                                {getModule(item.systemId, item.moduleId)}
                              </small>
                            </td>
                            <td>
                              <Badge tone={item.active ? "Ativo" : "Inativo"}>
                                {item.active ? "Ativo" : "Inativo"}
                              </Badge>
                            </td>
                            <td>
                              <strong className="usage-count">
                                {catalogUsage(item.id)}
                              </strong>
                            </td>
                            <td>{formatDate(item.updatedAt, false)}</td>
                            <td>
                              {canManageCatalog ? (
                                <div className="table-actions">
                                  <button
                                    className="icon-button"
                                    onClick={() => openEditCatalog(item)}
                                    aria-label={"Editar " + item.name}
                                    title="Editar"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    className={
                                      item.active
                                        ? "status-action status-action-off"
                                        : "status-action"
                                    }
                                    onClick={() => setConfirmCatalogId(item.id)}
                                  >
                                    {item.active ? "Inativar" : "Ativar"}
                                  </button>
                                </div>
                              ) : (
                                <span className="read-only">Somente leitura</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {view === "usuarios" && currentUser.role === "administrador" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">Administração</span>
                  <h1>Usuários</h1>
                  <p>
                    Crie contas, acompanhe acessos e controle as permissões de
                    cada pessoa.
                  </p>
                </div>
                <button className="button button-primary" onClick={openNewUser}>
                  <UserPlus size={18} />
                  Novo usuário
                </button>
              </div>

              <section className="catalog-summary users-summary">
                <div>
                  <span className="metric-icon metric-teal">
                    <UsersRound size={20} />
                  </span>
                  <p>
                    <strong>{managedUsers.filter((user) => user.active).length}</strong>
                    usuários ativos
                  </p>
                </div>
                <div>
                  <span className="metric-icon metric-blue">
                    <ShieldCheck size={20} />
                  </span>
                  <p>
                    <strong>
                      {
                        managedUsers.filter(
                          (user) => user.active && user.role === "administrador",
                        ).length
                      }
                    </strong>
                    administradores
                  </p>
                </div>
                <div>
                  <span className="metric-icon metric-amber">
                    <UserCog size={20} />
                  </span>
                  <p>
                    <strong>{managedUsers.filter((user) => !user.active).length}</strong>
                    acessos bloqueados
                  </p>
                </div>
              </section>

              <div className="permission-note user-security-note">
                <ShieldCheck size={18} />
                Perfis definem o que cada pessoa pode consultar ou alterar. Ao
                bloquear uma conta, as sessões abertas são encerradas.
              </div>

              {usersError && (
                <div className="users-error" role="alert">
                  <span>{usersError}</span>
                  <button className="button button-secondary" onClick={reloadManagedUsers}>
                    Tentar novamente
                  </button>
                </div>
              )}

              <section className="card records-card">
                <div className="records-toolbar">
                  <label className="search-control">
                    <Search size={18} />
                    <input
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder="Buscar por nome ou e-mail"
                      aria-label="Buscar usuários"
                    />
                  </label>
                  <div className="toolbar-filters">
                    <label>
                      <span className="sr-only">Perfil</span>
                      <select
                        value={userRoleFilter}
                        onChange={(event) => setUserRoleFilter(event.target.value)}
                      >
                        <option value="all">Todos os perfis</option>
                        <option value="suporte">Suporte</option>
                        <option value="desenvolvedor">Desenvolvedor</option>
                        <option value="administrador">Administrador</option>
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Status</span>
                      <select
                        value={userStatusFilter}
                        onChange={(event) => setUserStatusFilter(event.target.value)}
                      >
                        <option value="all">Ativos e bloqueados</option>
                        <option value="active">Ativos</option>
                        <option value="inactive">Bloqueados</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="results-summary">
                  <span>
                    <strong>{filteredManagedUsers.length}</strong>{" "}
                    {filteredManagedUsers.length === 1
                      ? "usuário encontrado"
                      : "usuários encontrados"}
                  </span>
                  <small>Somente administradores podem gerenciar contas</small>
                </div>

                {usersLoading ? (
                  <div className="users-loading" aria-live="polite">
                    <span className="spinner" />
                    Carregando usuários…
                  </div>
                ) : filteredManagedUsers.length === 0 ? (
                  <EmptyState
                    title="Nenhum usuário encontrado"
                    description="Tente outro termo ou remova os filtros aplicados."
                  />
                ) : (
                  <div className="table-wrap users-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Usuário</th>
                          <th>Perfil e permissões</th>
                          <th>Status</th>
                          <th>Último acesso</th>
                          <th>Criado em</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredManagedUsers.map((user) => (
                          <tr key={user.id}>
                            <td>
                              <div className="user-cell">
                                <span className="avatar">{initials(user.name)}</span>
                                <p>
                                  <strong>{user.name}</strong>
                                  <small>{user.email}</small>
                                </p>
                              </div>
                            </td>
                            <td>
                              <Badge tone={user.role}>{roleLabel[user.role]}</Badge>
                              <div className="permission-list">
                                {rolePermissions[user.role].slice(0, 2).map((permission) => (
                                  <span key={permission}>{permission}</span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <Badge tone={user.active ? "Ativo" : "Bloqueado"}>
                                {user.active ? "Ativo" : "Bloqueado"}
                              </Badge>
                            </td>
                            <td>
                              {user.lastLoginAt
                                ? formatDate(user.lastLoginAt)
                                : "Ainda não acessou"}
                            </td>
                            <td>{formatDate(user.createdAt, false)}</td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className="icon-button"
                                  onClick={() => openEditUser(user)}
                                  aria-label={"Editar " + user.name}
                                  title="Editar usuário e permissões"
                                >
                                  <Pencil size={16} />
                                </button>
                                {user.id === currentUser.id ? (
                                  <span className="self-account">Sua conta</span>
                                ) : (
                                  <>
                                    <button
                                      className={
                                        user.active
                                          ? "status-action status-action-off"
                                          : "status-action"
                                      }
                                      onClick={() => setConfirmUserId(user.id)}
                                    >
                                      {user.active ? "Bloquear" : "Reativar"}
                                    </button>
                                    <button
                                      className="icon-button danger-icon-button"
                                      onClick={() => setConfirmUserDeleteId(user.id)}
                                      aria-label={"Excluir " + user.name}
                                      title="Excluir com segurança"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {actionModalOpen && currentUser.role !== "desenvolvedor" && (
        <Modal
          title="Nova ação para Desenvolvedor"
          description="Encaminhe o problema com contexto suficiente para análise e correção."
          size="large"
          onClose={() => setActionModalOpen(false)}
          footer={
            <>
              <button className="button button-ghost" onClick={() => setActionModalOpen(false)}>Cancelar</button>
              <button className="button button-primary" onClick={createDevelopmentAction} disabled={saving}>
                {saving ? <span className="spinner" /> : <Code2 size={17} />}
                {saving ? "Encaminhando…" : "Encaminhar ação"}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <label className="field field-span-2">
              <span>Título da ação <b>*</b></span>
              <input value={actionDraft.title} onChange={(event) => setActionDraft({ ...actionDraft, title: event.target.value.slice(0, 120) })} placeholder="Resumo objetivo do problema" />
            </label>
            <label className="field field-span-2">
              <span>Descrição do problema <b>*</b></span>
              <textarea rows={5} value={actionDraft.problemDescription} onChange={(event) => setActionDraft({ ...actionDraft, problemDescription: event.target.value.slice(0, 3000) })} placeholder="Explique o comportamento atual, impacto e como reproduzir" />
            </label>
            <label className="field">
              <span>Sistema <b>*</b></span>
              <select value={actionDraft.systemId} onChange={(event) => {
                const system = systems.find((item) => item.id === event.target.value);
                setActionDraft({ ...actionDraft, systemId: event.target.value, moduleId: system?.modules[0]?.id || "" });
              }}>
                <option value="">Selecione</option>
                {systems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Módulo <b>*</b></span>
              <select value={actionDraft.moduleId} disabled={!actionDraft.systemId} onChange={(event) => setActionDraft({ ...actionDraft, moduleId: event.target.value })}>
                <option value="">Selecione</option>
                {systems.find((system) => system.id === actionDraft.systemId)?.modules.map((module) => <option key={module.id} value={module.id}>{module.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Data e horário da identificação <b>*</b></span>
              <input type="datetime-local" value={actionDraft.identifiedAt} onChange={(event) => setActionDraft({ ...actionDraft, identifiedAt: event.target.value })} />
            </label>
            <label className="field">
              <span>Desenvolvedor responsável <b>*</b></span>
              <select value={actionDraft.developerId} onChange={(event) => setActionDraft({ ...actionDraft, developerId: event.target.value })}>
                <option value="">Selecione</option>
                {developerUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
              {developerUsers.length === 0 && <small className="field-help">Crie primeiro uma conta com o perfil Desenvolvedor na aba Usuários.</small>}
            </label>
            <label className="field">
              <span>Urgência <b>*</b></span>
              <select value={actionDraft.urgency} onChange={(event) => setActionDraft({ ...actionDraft, urgency: event.target.value as DevelopmentActionUrgency })}>
                {DEVELOPMENT_URGENCY_OPTIONS.map((urgency) => <option key={urgency}>{urgency}</option>)}
              </select>
            </label>
            {systems.length === 0 && <div className="form-alert field-span-2" role="alert">Cadastre primeiro um Sistema e um Módulo na aba Catálogo.</div>}
            <div className="field field-span-2">
              <span>Evidências do problema</span>
              <label className="upload-zone">
                <UploadCloud size={24} />
                <strong>Selecionar evidências</strong>
                <span>Até 5 arquivos · JPG, PNG, WEBP ou PDF · máximo 10 MB</span>
                <input type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf" onChange={handleActionEvidence} />
              </label>
              {actionEvidenceFiles.length > 0 && (
                <div className="attachment-list">
                  {actionEvidenceFiles.map((file) => (
                    <span key={file.name + file.lastModified}><Paperclip size={15} />{file.name}</span>
                  ))}
                </div>
              )}
            </div>
            {actionFormError && <div className="form-alert field-span-2" role="alert">{actionFormError}</div>}
          </div>
        </Modal>
      )}

      {selectedAction && (
        <Modal
          title={`${selectedAction.number} · ${selectedAction.title}`}
          description="Detalhes, prazo e acompanhamento da ação encaminhada."
          size="large"
          onClose={() => { setSelectedActionId(null); setEditingActionDetails(false); setActionUpdateEvidenceFiles([]); }}
          footer={
            <>
              {currentUser.role === "administrador" && selectedAction.archivedAt && (
                <button className="button button-secondary" onClick={() => void setDevelopmentActionArchived(selectedAction, false)} disabled={saving}>
                  <ArchiveRestore size={17} /> Restaurar ação
                </button>
              )}
              {currentUser.role === "administrador" && !selectedAction.archivedAt && isActionClosed(selectedAction) && (
                <button className="button button-secondary" onClick={() => void setDevelopmentActionArchived(selectedAction, true)} disabled={saving}>
                  <Archive size={17} /> Arquivar ação
                </button>
              )}
              {currentUser.role === "administrador" && !selectedAction.archivedAt && (
                <button className="button button-danger" onClick={() => setConfirmActionDeleteId(selectedAction.id)}>
                  <Trash2 size={17} /> Excluir ação
                </button>
              )}
              <button className="button button-ghost" onClick={() => setSelectedActionId(null)}>Fechar</button>
            </>
          }
        >
          <div className="development-action-detail">
            <div className="development-action-card-toolbar">
              <div><span>Informações da ação</span><strong>{selectedAction.number}</strong></div>
              {currentUser.role !== "desenvolvedor" && !selectedAction.archivedAt && <button type="button" className="icon-button" onClick={() => startEditingActionDetails(selectedAction)} aria-label="Editar informações da ação" title="Editar informações da ação"><Pencil size={18} /></button>}
            </div>
            {editingActionDetails && currentUser.role !== "desenvolvedor" && (
              <section className="development-action-edit-panel">
                <div className="development-action-edit-heading">
                  <div><h3>Editar informações</h3><p>Atualize os dados principais sem alterar o histórico da ação.</p></div>
                  <button type="button" className="icon-button" onClick={() => setEditingActionDetails(false)} aria-label="Cancelar edição"><X size={17} /></button>
                </div>
                <div className="form-grid">
                  <label className="field field-span-2"><span>Título <b>*</b></span><input value={actionDetailsDraft.title} onChange={(event) => setActionDetailsDraft({ ...actionDetailsDraft, title: event.target.value.slice(0, 120) })} /></label>
                  <label className="field field-span-2"><span>Descrição do problema <b>*</b></span><textarea rows={5} value={actionDetailsDraft.problemDescription} onChange={(event) => setActionDetailsDraft({ ...actionDetailsDraft, problemDescription: event.target.value.slice(0, 3000) })} /></label>
                  <label className="field"><span>Sistema <b>*</b></span><select value={actionDetailsDraft.systemId} onChange={(event) => { const system = systems.find((item) => item.id === event.target.value); setActionDetailsDraft({ ...actionDetailsDraft, systemId: event.target.value, moduleId: system?.modules[0]?.id || "" }); }}><option value="">Selecione</option>{systems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}</select></label>
                  <label className="field"><span>Módulo <b>*</b></span><select value={actionDetailsDraft.moduleId} disabled={!actionDetailsDraft.systemId} onChange={(event) => setActionDetailsDraft({ ...actionDetailsDraft, moduleId: event.target.value })}><option value="">Selecione</option>{systems.find((system) => system.id === actionDetailsDraft.systemId)?.modules.map((module) => <option key={module.id} value={module.id}>{module.name}</option>)}</select></label>
                  <label className="field"><span>Urgência <b>*</b></span><select value={actionDetailsDraft.urgency} onChange={(event) => setActionDetailsDraft({ ...actionDetailsDraft, urgency: event.target.value as DevelopmentActionUrgency })}>{DEVELOPMENT_URGENCY_OPTIONS.map((urgency) => <option key={urgency}>{urgency}</option>)}</select></label>
                  <label className="field"><span>Data da identificação <b>*</b></span><input type="datetime-local" value={actionDetailsDraft.identifiedAt} onChange={(event) => setActionDetailsDraft({ ...actionDetailsDraft, identifiedAt: event.target.value })} /></label>
                  <label className="field field-span-2"><span>Desenvolvedor responsável <b>*</b></span><select value={actionDetailsDraft.developerId} onChange={(event) => setActionDetailsDraft({ ...actionDetailsDraft, developerId: event.target.value })}>{developerUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                </div>
                <div className="development-action-edit-actions">
                  <button type="button" className="button button-ghost" onClick={() => setEditingActionDetails(false)} disabled={saving}>Cancelar</button>
                  <button type="button" className="button button-primary" onClick={saveActionDetails} disabled={saving}>{saving ? <span className="spinner" /> : <Check size={17} />}{saving ? "Salvando…" : "Salvar alterações"}</button>
                </div>
              </section>
            )}
            {isActionOverdue(selectedAction) && (
              <div className="development-deadline-alert" role="alert">
                <AlertTriangle size={20} /><div><strong>Prazo atingido</strong><span>Esta ação precisa ser verificada.</span></div>
              </div>
            )}
            <dl className="detail-grid">
              <div><dt>Status</dt><dd><Badge tone={selectedAction.status}>{selectedAction.status}</Badge></dd></div>
              <div><dt>Desenvolvedor</dt><dd>{getActionUser(selectedAction.developerId)}</dd></div>
              <div><dt>Sistema / módulo</dt><dd>{getActionSystemModule(selectedAction)}</dd></div>
              <div><dt>Urgência</dt><dd><Badge tone={selectedAction.urgency || "Médio"}>{selectedAction.urgency || "Médio"}</Badge></dd></div>
              <div><dt>Registrado por</dt><dd>{getActionUser(selectedAction.supportId)}</dd></div>
              <div><dt>Identificado em</dt><dd>{formatDate(selectedAction.identifiedAt)}</dd></div>
              <div><dt>Criada em</dt><dd>{formatDate(selectedAction.createdAt)}</dd></div>
              <div className="development-due-date"><dt>Prazo definido pelo Desenvolvedor</dt><dd>{selectedAction.dueAt ? formatDate(selectedAction.dueAt) : "Ainda não definido"}</dd></div>
              <div><dt>Encerrado em</dt><dd>{selectedAction.resolvedAt ? formatDate(selectedAction.resolvedAt) : "—"}</dd></div>
              {selectedAction.archivedAt && <div><dt>Arquivada em</dt><dd>{formatDate(selectedAction.archivedAt)}</dd></div>}
              {selectedAction.archivedAt && <div><dt>Arquivada por</dt><dd>{selectedAction.archivedBy ? getActionUser(selectedAction.archivedBy) : "Administrador"}</dd></div>}
              <div className="detail-span-2"><dt>Descrição do problema</dt><dd className="detail-description">{selectedAction.problemDescription}</dd></div>
              <div className="detail-span-2"><dt>Anotações do Desenvolvedor</dt><dd className="detail-description">{selectedAction.developerNotes || "Nenhuma anotação registrada."}</dd></div>
              {selectedAction.resolutionNotes && <div className="detail-span-2"><dt>Validação do Suporte</dt><dd className="detail-description">{selectedAction.resolutionNotes}</dd></div>}
            </dl>

            <section className="development-evidence-section">
              <h3>Evidências</h3>
              {selectedAction.evidencePaths.length ? (
                <div className="evidence-grid">
                  {selectedAction.evidencePaths.map((path) => (
                    <div className="evidence-item" key={path}>
                      <span><FileText size={20} /></span>
                      <p><strong>{evidenceName(path)}</strong><small>Arquivo protegido</small></p>
                      <a className="icon-button" href={`/api/catalog?scope=development-actions&evidence=1&actionId=${encodeURIComponent(selectedAction.id)}&path=${encodeURIComponent(path)}`} target="_blank" rel="noreferrer" aria-label={`Abrir ${evidenceName(path)}`}><Eye size={17} /></a>
                    </div>
                  ))}
                </div>
              ) : <p className="muted-copy">Nenhuma evidência anexada.</p>}
            </section>

            {currentUser.role === "desenvolvedor" && !selectedAction.archivedAt && !isActionClosed(selectedAction) && (
              <section className="development-workflow-panel">
                <h3>Atualizar análise e previsão</h3>
                <div className="form-grid">
                  <label className="field"><span>Data prevista para resolução <b>*</b></span><input type="datetime-local" value={developerActionDraft.dueAt} onChange={(event) => setDeveloperActionDraft({ ...developerActionDraft, dueAt: event.target.value })} /></label>
                  <label className="field"><span>Status <b>*</b></span><select value={developerActionDraft.status} onChange={(event) => setDeveloperActionDraft({ ...developerActionDraft, status: event.target.value as DevelopmentActionStatus })}><option>Em desenvolvimento</option></select></label>
                  <label className="field field-span-2"><span>Anotações da análise</span><textarea rows={5} value={developerActionDraft.developerNotes} onChange={(event) => setDeveloperActionDraft({ ...developerActionDraft, developerNotes: event.target.value.slice(0, 3000) })} placeholder="Registre diagnóstico, solução aplicada e orientações para validação" /></label>
                  <div className="field field-span-2">
                    <span>Evidências da análise ou solução</span>
                    <label className="upload-zone">
                      <UploadCloud size={24} />
                      <strong>Adicionar fotos ou PDF</strong>
                      <span>JPG, PNG, WEBP ou PDF · máximo 10 MB por arquivo</span>
                      <input type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf" onChange={handleActionUpdateEvidence} />
                    </label>
                    {actionUpdateEvidenceFiles.length > 0 && (
                      <div className="attachment-list">
                        {actionUpdateEvidenceFiles.map((file) => (
                          <span key={file.name + file.lastModified}>
                            <Paperclip size={15} />{file.name}
                            <button type="button" onClick={() => setActionUpdateEvidenceFiles((current) => current.filter((item) => item !== file))} aria-label={`Remover ${file.name}`}><X size={14} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button className="button button-primary" onClick={saveDeveloperAction} disabled={saving}>{saving ? <span className="spinner" /> : <Check size={17} />}{saving ? "Salvando…" : actionUpdateEvidenceFiles.length ? "Salvar andamento e evidências" : "Salvar previsão e andamento"}</button>
              </section>
            )}

            {currentUser.role !== "desenvolvedor" && !selectedAction.archivedAt && !isActionClosed(selectedAction) && !selectedAction.dueAt && (
              <section className="development-workflow-panel development-waiting-panel">
                <h3>Aguardando prazo do Desenvolvedor</h3>
                <p>Esta ação poderá ser finalizada pelo Suporte assim que o Desenvolvedor registrar a previsão de resolução.</p>
              </section>
            )}

            {currentUser.role !== "desenvolvedor" && !selectedAction.archivedAt && !isActionClosed(selectedAction) && selectedAction.dueAt && (
              <section className="development-workflow-panel">
                <h3>Finalizar ação</h3>
                {selectedActionIsBeforeDeadline && (
                  <div className="early-closure-notice" role="note">
                    <AlertTriangle size={18} />
                    <span>O prazo ainda não chegou. Para finalizar agora, informe obrigatoriamente o motivo.</span>
                  </div>
                )}
                <label className="field">
                  <span>{selectedActionIsBeforeDeadline ? "Justificativa da finalização antecipada *" : "Observações da finalização"}</span>
                  <textarea rows={4} value={validationNotes} onChange={(event) => setValidationNotes(event.target.value.slice(0, 3000))} placeholder={selectedActionIsBeforeDeadline ? "Explique por que esta ação está sendo finalizada antes do prazo" : "Registre o resultado da verificação realizada pelo Suporte"} />
                </label>
                <div className="field">
                  <span>Evidências da validação</span>
                  <label className="upload-zone">
                    <UploadCloud size={24} />
                    <strong>Adicionar fotos ou PDF</strong>
                    <span>JPG, PNG, WEBP ou PDF · máximo 10 MB por arquivo</span>
                    <input type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf" onChange={handleActionUpdateEvidence} />
                  </label>
                  {actionUpdateEvidenceFiles.length > 0 && (
                    <div className="attachment-list">
                      {actionUpdateEvidenceFiles.map((file) => (
                        <span key={file.name + file.lastModified}>
                          <Paperclip size={15} />{file.name}
                          <button type="button" onClick={() => setActionUpdateEvidenceFiles((current) => current.filter((item) => item !== file))} aria-label={`Remover ${file.name}`}><X size={14} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="validation-actions">
                  {selectedAction.status === "Aguardando validação" && (
                    <button className="button button-secondary" onClick={() => validateDevelopmentAction("reopen")} disabled={saving}><RefreshCcw size={17} />Não foi solucionado</button>
                  )}
                  <button className="button button-primary" onClick={() => validateDevelopmentAction("resolved")} disabled={saving}><CheckCircle2 size={17} />Finalizar ação</button>
                </div>
              </section>
            )}
            {actionFormError && <div className="form-alert" role="alert">{actionFormError}</div>}
          </div>
        </Modal>
      )}

      {editingOccurrence && currentOccurrence && (
        <Modal
          title={"Editar " + currentOccurrence.number}
          description="Atualize os dados de acompanhamento permitidos para o seu perfil."
          onClose={() => setEditingOccurrence(false)}
          footer={
            <>
              <button
                className="button button-ghost"
                onClick={() => setEditingOccurrence(false)}
              >
                Cancelar
              </button>
              <button
                className="button button-primary"
                onClick={saveOccurrenceEdit}
                disabled={saving}
              >
                {saving ? <span className="spinner" /> : <Check size={17} />}
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <label className="field">
              <span>Gravidade</span>
              <select
                value={editDraft.severity}
                onChange={(event) =>
                  setEditDraft({
                    ...editDraft,
                    severity: event.target.value as Severity,
                  })
                }
              >
                {SEVERITIES.map((severity) => (
                  <option key={severity}>{severity}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={editDraft.status}
                onChange={(event) =>
                  setEditDraft({
                    ...editDraft,
                    status: event.target.value as OccurrenceStatus,
                  })
                }
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="field field-span-2">
              <span>Responsável</span>
              <select
                value={editDraft.responsibleId}
                onChange={(event) =>
                  setEditDraft({
                    ...editDraft,
                    responsibleId: event.target.value,
                  })
                }
                disabled={currentUser.role === "suporte"}
              >
                {portalUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-span-2">
              <span>Descrição complementar</span>
              <textarea
                rows={5}
                value={editDraft.description}
                onChange={(event) =>
                  setEditDraft({
                    ...editDraft,
                    description: event.target.value.slice(0, 700),
                  })
                }
              />
            </label>
            <div className="field field-span-2">
              <span>Evidências da alteração</span>
              <label className="upload-zone">
                <UploadCloud size={24} />
                <strong>Adicionar evidências</strong>
                <span>Até 3 arquivos no total · PNG, JPG, WEBP, MP4 ou TXT · máximo 10 MB</span>
                <input
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.webp,.mp4,.txt"
                  onChange={handleEditEvidence}
                />
              </label>
              {editEvidenceError && (
                <small className="field-error" role="alert">{editEvidenceError}</small>
              )}
              {(editDraft.attachments.length > 0 || editEvidenceFiles.length > 0) && (
                <div className="attachment-list">
                  {editDraft.attachments.map((file) => (
                    <span key={file}>
                      <Paperclip size={15} />
                      {evidenceName(file)}
                      <small>salva</small>
                    </span>
                  ))}
                  {editEvidenceFiles.map((file) => (
                    <span key={file.name + file.lastModified}>
                      <UploadCloud size={15} />
                      {file.name}
                      <button
                        type="button"
                        onClick={() => setEditEvidenceFiles((current) => current.filter((item) => item !== file))}
                        aria-label={"Remover " + file.name}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {referenceManagerOpen && (
        <Modal
          title="Sistemas e módulos"
          description="Organize as opções usadas no Catálogo e nos registros de ocorrência."
          size="large"
          onClose={() => {
            setReferenceManagerOpen(false);
            setReferenceError("");
          }}
          footer={
            <button
              className="button button-primary"
              onClick={() => {
                setReferenceManagerOpen(false);
                setReferenceError("");
              }}
            >
              Concluir
            </button>
          }
        >
          {referenceError && (
            <div className="reference-error" role="alert">
              <CircleAlert size={18} />
              <span>{referenceError}</span>
            </div>
          )}
          <div className="reference-manager">
            <section className="reference-panel">
              <div className="reference-panel-heading">
                <div>
                  <span className="card-kicker">Sistemas</span>
                  <h3>{editingSystemId ? "Editar sistema" : "Novo sistema"}</h3>
                </div>
                <strong>{systems.length}</strong>
              </div>
              <div className="reference-form-row">
                <label className="field">
                  <span>Nome do sistema</span>
                  <input
                    value={systemDraft}
                    onChange={(event) =>
                      setSystemDraft(event.target.value.slice(0, 80))
                    }
                    placeholder="Ex.: Portal do Cliente"
                  />
                </label>
                <button
                  className="button button-primary"
                  onClick={saveSystemReference}
                  disabled={saving || systemDraft.trim().length < 2}
                >
                  {saving ? <span className="spinner" /> : <Check size={17} />}
                  {editingSystemId ? "Atualizar" : "Adicionar"}
                </button>
                {editingSystemId && (
                  <button
                    className="button button-ghost"
                    onClick={() => {
                      setEditingSystemId(null);
                      setSystemDraft("");
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
              <div className="reference-list">
                {systems.length === 0 ? (
                  <p className="reference-list-empty">
                    Nenhum sistema cadastrado.
                  </p>
                ) : (
                  systems.map((system) => (
                    <div className="reference-list-item" key={system.id}>
                      <div>
                        <strong>{system.name}</strong>
                        <small>
                          {system.modules.length}{" "}
                          {system.modules.length === 1 ? "módulo" : "módulos"}
                        </small>
                      </div>
                      <div className="reference-list-actions">
                        <button
                          className="icon-button"
                          onClick={() => {
                            setEditingSystemId(system.id);
                            setSystemDraft(system.name);
                            setReferenceError("");
                          }}
                          aria-label={`Editar sistema ${system.name}`}
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger-icon-button"
                          onClick={() =>
                            setConfirmReferenceDelete({
                              kind: "system",
                              id: system.id,
                              name: system.name,
                            })
                          }
                          aria-label={`Excluir sistema ${system.name}`}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="reference-panel">
              <div className="reference-panel-heading">
                <div>
                  <span className="card-kicker">Módulos</span>
                  <h3>{editingModuleId ? "Editar módulo" : "Novo módulo"}</h3>
                </div>
                <strong>
                  {systems.reduce(
                    (total, system) => total + system.modules.length,
                    0,
                  )}
                </strong>
              </div>
              <div className="reference-module-form">
                <label className="field">
                  <span>Sistema</span>
                  <select
                    value={moduleDraft.systemId}
                    onChange={(event) =>
                      setModuleDraft({
                        systemId: event.target.value,
                        name: "",
                        isGeneral: false,
                      })
                    }
                    disabled={systems.length === 0}
                  >
                    {systems.length === 0 && (
                      <option value="">Cadastre um sistema primeiro</option>
                    )}
                    {systems.map((system) => (
                      <option key={system.id} value={system.id}>
                        {system.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Nome do módulo</span>
                  <input
                    value={moduleDraft.name}
                    onChange={(event) =>
                      setModuleDraft({
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
                <option value="desenvolvedor">Desenvolvedor</option>
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

      {confirmActionDeleteId && currentUser.role === "administrador" && (
        <Modal
          title="Excluir ação da visualização?"
          description="Somente Administradores podem realizar esta exclusão segura. A ação deixará de aparecer no portal, mas continuará armazenada no Supabase para recuperação e auditoria."
          onClose={() => setConfirmActionDeleteId(null)}
          footer={
            <>
              <button className="button button-ghost" onClick={() => setConfirmActionDeleteId(null)}>
                Cancelar
              </button>
              <button className="button button-danger" onClick={() => deleteDevelopmentAction(confirmActionDeleteId)} disabled={saving}>
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
                {developmentActions.find((action) => action.id === confirmActionDeleteId)?.number}
              </strong>
              O histórico, os prazos, as anotações e as evidências não serão apagados definitivamente.
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
