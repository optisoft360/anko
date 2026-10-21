import { useEffect } from "react";

/**
 * Light theme (palette C) for the signed-in app layouts. On <html> so dialogs rendered
 * in portals get it too; removed on leave, so the landing and auth pages keep their look.
 */
export function useLightTheme() {
  useEffect(() => {
    document.documentElement.classList.add("theme-light");
    return () => document.documentElement.classList.remove("theme-light");
  }, []);
}

export default useLightTheme;
