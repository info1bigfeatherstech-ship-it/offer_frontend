import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * ScrollRestoration
 * ─────────────────
 * • POP  (browser back/forward) → restores the saved scroll position
 * • PUSH / REPLACE              → scrolls to top instantly
 *
 * Positions are persisted in sessionStorage so they survive soft reloads
 * but are cleared when the tab is closed.
 */
const ScrollRestoration = () => {
    const location = useLocation();
    const navigationType = useNavigationType();
    const storageKey = useRef("");

    // ── 1. Disable the browser's built-in scroll restoration ────────────────
    useEffect(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
    }, []);

    // ── 2. Save scroll position on every scroll event ───────────────────────
    useEffect(() => {
        storageKey.current = location.pathname + location.search;

        const handleScroll = () => {
            sessionStorage.setItem(
                `scrollPos::${storageKey.current}`,
                String(window.scrollY)
            );
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [location.pathname, location.search]);

    // ── 3. Restore / reset scroll on navigation ─────────────────────────────
    useEffect(() => {
        if (navigationType === "POP") {
            const key = `scrollPos::${location.pathname}${location.search}`;
            const saved = parseInt(sessionStorage.getItem(key), 10);

            if (!isNaN(saved)) {
                // Three staggered attempts — content may render progressively
                const t1 = setTimeout(() => window.scrollTo({ top: saved, behavior: "instant" }), 80);
                const t2 = setTimeout(() => window.scrollTo({ top: saved, behavior: "instant" }), 300);
                const t3 = setTimeout(() => window.scrollTo({ top: saved, behavior: "instant" }), 600);
                return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
            }
        } else {
            // PUSH or REPLACE → start at top
            window.scrollTo({ top: 0, behavior: "instant" });
        }
    }, [location.pathname, location.search, navigationType]);

    return null;
};

export default ScrollRestoration;
