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
type Severity = "Baixa" | "MÃ©dia" | "Alta" | "CrÃ­tica";
type OccurrenceStatus =
  | "Novo"
  | "Em anÃ¡lise"
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

function isPortalUser(value: unknown): value is PortalUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<PortalUser>;
  return Boolean(
    user.id &&
      user.name &&
      user.email &&
      user.title &&
      (user.role === "suporte" ||
        user.role === "gestor" ||
        user.role === "administrador"),
  );
}

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

const USERS: PortalUser[] = [
  {
    id: "u1",
    name: "Marcelo Lima",
    email: "marcelo@demo.portal",
    role: "suporte",
    title: "Analista de suporte",
  },
  {
    id: "u2",
    name: "Ana Torres",
    email: "ana@demo.portal",
    role: "gestor",
    title: "Gestora de suporte",
  },
  {
    id: "u3",
    name: "Carla Nunes",
    email: "carla@demo.portal",
    role: "administrador",
    title: "Administradora",
  },
  {
    id: "u4",
    name: "CÃ©sar",
    email: "cesar@granddos.tech",
    role: "administrador",
    title: "Administrador do portal",
  },
];

const DEMO_ACCOUNT_IDS = new Set(["u1", "u2", "u3"]);

const CLIENTS = [
  { id: "cl1", name: "Gran Dourados" },
  { id: "cl2", name: "Via Norte LogÃ­stica" },
  { id: "cl3", name: "Transvale Transportes" },
  { id: "cl4", name: "Rota Sul" },
  { id: "cl5", name: "Expresso Pantanal" },
];

const SYSTEMS = [
  {
    id: "s1",
    name: "GD Frotas",
    modules: [
      { id: "m1", name: "Checklist" },
      { id: "m2", name: "MissÃµes" },
      { id: "m3", name: "Geral" },
    ],
  },
  {
    id: "s2",
    name: "GD Mobile",
    modules: [
      { id: "m4", name: "SincronizaÃ§Ã£o" },
      { id: "m5", name: "Jornada" },
      { id: "m6", name: "Geral" },
    ],
  },
  {
    id: "s3",
    name: "Portal Cliente",
    modules: [
      { id: "m7", name: "Acesso" },
      { id: "m8", name: "Financeiro" },
      { id: "m9", name: "Geral" },
    ],
  },
];

const GENERAL_MODULE_IDS = new Set(["m3", "m6", "m9"]);

const INITIAL_CATALOG_BASE: CatalogItem[] = [
  {
    id: "c1",
    systemId: "s1",
    moduleId: "m1",
    name: "JÃ¡ existe missÃ£o ativa para esta placa",
    aliases: ["missÃ£o ativa", "placa em missÃ£o"],
    active: true,
    updatedAt: "2026-08-05T14:20:00-04:00",
  },
  {
    id: "c2",
    systemId: "s1",
    moduleId: "m3",
    name: "Erro Network",
    aliases: ["network", "erro de rede"],
    active: true,
    updatedAt: "2026-08-04T09:10:00-04:00",
  },
  {
    id: "c3",
    systemId: "s1",
    moduleId: "m1",
    name: "Falha ao carregar checklist",
    aliases: ["checklist nÃ£o abre", "falha checklist"],
    active: true,
    updatedAt: "2026-08-03T16:45:00-04:00",
  },
  {
    id: "c4",
    systemId: "s2",
    moduleId: "m4",
    name: "Dados nÃ£o sincronizados",
    aliases: ["sem sincronizar", "sync pendente"],
    active: true,
    updatedAt: "2026-08-02T11:05:00-04:00",
  },
  {
    id: "c5",
    systemId: "s3",
    moduleId: "m7",
    name: "Token de acesso expirado",
    aliases: ["sessÃ£o expirada", "token expirado"],
    active: true,
    updatedAt: "2026-08-01T08:40:00-04:00",
  },
  {
    id: "c6",
    systemId: "s3",
    moduleId: "m8",
    name: "Boleto nÃ£o disponÃ­vel",
    aliases: ["sem boleto", "boleto indisponÃ­vel"],
    active: false,
    updatedAt: "2026-07-29T10:15:00-04:00",
  },
];

const INITIAL_OCCURRENCES_BASE: Occurrence[] = [
  {
    id: "o1",
    number: "OCO-2418",
    occurredAt: "2026-08-06T07:15:00-04:00",
    clientId: "cl1",
    systemId: "s1",
    moduleId: "m1",
    catalogItemId: "c1",
    description:
      "A placa jÃ¡ havia concluÃ­do a rota anterior, mas o sistema manteve a missÃ£o como ativa.",
    severity: "MÃ©dia",
    status: "Em anÃ¡lise",
    responsibleId: "u1",
    authorId: "u1",
    attachments: ["print-missao-ativa.png"],
    createdAt: "2026-08-06T07:22:00-04:00",
    updatedAt: "2026-08-06T08:05:00-04:00",
  },
  {
    id: "o2",
    number: "OCO-2417",
    occurredAt: "2026-08-06T06:40:00-04:00",
    clientId: "cl2",
    systemId: "s2",
    moduleId: "m4",
    catalogItemId: "c4",
    description: "Motoristas ficaram com viagens pendentes apÃ³s retorno do sinal.",
    severity: "Alta",
    status: "Novo",
    responsibleId: "u1",
    authorId: "u2",
    attachments: ["video-sincronizacao.mp4"],
    createdAt: "2026-08-06T06:52:00-04:00",
    updatedAt: "2026-08-06T06:52:00-04:00",
  },
  {
    id: "o3",
    number: "OCO-2416",
    occurredAt: "2026-08-05T17:30:00-04:00",
    clientId: "cl3",
    systemId: "s1",
    moduleId: "m3",
    catalogItemId: "c2",
    description: "IntermitÃªncia ao abrir o painel de veÃ­culos.",
    severity: "CrÃ­tica",
    status: "Aguardando",
    responsibleId: "u2",
    authorId: "u1",
    attachments: ["erro-network.png", "console.txt"],
    createdAt: "2026-08-05T17:38:00-04:00",
    updatedAt: "2026-08-06T09:12:00-04:00",
  },
  {
    id: "o4",
    number: "OCO-2415",
    occurredAt: "2026-08-05T14:05:00-04:00",
    clientId: "cl4",
    systemId: "s3",
    moduleId: "m7",
    catalogItemId: "c5",
    description: "UsuÃ¡rios precisaram autenticar novamente durante o expediente.",
    severity: "MÃ©dia",
    status: "Resolvido",
    responsibleId: "u1",
    authorId: "u1",
    attachments: [],
    createdAt: "2026-08-05T14:14:00-04:00",
    updatedAt: "2026-08-05T16:42:00-04:00",
  },
  {
    id: "o5",
    number: "OCO-2414",
    occurredAt: "2026-08-05T10:20:00-04:00",
    clientId: "cl5",
    systemId: "s1",
    moduleId: "m1",
    catalogItemId: "c3",
    description: "Checklist permanece em carregamento em dois aparelhos.",
    severity: "Alta",
    status: "Em anÃ¡lise",
    responsibleId: "u1",
    authorId: "u3",
    attachments: ["checklist-carregando.png"],
    createdAt: "2026-08-05T10:35:00-04:00",
    updatedAt: "2026-08-05T12:01:00-04:00",
  },
  {
    id: "o6",
    number: "OCO-2413",
    occurredAt: "2026-08-04T15:10:00-04:00",
    clientId: "cl1",
    systemId: "s1",
    moduleId: "m1",
    catalogItemId: "c1",
    description: "Bloqueio ao iniciar nova missÃ£o para o veÃ­culo 218.",
    severity: "MÃ©dia",
    status: "Resolvido",
    responsibleId: "u2",
    authorId: "u1",
    attachments: [],
    createdAt: "2026-08-04T15:18:00-04:00",
    updatedAt: "2026-08-04T18:20:00-04:00",
  },
  {
    id: "o7",
    number: "OCO-2412",
    occurredAt: "2026-08-04T09:25:00-04:00",
    clientId: "cl2",
    systemId: "s2",
    moduleId: "m5",
    otherError: "Jornada duplicada apÃ³s troca de aparelho",
    description: "Caso ainda nÃ£o padronizado; aguardando revisÃ£o do CatÃ¡logo.",
    severity: "Baixa",
    status: "Aguardando",
    responsibleId: "u3",
    authorId: "u1",
    attachments: [],
    createdAt: "2026-08-04T09:40:00-04:00",
    updatedAt: "2026-08-04T11:25:00-04:00",
  },
  {
    id: "o8",
    number: "OCO-2411",
    occurredAt: "2026-08-03T16:00:00-04:00",
    clientId: "cl3",
    systemId: "s2",
    moduleId: "m4",
    catalogItemId: "c4",
    description: "SincronizaÃ§Ã£o retomada apÃ³s limpeza da fila local.",
    severity: "MÃ©dia",
    status: "Resolvido",
    responsibleId: "u1",
    authorId: "u2",
    attachments: [],
    createdAt: "2026-08-03T16:12:00-04:00",
    updatedAt: "2026-08-03T17:50:00-04:00",
  },
  {
    id: "o9",
    number: "OCO-2410",
    occurredAt: "2026-08-02T11:45:00-04:00",
    clientId: "cl4",
    systemId: "s1",
    moduleId: "m3",
    catalogItemId: "c2",
    description: "Erro de rede registrado durante atualizaÃ§Ã£o do cadastro.",
    severity: "Alta",
    status: "Resolvido",
    responsibleId: "u1",
    authorId: "u1",
    attachments: [],
    createdAt: "2026-08-02T11:57:00-04:00",
    updatedAt: "2026-08-02T13:04:00-04:00",
  },
  {
    id: "o10",
    number: "OCO-2409",
    occurredAt: "2026-08-01T08:15:00-04:00",
    clientId: "cl5",
    systemId: "s3",
    moduleId: "m7",
    catalogItemId: "c5",
    description: "SessÃ£o expirou antes do perÃ­odo esperado.",
    severity: "Baixa",
    status: "Resolvido",
    responsibleId: "u3",
    authorId: "u2",
    attachments: [],
    createdAt: "2026-08-01T08:24:00-04:00",
    updatedAt: "2026-08-01T09:32:00-04:00",
  },
  {
    id: "o11",
    number: "OCO-2408",
    occurredAt: "2026-07-31T13:35:00-04:00",
    clientId: "cl1",
    systemId: "s1",
    moduleId: "m1",
    catalogItemId: "c1",
    description: "MissÃ£o antiga permaneceu ativa depois da finalizaÃ§Ã£o.",
    severity: "MÃ©dia",
    status: "Resolvido",
    responsibleId: "u1",
    authorId: "u1",
    attachments: [],
    createdAt: "2026-07-31T13:46:00-04:00",
    updatedAt: "2026-07-31T15:10:00-04:00",
  },
  {
    id: "o12",
    number: "OCO-2407",
    occurredAt: "2026-07-30T18:05:00-04:00",
    clientId: "cl2",
    systemId: "s1",
    moduleId: "m1",
    catalogItemId: "c3",
    description: "Falha ao carregar o formulÃ¡rio em conexÃ£o mÃ³vel.",
    severity: "Alta",
    status: "Cancelado",
    responsibleId: "u2",
    authorId: "u1",
    attachments: [],
    createdAt: "2026-07-30T18:16:00-04:00",
    updatedAt: "2026-07-31T08:02:00-04:00",
  },
];

const DEMO_ANCHOR_TIME = new Date("2026-08-06T12:00:00-04:00").getTime();
const DEMO_RUNTIME_TIME = Date.now();
const shiftDemoDate = (value: string) =>
  new Date(
    DEMO_RUNTIME_TIME + (new Date(value).getTime() - DEMO_ANCHOR_TIME),
  ).toISOString();

const INITIAL_CATALOG: CatalogItem[] = INITIAL_CATALOG_BASE.map((item) => ({
  ...item,
  updatedAt: shiftDemoDate(item.updatedAt),
}));

const INITIAL_OCCURRENCES: Occurrence[] = INITIAL_OCCURRENCES_BASE.map(
  (item) => ({
    ...item,
    occurredAt: shiftDemoDate(item.occurredAt),
    createdAt: shiftDemoDate(item.createdAt),
    updatedAt: shiftDemoDate(item.updatedAt),
  }),
);

const STATUS_OPTIONS: OccurrenceStatus[] = [
  "Novo",
  "Em anÃ¡lise",
  "Aguardando",
  "Resolvido",
  "Cancelado",
];
const SEVERITIES: Severity[] = ["Baixa", "MÃ©dia", "Alta", "CrÃ­tica"];

const roleLabel: Record<Role, string> = {
  suporte: "Suporte",
  gestor: "Gestor",
  administrador: "Administrador",
};

const rolePermissions: Record<Role, string[]> = {
  suporte: ["Dashboard prÃ³prio", "Criar registros", "Atualizar ocorrÃªncias prÃ³prias"],
  gestor: ["Dashboard completo", "Gerenciar ocorrÃªncias", "Manter o CatÃ¡logo"],
  administrador: [
    "Acesso completo",
    "Manter o CatÃ¡logo",
    "Gerenciar usuÃ¡rios e permissÃµes",
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
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>(USERS);
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
  const [occurrences, setOccurrences] =
    useState<Occurrence[]>(INITIAL_OCCURRENCES);
  const [catalog, setCatalog] = useState<CatalogItem[]>(INITIAL_CATALOG);
  const [toast, setToast] = useState("");
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState("o1");
  const [recordSearch, setRecordSearch] = useState("");
  const [recordPeriod, setRecordPeriod] = useState("all");
  const [recordSystem, setRecordSystem] = useState("all");
  const [recordModule, setRecordModule] = useState("all");
  const [recordStatus, setRecordStatus] = useState("all");
  const [recordSeverity, setRecordSeverity] = useState("all");
  const [recordPage, setRecordPage] = useState(1);
  const [dashPeriod, setDashPeriod] = useState("week");
  const [dashCustomStart, setDash…31577 tokens truncated…t, false)}</td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className="icon-button"
                                  onClick={() => openEditUser(user)}
                                  aria-label={"Editar " + user.name}
                                  title="Editar usuÃ¡rio e permissÃµes"
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
                                      title="Excluir com seguranÃ§a"
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
                {saving ? "Salvandoâ€¦" : "Salvar alteraÃ§Ãµes"}
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
              <span>ResponsÃ¡vel</span>
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
              <span>DescriÃ§Ã£o complementar</span>
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
              ? "Novo item do CatÃ¡logo"
              : "Editar item do CatÃ¡logo"
          }
          description="Use um nome curto, oficial e reconhecÃ­vel pela equipe."
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
                {saving ? "Salvandoâ€¦" : "Salvar item"}
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
                  const system = SYSTEMS.find(
                    (item) => item.id === event.target.value,
                  );
                  setCatalogDraft({
                    ...catalogDraft,
                    systemId: event.target.value,
                    moduleId: system?.modules[0].id || "",
                  });
                }}
              >
                {SYSTEMS.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                MÃ³dulo <b>*</b>
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
                {SYSTEMS.find(
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
                placeholder="Separe os termos por vÃ­rgula"
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
                  Use Ativar ou Inativar na lista para confirmar esta alteraÃ§Ã£o.
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
          description="Os registros histÃ³ricos continuarÃ£o vinculados a este item."
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
                {saving ? "Processandoâ€¦" : "Confirmar"}
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
                ? " deixarÃ¡ de aparecer em novos registros."
                : " voltarÃ¡ a aparecer para novos registros."}
            </p>
          </div>
        </Modal>
      )}

      {userModal && currentUser.role === "administrador" && (
        <Modal
          title={userModal.mode === "new" ? "Novo usuÃ¡rio" : "Editar usuÃ¡rio"}
          description={
            userModal.mode === "new"
              ? "Crie a conta e entregue a senha temporÃ¡ria de forma segura."
              : "Atualize o perfil, as permissÃµes ou redefina a senha."
          }
          onClose={() => setUserModal(null)}
          footer={
            <>
              <button className="button button-ghost" onClick={() => setUserModal(null)}>
                Cancelar
              </button>
              <button className="button button-primary" onClick={saveUser} disabled={saving}>
                {saving ? <span className="spinner" /> : <Check size={17} />}
                {saving ? "Salvandoâ€¦" : "Salvar usuÃ¡rio"}
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
                <small className="field-help">O e-mail de acesso nÃ£o pode ser alterado.</small>
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
                <strong>PermissÃµes do perfil {roleLabel[userDraft.role]}</strong>
                <ul>
                  {rolePermissions[userDraft.role].map((permission) => (
                    <li key={permission}>{permission}</li>
                  ))}
                </ul>
              </div>
            </div>
            <label className="field field-span-2">
              <span>{userModal.mode === "new" ? "Senha temporÃ¡ria *" : "Nova senha"}</span>
              <input
                type="password"
                value={userDraft.password}
                onChange={(event) => setUserDraft({ ...userDraft, password: event.target.value })}
                placeholder={userModal.mode === "new" ? "MÃ­nimo de 8 caracteres" : "Deixe em branco para manter"}
              />
              <small className="field-help">
                {userModal.mode === "new"
                  ? "A senha deve ter pelo menos 8 caracteres."
                  : "Ao redefinir a senha, as sessÃµes abertas serÃ£o encerradas."}
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
          description="O histÃ³rico e os registros associados a esta pessoa serÃ£o preservados."
          onClose={() => setConfirmUserId(null)}
          footer={
            <>
              <button className="button button-ghost" onClick={() => setConfirmUserId(null)}>
                Cancelar
              </button>
              <button className="button button-primary" onClick={() => toggleUserAccess(confirmUserId)} disabled={saving}>
                {saving ? "Processandoâ€¦" : "Confirmar"}
              </button>
            </>
          }
        >
          <div className="confirm-message">
            <span><AlertTriangle size={23} /></span>
            <p>
              <strong>{managedUsers.find((user) => user.id === confirmUserId)?.name}</strong>
              {managedUsers.find((user) => user.id === confirmUserId)?.active
                ? " perderÃ¡ o acesso imediatamente e suas sessÃµes serÃ£o encerradas."
                : " poderÃ¡ entrar novamente no sistema com sua senha atual."}
            </p>
          </div>
        </Modal>
      )}

      {confirmOccurrenceDeleteId && currentUser.role === "administrador" && (
        <Modal
          title="Excluir registro da visualizaÃ§Ã£o?"
          description="Esta Ã© uma exclusÃ£o segura: o registro deixarÃ¡ de aparecer no portal, mas continuarÃ¡ armazenado para recuperaÃ§Ã£o e auditoria."
          onClose={() => setConfirmOccurrenceDeleteId(null)}
          footer={
            <>
              <button className="button button-ghost" onClick={() => setConfirmOccurrenceDeleteId(null)}>
                Cancelar
              </button>
              <button className="button button-danger" onClick={() => deleteOccurrence(confirmOccurrenceDeleteId)} disabled={saving}>
                {saving ? <span className="spinner" /> : <Trash2 size={17} />}
                {saving ? "Excluindoâ€¦" : "Excluir da visualizaÃ§Ã£o"}
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
              Nenhum dado serÃ¡ apagado definitivamente do banco de dados.
            </p>
          </div>
        </Modal>
      )}

      {confirmUserDeleteId && currentUser.role === "administrador" && (
        <Modal
          title="Excluir usuÃ¡rio da visualizaÃ§Ã£o?"
          description="A conta serÃ¡ ocultada e perderÃ¡ o acesso, mas seus dados e vÃ­nculos histÃ³ricos continuarÃ£o armazenados."
          onClose={() => setConfirmUserDeleteId(null)}
          footer={
            <>
              <button className="button button-ghost" onClick={() => setConfirmUserDeleteId(null)}>
                Cancelar
              </button>
              <button className="button button-danger" onClick={() => deleteUser(confirmUserDeleteId)} disabled={saving}>
                {saving ? <span className="spinner" /> : <Trash2 size={17} />}
                {saving ? "Excluindoâ€¦" : "Excluir usuÃ¡rio"}
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
              A exclusÃ£o nÃ£o apaga ocorrÃªncias, histÃ³rico de acesso ou dados de auditoria.
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
