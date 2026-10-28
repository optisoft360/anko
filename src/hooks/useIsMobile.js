import { useEffect, useState } from "react";

// Phones: below md (720px), the breakpoint of the bottom tab bar.
export const MOBILE_QUERY = "(max-width: 719.98px)";
// Below sm (540px): where the assignment page switches its rows to the phone cards.
export const BELOW_SM_QUERY = "(max-width: 539.98px)";
// Below lg (960px): too narrow for two columns next to the sidebar.
export const BELOW_LG_QUERY = "(max-width: 959.98px)";

const matches = (query) => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;

/** True while the media query matches; follows viewport changes. False where matchMedia is missing. */
export function useMediaQuery(query) {
  const [value, setValue] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(query);
    const onChange = () => setValue(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [query]);
  return value;
}

/** True below md. */
export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}

export { matches as mediaMatches };
export default useIsMobile;
