import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { getWindowScrollY, setWindowScrollY } from "../utils/scrollWindowToTop";

/**
 * ONE global scroll owner (history-entry keyed via location.key).
 *
 * Native browser restoration is disabled (`history.scrollRestoration = "manual"`).
 * Positions are applied in useLayoutEffect (before paint).
 *
 * During POP restore we keep protection on `#owb-scroll-shell` (+ body minHeight)
 * until real route content is tall enough AND (when known) the in-section product
 * card is mounted — so App Footer cannot flash at a deep Y. No scroll→restore loop
 * (that locked the page). No fixed timeouts.
 */

const STORAGE_PREFIX = "owbHistScroll:";
const ANCHOR_ATTR = "data-owb-scroll-id";
const SECTION_ATTR = "data-owb-section";
/** Routes wrapper in App.jsx — Footer is a sibling BELOW this, so minHeight here pushes Footer down. */
const SHELL_ID = "owb-scroll-shell";

if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

export function readHistoryScrollRecord(historyKey) {
  if (!historyKey) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + historyKey);
    if (!raw) return null;
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
    const y = parseInt(raw, 10);
    return Number.isFinite(y) ? { y } : null;
  } catch {
    return null;
  }
}

/** Reserved shell height so Footer stays below a deep restored scroll while content loads. */
export function getReservedScrollMinHeight(historyKey) {
  const y = Math.max(0, Number(readHistoryScrollRecord(historyKey)?.y) || 0);
  if (!(y > 0) || typeof window === "undefined") return null;
  return Math.ceil(y + window.innerHeight);
}

function writeRecord(historyKey, record) {
  if (!historyKey || !record) return;
  try {
    sessionStorage.setItem(
      STORAGE_PREFIX + historyKey,
      JSON.stringify({
        y: Math.max(0, Math.round(Number(record.y) || 0)),
        anchorId: record.anchorId || null,
        anchorOffset:
          record.anchorOffset == null ? null : Math.round(Number(record.anchorOffset)),
        sectionId: record.sectionId || null,
      })
    );
  } catch {
    /* ignore */
  }
}

function qsAttr(attr, value, root = document) {
  if (!value || !root) return null;
  try {
    return root.querySelector(`[${attr}="${CSS.escape(String(value))}"]`);
  } catch {
    return root.querySelector(`[${attr}="${String(value).replace(/"/g, "")}"]`);
  }
}

/**
 * Resolve the clicked product card for a history record.
 * On Home, the same slug can appear in Just Arrived AND a later category row.
 * document.querySelector() always hits Just Arrived first — that is why Back
 * looked like it restored to Arrival. When sectionId was captured on click,
 * only search inside that section (never fall back to a global match).
 */
function findAnchorEl(anchorId, sectionId) {
  if (!anchorId) return null;
  if (sectionId) {
    const section = qsAttr(SECTION_ATTR, sectionId);
    if (!section) return null;
    return qsAttr(ANCHOR_ATTR, anchorId, section);
  }
  return qsAttr(ANCHOR_ATTR, anchorId);
}

function ensureScrollableHeight(targetY) {
  if (!(targetY > 0)) return;
  const need = Math.ceil(targetY + window.innerHeight);
  const current = parseInt(document.body.style.minHeight, 10) || 0;
  if (current < need) {
    document.body.style.minHeight = `${need}px`;
  }
}

/** Push Footer below a deep restored Y while route content is still short. */
function ensureShellHeight(targetY) {
  if (!(targetY > 0)) return;
  const shell = document.getElementById(SHELL_ID);
  if (!shell) return;
  const need = Math.ceil(targetY + window.innerHeight);
  const current = parseInt(shell.style.minHeight, 10) || 0;
  if (current < need) {
    shell.style.minHeight = `${need}px`;
  }
}

function clearShellHeight() {
  const shell = document.getElementById(SHELL_ID);
  if (shell) shell.style.minHeight = "";
}

function ensureRestoreProtection(targetY) {
  ensureScrollableHeight(targetY);
  ensureShellHeight(targetY);
}

/**
 * Real route content height inside #owb-scroll-shell (ignores artificial shell minHeight).
 * body/shell padding must NOT count — otherwise we "finish" too early and Footer flashes.
 */
function measureRealShellHeight() {
  const shell = document.getElementById(SHELL_ID);
  if (!shell) {
    const root = document.getElementById("root");
    return root
      ? Math.max(root.scrollHeight, root.getBoundingClientRect().height)
      : document.body.scrollHeight;
  }
  let h = 0;
  for (let i = 0; i < shell.children.length; i += 1) {
    const child = shell.children[i];
    h = Math.max(h, child.scrollHeight || 0, child.offsetHeight || 0);
  }
  return h;
}

function contentSupportsY(targetY) {
  if (!(targetY > 0)) return true;
  return measureRealShellHeight() >= targetY + Math.min(160, window.innerHeight * 0.15);
}

function applyRecord(record) {
  if (!record) {
    setWindowScrollY(0);
    return { foundAnchor: false, foundSection: false };
  }

  const targetY = Math.max(0, Number(record.y) || 0);
  ensureRestoreProtection(targetY);

  if (record.anchorId) {
    const el = findAnchorEl(record.anchorId, record.sectionId);
    if (el) {
      const offset =
        record.anchorOffset != null && Number.isFinite(Number(record.anchorOffset))
          ? Number(record.anchorOffset)
          : Math.min(160, Math.round(window.innerHeight * 0.2));
      const nextY = Math.max(
        0,
        Math.round(el.getBoundingClientRect().top + getWindowScrollY() - offset)
      );
      ensureRestoreProtection(Math.max(nextY, targetY));
      setWindowScrollY(nextY);
      return { foundAnchor: true, foundSection: true };
    }

    // Card not mounted yet (lazy category / window virtualizer).
    // Keep protection at targetY. If real content is not tall enough yet, park on the
    // section so in-view fetch can run; once tall, hold the saved history Y so the
    // virtualizer can mount the row containing the card.
    if (record.sectionId) {
      const section = qsAttr(SECTION_ATTR, record.sectionId);
      if (section) {
        if (contentSupportsY(targetY)) {
          setWindowScrollY(targetY);
        } else {
          const top = section.getBoundingClientRect().top + getWindowScrollY();
          setWindowScrollY(Math.max(0, Math.round(top - 80)));
        }
        return { foundAnchor: false, foundSection: true };
      }
    }

    setWindowScrollY(targetY);
    return { foundAnchor: false, foundSection: false };
  }

  if (record.sectionId) {
    const section = qsAttr(SECTION_ATTR, record.sectionId);
    if (section) {
      if (contentSupportsY(targetY)) {
        setWindowScrollY(targetY);
      } else {
        const top = section.getBoundingClientRect().top + getWindowScrollY();
        const nextY = Math.max(top - 80, Math.min(targetY, top + section.offsetHeight));
        setWindowScrollY(Number.isFinite(nextY) ? nextY : top);
      }
      return { foundAnchor: false, foundSection: true };
    }
  }

  setWindowScrollY(targetY);
  return { foundAnchor: false, foundSection: false };
}

const ScrollRestoration = () => {
  const { key, pathname, search, hash } = useLocation();
  const navigationType = useNavigationType();

  const prevKeyRef = useRef(key);
  const genRef = useRef(0);
  const observersRef = useRef([]);
  const bodyMinHeightRef = useRef(null);

  const disconnectObservers = () => {
    observersRef.current.forEach((o) => {
      try {
        o.disconnect();
      } catch {
        /* ignore */
      }
    });
    observersRef.current = [];
  };

  const rememberBodyMinHeight = () => {
    if (bodyMinHeightRef.current == null) {
      bodyMinHeightRef.current = document.body.style.minHeight;
    }
  };

  const restoreBodyMinHeight = () => {
    if (bodyMinHeightRef.current != null) {
      document.body.style.minHeight = bodyMinHeightRef.current;
      bodyMinHeightRef.current = null;
    }
  };

  // Continuously persist Y for the active history entry (never pathname-only).
  useEffect(() => {
    const onScroll = () => {
      const prev = readHistoryScrollRecord(key) || {};
      writeRecord(key, { ...prev, y: getWindowScrollY() });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [key]);

  // Capture product/section anchors on press — no preventDefault / no navigation change.
  useEffect(() => {
    const onPointerDown = (event) => {
      if (event.button != null && event.button !== 0) return;
      const card = event.target?.closest?.(`[${ANCHOR_ATTR}]`);
      if (!card) return;
      const anchorId = card.getAttribute(ANCHOR_ATTR);
      if (!anchorId) return;
      const sectionEl = card.closest(`[${SECTION_ATTR}]`);
      const sectionId = sectionEl?.getAttribute(SECTION_ATTR) || null;
      const rect = card.getBoundingClientRect();
      writeRecord(key, {
        y: getWindowScrollY(),
        anchorId,
        anchorOffset: rect.top,
        sectionId,
      });
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [key]);

  // Apply scroll BEFORE paint. This is the only place that owns route scroll.
  useLayoutEffect(() => {
    disconnectObservers();
    const gen = ++genRef.current;

    const prevKey = prevKeyRef.current;
    if (prevKey && prevKey !== key) {
      const y = getWindowScrollY();
      const existing = readHistoryScrollRecord(prevKey) || {};
      writeRecord(prevKey, {
        ...existing,
        y: y > 0 ? y : existing.y || 0,
      });
    }

    if (navigationType === "POP") {
      const record = readHistoryScrollRecord(key) || { y: 0 };
      const targetY = Math.max(0, Number(record.y) || 0);

      if (targetY > 0) {
        rememberBodyMinHeight();
        ensureRestoreProtection(targetY);
      }

      let foundAnchor = false;
      let foundSection = false;
      let lastHeight = measureRealShellHeight();
      let stableHits = 0;
      let finished = false;

      const finish = () => {
        if (gen !== genRef.current || finished) return;
        // Never drop protection until real content can hold the restored Y (Footer stays below).
        if (targetY > 0 && !contentSupportsY(targetY)) return;
        if (record.anchorId && !foundAnchor) return;

        finished = true;
        disconnectObservers();

        const latest = readHistoryScrollRecord(key) || record;
        const el = latest.anchorId
          ? findAnchorEl(latest.anchorId, latest.sectionId)
          : null;
        let finalY = Math.max(0, Number(latest.y) || targetY || 0);
        if (el) {
          const offset =
            latest.anchorOffset != null && Number.isFinite(Number(latest.anchorOffset))
              ? Number(latest.anchorOffset)
              : Math.min(160, Math.round(window.innerHeight * 0.2));
          finalY = Math.max(
            0,
            Math.round(el.getBoundingClientRect().top + getWindowScrollY() - offset)
          );
        }

        // Snap while protection is still active, then remove it in the same turn.
        setWindowScrollY(finalY);
        clearShellHeight();
        restoreBodyMinHeight();
        setWindowScrollY(finalY);
      };

      const tick = () => {
        if (gen !== genRef.current || finished) return;
        const result = applyRecord(record);
        if (result.foundAnchor) foundAnchor = true;
        if (result.foundSection) foundSection = true;

        const h = measureRealShellHeight();
        if (h === lastHeight) stableHits += 1;
        else {
          stableHits = 0;
          lastHeight = h;
        }

        const tallEnough = contentSupportsY(targetY);

        // Home/lazy: wait for the in-section card AND real content height.
        if (record.anchorId) {
          if (foundAnchor && tallEnough && stableHits >= 2) finish();
          return;
        }
        if (record.sectionId) {
          if (foundSection && tallEnough && stableHits >= 2) finish();
          return;
        }
        if (tallEnough && stableHits >= 2) finish();
      };

      tick();

      const ro = new ResizeObserver(() => tick());
      ro.observe(document.body);
      const root = document.getElementById("root");
      if (root) ro.observe(root);
      const shell = document.getElementById(SHELL_ID);
      if (shell) ro.observe(shell);
      observersRef.current.push(ro);

      const mo = new MutationObserver(() => tick());
      mo.observe(document.body, { childList: true, subtree: true });
      observersRef.current.push(mo);
    } else if (hash) {
      clearShellHeight();
      restoreBodyMinHeight();
      const id = decodeURIComponent(String(hash).replace(/^#/, ""));
      const toHash = () => {
        if (gen !== genRef.current) return;
        const el = id ? document.getElementById(id) : null;
        if (el) {
          el.scrollIntoView({ behavior: "auto", block: "start" });
          disconnectObservers();
        } else {
          setWindowScrollY(0);
        }
        writeRecord(key, {
          y: getWindowScrollY(),
          anchorId: null,
          anchorOffset: null,
          sectionId: null,
        });
      };
      toHash();
      const mo = new MutationObserver(() => toHash());
      mo.observe(document.body, { childList: true, subtree: true });
      observersRef.current.push(mo);
    } else {
      clearShellHeight();
      restoreBodyMinHeight();
      setWindowScrollY(0);
      writeRecord(key, {
        y: 0,
        anchorId: null,
        anchorOffset: null,
        sectionId: null,
      });
    }

    prevKeyRef.current = key;

    return () => {
      genRef.current += 1;
      disconnectObservers();
    };
  }, [key, pathname, search, hash, navigationType]);

  return null;
};

export default ScrollRestoration;
