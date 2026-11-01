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
        // Combined cells keep the table within 1024-1440px: Name carries project and rule on a grey
        // second line (like Users' email), Company/Owner and Status/Difficulty share a cell each.
        { header: k("name"), sortKey: "name", maxWidth: "max-w-[230px]", cell: (b) => (
          <span className="block min-w-[150px]">
            <span className="line-clamp-2 font-medium text-[#0F172A]" title={b.name}>{b.name}</span>
            <span className="mt-0.5 block truncate text-xs text-[#64748B]">
              {b.project
                ? <span title={k("project")}>{b.project_detail?.title || `#${b.project}`}</span>
                : <span title={t("admin.cells.noProject")}>{k("noProjectShort")}</span>}
              {(b.rule_detail || b.rule) && <span title={k("rule")}> · {b.rule_detail?.name || `#${b.rule}`}</span>}
            </span>
          </span>
        ) },
        { header: k("companyOwner"), className: "!whitespace-normal", maxWidth: "max-w-[160px]", cell: (b) => (
          <span className="block min-w-0">
            <span className="block truncate text-[#334155]">{b.company_detail?.name || <span title={k("noCompany")}>{DASH}</span>}</span>
            {b.owner_detail && <span className="block truncate text-xs text-[#64748B]" title={b.owner_detail.email}>{b.owner_detail.username}</span>}
          </span>
        ) },
        { header: k("statusDifficulty"), className: "!whitespace-normal w-[110px]", cell: (b) => (
          <span className="flex flex-col items-start gap-1">
            <StatusBadge value={b.status} tones={STATUS_TONE} labels={statusLabels} />
            <StatusBadge value={b.difficulty} tones={DIFF_TONE} labels={diffLabels} />
          </span>
        ) },
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
