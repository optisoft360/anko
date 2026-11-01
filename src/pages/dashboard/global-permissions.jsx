import React from "react";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import { StatusBadge } from "@/widgets/admin/cells";

// The `code` field is empty for nearly every permission and nothing reads it: no column for it.
export function GlobalPermissions() {
  const { t } = useLanguage();
  const k = (key) => t(`admin.pages.permissions.${key}`);
  const actions = { view: t("admin.roles.actions.view"), manage: t("admin.roles.actions.manage") };
  return (
    <GlobalCrudPage
      title={t("global.pages.permissions.title")}
      subtitle={k("subtitle")}
      resource="permissions"
      searchable
      searchPlaceholder={k("search")}
      filters={[{ name: "action", label: k("action"), options: Object.entries(actions).map(([value, label]) => ({ value, label })) }]}
      columns={[
        { header: k("resource"), sortKey: "resource__key", cell: (p) => <span className="font-mono text-xs text-[#334155]">{p.resourceKey || `#${p.resource}`}</span> },
        { header: k("action"), sortKey: "action", cell: (p) => <StatusBadge value={p.action} tones={{ view: "sky", manage: "violet" }} labels={actions} /> },
      ]}
      fields={[
        { name: "resource", label: k("resource"), type: "select-resource", resource: "resources", labelAccessor: "key", valueAccessor: "id", required: true },
        { name: "action", label: k("action"), type: "select", options: Object.entries(actions).map(([value, label]) => ({ value, label })), required: true },
      ]}
      deleteConfirm={(p) => ({ entityName: `${p.resourceKey} · ${p.action}`, consequences: k("deleteConsequences") })}
    />
  );
}

export default GlobalPermissions;
