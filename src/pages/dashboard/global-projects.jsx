import React from "react";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import { DateCell, EntityCell } from "@/widgets/admin/cells";
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
        // Narrow screens drop Documents and Description (the name's tooltip carries the description).
        { header: k("name"), sortKey: "title", maxWidth: "max-w-[230px]", cell: (p) => (
          <span className="flex min-w-0 items-center gap-1.5" title={[p.title, p.description].filter(Boolean).join(" — ")}>
            <span className="truncate font-medium text-[#0F172A]">{p.title}</span>
            {p.archived && <Badge tone="amber">{k("archived")}</Badge>}
          </span>
        ) },
        { header: k("owner"), maxWidth: "max-w-[150px]", cell: (p) => <EntityCell detail={p.owner_detail || p.owner} /> },
        { header: k("documents"), className: "hidden tabular-nums min-[1100px]:table-cell", accessor: (p) => p.documents_count ?? 0 },
        { header: k("description"), className: "hidden min-[1360px]:table-cell", maxWidth: "max-w-[200px]",
          cell: (p) => <span className="line-clamp-2" title={p.description}>{p.description || "—"}</span> },
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
