import React from "react";
import { useNavigate } from "react-router-dom";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import { DateCell, EntityCell, StatusBadge, TruncatedText } from "@/widgets/admin/cells";

export function GlobalDecks() {
  const { t } = useLanguage();
  const k = (key) => t(`admin.pages.decks.${key}`);
  const navigate = useNavigate();
  const visibility = { private: t("admin.visibility.private"), shared: t("admin.visibility.shared"), public: t("admin.visibility.public") };
  return (
    <GlobalCrudPage
      title={t("global.pages.decks.title")}
      subtitle={k("subtitle")}
      resource="admin/decks"
      disableCreate
      searchable
      filters={[
        { name: "visibility", label: k("visibility"), options: Object.entries(visibility).map(([value, label]) => ({ value, label })) },
        { name: "project", label: k("project"), hidden: true },
      ]}
      onRowClick={(d) => navigate(`/dashboard/flashcards?deck=${d.id}`)}
      columns={[
        { header: k("title"), sortKey: "title", cell: (d) => <span className="font-medium text-[#0F172A]">{d.title}</span> },
        { header: k("cards"), sortKey: "card_count", accessor: (d) => d.cards_count ?? d.cardsCount ?? 0, className: "tabular-nums" },
        { header: k("project"), cell: (d) => <EntityCell detail={d.project_detail} id={d.project} /> },
        { header: k("owner"), cell: (d) => <EntityCell detail={d.owner_detail} id={d.ownerId} /> },
        { header: k("visibility"), cell: (d) => <StatusBadge value={d.visibility} tones={{ public: "sky", shared: "violet", private: "slate" }} labels={visibility} /> },
        { header: k("description"), cell: (d) => <TruncatedText value={d.description} max={60} /> },
        { header: k("created"), sortKey: "created_at", cell: (d) => <DateCell value={d.created_at} withTime={false} /> },
      ]}
      fields={[
        { name: "title", label: k("title"), type: "text", required: true },
        { name: "description", label: k("description"), type: "textarea" },
        { name: "visibility", label: k("visibility"), type: "select", options: Object.entries(visibility).map(([value, label]) => ({ value, label })) },
      ]}
      deleteConfirm={(d) => ({ entityName: d.title, consequences: k("deleteConsequences") })}
    />
  );
}

export default GlobalDecks;
