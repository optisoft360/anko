import { useLocation, Link } from "react-router-dom";
import {
  Navbar,
  Typography,
  Button,
  IconButton,
  Breadcrumbs,
  Input,
} from "@material-tailwind/react";
import {
  UserCircleIcon,
  Bars3Icon,
  PowerIcon,
  PencilSquareIcon,
  ChevronDownIcon,
  ChartBarIcon,
} from "@heroicons/react/24/solid";
import {
  BellIcon,
  CheckIcon,
  XMarkIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import api, { API_BASE } from "@/services/api";
import {
  useMaterialTailwindController,
  setOpenConfigurator,
  setOpenSidenav,
} from "@/context";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { useProjects } from "@/context/projects-context";
import { EditProfileDialog } from "@/widgets/dialogs/edit-profile-dialog";
import { UserStatisticsDialog } from "@/widgets/dialogs/user-statistics-dialog";
import { useState, useEffect, useRef } from "react";

const getLevelStyle = (level) => {
  if (level === "success") return { Icon: CheckCircleIcon,         ring: "ring-emerald-100", cls: "text-emerald-500", dot: "bg-emerald-500" };
  if (level === "error")   return { Icon: XCircleIcon,             ring: "ring-red-100",     cls: "text-red-500",     dot: "bg-red-500"     };
  if (level === "warning") return { Icon: ExclamationTriangleIcon, ring: "ring-amber-100",   cls: "text-amber-500",   dot: "bg-amber-500"   };
  return                          { Icon: InformationCircleIcon,   ring: "ring-indigo-100",  cls: "text-indigo-500",  dot: "bg-indigo-500"  };
};

export function DashboardNavbar() {
  const [controller, dispatch] = useMaterialTailwindController();
  const { fixedNavbar, openSidenav } = controller;
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [openStatsDialog, setOpenStatsDialog] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // ── Toasts ──────────────────────────────────────────────
  const addToast = (msg) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...msg, _toastId: id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t._toastId !== id)), 5000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t._toastId !== id));

  // ── Notifications ────────────────────────────────────────
  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get("/user-notifications/");
      setNotifications(res.data?.results || res.data || []);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    } finally {
      setNotifLoading(false);
    }
  };

  // Fetch al login para el badge + polling de respaldo cada 30 s
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  // Socket persistente — se abre al login, se cierra al logout
  const wsRef = useRef(null);
  useEffect(() => {
    if (!user) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }
    const token = localStorage.getItem("token");
    const wsBase = API_BASE.replace(/^http/, "ws").replace(/\/api\/?$/, "");
    const ws = new WebSocket(`${wsBase}/ws/notifications/?token=${token}`);
    wsRef.current = ws;
    ws.onopen  = () => console.log("[Notifications] WS connected");
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        addToast(msg);
        setNotifications((prev) => [{ ...msg, is_read: false, notification: msg }, ...prev]);
      } catch (_) {}
    };
    ws.onclose = () => console.log("[Notifications] WS closed");
    return () => { ws.close(); wsRef.current = null; };
  }, [user]);

  const markRead = async (id) => {
    try {
      await api.post(`/user-notifications/${id}/read/`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {}
  };

  const dismissNotif = async (id) => {
    try {
      await api.post(`/user-notifications/${id}/dismiss/`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {}
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Breadcrumbs ──────────────────────────────────────────
  const { projects: allProjects } = useProjects();
  const pathParts = pathname.split("/").filter((el) => el !== "");
  const getBreadcrumbName = (part, index) => {
    if (index === 2 && pathParts[1] === "project") {
      const project = allProjects.find(p => String(p.id) === part);
      return project ? (project.title || project.name) : part;
    }
    const key = `breadcrumbs.${part}`;
    const translated = t(key);
    // t() falls back to returning the key itself when there's no translation —
    // detect that case here so an untranslated segment (e.g. a numeric id)
    // shows its raw value instead of the literal "breadcrumbs.<part>" string.
    return translated !== key ? translated : part;
  };

  return (
    <>
      <Navbar
        color={fixedNavbar ? "white" : "transparent"}
        className={`transition-all ${fixedNavbar
          ? "sticky top-4 z-40 py-2 shadow-premium bg-white/80 backdrop-blur-md border border-zinc-200/50"
          : "px-0 py-1 border-b border-zinc-200/50"
        }`}
        fullWidth
        blurred={fixedNavbar}
      >
        <div className="flex flex-col-reverse justify-between gap-6 md:flex-row md:items-center px-4">
          <div className="capitalize flex items-center gap-4">
            <IconButton
              variant="text"
              className="grid text-zinc-600"
              onClick={() => setOpenSidenav(dispatch, !openSidenav)}
            >
              <Bars3Icon strokeWidth={3} className="h-6 w-6" />
            </IconButton>
            <div>
              <Breadcrumbs className="bg-transparent p-0 transition-all">
                {pathParts.map((part, index) => {
                  const isLast = index === pathParts.length - 1;
                  const name = getBreadcrumbName(part, index);
                  const layout = pathParts[0];
                  if (!isLast) {
                    let path = "/" + pathParts.slice(0, index + 1).join("/");
                    if (part === "project" && index === 1) path = `/${layout}/projects`;
                    return (
                      <Link key={path} to={path}>
                        <Typography variant="small" className="font-medium text-[var(--text-secondary)] transition-all hover:text-[var(--accent)]">
                          {name}
                        </Typography>
                      </Link>
                    );
                  }
                  return (
                    <Typography key={index} variant="small" className="font-semibold text-[var(--text-primary)]">
                      {name}
                    </Typography>
                  );
                })}
              </Breadcrumbs>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language */}
            <Button
              variant="text"
              className="flex items-center gap-2 px-3 py-2 normal-case text-zinc-600 hover:bg-zinc-100"
              onClick={() => changeLanguage(language === "es" ? "en" : "es")}
            >
              <img
                src={language === "en" ? "https://flagcdn.com/w20/us.png" : "https://flagcdn.com/w20/es.png"}
                alt={language}
                className="h-3.5 w-5 rounded-sm"
              />
              <span className="text-xs font-bold">{language.toUpperCase()}</span>
            </Button>

            {/* Notification Bell */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => { setNotifOpen(v => { if (!v && !notifLoading) fetchNotifications(); return !v; }); }}
                style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--lt-94a3b8, #94A3B8)", transition: "background 0.15s, color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#F1F5F9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#94A3B8"; }}>
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 999, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", boxShadow: "0 0 6px rgba(239,68,68,0.6)" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setNotifOpen(false)} />
                  <div style={{ position: "absolute", right: 0, top: 46, zIndex: 50, background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 16, width: 320, boxShadow: "0 20px 60px var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7)), 0 0 0 1px rgba(99,102,241,0.08)", overflow: "hidden" }}>
                    {/* Top accent strip */}
                    <div style={{ height: 2, background: "linear-gradient(90deg, #6366F1, #818CF8, #A78BFA)" }} />

                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 12px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <BellIcon style={{ width: 15, height: 15, color: "var(--lt-818cf8, #818CF8)" }} />
                        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)" }}>
                          {language === "es" ? "Notificaciones" : "Notifications"}
                        </span>
                      </div>
                      {unreadCount > 0 && (
                        <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)", color: "var(--lt-818cf8, #818CF8)", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div style={{ maxHeight: 340, overflowY: "auto", padding: "6px" }}>
                      {notifLoading && (
                        <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderTopColor: "#818CF8" }} className="animate-spin" />
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--lt-475569, #475569)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                            {language === "es" ? "Cargando..." : "Loading..."}
                          </span>
                        </div>
                      )}

                      {!notifLoading && notifications.length === 0 && (
                        <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                          <BellIcon style={{ width: 28, height: 28, color: "var(--lt-334155, #334155)" }} />
                          <span style={{ fontSize: 11, color: "var(--lt-475569, #475569)" }}>
                            {language === "es" ? "Sin notificaciones" : "No notifications"}
                          </span>
                        </div>
                      )}

                      {!notifLoading && notifications.map((notif) => {
                        const title  = notif.notification?.title || notif.title || "";
                        const body   = notif.notification?.body  || notif.body  || notif.message || "";
                        const level  = (notif.notification?.level || notif.level || "info").toLowerCase().trim();
                        const date   = notif.created_at || notif.notification?.created_at;
                        const isRead = notif.is_read !== undefined ? notif.is_read : notif.read_at !== null;
                        const dotColor = level === "success" ? "#22C55E"
                                       : level === "error"   ? "#EF4444"
                                       : level === "warning" ? "#F59E0B"
                                       :                       "#6366F1";
                        return (
                          <div
                            key={notif.id}
                            style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, marginBottom: 2, cursor: "pointer", transition: "background 0.15s", background: !isRead ? "rgba(99,102,241,0.08)" : "transparent", border: !isRead ? "1px solid rgba(99,102,241,0.15)" : "1px solid transparent", position: "relative" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = !isRead ? "rgba(99,102,241,0.13)" : "rgba(255,255,255,0.04)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = !isRead ? "rgba(99,102,241,0.08)" : "transparent"; }}
                            onClick={() => { if (!isRead) markRead(notif.id); }}
                          >
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0, marginTop: 4, boxShadow: `0 0 6px ${dotColor}80` }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {title && (
                                <p style={{ fontSize: 11, fontWeight: !isRead ? 700 : 500, color: !isRead ? "#E2E8F0" : "#94A3B8", lineHeight: 1.4, marginBottom: 2 }}>
                                  {title}
                                </p>
                              )}
                              {body && (
                                <p style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4, marginBottom: 3 }}>{body}</p>
                              )}
                              {date && (
                                <p style={{ fontSize: 10, color: "var(--lt-334155, #334155)" }}>
                                  {new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              )}
                            </div>
                            <button
                              style={{ width: 22, height: 22, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--lt-334155, #334155)", flexShrink: 0, transition: "background 0.15s, color 0.15s", opacity: 0.7 }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#F87171"; e.currentTarget.style.opacity = "1"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#334155"; e.currentTarget.style.opacity = "0.7"; }}
                              onClick={(e) => { e.stopPropagation(); dismissNotif(notif.id); }}
                            >
                              <XMarkIcon style={{ width: 13, height: 13 }} strokeWidth={2.5} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User profile */}
            {user ? (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px", borderRadius: 999, background: "none", border: "none", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #6366F1, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12, border: "1px solid var(--lt-rgba-255-255-255-0-2, rgba(255,255,255,0.2))", boxShadow: "0 0 12px rgba(99,102,241,0.4)", flexShrink: 0 }}>
                    {user.first_name?.[0] || user.username?.[0] || "U"}
                  </div>
                  <ChevronDownIcon strokeWidth={3} style={{ width: 12, height: 12, color: "#64748B", transition: "transform 0.2s", transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)" }} />
                </button>

                {showUserMenu && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowUserMenu(false)} />
                    <div style={{ position: "absolute", right: 0, top: 46, zIndex: 50, background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 16, overflow: "hidden", minWidth: 210, boxShadow: "0 20px 60px var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7)), 0 0 0 1px rgba(99,102,241,0.08)" }}>
                      {/* Top accent strip */}
                      <div style={{ height: 2, background: "linear-gradient(90deg, #6366F1, #818CF8, #A78BFA)" }} />

                      {/* User info */}
                      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #6366F1, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                            {user.first_name?.[0] || user.username?.[0] || "U"}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {user.first_name || user.username}
                            </p>
                            <p style={{ fontSize: 10, color: "var(--lt-475569, #475569)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div style={{ padding: "6px" }}>
                        {[
                          { label: t("sidenav.profile") || "Profile",    icon: PencilSquareIcon, action: () => { setShowUserMenu(false); setOpenProfileDialog(true); } },
                          { label: language === "es" ? "Estadística" : "Statistics", icon: ChartBarIcon, action: () => { setShowUserMenu(false); setOpenStatsDialog(true); } },
                        ].map(({ label, icon: Icon, action }) => (
                          <button key={label} onClick={action}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", color: "var(--lt-94a3b8, #94A3B8)", fontSize: 13, fontWeight: 600, textAlign: "left", transition: "background 0.15s, color 0.15s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.color = "#C7D2FE"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#94A3B8"; }}>
                            <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                            {label}
                          </button>
                        ))}

                        <div style={{ height: 1, background: "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", margin: "4px 6px" }} />

                        <button onClick={() => { setShowUserMenu(false); logout(); }}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", color: "var(--lt-f87171, #F87171)", fontSize: 13, fontWeight: 600, textAlign: "left", transition: "background 0.15s, color 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#FCA5A5"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#F87171"; }}>
                          <PowerIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
                          {t("sidenav.signout") || "Sign Out"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/auth/sign-in">
                <Button variant="gradient" color="indigo" size="sm" className="hidden items-center gap-2 xl:flex normal-case shadow-md shadow-indigo-500/20">
                  <UserCircleIcon className="h-4 w-4" />
                  {t("sidenav.signin")}
                </Button>
              </Link>
            )}

            <EditProfileDialog open={openProfileDialog} handler={() => setOpenProfileDialog(false)} />
            <UserStatisticsDialog open={openStatsDialog} handler={() => setOpenStatsDialog(false)} userId={user?.id} />
          </div>
        </div>
      </Navbar>

      {/* Toast notifications — above mobile tab bar on small screens */}
      <div className="fixed bottom-16 right-3 md:bottom-6 md:right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-24px)] md:max-w-none">
        {toasts.map((toast) => {
          const title = toast.title || toast.notification?.title || "";
          const body  = toast.body  || toast.notification?.body  || toast.message || "";
          const level = (toast.level || toast.notification?.level || "info").toLowerCase().trim();
          const { Icon, ring, cls } = getLevelStyle(level);
          return (
            <div
              key={toast._toastId}
              className={`pointer-events-auto flex items-start gap-3 w-72 md:w-80 bg-white rounded-2xl shadow-2xl ring-1 ${ring} px-3 md:px-4 py-3 md:py-3.5`}
            >
              <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cls}`} strokeWidth={2} />
              <div className="flex-1 min-w-0">
                {title && <p className="text-[13px] font-semibold text-zinc-900 leading-tight">{title}</p>}
                {body  && <p className="text-[12px] text-zinc-500 mt-0.5 leading-snug">{body}</p>}
              </div>
              <button
                onClick={() => removeToast(toast._toastId)}
                className="shrink-0 text-zinc-300 hover:text-zinc-500 transition-colors mt-0.5"
              >
                <XMarkIcon className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default DashboardNavbar;
