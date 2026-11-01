import React from "react";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import { DateCell, EntityCell, TruncatedText } from "@/widgets/admin/cells";

export function GlobalFlashcards() {
  const { t } = useLanguage();
  const k = (key) => t(`admin.pages.flashcards.${key}`);
  return (
    <GlobalCrudPage
      title={t("global.pages.flashcards.title")}
      subtitle={k("subtitle")}
      resource="admin/flashcards"
      disableCreate
      searchable
      searchPlaceholder={k("search")}
      filters={[{ name: "deck", label: k("deck"), hidden: true }]}
      columns={[
        { header: k("front"), cell: (c) => <TruncatedText value={c.front} max={90} /> },
        { header: k("back"), cell: (c) => <TruncatedText value={c.back} max={90} /> },
        { header: k("deck"), cell: (c) => <EntityCell detail={c.deck_detail} id={c.deck} to={c.deck ? `/dashboard/flashcards?deck=${c.deck}` : undefined} /> },
        { header: k("created"), sortKey: "created_at", cell: (c) => <DateCell value={c.created_at} withTime={false} /> },
      ]}
      fields={[
        { name: "front", label: k("front"), type: "textarea", required: true },
        { name: "back", label: k("back"), type: "textarea", required: true },
      ]}
    />
  );
}

export default GlobalFlashcards;
