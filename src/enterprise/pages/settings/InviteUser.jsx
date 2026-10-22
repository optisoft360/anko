import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  UserIcon,
  ArrowLeftIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "@/context/auth-context";
import { useEnterprise } from "@/enterprise/context/enterprise-context";
import { useLanguage } from "../../../context/language-context";
import api from "@/services/api";
import invitationsService from "@/services/invitationsService";

const AVATAR_COLORS = ["#6366F1","#818CF8","#38BDF8","#A78BFA","#34D399","#F59E0B","#F87171","#FB923C"];

function useRoles() {
  const { t } = useLanguage();
  return [
    { value: "admin",    label: t("enterprise.settings.inviteUser.roles.admin"),    color: "#818CF8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.28)" },
    { value: "manager",  label: t("enterprise.settings.inviteUser.roles.manager"),  color: "#38BDF8", bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.28)"  },
    { value: "trainer",  label: t("enterprise.settings.inviteUser.roles.trainer"),  color: "#A78BFA", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.28)" },
    { value: "employee", label: t("enterprise.settings.inviteUser.roles.employee"), color: "#34D399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.28)"  },
    { value: "auditor",  label: t("enterprise.settings.inviteUser.roles.auditor"),  color: "#94A3B8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.22)" },
    { value: "owner",    label: t("enterprise.settings.inviteUser.roles.owner"),    color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.28)"  },
  ];
}

function useStages() {
  const { t } = useLanguage();
  return [
    { value: "candidate",       label: t("enterprise.settings.company.stages.candidate") },
    { value: "onboarding",      label: t("enterprise.settings.company.stages.onboarding") },
    { value: "trainee",         label: t("enterprise.settings.company.stages.trainee") },
    { value: "active_employee", label: t("enterprise.settings.company.stages.activeEmployee") },
    { value: "contractor",      label: t("enterprise.settings.company.stages.contractor") },
    { value: "former_employee", label: t("enterprise.settings.company.stages.formerEmployee") },
  ];
}

function UserAvatar({ user, size = 40 }) {
  const initials = [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join("").toUpperCase()
    || user.username?.[0]?.toUpperCase() || "?";
  const color = AVATAR_COLORS[(user.id || 0) % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      background: `${color}18`, border: `1.5px solid ${color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.38), fontWeight: 800, color, flexShrink: 0,
      letterSpacing: "-0.02em",
    }}>
      {initials}
    </div>
  );
}

function displayName(u) {
  if (u.first_name || u.last_name) return `${u.first_name || ""} ${u.last_name || ""}`.trim();
  return u.username;
}

export default function InviteUser() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  // Only platform admins may browse the platform-wide user directory (/api/users/).
  const { isAdmin } = useAuth();
  // The company selected in the enterprise area (same as Settings / Invitations), not the first one.
  const { activeCompany: company, activeCompanyId: companyId } = useEnterprise();
  const ROLES = useRoles();
  const STAGES = useStages();

  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [members, setMembers]   = useState([]);
  const searchTimer             = useRef(null);

  const [selectedUser, setSelectedUser] = useState(null);
  const [email, setEmail]       = useState("");
  const [role, setRole]         = useState("employee");
  const [stage, setStage]       = useState("onboarding");

  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [sendError, setSendError] = useState("");

  /* load existing members to exclude from search */
  useEffect(() => {
    if (!companyId) return;
    api.get(`/enterprise/companies/${companyId}/members/`)
      .then(r => setMembers(Array.isArray(r.data) ? r.data : (r.data?.results ?? [])))
      .catch(() => {});
  }, [companyId]);

  /* debounced user search */
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!query.trim()) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/users/?search=${encodeURIComponent(query)}&page_size=8`);
        const memberEmails = new Set(members.map(m => m.email));
        setResults((res.data.results || []).filter(u => !memberEmails.has(u.email)));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 320);
    return () => clearTimeout(searchTimer.current);
  }, [query, members]);

  const selectUser = (u) => {
    setSelectedUser(u);
    setEmail(u.email);
    setQuery("");
    setResults([]);
    setSendError("");
  };

  const clearTarget = () => { setSelectedUser(null); setEmail(""); setSendError(""); };

  const activeEmail = email.trim();

  const handleSend = async () => {
    if (!activeEmail || !companyId) return;
    setSending(true);
    setSendError("");
    try {
      await invitationsService.send(companyId, { email: activeEmail, role, employee_stage: stage });
      setSentEmail(activeEmail);
      setSent(true);
    } catch (err) {
      const detail = err?.email?.[0] || err?.detail || t("enterprise.settings.inviteUser.sendFailed");
      setSendError(detail);
    } finally {
      setSending(false);
    }
  };

  const handleAgain = () => {
    setSent(false); setSentEmail(""); setEmail(""); setSelectedUser(null);
    setSendError(""); setRole("employee"); setStage("onboarding");
  };

  const selectedRole = ROLES.find(r => r.value === role);

  /* ── SUCCESS STATE ─────────────────────────────────────────────────── */
  if (sent) {
    return (
      <div style={{ maxWidth: 460, margin: "52px auto", padding: "0 16px" }}>
        <div style={{
          background: "var(--lt-0f172a, #0F172A)",
          border: "1px solid rgba(52,211,153,0.22)",
          borderRadius: 22, padding: "52px 40px",
          boxShadow: "0 0 60px rgba(52,211,153,0.05), 0 20px 40px var(--lt-rgba-0-0-0-0-3, rgba(0,0,0,0.3))",
          textAlign: "center",
        }}>
          {/* checkmark icon */}
          <div style={{
            width: 68, height: 68, borderRadius: 20, margin: "0 auto 28px",
            background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CheckCircleIcon style={{ width: 34, height: 34, color: "#34D399" }} />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", margin: "0 0 10px", letterSpacing: "-0.01em" }}>
            {t("enterprise.settings.inviteUser.sentTitle")}
          </h2>
          <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 32px", lineHeight: 1.5 }}>
            {t("enterprise.settings.inviteUser.sentSubtitle")}
          </p>

          {/* prominent email display */}
          <div style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.22)",
            borderRadius: 14, padding: "16px 22px", marginBottom: 32,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <EnvelopeIcon style={{ width: 18, height: 18, color: "var(--lt-818cf8, #818CF8)", flexShrink: 0 }} />
            <span style={{
              fontSize: 15, fontWeight: 800, color: "var(--lt-818cf8, #818CF8)",
              wordBreak: "break-all", letterSpacing: "-0.01em",
            }}>
              {sentEmail}
            </span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleAgain}
              style={{
                flex: 1, padding: 13, borderRadius: 11,
                background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.22)",
                color: "var(--lt-818cf8, #818CF8)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                transition: "all 150ms",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(99,102,241,0.1)"}
            >
              {t("enterprise.settings.inviteUser.inviteAnother")}
            </button>
            <button
              onClick={() => navigate("/enterprise/invitations")}
              style={{
                flex: 1, padding: 13, borderRadius: 11,
                background: "linear-gradient(135deg, #6366F1, #818CF8)",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
              }}
            >
              {t("enterprise.settings.inviteUser.viewInvitations")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── MAIN FORM ─────────────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 940, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
        <button
          onClick={() => navigate("/enterprise/invitations")}
          style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: "var(--lt-rgba-255-255-255-0-03, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--lt-94a3b8, #94A3B8)", transition: "all 150ms",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))"; e.currentTarget.style.color = "var(--lt-f1f5f9, #F1F5F9)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-03, rgba(255,255,255,0.03))"; e.currentTarget.style.color = "var(--lt-94a3b8, #94A3B8)"; }}
        >
          <ArrowLeftIcon style={{ width: 16, height: 16 }} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", margin: 0, letterSpacing: "-0.01em" }}>
            {t("enterprise.settings.inviteUser.title")}
          </h1>
          {company?.company_name && (
            <p style={{ fontSize: 13, color: "#64748B", margin: "3px 0 0" }}>
              {t("enterprise.settings.inviteUser.sendingTo")} · <span style={{ color: "var(--lt-94a3b8, #94A3B8)", fontWeight: 600 }}>{company.company_name}</span>
            </p>
          )}
        </div>
      </div>

      {/* Two-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 18, alignItems: "start" }}>

        {/* ── LEFT: Search panel ───────────────────────────── */}
        <div style={{
          background: "var(--lt-0f172a, #0F172A)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 18, overflow: "hidden",
        }}>
          {isAdmin && (
            <>
          {/* Search input */}
          <div style={{ padding: "22px 22px 16px" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>
              {t("enterprise.settings.inviteUser.findOnPlatform")}
            </p>
            <div style={{ position: "relative" }}>
              <MagnifyingGlassIcon style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                width: 15, height: 15, color: "#64748B", pointerEvents: "none",
              }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t("enterprise.settings.inviteUser.searchPlaceholder")}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 12px 10px 36px", borderRadius: 10,
                  background: "var(--lt-1e293b, #1E293B)", border: "1px solid rgba(255,255,255,0.07)",
                  color: "var(--lt-f1f5f9, #F1F5F9)", fontSize: 13, outline: "none",
                  transition: "border-color 150ms",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                onBlur={e => e.target.style.borderColor = "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))"}
              />
            </div>
          </div>

          {/* Results list */}
          <div style={{ minHeight: 180, maxHeight: 320, overflowY: "auto" }}>
            {searching ? (
              <div style={{ padding: "28px 0", textAlign: "center", color: "#64748B", fontSize: 13 }}>
                {t("enterprise.settings.inviteUser.searching")}
              </div>
            ) : results.length > 0 ? (
              <div>
                {results.map(u => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u)}
                    style={{
                      width: "100%", textAlign: "left", padding: "10px 22px",
                      background: "transparent", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12,
                      transition: "background 150ms",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.07)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <UserAvatar user={u} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--lt-f1f5f9, #F1F5F9)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {displayName(u)}
                      </p>
                      <p style={{ fontSize: 11, color: "#64748B", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.email}
                      </p>
                    </div>
                    <EnvelopeIcon style={{ width: 12, height: 12, color: "var(--lt-334155, #334155)", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            ) : query.trim() ? (
              <div style={{ padding: "28px 0", textAlign: "center" }}>
                <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>{t("enterprise.settings.inviteUser.noUsersFound", { query })}</p>
              </div>
            ) : (
              <div style={{ padding: "28px 22px", textAlign: "center" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "var(--lt-rgba-255-255-255-0-03, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px",
                }}>
                  <UserIcon style={{ width: 20, height: 20, color: "var(--lt-334155, #334155)" }} />
                </div>
                <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
                  {t("enterprise.settings.inviteUser.typeToSearch")}
                </p>
              </div>
            )}
          </div>
            </>
          )}

          {/* Manual email entry */}
          <div style={{ padding: "16px 22px 22px", borderTop: "1px solid var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
              {t("enterprise.settings.inviteUser.orTypeEmail")}
            </p>
            <div style={{ position: "relative" }}>
              <EnvelopeIcon style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                width: 14, height: 14, color: selectedUser ? "var(--lt-818cf8, #818CF8)" : "#64748B", pointerEvents: "none",
              }} />
              <input
                type="email"
                value={selectedUser ? selectedUser.email : email}
                onChange={e => { setSelectedUser(null); setEmail(e.target.value); setSendError(""); }}
                placeholder="name@company.com"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 36px 10px 34px", borderRadius: 10,
                  background: selectedUser ? "rgba(99,102,241,0.08)" : "var(--lt-1e293b, #1E293B)",
                  border: `1px solid ${selectedUser ? "rgba(99,102,241,0.3)" : "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))"}`,
                  color: "var(--lt-f1f5f9, #F1F5F9)", fontSize: 13, outline: "none",
                  transition: "all 150ms",
                }}
                onFocus={e => { if (!selectedUser) e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={e => { if (!selectedUser) e.target.style.borderColor = "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))"; }}
              />
              {(selectedUser || email) && (
                <button
                  onClick={clearTarget}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#64748B", padding: 2, display: "flex",
                  }}
                >
                  <XMarkIcon style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Config + send ─────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Email preview — "where the invitation is sent" */}
          <div style={{
            background: "var(--lt-0f172a, #0F172A)", border: `1px solid ${activeEmail ? "rgba(99,102,241,0.22)" : "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))"}`,
            borderRadius: 18, padding: "22px",
            transition: "border-color 200ms",
            boxShadow: activeEmail ? "0 0 30px rgba(99,102,241,0.06)" : "none",
          }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 16px" }}>
              {t("enterprise.settings.inviteUser.willBeSentTo")}
            </p>

            {selectedUser ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <UserAvatar user={selectedUser} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {displayName(selectedUser)}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                    <EnvelopeIcon style={{ width: 13, height: 13, color: "var(--lt-818cf8, #818CF8)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lt-818cf8, #818CF8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {selectedUser.email}
                    </span>
                  </div>
                </div>
              </div>
            ) : activeEmail ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <EnvelopeIcon style={{ width: 22, height: 22, color: "var(--lt-818cf8, #818CF8)" }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#64748B", margin: "0 0 4px", fontWeight: 600 }}>{t("enterprise.settings.inviteUser.externalUser")}</p>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--lt-818cf8, #818CF8)", wordBreak: "break-all" }}>
                    {activeEmail}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: 0.45 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "var(--lt-1e293b, #1E293B)", border: "1px dashed rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <EnvelopeIcon style={{ width: 22, height: 22, color: "var(--lt-334155, #334155)" }} />
                </div>
                <p style={{ fontSize: 13, color: "var(--lt-334155, #334155)", margin: 0 }}>
                  {t("enterprise.settings.inviteUser.selectOrEnter")}
                </p>
              </div>
            )}
          </div>

          {/* Role selector */}
          <div style={{ background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", borderRadius: 18, padding: "22px" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 14px" }}>
              {t("enterprise.settings.inviteUser.assignRole")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  style={{
                    padding: "11px 8px", borderRadius: 11,
                    background: role === r.value ? r.bg : "var(--lt-rgba-255-255-255-0-02, rgba(255,255,255,0.02))",
                    border: `1px solid ${role === r.value ? r.border : "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))"}`,
                    cursor: "pointer", transition: "all 150ms",
                    textAlign: "center",
                    boxShadow: role === r.value ? `0 2px 12px ${r.color}18` : "none",
                  }}
                  onMouseEnter={e => { if (role !== r.value) e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))"; }}
                  onMouseLeave={e => { if (role !== r.value) e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-02, rgba(255,255,255,0.02))"; }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: role === r.value ? r.color: "#64748B" }}>
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Stage selector */}
          <div style={{ background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", borderRadius: 18, padding: "22px" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 14px" }}>
              {t("enterprise.settings.inviteUser.employeeStage")}
            </p>
            <div style={{ position: "relative" }}>
              <select
                value={stage}
                onChange={e => setStage(e.target.value)}
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 11,
                  background: "var(--lt-1e293b, #1E293B)", border: "1px solid rgba(255,255,255,0.07)",
                  color: "var(--lt-f1f5f9, #F1F5F9)", fontSize: 13, outline: "none", cursor: "pointer",
                  appearance: "none",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.45)"}
                onBlur={e => e.target.style.borderColor = "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))"}
              >
                {STAGES.map(s => (
                  <option key={s.value} value={s.value} style={{ background: "var(--lt-1e293b, #1E293B)" }}>
                    {s.label}
                  </option>
                ))}
              </select>
              <div style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                pointerEvents: "none", color: "#64748B",
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Error */}
          {sendError && (
            <div style={{
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)",
              borderRadius: 11, padding: "12px 16px", fontSize: 13, color: "var(--lt-f87171, #F87171)",
            }}>
              {sendError}
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || !activeEmail}
            style={{
              width: "100%", padding: 15, borderRadius: 13,
              background: activeEmail
                ? "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)"
                : "#1E293B",
              border: "none",
              color: activeEmail ? "#fff" : "var(--lt-334155, #334155)",
              fontSize: 14, fontWeight: 800,
              cursor: activeEmail && !sending ? "pointer" : "not-allowed",
              opacity: sending ? 0.7 : 1, transition: "all 200ms",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
              boxShadow: activeEmail ? "0 6px 24px rgba(99,102,241,0.35)" : "none",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={e => { if (activeEmail && !sending) e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.5)"; }}
            onMouseLeave={e => { if (activeEmail) e.currentTarget.style.boxShadow = "0 6px 24px rgba(99,102,241,0.35)"; }}
          >
            <PaperAirplaneIcon style={{ width: 17, height: 17 }} />
            {sending ? t("enterprise.settings.inviteUser.sending") : t("enterprise.settings.inviteUser.sendInvitation")}
          </button>

          {/* Summary footer */}
          {selectedRole && activeEmail && (
            <p style={{ textAlign: "center", fontSize: 12, color: "#64748B", margin: 0, lineHeight: 1.6 }}>
              {t("enterprise.settings.inviteUser.willJoinAs")}{" "}
              <span style={{ color: selectedRole.color, fontWeight: 700 }}>{selectedRole.label}</span>
              {"  ·  "}
              <span style={{ color: "var(--lt-94a3b8, #94A3B8)" }}>
                {STAGES.find(s => s.value === stage)?.label}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
