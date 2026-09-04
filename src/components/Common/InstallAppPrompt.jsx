import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { AnimatedListItem } from '../ui/animated-list';
import { cn } from '../../lib/utils';
import LOGO from '../../assets/logo2.svg';
import {
  canOfferInstall,
  clearLegacyInstallDismiss,
  isIosDevice,
  isPwaInstalled,
  markExitShownThisSession,
  wasExitShownThisSession,
} from '../../utils/pwaInstallPrompt';
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  subscribeDeferredInstallPrompt,
} from '../../utils/pwaDeferredPrompt';

/**
 * Impressive single install popup (Magic UI Animated List spring).
 * @see https://magicui.design/docs/components/animated-list
 */
const InstallAppPrompt = ({
  enabled = true,
  onVisibilityChange,
  brandName = 'Offer Wale Baba',
}) => {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState('open');
  const [installing, setInstalling] = useState(false);
  const [hasNative, setHasNative] = useState(() => Boolean(getDeferredInstallPrompt()));
  const openDismissedThisVisitRef = useRef(false);
  const installBtnRef = useRef(null);

  const setPromptVisible = useCallback(
    (next, nextMode = 'open') => {
      setVisible(next);
      if (next) setMode(nextMode);
      onVisibilityChange?.(Boolean(next));
    },
    [onVisibilityChange]
  );

  useEffect(() => {
    clearLegacyInstallDismiss();
    if (!enabled || isPwaInstalled()) {
      setVisible(false);
      onVisibilityChange?.(false);
    }
    return subscribeDeferredInstallPrompt((evt) => {
      setHasNative(Boolean(evt));
    });
  }, [enabled, onVisibilityChange]);

  const tryShowOpen = useCallback(() => {
    if (!enabled || !canOfferInstall() || openDismissedThisVisitRef.current) return;
    setPromptVisible(true, 'open');
  }, [enabled, setPromptVisible]);

  const tryShowExit = useCallback(() => {
    if (!enabled || !canOfferInstall()) return;
    if (wasExitShownThisSession()) return;
    markExitShownThisSession();
    setPromptVisible(true, 'exit');
  }, [enabled, setPromptVisible]);

  useEffect(() => {
    if (!enabled) {
      onVisibilityChange?.(false);
      return undefined;
    }

    const openTimer = window.setTimeout(() => {
      if (!canOfferInstall() || openDismissedThisVisitRef.current) {
        onVisibilityChange?.(false);
        return;
      }
      tryShowOpen();
    }, 1200);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') tryShowExit();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onInstalled = () => setPromptVisible(false);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.clearTimeout(openTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [enabled, tryShowOpen, tryShowExit, setPromptVisible, onVisibilityChange]);

  useEffect(() => {
    if (!visible) return undefined;
    const t = window.setTimeout(() => {
      installBtnRef.current?.focus({ preventScroll: true });
    }, 280);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [visible]);

  const handleDismiss = () => {
    openDismissedThisVisitRef.current = true;
    setPromptVisible(false);
  };

  const handleInstall = async () => {
    const deferred = getDeferredInstallPrompt();
    if (!deferred) {
      if (isIosDevice()) {
        toast.info('Tap Share → Add to Home Screen to install.');
        return;
      }
      toast.info('Open browser menu (⋮) → Install app / Add to Home screen.');
      return;
    }

    setInstalling(true);
    try {
      deferred.prompt();
      const choice = await deferred.userChoice;
      clearDeferredInstallPrompt();
      setHasNative(false);
      openDismissedThisVisitRef.current = true;
      setPromptVisible(false);
      if (choice?.outcome === 'accepted') {
        toast.success('App installed — enjoy faster shopping!');
      }
    } catch {
      // ignore
    } finally {
      setInstalling(false);
    }
  };

  if (!enabled || isPwaInstalled()) return null;

  const isIos = isIosDevice() && !hasNative;
  const isExit = mode === 'exit';

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="owb-install-root"
          className="fixed inset-0 z-[9200] flex items-center justify-center px-3 py-[max(0.75rem,env(safe-area-inset-top))] sm:p-6"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-black/55 backdrop-blur-[6px] sm:backdrop-blur-[8px]"
            onClick={handleDismiss}
          />

          <motion.div
            className="relative z-10 w-full max-w-[min(100%,22.5rem)]"
            initial={{ y: 16, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            <AnimatedListItem>
              <figure
                role="dialog"
                aria-modal="true"
                aria-labelledby="owb-install-title"
                className={cn(
                  'relative mx-auto flex max-h-[min(88dvh,34rem)] w-full flex-col overflow-hidden',
                  'rounded-[1.35rem] bg-white sm:rounded-[1.45rem]',
                  'shadow-[0_0_0_1px_rgba(247,162,33,.14),0_18px_48px_rgba(0,0,0,.26)]',
                  'sm:shadow-[0_0_0_1px_rgba(247,162,33,.18),0_0_0_6px_rgba(247,162,33,.06),0_28px_72px_rgba(0,0,0,.28)]'
                )}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-36 sm:h-48"
                  style={{
                    background:
                      'radial-gradient(120% 100% at 50% -30%, rgba(247,162,33,0.42) 0%, rgba(247,162,33,0.12) 38%, transparent 70%)',
                  }}
                  aria-hidden
                />
                <span
                  className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#F7A221] to-transparent"
                  aria-hidden
                />

                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={installing}
                  className="absolute right-2.5 top-2.5 z-20 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 sm:right-3 sm:top-3 sm:p-1.5"
                  aria-label="Close"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-8">
                  <motion.div
                    className="mx-auto"
                    initial={{ scale: 0.88, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.06 }}
                  >
                    <div
                      className="flex size-14 items-center justify-center overflow-hidden rounded-[1rem] bg-white sm:size-16 sm:rounded-[1.15rem]"
                      style={{
                        boxShadow:
                          '0 0 0 1px rgba(0,0,0,.06), 0 10px 24px rgba(247,162,33,.22), 0 4px 10px rgba(0,0,0,.05)',
                      }}
                    >
                      <img
                        src={LOGO}
                        alt={brandName}
                        className="h-[78%] w-[78%] object-contain"
                        draggable={false}
                      />
                    </div>
                  </motion.div>

                  <motion.p
                    className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400 sm:mt-3.5 sm:text-[11px] sm:tracking-[0.18em]"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18, duration: 0.35 }}
                  >
                    {brandName}
                  </motion.p>

                  <motion.h2
                    id="owb-install-title"
                    className="mt-1 flex items-center justify-center gap-1.5 text-center text-[1.35rem] font-bold leading-tight tracking-tight text-[#F7A221] sm:mt-1.5 sm:gap-2 sm:text-[1.75rem]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24, duration: 0.38 }}
                  >
                    <span>{isExit ? `Install ${brandName}` : 'Get The Mobile App'}</span>
                    <svg
                      className="h-[1.05em] w-[1.05em] shrink-0 text-gray-800"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M15.5 1h-7A2.5 2.5 0 006 3.5v17A2.5 2.5 0 008.5 23h7a2.5 2.5 0 002.5-2.5v-17A2.5 2.5 0 0015.5 1zm-3.5 20a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zM16 17.5H8V4h8v13.5z" />
                    </svg>
                  </motion.h2>

                  <motion.p
                    className="mx-auto mt-1.5 max-w-[18rem] text-center text-[12px] leading-relaxed text-gray-500 sm:mt-2 sm:max-w-none sm:text-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.38 }}
                  >
                    {isIos
                      ? 'Tap Share → Add to Home Screen for a full-app shopping experience.'
                      : 'Faster Shopping · Home Screen · Deal Alerts'}
                  </motion.p>

                  <motion.div
                    className="mt-4 flex w-full flex-col gap-1.5 sm:mt-6 sm:gap-2"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.38, duration: 0.4 }}
                  >
                    <button
                      ref={installBtnRef}
                      type="button"
                      onClick={handleInstall}
                      disabled={installing}
                      autoFocus
                      className="group relative inline-flex min-h-[48px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#F7A221] px-4 py-3 text-sm font-bold text-black outline-none transition hover:bg-[#ffb03a] focus-visible:ring-4 focus-visible:ring-[#F7A221]/40 active:scale-[0.98] disabled:opacity-60 sm:py-3.5"
                      style={{
                        boxShadow: '0 8px 22px rgba(247,162,33,.38)',
                      }}
                    >
                      <span
                        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                        aria-hidden
                      />
                      {!installing ? (
                        <motion.svg
                          className="relative h-4 w-4 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          aria-hidden
                          animate={{ y: [0, 2, 0] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </motion.svg>
                      ) : null}
                      <span className="relative">
                        {installing ? 'Opening…' : isIos ? 'Show install steps' : 'Install app'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDismiss}
                      disabled={installing}
                      className="min-h-[44px] w-full rounded-xl px-4 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-50 hover:text-gray-700 sm:py-2.5"
                    >
                      Not now
                    </button>
                  </motion.div>
                </div>
              </figure>
            </AnimatedListItem>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default InstallAppPrompt;
