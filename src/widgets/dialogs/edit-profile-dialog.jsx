import React, { useState, useEffect } from "react";
import { UserCircleIcon, LockClosedIcon } from "@heroicons/react/24/solid";
import { EyeIcon, EyeSlashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import authService from "@/services/authService";

/* ── Design tokens ── */
const INPUT = {
  background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  padding: "11px 14px",
  fontSize: 13,
  color: "var(--lt-f1f5f9, #F1F5F9)",
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
  boxSizing: "border-box",
};
const INPUT_DISABLED = {
  ...INPUT,
  background: "var(--lt-rgba-255-255-255-0-02, rgba(255,255,255,0.02))",
  border: "1px solid rgba(255,255,255,0.06)",
  color: "var(--lt-475569, #475569)",
  cursor: "not-allowed",
};
const focusIn  = (e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.background = "rgba(99,102,241,0.06)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; };
const focusOut = (e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.boxShadow = "none"; };
const LBL = { fontSize: 11, fontWeight: 700, color: "var(--lt-94a3b8, #94A3B8)", display: "block", marginBottom: 6, letterSpacing: "0.03em" };

function Spin() {
  return <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--lt-rgba-255-255-255-0-25, rgba(255,255,255,0.25))", borderTopColor: "#fff", flexShrink: 0 }} className="animate-spin" />;
}

const ROLE_META = {
  owner:    { label: "Owner",    color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  admin:    { label: "Admin",    color: "#818CF8", bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.25)" },
  manager:  { label: "Manager",  color: "#38BDF8", bg: "rgba(56,189,248,0.1)",  border: "rgba(56,189,248,0.25)" },
  trainer:  { label: "Trainer",  color: "#A78BFA", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)" },
  employee: { label: "Employee", color: "#34D399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)" },
  auditor:  { label: "Auditor",  color: "#94A3B8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)" },
};

export function EditProfileDialog({ open, handler }) {
  const { user, updateUser, companyRole, companies } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("profile");

  const [profileData, setProfileData] = useState({ first_name: "", last_name: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [passwordData, setPasswordData] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (user && open) {
      setProfileData({ first_name: user.first_name || "", last_name: user.last_name || "" });
      setProfileError(""); setProfileSuccess("");
      setPasswordData({ old_password: "", new_password: "", confirm_password: "" });
      setPasswordError(""); setPasswordSuccess("");
      setActiveTab("profile");

    }
  }, [user, open]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async () => {
    setProfileError(""); setProfileSuccess(""); setProfileLoading(true);
    try {
      await updateUser(profileData);
      setProfileSuccess(language === "es" ? "Perfil actualizado correctamente" : "Profile updated successfully");
    } catch (err) {
      console.error("Failed to update profile", err);
      setProfileError(err.error || err.detail || (language === "es" ? "Error al actualizar perfil" : "Failed to update profile"));
    } finally { setProfileLoading(false); }
  };

  const handlePasswordSubmit = async () => {
    setPasswordError(""); setPasswordSuccess("");
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError(t("auth.passwords_dont_match") || (language === "es" ? "Las contraseñas no coinciden" : "Passwords do not match"));
      return;
    }
    if (!passwordData.old_password || !passwordData.new_password) {
      setPasswordError(language === "es" ? "Por favor completa todos los campos" : "Please fill all fields");
      return;
    }
    setPasswordLoading(true);
    try {
      await authService.changePassword({ old_password: passwordData.old_password, new_password: passwordData.new_password });
      setPasswordSuccess(language === "es" ? "Contraseña cambiada correctamente" : "Password changed successfully");
      setPasswordData({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      console.error("Failed to change password", err);
      setPasswordError(err.detail || err.error || (language === "es" ? "Error al cambiar contraseña" : "Failed to change password"));
    } finally { setPasswordLoading(false); }
  };

  if (!open) return null;

  const tabs = [
    { value: "profile",  label: language === "es" ? "Datos Personales" : "Personal Info",    icon: UserCircleIcon },
    { value: "password", label: language === "es" ? "Cambiar Contraseña" : "Change Password", icon: LockClosedIcon },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "var(--lt-rgba-0-0-0-0-75, rgba(0,0,0,0.75))", backdropFilter: "blur(6px)" }}
      onClick={handler}>

      <div style={{ background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 22, width: "100%", maxWidth: 480, boxShadow: "0 40px 100px var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7))", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Top accent strip */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #6366F1, #818CF8, #A78BFA)", flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg, #6366F1, #818CF8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(99,102,241,0.4)", flexShrink: 0 }}>
              <UserCircleIcon style={{ width: 20, height: 20, color: "#fff" }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", letterSpacing: "-0.01em", marginBottom: 2 }}>
                {language === "es" ? "Editar Perfil" : "Edit Profile"}
              </p>
              <p style={{ fontSize: 11, color: "#64748B" }}>
                {language === "es" ? "Actualiza tu información personal y seguridad." : "Update your personal information and security."}
              </p>
            </div>
          </div>
          <button onClick={handler}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lt-475569, #475569)", padding: 6, borderRadius: 8, display: "flex", flexShrink: 0, transition: "color 0.15s, background 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#94A3B8"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.background = "none"; }}>
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "14px 24px 0", flexShrink: 0 }}>
          {tabs.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => setActiveTab(value)}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.15s",
                background: activeTab === value ? "rgba(99,102,241,0.15)" : "none",
                color: activeTab === value ? "#818CF8" : "#64748B",
                boxShadow: activeTab === value ? "inset 0 0 0 1px rgba(99,102,241,0.3)" : "none",
              }}>
              <Icon style={{ width: 14, height: 14 }} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 24px" }}>

          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {profileError && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 9, padding: "10px 14px" }}>
                  <p style={{ fontSize: 12, color: "#FCA5A5" }}>{profileError}</p>
                </div>
              )}
              {profileSuccess && (
                <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.22)", borderRadius: 9, padding: "10px 14px" }}>
                  <p style={{ fontSize: 12, color: "var(--lt-4ade80, #4ADE80)" }}>{profileSuccess}</p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={LBL}>{t("global.pages.users.fields.first_name") || (language === "es" ? "Nombre" : "First Name")}</label>
                  <input style={INPUT} placeholder="John" name="first_name" value={profileData.first_name} onChange={handleProfileChange} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={LBL}>{t("global.pages.users.fields.last_name") || (language === "es" ? "Apellidos" : "Last Name")}</label>
                  <input style={INPUT} placeholder="Doe" name="last_name" value={profileData.last_name} onChange={handleProfileChange} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>

              <div>
                <label style={LBL}>{t("global.pages.users.fields.email") || "Email"}</label>
                <input style={INPUT_DISABLED} type="email" value={user?.email || ""} disabled />
                <p style={{ fontSize: 10, color: "var(--lt-334155, #334155)", marginTop: 5, fontStyle: "italic" }}>
                  {language === "es" ? "El correo no se puede modificar" : "Email cannot be changed"}
                </p>
              </div>

              {/* Role card */}
              {companyRole && (() => {
                const meta = ROLE_META[companyRole] || { label: companyRole, color: "#94A3B8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)" };
                const company = companies?.[0];
                return (
                  <div style={{ borderRadius: 14, background: meta.bg, border: `1px solid ${meta.border}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${meta.color}20`, border: `1px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg style={{ width: 18, height: 18, color: meta.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
                        {language === "es" ? "Rol en empresa" : "Company Role"}
                      </p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1 }}>
                        {meta.label}
                      </p>
                      {company?.name && (
                        <p style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>{company.name}</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Save button */}
              <button onClick={handleProfileSubmit} disabled={profileLoading}
                style={{ position: "relative", width: "100%", padding: "12px", borderRadius: 11, border: "none", background: profileLoading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366F1, #818CF8)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: profileLoading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden", boxShadow: profileLoading ? "none" : "0 4px 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)", transition: "all 0.2s" }}
                onMouseEnter={(e) => { if (!profileLoading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = !profileLoading ? "0 4px 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" : "none"; }}>
                <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1)) 0%, transparent 55%)", pointerEvents: "none", borderRadius: 11 }} />
                <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {profileLoading ? <><Spin /> {language === "es" ? "Guardando..." : "Saving..."}</> : (t("global.crud.save") || (language === "es" ? "Guardar Cambios" : "Save Changes"))}
                </span>
              </button>
            </div>
          )}

          {/* ── PASSWORD TAB ── */}
          {activeTab === "password" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {passwordError && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 9, padding: "10px 14px" }}>
                  <p style={{ fontSize: 12, color: "#FCA5A5" }}>{passwordError}</p>
                </div>
              )}
              {passwordSuccess && (
                <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.22)", borderRadius: 9, padding: "10px 14px" }}>
                  <p style={{ fontSize: 12, color: "var(--lt-4ade80, #4ADE80)" }}>{passwordSuccess}</p>
                </div>
              )}

              {[
                { label: language === "es" ? "Contraseña Actual"  : "Current Password", name: "old_password",      show: showOldPassword,      setShow: setShowOldPassword },
                { label: language === "es" ? "Nueva Contraseña"   : "New Password",     name: "new_password",      show: showNewPassword,      setShow: setShowNewPassword },
                { label: language === "es" ? "Confirmar Nueva"    : "Confirm New",      name: "confirm_password",  show: showConfirmPassword,  setShow: setShowConfirmPassword },
              ].map(({ label, name, show, setShow }) => (
                <div key={name}>
                  <label style={LBL}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <input type={show ? "text" : "password"} placeholder="••••••••" name={name}
                      value={passwordData[name]} onChange={handlePasswordChange}
                      style={{ ...INPUT, paddingRight: 46 }} onFocus={focusIn} onBlur={focusOut} />
                    <button type="button" tabIndex={-1} onClick={() => setShow(!show)}
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--lt-475569, #475569)", display: "flex", padding: 4, transition: "color 0.15s" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "#94A3B8"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "#475569"}>
                      {show ? <EyeSlashIcon style={{ width: 17, height: 17 }} /> : <EyeIcon style={{ width: 17, height: 17 }} />}
                    </button>
                  </div>
                  {name === "confirm_password" && passwordData.confirm_password && passwordData.new_password && passwordData.confirm_password !== passwordData.new_password && (
                    <p style={{ fontSize: 10, color: "var(--lt-f87171, #F87171)", marginTop: 5 }}>
                      {language === "es" ? "Las contraseñas no coinciden" : "Passwords must match"}
                    </p>
                  )}
                </div>
              ))}

              <button onClick={handlePasswordSubmit} disabled={passwordLoading}
                style={{ position: "relative", width: "100%", padding: "12px", borderRadius: 11, border: "none", background: passwordLoading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366F1, #818CF8)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: passwordLoading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden", boxShadow: passwordLoading ? "none" : "0 4px 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)", transition: "all 0.2s" }}
                onMouseEnter={(e) => { if (!passwordLoading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = !passwordLoading ? "0 4px 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" : "none"; }}>
                <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1)) 0%, transparent 55%)", pointerEvents: "none", borderRadius: 11 }} />
                <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {passwordLoading ? <><Spin /> {language === "es" ? "Cambiando..." : "Changing..."}</> : (language === "es" ? "Cambiar Contraseña" : "Change Password")}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px 20px", borderTop: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", flexShrink: 0 }}>
          <button onClick={handler}
            style={{ width: "100%", padding: "10px", borderRadius: 10, background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#94A3B8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#64748B"; }}>
            {t("global.crud.cancel") || (language === "es" ? "Cerrar" : "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditProfileDialog;
