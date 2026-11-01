import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/language-context";
import { RATE_LIMIT_EVENT } from "@/services/rateLimit";

/** Discreet notice while the API client waits out a 429 and retries. */
export function RateLimitNotice() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer;
    const show = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 4000);
    };
    window.addEventListener(RATE_LIMIT_EVENT, show);
    return () => { window.removeEventListener(RATE_LIMIT_EVENT, show); clearTimeout(timer); };
  }, []);

  if (!visible) return null;
  return (
    <div role="status" aria-live="polite"
      className="fixed bottom-5 left-1/2 z-[10070] -translate-x-1/2 rounded-lg bg-[#0F172A] px-4 py-2.5 text-sm text-white shadow-lg">
      {t("admin.rateLimited")}
    </div>
  );
}

export default RateLimitNotice;
