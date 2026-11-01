import React from "react";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import { BooleanBadge, MoneyCell, DASH } from "@/widgets/admin/cells";

export function GlobalPlans() {
  const { t } = useLanguage();
  const k = (key) => t(`admin.pages.plans.${key}`);
  return (
    <GlobalCrudPage
      title={t("global.pages.plans.title")}
      subtitle={k("subtitle")}
      resource="plans"
      columns={[
        { header: k("name"), cell: (p) => <span className="font-medium text-[#0F172A]">{p.name}</span> },
        { header: k("tier"), accessor: "tier" },
        { header: k("price"), cell: (p) => <MoneyCell cents={p.price_cents} currency={p.currency} period={p.billing_period} /> },
        { header: k("subscribers"), cell: (p) => (p.subscribers_count == null ? DASH : <span className="tabular-nums">{p.subscribers_count}</span>) },
        { header: k("active"), cell: (p) => <BooleanBadge value={p.is_active} /> },
      ]}
      fields={[
        { name: "tier", label: k("tier"), type: "text", required: true },
        { name: "name", label: k("name"), type: "text", required: true },
        { name: "description", label: k("description"), type: "textarea" },
        { name: "price_cents", label: k("priceCents"), type: "number", hint: k("priceCentsHint") },
        { name: "currency", label: k("currency"), type: "text", defaultValue: "USD" },
        { name: "billing_period", label: k("period"), type: "select", defaultValue: "monthly",
          options: [{ value: "monthly", label: k("monthly") }, { value: "yearly", label: k("yearly") }] },
        { name: "max_documents", label: k("maxDocuments"), type: "number" },
        { name: "max_batteries", label: k("maxBatteries"), type: "number" },
        { name: "is_active", label: k("active"), type: "boolean", defaultValue: true },
      ]}
      deleteConfirm={(p) => ({ entityName: p.name, confirmText: p.name, consequences: k("deleteConsequences") })}
    />
  );
}

export default GlobalPlans;
