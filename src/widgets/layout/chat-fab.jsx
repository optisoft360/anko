import { useEffect, useRef, useState } from "react";
import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/solid";
import { useMaterialTailwindController, setOpenConfigurator } from "@/context";

// Phones only (below md, same breakpoint as the bottom tab bar).
const MOBILE_QUERY = "(max-width: 719.98px)";

/**
 * Floating button that opens the chat panel. Same button as before; on phones it
 * slides away while the page scrolls down and comes back on scroll up, so it never
 * sits on top of the content being read (M-06). Desktop behaviour is unchanged.
 */
export function ChatFab() {
  const [, dispatch] = useMaterialTailwindController();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (!mq.matches) { setHidden(false); lastY.current = y; return; }
      if (Math.abs(y - lastY.current) < 6) return;
      setHidden(y > lastY.current && y > 24);
      lastY.current = y;
    };
    const onChange = () => { if (!mq.matches) setHidden(false); };
    window.addEventListener("scroll", onScroll, { passive: true });
    mq.addEventListener?.("change", onChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener?.("change", onChange);
    };
  }, []);

  return (
    <button
      className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 rounded-full flex items-center justify-center cursor-pointer transition-[transform,opacity] duration-200 ${
        hidden ? "translate-y-[150%] opacity-0 pointer-events-none" : ""}`}
      style={{ width: 44, height: 44, background: "var(--accent)", border: "none", boxShadow: "0 4px 16px rgba(94,106,210,0.4)" }}
      onClick={() => setOpenConfigurator(dispatch, true)}
      aria-label="Chat"
      data-testid="chat-fab"
    >
      <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-white" />
    </button>
  );
}

export default ChatFab;
