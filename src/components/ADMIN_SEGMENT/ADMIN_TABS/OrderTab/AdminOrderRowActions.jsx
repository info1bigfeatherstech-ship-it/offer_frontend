import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAdminBulkApprovalCancelMutation,
  useAdminBulkApprovalConfirmMutation,
  useAdminBulkFulfillmentShipNowMutation,
  useAdminFulfillmentManifestMutation,
  useAdminFulfillmentSchedulePickupMutation,
  useAdminFulfillmentSyncShiprocketMutation,
  useGetAdminPickupCalendarQuery,
} from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersApi";
import axiosInstance from "../../../../SERVICES/axiosInstance";

const ACTION_LABELS = {
  accept: "Accept",
  reject: "Reject",
  shipNow: "Ship now",
  schedulePickup: "Schedule pickup",
  generateManifest: "Generate manifest",
  downloadManifest: "Download manifest",
  downloadLabel: "Download label",
  downloadTaxInvoice: "Tax invoice",
  syncShiprocket: "Refresh Shiprocket",
  track: "Track",
  openDetail: "Open order",
};

function mutationErrorToString(err) {
  if (!err) return "Request failed.";
  if (String(err?.message || "") === "Cancelled") return null;
  const d = err.data;
  if (typeof d === "object" && d && d.message) return String(d.message);
  if (typeof d === "string") return d;
  return err.message || "Request failed.";
}

function addLocalDaysYmd(days) {
  const t = new Date();
  t.setDate(t.getDate() + days);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function downloadBlobFromGet(url, defaultFilename) {
  const res = await axiosInstance.get(url, { responseType: "blob" });
  const ct = String(res.headers["content-type"] || "");
  if (ct.includes("application/json")) {
    const text = await res.data.text();
    let msg = "Download failed.";
    try {
      const j = JSON.parse(text);
      if (j?.message) msg = j.message;
    } catch {
      msg = text.slice(0, 300) || msg;
    }
    throw new Error(msg);
  }
  let filename = defaultFilename;
  const dispo = res.headers["content-disposition"];
  if (dispo) {
    const m = /filename\*?=(?:UTF-8''|"?)([^";\n]+)/i.exec(dispo);
    if (m && m[1]) filename = decodeURIComponent(m[1].replace(/"/g, "").trim());
  }
  const blob = new Blob([res.data], { type: ct || "application/octet-stream" });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
  }
}

async function executeAction(key, ctx) {
  const id = ctx.orderId;
  switch (key) {
    case "accept":
      await ctx.bulkConfirm({ orderIds: [id] }).unwrap();
      return;
    case "reject":
      if (!window.confirm("Reject this pending order? Stock will be restored.")) {
        throw new Error("Cancelled");
      }
      await ctx.bulkCancel({ orderIds: [id] }).unwrap();
      return;
    case "shipNow":
      await ctx.bulkShipNow({ orderIds: [id] }).unwrap();
      return;
    case "schedulePickup": {
      const ymd = String(ctx.pickupDate || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        throw new Error("Choose a valid pickup date.");
      }
      await ctx.schedulePickup({ orderId: id, pickupDate: ymd }).unwrap();
      return;
    }
    case "generateManifest":
      await ctx.generateManifest(id).unwrap();
      return;
    case "downloadManifest":
      await downloadBlobFromGet(
        `/orders/admin/items/${encodeURIComponent(String(id))}/fulfillment/manifest-file`,
        `manifest-${id}.pdf`
      );
      return;
    case "downloadLabel":
      await downloadBlobFromGet(
        `/orders/admin/items/${encodeURIComponent(String(id))}/fulfillment/shipping-label-file`,
        `label-${id}.pdf`
      );
      return;
    case "downloadTaxInvoice": {
      const res = await axiosInstance.get(
        `/orders/admin/items/${encodeURIComponent(String(id))}/invoice-html`,
        { responseType: "blob" }
      );
      const blob = new Blob([res.data], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 120000);
      return;
    }
    case "syncShiprocket":
      await ctx.syncShiprocket(id).unwrap();
      return;
    case "track":
    case "openDetail":
    default:
      ctx.onOpenDetail?.(id);
  }
}

/**
 * Per-row fulfillment actions (list view) — same APIs as order detail.
 */
export default function AdminOrderRowActions({ order, onOpenDetail, onFeedback }) {
  const orderId = order?.orderId;
  const caps = order?.actionCapabilities || {};
  const primaryKey = order?.primaryAction || "openDetail";
  const primaryLabel = order?.primaryActionLabel || ACTION_LABELS[primaryKey] || "Open";

  const [menuOpen, setMenuOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState("");
  const [busy, setBusy] = useState(false);

  const [bulkConfirm] = useAdminBulkApprovalConfirmMutation();
  const [bulkCancel] = useAdminBulkApprovalCancelMutation();
  const [bulkShipNow] = useAdminBulkFulfillmentShipNowMutation();
  const [schedulePickupMut] = useAdminFulfillmentSchedulePickupMutation();
  const [generateManifestMut] = useAdminFulfillmentManifestMutation();
  const [syncShiprocketMut] = useAdminFulfillmentSyncShiprocketMutation();

  const { data: pickupCalendarRes } = useGetAdminPickupCalendarQuery(
    { daysAhead: 45 },
    { skip: !scheduleOpen }
  );
  const allowedPickupDates = useMemo(
    () =>
      Array.isArray(pickupCalendarRes?.calendar?.allowedDates)
        ? pickupCalendarRes.calendar.allowedDates
        : [],
    [pickupCalendarRes?.calendar?.allowedDates]
  );

  useEffect(() => {
    if (!scheduleOpen) return;
    const def = pickupCalendarRes?.calendar?.defaultDate;
    if (def && allowedPickupDates.includes(def)) {
      setPickupDate(def);
    } else if (!pickupDate) {
      setPickupDate(addLocalDaysYmd(1));
    }
  }, [scheduleOpen, pickupCalendarRes?.calendar?.defaultDate, allowedPickupDates, pickupDate]);

  const actionCtx = useMemo(
    () => ({
      orderId,
      bulkConfirm,
      bulkCancel,
      bulkShipNow,
      schedulePickup: schedulePickupMut,
      generateManifest: generateManifestMut,
      syncShiprocket: syncShiprocketMut,
      pickupDate,
      onOpenDetail,
    }),
    [
      orderId,
      bulkConfirm,
      bulkCancel,
      bulkShipNow,
      schedulePickupMut,
      generateManifestMut,
      syncShiprocketMut,
      pickupDate,
      onOpenDetail,
    ]
  );

  const run = useCallback(
    async (key) => {
      if (!orderId || busy) return;
      setBusy(true);
      setMenuOpen(false);
      try {
        await executeAction(key, actionCtx);
        onFeedback?.({ type: "ok", orderId });
      } catch (e) {
        const text = mutationErrorToString(e);
        if (text) onFeedback?.({ type: "err", orderId, text });
      } finally {
        setBusy(false);
      }
    },
    [orderId, busy, actionCtx, onFeedback]
  );

  const menuItems = useMemo(() => {
    const keys = [
      "accept",
      "reject",
      "shipNow",
      "schedulePickup",
      "generateManifest",
      "downloadManifest",
      "downloadLabel",
      "downloadTaxInvoice",
      "syncShiprocket",
      "track",
      "openDetail",
    ];
    return keys.filter((k) => caps[k] && k !== primaryKey);
  }, [caps, primaryKey]);

  if (!orderId) return null;

  return (
    <div
      className={`relative flex items-center justify-center gap-1 ${busy ? "opacity-60" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {caps[primaryKey] ? (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            if (primaryKey === "schedulePickup") {
              setScheduleOpen(true);
              return;
            }
            void run(primaryKey);
          }}
          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-800 rounded-md hover:bg-slate-900 disabled:opacity-50 whitespace-nowrap"
        >
          {busy ? "…" : primaryLabel}
        </button>
      ) : null}
      {menuItems.length > 0 ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="px-2 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50"
            aria-label="More actions"
          >
            ▾
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[11rem] rounded-lg border border-slate-200 bg-white shadow-xl py-1">
              {menuItems.map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (key === "schedulePickup") {
                      setScheduleOpen(true);
                      setMenuOpen(false);
                      return;
                    }
                    void run(key);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  {ACTION_LABELS[key] || key}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {scheduleOpen ? (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-slate-200 bg-white shadow-xl p-3 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Pickup date</p>
          {allowedPickupDates.length > 0 ? (
            <select
              value={allowedPickupDates.includes(pickupDate) ? pickupDate : allowedPickupDates[0]}
              onChange={(e) => setPickupDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 mb-2"
            >
              {allowedPickupDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="date"
              min={addLocalDaysYmd(0)}
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 mb-2"
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !/^\d{4}-\d{2}-\d{2}$/.test(String(pickupDate || "").trim())}
              onClick={() => {
                void run("schedulePickup");
                setScheduleOpen(false);
              }}
              className="flex-1 px-2 py-1.5 text-xs font-semibold text-white bg-slate-800 rounded-md disabled:opacity-50"
            >
              {busy ? "…" : "Schedule"}
            </button>
            <button
              type="button"
              onClick={() => setScheduleOpen(false)}
              className="px-2 py-1.5 text-xs text-slate-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}