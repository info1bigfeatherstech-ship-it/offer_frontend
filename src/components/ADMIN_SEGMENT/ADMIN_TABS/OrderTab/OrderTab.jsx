import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setActiveTabLabel,
  setSearchInput,
  commitSearch,
  clearSearch,
  setPage,
  setDatePreset,
  commitCustomRange,
  ORDER_TAB_LABEL_TO_BUCKET,
  selectAdminOrdersListQueryArgs,
  selectAdminOrdersSummaryQueryArgs,
} from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersSlice";
import {
  useGetAdminOrdersSummaryQuery,
  useGetAdminOrdersListQuery,
  useGetAdminOrderDetailQuery,
  useGetAdminOrderTrackingQuery,
} from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersApi";
import AdminOrderDetailView from "./AdminOrderDetailView";

const TAB_ORDER = [
  "All",
  "Pending",
  "Confirmed",
  "Processing",
  "In transit",
  "Delivered",
  "Others",
];

function formatInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** Local calendar YYYY-MM-DD */
function toLocalYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ApiErrorBanner({ error }) {
  if (!error) return null;
  const msg =
    error?.data?.message ||
    error?.message ||
    (typeof error?.data === "string" ? error.data : null) ||
    "Something went wrong while loading orders.";
  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      {msg}
    </div>
  );
}

const OrderTab = () => {
  const dispatch = useDispatch();
  const listArgs = useSelector(selectAdminOrdersListQueryArgs);
  const summaryArgs = useSelector(selectAdminOrdersSummaryQueryArgs);
  const ui = useSelector((s) => s.adminOrdersUi);

  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const {
    data: summaryRes,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    error: summaryError,
    isError: summaryIsError,
  } = useGetAdminOrdersSummaryQuery(summaryArgs);

  const {
    data: listRes,
    isLoading: listLoading,
    isFetching: listFetching,
    error: listError,
    isError: listIsError,
  } = useGetAdminOrdersListQuery(listArgs);

  const {
    data: detailRes,
    isLoading: detailLoading,
    error: detailError,
    isError: detailIsError,
  } = useGetAdminOrderDetailQuery(selectedOrderId, {
    skip: !selectedOrderId,
  });

  const {
    data: trackingRes,
    isLoading: trackingLoading,
    isFetching: trackingFetching,
    error: trackingError,
    isError: trackingIsError,
    refetch: refetchTracking,
  } = useGetAdminOrderTrackingQuery(selectedOrderId, {
    skip: !selectedOrderId,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    pollingInterval: selectedOrderId ? 30000 : 0,
  });

  const summary = summaryRes?.data;
  const listPayload = listRes?.data;
  const orders = listPayload?.orders ?? [];
  const pagination = listPayload?.pagination;
  const detailOrder = detailRes?.order;
  const tracking = trackingRes?.tracking || null;

  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  /** Draft dates for Custom range — committed via Apply only */
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [customRangeError, setCustomRangeError] = useState(null);

  const searchDebounceBoot = useRef(true);
  /** Debounced search: commit 500ms after user stops typing (skip first paint) */
  useEffect(() => {
    if (searchDebounceBoot.current) {
      searchDebounceBoot.current = false;
      return undefined;
    }
    const t = setTimeout(() => {
      dispatch(commitSearch());
    }, 500);
    return () => clearTimeout(t);
  }, [ui.searchInput, dispatch]);

  const stats = useMemo(() => {
    const t = summary?.totals;
    if (!t) {
      return [
        { label: "Total orders", value: "—" },
        { label: "Total revenue", value: "—" },
        { label: "Total pending orders", value: "—" },
        { label: "Total completed orders", value: "—" },
      ];
    }
    return [
      { label: "Total orders", value: String(t.totalOrders ?? 0) },
      { label: "Total revenue", value: formatInr(t.totalRevenueInr) },
      { label: "Total pending orders", value: String(t.totalPendingOrders ?? 0) },
      { label: "Total completed orders", value: String(t.totalCompletedOrders ?? 0) },
    ];
  }, [summary]);

  const filters = useMemo(() => {
    const c = summary?.countsByBucket || {};
    return TAB_ORDER.map((label) => {
      const key = ORDER_TAB_LABEL_TO_BUCKET[label];
      const count = key === "all" ? c.all ?? 0 : c[key] ?? 0;
      return { label, count };
    });
  }, [summary]);

  const handleDownloadReport = useCallback(() => {
    const rows = orders.map((o) => ({
      id: o.orderIdDisplay || o.orderId,
      contact: o.contactPhone || "",
      date: formatDateTime(o.createdAt),
      amount: formatInr(o.amountInr),
      status: o.fulfillmentLabel || "",
      items: o.itemCount,
      payment: o.paymentLabel || "",
    }));
    const header = "Order ID,Contact,Date,Amount,Status,Items,Payment";
    const csvContent =
      "data:text/csv;charset=utf-8," +
      header +
      "\n" +
      rows
        .map((o) =>
          [o.id, o.contact, o.date, o.amount, o.status, o.items, o.payment]
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Orders_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [orders]);

  const toggleSelectAll = () => {
    const ids = orders.map((o) => o.orderId);
    if (selectedOrders.length === ids.length) setSelectedOrders([]);
    else setSelectedOrders(ids);
  };

  const toggleSelectOrder = (id) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (selectedOrderId) {
    return (
      <AdminOrderDetailView
        order={detailOrder}
        loading={detailLoading}
        error={detailIsError ? detailError : null}
        tracking={tracking}
        trackingLoading={trackingLoading || trackingFetching}
        trackingError={trackingIsError ? trackingError : null}
        onRefreshTracking={() => refetchTracking()}
        onBack={() => setSelectedOrderId(null)}
      />
    );
  }

  return (
    <div className="p-4 space-y-6 bg-[#F8FAFC] min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Orders</h1>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-lg shadow-sm outline-none"
              value={ui.datePreset}
              onChange={(e) => {
                const v = e.target.value;
                setCustomRangeError(null);
                if (v === "custom") {
                  const toD = new Date();
                  const fromD = new Date(toD.getTime() - 6 * 24 * 60 * 60 * 1000);
                  const toStr = toLocalYmd(toD);
                  const fromStr = toLocalYmd(fromD);
                  setDraftDateFrom(fromStr);
                  setDraftDateTo(toStr);
                  dispatch(commitCustomRange({ from: fromStr, to: toStr }));
                } else {
                  dispatch(setDatePreset(v));
                }
              }}
            >
              <option value="today">Today</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
            {ui.datePreset === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[10px] text-slate-500 uppercase">From</label>
                <input
                  type="date"
                  className="bg-white border border-slate-200 text-xs px-2 py-1 rounded-lg"
                  value={draftDateFrom}
                  onChange={(e) => setDraftDateFrom(e.target.value)}
                />
                <label className="text-[10px] text-slate-500 uppercase">To</label>
                <input
                  type="date"
                  className="bg-white border border-slate-200 text-xs px-2 py-1 rounded-lg"
                  value={draftDateTo}
                  onChange={(e) => setDraftDateTo(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomRangeError(null);
                    if (!draftDateFrom || !draftDateTo) {
                      setCustomRangeError("Select both start and end dates.");
                      return;
                    }
                    if (draftDateFrom > draftDateTo) {
                      setCustomRangeError("Start date must be on or before end date.");
                      return;
                    }
                    const start = new Date(draftDateFrom);
                    const end = new Date(draftDateTo);
                    const maxMs = 366 * 24 * 60 * 60 * 1000;
                    if (end - start > maxMs) {
                      setCustomRangeError("Range cannot exceed 366 days.");
                      return;
                    }
                    dispatch(commitCustomRange({ from: draftDateFrom, to: draftDateTo }));
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
          </div>
          {customRangeError && <p className="text-xs text-red-600">{customRangeError}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={!orders.length}
            className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            Order report
          </button>
          <button
            type="button"
            className="px-4 py-2 text-xs text-white bg-[#2563eb] rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 opacity-60 cursor-not-allowed"
            title="Coming soon"
            disabled
          >
            Create a manual order
          </button>
        </div>
      </div>

      {(summaryIsError || listIsError) && (
        <ApiErrorBanner error={summaryError || listError} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              {stat.label}
            </span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {summaryLoading && !summary ? "…" : stat.value}
            </h3>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between p-2 gap-4 border-b border-slate-100">
          <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto">
            {filters.map((f) => (
              <button
                type="button"
                key={f.label}
                onClick={() => dispatch(setActiveTabLabel(f.label))}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs whitespace-nowrap transition-all ${
                  ui.activeTabLabel === f.label
                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {f.label}
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    ui.activeTabLabel === f.label ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {summaryFetching && !summary ? "…" : f.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto px-2">
            <input
              type="search"
              placeholder="Search orders…"
              value={ui.searchInput}
              onChange={(e) => dispatch(setSearchInput(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") dispatch(commitSearch());
              }}
              className="w-full lg:w-64 pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
            />
            <button
              type="button"
              className="text-xs text-slate-500 px-2"
              onClick={() => dispatch(clearSearch())}
            >
              Clear
            </button>
          </div>
        </div>

        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-4 bg-blue-50 p-3 border-b border-blue-100">
            <span className="text-xs text-blue-700">{selectedOrders.length} selected</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                className="bg-white border border-blue-200 text-blue-700 text-[10px] font-black px-3 py-1 rounded uppercase flex items-center gap-2"
              >
                Bulk actions ▾
              </button>
              {showBulkMenu && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1">
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 text-xs text-slate-400 cursor-not-allowed"
                    disabled
                  >
                    Mark as Ready (API soon)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {(listLoading || listFetching) && orders.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">Loading orders…</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-slate-200">
              <tr className="text-[11px] text-slate-900 uppercase tracking-tight">
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    onChange={toggleSelectAll}
                    checked={orders.length > 0 && selectedOrders.length === orders.length}
                  />
                </th>
                <th className="px-4 py-4 text-[#2563eb]">Order ID</th>
                <th className="px-4 py-4 text-[#2563eb]">Contact</th>
                <th className="px-4 py-4 text-[#2563eb]">Date</th>
                <th className="px-4 py-4 text-[#2563eb] text-right">Amount</th>
                <th className="px-4 py-4 text-[#2563eb] text-center">Status</th>
                <th className="px-4 py-4 text-[#2563eb] text-center">Items</th>
                <th className="px-4 py-4 text-[#2563eb] text-center">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {orders.map((order) => (
                <tr
                  key={order.orderId}
                  onClick={() => setSelectedOrderId(order.orderId)}
                  className={`hover:bg-blue-50/30 transition-colors text-[13px] text-slate-700 cursor-pointer ${
                    selectedOrders.includes(order.orderId) ? "bg-blue-50/40" : ""
                  }`}
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={selectedOrders.includes(order.orderId)}
                      onChange={() => toggleSelectOrder(order.orderId)}
                    />
                  </td>
                  <td className="px-4 py-4 text-slate-900 font-medium">
                    {order.orderIdDisplay || order.orderId}
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-500">{order.contactPhone || "—"}</td>
                  <td className="px-4 py-4 text-slate-400 whitespace-nowrap">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-4 py-4 text-slate-900 text-right">{formatInr(order.amountInr)}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                      {order.fulfillmentLabel || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">{order.itemCount}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-emerald-700 text-xs font-medium">{order.paymentLabel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 text-xs text-slate-600">
            <span>
              Page {pagination.page} of {pagination.totalPages || 1} · {pagination.total} orders
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!pagination.hasPrevPage}
                onClick={() => dispatch(setPage(pagination.page - 1))}
                className="px-3 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => dispatch(setPage(pagination.page + 1))}
                className="px-3 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {!listLoading && orders.length === 0 && !listIsError && (
          <p className="p-8 text-center text-sm text-slate-500">No orders in this range / filter.</p>
        )}
      </div>
    </div>
  );
};

export default OrderTab;
