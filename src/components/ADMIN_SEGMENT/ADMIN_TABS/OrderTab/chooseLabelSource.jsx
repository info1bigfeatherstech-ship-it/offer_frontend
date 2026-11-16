import React from "react";
import { createRoot } from "react-dom/client";

export function LabelSourcePickerModal({ onChoose }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      onClick={() => onChoose(null)}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="label-source-picker-title"
      >
        <h3 id="label-source-picker-title" className="text-base font-semibold text-slate-900">
          Shipping label source
        </h3>
        <p className="mt-2 mb-4 text-sm text-slate-600">
          Custom uses your branded 4×6 layout. Provider is the courier&apos;s original label file.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onChoose(null)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onChoose("provider")}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Provider (courier)
          </button>
          <button
            type="button"
            onClick={() => onChoose("custom")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Custom (branded 4×6)
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * @returns {Promise<'custom'|'provider'|null>}
 */
export function chooseLabelSource() {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.setAttribute("data-label-source-picker", "1");
    document.body.appendChild(host);

    const finish = (value) => {
      root.unmount();
      host.remove();
      resolve(value);
    };

    const root = createRoot(host);
    root.render(<LabelSourcePickerModal onChoose={finish} />);
  });
}