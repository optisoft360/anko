import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { UserCircleIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import authService from "@/services/authService";
import { Modal, Field, TextInput, Segmented, Badge, Spinner, TONE, ROLE_TONE, BTN_PRIMARY, BTN_SECONDARY, FOCUS } from "@/enterprise/components/ui/kit";

const ROLE_LABEL = {
  owner:    { en: "Owner",    es: "Propietario" },
  admin:    { en: "Admin",    es: "Administrador" },
  manager:  { en: "Manager",  es: "Manager" },
  trainer:  { en: "Trainer",  es: "Formador" },
  employee: { en: "Employee", es: "Empleado" },
  auditor:  { en: "Auditor",  es: "Auditor" },
};

function Alert({ tone, children }) {
  const Icon = tone === "rose" ? ExclamationCircleIcon : CheckCircleIcon;
  return (
    <div role={tone === "rose" ? "alert" : "status"} className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${TONE[tone].border} ${TONE[tone].soft}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function PasswordInput({ show, onToggle, toggleLabel, ...props }) {
  return (
    <div className="relative">
      <TextInput type={show ? "text" : "password"} placeholder="••••••••" autoComplete="off" className="pr-11" {...props} />
      <button type="button" onClick={onToggle} aria-label={toggleLabel}
        className={`absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-[#94A3B8] transition-colors hover:text-[#475569] ${FOCUS}`}>
        {show ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function EditProfileDialog({ open, handler }) {
  const { user, updateUser, companyRole, companies } = useAuth();
  const { t, language } = useLanguage();
  const es = language === "es";
  const [activeTab, setActiveTab] = useState("profile");

  const [profileData, setProfileData] = useState({ first_name: "", last_name: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [passwordData, setPasswordData] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [show, setShow] = useState({ old_password: false, new_password: false, confirm_password: false });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (user && open) {
      setProfileData({ first_name: user.first_name || "", last_name: user.last_name || "" });
      setProfileError(""); setProfileSuccess("");
      setPasswordData({ old_password: "", new_password: "", confirm_password: "" });
      setShow({ old_password: false, new_password: false, confirm_password: false });
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
      setProfileSuccess(es ? "Perfil actualizado correctamente" : "Profile updated successfully");
    } catch (err) {
      console.error("Failed to update profile", err);
      setProfileError(err.error || err.detail || (es ? "Error al actualizar perfil" : "Failed to update profile"));
    } finally { setProfileLoading(false); }
  };

  const handlePasswordSubmit = async () => {
    setPasswordError(""); setPasswordSuccess("");
    if (!passwordData.old_password || !passwordData.new_password) {
      setPasswordError(es ? "Por favor completa todos los campos" : "Please fill all fields");
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError(t("auth.passwords_dont_match") || (es ? "Las contraseñas no coinciden" : "Passwords do not match"));
      return;
    }
    setPasswordLoading(true);
    try {
      await authService.changePassword({ old_password: passwordData.old_password, new_password: passwordData.new_password });
      setPasswordSuccess(es ? "Contraseña cambiada correctamente" : "Password changed successfully");
      setPasswordData({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      console.error("Failed to change password", err);
      setPasswordError(err.detail || err.error || (es ? "Error al cambiar contraseña" : "Failed to change password"));
    } finally { setPasswordLoading(false); }
  };

  if (!open) return null;

  const tabs = [
    { value: "profile",  label: es ? "Datos personales" : "Personal info",   icon: UserCircleIcon },
    { value: "password", label: es ? "Contraseña" : "Password",               icon: LockClosedIcon },
  ];

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || user?.email || "";
  const roleTone = ROLE_TONE[companyRole] || "slate";
  const roleLabel = ROLE_LABEL[companyRole]?.[es ? "es" : "en"] || companyRole;
  const company = companies?.[0];
  const mismatch = passwordData.confirm_password && passwordData.new_password && passwordData.confirm_password !== passwordData.new_password;
  const toggleLabel = es ? "Mostrar u ocultar contraseña" : "Show or hide password";

  const footer = activeTab === "profile" ? (
    <>
      <button type="button" onClick={handler} className={BTN_SECONDARY}>{t("global.crud.cancel") || (es ? "Cancelar" : "Cancel")}</button>
      <button type="button" onClick={handleProfileSubmit} disabled={profileLoading} className={BTN_PRIMARY}>
        {profileLoading && <Spinner className="!h-4 !w-4 border-white/40 border-t-white" />}
        {profileLoading ? (es ? "Guardando…" : "Saving…") : (es ? "Guardar cambios" : "Save changes")}
      </button>
    </>
  ) : (
    <>
      <button type="button" onClick={handler} className={BTN_SECONDARY}>{t("global.crud.cancel") || (es ? "Cancelar" : "Cancel")}</button>
      <button type="button" onClick={handlePasswordSubmit} disabled={passwordLoading} className={BTN_PRIMARY}>
        {passwordLoading && <Spinner className="!h-4 !w-4 border-white/40 border-t-white" />}
        {passwordLoading ? (es ? "Cambiando…" : "Changing…") : (es ? "Cambiar contraseña" : "Change password")}
      </button>
    </>
  );

  return createPortal(
    <Modal title={es ? "Editar perfil" : "Edit profile"} onClose={handler} footer={footer} width="max-w-lg">
      <div className="space-y-5">
        {/* Identity summary */}
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#EEF2FF] text-lg font-semibold text-[#4F46E5]">
            {(fullName || "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#0F172A]">{fullName}</p>
            <p className="truncate text-sm text-[#64748B]">{user?.email}</p>
          </div>
          {companyRole && (
            <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
              <Badge tone={roleTone} dot>{roleLabel}</Badge>
              {company?.name && <span className="max-w-[140px] truncate text-xs text-[#64748B]">{company.name}</span>}
            </div>
          )}
        </div>

        <Segmented items={tabs} value={activeTab} onChange={setActiveTab} ariaLabel={es ? "Secciones del perfil" : "Profile sections"} />

        {activeTab === "profile" && (
          <div className="space-y-4">
            {profileError && <Alert tone="rose">{profileError}</Alert>}
            {profileSuccess && <Alert tone="emerald">{profileSuccess}</Alert>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("global.pages.users.fields.first_name") || (es ? "Nombre" : "First name")}>
                <TextInput name="first_name" placeholder="John" value={profileData.first_name} onChange={handleProfileChange} autoComplete="given-name" />
              </Field>
              <Field label={t("global.pages.users.fields.last_name") || (es ? "Apellidos" : "Last name")}>
                <TextInput name="last_name" placeholder="Doe" value={profileData.last_name} onChange={handleProfileChange} autoComplete="family-name" />
              </Field>
            </div>

            <Field label={t("global.pages.users.fields.email") || "Email"} hint={es ? "El correo no se puede modificar." : "Email cannot be changed."}>
              <TextInput type="email" value={user?.email || ""} disabled className="cursor-not-allowed !bg-[#F8FAFC] !text-[#64748B]" />
            </Field>

            {companyRole && (
              <div className={`flex items-center gap-3 rounded-xl border p-4 ${TONE[roleTone].border} ${TONE[roleTone].tint}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${TONE[roleTone].icon}`}>
                  <ShieldCheckIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{es ? "Rol en la empresa" : "Company role"}</p>
                  <p className="text-sm font-semibold text-[#0F172A]">{roleLabel}{company?.name ? <span className="font-normal text-[#64748B]"> · {company.name}</span> : null}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "password" && (
          <div className="space-y-4">
            {passwordError && <Alert tone="rose">{passwordError}</Alert>}
            {passwordSuccess && <Alert tone="emerald">{passwordSuccess}</Alert>}

            {[
              { name: "old_password",     label: es ? "Contraseña actual" : "Current password" },
              { name: "new_password",     label: es ? "Nueva contraseña" : "New password" },
              { name: "confirm_password", label: es ? "Confirmar nueva contraseña" : "Confirm new password" },
            ].map(({ name, label }) => (
              <Field key={name} label={label}
                hint={name === "confirm_password" && mismatch ? <span className="text-[#BE123C]">{es ? "Las contraseñas no coinciden" : "Passwords must match"}</span> : null}>
                <PasswordInput name={name} value={passwordData[name]} onChange={handlePasswordChange}
                  show={show[name]} onToggle={() => setShow((s) => ({ ...s, [name]: !s[name] }))} toggleLabel={toggleLabel} />
              </Field>
            ))}
          </div>
        )}
      </div>
    </Modal>,
    document.body,
  );
}

export default EditProfileDialog;
