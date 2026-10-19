import { formatDate } from "@/utils/calendarDate";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Typography, Button, Input } from "@material-tailwind/react";
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/solid";
import { certApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { APP_NAME } from "@/config/app";

function QRCodeDisplay({ url, alt }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
  return <img src={qrUrl} alt={alt} className="h-32 w-32 rounded-xl border border-zinc-200" />;
}

export function PublicVerification() {
  const { identifier } = useParams();
  const { t, language } = useLanguage();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(!!identifier);
  const [searchCode, setSearchCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | valid | invalid | not_found

  const verify = async (code) => {
    if (!code) return;
    setLoading(true);
    try {
      const data = await certApi.verifyPublic(code);
      setResult(data);
      setStatus(data.is_valid ? "valid" : data.status === "revoked" ? "invalid" : "invalid");
    } catch (err) {
      if (err?.status === 404 || err?.detail?.includes("not found")) setStatus("not_found");
      else setStatus("invalid");
      setResult(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (identifier) verify(identifier); }, [identifier]);

  const handleSearch = (e) => { e.preventDefault(); verify(searchCode); };

  const rows = result ? [
    { label: t("enterprise.certifications.publicVerification.rows.holder"), value: result.holder_name },
    { label: t("enterprise.certifications.publicVerification.rows.template"), value: result.template_name },
    { label: t("enterprise.certifications.publicVerification.rows.company"), value: result.company_name },
    { label: t("enterprise.certifications.publicVerification.rows.issued"), value: result.issued_at ? formatDate(result.issued_at, language) : "—" },
    { label: t("enterprise.certifications.publicVerification.rows.expires"), value: result.expires_at ? formatDate(result.expires_at, language) : t("enterprise.certifications.myCertifications.noExpiry") },
    { label: t("enterprise.certifications.publicVerification.rows.score"), value: result.score != null ? `${result.score}%` : "—" },
    { label: t("enterprise.certifications.publicVerification.rows.certNumber"), value: result.certificate_number },
    { label: t("enterprise.certifications.publicVerification.rows.verificationCode"), value: result.verification_code },
  ] : [];

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Typography variant="h4" className="font-extrabold text-zinc-900">{APP_NAME}</Typography>
          <Typography variant="small" className="text-zinc-400 font-medium">{t("enterprise.certifications.publicVerification.subtitle")}</Typography>
        </div>

        {/* Search box */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <div className="flex-1">
            <Input
              label={t("enterprise.certifications.publicVerification.inputLabel")}
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder={t("enterprise.certifications.publicVerification.inputPlaceholder")}
            />
          </div>
          <Button type="submit" color="indigo" className="normal-case flex-shrink-0">{t("enterprise.certifications.publicVerification.verifyBtn")}</Button>
        </form>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-10 w-10 rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        )}

        {/* Valid certificate */}
        {!loading && status === "valid" && result && (
          <div className="bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden">
            <div className="bg-green-600 px-6 py-4 flex items-center gap-3">
              <CheckCircleIcon className="h-8 w-8 text-white flex-shrink-0" />
              <Typography variant="h6" className="text-white font-extrabold">{t("enterprise.certifications.publicVerification.valid.title")}</Typography>
            </div>
            <div className="p-6 space-y-3">
              {rows.map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <span className="text-xs font-bold text-zinc-400 uppercase w-32 flex-shrink-0 pt-0.5">{row.label}</span>
                  <span className="text-sm font-semibold text-zinc-800 font-mono">{row.value}</span>
                </div>
              ))}
              {result.verification_code && (
                <div className="pt-4 flex justify-center">
                  <QRCodeDisplay url={`${window.location.origin}/verify/${result.verification_code}`} alt={t("enterprise.certifications.detail.qrAlt")} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invalid / revoked */}
        {!loading && status === "invalid" && (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
            <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
              <XCircleIcon className="h-8 w-8 text-white flex-shrink-0" />
              <Typography variant="h6" className="text-white font-extrabold">{t("enterprise.certifications.publicVerification.invalid.title")}</Typography>
            </div>
            <div className="p-6">
              <Typography className="text-zinc-600 font-medium">
                {t("enterprise.certifications.publicVerification.invalid.statusLabel")} <span className="font-bold text-red-600 capitalize">{result?.status || t("enterprise.certifications.publicVerification.invalid.defaultStatus")}</span>
              </Typography>
              <Typography variant="small" className="text-zinc-400 mt-2">{t("enterprise.certifications.publicVerification.invalid.message")}</Typography>
            </div>
          </div>
        )}

        {/* Not found */}
        {!loading && status === "not_found" && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="bg-amber-500 px-6 py-4 flex items-center gap-3">
              <ExclamationCircleIcon className="h-8 w-8 text-white flex-shrink-0" />
              <Typography variant="h6" className="text-white font-extrabold">{t("enterprise.certifications.publicVerification.notFound.title")}</Typography>
            </div>
            <div className="p-6">
              <Typography className="text-zinc-600 font-medium">{t("enterprise.certifications.publicVerification.notFound.message")}</Typography>
              <Typography variant="small" className="text-zinc-400 mt-2">{t("enterprise.certifications.publicVerification.notFound.hint")}</Typography>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicVerification;
