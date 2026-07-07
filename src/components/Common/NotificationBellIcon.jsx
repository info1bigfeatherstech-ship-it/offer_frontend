import React, { memo } from 'react';
import { Bell } from 'lucide-react';

function badgeText(count) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  return n > 9 ? '9+' : String(n);
}

/**
 * Reusable notification bell — header swap slot or drawer row.
 * Shake + red badge only when count > 0 (caller passes count from RTK unread query).
 */
const NotificationBellIcon = memo(
  ({
    count = 0,
    onClick,
    variant = 'header',
    shaking = true,
    className = '',
    showLabel = true,
    ariaLabel,
  }) => {
    const unread = Number(count) || 0;
    const badge = badgeText(unread);
    const shouldShake = shaking && unread > 0;

    if (variant === 'drawerRow') {
      return (
        <button
          type="button"
          onClick={onClick}
          className={`w-full flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-all font-bold text-sm group text-left ${className}`}
          aria-label={ariaLabel || (unread > 0 ? `${unread} unread notifications` : 'Notifications')}
        >
          <span className="relative p-2 bg-[#F7A221]/10 rounded-lg group-hover:scale-110 transition-transform shrink-0">
            <Bell
              size={22}
              className={`text-[#F7A221] ${shouldShake ? 'bell-shake' : ''}`}
              strokeWidth={2}
            />
            {badge && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center border border-white font-bold">
                {badge}
              </span>
            )}
          </span>
          <span className="flex-1 group-hover:text-[#F7A221]">Notifications</span>
          {unread > 0 && (
            <span className="text-[10px] font-bold text-[#F7A221] bg-[#F7A221]/10 px-2 py-0.5 rounded-full shrink-0">
              {unread} unread
            </span>
          )}
        </button>
      );
    }

    /* header — same footprint as hamburger menu button */
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex flex-col items-center cursor-pointer group bg-transparent border-0 p-0 ${className}`}
        aria-label={ariaLabel || `${unread} unread notifications`}
      >
        <div className="relative p-1 md:p-1.5 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
          <Bell
            size={20}
            className={`w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-6 md:h-6 text-red-600 ${shouldShake ? 'bell-shake' : ''}`}
            strokeWidth={2.2}
          />
          {badge && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[9px] md:text-[10px] min-w-[16px] h-4 md:h-[18px] px-0.5 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm">
              {badge}
            </span>
          )}
        </div>
        {showLabel && (
          <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold mt-0.5 uppercase tracking-tighter text-red-600 group-hover:text-red-700">
            Alerts
          </span>
        )}
      </button>
    );
  }
);

NotificationBellIcon.displayName = 'NotificationBellIcon';

export default NotificationBellIcon;
