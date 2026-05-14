import React, { useMemo, useState } from "react";
import {
  useDecideAdminReturnRequestMutation,
  useGetAdminReturnRequestDetailQuery,
  useGetAdminReturnRequestsQuery,
  useInitiateAdminReturnRefundMutation,
  useAdminReturnReversePickupRetryMutation,
} from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersApi";

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export default function ReturnsRefundsTab() {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [status, setStatus] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading, error, refetch } = useGetAdminReturnRequestsQuery({
    page: 1,
    limit: 50,
    status: status || undefined,
  });
  const detail = useGetAdminReturnRequestDetailQuery(selectedOrderId, { skip: !selectedOrderId });
  const [decideReturn, decideState] = useDecideAdminReturnRequestMutation();
  const [initiateRefund, refundState] = useInitiateAdminReturnRefundMutation();

  const rows = data?.data || [];
  const selected = detail.data?.order || null;
  const proofs = Array.isArray(selected?.returnInfo?.proofs) ? selected.returnInfo.proofs : [];
  const canApprove = String(selected?.returnInfo?.status || "").toLowerCase() === "requested";
  const canRefund = ["refund_pending", "received", "qc_passed"].includes(
    String(selected?.returnInfo?.status || "").toLowerCase()
  );
  const retSt = String(selected?.returnInfo?.status || "").toLowerCase();
  const hasRev = Boolean(selected?.returnInfo?.reverseAwbCode || selected?.returnInfo?.reverseTrackingNumber);
  const canRetryReverse = retSt === "approval_failed" || (retSt === "approved" && !hasRev);

  const [retryReverse, retryReverseState] = useAdminReturnReversePickupRetryMutation();
  const topError = useMemo(
    () =>
      error?.data?.message ||
      detail.error?.data?.message ||
      decideState.error?.data?.message ||
      refundState.error?.data?.message ||
      retryReverseState.error?.data?.message ||
      null,
    [error, detail.error, decideState.error, refundState.error, retryReverseState.error]
  );

  return (
    <div className="p-4 bg-[#F8FAFC] min-h-screen space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-slate-900">Returns & Refunds</h2>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs"
          >
            <option value="">All statuses</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="pickup_in_progress">Pickup in progress</option>
            <option value="in_transit_to_warehouse">In transit to warehouse</option>
            <option value="refund_pending">Refund pending</option>
            <option value="refunded">Refunded</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {topError && <p className="text-xs text-red-600 font-semibold">{topError}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-black uppercase tracking-widest text-slate-500">
            Requests
          </div>
          <div className="max-h-[70vh] overflow-auto divide-y divide-slate-100">
            {isLoading && <p className="p-4 text-sm text-slate-500">Loading requests...</p>}
            {!isLoading && rows.length === 0 && <p className="p-4 text-sm text-slate-500">No return requests found.</p>}
            {rows.map((r) => (
              <button
                type="button"
                key={r.orderId}
                onClick={() => setSelectedOrderId(r.orderId)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${selectedOrderId === r.orderId ? "bg-blue-50" : ""}`}
              >
                <p className="text-sm font-semibold text-slate-900">{r.orderId}</p>
                <p className="text-xs text-slate-500 mt-1">{r.customerName || "Customer"} · {r.customerPhone || "—"}</p>
                <p className="text-[11px] mt-1 text-slate-600">
                  {r.returnInfo?.reasonType || "—"} · {r.returnInfo?.status || "—"}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-4">
          {!selectedOrderId && <p className="text-sm text-slate-500">Select a request to view details.</p>}
          {selectedOrderId && detail.isLoading && <p className="text-sm text-slate-500">Loading request detail...</p>}
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selected.orderId}</h3>
                  <p className="text-xs text-slate-500">
                    Requested: {fmtDate(selected.returnInfo?.requestedAt)} · Status: {selected.returnInfo?.status || "—"}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-semibold">
                  Payment: {selected.paymentStatus || "—"}
                </span>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                <p><span className="font-semibold">Reason:</span> {selected.returnInfo?.reasonType || "—"}</p>
                <p className="mt-1"><span className="font-semibold">Message:</span> {selected.returnInfo?.reasonMessage || "—"}</p>
                <p className="mt-1"><span className="font-semibold">Reverse status:</span> {selected.returnInfo?.reverseProviderStatus || "—"}</p>
                <p className="mt-1"><span className="font-semibold">Last sync:</span> {fmtDate(selected.returnInfo?.reverseLastSyncAt)}</p>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Proofs</p>
                {proofs.length === 0 ? (
                  <p className="text-sm text-slate-500">No proofs uploaded.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {proofs.map((proof, idx) => (
                      <div key={`${proof.url}-${idx}`} className="rounded-lg border border-slate-100 p-2">
                        {proof.kind === "video" ? (
                          <video src={proof.url} controls className="w-full rounded" />
                        ) : (
                          <img src={proof.url} alt="return proof" className="w-full rounded object-cover max-h-56" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canApprove && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Review action</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason (required for rejection, optional for approval notes)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={decideState.isLoading}
                      onClick={async () => {
                        await decideReturn({
                          orderId: selected.orderId,
                          decision: "approve",
                          decisionReason: rejectReason || undefined,
                        });
                        setRejectReason("");
                      }}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={decideState.isLoading}
                      onClick={async () => {
                        if (!rejectReason.trim()) return;
                        await decideReturn({
                          orderId: selected.orderId,
                          decision: "reject",
                          decisionReason: rejectReason,
                        });
                        setRejectReason("");
                      }}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {canRetryReverse && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Reverse pickup (Shiprocket)
                  </p>
                  <button
                    type="button"
                    disabled={retryReverseState.isLoading}
                    onClick={async () => {
                      await retryReverse({ orderId: selected.orderId });
                    }}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {retryReverseState.isLoading ? "Retrying…" : "Retry reverse pickup"}
                  </button>
                  {selected.returnInfo?.reverseLastError && (
                    <p className="text-xs text-red-600 mt-2">Last error: {selected.returnInfo.reverseLastError}</p>
                  )}
                </div>
              )}

              {canRefund && (
                <div className="border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    disabled={refundState.isLoading}
                    onClick={async () => {
                      await initiateRefund({ orderId: selected.orderId });
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {refundState.isLoading ? "Initiating..." : "Initiate Refund"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

