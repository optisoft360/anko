import React from "react";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import { DASH, DateCell, EntityCell, StatusBadge } from "@/widgets/admin/cells";

// Admin Area > Batteries: every battery on the platform. The end-user battery page
// (/dashboard/batteries) is a different screen and stays as it is.
const STATUS_TONE = { Ready: "emerald", Draft: "slate" };
const DIFF_TONE = { Easy: "emerald", Medium: "amber", Hard: "rose" };
const VISIBILITY = ["private", "shared", "public"];

export function AdminBatteries() {
  const { t } = useLanguage();
  const k = (key) => t(`admin.pages.batteries.${key}`);
  const visOptions = VISIBILITY.map((v) => ({ value: v, label: t(`admin.visibility.${v}`) }));
  const statusLabels = { Draft: t("admin.status.draft"), Ready: t("admin.status.ready") };
  const diffLabels = { Easy: k("easy"), Medium: k("medium"), Hard: k("hard") };
  return (
    <GlobalCrudPage
      title={k("title")}
      subtitle={k("subtitle")}
      resource="admin/batteries"
      itemResource="batteries"
      disableCreate
      searchable
      filters={[
        { name: "status", label: k("status"), options: Object.entries(statusLabels).map(([value, label]) => ({ value, label })) },
        { name: "visibility", label: k("visibility"), options: visOptions },
        { name: "project", label: k("project"), hidden: true },
      ]}
      columns={[
        { header: k("name"), sortKey: "name", cell: (b) => <span className="font-medium text-[#0F172A]">{b.name}</span> },
        { header: k("company"), cell: (b) => <EntityCell detail={b.company_detail} /> },
        { header: k("project"), cell: (b) => (b.project ? <EntityCell detail={b.project_detail} id={b.project} /> : <span title={t("admin.cells.noProject")}>{DASH}</span>) },
        { header: k("owner"), cell: (b) => <EntityCell detail={b.owner_detail} /> },
        { header: k("status"), cell: (b) => <StatusBadge value={b.status} tones={STATUS_TONE} labels={statusLabels} /> },
        { header: k("difficulty"), cell: (b) => <StatusBadge value={b.difficulty} tones={DIFF_TONE} labels={diffLabels} /> },
        { header: k("rule"), cell: (b) => (b.rule_detail || b.rule ? <EntityCell detail={b.rule_detail} id={b.rule} /> : <span title={k("noRule")}>{DASH}</span>) },
        { header: k("questions"), sortKey: "question_count", accessor: (b) => b.question_count ?? 0, className: "tabular-nums" },
        { header: k("created"), sortKey: "created_at", cell: (b) => <DateCell value={b.created_at} withTime={false} /> },
      ]}
      fields={[
        { name: "name", label: k("name"), type: "text", required: true },
        { name: "status", label: k("status"), type: "select", options: Object.entries(statusLabels).map(([value, label]) => ({ value, label })) },
        { name: "visibility", label: k("visibility"), type: "select", options: visOptions },
      ]}
      deleteConfirm={(b) => ({ entityName: b.name, consequences: k("deleteConsequences") })}
    />
  );
}

export default AdminBatteries;
