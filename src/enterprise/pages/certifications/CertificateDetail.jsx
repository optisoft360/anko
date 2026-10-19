import { formatDate } from "@/utils/calendarDate";
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { toPng } from "html-to-image";
import {
  ArrowDownTrayIcon, AcademicCapIcon, CalendarIcon,
  ShieldCheckIcon, TicketIcon,
} from "@heroicons/react/24/outline";
import { certApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";

const NAVY = "#12213F";
const GOLD = "#C9A227";
const GOLD_LIGHT = "#E4C766";
const CREAM = "#FBF7EC";

function QRCode({ url, alt }) {
  return (
    <div style={{ display: "inline-block", background: "#fff", padding: 8, borderRadius: 10, border: `1px solid ${GOLD}55` }}>
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`}
        alt={alt}
        crossOrigin="anonymous"
        style={{ width: 96, height: 96, display: "block" }}
      />
    </div>
  );
}

function RibbonTop() {
  return (
    <svg viewBox="0 0 600 120" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 108, display: "block" }}>
      <path
        d="M0,0 H600 V46 C 555,46 545,92 495,92 H385 C 350,92 350,58 300,58 C 250,58 250,92 215,92 H105 C 55,92 45,46 0,46 Z"
        fill={NAVY}
      />
      <path
        d="M0,46 C 45,46 55,92 105,92 H215 C 250,92 250,58 300,58 C 350,58 350,92 385,92 H495 C 545,92 555,46 600,46"
        fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.6"
      />
    </svg>
  );
}

function RibbonBottom() {
  return (
    <svg viewBox="0 0 600 60" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 44, display: "block" }}>
      <path d="M0,60 H600 V26 C 480,26 460,6 300,6 C 140,6 120,26 0,26 Z" fill={NAVY} />
    </svg>
  );
}

function MedalSeal() {
  const leaf = (angle, side) => (
    <ellipse
      key={`${side}-${angle}`}
      cx={0} cy={-38} rx={5} ry={12}
      fill={GOLD}
      opacity={0.9}
      transform={`rotate(${side === "l" ? -angle : angle})`}
    />
  );
  const angles = [10, 24, 38, 52, 66];
  return (
    <svg viewBox="-60 -60 120 150" style={{ width: 84, height: 105 }}>
      <g>
        {angles.map((a) => leaf(a, "l"))}
        {angles.map((a) => leaf(a, "r"))}
      </g>
      <polygon points="-22,20 -22,64 0,50 22,64 22,20" fill={NAVY} />
      <circle cx="0" cy="0" r="34" fill={GOLD_LIGHT} stroke={GOLD} strokeWidth="3" />
      <circle cx="0" cy="0" r="26" fill="none" stroke={NAVY} strokeWidth="1" opacity="0.35" />
      <path
        d="M0,-14 L4,-4 L15,-4 L6,3 L9,14 L0,7 L-9,14 L-6,3 L-15,-4 L-4,-4 Z"
        fill={NAVY}
      />
    </svg>
  );
}

function StatPill({ icon, label, value, valueNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, background: NAVY, borderRadius: 999, padding: "7px 16px 7px 7px", minWidth: 0 }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(201,162,39,0.18)", border: `1px solid ${GOLD}66`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, color: GOLD_LIGHT, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {valueNode || value}
        </div>
      </div>
    </div>
  );
}

export function CertificateDetail() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    certApi.getCertData(id).then(setCert).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleDownloadImage = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: CREAM });
      const link = document.createElement("a");
      link.download = `certificado-${cert?.verification_code || id}.png`;
      link.href = dataUrl;
      link.click();
    } catch {}
    setDownloading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-8 h-8 border-2 rounded-full animate-spin" />
    </div>
  );
  if (!cert) return <EmptyState title={t("enterprise.certifications.detail.notFound")} />;

  const verifyUrl = `${window.location.origin}/verify/${cert.verification_code}`;
  const defaultHeader = t("enterprise.certifications.detail.defaultHeader");

  return (
    <div className="w-full" style={{ maxWidth: 720, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');
      `}</style>

      <div className="flex justify-end mb-4">
        <button onClick={handleDownloadImage} disabled={downloading} className="ank-btn-ghost text-xs" style={{ opacity: downloading ? 0.7 : 1 }}>
          <ArrowDownTrayIcon className="h-3.5 w-3.5" /> {downloading ? t("enterprise.certifications.detail.generating") : t("enterprise.certifications.detail.download")}
        </button>
      </div>

      {/* Certificate card */}
      <div ref={cardRef} className="ank-cert-card" style={{ position: "relative", background: CREAM, borderRadius: 22, boxShadow: "0 24px 70px rgba(0,0,0,0.45)", padding: 12 }}>
        {/* outer gold frame */}
        <div style={{ position: "absolute", inset: 12, border: `2px solid ${GOLD}`, borderRadius: 14, pointerEvents: "none" }} />

        {/* Medallion — sibling of the clipped inner wrapper so it isn't cut off */}
        <div style={{ position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)", width: 66, height: 66, borderRadius: "50%", background: NAVY, border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(0,0,0,0.35)", zIndex: 2 }}>
          <AcademicCapIcon style={{ width: 28, height: 28, color: GOLD_LIGHT }} />
        </div>

        <div style={{ position: "relative", border: `1px solid ${GOLD}99`, borderRadius: 16, margin: 6, overflow: "hidden" }}>

          {/* Top ribbon */}
          <div style={{ position: "relative", height: 108 }}>
            <RibbonTop />
            <p style={{ position: "absolute", top: 34, left: 0, right: 0, textAlign: "center", color: GOLD_LIGHT, fontSize: 13, fontWeight: 800, letterSpacing: "0.22em" }}>
              {(cert.company_name || "").toUpperCase()}
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: "18px 40px 32px", textAlign: "center" }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 42, fontWeight: 800, color: NAVY, letterSpacing: "0.03em", lineHeight: 1.1 }}>
              {(cert.header_text || defaultHeader).split(" ")[0]}
            </h1>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 6 }}>
              <span style={{ width: 46, height: 1, background: GOLD }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                {(cert.header_text || defaultHeader).split(" ").slice(1).join(" ") || t("enterprise.certifications.detail.ofAchievement")}
              </span>
              <span style={{ width: 46, height: 1, background: GOLD }} />
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, color: "#8A8365", textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 28 }}>{t("enterprise.certifications.detail.thisCertifies")}</p>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 30, fontWeight: 800, color: NAVY, marginTop: 8 }}>{cert.holder_name}</h2>
            <div style={{ width: 130, height: 2, background: GOLD, margin: "10px auto 0" }} />

            {cert.body_text && (
              <p style={{ fontSize: 13, color: "#5C5847", lineHeight: 1.7, marginTop: 16, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>{cert.body_text}</p>
            )}

            <p style={{ fontSize: 17, fontWeight: 700, color: "#3949AB", marginTop: 10 }}>{cert.template_name}</p>

            {/* Stat pills */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 26 }}>
              <StatPill
                icon={<CalendarIcon style={{ width: 13, height: 13, color: GOLD_LIGHT }} />}
                label={t("enterprise.certifications.detail.stats.issued")}
                value={cert.issued_at ? formatDate(cert.issued_at_iso || cert.issued_at, language) : "—"}
              />
              <StatPill
                icon={<CalendarIcon style={{ width: 13, height: 13, color: GOLD_LIGHT }} />}
                label={t("enterprise.certifications.detail.stats.expires")}
                value={cert.expires_at ? formatDate(cert.expires_at_iso || cert.expires_at, language) : t("enterprise.certifications.myCertifications.noExpiry")}
              />
              {cert.score != null && (
                <StatPill
                  icon={<ShieldCheckIcon style={{ width: 13, height: 13, color: GOLD_LIGHT }} />}
                  label={t("enterprise.certifications.detail.stats.score")}
                  value={`${cert.score}%`}
                />
              )}
              <StatPill
                icon={<ShieldCheckIcon style={{ width: 13, height: 13, color: GOLD_LIGHT }} />}
                label={t("enterprise.certifications.detail.stats.status")}
                valueNode={<StatusBadge status={cert.status} />}
              />
              <StatPill
                icon={<TicketIcon style={{ width: 13, height: 13, color: GOLD_LIGHT }} />}
                label={t("enterprise.certifications.detail.stats.verificationCode")}
                value={cert.verification_code}
              />
            </div>

            {/* Signature / seal / QR row */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 44, gap: 12 }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ width: 110, borderTop: `1px solid ${NAVY}66`, marginTop: 2, paddingTop: 6 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{cert.company_name}</p>
                  <p style={{ fontSize: 10, color: "#8A8365" }}>{t("enterprise.certifications.detail.authorizedSignature")}</p>
                </div>
              </div>

              <MedalSeal />

              <div style={{ textAlign: "center" }}>
                <QRCode url={verifyUrl} alt={t("enterprise.certifications.detail.qrAlt")} />
                <p style={{ fontSize: 9.5, fontWeight: 700, color: "#8A8365", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 6 }}>{t("enterprise.certifications.detail.scanToVerify")}</p>
              </div>
            </div>

            {cert.footer_text && (
              <p style={{ fontSize: 11, color: "#8A8365", fontStyle: "italic", marginTop: 26 }}>{cert.footer_text}</p>
            )}
          </div>

          {/* Bottom ribbon */}
          <div style={{ position: "relative", height: 44 }}>
            <RibbonBottom />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CertificateDetail;
