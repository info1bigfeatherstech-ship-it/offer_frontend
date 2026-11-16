import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import {
  getDropshipperSettings,
  updateDropshipperSettings,
} from "../../../../SERVICES/adminDropshipperApi";
import { selectAdminUser } from "../../ADMIN_REDUX_MANAGEMENT/adminAuthSlice";
import { ROLES } from "../../roles";
import { apiErrorMessage, formatDateTime } from "./dropshipperFormat";

const DropshipperSettingsTab = () => {
  const adminUser = useSelector(selectAdminUser);
  const canWrite = String(adminUser?.role || "").toLowerCase() === ROLES.ADMIN;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feeInput, setFeeInput] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [years, setYears] = useState(1);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [saved, setSaved] = useState({ fee: "", open: true });

  const applySettings = (settings = {}) => {
    const fee =
      settings.subscriptionAmountInr == null ? "" : String(settings.subscriptionAmountInr);
    const open = settings.registrationOpen !== false;
    setFeeInput(fee);
    setRegistrationOpen(open);
    setYears(Number(settings.subscriptionYears) || 1);
    setUpdatedAt(settings.updatedAt || null);
    setSaved({ fee, open });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDropshipperSettings();
      applySettings(data?.settings || {});
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load dropshipper settings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const parsedFee = Number(String(feeInput).replace(/,/g, "").trim());
  const feeValid = Number.isFinite(parsedFee) && parsedFee >= 1 && parsedFee <= 1000000;
  const dirty = feeInput !== saved.fee || registrationOpen !== saved.open;

  const handleSave = async () => {
    if (!canWrite || saving) return;
    if (!feeValid) {
      toast.error("Subscription fee must be between 1 and 10,00,000 INR");
      return;
    }
    setSaving(true);
    try {
      const data = await updateDropshipperSettings({
        subscriptionAmountInr: parsedFee,
        registrationOpen,
      });
      applySettings(data?.settings || {});
      toast.success(data?.message || "Dropshipper settings updated");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save dropshipper settings"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading dropshipper settings…
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Dropshipper settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          The subscription fee is charged on the partner portal. Length stays at 1 year.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <button type="button" onClick={load} className="ml-3 font-semibold underline">
            Retry
          </button>
        </div>
      ) : null}

      {!canWrite ? (
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Only an admin can change the fee or registration status.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50/80 px-6 py-3">
          <span className="text-xs uppercase tracking-widest text-gray-500">Subscription</span>
        </div>
        <div className="space-y-5 px-6 py-5">
          <label className="block">
            <span className="text-sm font-semibold text-gray-900">Fee (INR)</span>
            <input
              type="text"
              inputMode="decimal"
              disabled={!canWrite || saving}
              value={feeInput}
              onChange={(event) => {
                const next = event.target.value.replace(/[^\d.]/g, "");
                const [whole, ...rest] = next.split(".");
                setFeeInput(rest.length ? `${whole}.${rest.join("")}` : whole);
              }}
              className="mt-2 w-full max-w-xs rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
            {feeInput && !feeValid ? (
              <p className="mt-1 text-xs text-red-600">Enter an amount from 1 to 10,00,000.</p>
            ) : null}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-900">Subscription years</span>
            <input
              type="text"
              readOnly
              value={years || 1}
              className="mt-2 w-full max-w-xs cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-600"
            />
            <p className="mt-1 text-xs text-gray-500">Fixed at 1 year. This cannot be edited.</p>
          </label>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Registration open</p>
              <p className="mt-1 text-xs text-gray-500">
                When off, the partner portal rejects new applications.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={registrationOpen}
              disabled={!canWrite || saving}
              onClick={() => setRegistrationOpen((open) => !open)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                registrationOpen ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  registrationOpen ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {updatedAt ? (
            <p className="text-xs text-gray-400">Last updated {formatDateTime(updatedAt)}</p>
          ) : null}
        </div>
      </div>

      {canWrite ? (
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || !feeValid || saving}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      ) : null}
    </div>
  );
};

export default DropshipperSettingsTab;
