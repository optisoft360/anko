// UNUSED-CLEANUP (2026-10-11): página sin ruta (su endpoint del backend está comentado). Borrar junto con el modelo.
import React from "react";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";

export function GlobalSavedDecks() {
    const { t } = useLanguage();
    return (
        <GlobalCrudPage
            title={t("global.pages.saved-decks.title")}
            resource="admin/saved-decks"
            disableCreate
            columns={[
                { header: t("global.pages.saved-decks.columns.user"), accessor: "user" },
                { header: t("global.pages.saved-decks.columns.deck"), accessor: "deck" },
                { header: t("global.pages.saved-decks.columns.saved_at"), accessor: "saved_at" },
            ]}
            fields={[
                {
                    name: "user",
                    label: t("global.pages.saved-decks.fields.user"),
                    type: "select-resource",
                    resource: "users",
                    labelAccessor: "email",
                    valueAccessor: "id"
                },
                {
                    name: "deck",
                    label: t("global.pages.saved-decks.fields.deck"),
                    type: "select-resource",
                    resource: "decks",
                    labelAccessor: "name",
                    valueAccessor: "id"
                },
            ]}
        />
    );
}

export default GlobalSavedDecks;
