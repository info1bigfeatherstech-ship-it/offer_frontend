import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  useDecideAdminReturnRequestMutation,
  useGetAdminReturnRequestDetailQuery,
  useGetAdminReturnRequestsQuery,
  useInitiateAdminReturnRefundMutation,
  useAdminReturnReversePickupRetryMutation,
  useGetAdminReturnChatQuery,
  useSendAdminReturnChatMessageMutation,
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

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const chatEndRef = useRef(null);

  const { data: chatData } = useGetAdminReturnChatQuery(selectedOrderId, {
    skip: !isChatOpen || !selectedOrderId,
    pollingInterval: 4000,
  });

  const [sendChatMessage, sendChatState] = useSendAdminReturnChatMessageMutation();

  const handleSendAdminChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedOrderId) return;
    try {
      await sendChatMessage({ orderId: selectedOrderId, message: chatMessage }).unwrap();
      setChatMessage("");
    } catch (err) {
      alert(err.data?.message || err.message || "Failed to send message");
    }
  };

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatData?.chat, isChatOpen]);

  useEffect(() => {
    setIsChatOpen(false);
    setChatMessage("");
  }, [selectedOrderId]);

  const rows = data?.data || [];
  const selected = detail.data?.order || null;
  const adminUnreadCount = isChatOpen
    ? 0
    : selected?.returnInfo?.chat?.filter(
        (msg) =>
          msg.sender === "user" &&
          (!selected.returnInfo.adminLastRead ||
            new Date(msg.createdAt) > new Date(selected.returnInfo.adminLastRead))
      ).length || 0;
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
                <div className="flex items-center gap-2">
                  {selected?.returnInfo?.requestedAt && (
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() => setIsChatOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 transition-colors shadow-xs cursor-pointer text-slate-700"
                      >
                        {/* Using HTML bubble character as simple clean fallback if icons not loaded, but styling is extremely clean */}
                        💬 Chat with Customer
                      </button>
                      {adminUnreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="animate-bounce relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] font-bold text-white items-center justify-center">
                            {adminUnreadCount}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-xs px-2 py-1.5 rounded bg-slate-100 text-slate-700 font-semibold">
                    Payment: {selected.paymentStatus || "—"}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                <p><span className="font-semibold">Reason:</span> {selected.returnInfo?.reasonType || "—"}</p>
                <p className="mt-1"><span className="font-semibold">Message:</span> {selected.returnInfo?.reasonMessage || "—"}</p>
                {selected.returnInfo?.decisionReason && (
                  <p className="mt-1 text-red-600">
                    <span className="font-semibold">Decision Note:</span> {selected.returnInfo.decisionReason}
                  </p>
                )}
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

      {/* ADMIN RETURN CHAT DRAWER */}
      {isChatOpen && selected && createPortal(
        <>
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .animate-slideInRight {
              animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>

          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[9998] transition-opacity"
            onClick={() => setIsChatOpen(false)}
          />

          {/* Chat Drawer */}
          <div className="fixed inset-y-0 right-0 z-[9999] w-full sm:w-[450px] bg-white shadow-2xl flex flex-col animate-slideInRight">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Support Chat (Admin)
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5 font-bold">
                  Order: {selected.orderId}
                </p>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-800 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {selected.returnInfo?.requestedAt && (() => {
                const reqAt = new Date(selected.returnInfo.requestedAt);
                const windowDays = selected.returnInfo?.windowDays ?? 2;
                const deadline = new Date(reqAt.getTime() + windowDays * 24 * 60 * 60 * 1000);
                const remainingMs = deadline.getTime() - Date.now();
                const isExpired = remainingMs <= 0;

                if (isExpired) {
                  return (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 text-center text-[11px] text-red-700 font-medium">
                      This support chat session is closed (expired after {windowDays} days).
                    </div>
                  );
                }

                const hoursLeft = Math.ceil(remainingMs / (1000 * 60 * 60));
                return (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-center text-[11px] text-amber-800 font-medium">
                    Support chat is active. Window closes in {hoursLeft} hours.
                  </div>
                );
              })()}

              {(!chatData?.chat || chatData.chat.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                  <p className="text-xs font-medium">No messages yet.</p>
                </div>
              ) : (
                chatData.chat.map((msg, idx) => {
                  const isMe = msg.sender === "admin";
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-[20px] px-3.5 py-2 text-xs leading-relaxed ${
                          isMe
                            ? "bg-slate-900 text-white rounded-br-none"
                            : "bg-white text-slate-800 border border-slate-100 rounded-bl-none shadow-xs"
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 px-1">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Footer Input */}
            {(() => {
              const reqAt = selected.returnInfo?.requestedAt ? new Date(selected.returnInfo.requestedAt) : null;
              const windowDays = selected.returnInfo?.windowDays ?? 2;
              const isExpired = reqAt ? (Date.now() > reqAt.getTime() + windowDays * 24 * 60 * 60 * 1000) : true;

              if (isExpired) {
                return (
                  <div className="p-4 border-t border-slate-100 bg-slate-100 text-center text-xs font-semibold text-slate-500">
                    Chat disabled (support window expired)
                  </div>
                );
              }

              return (
                <form onSubmit={handleSendAdminChatMessage} className="p-3 border-t border-slate-100 flex gap-2 items-center bg-white">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a response..."
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-hidden focus:border-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={!chatMessage.trim() || sendChatState.isLoading}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer text-xs font-bold"
                  >
                    Send
                  </button>
                </form>
              );
            })()}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

