import React from "react";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import { DateCell, EntityCell, TruncatedText } from "@/widgets/admin/cells";
import { Badge } from "@/enterprise/components/ui/kit";

// Admin Area > Processes: the personal-workspace projects (api Project). Company processes are
// Knowledge Sources and live under each company's Enterprise area.
export function GlobalProjects() {
  const { t } = useLanguage();
  const k = (key) => t(`admin.pages.processes.${key}`);
  return (
    <GlobalCrudPage
      title={k("title")}
      subtitle={k("subtitle")}
      resource="admin/projects"
      disableCreate
      searchable
      filters={[{ name: "archived", label: k("archived"), options: [{ value: "false", label: t("admin.cells.no") }, { value: "true", label: t("admin.cells.yes") }] }]}
      columns={[
        { header: k("name"), sortKey: "title", cell: (p) => (
          <span className="flex items-center gap-1.5">
            <span className="truncate font-medium text-[#0F172A]">{p.title}</span>
            {p.archived && <Badge tone="amber">{k("archived")}</Badge>}
          </span>
        ) },
        { header: k("owner"), className: "max-w-[150px]", cell: (p) => <EntityCell detail={p.owner_detail || p.owner} /> },
        { header: k("documents"), accessor: (p) => p.documents_count ?? 0, className: "tabular-nums" },
        { header: k("description"), className: "max-w-[200px]", cell: (p) => <TruncatedText value={p.description} max={40} /> },
        { header: k("created"), sortKey: "created_at", cell: (p) => <DateCell value={p.created_at} withTime={false} /> },
        { header: k("updated"), sortKey: "updated_at", cell: (p) => <DateCell value={p.updated_at} withTime={false} /> },
      ]}
      fields={[
        { name: "title", label: k("name"), type: "text", required: true },
        { name: "description", label: k("description"), type: "textarea" },
      ]}
      deleteConfirm={(p) => ({ entityName: p.title, confirmText: p.title, consequences: k("deleteConsequences") })}
    />
  );
}

export default GlobalProjects;
