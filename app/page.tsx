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
  });
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
          (recordSeverity === "all" || item.severity === recordSeverity)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() -
          new Date(a.occurredAt).getTime(),
      );
  })();

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

  function navigate(next: View) {
    setView(next);
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
      setView("dashboard");
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
    });
    setEditingOccurrence(true);
  }

  async function saveOccurrenceEdit() {
    if (!currentOccurrence) return;
    setSaving(true);
    try {
      const payload = await portalRequest<{
        changes: Pick<
          Occurrence,
          "description" | "severity" | "status" | "responsibleId" | "updatedAt"
        >;
      }>("/api/occurrences", {
        method: "PATCH",
        body: JSON.stringify({
          id: currentOccurrence.id,
          originalResponsibleId: currentOccurrence.responsibleId,
          ...editDraft,
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
      setToast("Ocorrência atualizada.");
    } catch {
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
    setRecordSeverity("all");
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
    const now = Date.now();
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

  const navItems = [
    { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard },
    { id: "registros" as View, label: "Registro", icon: ClipboardList },
    { id: "agenda" as View, label: "Agenda", icon: CalendarDays },
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
              </button>
            );
          })}
        </nav>
        <div className="sidebar-insight">
          <span className="insight-icon">
            <Activity size={18} />
          </span>
          <p>
            <strong>{dashboardOpen} em acompanhamento</strong>
            na semana atual
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
            />
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
                      <span className="sr-only">Gravidade</span>
                      <select
                        value={recordSeverity}
                        onChange={(event) => {
                          setRecordSeverity(event.target.value);
                          setRecordPage(1);
                        }}
                      >
                        <option value="all">Todas as gravidades</option>
                        {SEVERITIES.map((severity) => (
                          <option key={severity}>{severity}</option>
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
                              <strong>{file}</strong>
                              <small>Arquivo anexado</small>
                            </p>
                            <button
                              className="icon-button"
                              aria-label={"Ver " + file}
                              onClick={() =>
                                setToast(
                                  "Visualização simulada da evidência: " + file,
                                )
                              }
                            >
                              <Eye size={17} />
                            </button>
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
                  <button
                    className="button button-primary"
                    onClick={openNewCatalog}
                  >
                    <Plus size={18} />
                    Novo item
                  </button>
                )}
              </div>
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
                  reservada aos perfis Gestor e Administrador.
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
                        <option value="gestor">Gestor</option>
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
