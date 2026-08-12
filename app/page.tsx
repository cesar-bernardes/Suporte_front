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
  Code2,
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

type Role = "suporte" | "desenvolvedor" | "administrador";
type Severity = "Baixa" | "M√©dia" | "Alta" | "Cr√≠tica";
type OccurrenceStatus =
  | "Novo"
  | "Em an√°lise"
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
  | "Em an√°lise"
  | "Em desenvolvimento"
  | "Aguardando valida√ß√£o"
  | "Resolvida";

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
  dueAt: string | null;
  status: DevelopmentActionStatus;
  developerNotes: string;
  resolutionNotes: string;
  evidencePaths: string[];
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_OPTIONS: OccurrenceStatus[] = [
  "Novo",
  "Em an√°lise",
  "Aguardando",
  "Resolvido",
  "Cancelado",
];
const DEVELOPMENT_STATUS_OPTIONS: DevelopmentActionStatus[] = [
  "Encaminhada",
  "Em an√°lise",
  "Em desenvolvimento",
  "Aguardando valida√ß√£o",
  "Resolvida",
];
const SEVERITIES: Severity[] = ["Baixa", "M√©dia", "Alta", "Cr√≠tica"];

const roleLabel: Record<Role, string> = {
  suporte: "Suporte",
  desenvolvedor: "Desenvolvedor",
  administrador: "Administrador",
};

const rolePermissions: Record<Role, string[]> = {
  suporte: [
    "Dashboard pr√≥prio",
    "Criar registros",
    "Atualizar ocorr√™ncias pr√≥prias",
    "Manter o Cat√°logo",
  ],
  desenvolvedor: [
    "Visualizar a√ß√µes atribu√≠das",
    "Definir previs√£o de resolu√ß√£o",
    "Atualizar andamento e enviar para valida√ß√£o",
  ],
  administrador: [
    "Acesso completo",
    "Manter o Cat√°logo",
    "Gerenciar usu√°rios e permiss√µes",
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
    severity: "M√©dia" as Severity,
    status: "Em an√°lise" as OccurrenceStatus,
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
  const [developerUsers, setDeveloperUsers] = useState<PortalUser[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState("");
  const [actionStatusFilter, setActionStatusFilter] = useState("all");
  const [actionSearch, setActionSearch] = useState("");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionEvidenceFiles, setActionEvidenceFiles] = useState<File[]>([]);
  const [actionFormError, setActionFormError] = useState("");
  const [actionDraft, setActionDraft] = useState({
    title: "",
    problemDescription: "",
    identifiedAt: "",
    developerId: "",
  });
  const [developerActionDraft, setDeveloperActionDraft] = useState({
    dueAt: "",
    status: "Em an√°lise" as DevelopmentActionStatus,
    developerNotes: "",
  });
  const [validationNotes, setValidationNotes] = useState("");
  const [newForm, setNewForm] = useState({
    clientIdÁœ<÷⁄$z{-ÆÈ‹j◊ù‚6∆74Ê÷S“'7ñÊÊW""Û‚¢≈G&6É"6ó¶S◊≥w“ÛÁ–¢WÜ6«Vó"Ffó7V∆ó¶:|:6¢¬ˆ'WGFˆ„‡¢¬Û‡¢–¢‡¢∆Fób6∆74Ê÷S“'6fR÷FV∆WFR÷6˜í#‡¢«7G&ˆÊsÁ∂6ˆÊfó&’&VfW&VÊ6TFV∆WFRÊÊ÷W”¬˜7G&ˆÊs‡¢«‡¢6RW7FófW"6VÊFÚW6FÚV“V“óFV“FÚ6L:∆ˆvÚ˜Rˆ6˜',:¶Ê6ñ¬¢6ó7FV÷ñ◊VFó,:WÜ6«W<:6ÚR÷˜7G&,:6ˆ÷Ú6˜'&ñvó"‡¢¬˜‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ó–†¢∂6F∆ˆt÷ˆF¬bbÄ¢ƒ÷ˆF¿¢FóF∆S◊∞¢6F∆ˆt÷ˆF¬Ê÷ˆFR””“&ÊWr ¢Ú$Ê˜fÚóFV“FÚ6L:∆ˆvÚ ¢¢$VFóF"óFV“FÚ6L:∆ˆvÚ ¢–¢FW67&óFñˆ„“%W6RV“Êˆ÷R7W'FÚ¬ˆfñ6ñ¬R&V6ˆÊÜV<:◊fV¬V∆WVóR‚ ¢ˆ‰6∆˜6S◊≤Çí”‚6WD6F∆ˆt÷ˆF¬ÜÁV∆¬ó–¢fˆ˜FW#◊∞¢√‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'WGFˆ‚'WGFˆ‚÷vÜ˜7B ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD6F∆ˆt÷ˆF¬ÜÁV∆¬ó–¢‡¢6Ê6V∆ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'WGFˆ‚'WGFˆ‚◊&ñ÷'í ¢ˆ‰6∆ñ6≥◊∑6fT6F∆ˆw–¢Fó6&∆VC◊∑6fñÊw–¢‡¢∑6fñÊrÚ«7‚6∆74Ê÷S“'7ñÊÊW""Û‚¢ƒ6ÜV6≤6ó¶S◊≥w“ÛÁ–¢∑6fñÊrÚ%6«fÊF˛(
b"¢%6«f"óFV“'–¢¬ˆ'WGFˆ„‡¢¬Û‡¢–¢‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢∆∆&V¬6∆74Ê÷S“&fñV∆B#‡¢«7„‡¢6ó7FV÷∆#‚£¬ˆ#‡¢¬˜7„‡¢«6V∆V7@¢f«VS◊∂6F∆ˆtG&gBÁ7ó7FV‘ñG–¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚∞¢6ˆÁ7B7ó7FV““7ó7FV◊2ÊfñÊBÄ¢ÜóFV“í”‚óFV“ÊñB””“WfVÁBÁF&vWBÁf«VR¿¢ì∞¢6WD6F∆ˆtG&gBá∞¢‚‚Ê6F∆ˆtG&gB¿¢7ó7FV‘ñC¢WfVÁBÁF&vWBÁf«VR¿¢÷ˆGV∆TñC¢7ó7FV”ÚÊ÷ˆGV∆W5≥“ÊñB«¬""¿¢“ì∞¢◊–¢‡¢∑7ó7FV◊2Ê÷Çá7ó7FV“í”‚Ä¢∆˜Fñˆ‚∂Wì◊∑7ó7FV“ÊñG“f«VS◊∑7ó7FV“ÊñG”‡¢∑7ó7FV“ÊÊ÷W–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ˆ∆&V√‡¢∆∆&V¬6∆74Ê÷S“&fñV∆B#‡¢«7„‡¢‹;6GV∆Ú∆#‚£¬ˆ#‡¢¬˜7„‡¢«6V∆V7@¢f«VS◊∂6F∆ˆtG&gBÊ÷ˆGV∆TñG–¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡¢6WD6F∆ˆtG&gBá∞¢‚‚Ê6F∆ˆtG&gB¿¢÷ˆGV∆TñC¢WfVÁBÁF&vWBÁf«VR¿¢“ê¢–¢‡¢∑7ó7FV◊2ÊfñÊBÄ¢á7ó7FV“í”‚7ó7FV“ÊñB””“6F∆ˆtG&gBÁ7ó7FV‘ñB¿¢ìÚÊ÷ˆGV∆W2Ê÷ÇÜ÷ˆGV∆Rí”‚Ä¢∆˜Fñˆ‚∂Wì◊∂÷ˆGV∆RÊñG“f«VS◊∂÷ˆGV∆RÊñG”‡¢∂÷ˆGV∆RÊÊ÷W–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ˆ∆&V√‡¢∆∆&V¬6∆74Ê÷S“&fñV∆BfñV∆B◊7‚”"#‡¢«7„‡¢Êˆ÷RG&ˆÊó¶FÚFÚW'&Ú∆#‚£¬ˆ#‡¢¬˜7„‡¢∆ñÁW@¢f«VS◊∂6F∆ˆtG&gBÊÊ÷W–¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡¢6WD6F∆ˆtG&gBá∞¢‚‚Ê6F∆ˆtG&gB¿¢Ê÷S¢WfVÁBÁF&vWBÁf«VRÁ6∆ñ6RÉ¬#í¿¢“ê¢–¢∆6VÜˆ∆FW#“$WÇ„¢f∆ÜÚ6'&Vv"6ÜV6∂∆ó7B ¢&ñ÷ñÁf∆ñC◊¥&ˆˆ∆V‚Ü6F∆ˆtW'&˜"ó–¢Û‡¢∂6F∆ˆtW'&˜"bbÄ¢«6÷∆¬6∆74Ê÷S“&fñV∆B÷W'&˜"#Á∂6F∆ˆtW'&˜'”¬˜6÷∆√‡¢ó–¢∂6F∆ˆtG&gBÊÊ÷RÊ∆VÊwFÇ‚Bb`¢6F∆ˆrÁ6ˆ÷RÄ¢ÜóFV“í”‡¢óFV“ÊñB”“6F∆ˆt÷ˆF¬ÊñBb`¢Ê˜&÷∆ó¶UFWáBÜóFV“ÊÊ÷RíÊñÊ6«VFW2Ä¢Ê˜&÷∆ó¶UFWáBÜ6F∆ˆtG&gBÊÊ÷Rí¿¢í¿¢íbbÄ¢«6÷∆¬6∆74Ê÷S“&fñV∆B◊v&ÊñÊr#‡¢VÊ6ˆÁG&÷˜2óFVÁ2&V6ñF˜2‚&Wfó6RÁFW2FR6«f"‡¢¬˜6÷∆√‡¢ó–¢¬ˆ∆&V√‡¢∆∆&V¬6∆74Ê÷S“&fñV∆BfñV∆B◊7‚”"#‡¢«7„ÂFW&÷˜2«FW&ÊFóf˜2&'W66¬˜7„‡¢∆ñÁW@¢f«VS◊∂6F∆ˆtG&gBÊ∆ñ6W7–¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡¢6WD6F∆ˆtG&gBá∞¢‚‚Ê6F∆ˆtG&gB¿¢∆ñ6W3¢WfVÁBÁF&vWBÁf«VRÁ6∆ñ6RÉ¬##í¿¢“ê¢–¢∆6VÜˆ∆FW#“%6W&R˜2FW&÷˜2˜"l:◊&wV∆ ¢Û‡¢«6÷∆¬6∆74Ê÷S“&fñV∆B÷ÜV«#‡¢W7FW2FW&÷˜2ßVF“Ê'W666V“7&ñ"GW∆ñ6ñFFW2‡¢¬˜6÷∆√‡¢¬ˆ∆&V√‡¢∆∆&V¬6∆74Ê÷S“&fñV∆BfñV∆B◊7‚”"#‡¢«7„Â7FGW3¬˜7„‡¢«6V∆V7@¢f«VS◊∂6F∆ˆtG&gBÊ7FófRÚ&7FófR"¢&ñÊ7FófR'–¢Fó6&∆VC◊∂6F∆ˆt÷ˆF¬Ê÷ˆFR””“&VFóB'–¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡¢6WD6F∆ˆtG&gBá∞¢‚‚Ê6F∆ˆtG&gB¿¢7FófS¢WfVÁBÁF&vWBÁf«VR””“&7FófR"¿¢“ê¢–¢‡¢∆˜Fñˆ‚f«VS“&7FófR#‰FófÛ¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“&ñÊ7FófR#‰ñÊFófÛ¬ˆ˜Fñˆ„‡¢¬˜6V∆V7C‡¢∂6F∆ˆt÷ˆF¬Ê÷ˆFR””“&VFóB"bbÄ¢«6÷∆¬6∆74Ê÷S“&fñV∆B÷ÜV«#‡¢W6RFóf"˜RñÊFóf"Ê∆ó7F&6ˆÊfó&÷"W7F«FW&:|:6Ú‡¢¬˜6÷∆√‡¢ó–¢¬ˆ∆&V√‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ó–†¢∂6ˆÊfó&‘6F∆ˆtñBbbÄ¢ƒ÷ˆF¿¢FóF∆S◊∞¢6F∆ˆrÊfñÊBÇÜóFV“í”‚óFV“ÊñB””“6ˆÊfó&‘6F∆ˆtñBìÚÊ7FófP¢Ú$ñÊFóf"óFV”Ú ¢¢%&VFóf"óFV”Ú ¢–¢FW67&óFñˆ„“$˜2&Vvó7G&˜2Üó7L;7&ñ6˜26ˆÁFñÁV,:6ÚfñÊ7V∆F˜2W7FRóFV“‚ ¢ˆ‰6∆˜6S◊≤Çí”‚6WD6ˆÊfó&‘6F∆ˆtñBÜÁV∆¬ó–¢fˆ˜FW#◊∞¢√‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'WGFˆ‚'WGFˆ‚÷vÜ˜7B ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD6ˆÊfó&‘6F∆ˆtñBÜÁV∆¬ó–¢‡¢6Ê6V∆ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'WGFˆ‚'WGFˆ‚◊&ñ÷'í ¢ˆ‰6∆ñ6≥◊≤Çí”‚Fˆvv∆T6F∆ˆtóFV“Ü6ˆÊfó&‘6F∆ˆtñBó–¢Fó6&∆VC◊∑6fñÊw–¢‡¢∑6fñÊrÚ%&ˆ6W76ÊF˛(
b"¢$6ˆÊfó&÷"'–¢¬ˆ'WGFˆ„‡¢¬Û‡¢–¢‡¢∆Fób6∆74Ê÷S“&6ˆÊfó&“÷÷W76vR#‡¢«7„‡¢ƒ∆W'EG&ñÊv∆R6ó¶S◊≥#7“Û‡¢¬˜7„‡¢«‡¢«7G&ˆÊs‡¢∂6F∆ˆrÊfñÊBÇÜóFV“í”‚óFV“ÊñB””“6ˆÊfó&‘6F∆ˆtñBìÚÊÊ÷W–¢¬˜7G&ˆÊs‡¢∂6F∆ˆrÊfñÊBÇÜóFV“í”‚óFV“ÊñB””“6ˆÊfó&‘6F∆ˆtñBìÚÊ7FófP¢Ú"FVóÜ,:FR&V6W"V“Ê˜f˜2&Vvó7G&˜2‚ ¢¢"fˆ«F,:&V6W"&Ê˜f˜2&Vvó7G&˜2‚'–¢¬˜‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ó–†¢∑W6W$÷ˆF¬bb7W'&VÁEW6W"Á&ˆ∆R””“&F÷ñÊó7G&F˜""bbÄ¢ƒ÷ˆF¿¢FóF∆S◊∑W6W$÷ˆF¬Ê÷ˆFR””“&ÊWr"Ú$Ê˜fÚW7\:&ñÚ"¢$VFóF"W7\:&ñÚ'–¢FW67&óFñˆ„◊∞¢W6W$÷ˆF¬Ê÷ˆFR””“&ÊWr ¢Ú$7&ñR6ˆÁFRVÁG&VwVR6VÊÜFV◊˜,:&ñFRf˜&÷6VwW&‚ ¢¢$GV∆ó¶RÚW&fñ¬¬2W&÷ó7<;VW2˜R&VFVfñÊ6VÊÜ‚ ¢–¢ˆ‰6∆˜6S◊≤Çí”‚6WEW6W$÷ˆF¬ÜÁV∆¬ó–¢fˆ˜FW#◊∞¢√‡¢∆'WGFˆ‚6∆74Ê÷S“&'WGFˆ‚'WGFˆ‚÷vÜ˜7B"ˆ‰6∆ñ6≥◊≤Çí”‚6WEW6W$÷ˆF¬ÜÁV∆¬ó”‡¢6Ê6V∆ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'WGFˆ‚'WGFˆ‚◊&ñ÷'í"ˆ‰6∆ñ6≥◊∑6fUW6W'“Fó6&∆VC◊∑6fñÊw”‡¢∑6fñÊrÚ«7‚6∆74Ê÷S“'7ñÊÊW""Û‚¢ƒ6ÜV6≤6ó¶S◊≥w“ÛÁ–¢∑6fñÊrÚ%6«fÊF˛(
b"¢%6«f"W7\:&ñÚ'–¢¬ˆ'WGFˆ„‡¢¬Û‡¢–¢‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢∆∆&V¬6∆74Ê÷S“&fñV∆BfñV∆B◊7‚”"#‡¢«7„‰Êˆ÷R6ˆ◊∆WFÚ∆#‚£¬ˆ#„¬˜7„‡¢∆ñÁW@¢f«VS◊∑W6W$G&gBÊÊ÷W–¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚6WEW6W$G&gBá≤‚‚ÁW6W$G&gB¬Ê÷S¢WfVÁBÁF&vWBÁf«VRÁ6∆ñ6RÉ¬í“ó–¢∆6VÜˆ∆FW#“$Êˆ÷RFW76ˆ ¢Û‡¢¬ˆ∆&V√‡¢∆∆&V¬6∆74Ê÷S“&fñV∆BfñV∆B◊7‚”"#‡¢«7„‰R÷÷ñ¬FR6W76Ú∆#‚£¬ˆ#„¬˜7„‡¢∆ñÁW@¢GóS“&V÷ñ¬ ¢f«VS◊∑W6W$G&gBÊV÷ñ«–¢Fó6&∆VC◊∑W6W$÷ˆF¬Ê÷ˆFR””“&VFóB'–¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚6WEW6W$G&gBá≤‚‚ÁW6W$G&gB¬V÷ñ√¢WfVÁBÁF&vWBÁf«VRÁ6∆ñ6RÉ¬cí“ó–¢∆6VÜˆ∆FW#“&Êˆ÷TV◊&W6Ê6ˆ“ ¢Û‡¢∑W6W$÷ˆF¬Ê÷ˆFR””“&VFóB"bbÄ¢«6÷∆¬6∆74Ê÷S“&fñV∆B÷ÜV«#‰ÚR÷÷ñ¬FR6W76ÚÏ:6ÚˆFR6W"«FW&FÚ„¬˜6÷∆√‡¢ó–¢¬ˆ∆&V√‡¢∆∆&V¬6∆74Ê÷S“&fñV∆BfñV∆B◊7‚”"#‡¢«7„ÂW&fñ¬FR6W76Ú∆#‚£¬ˆ#„¬˜7„‡¢«6V∆V7@¢f«VS◊∑W6W$G&gBÁ&ˆ∆W–¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚6WEW6W$G&gBá≤‚‚ÁW6W$G&gB¬&ˆ∆S¢WfVÁBÁF&vWBÁf«VR2&ˆ∆R“ó–¢‡¢∆˜Fñˆ‚f«VS“'7W˜'FR#Â7W˜'FS¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“&FW6VÁfˆ«fVF˜"#‰FW6VÁfˆ«fVF˜#¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“&F÷ñÊó7G&F˜"#‰F÷ñÊó7G&F˜#¬ˆ˜Fñˆ„‡¢¬˜6V∆V7C‡¢¬ˆ∆&V√‡¢∆Fób6∆74Ê÷S“'W&÷ó76ñˆ‚◊&WfñWrfñV∆B◊7‚”"#‡¢«7‚6∆74Ê÷S“&÷WG&ñ2÷ñ6ˆ‚÷WG&ñ2÷&«VR#„≈6ÜñV∆D6ÜV6≤6ó¶S◊≥á“Û„¬˜7„‡¢∆Fóc‡¢«7G&ˆÊsÂW&÷ó7<;VW2FÚW&fñ¬∑&ˆ∆T∆&V≈∑W6W$G&gBÁ&ˆ∆U◊”¬˜7G&ˆÊs‡¢«V√‡¢∑&ˆ∆UW&÷ó76ñˆÁ5∑W6W$G&gBÁ&ˆ∆U“Ê÷ÇáW&÷ó76ñˆ‚í”‚Ä¢∆∆í∂Wì◊∑W&÷ó76ñˆÁ”Á∑W&÷ó76ñˆÁ”¬ˆ∆ì‡¢íó–¢¬˜V√‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆∆&V¬6∆74Ê÷S“&fñV∆BfñV∆B◊7‚”"#‡¢«7„Á∑W6W$÷ˆF¬Ê÷ˆFR””“&ÊWr"Ú%6VÊÜFV◊˜,:&ñ¢"¢$Ê˜f6VÊÜ'”¬˜7„‡¢∆ñÁW@¢GóS“'77v˜&B ¢f«VS◊∑W6W$G&gBÁ77v˜&G–¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚6WEW6W$G&gBá≤‚‚ÁW6W$G&gB¬77v˜&C¢WfVÁBÁF&vWBÁf«VR“ó–¢∆6VÜˆ∆FW#◊∑W6W$÷ˆF¬Ê÷ˆFR””“&ÊWr"Ú$‹:÷Êñ÷ÚFRÇ6&7FW&W2"¢$FVóÜRV“'&Ê6Ú&÷ÁFW"'–¢Û‡¢«6÷∆¬6∆74Ê÷S“&fñV∆B÷ÜV«#‡¢∑W6W$÷ˆF¬Ê÷ˆFR””“&ÊWr ¢Ú$6VÊÜFWfRFW"V∆Ú÷VÊ˜2Ç6&7FW&W2‚ ¢¢$Ú&VFVfñÊó"6VÊÜ¬26W7<;VW2&W'F26W,:6ÚVÊ6W'&F2‚'–¢¬˜6÷∆√‡¢¬ˆ∆&V√‡¢∑W6W$f˜&‘W'&˜"bbÄ¢∆Fób6∆74Ê÷S“&f˜&“÷∆W'BfñV∆B◊7‚”""&ˆ∆S“&∆W'B#Á∑W6W$f˜&‘W'&˜'”¬ˆFóc‡¢ó–¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ó–†¢∂6ˆÊfó&’W6W$ñBbb7W'&VÁEW6W"Á&ˆ∆R””“&F÷ñÊó7G&F˜""bbÄ¢ƒ÷ˆF¿¢FóF∆S◊∂÷ÊvVEW6W'2ÊfñÊBÇáW6W"í”‚W6W"ÊñB””“6ˆÊfó&’W6W$ñBìÚÊ7FófRÚ$&∆˜VV"6W76ÛÚ"¢%&VFóf"6W76ÛÚ'–¢FW67&óFñˆ„“$ÚÜó7L;7&ñ6ÚR˜2&Vvó7G&˜276ˆ6ñF˜2W7FW76ˆ6W,:6Ú&W6W'fF˜2‚ ¢ˆ‰6∆˜6S◊≤Çí”‚6WD6ˆÊfó&’W6W$ñBÜÁV∆¬ó–¢fˆ˜FW#◊∞¢√‡¢∆'WGFˆ‚6∆74Ê÷S“&'WGFˆ‚'WGFˆ‚÷vÜ˜7B"ˆ‰6∆ñ6≥◊≤Çí”‚6WD6ˆÊfó&’W6W$ñBÜÁV∆¬ó”‡¢6Ê6V∆ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'WGFˆ‚'WGFˆ‚◊&ñ÷'í"ˆ‰6∆ñ6≥◊≤Çí”‚Fˆvv∆UW6W$66W72Ü6ˆÊfó&’W6W$ñBó“Fó6&∆VC◊∑6fñÊw”‡¢∑6fñÊrÚ%&ˆ6W76ÊF˛(
b"¢$6ˆÊfó&÷"'–¢¬ˆ'WGFˆ„‡¢¬Û‡¢–¢‡¢∆Fób6∆74Ê÷S“&6ˆÊfó&“÷÷W76vR#‡¢«7„„ƒ∆W'EG&ñÊv∆R6ó¶S◊≥#7“Û„¬˜7„‡¢«‡¢«7G&ˆÊsÁ∂÷ÊvVEW6W'2ÊfñÊBÇáW6W"í”‚W6W"ÊñB””“6ˆÊfó&’W6W$ñBìÚÊÊ÷W”¬˜7G&ˆÊs‡¢∂÷ÊvVEW6W'2ÊfñÊBÇáW6W"í”‚W6W"ÊñB””“6ˆÊfó&’W6W$ñBìÚÊ7FófP¢Ú"W&FW,:Ú6W76Úñ÷VFñF÷VÁFRR7V26W7<;VW26W,:6ÚVÊ6W'&F2‚ ¢¢"ˆFW,:VÁG&"Ê˜f÷VÁFRÊÚ6ó7FV÷6ˆ“7V6VÊÜGV¬‚'–¢¬˜‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ó–†¢∂6ˆÊfó&‘ˆ67W'&VÊ6TFV∆WFTñBbb7W'&VÁEW6W"Á&ˆ∆R””“&F÷ñÊó7G&F˜""bbÄ¢ƒ÷ˆF¿¢FóF∆S“$WÜ6«Vó"&Vvó7G&ÚFfó7V∆ó¶:|:6ÛÚ ¢FW67&óFñˆ„“$W7F:íV÷WÜ6«W<:6Ú6VwW&¢Ú&Vvó7G&ÚFVóÜ,:FR&V6W"ÊÚ˜'F¬¬÷26ˆÁFñÁV,:&÷¶VÊFÚ&&V7WW&:|:6ÚRVFóF˜&ñ‚ ¢ˆ‰6∆˜6S◊≤Çí”‚6WD6ˆÊfó&‘ˆ67W'&VÊ6TFV∆WFTñBÜÁV∆¬ó–¢fˆ˜FW#◊∞¢√‡¢∆'WGFˆ‚6∆74Ê÷S“&'WGFˆ‚'WGFˆ‚÷vÜ˜7B"ˆ‰6∆ñ6≥◊≤Çí”‚6WD6ˆÊfó&‘ˆ67W'&VÊ6TFV∆WFTñBÜÁV∆¬ó”‡¢6Ê6V∆ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'WGFˆ‚'WGFˆ‚÷FÊvW""ˆ‰6∆ñ6≥◊≤Çí”‚FV∆WFTˆ67W'&VÊ6RÜ6ˆÊfó&‘ˆ67W'&VÊ6TFV∆WFTñBó“Fó6&∆VC◊∑6fñÊw”‡¢∑6fñÊrÚ«7‚6∆74Ê÷S“'7ñÊÊW""Û‚¢≈G&6É"6ó¶S◊≥w“ÛÁ–¢∑6fñÊrÚ$WÜ6«VñÊF˛(
b"¢$WÜ6«Vó"Ffó7V∆ó¶:|:6Ú'–¢¬ˆ'WGFˆ„‡¢¬Û‡¢–¢‡¢∆Fób6∆74Ê÷S“'6fR÷FV∆WFR÷÷W76vR#‡¢«7„„≈6ÜñV∆D6ÜV6≤6ó¶S◊≥#7“Û„¬˜7„‡¢«‡¢«7G&ˆÊs‡¢∂ˆ67W'&VÊ6W2ÊfñÊBÇÜóFV“í”‚óFV“ÊñB””“6ˆÊfó&‘ˆ67W'&VÊ6TFV∆WFTñBìÚÊÁV÷&W'–¢¬˜7G&ˆÊs‡¢ÊVÊáV“FFÚ6W,:vFÚFVfñÊóFóf÷VÁFRFÚ&Ê6ÚFRFF˜2‡¢¬˜‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ó–†¢∂6ˆÊfó&’W6W$FV∆WFTñBbb7W'&VÁEW6W"Á&ˆ∆R””“&F÷ñÊó7G&F˜""bbÄ¢ƒ÷ˆF¿¢FóF∆S“$WÜ6«Vó"W7\:&ñÚFfó7V∆ó¶:|:6ÛÚ ¢FW67&óFñˆ„“$6ˆÁF6W,:ˆ7V«FFRW&FW,:Ú6W76Ú¬÷26WW2FF˜2Rl:÷Ê7V∆˜2Üó7L;7&ñ6˜26ˆÁFñÁV,:6Ú&÷¶VÊF˜2‚ ¢ˆ‰6∆˜6S◊≤Çí”‚6WD6ˆÊfó&’W6W$FV∆WFTñBÜÁV∆¬ó–¢fˆ˜FW#◊∞¢√‡¢∆'WGFˆ‚6∆74Ê÷S“&'WGFˆ‚'WGFˆ‚÷vÜ˜7B"ˆ‰6∆ñ6≥◊≤Çí”‚6WD6ˆÊfó&’W6W$FV∆WFTñBÜÁV∆¬ó”‡¢6Ê6V∆ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'WGFˆ‚'WGFˆ‚÷FÊvW""ˆ‰6∆ñ6≥◊≤Çí”‚FV∆WFUW6W"Ü6ˆÊfó&’W6W$FV∆WFTñBó“Fó6&∆VC◊∑6fñÊw”‡¢∑6fñÊrÚ«7‚6∆74Ê÷S“'7ñÊÊW""Û‚¢≈G&6É"6ó¶S◊≥w“ÛÁ–¢∑6fñÊrÚ$WÜ6«VñÊF˛(
b"¢$WÜ6«Vó"W7\:&ñÚ'–¢¬ˆ'WGFˆ„‡¢¬Û‡¢–¢‡¢∆Fób6∆74Ê÷S“'6fR÷FV∆WFR÷÷W76vR#‡¢«7„„≈6ÜñV∆D6ÜV6≤6ó¶S◊≥#7“Û„¬˜7„‡¢«‡¢«7G&ˆÊs‡¢∂÷ÊvVEW6W'2ÊfñÊBÇáW6W"í”‚W6W"ÊñB””“6ˆÊfó&’W6W$FV∆WFTñBìÚÊÊ÷W–¢¬˜7G&ˆÊs‡¢WÜ6«W<:6ÚÏ:6Úvˆ6˜',:¶Ê6ñ2¬Üó7L;7&ñ6ÚFR6W76Ú˜RFF˜2FRVFóF˜&ñ‡¢¬˜‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ó–†¢∑Fˆ7BbbÄ¢∆Fób6∆74Ê÷S“'Fˆ7B"&ˆ∆S“'7FGW2#‡¢ƒ6ÜV6¥6ó&6∆S"6ó¶S◊≥#“Û‡¢∑Fˆ7G–¢∆'WGFˆ‚ˆ‰6∆ñ6≥◊≤Çí”‚6WEFˆ7BÇ""ó“&ñ÷∆&V√“$fV6Ü"÷VÁ6vV“#‡¢≈Ç6ó¶S◊≥g“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢ì∞ß–