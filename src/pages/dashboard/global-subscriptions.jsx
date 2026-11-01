import React, { useEffect, useState } from "react";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import { DateCell, EntityCell, StatusBadge, DASH } from "@/widgets/admin/cells";
import { fetchAll } from "@/widgets/admin/fetchAll";

const STATUSES = ["trialing", "active", "past_due", "canceled", "expired"];
const TONE = { active: "emerald", trialing: "sky", past_due: "amber", canceled: "slate", expired: "rose" };

export function GlobalSubscriptions() {
  const { t } = useLanguage();
  const k = (key) => t(`admin.pages.subscriptions.${key}`);
  const [plans, setPlans] = useState([]);
  useEffect(() => { fetchAll("plans").then(setPlans).catch(() => setPlans([])); }, []);
  const statusLabels = Object.fromEntries(STATUSES.map((s) => [s, k(`status_${s}`)]));
  return (
    <GlobalCrudPage
      title={t("global.pages.subscriptions.title")}
      subtitle={k("subtitle")}
      resource="subscriptions"
      disableCreate
      searchable
      searchPlaceholder={k("search")}
      filters={[
        { name: "plan", label: k("plan"), options: plans.map((p) => ({ value: p.id, label: p.name })) },
        { name: "status", label: k("status"), options: STATUSES.map((s) => ({ value: s, label: statusLabels[s] })) },
      ]}
      columns={[
        { header: k("user"), cell: (s) => <EntityCell detail={s.user_detail} id={s.user} sub={s.user_detail?.email} /> },
        { header: k("plan"), cell: (s) => <EntityCell detail={s.plan_detail} id={s.plan} /> },
        { header: k("status"), sortKey: "status", cell: (s) => <StatusBadge value={s.status} tones={TONE} labels={statusLabels} /> },
        { header: k("provider"), cell: (s) => (s.provider ? <span>{s.provider}</span> : DASH) },
        { header: k("started"), sortKey: "start_at", cell: (s) => <DateCell value={s.start_at} withTime={false} /> },
        { header: k("periodEnd"), sortKey: "current_period_end", cell: (s) => <DateCell value={s.current_period_end} withTime={false} /> },
      ]}
      fields={[
        { name: "plan", label: k("plan"), type: "select-resource", resource: "plans", labelAccessor: "name", valueAccessor: "id", required: true },
        { name: "status", label: k("status"), type: "select", options: STATUSES.map((s) => ({ value: s, label: statusLabels[s] })), required: true },
        { name: "provider", label: k("provider"), type: "text" },
        { name: "provider_subscription_id", label: k("providerId"), type: "text" },
      ]}
      deleteConfirm={(s) => ({ entityName: s.user_detail?.username || `#${s.id}`, consequences: k("deleteConsequences") })}
    />
  );
}

export default GlobalSubscriptions;
