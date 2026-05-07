import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  X,
  CreditCard,
  FileText,
  RefreshCw,
  ReceiptText,
  ShieldCheck,
  Loader2,
  Store,
  AlertCircle,
} from "lucide-react";
import axiosInstance from "../../../../../SERVICES/axiosInstance";

const STOREFRONTS = [
  { value: "ecomm", label: "Retail (e-commerce)" },
  { value: "wholesale", label: "Wholesale" },
];

const clampPercent = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  const r = Math.round(x * 100) / 100;
  if (r < 1 || r > 100) return null;
  return r;
};

const PaymentTab = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [storefront, setStorefront] = useState("ecomm");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk] = useState(false);

  const [codEnabled, setCodEnabled] = useState(true);
  const [partialEnabled, setPartialEnabled] = useState(true);
  const [partialPercentInput, setPartialPercentInput] = useState("25");

  const closeModal = () => setActiveModal(null);

  const storefrontHeaders = useMemo(
    () => ({ headers: { "X-Storefront": storefront } }),
    [storefront]
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setSaveOk(false);
    try {
      const res = await axiosInstance.get("/checkout/admin/settings", storefrontHeaders);
      if (!res.data?.success || !res.data?.data) {
        throw new Error(res.data?.message || "Could not load checkout payment policy");
      }
      const d = res.data.data;
      setCodEnabled(Boolean(d.codEnabled));
      setPartialEnabled(Boolean(d.partialPaymentEnabled));
      const p = d.partialPaymentPercent;
      if (p != null && Number.isFinite(Number(p))) {
        setPartialPercentInput(String(p));
      } else if (d.partialPaymentEnabled) {
        setPartialPercentInput("25");
      } else {
        setPartialPercentInput("");
      }
    } catch (e) {
      const msg =
        e.response?.data?.message || e.message || "Could not load checkout payment policy";
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, [storefrontHeaders]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSavePolicy = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);

    const parsed = clampPercent(partialPercentInput);
    if (partialEnabled && parsed == null) {
      setSaveError("Enter a valid partial payment percent between 1 and 100.");
      setSaving(false);
      return;
    }

    try {
      let body;
      if (!partialEnabled) {
        body = {
          codEnabled,
          partialPaymentEnabled: false,
        };
      } else {
        body = {
          codEnabled,
          partialPaymentEnabled: true,
          partialPaymentPercent: parsed,
        };
      }

      const res = await axiosInstance.put("/checkout/admin/settings", body, storefrontHeaders);
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Update failed");
      }
      const d = res.data.data;
      if (d) {
        setCodEnabled(Boolean(d.codEnabled));
        setPartialEnabled(Boolean(d.partialPaymentEnabled));
        if (d.partialPaymentPercent != null) {
          setPartialPercentInput(String(d.partialPaymentPercent));
        }
      }
      setSaveOk(true);
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        (Array.isArray(e.response?.data?.errors) && e.response.data.errors.join(" ")) ||
        e.message ||
        "Could not save settings";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      title: "Payment modes",
      items: [
        {
          id: "online-payments",
          title: "Online payment modes",
          description: "Set how you want to accept payments online",
          icon: <CreditCard size={20} className="text-blue-500" />,
          modalContent:
            "Enable or disable credit cards, UPI, net banking, and digital wallets for your storefront.",
        },
      ],
    },
    {
      title: "Invoices & settlements",
      items: [
        {
          id: "gst-billing",
          title: "GST billing",
          description: "Generate GST invoices for customer orders",
          icon: <ReceiptText size={20} className="text-blue-500" />,
          modalContent:
            "Configure your GST number, HSN codes, and tax percentage applied to your invoices.",
        },
        {
          id: "settlement-cycle",
          title: "Settlement cycle",
          description: "Next day",
          icon: <RefreshCw size={20} className="text-blue-500" />,
          modalContent:
            "Choose your preferred settlement frequency: T+1 (Next Day), T+2, or Weekly cycles.",
        },
        {
          id: "payment-invoices",
          title: "Customer payment invoices",
          description: "View customer payment and settlements",
          icon: <FileText size={20} className="text-blue-500" />,
          modalContent:
            "Access historical records of all generated invoices and their current settlement status.",
        },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans">
      <h1 className="text-2xl text-gray-900 mb-8">Payment settings</h1>

      {/* Checkout policy (API-backed) */}
      <div className="mb-8 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-200 flex items-center gap-2">
          <Store size={16} className="text-gray-500" />
          <span className="text-xs text-gray-500 uppercase tracking-widest">
            Checkout — cash on delivery &amp; partial payment
          </span>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              Storefront
            </label>
            <select
              value={storefront}
              onChange={(e) => setStorefront(e.target.value)}
              className="w-full max-w-md p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={loading || saving}
            >
              {STOREFRONTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Policy is stored per storefront. Uses your admin scope; wrong scope returns access
              denied.
            </p>
          </div>

          {fetchError && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{fetchError}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
              <Loader2 size={18} className="animate-spin" />
              Loading policy…
            </div>
          ) : (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  checked={codEnabled}
                  onChange={(e) => setCodEnabled(e.target.checked)}
                  disabled={saving}
                />
                <div>
                  <span className="text-sm font-semibold text-gray-800">Cash on delivery</span>
                  <p className="text-xs text-gray-500">
                    When off, customers only see online payment at checkout.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  checked={partialEnabled}
                  onChange={(e) => setPartialEnabled(e.target.checked)}
                  disabled={saving}
                />
                <div>
                  <span className="text-sm font-semibold text-gray-800">Partial payment online</span>
                  <p className="text-xs text-gray-500">
                    When on, customers can pay a fixed percentage now (set below) and the balance
                    later. When off, online checkout is full payment only.
                  </p>
                </div>
              </label>

              {partialEnabled && (
                <div className="pl-7 space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Partial payment percent (1–100)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step="0.01"
                    value={partialPercentInput}
                    onChange={(e) => setPartialPercentInput(e.target.value)}
                    disabled={saving}
                    className="w-full max-w-xs p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              {saveError && (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}
              {saveOk && (
                <p className="text-sm text-green-700 font-medium">Checkout policy saved.</p>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSavePolicy}
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Save checkout policy
                </button>
                <button
                  type="button"
                  onClick={loadSettings}
                  disabled={saving || loading}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                >
                  Reload
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section, sIdx) => (
          <div
            key={sIdx}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
          >
            <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-200">
              <span className="text-xs text-gray-500 uppercase tracking-widest">
                {section.title}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModal(item)}
                  className="w-full flex items-center cursor-pointer justify-between px-6 py-5 hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block">{item.icon}</div>
                    <div>
                      <h3 className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-gray-300 group-hover:text-blue-500 transition-colors"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">{activeModal.icon}</div>
                <h2 className="text-lg text-gray-900">{activeModal.title}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-8">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6">
                <ShieldCheck className="text-green-600 shrink-0" size={18} />
                <p className="text-xs text-gray-600 leading-relaxed">{activeModal.modalContent}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Configure Preference
                  </label>
                  <select className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium">
                    <option>Standard Configuration</option>
                    <option>Advanced Settings</option>
                    <option>Legacy Mode</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl shadow-md transition-all active:scale-95"
              >
                Update Payment Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentTab;
