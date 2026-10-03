import React from 'react';

/**
 * Optional dropship fields for create / add-variant flows.
 * Empty = no API call after save. Never blocks product create.
 */
const OptionalDropshipFields = ({
  dropshipBase = '',
  dropshipEnable = false,
  onBaseChange,
  onEnableChange,
  disabled = false,
}) => {
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">Dropship (optional)</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Leave empty to skip. Applied after the product/variant is created — does not affect ecom or wholesale.
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Dropship price (₹)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          disabled={disabled}
          value={dropshipBase}
          onChange={(e) => onBaseChange?.(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
          placeholder="Optional — e.g. 400"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
        <input
          type="checkbox"
          disabled={disabled || !String(dropshipBase || '').trim()}
          checked={dropshipEnable === true}
          onChange={(e) => onEnableChange?.(e.target.checked)}
          className="rounded border-teal-300 text-teal-600 focus:ring-teal-500"
        />
        Enable dropship listing after save (requires price)
      </label>
    </div>
  );
};

export default OptionalDropshipFields;
