import React from "react";
import { labelize, statusPillClass } from "./dropshipperFormat";

export function StatusPill({ status, children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusPillClass(status)}`}
    >
      {children || labelize(status)}
    </span>
  );
}

export function ListPager({ page, totalPages, total, onChange, disabled }) {
  const pages = Math.max(1, Number(totalPages) || 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
      <span>{Number(total) || 0} total</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-40"
        >
          Prev
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          type="button"
          disabled={disabled || page >= pages}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function SearchRow({ value, onChange, onSubmit, onClear, placeholder }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
    >
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#F7A221] focus:bg-white focus:ring-2 focus:ring-[#F7A221]/15"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-black"
        >
          Search
        </button>
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600"
          >
            Clear
          </button>
        ) : null}
      </div>
    </form>
  );
}
