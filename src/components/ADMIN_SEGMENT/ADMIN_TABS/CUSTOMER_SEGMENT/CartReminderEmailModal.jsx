import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSendBulkCartReminderEmailMutation } from '../../ADMIN_REDUX_MANAGEMENT/userAnalyticsApi';

const REASON_LABELS = {
  EMPTY_CART: 'Empty cart — skipped',
  NO_VALID_EMAIL: 'No valid email — skipped',
  USER_NOT_IN_SCOPE_OR_NOT_FOUND: 'Not found — skipped',
  SEND_FAILED: 'Send failed',
};

function statusLabel(detail) {
  if (!detail) return 'Unknown';
  if (detail.status === 'sent') return 'Sent';
  if (detail.reason && REASON_LABELS[detail.reason]) return REASON_LABELS[detail.reason];
  if (detail.status === 'failed') return detail.reason || 'Failed';
  if (detail.status === 'skipped') return detail.reason || 'Skipped';
  return detail.status;
}

function statusTone(detail) {
  if (detail?.status === 'sent') return 'text-emerald-700 bg-emerald-50 border-emerald-100';
  if (detail?.status === 'failed') return 'text-red-700 bg-red-50 border-red-100';
  return 'text-amber-700 bg-amber-50 border-amber-100';
}

const PHASE_META = {
  review: {
    title: 'Send cart reminder',
    subtitle: (n) => `Review ${n} recipient${n === 1 ? '' : 's'} before sending`,
  },
  sending: {
    title: 'Sending emails',
    subtitle: () => 'Please wait — do not close this window',
  },
  done: {
    title: 'Delivery complete',
    subtitle: () => 'Cart reminder emails have been processed',
  },
  error: {
    title: 'Delivery failed',
    subtitle: () => 'Emails could not be sent',
  },
};

/**
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Array<{ _id: string, name?: string, email?: string, cartItemsCount?: number }>} props.recipients
 */
const CartReminderEmailModal = ({ isOpen, onClose, recipients = [] }) => {
  const [phase, setPhase] = useState('review');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [sendLocked, setSendLocked] = useState(false);
  const sendInFlightRef = useRef(false);
  const [sendCartReminderEmail] = useSendBulkCartReminderEmailMutation();

  const userIds = useMemo(
    () => recipients.map((r) => r._id).filter(Boolean),
    [recipients]
  );

  const withCart = recipients.filter((r) => (r.cartItemsCount || 0) > 0).length;
  const emptyCart = recipients.length - withCart;
  const meta = PHASE_META[phase] || PHASE_META.review;

  // Reset only when modal opens/closes — never when phase changes
  useEffect(() => {
    if (!isOpen) {
      setPhase('review');
      setResult(null);
      setErrorMessage('');
      setSendLocked(false);
      sendInFlightRef.current = false;
      document.body.style.overflow = '';
      return undefined;
    }

    setPhase('review');
    setResult(null);
    setErrorMessage('');
    setSendLocked(false);
    sendInFlightRef.current = false;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Block Escape while sending
  useEffect(() => {
    if (!isOpen || phase !== 'sending') return undefined;
    const blockEsc = (e) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    document.addEventListener('keydown', blockEsc);
    return () => document.removeEventListener('keydown', blockEsc);
  }, [isOpen, phase]);

  const handleSend = async () => {
    if (!userIds.length || sendInFlightRef.current || sendLocked) return;

    sendInFlightRef.current = true;
    setSendLocked(true);
    setPhase('sending');
    setErrorMessage('');

    try {
      const res = await sendCartReminderEmail(userIds).unwrap();
      setResult(res);
      setPhase('done');
    } catch (err) {
      setErrorMessage(
        err?.data?.message || err?.message || 'Could not send cart reminder emails.'
      );
      setPhase('error');
      sendInFlightRef.current = false;
      setSendLocked(false);
    }
  };

  const detailRows = useMemo(() => {
    if (!result?.details?.length) return [];
    return result.details.filter((d) => d.userId || d.email);
  }, [result]);

  if (!isOpen) return null;

  const canClose = phase !== 'sending';

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={canClose ? onClose : undefined}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-reminder-modal-title"
          className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`px-6 py-5 text-white ${
              phase === 'error'
                ? 'bg-gradient-to-r from-red-600 to-rose-600'
                : phase === 'done'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                  : phase === 'sending'
                    ? 'bg-gradient-to-r from-slate-700 to-slate-900'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="cart-reminder-modal-title" className="text-lg font-bold tracking-tight">
                  {meta.title}
                </h3>
                <p className="text-white/85 text-sm mt-1">
                  {meta.subtitle(recipients.length)}
                </p>
              </div>
              {canClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="px-6 py-5 min-h-[220px]">
            {phase === 'review' && (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {recipients.length} selected
                  </span>
                  {withCart > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                      {withCart} with cart items
                    </span>
                  )}
                  {emptyCart > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-100">
                      {emptyCart} empty cart — will skip
                    </span>
                  )}
                </div>

                <ul className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {recipients.map((r) => (
                    <li
                      key={r._id}
                      className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2.5 border border-slate-100"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {r.name || 'Customer'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{r.email || 'No email'}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase shrink-0 px-2 py-0.5 rounded-full bg-violet-50 text-violet-800 border border-violet-100">
                        Cart: {r.cartItemsCount || 0}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  Each customer will receive a personalized email with their cart items and order total.
                </p>
              </>
            )}

            {phase === 'sending' && (
              <div className="py-10 flex flex-col items-center text-center">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-9 h-9 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-base font-semibold text-slate-900">Sending cart reminders</p>
                <p className="text-sm text-slate-500 mt-2 max-w-sm">
                  Delivering to {recipients.length} recipient{recipients.length === 1 ? '' : 's'}.
                  This may take a few seconds.
                </p>
                <div className="w-full max-w-sm h-2 bg-slate-100 rounded-full mt-8 overflow-hidden">
                  <div className="cart-reminder-progress h-full rounded-full bg-indigo-500" />
                </div>
                <p className="text-xs text-slate-400 mt-4 font-medium uppercase tracking-wide">
                  Processing…
                </p>
              </div>
            )}

            {phase === 'done' && result && (
              <div className="py-2">
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-lg font-bold text-slate-900">Done</p>
                  <p className="text-sm text-slate-500 mt-1">{result.message}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{result.sent ?? 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Sent</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">{result.skipped ?? 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Skipped</p>
                  </div>
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{result.failed ?? 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-red-600">Failed</p>
                  </div>
                </div>

                {detailRows.length > 0 && (
                  <ul className="max-h-40 overflow-y-auto space-y-1.5 text-xs border border-slate-100 rounded-xl p-2 bg-slate-50">
                    {detailRows.map((d, i) => (
                      <li
                        key={d.userId || d.email || i}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${statusTone(d)}`}
                      >
                        <span className="truncate font-medium">{d.email || d.userId}</span>
                        <span className="shrink-0 font-bold">{statusLabel(d)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {phase === 'error' && (
              <div className="py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  !
                </div>
                <p className="text-lg font-bold text-slate-900">Could not complete delivery</p>
                <p className="text-sm text-red-600 mt-2 px-2 leading-relaxed">{errorMessage}</p>
                <p className="text-xs text-slate-500 mt-4">
                  Verify server email settings and try again.
                </p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
            {phase === 'review' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sendLocked}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!userIds.length || sendLocked}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
                >
                  Send {recipients.length} email{recipients.length === 1 ? '' : 's'}
                </button>
              </>
            )}
            {phase === 'sending' && (
              <p className="text-xs text-slate-500 w-full text-center font-medium">
                Sending in progress — please wait
              </p>
            )}
            {phase === 'done' && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                Done
              </button>
            )}
            {phase === 'error' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  Retry
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cartReminderProgress {
          0% { width: 8%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 8%; margin-left: 92%; }
        }
        .cart-reminder-progress {
          animation: cartReminderProgress 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default CartReminderEmailModal;
