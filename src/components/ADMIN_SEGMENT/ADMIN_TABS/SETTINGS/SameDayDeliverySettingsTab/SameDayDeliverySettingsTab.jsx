import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";
import axiosInstance from "../../../../../SERVICES/axiosInstance";
import { selectAdminUser } from "../../../ADMIN_REDUX_MANAGEMENT/adminAuthSlice";
import { ROLES } from "../../../roles";

function parsePincodes(raw) {
  return String(raw || "")
    .split(/[\s,;]+/)
    .map((p) => p.replace(/\D/g, "").slice(0, 6))
    .filter((p) => /^\d{6}$/.test(p));
}

function uniqueSorted(list) {
  return Array.from(new Set(list)).sort();
}

function mergePincodes(current, incoming) {
  const seen = new Set(current);
  let added = 0;
  let duplicate = 0;
  const next = current.slice();
  for (const pin of incoming) {
    if (seen.has(pin)) {
      duplicate += 1;
      continue;
    }
    seen.add(pin);
    next.push(pin);
    added += 1;
  }
  return { next: uniqueSorted(next), added, duplicate };
}

const SameDayDeliverySettingsTab = () => {
  const adminUser = useSelector(selectAdminUser);
  const canEdit = String(adminUser?.role || "").toLowerCase() === ROLES.ADMIN;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [pincodes, setPincodes] = useState([]);
  const [savedPincodes, setSavedPincodes] = useState([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [addHint, setAddHint] = useState(null);

  const applyServerData = (d = {}) => {
    const list = uniqueSorted(Array.isArray(d.pincodes) ? d.pincodes : []);
    const on = Boolean(d.enabled);
    setEnabled(on);
    setSavedEnabled(on);
    setPincodes(list);
    setSavedPincodes(list);
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setSaveOk(false);
    try {
      const res = await axiosInstance.get("/admin/same-day-delivery/settings", {
        authContext: "admin",
      });
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Could not load same day delivery settings");
      }
      applyServerData(res.data.data || {});
    } catch (e) {
      setFetchError(e.response?.data?.message || e.message || "Could not load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const dirty =
    enabled !== savedEnabled ||
    pincodes.join(",") !== savedPincodes.join(",");

  const filteredPincodes = useMemo(() => {
    const q = query.replace(/\D/g, "");
    if (!q) return pincodes;
    return pincodes.filter((pin) => pin.includes(q));
  }, [pincodes, query]);

  const addFromRaw = (raw) => {
    const incoming = parsePincodes(raw);
    if (!incoming.length) {
      setAddHint({ ok: false, text: "Enter a 6-digit pincode, or paste a list." });
      return false;
    }
    const { next, added, duplicate } = mergePincodes(pincodes, incoming);
    setPincodes(next);
    setSaveOk(false);
    setSaveError(null);
    if (added && duplicate) {
      setAddHint({ ok: true, text: `Added ${added}. ${duplicate} already listed.` });
    } else if (added) {
      setAddHint({ ok: true, text: added === 1 ? `Added ${incoming[0]}.` : `Added ${added} pincodes.` });
    } else {
      setAddHint({ ok: false, text: "Those pincodes are already listed." });
    }
    return added > 0;
  };

  const handleAddDraft = () => {
    if (addFromRaw(draft)) setDraft("");
  };

  const handleAddBulk = () => {
    if (addFromRaw(bulkText)) {
      setBulkText("");
      setBulkOpen(false);
    }
  };

  const removePincode = (pin) => {
    setPincodes((prev) => prev.filter((p) => p !== pin));
    setSaveOk(false);
    setAddHint(null);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const res = await axiosInstance.put(
        "/admin/same-day-delivery/settings",
        { enabled, pincodes },
        { authContext: "admin" }
      );
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Update failed");
      }
      applyServerData(res.data.data || {});
      setSaveOk(true);
      setAddHint(null);
    } catch (e) {
      setSaveError(e.response?.data?.message || e.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading same day delivery settings…
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-6 font-sans">
      <p className="text-sm text-gray-500 leading-relaxed">
        Turn same day delivery on for ecomm checkout and keep the eligible pincode list here.
        Standard courier delivery is not changed.
      </p>

      {fetchError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {fetchError}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-200">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Availability</span>
        </div>
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Enable same day delivery</p>
            <p className="text-xs text-gray-500 mt-1">
              When off, checkout only shows Standard Delivery.
            </p>
          </div>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => {
              setEnabled((v) => !v);
              setSaveOk(false);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              enabled ? "bg-blue-600" : "bg-gray-300"
            }`}
            aria-pressed={enabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Eligible pincodes</span>
          <span className="text-xs font-medium text-gray-500">
            {pincodes.length} {pincodes.length === 1 ? "pincode" : "pincodes"}
            {query && filteredPincodes.length !== pincodes.length
              ? ` · showing ${filteredPincodes.length}`
              : ""}
          </span>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-500">
            Checkout offers Same Day only for these pins. Add one pincode, or paste many at once.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                disabled={!canEdit}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setAddHint(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDraft();
                  }
                }}
                placeholder="Add 110001, or paste 110001, 122001, 400001"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              />
            </div>
            <button
              type="button"
              disabled={!canEdit}
              onClick={handleAddDraft}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {addHint && (
            <p className={`text-xs ${addHint.ok ? "text-emerald-700" : "text-amber-700"}`}>
              {addHint.text}
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                value={query}
                onChange={(e) => setQuery(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Search pincode"
                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setBulkOpen((v) => !v)}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                {bulkOpen ? "Hide paste box" : "Paste a list"}
              </button>
              {canEdit && pincodes.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPincodes([]);
                    setSaveOk(false);
                    setAddHint(null);
                  }}
                  className="font-medium text-gray-500 hover:text-red-600"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {bulkOpen && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
              <textarea
                rows={4}
                disabled={!canEdit}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"110001\n122001\n400001"}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-gray-400">
                  One per line, or comma / space separated. Duplicates are skipped.
                </p>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={handleAddBulk}
                  className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                >
                  Add these
                </button>
              </div>
            </div>
          )}

          <div className="min-h-[140px] max-h-[360px] overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/70 p-3">
            {pincodes.length === 0 ? (
              <div className="h-[116px] flex flex-col items-center justify-center text-center text-sm text-gray-400">
                <MapPin size={20} className="mb-2 text-gray-300" />
                No pincodes yet. Add the pins that can use same day delivery.
              </div>
            ) : filteredPincodes.length === 0 ? (
              <div className="h-[116px] flex items-center justify-center text-sm text-gray-400">
                No pincode matches “{query}”.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredPincodes.map((pin) => (
                  <span
                    key={pin}
                    className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-white border border-gray-200 text-[13px] font-mono font-semibold text-gray-800 shadow-xs"
                  >
                    {pin}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removePincode(pin)}
                        className="p-0.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title={`Remove ${pin}`}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {saveError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {saveError}
            </div>
          )}
          {saveOk && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              Settings saved.
            </div>
          )}

          {canEdit ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                disabled={saving || !dirty}
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Saving…" : "Save settings"}
              </button>
              {dirty && (
                <span className="text-xs text-amber-700">Unsaved changes</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-amber-700">Only admin can change these settings.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SameDayDeliverySettingsTab;
