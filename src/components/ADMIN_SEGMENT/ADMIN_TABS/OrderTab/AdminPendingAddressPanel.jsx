import React, { useEffect, useMemo, useState } from "react";
import {
  useGetAdminAddressIntelligenceQuery,
  useAdminPreviewPendingAddressEditMutation,
  useAdminApplyPendingAddressEditMutation,
} from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersApi";
import {
  getCourierStreetUsage,
  validateCourierStreetClient,
} from "../../../../utils/addressValidation";

function formatInr(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);
}

const EDITABLE_FIELDS = [
  { key: "houseNumber", label: "House / flat" },
  { key: "building", label: "Building" },
  { key: "floor", label: "Floor" },
  { key: "addressLine1", label: "Address line 1" },
  { key: "addressLine2", label: "Address line 2" },
  { key: "area", label: "Area / locality" },
  { key: "landmark", label: "Landmark" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "postalCode", label: "Pincode" },
  { key: "country", label: "Country" },
];

function scoreRingClass(category) {
  const c = String(category || "").toLowerCase();
  if (c === "valid") return "border-emerald-500 text-emerald-700";
  if (c === "ambiguous" || c === "needs_review") return "border-amber-500 text-amber-800";
  return "border-red-500 text-red-700";
}

function normalizeRiskLevel(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!s || s === "null" || s === "undefined") return null;
  if (s === "high" || s === "h") return "high";
  if (s === "medium" || s === "med" || s === "m" || s === "moderate") return "medium";
  if (s === "low" || s === "l") return "low";
  return s;
}

function riskBadgeClass(level) {
  if (level === "low") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (level === "medium") return "bg-amber-50 text-amber-900 border-amber-200";
  if (level === "high") return "bg-red-50 text-red-800 border-red-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function RiskPill({ label, value, emptyHint }) {
  const level = normalizeRiskLevel(value);
  return (
    <div className={`rounded-md border px-2 py-1 ${riskBadgeClass(level)}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-[11px] font-black capitalize leading-tight">{level || emptyHint || "—"}</p>
    </div>
  );
}

function formatDeliveryAddress(addr) {
  return [
    addr.houseNumber,
    addr.building,
    addr.floor,
    addr.addressLine1,
    addr.addressLine2,
    addr.area,
    addr.landmark,
    addr.city,
    addr.state,
    addr.postalCode,
    addr.country,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Single card: contact + delivery address + score/risk + pending edit.
 */
export default function AdminPendingAddressPanel({ order, orderId, disabled, onApplied }) {
  const addr = order?.addressSnapshot || {};
  const isPending = String(order?.orderStatus || "").toLowerCase() === "pending";
  const email = order?.customer?.email || null;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [alsoUpdateSaved, setAlsoUpdateSaved] = useState(false);
  const [preview, setPreview] = useState(null);
  const [localMsg, setLocalMsg] = useState(null);

  const hasShiprocketOrder = Boolean(
    order?.shipmentInfo?.shiprocketOrderId || order?.shipmentInfo?.shipmentId
  );

  const {
    data: intelRes,
    isLoading: intelLoading,
    isFetching: intelFetching,
    refetch: refetchIntel,
  } = useGetAdminAddressIntelligenceQuery(
    { orderId, refresh: hasShiprocketOrder },
    { skip: !orderId }
  );

  const [previewEdit, previewState] = useAdminPreviewPendingAddressEditMutation();
  const [applyEdit, applyState] = useAdminApplyPendingAddressEditMutation();

  useEffect(() => {
    const next = {};
    for (const f of EDITABLE_FIELDS) {
      next[f.key] = addr[f.key] != null ? String(addr[f.key]) : "";
    }
    setDraft(next);
    setPreview(null);
    setLocalMsg(null);
    setEditing(false);
  }, [orderId, addr.postalCode, addr.addressLine1, addr.city, addr.state, addr.houseNumber, addr.area]);

  const addressPatch = useMemo(() => {
    const patch = {};
    for (const f of EDITABLE_FIELDS) {
      const original = addr[f.key] != null ? String(addr[f.key]) : "";
      const value = draft[f.key] != null ? String(draft[f.key]) : "";
      if (value !== original) patch[f.key] = value;
    }
    return patch;
  }, [draft, addr]);

  const hasChanges = Object.keys(addressPatch).length > 0;
  const busy = previewState.isLoading || applyState.isLoading || disabled;
  const primary = intelRes?.data?.primary || null;
  const shiprocketIntel = intelRes?.data?.shiprocket || null;
  const intelLoadingAny = intelLoading || intelFetching;
  const courierUsage = useMemo(() => getCourierStreetUsage(draft), [draft]);

  const addressRisk =
    normalizeRiskLevel(primary?.risk) || normalizeRiskLevel(shiprocketIntel?.risk);
  const rtoRisk =
    normalizeRiskLevel(primary?.rtoRisk) || normalizeRiskLevel(shiprocketIntel?.rtoRisk);
  const hasShiprocketRisks = Boolean(
    shiprocketIntel?.available || primary?.source === "shiprocket"
  );

  const guardCourierStreetLength = () => {
    const err = validateCourierStreetClient(draft);
    if (err) {
      setLocalMsg({ type: "err", text: err });
      return false;
    }
    return true;
  };

  const runPreview = async () => {
    setLocalMsg(null);
    setPreview(null);
    if (!guardCourierStreetLength()) return;
    try {
      const res = await previewEdit({
        orderId,
        addressPatch,
        alsoUpdateSavedAddress: alsoUpdateSaved,
      }).unwrap();
      setPreview(res?.data || null);
    } catch (e) {
      setLocalMsg({
        type: "err",
        text: e?.data?.message || e?.message || "Preview failed.",
      });
    }
  };

  const runApply = async () => {
    if (!guardCourierStreetLength()) return;
    if (
      !window.confirm(
        "Update delivery address on this order? Name and phone stay unchanged. Shipping will be re-quoted (customer never charged more)."
      )
    ) {
      return;
    }
    setLocalMsg(null);
    try {
      const res = await applyEdit({
        orderId,
        addressPatch,
        alsoUpdateSavedAddress: alsoUpdateSaved,
      }).unwrap();
      setPreview(null);
      setEditing(false);
      setLocalMsg({
        type: res?.data?.refundWarning ? "warn" : "ok",
        text: res?.message || "Address updated.",
      });
      await refetchIntel();
      if (typeof onApplied === "function") await onApplied(res?.data);
    } catch (e) {
      setLocalMsg({
        type: "err",
        text: e?.data?.message || e?.message || "Update failed.",
      });
    }
  };

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 shrink-0"
            aria-hidden
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">Customer & address</h3>
            <p className="text-[11px] text-slate-500 truncate">Who receives this order</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={busy || intelLoadingAny}
            onClick={() => refetchIntel()}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh score
          </button>
          {isPending && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing((v) => !v);
                setPreview(null);
                setLocalMsg(null);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              title={editing ? "Cancel edit" : "Edit address"}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              {editing ? "Cancel" : "Edit"}
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Score + risks — compact */}
        <div className="flex flex-wrap items-center gap-3">
          {intelLoadingAny && !primary ? (
            <p className="text-xs text-slate-500">Checking address quality…</p>
          ) : primary?.available ? (
            <>
              <div
                className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-[3px] leading-none ${scoreRingClass(
                  primary.category
                )}`}
                title={primary.categoryLabel}
              >
                <span className="text-sm font-black tabular-nums">
                  {Number(primary.scorePercent) || 0}%
                </span>
                <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wide opacity-90">
                  Valid
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{primary.categoryLabel}</p>
                <p className="text-[10px] text-slate-500">
                  {primary.source === "shiprocket"
                    ? "Shiprocket score"
                    : "Local pre-ship check"}
                </p>
              </div>
              <div className="flex gap-2">
                <RiskPill
                  label="Address risk"
                  value={addressRisk}
                  emptyHint={hasShiprocketRisks ? "—" : "After SR"}
                />
                <RiskPill
                  label="RTO risk"
                  value={rtoRisk}
                  emptyHint={hasShiprocketRisks ? "—" : "After SR"}
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Contact + address — once */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-[10px] uppercase text-slate-400 font-semibold">Name</p>
            <p className="text-slate-900 font-medium">{addr.fullName || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-400 font-semibold">Phone</p>
            <p className="text-slate-900 font-medium">
              {addr.phone || order?.customer?.phone || "—"}
            </p>
          </div>
          {email && (
            <div className="sm:col-span-2">
              <p className="text-[10px] uppercase text-slate-400 font-semibold">Email</p>
              <p className="text-blue-600 font-medium break-all">{email}</p>
            </div>
          )}
          {!editing && (
            <div className="sm:col-span-2">
              <p className="text-[10px] uppercase text-slate-400 font-semibold">Delivery address</p>
              <p className="text-slate-700 leading-relaxed text-[13px]">
                {formatDeliveryAddress(addr) || "—"}
              </p>
            </div>
          )}
        </div>

        {/* Pending edit — collapsed until Edit address */}
        {isPending && editing && (
          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3 space-y-3">
            <p className="text-[11px] text-slate-600">
              Name and phone stay locked. Street fields update this order&apos;s snapshot for Shiprocket.
            </p>
            <div
              className={`rounded-md border px-2.5 py-2 text-[11px] font-semibold ${
                courierUsage.overLimit
                  ? "border-red-200 bg-red-50 text-red-800"
                  : courierUsage.remaining <= 30
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              Courier street length: {courierUsage.combinedLength}/{courierUsage.max}
              {courierUsage.overLimit
                ? " — too long. Shorten house, building, floor, landmark, or street details."
                : " (city / state / pincode count separately)"}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {EDITABLE_FIELDS.map((f) => (
                <label
                  key={f.key}
                  className={`block text-xs ${
                    f.key === "addressLine1" || f.key === "addressLine2" || f.key === "landmark"
                      ? "sm:col-span-2"
                      : ""
                  }`}
                >
                  <span className="font-semibold text-slate-600">{f.label}</span>
                  <input
                    type="text"
                    disabled={busy}
                    value={draft[f.key] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </label>
              ))}
            </div>

            <label className="flex items-start gap-2 text-[11px] text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={alsoUpdateSaved}
                disabled={busy}
                onChange={(e) => setAlsoUpdateSaved(e.target.checked)}
              />
              <span>Also update this customer&apos;s saved address (same user only).</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !hasChanges || courierUsage.overLimit}
                onClick={runPreview}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {previewState.isLoading ? "Previewing…" : "Preview"}
              </button>
              <button
                type="button"
                disabled={busy || !hasChanges || !preview || courierUsage.overLimit}
                onClick={runApply}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {applyState.isLoading ? "Saving…" : "Apply update"}
              </button>
            </div>

            {preview && (
              <div className="rounded-md border border-blue-100 bg-blue-50/70 px-2.5 py-2 text-[11px] text-slate-800 space-y-0.5">
                <p>
                  Shipping: {formatInr(preview.shipping?.oldDelivery)} →{" "}
                  {formatInr(preview.shipping?.customerDelivery)}
                  {preview.shipping?.courierName ? ` · ${preview.shipping.courierName}` : ""}
                </p>
                <p>
                  New total: {formatInr(preview.after?.totalAmount)}
                  {Number(preview.refundInr) > 0.005
                    ? ` · Refund ${formatInr(preview.refundInr)}`
                    : " · No refund"}
                </p>
              </div>
            )}
          </div>
        )}

        {localMsg && (
          <p
            className={`text-xs font-medium ${
              localMsg.type === "err"
                ? "text-red-700"
                : localMsg.type === "warn"
                  ? "text-amber-800"
                  : "text-emerald-700"
            }`}
          >
            {localMsg.text}
          </p>
        )}
      </div>
    </div>
  );
}
