import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  setDropshipPrice,
  enableDropship,
  disableDropship,
  applyDropshipVariantToLocal,
  getDropshipStatusMeta,
} from '../../../SERVICES/adminDropshipperApi';

/**
 * Dedicated dropship controls — calls /api/admin/dropshipper only.
 * Never mutates ecomm/wholesale save payloads.
 */
const DropshipControls = ({
  slug,
  productCode,
  variant,
  onVariantUpdated,
  disabled = false,
  compact = false,
}) => {
  const [priceInput, setPriceInput] = useState('');
  const [busy, setBusy] = useState(null); // 'price' | 'enable' | 'disable' | null
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    const base = variant?.price?.dropshipBase;
    setPriceInput(base != null && base !== '' ? String(base) : '');
    setLocalError(null);
  }, [slug, productCode, variant?.price?.dropshipBase, variant?.channelVisibility?.dropship]);

  const status = getDropshipStatusMeta(variant);
  const canAct = Boolean(slug && productCode) && !disabled && !busy;

  const syncFromApiVariant = (apiVariant) => {
    if (!apiVariant || typeof onVariantUpdated !== 'function') return;
    const patch = applyDropshipVariantToLocal(apiVariant);
    onVariantUpdated({
      dropship: patch.dropship,
      price: {
        ...(variant?.price || {}),
        dropshipBase: patch.price.dropshipBase,
      },
      channelVisibility: {
        ...(variant?.channelVisibility || {}),
        dropship: patch.channelVisibility.dropship,
      },
    });
  };

  const parsePrice = () => {
    const n = Number(priceInput);
    if (!Number.isFinite(n) || n <= 0) {
      setLocalError('Enter a dropship price greater than 0');
      return null;
    }
    return n;
  };

  const handleSavePrice = async (alsoEnable = false) => {
    const n = parsePrice();
    if (n == null) return;
    setBusy(alsoEnable ? 'enable' : 'price');
    setLocalError(null);
    try {
      const data = await setDropshipPrice({
        slug,
        productCode,
        dropshipBase: n,
        enable: alsoEnable,
      });
      syncFromApiVariant(data.variant);
      toast.success(alsoEnable ? 'Dropship price saved & enabled' : 'Dropship price saved');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to save dropship price';
      setLocalError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleEnable = async () => {
    const hasExisting = Number(variant?.price?.dropshipBase) > 0;
    const n = priceInput !== '' ? Number(priceInput) : null;
    if (!hasExisting && (!Number.isFinite(n) || n <= 0)) {
      setLocalError('Set dropship price before enabling');
      return;
    }
    setBusy('enable');
    setLocalError(null);
    try {
      const data = await enableDropship({
        slug,
        productCode,
        dropshipBase: Number.isFinite(n) && n > 0 ? n : undefined,
      });
      syncFromApiVariant(data.variant);
      toast.success('Dropship listing enabled');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to enable dropship';
      setLocalError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleDisable = async (clearPrice = false) => {
    const label = clearPrice
      ? 'Disable dropship and clear price for this variant?'
      : 'Disable dropship listing for this variant? (price kept)';
    if (!window.confirm(label)) return;
    setBusy('disable');
    setLocalError(null);
    try {
      const data = await disableDropship({ slug, productCode, clearPrice });
      syncFromApiVariant(data.variant);
      if (clearPrice) setPriceInput('');
      toast.success(clearPrice ? 'Dropship disabled & price cleared' : 'Dropship listing disabled');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to disable dropship';
      setLocalError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  if (!slug || !productCode) {
    return (
      <div className="p-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-500">
        Save the product / variant first to manage dropship pricing.
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-teal-200 bg-teal-50/60 ${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Dropship</p>
          <p className="text-xs text-gray-500">
            Separate channel — does not change ecom / wholesale. Saves immediately via dropship APIs.
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${status.className}`}>
          {status.label}
          {status.priceLabel ? ` · ${status.priceLabel}` : ''}
        </span>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Dropship price (₹)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={priceInput}
          disabled={!slug || !productCode || disabled || !!busy}
          onChange={(e) => {
            setPriceInput(e.target.value);
            setLocalError(null);
          }}
          className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
          placeholder="e.g. 400"
        />
      </div>

      {localError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1">{localError}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canAct}
          onClick={() => handleSavePrice(false)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-teal-300 text-teal-800 hover:bg-teal-100 disabled:opacity-50"
        >
          {busy === 'price' ? 'Saving…' : 'Save price'}
        </button>
        <button
          type="button"
          disabled={!canAct}
          onClick={() => handleSavePrice(true)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {busy === 'enable' ? 'Working…' : 'Save & enable'}
        </button>
        <button
          type="button"
          disabled={!canAct || status.key === 'active'}
          onClick={handleEnable}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-100 text-teal-800 hover:bg-teal-200 disabled:opacity-50"
        >
          Enable
        </button>
        <button
          type="button"
          disabled={!canAct || status.key === 'off'}
          onClick={() => handleDisable(false)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          {busy === 'disable' ? 'Working…' : 'Disable'}
        </button>
        <button
          type="button"
          disabled={!canAct || status.key === 'off'}
          onClick={() => handleDisable(true)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Disable & clear price
        </button>
      </div>
    </div>
  );
};

export default DropshipControls;
