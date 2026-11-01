import React from "react";
import { Link } from "react-router-dom";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { FOCUS } from "@/enterprise/components/ui/kit";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import { DateCell, EntityCell, StatusBadge, TruncatedText } from "@/widgets/admin/cells";
import { truncate } from "@/widgets/admin/format";
import { useCompanyOptions } from "@/widgets/admin/useCompanyOptions";

const STATUSES = ["draft", "published", "archived"];
const STATUS_TONE = { published: "emerald", draft: "slate", archived: "amber" };

export function GlobalLearningPaths() {
  const { t } = useLanguage();
  const k = (key) => t(`admin.pages.learningPaths.${key}`);
  const companies = useCompanyOptions();
  const statusLabels = Object.fromEntries(STATUSES.map((v) => [v, t(`admin.status.${v}`)]));
  const statusOptions = STATUSES.map((v) => ({ value: v, label: statusLabels[v] }));
  return (
    <GlobalCrudPage
      title={k("title")}
      subtitle={k("subtitle")}
      resource="admin/learning-paths"
      disableCreate
      searchable
      filters={[
        { name: "company", label: k("company"), options: companies },
        { name: "status", label: k("status"), options: statusOptions },
      ]}
      columns={[
        { header: k("name"), sortKey: "name", cell: (lp) => (lp.name || lp.title)
          ? <span className="font-medium text-[#0F172A]">{lp.name || lp.title}</span>
          : <span className="italic text-[#64748B]" title={k("untitled")}>{truncate(lp.description, 60) || k("untitled")}</span> },
        { header: k("company"), cell: (lp) => <EntityCell detail={lp.company_detail} id={lp.company} /> },
        { header: k("status"), cell: (lp) => <StatusBadge value={lp.status} tones={STATUS_TONE} labels={statusLabels} /> },
        { header: k("modules"), accessor: (lp) => lp.modules_count ?? lp.module_count ?? 0, className: "tabular-nums" },
        { header: k("assignments"), accessor: (lp) => lp.assignment_count ?? 0, className: "tabular-nums" },
        { header: k("description"), cell: (lp) => <TruncatedText value={lp.description} max={70} /> },
        { header: k("created"), sortKey: "created_at", cell: (lp) => <DateCell value={lp.created_at} withTime={false} /> },
      ]}
      fields={[
        { name: "name", label: k("name"), type: "text", required: true },
        { name: "description", label: k("description"), type: "textarea" },
        { name: "status", label: k("status"), type: "select", options: statusOptions, required: true },
      ]}
      extraActions={(lp) => (lp.company ? (
        <Link to={`/enterprise/learning/paths/${lp.id}?company=${lp.company}`} onClick={(e) => e.stopPropagation()}
          aria-label={k("openInCompany")} title={k("openInCompany")}
          className={`grid h-9 w-9 place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] ${FOCUS}`}>
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </Link>
      ) : null)}
      deleteConfirm={(lp) => ({ entityName: lp.name, confirmText: lp.name, consequences: k("deleteConsequences") })}
    />
  );
}

export default GlobalLearningPaths;
