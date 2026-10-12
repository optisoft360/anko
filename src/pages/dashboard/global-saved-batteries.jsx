// UNUSED-CLEANUP (2026-10-11): página sin ruta (su endpoint del backend está comentado). Borrar junto con el modelo.
import React from "react";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";

export function GlobalSavedBatteries() {
    const { t } = useLanguage();
    return (
        <GlobalCrudPage
            title={t("global.pages.saved-batteries.title")}
            resource="admin/saved-batteries"
            disableCreate
            columns={[
                { header: t("global.pages.saved-batteries.columns.user"), accessor: "user" },
                { header: t("global.pages.saved-batteries.columns.battery"), accessor: "battery" },
                { header: t("global.pages.saved-batteries.columns.saved_at"), accessor: "saved_at" },
            ]}
            fields={[
                {
                    name: "user",
                    label: t("global.pages.saved-batteries.fields.user"),
                    type: "select-resource",
                    resource: "users",
                    labelAccessor: "email",
                    valueAccessor: "id"
                },
                {
                    name: "battery",
                    label: t("global.pages.saved-batteries.fields.battery"),
                    type: "select-resource",
                    resource: "batteries",
                    labelAccessor: "name",
                    valueAccessor: "id"
                },
            ]}
        />
    );
}

export default GlobalSavedBatteries;
