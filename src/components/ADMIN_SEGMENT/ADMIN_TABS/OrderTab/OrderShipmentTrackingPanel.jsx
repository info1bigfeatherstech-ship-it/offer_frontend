import React, { useMemo } from "react";

/**
 * Presentational shipment tracking card (UI only).
 * Keep handlers/data shaping in the parent — this file must not call APIs.
 */

function safeText(value, fallback = "—") {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function logisticsProgressFromOps({ ops, ship, orderStatus }) {
  const state = String(ops?.opsState || "").toUpperCase();
  const st = String(orderStatus || "").toLowerCase();
  const hasAwb = Boolean(ship?.awbCode || ship?.trackingNumber);
  const hasPickup = Boolean(
    ship?.pickupDate ||
      ship?.pickupScheduledAt ||
      ["PICKUP_SCHEDULED", "MANIFEST_READY", "LABEL_READY", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
        state
      )
  );
  const hasManifest = Boolean(
    ship?.manifestUrl ||
      ["MANIFEST_READY", "LABEL_READY", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(state)
  );
  const hasShipped = Boolean(
    ship?.shippedAt ||
      ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(state) ||
      ["shipped", "out_for_delivery", "delivered"].includes(st)
  );

  const steps = [
    { key: "assigned", label: "Assigned", done: hasAwb || hasPickup || hasManifest || hasShipped },
    { key: "picked", label: "Picked up", done: hasPickup || hasManifest || hasShipped },
    { key: "manifest", label: "Manifested", done: hasManifest || hasShipped },
    { key: "shipped", label: "Shipped", done: hasShipped },
  ];

  let currentIdx = steps.findIndex((s) => !s.done);
  if (currentIdx < 0) currentIdx = steps.length - 1;
  else if (currentIdx > 0 && steps[currentIdx - 1]?.done) {
    /* current = first incomplete */
  } else if (!steps[0].done) {
    currentIdx = 0;
  }

  return { steps, currentIdx };
}

function LogisticsProgressStepper({ ops, ship, orderStatus }) {
  const { steps, currentIdx } = useMemo(
    () => logisticsProgressFromOps({ ops, ship, orderStatus }),
    [ops, ship, orderStatus]
  );

  if (!steps.some((s) => s.done) && !ship?.trackingNumber && !ship?.awbCode) {
    return null;
  }

  const allDone = steps.every((s) => s.done);

  return (
    <div className="px-1 pt-1 pb-2" aria-label="Logistics progress">
      <div className="flex w-full items-start">
        {steps.map((step, idx) => {
          const done = step.done;
          const current = !allDone && idx === currentIdx;
          const active = done || current;
          const connectorFilled = done && (steps[idx + 1]?.done || (!allDone && idx < currentIdx));
          const isLast = idx === steps.length - 1;
          return (
            <div key={step.key} className={`flex items-start ${isLast ? "shrink-0" : "flex-1"}`}>
              <div className="flex flex-col items-center w-14 shrink-0">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 shrink-0 ${
                    done
                      ? "border-blue-600 bg-blue-600 text-white"
                      : current
                        ? "border-blue-600 bg-white"
                        : "border-slate-200 bg-white"
                  }`}
                  aria-current={current ? "step" : undefined}
                >
                  {done ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : current ? (
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                  ) : null}
                </div>
                <p
                  className={`mt-1.5 text-[10px] font-bold uppercase tracking-wide text-center leading-tight ${
                    active ? "text-blue-700" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </p>
              </div>
              {!isLast ? (
                <div
                  className={`mt-3 h-0.5 flex-1 min-w-[0.75rem] rounded ${
                    connectorFilled ? "bg-blue-500" : "bg-slate-200"
                  }`}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildTrackHref({ ship, trackingUrl, providerKey }) {
  if (trackingUrl && /^https?:\/\//i.test(String(trackingUrl))) return String(trackingUrl);
  const awb = String(ship?.trackingNumber || ship?.awbCode || "").trim();
  if (!awb) return null;
  const courier = String(ship?.courier || "").trim();
  const q = encodeURIComponent(`${awb} ${courier || "tracking"}`.trim());
  if (providerKey === "shipmozo") {
    return `https://www.google.com/search?q=${q}`;
  }
  return `https://www.google.com/search?q=${q}`;
}

function trackLinkLabel(providerKey) {
  if (providerKey === "shipmozo") return "Track via Shipmozo";
  return "Track via Shiprocket";
}

/**
 * @param {object} props
 * @param {object} props.ship
 * @param {object|null} [props.ops]
 * @param {string} [props.orderStatus]
 * @param {string|null} props.carrierStatusDisplay
 * @param {string|null} [props.carrierStatusSecondary]
 * @param {string|null} props.lastSyncedAt
 * @param {string|null} [props.lastSyncError]
 * @param {boolean} [props.hideStaleTracking]
 * @param {Array} props.carrierTimeline
 * @param {boolean} [props.trackingLoading]
 * @param {object|null} [props.trackingError]
 * @param {string} [props.providerKey]
 * @param {string|null} [props.trackingUrl]
 * @param {(iso: string|null|undefined) => string} props.formatDateTime
 * @param {() => void} [props.onRefreshTracking]
 */
export default function OrderShipmentTrackingPanel({
  ship = {},
  ops = null,
  orderStatus = "",
  carrierStatusDisplay = null,
  carrierStatusSecondary = null,
  lastSyncedAt = null,
  lastSyncError = null,
  hideStaleTracking = false,
  carrierTimeline = [],
  trackingLoading = false,
  trackingError = null,
  providerKey = "shiprocket",
  trackingUrl = null,
  formatDateTime,
  onRefreshTracking,
}) {
  const formatFn = typeof formatDateTime === "function" ? formatDateTime : () => "—";
  const trackHref = buildTrackHref({ ship, trackingUrl, providerKey });
  const timeline = Array.isArray(carrierTimeline) ? carrierTimeline : [];
  const hasAnyShipmentSignal = Boolean(
    ship?.trackingNumber ||
      ship?.awbCode ||
      ship?.courier ||
      carrierStatusDisplay ||
      timeline.length > 0
  );

  if (hideStaleTracking) {
    return (
      <div className="bg-white rounded-md border border-amber-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/80">
          <h3 className="text-sm font-bold text-amber-950">Shipment tracking</h3>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-950">{safeText(carrierStatusDisplay, "Reset needed")}</p>
          {carrierStatusSecondary ? (
            <p className="text-xs text-amber-800">Previous label: {carrierStatusSecondary}</p>
          ) : null}
          <p className="text-xs text-amber-900">Old tracking cleared — use Ship now after refresh.</p>
        </div>
      </div>
    );
  }

  if (!hasAnyShipmentSignal) {
    return (
      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
          <h3 className="text-sm font-bold text-slate-900">Shipment tracking</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-600">
            No courier assigned yet. Tracking appears here after you ship the order.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-700 shrink-0" aria-hidden>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m16 0V8a1 1 0 00-.293-.707l-3-3A1 1 0 0015 4h-2"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">Shipment tracking</h3>
            <p className="text-[11px] text-slate-500 truncate">Where the parcel is right now</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {trackHref ? (
            <a
              href={trackHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              {trackLinkLabel(providerKey)}
            </a>
          ) : null}
          {typeof onRefreshTracking === "function" ? (
            <button
              type="button"
              onClick={() => {
                try {
                  onRefreshTracking();
                } catch (_) {
                  /* parent handles errors */
                }
              }}
              disabled={Boolean(trackingLoading)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
            >
              {trackingLoading ? "Refreshing…" : "Refresh"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <LogisticsProgressStepper ops={ops} ship={ship} orderStatus={orderStatus} />

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Courier</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{safeText(ship?.courier)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tracking number</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5 font-mono truncate">
              {safeText(ship?.trackingNumber || ship?.awbCode)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Provider status</p>
            <p className="text-sm font-semibold text-blue-700 mt-0.5 break-words">
              {safeText(carrierStatusDisplay)}
            </p>
            {carrierStatusSecondary && carrierStatusSecondary !== carrierStatusDisplay ? (
              <p className="text-[10px] text-slate-500 mt-0.5">Also: {carrierStatusSecondary}</p>
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shipped on</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatFn(ship?.shippedAt)}</p>
          </div>
        </div>

        {(ship?.shipmentId || ship?.shiprocketOrderId || lastSyncedAt) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 border-t border-dashed border-slate-200 pt-3">
            {ship?.shipmentId ? <span>Shipment ID: {ship.shipmentId}</span> : null}
            {ship?.shiprocketOrderId ? (
              <span className="font-mono break-all">Provider order: {ship.shiprocketOrderId}</span>
            ) : null}
            {lastSyncedAt ? <span>Last synced: {formatFn(lastSyncedAt)}</span> : null}
          </div>
        )}

        {trackingError?.data?.message ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
            Could not fetch live tracking: {String(trackingError.data.message)}
          </div>
        ) : null}

        {lastSyncError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900" role="status">
            Last sync error: {String(lastSyncError)}
          </div>
        ) : null}

        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Carrier timeline</p>
            {timeline.length > 0 ? (
              <p className="text-[10px] text-slate-400">{timeline.length} updates · scroll</p>
            ) : null}
          </div>
          {timeline.length > 0 ? (
            <div className="h-44 overflow-y-auto rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5">
              <ol className="relative space-y-0">
                {timeline.map((event, idx) => {
                  const isLatest = idx === 0;
                  const title = safeText(event?.description || event?.status, "Update");
                  const when = formatFn(event?.timestamp);
                  const where = String(event?.location || "").trim();
                  const code = String(event?.status || "").trim();
                  return (
                    <li key={event?.id || `${idx}-${title}`} className="relative flex gap-3 pb-3 last:pb-0">
                      {idx < timeline.length - 1 ? (
                        <span
                          className="absolute left-[5px] top-3 bottom-0 w-px bg-slate-200"
                          aria-hidden
                        />
                      ) : null}
                      <span
                        className={`relative z-[1] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          isLatest ? "bg-blue-600" : "bg-blue-200"
                        }`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm leading-snug ${
                            isLatest ? "font-semibold text-slate-900" : "font-medium text-slate-800"
                          }`}
                        >
                          {title}
                          {code && code !== title && code.length <= 8 ? (
                            <span className="ml-1.5 text-[10px] font-bold uppercase text-slate-400">{code}</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {when}
                          {where ? ` · ${where}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No courier updates yet. Tap Refresh after pickup.</p>
          )}
        </div>
      </div>
    </div>
  );
}
