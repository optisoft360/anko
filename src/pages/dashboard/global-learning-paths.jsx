import React from "react";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import { DateCell, EntityCell, StatusBadge, TruncatedText } from "@/widgets/admin/cells";
import { truncate } from "@/widgets/admin/format";
import { useCompanyOptions } from "@/widgets/admin/useCompanyOptions";

const STATUS_TONE = { active: "emerald", published: "emerald", draft: "slate", archived: "amber" };

export function GlobalLearningPaths() {
  const { t } = useLanguage();
  const k = (key) => t(`admin.pages.learningPaths.${key}`);
  const companies = useCompanyOptions();
  return (
    <GlobalCrudPage
      title={k("title")}
      subtitle={k("subtitle")}
      resource="admin/learning-paths"
      disableCreate disableEdit disableDelete
      searchable
      filters={[
        { name: "company", label: k("company"), options: companies },
        { name: "status", label: k("status"), options: ["draft", "active", "archived"].map((v) => ({ value: v, label: t(`admin.status.${v}`) })) },
      ]}
      columns={[
        { header: k("name"), sortKey: "name", cell: (lp) => (lp.name || lp.title)
          ? <span className="font-medium text-[#0F172A]">{lp.name || lp.title}</span>
          : <span className="italic text-[#64748B]" title={k("untitled")}>{truncate(lp.description, 60) || k("untitled")}</span> },
        { header: k("company"), cell: (lp) => <EntityCell detail={lp.company_detail} id={lp.company} /> },
        { header: k("status"), cell: (lp) => <StatusBadge value={lp.status} tones={STATUS_TONE} labels={{ draft: t("admin.status.draft"), active: t("admin.status.active"), archived: t("admin.status.archived") }} /> },
        { header: k("modules"), accessor: (lp) => lp.modules_count ?? lp.module_count ?? 0, className: "tabular-nums" },
        { header: k("assignments"), accessor: (lp) => lp.assignment_count ?? 0, className: "tabular-nums" },
        { header: k("description"), cell: (lp) => <TruncatedText value={lp.description} max={70} /> },
        { header: k("created"), sortKey: "created_at", cell: (lp) => <DateCell value={lp.created_at} withTime={false} /> },
      ]}
      fields={[]}
    />
  );
}

export default GlobalLearningPaths;
