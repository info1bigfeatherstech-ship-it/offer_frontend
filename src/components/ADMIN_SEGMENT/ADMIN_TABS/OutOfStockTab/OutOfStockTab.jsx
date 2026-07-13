import React, { useMemo, useState } from 'react';
import { useGetOutOfStockInquiriesQuery } from '../../ADMIN_REDUX_MANAGEMENT/outOfStockInquiryApi';

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

const OutOfStockTab = () => {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [days, setDays] = useState(30);
  const limit = 20;

  const queryArgs = useMemo(
    () => ({ page, limit, search, days }),
    [page, limit, search, days]
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetOutOfStockInquiriesQuery(queryArgs);

  const rows = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 0 };
  const totalPages = Math.max(1, Number(pagination.totalPages) || 1);

  const applySearch = (e) => {
    e?.preventDefault?.();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const pageButtons = useMemo(() => {
    const maxButtons = 5;
    const start = Math.max(1, Math.min(page - 2, totalPages - maxButtons + 1));
    const end = Math.min(totalPages, start + maxButtons - 1);
    const list = [];
    for (let i = Math.max(1, start); i <= end; i += 1) list.push(i);
    return list;
  }, [page, totalPages]);

  return (
    <div className="p-4 space-y-6 bg-[#F8FAFC] min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Out of Stock Query
          </h1>
          <p className="text-xs text-slate-500">
            Customers who asked to be notified when a product is back in stock.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <form
        onSubmit={applySearch}
        className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex flex-wrap items-center gap-3"
      >
        <div className="relative flex-1 min-w-[220px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search email, phone, product name…"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
          />
        </div>
        <select
          value={days}
          onChange={(e) => {
            setDays(Number(e.target.value) || 30);
            setPage(1);
          }}
          className="bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg shadow-sm outline-none"
        >
          <option value={15}>Last 15 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900"
        >
          Apply
        </button>
      </form>

      <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
        {isFetching && !isLoading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-[1px]"
            aria-busy="true"
            aria-live="polite"
          >
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm font-medium text-gray-600">Updating results…</span>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading inquiries…</div>
        ) : isError ? (
          <div className="p-10 text-center text-sm text-red-600">
            {error?.data?.message || 'Could not load inquiries.'}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No out-of-stock inquiries in this range.
          </div>
        ) : (
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Customer
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt=""
                          className="w-10 h-10 rounded-lg border border-gray-200 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-100 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {item.productName || 'Product'}
                        </p>
                        {item.variantSku ? (
                          <p className="text-xs text-slate-500 mt-0.5">SKU: {item.variantSku}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      {item.email ? (
                        <span className="text-sm text-slate-800 break-all">{item.email}</span>
                      ) : null}
                      {item.phone ? (
                        <span className="text-sm text-slate-700">{item.phone}</span>
                      ) : null}
                      {!item.email && !item.phone ? (
                        <span className="text-sm text-slate-400">—</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <span className="text-sm text-slate-700">{fmtDate(item.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-center gap-2 bg-[#F8FAFC]/50">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
          >
            Prev
          </button>
          {pageButtons.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                page === p
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
          <span className="text-xs text-slate-400 ml-2">{pagination.total || 0} total</span>
        </div>
      </div>
    </div>
  );
};

export default OutOfStockTab;
