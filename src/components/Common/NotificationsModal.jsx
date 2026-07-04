import React, { memo, useCallback, useEffect } from 'react';
import { CheckCheck, ExternalLink, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useGetUnreadNotificationCountQuery,
  useLazyGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation
} from '../REDUX_FEATURES/REDUX_SLICES/notificationsApi';

function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  }).format(d);
}

function renderBodyWithLinks(text, policyUrl) {
  const body = String(text || '');
  const url = policyUrl || null;
  const urlMatch = body.match(/https?:\/\/[^\s]+/);
  const link = urlMatch ? urlMatch[0].replace(/[.,)]+$/, '') : url;

  if (!link) return <span>{body}</span>;

  const parts = body.split(link);
  return (
    <span>
      {parts[0]}
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#F7A221] font-semibold underline underline-offset-2 break-all"
        onClick={(e) => e.stopPropagation()}
      >
        refund policy
      </a>
      {parts[1] || ''}
    </span>
  );
}

function typeBadgeClass(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'refund_processed') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (t === 'refund_initiated') return 'bg-indigo-50 text-indigo-800 border-indigo-200';
  if (t === 'rto_initiated') return 'bg-blue-50 text-blue-800 border-blue-200';
  if (t === 'refund_rejected') return 'bg-red-50 text-red-700 border-red-200';
  if (t === 'refund_failed') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-900 border-amber-200';
}

const NotificationsModal = memo(({ open, onClose }) => {
  const navigate = useNavigate();

  const { data: unreadCount = 0, isFetching: countLoading } = useGetUnreadNotificationCountQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: false
  });

  const [fetchNotifications, { data: listData, isFetching: listLoading, isError: listError }] =
    useLazyGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  const notifications = listData?.notifications || [];
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    if (open) {
      fetchNotifications({ page: 1, limit: 25 });
    }
  }, [open, fetchNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    const onEsc = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  const handleItemClick = useCallback(
    async (item) => {
      if (!item?.read && item?.id) {
        try {
          await markRead(item.id).unwrap();
        } catch {
          /* non-blocking */
        }
      }
      onClose?.();
      navigate('/account/userorders', { state: { highlightOrderId: item.orderId } });
    },
    [markRead, navigate, onClose]
  );

  const handleMarkAll = useCallback(async () => {
    try {
      await markAllRead().unwrap();
    } catch {
      /* ignore */
    }
  }, [markAllRead]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-start justify-center p-3 sm:p-4 pt-[72px] sm:pt-20 lg:pt-24">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Close notifications"
        onClick={onClose}
      />

      <div
        className="relative z-[710] bg-white border border-gray-200 shadow-2xl overflow-hidden flex flex-col w-full max-w-md max-h-[min(78vh,520px)] rounded-2xl animate-slideDown"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50/80 to-white shrink-0">
          <div>
            <p className="text-sm font-black text-gray-900">Notifications</p>
            <p className="text-[11px] text-gray-500">
              {countLoading ? 'Updating…' : hasUnread ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {hasUnread && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={markingAll}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                title="Mark all as read"
              >
                {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 overscroll-contain min-h-0">
          {listLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 size={18} className="animate-spin text-[#F7A221]" />
              Loading…
            </div>
          )}

          {!listLoading && listError && (
            <p className="py-8 px-4 text-center text-sm text-red-600">Could not load notifications.</p>
          )}

          {!listLoading && !listError && notifications.length === 0 && (
            <p className="py-10 px-4 text-center text-sm text-gray-500">No notifications yet.</p>
          )}

          {!listLoading &&
            !listError &&
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-orange-50/40 transition-colors ${
                  item.read ? 'bg-white' : 'bg-orange-50/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${typeBadgeClass(item.type)}`}
                      >
                        {item.type?.replace(/_/g, ' ') || 'update'}
                      </span>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" aria-label="Unread" />
                      )}
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-snug">{item.title}</p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed break-words">
                      {renderBodyWithLinks(item.body, item.metadata?.policyUrl)}
                    </p>
                    {item.orderId && (
                      <p className="text-[10px] font-mono text-gray-400 mt-1.5">#{item.orderId}</p>
                    )}
                  </div>
                  <ExternalLink size={14} className="text-gray-300 shrink-0 mt-1" />
                </div>
                <p className="text-[10px] text-gray-400 mt-2">{fmtWhen(item.sentAt)}</p>
              </button>
            ))}
        </div>

        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/80 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              navigate('/account/userorders');
            }}
            className="w-full text-center text-xs font-bold text-[#F7A221] hover:underline"
          >
            View all orders
          </button>
        </div>
      </div>
    </div>
  );
});

NotificationsModal.displayName = 'NotificationsModal';

export default NotificationsModal;
