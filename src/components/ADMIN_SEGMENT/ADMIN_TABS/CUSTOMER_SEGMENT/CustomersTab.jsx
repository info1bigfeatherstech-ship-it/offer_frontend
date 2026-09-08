// ADMIN_TABS/CustomersTab.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  useGetAllUsersQuery,
  useGetEngagementSummaryQuery,
} from '../../ADMIN_REDUX_MANAGEMENT/userAnalyticsApi';
import axiosInstance, { AUTH_CONTEXT_ADMIN } from '../../../../SERVICES/axiosInstance';
import CartDetailsModal from './CartDetailsModal';
import CartReminderEmailModal from './CartReminderEmailModal';
import CartReminderPushModal from './CartReminderPushModal';
import CustomerDetailsModal from './CustomerDetailsModal';
import BulkActionsMenu from './BulkActionsMenu';
import LeadsAutoPushToggle from './LeadsAutoPushToggle';
import { DateTimeCell } from './adminDateTime';

const ENGAGEMENT_FILTERS = [
  { id: 'all', label: 'All', hint: 'Everyone in scope', group: 'base' },
  {
    id: 'push_and_pwa',
    label: 'App + Notifications',
    hint: 'Installed app and notifications on',
    group: 'combo',
    featured: true,
  },
  { id: 'push_on', label: 'Notifications on', hint: 'Push subscribed', group: 'notify' },
  { id: 'push_off', label: 'Notifications off', hint: 'No active push', group: 'notify' },
  { id: 'pwa_on', label: 'App installed', hint: 'PWA attributed', group: 'app' },
  { id: 'pwa_off', label: 'App not installed', hint: 'No PWA record', group: 'app' },
];

function engagementFilterLabel(id) {
  return ENGAGEMENT_FILTERS.find((f) => f.id === id)?.label || 'All';
}

const CustomersTab = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [engagementFilter, setEngagementFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedUserMeta, setSelectedUserMeta] = useState({});
  const [showUserModal, setShowUserModal] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [cartModalUserId, setCartModalUserId] = useState(null);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [cartReminderOpen, setCartReminderOpen] = useState(false);
  const [cartReminderRecipients, setCartReminderRecipients] = useState([]);
  const [cartPushOpen, setCartPushOpen] = useState(false);
  const [cartPushRecipients, setCartPushRecipients] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  const openCartDetails = useCallback((userId) => {
    setCartModalUserId(userId);
    setIsCartModalOpen(true);
  }, []);

  const closeCartDetails = useCallback(() => {
    setIsCartModalOpen(false);
    setCartModalUserId(null);
  }, []);

  useEffect(() => {
    setPage(1);
    setSelectedUsers([]);
    setSelectedUserMeta({});
  }, [engagementFilter, roleFilter, searchTerm]);

  const {
    data: summaryRes,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetEngagementSummaryQuery();

  const { data, isLoading, error, isFetching, refetch } = useGetAllUsersQuery({
    page,
    limit: 10,
    search: searchTerm,
    role: roleFilter,
    engagement: engagementFilter,
  });

  const users = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };
  const summary = summaryRes?.data || {};

  const snapshotUser = useCallback((user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    cartItemsCount: user.cartItemsCount || 0,
  }), []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map((u) => u._id));
      setSelectedUserMeta((prev) => {
        const next = { ...prev };
        users.forEach((u) => {
          next[u._id] = snapshotUser(u);
        });
        return next;
      });
    } else {
      setSelectedUsers([]);
      setSelectedUserMeta({});
    }
  };

  const handleSelectUser = (user) => {
    const id = user._id;
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    setSelectedUserMeta((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = snapshotUser(user);
      }
      return next;
    });
  };

  const openCartReminderModal = useCallback((recipientList) => {
    if (!recipientList?.length) return;
    setCartReminderRecipients(recipientList);
    setCartReminderOpen(true);
  }, []);

  const closeCartReminderModal = useCallback(() => {
    setCartReminderOpen(false);
    setCartReminderRecipients([]);
  }, []);

  const openCartPushModal = useCallback((recipientList) => {
    if (!recipientList?.length) return;
    setCartPushRecipients(recipientList);
    setCartPushOpen(true);
  }, []);

  const closeCartPushModal = useCallback(() => {
    setCartPushOpen(false);
    setCartPushRecipients([]);
  }, []);

  const buildRecipientsFromSelection = useCallback(() => {
    return selectedUsers.map((id) => {
      if (selectedUserMeta[id]) return selectedUserMeta[id];
      const fromPage = users.find((u) => u._id === id);
      if (fromPage) return snapshotUser(fromPage);
      return { _id: id, name: 'Customer', email: '—', cartItemsCount: 0 };
    });
  }, [selectedUsers, selectedUserMeta, users, snapshotUser]);

  const openCustomerDetails = useCallback((user) => {
    setActiveUser(user);
    setShowUserModal(true);
  }, []);

  const shareToWhatsApp = (user) => {
    const message = `Hello ${user.name},\nCheck out our latest collection at: ${window.location.origin}`;
    const phone = user.phone || ""; 
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleBulkCartEmail = () => {
    if (selectedUsers.length === 0) return;
    openCartReminderModal(buildRecipientsFromSelection());
  };

  const handleBulkCartPush = () => {
    if (selectedUsers.length === 0) return;
    openCartPushModal(buildRecipientsFromSelection());
  };

  const handleSingleCartEmail = (user) => {
    if (!user?._id) return;
    if ((user.cartItemsCount || 0) === 0) {
      toast.warning('This customer has an empty cart.');
      return;
    }
    openCartReminderModal([snapshotUser(user)]);
  };

  const handleExportCustomers = useCallback(async () => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const res = await axiosInstance.get('/admin/analytics/users/export', {
        responseType: 'blob',
        timeout: 120000,
        authContext: AUTH_CONTEXT_ADMIN,
      });

      const contentType = String(res.headers['content-type'] || '');
      if (contentType.includes('application/json')) {
        const text = await res.data.text();
        let msg = 'Export failed';
        try {
          msg = JSON.parse(text)?.message || msg;
        } catch {
          /* ignore */
        }
        toast.error(msg);
        return;
      }

      const blob = res.data;
      if (!(blob instanceof Blob) || blob.size === 0) {
        toast.error('Export returned an empty file. Please try again.');
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const filename = `customers_export_${today}.xlsx`;
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(url);
      }
      toast.success('Customers exported successfully!');
    } catch (err) {
      const msg =
        err?.response?.data instanceof Blob
          ? 'Export failed — server error'
          : err?.response?.data?.message || err?.message || 'Export failed';
      toast.error(msg);
    } finally {
      setExportLoading(false);
    }
  }, [exportLoading]);

  if (isLoading) return <div className="p-20 text-center animate-pulse">Loading Customers...</div>;

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Customers</h2>
          <p className="text-sm text-slate-500">
            Customer list with notification and app-install status. Filter, select, then send offers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              refetchSummary();
              refetch();
            } catch {
              // ignore
            }
          }}
          className="self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {summaryError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Engagement summary could not load. Customer list still works.
        </div>
      ) : (
        <div className="grid w-full min-w-0 grid-cols-2 min-[780px]:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => setEngagementFilter('all')}
            className={`rounded-xl border bg-white p-2.5 sm:p-3 text-left transition hover:border-slate-300 min-w-0 overflow-hidden ${
              engagementFilter === 'all' ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">Total</p>
            <p className="mt-0.5 text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
              {summaryLoading ? '…' : summary.scopedCustomers ?? 0}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setEngagementFilter('push_on')}
            className={`rounded-xl border bg-white p-2.5 sm:p-3 text-left transition hover:border-emerald-300 min-w-0 overflow-hidden ${
              engagementFilter === 'push_on' ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-slate-200'
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">Notifications on</p>
            <p className="mt-0.5 text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
              {summaryLoading ? '…' : summary.pushNotificationUsers ?? 0}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500 line-clamp-2 leading-snug">
              {summary.pushNotificationDevices ?? 0} devices · {summary.pushNotificationUsersOff ?? 0} off
            </p>
          </button>
          <button
            type="button"
            onClick={() => setEngagementFilter('pwa_on')}
            className={`rounded-xl border bg-white p-2.5 sm:p-3 text-left transition hover:border-indigo-300 min-w-0 overflow-hidden ${
              engagementFilter === 'pwa_on' ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200'
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">App installed</p>
            <p className="mt-0.5 text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
              {summaryLoading ? '…' : summary.pwaInstallUsers ?? 0}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500 truncate">
              {summary.pwaInstallUsersOff ?? 0} not installed
            </p>
          </button>
          <button
            type="button"
            onClick={() => setEngagementFilter('push_and_pwa')}
            className={`rounded-xl border bg-white p-2.5 sm:p-3 text-left transition hover:border-violet-300 min-w-0 overflow-hidden ${
              engagementFilter === 'push_and_pwa'
                ? 'border-violet-700 ring-1 ring-violet-700'
                : 'border-slate-200'
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500 truncate">
              App + Notifications
            </p>
            <p className="mt-0.5 text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
              {summaryLoading ? '…' : summary.pushAndPwaUsers ?? 0}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">Best for promos</p>
          </button>
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 min-w-0 overflow-hidden">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">In this list</p>
            <p className="mt-0.5 text-lg sm:text-xl font-bold text-slate-900 tabular-nums">{pagination.total ?? 0}</p>
            <p className="mt-0.5 text-[10px] text-slate-500 truncate">{engagementFilterLabel(engagementFilter)}</p>
          </div>
        </div>
      )}

      {/* Search & Actions Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-4 space-y-3">
        <div className="w-full min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              List filters
            </p>
            <p className="text-[11px] text-slate-400">
              {engagementFilterLabel(engagementFilter)} · {pagination.total ?? 0} shown
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Customer list filters"
          >
            {ENGAGEMENT_FILTERS.map((f) => {
              const active = engagementFilter === f.id;
              const featured = Boolean(f.featured);
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={f.hint}
                  onClick={() => setEngagementFilter(f.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    active
                      ? featured
                        ? 'border-violet-700 bg-violet-700 text-white shadow-sm'
                        : 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : featured
                        ? 'border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* One toolbar row (matches 80% zoom look at 100% on 14") */}
        <div className="border-t border-slate-100 pt-3 flex flex-nowrap items-center gap-2 overflow-x-auto">
          <div className="relative min-w-[200px] max-w-sm flex-1 shrink">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input
              type="text"
              placeholder="Search name, email, phone…"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <LeadsAutoPushToggle showWishlist={false} />
          <select
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none shrink-0"
            onChange={(e) => setRoleFilter(e.target.value)}
            value={roleFilter}
          >
            <option value="">All Roles</option>
            <option value="user">Customer</option>
            <option value="wholesaler">Wholesaler</option>
          </select>
          <button
            type="button"
            id="export-customers-xlsx-btn"
            onClick={handleExportCustomers}
            disabled={exportLoading}
            className="px-4 cursor-pointer py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            title="Export all customers to Excel"
          >
            {exportLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span>Exporting…</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export Data</span>
              </>
            )}
          </button>
          <BulkActionsMenu
            count={selectedUsers.length}
            onCartEmail={handleBulkCartEmail}
            onCartPush={handleBulkCartPush}
          />
        </div>
        {error ? (
          <div className="text-sm text-red-600">Could not load customers. Try refresh.</div>
        ) : null}
        {isFetching && !isLoading ? (
          <div className="text-xs text-slate-400">Updating…</div>
        ) : null}
      </div>

      {/* Table — horizontal scroll on ~12" / narrow admin content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[880px] text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  onChange={handleSelectAll}
                  checked={selectedUsers.length === users.length && users.length > 0}
                />
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notifications</th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">App</th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cart / Wish</th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                  No customers found for this filter.
                </td>
              </tr>
            ) : null}
            {users.map((user) => (
              <tr
                key={user._id}
                onClick={() => openCustomerDetails(user)}
                className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
              >
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    checked={selectedUsers.includes(user._id)}
                    onChange={() => handleSelectUser(user)}
                  />
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      {user.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                      {user.phone ? (
                        <div className="text-xs text-gray-400 truncate">{user.phone}</div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                  {user.notificationsEnabled ? (
                    <div>
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        On · {user.pushDeviceCount || 0} device{(user.pushDeviceCount || 0) === 1 ? '' : 's'}
                      </span>
                      {user.pushSubscribedAt ? (
                        <div className="mt-1">
                          <DateTimeCell iso={user.pushSubscribedAt} />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                      Off
                    </span>
                  )}
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                  {user.pwaInstalled ? (
                    <div>
                      <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        Installed
                      </span>
                      {user.pwaInstalledAt ? (
                        <div className="mt-1">
                          <DateTimeCell iso={user.pwaInstalledAt} />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                      Not installed
                    </span>
                  )}
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCartDetails(user._id);
                      }}
                      className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-md font-medium hover:bg-purple-100 transition-colors cursor-pointer"
                      title="View cart items"
                    >
                      🛒 {user.cartItemsCount || 0}
                    </button>
                    <span className="text-xs bg-pink-50 text-pink-600 px-2 py-1 rounded-md font-medium">❤️ {user.wishlistCount || 0}</span>
                  </div>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                  <DateTimeCell iso={user.createdAt} />
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleSingleCartEmail(user)}
                      disabled={!(user.cartItemsCount > 0)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                      title={
                        user.cartItemsCount > 0
                          ? 'Send cart reminder email'
                          : 'Empty cart — no reminder email'
                      }
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => shareToWhatsApp(user)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                      title="Share to WhatsApp"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCustomerDetails(user)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View customer details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Omitted for brevity, use similar styling) */}

      <CartDetailsModal
        isOpen={isCartModalOpen}
        onClose={closeCartDetails}
        userId={cartModalUserId}
      />

      <CartReminderEmailModal
        isOpen={cartReminderOpen}
        onClose={closeCartReminderModal}
        recipients={cartReminderRecipients}
      />

      <CartReminderPushModal
        isOpen={cartPushOpen}
        onClose={closeCartPushModal}
        recipients={cartPushRecipients}
      />

      <CustomerDetailsModal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setActiveUser(null);
        }}
        userId={activeUser?._id}
        initialUser={activeUser}
        onViewCart={(id) => openCartDetails(id)}
      />

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center bg-white p-4 rounded-2xl border border-gray-200">
        <span className="text-sm text-gray-500">
          {pagination.total || 0} total · Page {page} of {pagination.totalPages || 1}
        </span>
        <div className="flex gap-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Prev
          </button>
          <button 
            disabled={page === pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomersTab;

