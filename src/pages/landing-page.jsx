import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  DocumentTextIcon,
  DocumentArrowUpIcon,
  SparklesIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  BoltIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
  BuildingOffice2Icon,
  BookOpenIcon,
  RocketLaunchIcon,
  Bars3Icon,
  XMarkIcon,
  CheckBadgeIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  FolderOpenIcon,
  EyeSlashIcon,
  ArrowsRightLeftIcon,
  ClipboardDocumentCheckIcon,
  MapIcon,
  UserPlusIcon,
  KeyIcon,
  DocumentDuplicateIcon,
  GiftIcon,
  BriefcaseIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  HeartIcon,
  CogIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  MapPinIcon,
  ChevronDownIcon,
  LifebuoyIcon,
  PresentationChartLineIcon,
  IdentificationIcon,
  ArchiveBoxIcon,
  BuildingStorefrontIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import supportService from "@/services/supportService";
import { useLanguage } from "@/context/language-context";
import { dictionaryList } from "@/locales";

const SITE_URL = "https://ankard.com/";
const GRADIENT = "linear-gradient(135deg, #6366F1, #818CF8)";
const TEXT_GRADIENT = { background: "linear-gradient(135deg, #6366F1, #C084FC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" };
const SECTION_SCROLL = { scrollMarginTop: 72 };

// ─── Shared building blocks ──────────────────────────────────────────────────

function Eyebrow({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: "#818CF8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
      {children}
    </p>
  );
}

function SectionHeader({ eyebrow, title, intro, center = true }) {
  return (
    <div className={center ? "text-center mb-14 max-w-3xl mx-auto" : "mb-8"}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, color: "#F1F5F9", lineHeight: 1.18, letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      {intro && <p style={{ fontSize: 15, color: "#94A3B8", lineHeight: 1.75, marginTop: 16 }}>{intro}</p>}
    </div>
  );
}

function PrimaryButton({ children, onClick, size = "md", full = false }) {
  const pad = size === "lg" ? "14px 28px" : "11px 22px";
  return (
    <button type="button" onClick={onClick}
      style={{ fontSize: size === "lg" ? 15 : 14, fontWeight: 700, color: "#fff", background: GRADIENT, border: "none", borderRadius: size === "lg" ? 12 : 10, padding: pad, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 0 32px rgba(99,102,241,0.32)", transition: "all 0.2s", width: full ? "100%" : undefined }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 0 44px rgba(99,102,241,0.48)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 32px rgba(99,102,241,0.32)"; }}>
      {children}
      <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function SecondaryButton({ children, onClick, href, full = false }) {
  const style = { fontSize: 14, fontWeight: 600, color: "#94A3B8", background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 22px", cursor: "pointer", transition: "all 0.15s", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: full ? "100%" : undefined };
  const enter = (e) => { e.currentTarget.style.color = "#F1F5F9"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"; };
  const leave = (e) => { e.currentTarget.style.color = "#94A3B8"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; };
  if (href) return <a href={href} style={style} onMouseEnter={enter} onMouseLeave={leave}>{children}</a>;
  return <button type="button" onClick={onClick} style={style} onMouseEnter={enter} onMouseLeave={leave}>{children}</button>;
}

function IconBadge({ icon: Icon, color, size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 11, background: `${color}18`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon className="h-5 w-5" style={{ color }} aria-hidden="true" />
    </div>
  );
}

function GuaranteeNote({ children, center = false }) {
  return (
    <p className={center ? "justify-center" : ""} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#22C55E" }}>
      <ShieldCheckIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

// ─── Language + SEO ──────────────────────────────────────────────────────────

/** Picks the landing language from ?lang=, falling back to the browser language. */
function useLandingLanguage() {
  const { language, changeLanguage } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const param = searchParams.get("lang");
    const browser = (navigator.language || "").toLowerCase().startsWith("es") ? "es" : "en";
    const initial = param === "es" || param === "en" ? param : browser;
    if (initial !== language) changeLanguage(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLanguage = (lang) => {
    changeLanguage(lang);
    setSearchParams((params) => {
      if (lang === "en") params.delete("lang");
      else params.set("lang", lang);
      return params;
    }, { replace: true });
  };

  return [language === "es" ? "es" : "en", setLanguage];
}

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (!el) return null;
  const previous = el.getAttribute(attr);
  el.setAttribute(attr, value);
  return () => el.setAttribute(attr, previous);
}

/** Keeps <title>, description, canonical and social tags in sync with the landing language. */
function useLandingSeo(lang, L) {
  useEffect(() => {
    const url = lang === "es" ? `${SITE_URL}?lang=es` : SITE_URL;
    const prevTitle = document.title;
    const prevLang = document.documentElement.lang;
    document.title = L.meta.title;
    document.documentElement.lang = lang;
    const restores = [
      setMeta('meta[name="description"]', "content", L.meta.description),
      setMeta('link[rel="canonical"]', "href", url),
      setMeta('meta[property="og:url"]', "content", url),
      setMeta('meta[property="og:title"]', "content", L.meta.title),
      setMeta('meta[property="og:description"]', "content", L.meta.description),
      setMeta('meta[property="og:locale"]', "content", L.meta.og_locale),
      setMeta('meta[name="twitter:title"]', "content", L.meta.title),
      setMeta('meta[name="twitter:description"]', "content", L.meta.description),
    ];
    return () => {
      document.title = prevTitle;
      document.documentElement.lang = prevLang;
      restores.forEach((restore) => restore && restore());
    };
  }, [lang, L]);
}

// ─── Lead Modal (pilot / demo / services / business / security / launch) ────

const LEAD_SOURCES = {
  pilot: "business_pilot_request",
  demo: "enterprise_demo_request",
  services: "professional_services_request",
  business: "business_plan_inquiry",
  security: "security_inquiry",
  launch: "launch_program_application",
};

const FIELD_STYLE = { width: "100%", background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#F1F5F9", outline: "none", transition: "border-color 0.15s", boxSizing: "border-box", fontFamily: "inherit" };
const LABEL_STYLE = { fontSize: 11, fontWeight: 600, color: "#94A3B8", display: "block", marginBottom: 6 };
const focusOn = (e) => (e.target.style.borderColor = "rgba(99,102,241,0.6)");
const focusOff = (e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)");

function LeadModal({ mode, lang, L, onClose }) {
  const M = L.modal;
  const copy = M.modes[mode];
  const emptyForm = { company: "", name: "", email: "", phone: "", team_size: "", notes: "" };
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [onClose]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    // The support-request model has no company / team-size fields, so they travel in the message.
    const message = [
      `[${LEAD_SOURCES[mode]}]`,
      `Company: ${form.company.trim()}`,
      form.team_size && `Employees: ${form.team_size}`,
      `Language: ${lang}`,
      form.notes.trim() && `\n${form.notes.trim()}`,
    ].filter(Boolean).join("\n");
    try {
      await supportService.sendPublicLead({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message,
        source: LEAD_SOURCES[mode],
      }, lang);
      setStatus("success");
      setForm(emptyForm);
    } catch (err) {
      if (err?.status === 429) setErrorMsg(M.errors.rate);
      else if (err?.data?.email) setErrorMsg(M.errors.email);
      else setErrorMsg(M.errors.generic);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div onClick={handleBackdrop} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="lead-modal-title"
        style={{ background: "#0F172A", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 18, padding: "28px 24px", maxWidth: 540, width: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 30px 80px rgba(0,0,0,0.7)", position: "relative" }}>
        <button type="button" onClick={onClose} aria-label={M.close}
          style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 7, padding: 6, cursor: "pointer", color: "#64748B", transition: "color 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#F1F5F9")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}>
          <XMarkIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 pr-8">
          <IconBadge icon={mode === "pilot" || mode === "launch" ? RocketLaunchIcon : EnvelopeIcon} color="#818CF8" />
          <div>
            <p id="lead-modal-title" style={{ fontSize: 16, fontWeight: 800, color: "#F1F5F9" }}>{copy.title}</p>
            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{copy.subtitle}</p>
          </div>
        </div>

        {status === "success" ? (
          <div role="status" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.28)", borderRadius: 12, padding: 24, textAlign: "center" }}>
            <CheckCircleIcon className="h-10 w-10 mx-auto mb-3" style={{ color: "#22C55E" }} aria-hidden="true" />
            <p style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", marginBottom: 6 }}>{copy.success_title}</p>
            <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>{copy.success_text}</p>
            <button type="button" onClick={onClose} style={{ marginTop: 18, fontSize: 13, fontWeight: 700, color: "#22C55E", background: "none", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "9px 20px", cursor: "pointer" }}>
              {M.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === "error" && (
              <div role="alert" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#F87171" }}>
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="lead-company" style={LABEL_STYLE}>{M.fields.company} *</label>
              <input id="lead-company" ref={firstFieldRef} name="company" value={form.company} onChange={handleChange} required maxLength={120} autoComplete="organization"
                style={FIELD_STYLE} onFocus={focusOn} onBlur={focusOff} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="lead-name" style={LABEL_STYLE}>{M.fields.name} *</label>
                <input id="lead-name" name="name" value={form.name} onChange={handleChange} required maxLength={120} autoComplete="name"
                  style={FIELD_STYLE} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <label htmlFor="lead-email" style={LABEL_STYLE}>{M.fields.email} *</label>
                <input id="lead-email" name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="email"
                  style={FIELD_STYLE} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="lead-phone" style={LABEL_STYLE}>{M.fields.phone}</label>
                <input id="lead-phone" name="phone" type="tel" value={form.phone} onChange={handleChange} maxLength={40} autoComplete="tel"
                  style={FIELD_STYLE} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <label htmlFor="lead-team" style={LABEL_STYLE}>{M.fields.team_size}</label>
                <select id="lead-team" name="team_size" value={form.team_size} onChange={handleChange}
                  style={{ ...FIELD_STYLE, cursor: "pointer" }} onFocus={focusOn} onBlur={focusOff}>
                  <option value="">{M.fields.team_size_placeholder}</option>
                  {M.team_sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="lead-notes" style={LABEL_STYLE}>{M.fields.message}</label>
              <textarea id="lead-notes" name="notes" value={form.notes} onChange={handleChange} rows={3} maxLength={2000}
                placeholder={copy.message_placeholder}
                style={{ ...FIELD_STYLE, resize: "vertical" }} onFocus={focusOn} onBlur={focusOff} />
            </div>

            <button type="submit" disabled={loading}
              style={{ width: "100%", fontSize: 14, fontWeight: 700, color: "#fff", background: loading ? "rgba(99,102,241,0.5)" : GRADIENT, border: "none", borderRadius: 10, padding: 13, cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.15s" }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
              {loading
                ? <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} className="animate-spin" />{M.sending}</>
                : <>{copy.submit} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></>
              }
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function LanguageToggle({ lang, onChange, label }) {
  return (
    <div role="group" aria-label={label} style={{ display: "inline-flex", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 2 }}>
      {["en", "es"].map((l) => (
        <button key={l} type="button" onClick={() => onChange(l)} aria-pressed={lang === l}
          style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 6, border: "none", cursor: "pointer", background: lang === l ? "rgba(99,102,241,0.25)" : "transparent", color: lang === l ? "#F1F5F9" : "#64748B", transition: "all 0.15s" }}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Navbar({ L, lang, onLanguage, onLead }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: L.nav.product, href: "#solution" },
    { label: L.nav.how, href: "#how" },
    { label: L.nav.pricing, href: "#pricing" },
    { label: L.nav.security, href: "#security" },
    { label: L.nav.faq, href: "#faq" },
  ];
  const solid = scrolled || mobileOpen;

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      background: solid ? "rgba(2,6,23,0.95)" : "transparent",
      backdropFilter: solid ? "blur(12px)" : "none",
      borderBottom: solid ? "1px solid rgba(255,255,255,0.06)" : "none",
      transition: "all 0.25s ease",
    }}>
      <nav className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16" aria-label="Main">
        <a href="/" className="flex items-center gap-2.5" style={{ textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BoltIcon className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.02em" }}>Ankard</span>
          <span className="hidden sm:inline" style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(99,102,241,0.18)", color: "#818CF8", letterSpacing: "0.05em" }}>
            ENTERPRISE
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-7">
          {links.map(({ label, href }) => (
            <a key={href} href={href}
              style={{ fontSize: 13, fontWeight: 500, color: "#94A3B8", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.target.style.color = "#F1F5F9")}
              onMouseLeave={(e) => (e.target.style.color = "#94A3B8")}>
              {label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <LanguageToggle lang={lang} onChange={onLanguage} label={L.nav.language} />
          <button type="button" onClick={() => navigate("/auth/sign-in")}
            style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 16px", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#F1F5F9"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}>
            {L.nav.sign_in}
          </button>
          <button type="button" onClick={() => onLead("demo")}
            style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: GRADIENT, border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", transition: "opacity 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
            {L.nav.demo}
          </button>
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <LanguageToggle lang={lang} onChange={onLanguage} label={L.nav.language} />
          <button type="button" onClick={() => setMobileOpen((p) => !p)} aria-label={L.nav.menu} aria-expanded={mobileOpen}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 6 }}>
            {mobileOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="lg:hidden" style={{ background: "rgba(2,6,23,0.98)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 20px 24px" }}>
          {links.map(({ label, href }) => (
            <a key={href} href={href} onClick={() => setMobileOpen(false)}
              style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#94A3B8", textDecoration: "none", padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {label}
            </a>
          ))}
          <div className="flex flex-col gap-3 mt-5">
            <button type="button" onClick={() => { navigate("/auth/sign-in"); setMobileOpen(false); }}
              style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: 12, cursor: "pointer" }}>
              {L.nav.sign_in}
            </button>
            <button type="button" onClick={() => { onLead("demo"); setMobileOpen(false); }}
              style={{ fontSize: 14, fontWeight: 700, color: "#fff", background: GRADIENT, border: "none", borderRadius: 8, padding: 12, cursor: "pointer" }}>
              {L.nav.demo}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

const FLOW_ICONS = [
  { icon: DocumentTextIcon, color: "#6366F1" },
  { icon: SparklesIcon, color: "#818CF8" },
  { icon: UserGroupIcon, color: "#38BDF8" },
  { icon: ClipboardDocumentCheckIcon, color: "#C084FC" },
  { icon: ChartBarIcon, color: "#22C55E" },
];

function Hero({ L, onLead }) {
  const H = L.hero;
  return (
    <section style={{ background: "linear-gradient(180deg, #020617 0%, #0F172A 60%, #020617 100%)", paddingTop: 128, paddingBottom: 88, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)", width: 800, maxWidth: "100%", height: 400, background: "radial-gradient(ellipse, rgba(99,102,241,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="max-w-6xl mx-auto px-4 md:px-8 text-center relative">
        <div className="inline-flex items-center gap-2 mb-6"
          style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.28)", borderRadius: 999, padding: "6px 14px" }}>
          <SparklesIcon className="h-3.5 w-3.5" style={{ color: "#818CF8" }} aria-hidden="true" />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#818CF8", letterSpacing: "0.04em" }}>{H.badge}</span>
        </div>

        <h1 style={{ fontSize: "clamp(30px, 5.2vw, 56px)", fontWeight: 900, color: "#F1F5F9", lineHeight: 1.1, letterSpacing: "-0.03em", maxWidth: 940, margin: "0 auto 22px" }}>
          {H.title_before}
          <span style={TEXT_GRADIENT}>{H.title_highlight}</span>
          {H.title_after}
        </h1>

        <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#94A3B8", lineHeight: 1.75, maxWidth: 720, margin: "0 auto 34px" }}>
          {H.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-7">
          <PrimaryButton size="lg" onClick={() => onLead("pilot")}>{H.cta_primary}</PrimaryButton>
          <SecondaryButton href="#how">{H.cta_secondary}</SecondaryButton>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-2 mb-16">
          <p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#94A3B8" }}>
            <BuildingOffice2Icon className="h-4 w-4" style={{ color: "#818CF8" }} aria-hidden="true" />
            {H.trust_industries}
          </p>
          <GuaranteeNote>{H.trust_guarantee}</GuaranteeNote>
        </div>

        {/* Flow illustration: documents → training → employees → assessments → results */}
        <figure style={{ maxWidth: 960, margin: "0 auto", borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 40px 100px rgba(0,0,0,0.5)", background: "#0F172A", padding: "22px 18px" }}>
          <figcaption style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            {H.flow_label}
          </figcaption>
          <ol className="grid grid-cols-1 sm:grid-cols-5 gap-3" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {H.flow.map((step, i) => {
              const { icon: Icon, color } = FLOW_ICONS[i];
              return (
                <li key={step.title} className="relative flex sm:flex-col items-center gap-3 sm:gap-2 text-left sm:text-center"
                  style={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 12px" }}>
                  <IconBadge icon={Icon} color={color} size={38} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9" }}>{step.title}</p>
                    <p style={{ fontSize: 11, color: "#64748B", marginTop: 2, lineHeight: 1.4 }}>{step.desc}</p>
                  </div>
                  {i < H.flow.length - 1 && (
                    <ArrowRightIcon className="hidden sm:block absolute h-4 w-4" aria-hidden="true"
                      style={{ color: "#475569", right: -14, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
                  )}
                </li>
              );
            })}
          </ol>
        </figure>
      </div>
    </section>
  );
}

// ─── Problem ──────────────────────────────────────────────────────────────────

const PROBLEM_ICONS = [ArrowPathIcon, FolderOpenIcon, ArrowsRightLeftIcon, EyeSlashIcon, ClockIcon];

function Problem({ L }) {
  const P = L.problem;
  return (
    <section id="problem" style={{ background: "#020617", padding: "96px 0", ...SECTION_SCROLL }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <SectionHeader eyebrow={P.eyebrow} title={P.title} intro={P.intro} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {P.items.map(({ title, desc }, i) => (
            <div key={title} style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
              <IconBadge icon={PROBLEM_ICONS[i]} color="#F59E0B" size={36} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", margin: "14px 0 8px" }}>{title}</h3>
              <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center" style={{ fontSize: "clamp(16px, 2.2vw, 20px)", fontWeight: 700, color: "#F1F5F9", marginTop: 44 }}>
          <span style={TEXT_GRADIENT}>{P.closing}</span>
        </p>
      </div>
    </section>
  );
}

// ─── Solution ─────────────────────────────────────────────────────────────────

const SOLUTION_ICONS = [
  { icon: SparklesIcon, color: "#818CF8" },
  { icon: MapIcon, color: "#22C55E" },
  { icon: UserPlusIcon, color: "#38BDF8" },
  { icon: ClipboardDocumentCheckIcon, color: "#F59E0B" },
  { icon: ChartBarIcon, color: "#C084FC" },
  { icon: DocumentDuplicateIcon, color: "#6366F1" },
];

function Solution({ L }) {
  const S = L.solution;
  return (
    <section id="solution" style={{ background: "#0F172A", padding: "96px 0", ...SECTION_SCROLL }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <SectionHeader eyebrow={S.eyebrow} title={S.title} intro={S.intro} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {S.items.map(({ title, desc, benefit }, i) => {
            const { icon, color } = SOLUTION_ICONS[i];
            return (
              <div key={title}
                style={{ background: "#162032", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 22, transition: "border-color 0.2s, transform 0.2s", display: "flex", flexDirection: "column" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}38`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = ""; }}>
                <IconBadge icon={icon} color={color} size={38} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", margin: "14px 0 8px" }}>{title}</h3>
                <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7, flex: 1 }}>{desc}</p>
                <p style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.6, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color, fontWeight: 700 }}>{S.benefit_label}: </span>{benefit}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

const STEP_ICONS = [
  { icon: DocumentArrowUpIcon, color: "#6366F1" },
  { icon: SparklesIcon, color: "#818CF8" },
  { icon: MapIcon, color: "#22C55E" },
  { icon: AcademicCapIcon, color: "#38BDF8" },
  { icon: CheckBadgeIcon, color: "#C084FC" },
  { icon: ArrowPathIcon, color: "#F59E0B" },
];

function HowItWorks({ L }) {
  const H = L.how;
  return (
    <section id="how" style={{ background: "#020617", padding: "96px 0", ...SECTION_SCROLL }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <SectionHeader eyebrow={H.eyebrow} title={H.title} />
        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {H.steps.map(({ title, desc }, i) => {
            const { icon, color } = STEP_ICONS[i];
            return (
              <li key={title} style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "26px 22px", transition: "border-color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${color}40`)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}>
                <div className="flex items-center justify-between mb-4">
                  <IconBadge icon={icon} color={color} />
                  <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: "0.05em" }}>
                    {H.step_label} {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7 }}>{desc}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ─── Benefits ─────────────────────────────────────────────────────────────────

const BENEFIT_ICONS = [ClockIcon, CheckCircleIcon, IdentificationIcon, ArchiveBoxIcon, PresentationChartLineIcon, ArrowTrendingUpIcon];

function Benefits({ L }) {
  const B = L.benefits;
  return (
    <section id="benefits" style={{ background: "#0F172A", padding: "96px 0", ...SECTION_SCROLL }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <SectionHeader eyebrow={B.eyebrow} title={B.title} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
          {B.items.map(({ title, desc }, i) => (
            <div key={title} className="flex items-start gap-4">
              <IconBadge icon={BENEFIT_ICONS[i]} color="#22C55E" size={38} />
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", marginBottom: 6 }}>{title}</h3>
                <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Measurable training ──────────────────────────────────────────────────────

const STATUS_STYLE = {
  done: { color: "#22C55E", bg: "rgba(34,197,94,0.1)" },
  progress: { color: "#38BDF8", bg: "rgba(56,189,248,0.1)" },
  review: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  pending: { color: "#94A3B8", bg: "rgba(148,163,184,0.1)" },
};

function Measurable({ L }) {
  const M = L.measurable;
  return (
    <section id="results" style={{ background: "#020617", padding: "96px 0", ...SECTION_SCROLL }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <SectionHeader eyebrow={M.eyebrow} title={M.title} center={false} />
          <p style={{ fontSize: 15, color: "#94A3B8", lineHeight: 1.75, marginBottom: 14 }}>{M.text}</p>
          <p style={{ fontSize: 15, color: "#CBD5E1", lineHeight: 1.75, marginBottom: 26 }}>{M.text2}</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {M.metrics.map((m) => (
              <li key={m} className="flex items-center gap-2.5" style={{ fontSize: 13, color: "#CBD5E1" }}>
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: "#818CF8" }} aria-hidden="true" />
                {m}
              </li>
            ))}
          </ul>
        </div>

        {/* Illustrative preview — sample rows, no real customer data or invented percentages */}
        <figure style={{ margin: 0, background: "#0F172A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
          <div className="flex items-center justify-between" style={{ background: "#1E293B", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9" }}>{M.preview_title}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#F59E0B", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 999, padding: "3px 9px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {M.illustrative}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[M.preview_cols.employee, M.preview_cols.path, M.preview_cols.status].map((h, i) => (
                    <th key={h} scope="col" className={i === 1 ? "hidden sm:table-cell" : undefined} style={{ textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 16px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {M.preview_rows.map((row) => {
                  const s = STATUS_STYLE[row.status];
                  return (
                    <tr key={row.name} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#CBD5E1" }}>{row.name}</td>
                      <td className="hidden sm:table-cell" style={{ padding: "12px 16px", fontSize: 12, color: "#94A3B8" }}>{row.path}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.bg, borderRadius: 5, padding: "3px 8px", whiteSpace: "nowrap" }}>
                          {M.status[row.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </figure>
      </div>
    </section>
  );
}

// ─── Security ─────────────────────────────────────────────────────────────────

const SECURITY_ICONS = [LockClosedIcon, KeyIcon, EnvelopeIcon, DocumentDuplicateIcon, ClockIcon, CheckBadgeIcon];

function Security({ L, onLead }) {
  const S = L.security;
  return (
    <section id="security" style={{ background: "#0F172A", padding: "96px 0", ...SECTION_SCROLL }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
        <div className="lg:col-span-2">
          <SectionHeader eyebrow={S.eyebrow} title={S.title} center={false} />
          <p style={{ fontSize: 15, color: "#94A3B8", lineHeight: 1.8, marginBottom: 28 }}>{S.text}</p>
          <div className="flex flex-col items-start gap-4">
            <PrimaryButton onClick={() => onLead("security")}>{S.cta}</PrimaryButton>
            <a href="/privacidad" style={{ fontSize: 13, fontWeight: 600, color: "#818CF8", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {S.privacy_link}
            </a>
          </div>
        </div>
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {S.items.map(({ title, desc }, i) => (
            <div key={title} style={{ background: "#162032", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 18 }}>
              <IconBadge icon={SECURITY_ICONS[i]} color="#818CF8" size={34} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", margin: "12px 0 6px" }}>{title}</h3>
              <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Industries ───────────────────────────────────────────────────────────────

const INDUSTRY_ICONS = [UsersIcon, BuildingOffice2Icon, TruckIcon, WrenchScrewdriverIcon, ChatBubbleLeftRightIcon, HeartIcon, BuildingStorefrontIcon, BriefcaseIcon, CogIcon, MapPinIcon];

function Industries({ L }) {
  const I = L.industries;
  return (
    <section id="industries" style={{ background: "#020617", padding: "96px 0", ...SECTION_SCROLL }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <SectionHeader eyebrow={I.eyebrow} title={I.title} intro={I.text} />
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {I.items.map((name, i) => {
            const Icon = INDUSTRY_ICONS[i];
            return (
              <li key={name} className="flex items-center gap-2.5" style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 14px" }}>
                <Icon className="h-5 w-5 flex-shrink-0" style={{ color: "#818CF8" }} aria-hidden="true" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#CBD5E1", lineHeight: 1.3 }}>{name}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-center" style={{ fontSize: 12, color: "#64748B", marginTop: 24, maxWidth: 640, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          {I.note}
        </p>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function PriceTag({ price, period }) {
  return (
    <p style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "14px 0 6px" }}>
      <span style={{ fontSize: 44, fontWeight: 900, color: "#F1F5F9", letterSpacing: "-0.02em", lineHeight: 1 }}>{price}</span>
      <span style={{ fontSize: 14, color: "#94A3B8", fontWeight: 600 }}>{period}</span>
    </p>
  );
}

function CheckList({ items, color = "#818CF8" }) {
  return (
    <ul className="space-y-2.5" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2.5" style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.5 }}>
          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color }} aria-hidden="true" />
          {it}
        </li>
      ))}
    </ul>
  );
}

function Pricing({ L, onLead }) {
  const P = L.pricing;
  return (
    <section id="pricing" style={{ background: "#0F172A", padding: "96px 0", ...SECTION_SCROLL }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <SectionHeader eyebrow={P.eyebrow} title={P.title} intro={P.subtitle} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Pilot */}
          <div style={{ background: "linear-gradient(160deg, rgba(99,102,241,0.14), rgba(15,23,42,1) 55%)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 20, padding: "30px 26px", display: "flex", flexDirection: "column", position: "relative" }}>
            <span style={{ alignSelf: "flex-start", fontSize: 10, fontWeight: 800, color: "#fff", background: GRADIENT, borderRadius: 999, padding: "4px 11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {P.pilot.badge}
            </span>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#F1F5F9", marginTop: 16 }}>{P.pilot.name}</h3>
            <PriceTag price={P.pilot.price} period={P.pilot.period} />
            <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 22 }}>{P.pilot.desc}</p>
            <div style={{ flex: 1, marginBottom: 24 }}>
              <CheckList items={P.pilot.includes} />
            </div>
            <div style={{ marginBottom: 16 }}><GuaranteeNote>{P.pilot.guarantee}</GuaranteeNote></div>
            <PrimaryButton full onClick={() => onLead("pilot")}>{P.pilot.cta}</PrimaryButton>
          </div>

          {/* Business */}
          <div style={{ background: "#162032", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "30px 26px", display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#F1F5F9", marginTop: 30 }}>{P.business.name}</h3>
            <PriceTag price={P.business.price} period={P.business.period} />
            <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 22 }}>{P.business.desc}</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{P.business.includes_title}</p>
            <div style={{ flex: 1, marginBottom: 24 }}>
              <CheckList items={P.business.includes} color="#22C55E" />
            </div>
            <SecondaryButton full onClick={() => onLead("business")}>{P.business.cta}</SecondaryButton>
          </div>
        </div>

        {/* Professional services */}
        <div className="max-w-5xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-5 gap-8 items-center"
          style={{ background: "#020617", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 26px" }}>
          <div className="md:col-span-3">
            <div className="flex items-center gap-3 mb-3">
              <IconBadge icon={LifebuoyIcon} color="#C084FC" size={36} />
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#F1F5F9", lineHeight: 1.3 }}>{P.services.title}</h3>
            </div>
            <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7, marginBottom: 14 }}>{P.services.text}</p>
            <CheckList items={P.services.items} color="#C084FC" />
          </div>
          <div className="md:col-span-2 flex flex-col gap-3">
            <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>{P.services.note}</p>
            <SecondaryButton full onClick={() => onLead("services")}>{P.services.cta}</SecondaryButton>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Guarantee + bonuses + launch program ────────────────────────────────────

function Guarantee({ L }) {
  const G = L.guarantee;
  return (
    <section id="guarantee" style={{ background: "#020617", padding: "80px 0 40px", ...SECTION_SCROLL }}>
      <div className="max-w-3xl mx-auto px-4 md:px-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left"
          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 20, padding: "30px 28px" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldCheckIcon className="h-7 w-7" style={{ color: "#22C55E" }} aria-hidden="true" />
          </div>
          <div>
            <h2 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 800, color: "#F1F5F9", marginBottom: 8 }}>{G.title}</h2>
            <p style={{ fontSize: 15, color: "#CBD5E1", lineHeight: 1.7 }}>{G.text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bonuses({ L }) {
  const B = L.bonuses;
  return (
    <section id="bonuses" style={{ background: "#020617", padding: "56px 0 96px", ...SECTION_SCROLL }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <SectionHeader eyebrow={B.eyebrow} title={B.title} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {B.items.map(({ title, desc }, i) => (
            <div key={title} style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 22 }}>
              <div className="flex items-center justify-between mb-4">
                <IconBadge icon={GiftIcon} color="#F59E0B" size={36} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#F59E0B", letterSpacing: "0.05em" }}>{B.label} {i + 1}</span>
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LaunchProgram({ L, onLead }) {
  const P = L.launch;
  return (
    <section id="launch" style={{ background: "#0F172A", padding: "88px 0", ...SECTION_SCROLL }}>
      <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
        <div className="flex justify-center mb-5"><IconBadge icon={RocketLaunchIcon} color="#818CF8" size={48} /></div>
        <Eyebrow>{P.eyebrow}</Eyebrow>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, color: "#F1F5F9", lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 14 }}>{P.title}</h2>
        <p style={{ fontSize: 15, color: "#94A3B8", lineHeight: 1.75, maxWidth: 620, margin: "0 auto 28px" }}>{P.text}</p>
        <PrimaryButton onClick={() => onLead("launch")}>{P.cta}</PrimaryButton>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function Faq({ L }) {
  const F = L.faq;
  return (
    <section id="faq" style={{ background: "#020617", padding: "96px 0", ...SECTION_SCROLL }}>
      <div className="max-w-3xl mx-auto px-4 md:px-8">
        <SectionHeader eyebrow={F.eyebrow} title={F.title} />
        <div className="space-y-3">
          {F.items.map(({ q, a }) => (
            <details key={q} className="group" style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "0 18px" }}>
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden" style={{ padding: "16px 0" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", lineHeight: 1.4 }}>{q}</h3>
                <ChevronDownIcon className="h-4 w-4 flex-shrink-0 transition-transform group-open:rotate-180" style={{ color: "#64748B" }} aria-hidden="true" />
              </summary>
              <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.75, paddingBottom: 18 }}>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────────────────

function FinalCTA({ L, onLead }) {
  const F = L.final;
  return (
    <section style={{ background: "#020617", padding: "0 0 100px" }}>
      <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
        <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.11), rgba(192,132,252,0.07))", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 24, padding: "56px 28px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, maxWidth: "100%", height: 300, background: "radial-gradient(ellipse, rgba(99,102,241,0.09) 0%, transparent 70%)", pointerEvents: "none" }} />
          <BookOpenIcon className="h-11 w-11 mx-auto mb-6 relative" style={{ color: "#818CF8" }} aria-hidden="true" />
          <h2 className="relative" style={{ fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 900, color: "#F1F5F9", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 14 }}>
            {F.title}
          </h2>
          <p className="relative" style={{ fontSize: 15, color: "#94A3B8", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 30px" }}>{F.text}</p>
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <PrimaryButton size="lg" onClick={() => onLead("pilot")}>{F.cta_primary}</PrimaryButton>
            <SecondaryButton onClick={() => onLead("demo")}>{F.cta_secondary}</SecondaryButton>
          </div>
          <div className="relative"><GuaranteeNote center>{F.guarantee}</GuaranteeNote></div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ L, onLead }) {
  const F = L.footer;
  const linkStyle = { display: "block", fontSize: 12, color: "#64748B", marginBottom: 8, textDecoration: "none", transition: "color 0.15s", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" };
  const hover = { onMouseEnter: (e) => (e.currentTarget.style.color = "#CBD5E1"), onMouseLeave: (e) => (e.currentTarget.style.color = "#64748B") };
  const columns = [
    { title: F.product, links: [
      { label: L.nav.product, href: "#solution" },
      { label: L.nav.how, href: "#how" },
      { label: L.nav.pricing, href: "#pricing" },
      { label: L.nav.security, href: "#security" },
    ] },
    { title: F.company, links: [
      { label: F.contact, onClick: () => onLead("demo") },
      { label: F.help, href: "/faq" },
      { label: L.nav.sign_in, href: "/auth/sign-in" },
    ] },
    { title: F.legal, links: [
      { label: F.terms, href: "/terminos" },
      { label: F.privacy, href: "/privacidad" },
    ] },
  ];

  return (
    <footer style={{ background: "#0F172A", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "48px 0 32px" }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div style={{ width: 28, height: 28, borderRadius: 7, background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BoltIcon className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#F1F5F9" }}>Ankard Enterprise</span>
            </div>
            <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.7, maxWidth: 260 }}>{F.tagline}</p>
          </div>
          <nav className="grid grid-cols-2 sm:grid-cols-3 gap-8" aria-label="Footer">
            {columns.map(({ title, links }) => (
              <div key={title}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{title}</p>
                {links.map((l) => l.href
                  ? <a key={l.label} href={l.href} style={linkStyle} {...hover}>{l.label}</a>
                  : <button key={l.label} type="button" onClick={l.onClick} style={linkStyle} {...hover}>{l.label}</button>
                )}
              </div>
            ))}
          </nav>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 22, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "#475569" }}>© {new Date().getFullYear()} Ankard Enterprise. {F.rights}</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const [lang, setLang] = useLandingLanguage();
  const L = dictionaryList[lang].b2b_landing;
  const [leadMode, setLeadMode] = useState(null);
  useLandingSeo(lang, L);

  const openLead = (mode) => setLeadMode(mode);
  const closeLead = React.useCallback(() => setLeadMode(null), []);

  return (
    <div style={{ background: "#020617", minHeight: "100vh", overflowX: "hidden" }}>
      {leadMode && <LeadModal key={leadMode} mode={leadMode} lang={lang} L={L} onClose={closeLead} />}
      <Navbar L={L} lang={lang} onLanguage={setLang} onLead={openLead} />
      <main>
        <Hero L={L} onLead={openLead} />
        <Problem L={L} />
        <Solution L={L} />
        <HowItWorks L={L} />
        <Benefits L={L} />
        <Measurable L={L} />
        <Security L={L} onLead={openLead} />
        <Industries L={L} />
        <Pricing L={L} onLead={openLead} />
        <Guarantee L={L} />
        <Bonuses L={L} />
        <LaunchProgram L={L} onLead={openLead} />
        <Faq L={L} />
        <FinalCTA L={L} onLead={openLead} />
      </main>
      <Footer L={L} onLead={openLead} />
    </div>
  );
}

export default LandingPage;
