import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Printer, Save } from "lucide-react";
import axiosInstance from "../../../../../SERVICES/axiosInstance";

const Toggle = ({ checked, onChange, label, locked }) => (
  <label className={`flex items-center gap-2 text-sm ${locked ? "opacity-70" : "cursor-pointer"}`}>
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-gray-300 text-blue-600"
      checked={Boolean(checked)}
      disabled={locked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="text-gray-700">
      {label}
      {locked ? <span className="ml-1 text-[10px] uppercase text-blue-600">always on</span> : null}
    </span>
  </label>
);

const Section = ({ title, children }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-gray-500">{title}</h3>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>
  </div>
);

const LabelSettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk] = useState(false);
  const [storefront, setStorefront] = useState("ecomm");
  const [settings, setSettings] = useState(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState(null);
  const [pickupIdentity, setPickupIdentity] = useState({ name: "", source: "" });
  const previewTimer = useRef(null);
  const iframeRef = useRef(null);

  const patch = useCallback((section, key, value) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [key]: value,
        },
      };
    });
    setSaveOk(false);
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await axiosInstance.get("/shipping-provider/admin/shipmozo-label-settings");
      if (!res.data?.success || !res.data?.data?.settings) {
        throw new Error(res.data?.message || "Could not load label settings");
      }
      setStorefront(res.data.data.storefront === "wholesale" ? "wholesale" : "ecomm");
      setSettings(res.data.data.settings);
      setPickupIdentity({
        name: res.data.data.pickupIdentity?.name || "",
        source: res.data.data.pickupIdentity?.source || "",
      });
    } catch (e) {
      setFetchError(e.response?.data?.message || e.message || "Could not load label settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const refreshPreview = useCallback(async (draft) => {
    if (!draft) return;
    try {
      const res = await axiosInstance.post(
        "/shipping-provider/admin/shipmozo-label-settings/preview",
        { settings: draft },
        {
          responseType: "text",
          transformResponse: [(data) => data],
        }
      );
      const html = typeof res.data === "string" ? res.data : String(res.data || "");
      if (!html.includes("<") && html.includes("{")) {
        throw new Error("Preview did not return a label");
      }
      setPreviewHtml(html);
      setPreviewError(null);
    } catch (e) {
      setPreviewError(e.response?.data?.message || e.message || "Preview failed");
    }
  }, []);

  useEffect(() => {
    if (!settings) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      refreshPreview(settings);
    }, 350);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [settings, refreshPreview]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const res = await axiosInstance.put("/shipping-provider/admin/shipmozo-label-settings", {
        settings,
      });
      if (!res.data?.success) throw new Error(res.data?.message || "Save failed");
      setSaveOk(true);
      if (res.data?.data?.settings) setSettings(res.data.data.settings);
      if (res.data?.data?.pickupIdentity) {
        setPickupIdentity({
          name: res.data.data.pickupIdentity.name || "",
          source: res.data.data.pickupIdentity.source || "",
        });
      }
    } catch (e) {
      setSaveError(e.response?.data?.message || e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch {
      /* ignore */
    }
  };

  const s = settings;
  const storefrontLabel = storefront === "wholesale" ? "Wholesale" : "E-comm";

  const lockedNote = useMemo(
    () =>
      `Applies only to ${storefrontLabel} Shipmozo orders. Shiprocket labels are unchanged. Print size is 4×6 inch.`,
    [storefrontLabel]
  );

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading label settings…
      </div>
    );
  }

  if (fetchError || !s) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="mb-2 h-5 w-5" />
        {fetchError || "Settings unavailable"}
        <button type="button" className="ml-3 underline" onClick={loadSettings}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-col h-full">
      <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-gray-900">Shipmozo label settings</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{lockedNote}</p>
          <p className="mt-1 text-xs font-semibold uppercase text-blue-600">
            Storefront: {storefrontLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      {saveError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {saveError}
        </div>
      )}
      {saveOk && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Saved for {storefrontLabel} only
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch gap-6 overflow-hidden lg:flex-row lg:items-start">
        <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <Section title="Support details">
            <Toggle
              checked={s.support.showCustomerSupport}
              label="Customer support details"
              onChange={(v) => patch("support", "showCustomerSupport", v)}
            />
            <input
              className="col-span-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="Support mobile"
              value={s.support.mobile || ""}
              onChange={(e) => patch("support", "mobile", e.target.value)}
            />
            <input
              className="col-span-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="Support email"
              value={s.support.email || ""}
              onChange={(e) => patch("support", "email", e.target.value)}
            />
          </Section>

          <Section title="Delivery details">
            <Toggle checked={s.delivery.showPaymentMode} label="Payment mode" onChange={(v) => patch("delivery", "showPaymentMode", v)} />
            <Toggle checked={s.delivery.showCustomerAddress} label="Customer address" onChange={(v) => patch("delivery", "showCustomerAddress", v)} />
            <Toggle checked={s.delivery.showCustomerPhone} label="Customer phone number" onChange={(v) => patch("delivery", "showCustomerPhone", v)} />
            <Toggle checked={s.delivery.showOrderBarcode} label="Order barcode" onChange={(v) => patch("delivery", "showOrderBarcode", v)} />
            <Toggle checked={s.delivery.showAwbBarcode} label="AWB barcode" onChange={(v) => patch("delivery", "showAwbBarcode", v)} />
            <Toggle checked={s.delivery.showRoutingCode} label="Routing code" onChange={(v) => patch("delivery", "showRoutingCode", v)} />
            <Toggle checked={s.delivery.showRtoRoutingCode} label="RTO routing code" onChange={(v) => patch("delivery", "showRtoRoutingCode", v)} />
            <Toggle checked locked label="Dimension" onChange={() => {}} />
            <Toggle checked locked label="Weight" onChange={() => {}} />
          </Section>

          <Section title="Pickup details">
            <Toggle checked={s.pickup.showPickupName} label="Pickup name" onChange={(v) => patch("pickup", "showPickupName", v)} />
            <Toggle checked={s.pickup.showPickupAddress} label="Pickup address" onChange={(v) => patch("pickup", "showPickupAddress", v)} />
            <Toggle checked={s.pickup.showPickupPhone} label="Pickup phone number" onChange={(v) => patch("pickup", "showPickupPhone", v)} />
            <Toggle checked={s.pickup.showRtoName} label="RTO name" onChange={(v) => patch("pickup", "showRtoName", v)} />
            <Toggle checked={s.pickup.showRtoAddress} label="RTO address" onChange={(v) => patch("pickup", "showRtoAddress", v)} />
            <Toggle checked={s.pickup.showGstin} label="GSTIN" onChange={(v) => patch("pickup", "showGstin", v)} />
            {pickupIdentity.source === "shipmozo" ? (
              <p className="col-span-full rounded-md bg-slate-50 px-3 py-2 text-xs text-gray-600">
                Shipped By name comes from your Shipmozo warehouse
                {pickupIdentity.name ? `: ${pickupIdentity.name}` : ""}. It is not editable here.
              </p>
            ) : (
              <label className="col-span-full text-sm text-gray-600">
                Shipped By name
                <input
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Name printed under Shipped By"
                  value={s.pickup.sellerName || ""}
                  onChange={(e) => patch("pickup", "sellerName", e.target.value)}
                />
                <span className="mt-1 block text-[11px] text-gray-400">
                  Not coming from Shipmozo warehouse, so you can set it here.
                </span>
              </label>
            )}
            <input
              className="col-span-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="GSTIN"
              value={s.pickup.gstin || ""}
              onChange={(e) => patch("pickup", "gstin", e.target.value)}
            />
            <label className="text-sm text-gray-600">
              Trim SKU upto
              <input
                type="number"
                min={4}
                max={40}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2"
                value={s.products.trimSkuUpto ?? 10}
                onChange={(e) => patch("products", "trimSkuUpto", e.target.value)}
              />
            </label>
            <label className="text-sm text-gray-600">
              Trim product name upto
              <input
                type="number"
                min={4}
                max={40}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2"
                value={s.products.trimProductNameUpto ?? 10}
                onChange={(e) => patch("products", "trimProductNameUpto", e.target.value)}
              />
            </label>
            <label className="text-sm text-gray-600">
              Show number of line items
              <input
                type="number"
                min={1}
                max={30}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2"
                value={s.products.maxLineItems ?? 10}
                onChange={(e) => patch("products", "maxLineItems", e.target.value)}
              />
            </label>
          </Section>

          <Section title="Order & product details">
            <Toggle checked={s.products.showItem} label="Item" onChange={(v) => patch("products", "showItem", v)} />
            <Toggle checked={s.products.showSku} label="SKU" onChange={(v) => patch("products", "showSku", v)} />
            <Toggle checked={s.products.showQty} label="Quantity" onChange={(v) => patch("products", "showQty", v)} />
            <Toggle checked={s.products.showPrice} label="Price" onChange={(v) => patch("products", "showPrice", v)} />
            <Toggle checked={s.products.showTotal} label="Total amount" onChange={(v) => patch("products", "showTotal", v)} />
            <Toggle checked={s.products.showHsn} label="HSN" onChange={(v) => patch("products", "showHsn", v)} />
            <Toggle checked={s.products.showShippingCharges} label="Shipping charges" onChange={(v) => patch("products", "showShippingCharges", v)} />
            <Toggle checked={s.products.showCollectableAmount} label="Collectable amount" onChange={(v) => patch("products", "showCollectableAmount", v)} />
            <Toggle checked={s.products.showTotalQuantity} label="Total quantity" onChange={(v) => patch("products", "showTotalQuantity", v)} />
            <Toggle checked={s.products.showAllItems} label="Show all items" onChange={(v) => patch("products", "showAllItems", v)} />
          </Section>

          <Section title="Miscellaneous">
            <Toggle checked={s.misc.showNotes} label="Notes" onChange={(v) => patch("misc", "showNotes", v)} />
            <Toggle checked={s.misc.showInvoiceNumber} label="Invoice number" onChange={(v) => patch("misc", "showInvoiceNumber", v)} />
            <Toggle checked={s.misc.showInvoiceDate} label="Invoice date" onChange={(v) => patch("misc", "showInvoiceDate", v)} />
            <Toggle checked={s.misc.showOrderDate} label="Order date" onChange={(v) => patch("misc", "showOrderDate", v)} />
            <Toggle checked={s.misc.showOrderTotal} label="Show order total" onChange={(v) => patch("misc", "showOrderTotal", v)} />
            <Toggle checked={s.misc.showEwayBill} label="E-way bill no" onChange={(v) => patch("misc", "showEwayBill", v)} />
            <Toggle checked={s.misc.showPoweredBy} label="Powered by OfferWale Baba" onChange={(v) => patch("misc", "showPoweredBy", v)} />
            <Toggle checked={s.misc.showAutoGeneratedDisclaimer} label="Auto-generated disclaimer" onChange={(v) => patch("misc", "showAutoGeneratedDisclaimer", v)} />
            <textarea
              className="col-span-full min-h-[88px] rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={s.misc.notes || ""}
              onChange={(e) => patch("misc", "notes", e.target.value)}
            />
          </Section>
        </div>

        <div className="ml-auto flex w-max max-w-full shrink-0 flex-col">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-800">Label preview (4×6)</h3>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!previewHtml}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
          {previewError && <p className="mb-2 shrink-0 text-xs text-red-600">{previewError}</p>}
          <div className="w-max overflow-auto rounded-xl bg-neutral-200 p-3">
            <div
              className="overflow-hidden bg-white shadow-lg"
              style={{ width: 456, height: 684 }}
            >
              <iframe
                ref={iframeRef}
                title="Shipmozo label preview"
                scrolling="no"
                srcDoc={
                  previewHtml ||
                  "<p style='padding:12px;font-family:sans-serif;color:#666'>Loading preview…</p>"
                }
                style={{ width: 456, height: 684, border: 0, overflow: "hidden" }}
              />
            </div>
          </div>
          <p className="mt-2 max-w-[456px] shrink-0 text-[11px] text-gray-400">
            Preview stays here while you change fields on the left. Print uses 4×6 paper. Example barcodes in preview; real Shipmozo orders print the actual AWB and order ID.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LabelSettingsTab;
