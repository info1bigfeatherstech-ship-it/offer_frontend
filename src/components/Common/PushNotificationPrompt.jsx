import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  dismissPushPrompt,
  subscribeToWebPush,
} from '../../utils/pushNotifications';

const PushNotificationPrompt = ({ visible, onDismiss }) => {
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const handleEnable = async () => {
    setLoading(true);
    try {
      await subscribeToWebPush();
      toast.success('Notifications enabled — we will remind you about your cart.');
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
    <div className="fixed bottom-4 left-4 right-4 z-[9000] md:left-auto md:right-6 md:max-w-md">
      <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-4">
        <p className="text-sm font-semibold text-gray-900">Get cart reminders</p>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
          Allow notifications to receive alerts when items are waiting in your cart.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Enabling…' : 'Allow notifications'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={loading}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
