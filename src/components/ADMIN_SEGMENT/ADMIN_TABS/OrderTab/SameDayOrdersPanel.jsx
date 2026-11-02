import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import axiosInstance from "../../../../SERVICES/axiosInstance";
import { formatInr } from "../../../../utils/formatInr";
import { selectAdminUser } from "../../ADMIN_REDUX_MANAGEMENT/adminAuthSlice";
import { canViewOrdersRevenue } from "../../roles";
import SameDayOrderDetailView from "./SameDayOrderDetailView";

const SDD_TABS = [
  { id: "pending", label: "Pending" },
  { id: "shipped", label: "Shipped" },
  { id: "cancelled", label: "Cancelled" },
];

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

function toLocalYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdStartIso(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function ymdEndIso(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

const SameDayOrdersPanel = () => {
  const adminUser = useSelector(selectAdminUser);
  const showRevenue = canViewOrdersRevenue(adminUser?.role);

  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState("none");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customRangeError, setCustomRangeError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0, limit: 20 });
  const [counts, setCounts] = useState({ pending: 0, shipped: 0, cancelled: 0 });
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const searchActive = Boolean(search);
  const dateFilterActive = datePreset !== "none";

  const dateQuery = useMemo(() => {
    if (searchActive) return { rangePreset: "all" };
    if (datePreset === "today") return { rangePreset: "today" };
    if (datePreset === "last7") return { rangePreset: "last7" };
    if (datePreset === "last30") return { rangePreset: "last30" };
    if (datePreset === "custom" && customFrom && customTo) {
      const from = ymdStartIso(customFrom);
      const to = ymdEndIso(customTo);
      if (from && to) return { from, to };
    }
    return { rangePreset: "all" };
  }, [searchActive, datePreset, customFrom, customTo]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await axiosInstance.get("/admin/same-day-delivery/orders/summary", {
        params: dateQuery,
        authContext: "admin",
      });
      if (res.data?.success) {
        setSummary(res.data.data || null);
        const tabs = res.data.data?.countsByTab || {};
        setCounts({
          pending: tabs.pending || 0,
          shipped: tabs.shipped || 0,
          cancelled: tabs.cancelled || 0,
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load same-day summary.");
    } finally {
      setSummaryLoading(false);
    }
  }, [dateQuery]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/admin/same-day-delivery/orders", {
        params: {
          tab,
          page,
          limit: 20,
          search: search || undefined,
          ...dateQuery,
        },
        authContext: "admin",
      });
      if (res.data?.success) {
        setOrders(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, totalPages: 0, total: 0, limit: 20 });
      } else {
        setOrders([]);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load same-day orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, dateQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const openOrder = async (orderId) => {
    setDetailLoading(true);
    try {
      const res = await axiosInstance.get(
        `/admin/same-day-delivery/orders/${encodeURIComponent(orderId)}`,
        { authContext: "admin" }
      );
      if (res.data?.success) {
        setSelected(res.data.data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load order.");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshAfterAction = async (orderId) => {
    await Promise.all([fetchOrders(), fetchSummary()]);
    if (orderId) await openOrder(orderId);
  };

  const handleDownloadReport = () => {
    if (!orders.length) return;
    const rows = orders.map((o) => ({
      id: o.orderId,
      contact: o.phone || "",
      date: formatDateTime(o.createdAt),
      amount: formatInr(o.totalAmount),
      status: o.orderStatus || "",
      pincode: o.pincode || "",
      payment: o.paymentStatus || "",
    }));
    const header = "Order ID,Contact,Date,Amount,Status,Pincode,Payment";
    const csvContent =
      "data:text/csv;charset=utf-8," +
      header +
      "\n" +
      rows
        .map((o) =>
          [o.id, o.contact, o.date, o.amount, o.status, o.pincode, o.payment]
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "Same_Day_Orders_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      {
        label: "Total revenue",
        value: showRevenue && t.totalRevenueInr != null ? formatInr(t.totalRevenueInr) : "—",
      },
      { label: "Total pending orders", value: String(t.totalPendingOrders ?? 0) },
      { label: "Total completed orders", value: String(t.totalCompletedOrders ?? 0) },
    ];
  }, [summary, showRevenue]);

  if (selected) {
    return (
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[#F8FAFC] min-h-screen">
        <SameDayOrderDetailView
          orderId={selected.orderId}
          sddOrder={selected}
          loading={detailLoading}
          onBack={() => setSelected(null)}
          onRefresh={() => refreshAfterAction(selected.orderId)}
        />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[#F8FAFC] min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Same Day Orders</h1>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-lg shadow-sm outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                value={datePreset}
                disabled={searchActive}
                title={
                  searchActive
                    ? "Date range paused while searching — Clear search to filter by date"
                    : undefined
                }
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomRangeError(null);
                  setPage(1);
                  if (v === "none") {
                    setDatePreset("none");
                    setCustomFrom("");
                    setCustomTo("");
                    setDraftDateFrom("");
                    setDraftDateTo("");
                    return;
                  }
                  if (v === "custom") {
                    const toD = new Date();
                    const fromD = new Date(toD.getTime() - 6 * 24 * 60 * 60 * 1000);
                    const toStr = toLocalYmd(toD);
                    const fromStr = toLocalYmd(fromD);
                    setDraftDateFrom(fromStr);
                    setDraftDateTo(toStr);
                    setCustomFrom(fromStr);
                    setCustomTo(toStr);
                    setDatePreset("custom");
                    return;
                  }
                  setDatePreset(v);
                }}
              >
                <option value="none">All dates</option>
                <option value="today">Today</option>
                <option value="last7">Last 7 days</option>
                <option value="last30">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>
              {dateFilterActive && !searchActive && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomRangeError(null);
                    setDraftDateFrom("");
                    setDraftDateTo("");
                    setCustomFrom("");
                    setCustomTo("");
                    setDatePreset("none");
                    setPage(1);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1.5 rounded-lg border border-blue-200 bg-blue-50"
                >
                  Clear filter
                </button>
              )}
              {datePreset === "custom" && !searchActive && (
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
                      if (end - start > 366 * 24 * 60 * 60 * 1000) {
                        setCustomRangeError("Range cannot exceed 366 days.");
                        return;
                      }
                      setCustomFrom(draftDateFrom);
                      setCustomTo(draftDateTo);
                      setPage(1);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
          {searchActive ? (
            <p className="text-xs text-slate-500">
              Searching all dates (order ID, name, phone, pincode) — Clear search to use the date filter again.
            </p>
          ) : (
            <p className="text-xs text-slate-500">Counts and revenue are same-day orders only.</p>
          )}
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white px-3 py-2.5 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {stat.label}
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5 leading-tight">
              {summaryLoading && !summary ? "…" : stat.value}
            </h3>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex w-full min-w-0 flex-nowrap items-center p-1.5 sm:p-2 border-b border-slate-100 gap-2">
          {SDD_TABS.map((f) => (
            <button
              type="button"
              key={f.id}
              onClick={() => {
                setTab(f.id);
                setPage(1);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                tab === f.id
                  ? "bg-blue-50 text-blue-600 border border-blue-200"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {f.label}
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  tab === f.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[f.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-2.5 py-2 border-b border-slate-100">
          <input
            type="search"
            placeholder="Search orders..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput.trim());
                setPage(1);
              }
            }}
            className="w-full min-w-0 max-w-sm pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
          />
          <button
            type="button"
            className="text-xs font-medium text-blue-600 px-2 shrink-0"
            onClick={() => {
              setSearchInput("");
              setSearch("");
              setPage(1);
            }}
          >
            Clear
          </button>
        </div>

        {loading && orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No same-day orders in this tab.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-slate-200">
                <tr className="text-[11px] text-slate-900 uppercase tracking-tight">
                  <th className="px-4 py-4 text-[#2563eb]">Order ID</th>
                  <th className="px-4 py-4 text-[#2563eb]">Contact</th>
                  <th className="px-4 py-4 text-[#2563eb]">Date</th>
                  <th className="px-4 py-4 text-[#2563eb] text-right">Amount</th>
                  <th className="px-4 py-4 text-[#2563eb] text-center">Status</th>
                  <th className="px-4 py-4 text-[#2563eb]">Pincode</th>
                  <th className="px-4 py-4 text-[#2563eb] text-center">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {orders.map((order) => (
                  <tr
                    key={order.orderId}
                    onClick={() => openOrder(order.orderId)}
                    className="hover:bg-blue-50/30 transition-colors text-[13px] text-slate-700 cursor-pointer"
                  >
                    <td className="px-4 py-4 text-slate-900 font-medium">{order.orderId}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-800">{order.name || "—"}</div>
                      <div className="text-xs text-slate-500">{order.phone || "—"}</div>
                    </td>
                    <td className="px-4 py-4">{formatDateTime(order.createdAt)}</td>
                    <td className="px-4 py-4 text-right font-medium">{formatInr(order.totalAmount)}</td>
                    <td className="px-4 py-4 text-center capitalize">{order.orderStatus}</td>
                    <td className="px-4 py-4">{order.pincode || "—"}</td>
                    <td className="px-4 py-4 text-center capitalize">{order.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-600">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SameDayOrdersPanel;
