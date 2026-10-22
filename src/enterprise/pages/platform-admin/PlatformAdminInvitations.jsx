import { useState, useEffect, useCallback } from "react";
import {
  EnvelopeIcon, ClockIcon, BuildingOffice2Icon, PlusIcon,
  PaperAirplaneIcon, CheckCircleIcon, ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import api from "@/services/api";
import invitationsService from "@/services/invitationsService";
import { useLanguage } from "../../../context/language-context";
import {
  BTN_PRIMARY, BTN_SECONDARY, Badge, Card, EmptyBlock, FOCUS, Field, Modal, PageHeader, ROLE_TONE,
  Segmented, SelectInput, Spinner, TONE, TextInput,
} from "../../components/ui/kit";

// Same look as the company Invitations page (enterprise/pages/invitations).
const STATUS_TONE = { pending: "amber", accepted: "emerald", expired: "rose", cancelled: "slate" };
const ROLE_VALUES = ["admin", "manager", "trainer", "employee", "auditor", "owner"];

function useRoles() {
  const { t } = useLanguage();
  return ROLE_VALUES.map((value) => ({ value, label: t(`enterprise.settings.inviteUser.roles.${value}`) }));
}

function useStages() {
  const { t } = useLanguage();
  return [
    { value: "candidate",       label: t("enterprise.settings.company.stages.candidate") },
    { value: "onboarding",      label: t("enterprise.settings.company.stages.onboarding") },
    { value: "trainee",         label: t("enterprise.settings.company.stages.trainee") },
    { value: "active_employee", label: t("enterprise.settings.company.stages.activeEmployee") },
    { value: "contractor",      label: t("enterprise.settings.company.stages.contractor") },
    { value: "former_employee", label: t("enterprise.settings.company.stages.formerEmployee") },
  ];
}

const TOP_TABS  = ["global", "recent"];
const STATUS_TABS = ["all", "pending", "accepted", "expired", "cancelled"];

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const label = STATUS_TONE[status] ? t(`enterprise.platformAdmin.invitations.status.${status}`) : status;
  return <Badge tone={STATUS_TONE[status] || "slate"} dot>{label}</Badge>;
}

function RoleBadge({ role }) {
  const { t } = useLanguage();
  return <Badge tone={ROLE_TONE[role] || "slate"}>{ROLE_TONE[role] ? t(`enterprise.settings.inviteUser.roles.${role}`) : role}</Badge>;
}

function formatDate(iso, language) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(language === "es" ? "es" : "en", { year: "numeric", month: "short", day: "numeric" });
}

/* ── Invite Modal ──────────────────────────────────────────────────────── */
function InviteModal({ companies, onClose, onSent }) {
  const { t } = useLanguage();
  const ROLES = useRoles();
  const STAGES = useStages();
  const [companyId, setCompanyId] = useState("");
  const [email, setEmail]         = useState("");
  const [role, setRole]           = useState("employee");
  const [stage, setStage]         = useState("onboarding");
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  const activeEmail   = email.trim();
  const selectedRole  = ROLES.find(r => r.value === role);

  const handleSend = async () => {
    if (!activeEmail || !companyId) return;
    setSending(true);
    setError("");
    try {
      await invitationsService.send(Number(companyId), { email: activeEmail, role, employee_stage: stage });
      setSuccess(true);
      onSent?.();
    } catch (err) {
      setError(err?.email?.[0] || err?.detail || t("enterprise.settings.inviteUser.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const k = (key) => t(`enterprise.platformAdmin.invitations.inviteModal.${key}`);
  const ready = Boolean(activeEmail && companyId);

  return (
    <Modal
      title={k("title")}
      onClose={onClose}
      width="max-w-lg"
      footer={success ? (
        <>
          <button type="button" onClick={() => { setSuccess(false); setEmail(""); setCompanyId(""); }} className={BTN_SECONDARY}>{k("sendAnother")}</button>
          <button type="button" onClick={onClose} className={BTN_PRIMARY}>{k("done")}</button>
        </>
      ) : (
        <>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>{t("enterprise.compliance.programs.cancel")}</button>
          <button type="button" onClick={handleSend} disabled={sending || !ready} className={BTN_PRIMARY}>
            <PaperAirplaneIcon className="h-4 w-4" />
            {sending ? t("enterprise.settings.inviteUser.sending") : t("enterprise.settings.inviteUser.sendInvitation")}
          </button>
        </>
      )}
    >
      {success ? (
        <div className="flex flex-col items-center py-4 text-center">
          <span className={`grid h-14 w-14 place-items-center rounded-full ${TONE.emerald.icon}`}><CheckCircleIcon className="h-7 w-7" /></span>
          <p className="mt-3 text-base font-semibold text-[#0F172A]">{t("enterprise.settings.inviteUser.sentTitle")}</p>
          <p className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2 text-sm font-medium text-[#4338CA]">
            <EnvelopeIcon className="h-4 w-4" /> <span className="break-all">{email}</span>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="-mt-1 text-sm text-[#64748B]">{k("subtitle")}</p>
          <Field label={k("companyLabel")} required>
            <SelectInput value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">{k("selectCompany")}</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectInput>
          </Field>
          <Field label={k("emailLabel")} required>
            <TextInput type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="user@company.com" />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-[#334155]">{t("enterprise.settings.company.members.addModal.roleLabel")}</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROLES.map((r) => {
                const active = role === r.value;
                return (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)} aria-pressed={active}
                    className={`h-11 cursor-pointer rounded-lg border px-2 text-sm font-medium transition-colors duration-150 sm:h-10 ${FOCUS} ${
                      active ? "border-[#6366F1] bg-[#EEF2FF] text-[#4338CA]" : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"}`}>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label={t("enterprise.settings.inviteUser.employeeStage")}>
            <SelectInput value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </SelectInput>
          </Field>
          {error && <p className="rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2 text-sm text-[#BE123C]">{error}</p>}
          {ready && (
            <div className="flex items-start gap-3 rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-3.5 py-3">
              <EnvelopeIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#4F46E5]" />
              <p className="min-w-0 text-sm text-[#475569]">
                {k("sendingTo")} <span className="break-all font-semibold text-[#3730A3]">{activeEmail}</span>
                {selectedRole && <> {k("as")} <span className="font-semibold text-[#3730A3]">{selectedRole.label}</span></>}
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */
export default function PlatformAdminInvitations() {
  const { t, language } = useLanguage();
  const [topTab, setTopTab]       = useState("global");
  const [statusTab, setStatusTab] = useState("all");
  const [invitations, setInvitations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [showModal, setShowModal] = useState(false);

  const STATUS_TAB_LABELS = {
    all: t("enterprise.platformAdmin.invitations.statusTabs.all"),
    pending: t("enterprise.platformAdmin.invitations.status.pending"),
    accepted: t("enterprise.platformAdmin.invitations.status.accepted"),
    expired: t("enterprise.platformAdmin.invitations.status.expired"),
    cancelled: t("enterprise.platformAdmin.invitations.status.cancelled"),
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (topTab === "recent") params.recent = "1";
      const data = await invitationsService.listGlobal(params);
      setInvitations(Array.isArray(data) ? data : (data.results ?? []));
    } catch {
      setError(t("enterprise.platformAdmin.invitations.loadError"));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get("/enterprise/companies/")
      .then(r => setCompanies(Array.isArray(r.data) ? r.data : (r.data?.results ?? [])))
      .catch(() => {});
  }, []);

  const filtered = statusTab === "all" ? invitations : invitations.filter(i => i.status === statusTab);
  const counts = STATUS_TABS.reduce((acc, s) => {
    acc[s] = s === "all" ? invitations.length : invitations.filter(i => i.status === s).length;
    return acc;
  }, {});

  const columns = [
    t("enterprise.platformAdmin.invitations.columns.company"),
    t("enterprise.platformAdmin.invitations.columns.email"),
    t("enterprise.platformAdmin.invitations.columns.role"),
    t("enterprise.platformAdmin.invitations.columns.status"),
    t("enterprise.platformAdmin.invitations.columns.invitedBy"),
    t("enterprise.platformAdmin.invitations.columns.sent"),
    t("enterprise.platformAdmin.invitations.columns.expires"),
  ];

  const head = "px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#64748B]";
  const newInvitation = (
    <button type="button" onClick={() => setShowModal(true)} className={BTN_PRIMARY}>
      <PlusIcon className="h-4 w-4" /> {t("enterprise.platformAdmin.invitations.inviteModal.title")}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6 md:py-2">
      <PageHeader
        title={t("enterprise.platformAdmin.invitations.title")}
        subtitle={t("enterprise.platformAdmin.invitations.subtitle")}
        actions={newInvitation}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          ariaLabel={t("enterprise.platformAdmin.invitations.title")}
          value={topTab}
          onChange={setTopTab}
          items={TOP_TABS.map((tb) => ({ value: tb, label: tb === "recent" ? t("enterprise.platformAdmin.invitations.recentTab") : t("enterprise.platformAdmin.invitations.globalTab") }))}
        />
        <Segmented
          ariaLabel={t("enterprise.platformAdmin.invitations.columns.status")}
          value={statusTab}
          onChange={setStatusTab}
          items={STATUS_TABS.map((st) => ({ value: st, label: STATUS_TAB_LABELS[st], count: counts[st] }))}
        />
      </div>

      <Card>
        {loading ? (
          <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
        ) : error ? (
          <EmptyBlock icon={ExclamationTriangleIcon} title={error} />
        ) : filtered.length === 0 ? (
          <EmptyBlock icon={EnvelopeIcon} title={t("enterprise.platformAdmin.invitations.empty")} action={newInvitation} />
        ) : (
          <>
            {/* Phones: one card per invitation */}
            <ul className="divide-y divide-[#F1F5F9] md:hidden">
              {filtered.map((inv) => (
                <li key={inv.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONE.indigo.icon}`}><EnvelopeIcon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-medium text-[#0F172A]">{inv.email}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-[#64748B]"><BuildingOffice2Icon className="h-3.5 w-3.5" />{inv.company_name || `#${inv.company}`}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5"><RoleBadge role={inv.role} /><StatusBadge status={inv.status} /></div>
                    </div>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div className="min-w-0"><dt className="text-[#64748B]">{columns[4]}</dt><dd className="truncate text-[#334155]">{inv.invited_by_email || "—"}</dd></div>
                    <div><dt className="text-[#64748B]">{columns[5]}</dt><dd className="text-[#334155]">{formatDate(inv.created_at, language)}</dd></div>
                    <div><dt className="text-[#64748B]">{columns[6]}</dt><dd className="text-[#334155]">{formatDate(inv.expires_at, language)}</dd></div>
                  </dl>
                </li>
              ))}
            </ul>

            {/* md and up: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC]">
                  <tr>{columns.map((h) => <th key={h} scope="col" className={head}>{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="transition-colors duration-150 hover:bg-[#F8FAFC]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${TONE.sky.icon}`}><BuildingOffice2Icon className="h-4 w-4" /></span>
                          <span className="font-medium text-[#334155]">{inv.company_name || `#${inv.company}`}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-[#0F172A]">{inv.email}</td>
                      <td className="px-6 py-4"><RoleBadge role={inv.role} /></td>
                      <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                      <td className="px-6 py-4 text-[#64748B]">{inv.invited_by_email || "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-[#64748B]">
                        <span className="inline-flex items-center gap-1.5"><ClockIcon className="h-4 w-4 text-[#94A3B8]" />{formatDate(inv.created_at, language)}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-[#64748B]">{formatDate(inv.expires_at, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {showModal && (
        <InviteModal
          companies={companies}
          onClose={() => setShowModal(false)}
          onSent={() => { load(); }}
        />
      )}
    </div>
  );
}
