import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Loader2, X } from "lucide-react";
import {
  approveDropshipperRequest,
  getDropshipperRequest,
  listDropshipperRequests,
  rejectDropshipperRequest,
} from "../../../../SERVICES/adminDropshipperApi";
import { selectAdminUser } from "../../ADMIN_REDUX_MANAGEMENT/adminAuthSlice";
import { ROLES } from "../../roles";
import { ListPager, SearchRow, StatusPill } from "./dropshipperUi";
import {
  apiErrorMessage,
  formatDateTime,
  formatInr,
  labelize,
} from "./dropshipperFormat";

const LIMIT = 20;

const BUCKETS = [
  {
    id: "pending",
    label: "Pending",
    statuses: ["pending_payment", "pending_admin"],
  },
  {
    id: "approved",
    label: "Approved",
    statuses: ["pending_otp", "active", "expired", "suspended"],
  },
  { id: "rejected", label: "Rejected", statuses: ["rejected"] },
  { id: "all", label: "All", statuses: null },
];

async function loadBucket({ bucket, page, search }) {
  const match = BUCKETS.find((item) => item.id === bucket) || BUCKETS[0];
  const params = { page, limit: LIMIT };
  if (search) params.q = search;

  if (!match.statuses || match.statuses.length === 1) {
    if (match.statuses) params.status = match.statuses[0];
    else params.status = "all";
    return listDropshipperRequests(params);
  }

  const results = await Promise.all(
    match.statuses.map((status) => listDropshipperRequests({ ...params, status }))
  );
  const requests = results
    .flatMap((result) => result?.requests || [])
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const total = results.reduce((sum, result) => sum + (result?.pagination?.total || 0), 0);
  const totalPages = Math.max(...results.map((result) => result?.pagination?.totalPages || 1), 1);
  return {
    success: true,
    requests,
    pagination: { page, limit: LIMIT, total, totalPages },
  };
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-1 break-words text-sm text-gray-800">{children || "—"}</div>
    </div>
  );
}

function Proof({ url, label }) {
  if (!url) return <Field label={label}>—</Field>;
  return (
    <Field label={label}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-blue-600"
      >
        Open file
      </a>
      <img
        src={url}
        alt=""
        className="mt-2 max-h-36 rounded-lg border border-gray-200 object-contain"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </Field>
  );
}

export default function RequestsTab() {
  const adminUser = useSelector(selectAdminUser);
  const canWrite = String(adminUser?.role || "").toLowerCase() === ROLES.ADMIN;

  const [bucket, setBucket] = useState("pending");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState("");
  const [acting, setActing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadBucket({ bucket, page, search });
      setRows(data?.requests || []);
      setPagination(data?.pagination || { page, total: 0, totalPages: 1 });
    } catch (err) {
      setRows([]);
      toast.error(apiErrorMessage(err, "Could not load dropshipper requests"));
    } finally {
      setLoading(false);
    }
  }, [bucket, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape" && !acting) setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, acting]);

  const openDetail = async (row) => {
    setSelected(row);
    setNote(row.adminDecisionNote || "");
    setDetailLoading(true);
    try {
      const data = await getDropshipperRequest(row.id);
      if (data?.request) {
        setSelected(data.request);
        setNote(data.request.adminDecisionNote || "");
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not refresh this request"));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDecision = async (kind) => {
    if (!canWrite || !selected?.id || acting) return;
    setActing(kind);
    try {
      const action = kind === "approve" ? approveDropshipperRequest : rejectDropshipperRequest;
      const data = await action(selected.id, { note });
      const warn = kind === "approve" && data?.otpSent === false;
      toast[warn ? "warn" : "success"](
        data?.message || (kind === "approve" ? "Application approved" : "Application rejected")
      );
      if (data?.request) setSelected(data.request);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not update this request"));
    } finally {
      setActing(null);
    }
  };

  const canApprove =
    canWrite &&
    selected?.status === "pending_admin" &&
    selected?.payment?.status === "paid";
  const canReject =
    canWrite &&
    ["pending_admin", "pending_otp", "pending_payment"].includes(selected?.status);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Registration requests</h3>
        <p className="mt-1 text-sm text-gray-500">
          Pending is awaiting payment or review. Approved covers activation through active accounts.
          Approve and reject stay admin-only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {BUCKETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setBucket(item.id);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              bucket === item.id
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
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Payment</th>
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
                    No requests in this view.
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
                      <StatusPill status={row.adminStatus} />
                      <p className="mt-1 text-[11px] capitalize text-gray-400">{labelize(row.status)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.payment?.status} />
                      <p className="mt-1 text-[11px] text-gray-400">{formatInr(row.amountDueInr)}</p>
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
          onClick={() => {
            if (!acting) setSelected(null);
          }}
        >
          <div
            className="my-6 w-full max-w-3xl rounded-2xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{selected.fullName || "Request"}</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusPill status={selected.adminStatus} />
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

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
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
                <Field label="Amount due">{formatInr(selected.amountDueInr)}</Field>
                <Field label="Amount paid">{formatInr(selected.amountPaidInr)}</Field>
                <Field label="Payment">{labelize(selected.payment?.status)}</Field>
                <Field label="Permanent address">{selected.permanentAddress}</Field>
                <Field label="Business address">{selected.businessAddress}</Field>
                <Field label="Delivery address">{selected.deliveryAddress}</Field>
                <Field label="Decision note">{selected.adminDecisionNote}</Field>
                <Field label="Reviewed">{formatDateTime(selected.reviewedAt)}</Field>
                <Field label="Created">{formatDateTime(selected.createdAt)}</Field>
                <Proof url={selected.idProofUrl} label="ID proof" />
                <Proof url={selected.businessAddressProofUrl} label="Business address proof" />
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-gray-900">Note (optional)</span>
                <textarea
                  value={note}
                  maxLength={500}
                  disabled={!canWrite || Boolean(acting)}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  placeholder="Shown on the application after you approve or reject"
                />
              </label>

              {!canWrite ? (
                <p className="text-sm text-amber-800">Only an admin can approve or reject.</p>
              ) : null}
              {canWrite && selected.status === "pending_payment" ? (
                <p className="text-sm text-gray-500">Payment has to be verified before approval.</p>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                disabled={!canReject || Boolean(acting)}
                onClick={() => handleDecision("reject")}
                className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-40"
              >
                {acting === "reject" ? "Rejecting…" : "Reject"}
              </button>
              <button
                type="button"
                disabled={!canApprove || Boolean(acting)}
                onClick={() => handleDecision("approve")}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {acting === "approve" ? "Approving…" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
