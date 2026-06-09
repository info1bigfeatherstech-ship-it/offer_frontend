import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  useGetLeadsPushSettingsQuery,
  useUpdateLeadsPushSettingsMutation,
} from '../../ADMIN_REDUX_MANAGEMENT/userAnalyticsApi';

const LeadsAutoPushToggle = () => {
  const { data, isLoading, isFetching } = useGetLeadsPushSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateLeadsPushSettingsMutation();
  const [enabled, setEnabled] = useState(false);

  const settings = data?.data;
  const pushConfigured = settings?.pushConfigured !== false;
  const hourIst = settings?.autoPushHourIst ?? 11;
  const busy = isLoading || isSaving || isFetching;

  useEffect(() => {
    if (settings) {
      setEnabled(Boolean(settings.autoPushEnabled));
    }
  }, [settings?.autoPushEnabled, settings]);

  const handleToggle = async () => {
    if (!pushConfigured) {
      toast.warning('Web push is not configured on the server (VAPID keys).');
      return;
    }

    const next = !enabled;
    setEnabled(next);
    try {
      await updateSettings({ autoPushEnabled: next }).unwrap();
      toast.success(
        next
          ? `Auto cart push enabled (daily ~${hourIst}:00 IST)`
          : 'Auto cart push disabled'
      );
    } catch (err) {
      setEnabled(!next);
      toast.error(err?.data?.message || 'Could not update auto push setting');
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl border shrink-0 ${
        enabled
          ? 'bg-violet-50 border-violet-200'
          : 'bg-gray-50 border-gray-200'
      } ${!pushConfigured ? 'opacity-60' : ''}`}
      title={
        pushConfigured
          ? `Daily auto push at ~${hourIst}:00 IST for cart users who allowed notifications`
          : 'Configure VAPID keys on server to enable push'
      }
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-800 whitespace-nowrap">Auto push</p>
        <p className="text-[10px] text-gray-500 whitespace-nowrap hidden sm:block">
          {enabled ? `On · ~${hourIst}:00 IST` : 'Off'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle auto cart reminder push notifications"
        disabled={busy || !pushConfigured}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled ? 'bg-violet-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

export default LeadsAutoPushToggle;
