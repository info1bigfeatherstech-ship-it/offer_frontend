import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  dismissPushPrompt,
  getNotificationPermission,
  recordPushPromptImpression,
  subscribeToWebPush,
} from '../../utils/pushNotifications';

const PENDING_LOGIN_KEY = 'owb_push_subscribe_after_login';

/**
 * Soft single notification prompt — Magic UI card look, one smooth enter.
 * https://magicui.design/docs/components/animated-list
 */
const PushNotificationPrompt = ({
  visible,
  onDismiss,
  isLoggedIn = false,
  onNeedLogin,
  brandName = 'Offer Wale Baba',
}) => {
  const [loading, setLoading] = useState(false);
  const impressionRecordedRef = useRef(false);
  const permission = getNotificationPermission();
  const isDenied = permission === 'denied';

  useEffect(() => {
    if (!visible) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (!impressionRecordedRef.current) {
      impressionRecordedRef.current = true;
      recordPushPromptImpression({ isLoggedIn: Boolean(isLoggedIn) }).catch(() => {});
    }

    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible, isLoggedIn]);

  const handleEnable = async () => {
    if (isDenied) {
      toast.info(
        'Notifications are blocked. Site settings → Notifications → Allow, then refresh.'
      );
      return;
    }

    if (!isLoggedIn) {
      try {
        sessionStorage.setItem(PENDING_LOGIN_KEY, '1');
      } catch {
        // ignore
      }
      toast.info('Please login to enable notifications.');
      onNeedLogin?.();
      return;
    }

    setLoading(true);
    try {
      await subscribeToWebPush();
      toast.success('Notifications enabled.');
      onDismiss?.();
    } catch (err) {
      toast.error(err?.message || 'Could not enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    dismissPushPrompt();
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="owb-push-root"
          className="fixed inset-0 z-[9100] flex items-center justify-center px-3 py-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:py-6 md:px-8"
          role="dialog"
          aria-label="Enable notifications"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-black/50 backdrop-blur-[4px] sm:backdrop-blur-sm"
            onClick={handleDismiss}
          />

          <motion.div
            key="owb-push-prompt"
            className="relative z-10 w-full max-w-[min(100%,28rem)] sm:max-w-[30rem] md:max-w-[32rem]"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22, mass: 0.85 }}
          >
            <figure
              className="relative max-h-[min(88dvh,34rem)] overflow-hidden rounded-2xl bg-white px-6 py-5 transition-all duration-200 ease-in-out sm:px-8 sm:py-6 sm:hover:scale-[1.02] md:px-9 md:py-7"
              style={{
                boxShadow:
                  '0 0 0 1px rgba(0,0,0,.04), 0 8px 28px rgba(0,0,0,.14)',
              }}
            >
              <span
                className="absolute inset-x-0 top-0 h-[2px] bg-[#F7A221]"
                aria-hidden
              />

              <div className="flex items-start gap-3.5 pl-3 sm:gap-4 sm:pl-5">
                <div
                  className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl"
                  style={{ backgroundColor: isDenied ? '#9CA3AF' : '#F7A221' }}
                  aria-hidden
                >
                  <svg
                    className="h-5 w-5 text-black sm:h-[1.35rem] sm:w-[1.35rem]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 pr-1">
                      <p className="text-[15px] font-semibold leading-snug text-gray-900 sm:text-base">
                        {isDenied ? 'Notifications blocked' : 'Allow Notifications'}
                        <span className="font-normal text-gray-400"> · {brandName}</span>
                      </p>
                      <p className="mt-1.5 text-[13px] leading-snug text-gray-500 sm:text-sm">
                        {isDenied
                          ? 'Enable in browser site settings, then refresh.'
                          : 'Wishlist, Deals & New Product Alerts.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDismiss}
                      disabled={loading}
                      className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                      aria-label="Close"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-6">
                <button
                  type="button"
                  onClick={handleEnable}
                  disabled={loading}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-black px-6 py-2.5 text-sm font-bold text-white transition hover:bg-gray-900 active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? 'Please wait…' : isDenied ? 'How to enable' : 'Allow'}
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={loading}
                  className="inline-flex min-h-[44px] items-center rounded-full px-5 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
                >
                  Not now
                </button>
              </div>
            </figure>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default PushNotificationPrompt;
