import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import { ChartBarIcon, BuildingOffice2Icon, TrashIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { UserStatisticsDialog } from "@/widgets/dialogs/user-statistics-dialog";
import { useState } from "react";
import projectService from "@/services/projectService";

const COMPANY_ROLES = ["owner", "admin", "manager", "trainer", "employee", "auditor"];

function CompanyMembershipsDialog({ user, onClose }) {
    const { language } = useLanguage();
    const [memberships, setMemberships] = useState(user?.company_memberships || []);
    const [savingId, setSavingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    if (!user) return null;

    const handleRoleChange = async (membershipId, role) => {
        setSavingId(membershipId);
        try {
            await projectService.updateItem("company-memberships", membershipId, { role });
            setMemberships((prev) => prev.map((m) => (m.id === membershipId ? { ...m, role } : m)));
        } catch (err) {
            console.error("Failed to update company membership role", err);
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (membershipId) => {
        setDeletingId(membershipId);
        try {
            await projectService.deleteItem("company-memberships", membershipId);
            setMemberships((prev) => prev.filter((m) => m.id !== membershipId));
        } catch (err) {
            console.error("Failed to delete company membership", err);
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--lt-rgba-0-0-0-0-6, rgba(0,0,0,0.6))" }} onClick={onClose}>
            <div
                style={{ width: "100%", maxWidth: 480, background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7))" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ height: 2, background: "linear-gradient(90deg, #6366F1, #818CF8, #A78BFA)" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" }}>
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)" }}>
                            {language === "es" ? "Roles por empresa" : "Company roles"}
                        </p>
                        <p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{user.username} — {user.email}</p>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 4 }}>
                        <XMarkIcon style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                <div style={{ padding: "14px 20px 20px", maxHeight: 400, overflowY: "auto" }}>
                    {memberships.length === 0 && (
                        <p style={{ fontSize: 12, color: "var(--lt-475569, #475569)", textAlign: "center", padding: "24px 0" }}>
                            {language === "es" ? "Este usuario no pertenece a ninguna empresa." : "This user doesn't belong to any company."}
                        </p>
                    )}

                    {memberships.map((m) => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--lt-e2e8f0, #E2E8F0)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {m.company_name}
                                </p>
                                <p style={{ fontSize: 10, color: "var(--lt-475569, #475569)" }}>{m.status}</p>
                            </div>

                            <select
                                value={m.role}
                                disabled={savingId === m.id}
                                onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                style={{ background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", border: "1px solid var(--lt-rgba-255-255-255-0-12, rgba(255,255,255,0.12))", borderRadius: 8, padding: "6px 8px", fontSize: 12, color: "var(--lt-f1f5f9, #F1F5F9)", outline: "none", cursor: "pointer" }}
                            >
                                {COMPANY_ROLES.map((r) => (
                                    <option key={r} value={r} style={{ background: "var(--lt-0f172a, #0F172A)" }}>{r}</option>
                                ))}
                            </select>

                            {confirmDeleteId === m.id ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <button
                                        onClick={() => handleDelete(m.id)}
                                        disabled={deletingId === m.id}
                                        style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#EF4444", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}
                                    >
                                        {language === "es" ? "Confirmar" : "Confirm"}
                                    </button>
                                    <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        style={{ fontSize: 11, color: "var(--lt-94a3b8, #94A3B8)", background: "none", border: "none", cursor: "pointer", padding: "6px 4px" }}
                                    >
                                        {language === "es" ? "Cancelar" : "Cancel"}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirmDeleteId(m.id)}
                                    title={language === "es" ? "Eliminar membresía" : "Remove membership"}
                                    style={{ width: 28, height: 28, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", flexShrink: 0 }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#F87171"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#64748B"; }}
                                >
                                    <TrashIcon style={{ width: 13, height: 13 }} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function GlobalUsers() {
    const { t, language } = useLanguage();
    const [selectedUser, setSelectedUser] = useState(null);
    const [openStats, setOpenStats] = useState(false);
    const [membershipsUser, setMembershipsUser] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <>
            <GlobalCrudPage
                key={refreshKey}
                title={t("global.pages.users.title")}
                editTitle={language === "es" ? "Editar Usuario" : "Edit User"}
                createTitle={language === "es" ? "Crear Usuario" : "Create User"}
                resource="users"
                columns={[
                    { header: t("global.pages.users.columns.username"), accessor: "username" },
                    { header: t("global.pages.users.columns.email"), accessor: "email" },
                    { header: t("global.pages.users.columns.first_name"), accessor: "first_name" },
                    { header: t("global.pages.users.columns.last_name"), accessor: "last_name" },
                    {
                        header: t("global.pages.users.columns.is_active"),
                        accessor: (item) => item.is_active ? "✅" : "❌"
                    },
                    {
                        header: t("global.pages.users.columns.is_staff"),
                        accessor: (item) => item.is_staff ? "⭐" : ""
                    },
                    {
                        header: t("global.pages.users.columns.roles"),
                        accessor: (item) => {
                            if (Array.isArray(item.roles)) {
                                return item.roles.map(r => typeof r === 'object' ? r.name : r).join(", ");
                            }
                            return "-";
                        }
                    },
                    {
                        header: language === "es" ? "Roles por empresa" : "Company roles",
                        accessor: (item) => {
                            if (Array.isArray(item.company_memberships) && item.company_memberships.length > 0) {
                                return item.company_memberships
                                    .map((m) => `${m.company_name}: ${m.role}`)
                                    .join(", ");
                            }
                            return "-";
                        }
                    },
                ]}
                fields={[
                    { name: "username", label: t("global.pages.users.fields.username"), type: "text", excludeOnUpdate: true },
                    { name: "email", label: t("global.pages.users.fields.email"), type: "email" },
                    { name: "first_name", label: t("global.pages.users.fields.first_name"), type: "text" },
                    { name: "last_name", label: t("global.pages.users.fields.last_name"), type: "text" },
                    { name: "is_active", label: t("global.pages.users.fields.is_active"), type: "boolean" },
                    { name: "is_staff", label: t("global.pages.users.fields.is_staff"), type: "boolean" },
                    {
                        name: "roles",
                        label: t("global.pages.users.fields.roles"),
                        type: "select-resource",
                        resource: "roles",
                        labelAccessor: "name",
                        valueAccessor: "id",
                        multiple: true
                    },
                    { name: "avatar", label: t("global.pages.users.fields.avatar"), type: "text", excludeOnUpdate: true },
                    { name: "password", label: t("global.pages.users.fields.password"), type: "password", excludeOnUpdate: true },
                ]}
                extraActions={(item) => (
                    <>
                        <button
                            onClick={() => setMembershipsUser(item)}
                            title={language === "es" ? "Roles por empresa" : "Company roles"}
                            style={{ width: 30, height: 30, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", transition: "all 0.15s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; e.currentTarget.style.color = "#818CF8"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#64748B"; }}>
                            <BuildingOffice2Icon style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                            onClick={() => { setSelectedUser(item); setOpenStats(true); }}
                            title="Statistics"
                            style={{ width: 30, height: 30, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", transition: "all 0.15s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; e.currentTarget.style.color = "#818CF8"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#64748B"; }}>
                            <ChartBarIcon style={{ width: 14, height: 14 }} />
                        </button>
                    </>
                )}
            />

            <UserStatisticsDialog
                open={openStats}
                handler={() => setOpenStats(false)}
                userId={selectedUser?.id}
            />

            {membershipsUser && (
                <CompanyMembershipsDialog
                    user={membershipsUser}
                    onClose={() => { setMembershipsUser(null); setRefreshKey((k) => k + 1); }}
                />
            )}
        </>
    );
}

export default GlobalUsers;
