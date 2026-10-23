import { useEffect, useState } from "react";

// Phones: below md (720px), the breakpoint of the bottom tab bar.
export const MOBILE_QUERY = "(max-width: 719.98px)";

/** True below md; follows viewport changes. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return isMobile;
}

export default useIsMobile;
