import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  EnvelopeIcon,
  ArrowPathIcon,
  XMarkIcon,
  PlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useEnterprise } from "@/enterprise/context/enterprise-context";
import { useLanguage } from "../../../context/language-context";
import invitationsService from "@/services/invitationsService";
import {
  BTN_DANGER_SOFT, BTN_PRIMARY, BTN_SOFT, Badge, Card, EmptyBlock, PageHeader, ROLE_TONE, Segmented, Spinner, TONE,
} from "@/enterprise/components/ui/kit";

const ADMIN_ROLES = ["owner", "admin"];

const STATUS_TONE = { pending: "amber", accepted: "emerald", expired: "rose", cancelled: "slate" };

function useRoleLabels() {
  const { t } = useLanguage();
  return {
    owner:    t("enterprise.settings.inviteUser.roles.owner"),
    admin:    t("enterprise.settings.inviteUser.roles.admin"),
    manager:  t("enterprise.settings.inviteUser.roles.manager"),
    trainer:  t("enterprise.settings.inviteUser.roles.trainer"),
    employee: t("enterprise.settings.inviteUser.roles.employee"),
    auditor:  t("enterprise.settings.inviteUser.roles.auditor"),
  };
}

const TABS = ["all", "pending", "accepted", "expired", "cancelled"];

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const label = STATUS_TONE[status] ? t(`enterprise.platformAdmin.invitations.status.${status}`) : status;
  return <Badge tone={STATUS_TONE[status] || "slate"} dot>{label}</Badge>;
}

function RoleBadge({ role }) {
  const labels = useRoleLabels();
  return <Badge tone={ROLE_TONE[role] || "slate"}>{labels[role] || role}</Badge>;
}

function formatDate(iso, language) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(language === "es" ? "es" : "en", { year: "numeric", month: "short", day: "numeric" });
}

export default function EnterpriseInvitations() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  // The company selected in the enterprise area (same as Settings), not the first one in the list.
  const { activeCompany, activeCompanyId, role } = useEnterprise();
  const canInvite = ADMIN_ROLES.includes(role);
  const company = activeCompany;
  const companyId = activeCompanyId;

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [acting, setActing] = useState({});
  const [error, setError] = useState(null);

  const TAB_LABELS = {
    all: t("enterprise.platformAdmin.invitations.statusTabs.all"),
    pending: t("enterprise.platformAdmin.invitations.status.pending"),
    accepted: t("enterprise.platformAdmin.invitations.status.accepted"),
    expired: t("enterprise.platformAdmin.invitations.status.expired"),
    cancelled: t("enterprise.platformAdmin.invitations.status.cancelled"),
  };

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await invitationsService.listByCompany(companyId);
      setInvitations(Array.isArray(data) ? data : (data.results ?? []));
    } catch {
      setError(t("enterprise.invitations.loadError"));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const handleResend = async (inv) => {
    setActing(a => ({ ...a, [inv.id]: "resend" }));
    try {
      await invitationsService.resend(companyId, inv.id);
      await load();
    } catch {
      /* silent */
    } finally {
      setActing(a => ({ ...a, [inv.id]: null }));
    }
  };

  const handleCancel = async (inv) => {
    setActing(a => ({ ...a, [inv.id]: "cancel" }));
    try {
      await invitationsService.cancel(companyId, inv.id);
      setInvitations(prev => prev.map(i => i.id === inv.id ? { ...i, status: "cancelled" } : i));
    } catch {
      /* silent */
    } finally {
      setActing(a => ({ ...a, [inv.id]: null }));
    }
  };

  const filtered = tab === "all" ? invitations : invitations.filter(i => i.status === tab);
  const counts = TABS.reduce((acc, tb) => {
    acc[tb] = tb === "all" ? invitations.length : invitations.filter(i => i.status === tb).length;
    return acc;
  }, {});

  const columns = [
    t("enterprise.platformAdmin.invitations.columns.email"),
    t("enterprise.platformAdmin.invitations.columns.role"),
    t("enterprise.platformAdmin.invitations.columns.status"),
    t("enterprise.platformAdmin.invitations.columns.invitedBy"),
    t("enterprise.platformAdmin.invitations.columns.expires"),
    t("enterprise.invitations.columns.actions"),
  ];

  const actionButtons = (inv) => (
    inv.status === "pending" ? (
      <div className="flex gap-2">
        <button type="button" onClick={() => handleResend(inv)} disabled={!!acting[inv.id]} className={`${BTN_SOFT} flex-1 sm:flex-none`}>
          <ArrowPathIcon className={`h-4 w-4 ${acting[inv.id] === "resend" ? "animate-spin" : ""}`} />
          {t("enterprise.invitations.resend")}
        </button>
        <button type="button" onClick={() => handleCancel(inv)} disabled={!!acting[inv.id]} className={`${BTN_DANGER_SOFT} flex-1 sm:flex-none`}>
          <XMarkIcon className="h-4 w-4" />
          {t("enterprise.invitations.cancel")}
        </button>
      </div>
    ) : <span className="text-sm text-[#94A3B8]">—</span>
  );

  const head = "px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#64748B]";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6 md:py-2">
      <PageHeader
        title={t("enterprise.platformAdmin.invitations.title")}
        subtitle={company?.company_name}
        actions={canInvite && (
          <button type="button" onClick={() => navigate("/enterprise/settings/invite")} className={BTN_PRIMARY}>
            <PlusIcon className="h-4 w-4" /> {t("enterprise.settings.inviteUser.title")}
          </button>
        )}
      />

      <Segmented
        ariaLabel={t("enterprise.platformAdmin.invitations.columns.status")}
        value={tab}
        onChange={setTab}
        items={TABS.map((tb) => ({ value: tb, label: TAB_LABELS[tb], count: counts[tb] }))}
      />

      <Card>
        {loading ? (
          <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
        ) : error ? (
          <EmptyBlock icon={ExclamationTriangleIcon} title={error} />
        ) : filtered.length === 0 ? (
          <EmptyBlock
            icon={EnvelopeIcon}
            title={t("enterprise.platformAdmin.invitations.empty")}
            hint={canInvite ? t("enterprise.invitations.emptyHint") : undefined}
            action={canInvite && (
              <button type="button" onClick={() => navigate("/enterprise/settings/invite")} className={BTN_PRIMARY}>
                <PlusIcon className="h-4 w-4" /> {t("enterprise.settings.inviteUser.title")}
              </button>
            )}
          />
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
                      <div className="mt-1.5 flex flex-wrap gap-1.5"><RoleBadge role={inv.role} /><StatusBadge status={inv.status} /></div>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div><dt className="text-[#64748B]">{columns[3]}</dt><dd className="truncate text-[#334155]">{inv.invited_by_email || "—"}</dd></div>
                    <div><dt className="text-[#64748B]">{columns[4]}</dt><dd className="flex items-center gap-1 text-[#334155]"><ClockIcon className="h-3.5 w-3.5 text-[#94A3B8]" />{formatDate(inv.expires_at, language)}</dd></div>
                  </dl>
                  {inv.status === "pending" && actionButtons(inv)}
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
                        <div className="flex items-center gap-3">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${TONE.indigo.icon}`}><EnvelopeIcon className="h-4 w-4" /></span>
                          <span className="font-medium text-[#0F172A]">{inv.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4"><RoleBadge role={inv.role} /></td>
                      <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                      <td className="px-6 py-4 text-[#64748B]">{inv.invited_by_email || "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-[#64748B]">
                        <span className="inline-flex items-center gap-1.5"><ClockIcon className="h-4 w-4 text-[#94A3B8]" />{formatDate(inv.expires_at, language)}</span>
                      </td>
                      <td className="px-6 py-4">{actionButtons(inv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
