import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, X } from "lucide-react";
import {
  getDropshipperAccount,
  listDropshipperAccounts,
} from "../../../../SERVICES/adminDropshipperApi";
import { ListPager, SearchRow, StatusPill } from "./dropshipperUi";
import {
  apiErrorMessage,
  formatDateTime,
  formatInr,
  labelize,
} from "./dropshipperFormat";

const LIMIT = 20;
const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "pending_otp", label: "Awaiting activation" },
  { id: "active", label: "Active" },
  { id: "expired", label: "Expired" },
  { id: "suspended", label: "Suspended" },
  { id: "rejected", label: "Rejected" },
];

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-1 break-words text-sm text-gray-800">{children || "—"}</div>
    </div>
  );
}

export default function AccountsTab() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (status !== "all") params.status = status;
      if (search) params.q = search;
      const data = await listDropshipperAccounts(params);
      setRows(data?.accounts || []);
      setPagination(data?.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      setRows([]);
      toast.error(apiErrorMessage(err, "Could not load dropshipper accounts"));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (row) => {
    setSelected(row);
    setDetailLoading(true);
    try {
      const data = await getDropshipperAccount(row.id);
      if (data?.account) setSelected(data.account);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not refresh this account"));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Dropshipper accounts</h3>
        <p className="mt-1 text-sm text-gray-500">
          Activated partners and accounts waiting on OTP. Filter by status or search.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setStatus(item.id);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              status === item.id
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <SearchRow
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Search name, email, phone, or business"
        onSubmit={() => {
          setPage(1);
          setSearch(searchInput.trim());
        }}
        onClear={() => {
          setSearchInput("");
          setSearch("");
          setPage(1);
        }}
      />

      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                    No accounts match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{row.fullName}</p>
                      <p className="text-xs text-gray-500">{row.email}</p>
                      <p className="text-xs text-gray-500">{row.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.businessName || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status}>{labelize(row.status)}</StatusPill>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {row.subscriptionActive ? "Active" : "Not active"}
                      <p>{formatDateTime(row.subscriptionExpiresAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(row.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDetail(row)}
                        className="text-xs font-bold text-blue-600"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <ListPager
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          disabled={loading}
          onChange={setPage}
        />
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="my-6 w-full max-w-3xl rounded-2xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{selected.fullName}</h4>
                <div className="mt-2">
                  <StatusPill status={selected.status}>{labelize(selected.status)}</StatusPill>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
              {detailLoading ? (
                <p className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Refreshing…
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email">{selected.email}</Field>
                <Field label="Phone">{selected.phone}</Field>
                <Field label="WhatsApp">{selected.whatsappNumber}</Field>
                <Field label="Business">{selected.businessName}</Field>
                <Field label="Has shop">{selected.haveShop ? "Yes" : "No"}</Field>
                <Field label="Category">{selected.productCategory}</Field>
                <Field label="Selling from">{selected.sellingPlaceFrom}</Field>
                <Field label="Selling zone">{selected.sellingZoneCity}</Field>
                <Field label="Monthly estimate">{formatInr(selected.monthlyEstimatedPurchase)}</Field>
                <Field label="Subscription ends">{formatDateTime(selected.subscriptionExpiresAt)}</Field>
                <Field label="Subscription started">{formatDateTime(selected.subscriptionStartedAt)}</Field>
                <Field label="Permanent address">{selected.permanentAddress}</Field>
                <Field label="Business address">{selected.businessAddress}</Field>
                <Field label="Delivery address">{selected.deliveryAddress}</Field>
                <Field label="Created">{formatDateTime(selected.createdAt)}</Field>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
