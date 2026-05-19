// pages/TagProducts.jsx
import React, { useEffect, useCallback, useState, useRef, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft, AlertCircle, RefreshCw, ChevronRight,
  Filter, X, SlidersHorizontal, Loader2, ChevronDown,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import ProductCard from "../../Product_segment/ProductCard";
import SkeletonCard from "../../Product_segment/Product_Card_Skelleton/SkeletonCard";

import {
  fetchProductsByTag,
  selectProductsByTag,
  selectLoadingByTag,
  selectErrorByTag,
  selectPaginationByTag,
  clearTagProducts,
} from "../../../components/REDUX_FEATURES/REDUX_SLICES/userProductsSlice";

import usePaginatedFetch from "../../../components/HOOKS/usePaginatedFetch";

// ── Constants ─────────────────────────────────────────────────────────────────
const TAG_META = {
  "on-sale": {
    title: "On Sale",
    subtitle: "Best Deals, Handpicked For You",
    accentColor: "#F7A221",
  },
  "today-arrival": {
    title: "Today's Deal",
    subtitle: "Fresh Drops, Just In",
    accentColor: "#22C55E",
  },
};

const LOAD_MORE_SKELETON_COUNT = 25;

const getColumnCount = () => {
  const w = window.innerWidth;
  if (w >= 1280) return 6;  // Changed from 4 to 6
  if (w >= 1024) return 3;
  return 2;                 // Changed from 1 to 2 (better mobile experience)
};
const getProductPrimaryVariant = (product) => product?.variants?.[0] ?? null;

const getProductPayPrice = (product) => {
  const variant = getProductPrimaryVariant(product);
  const base = Number(variant?.price?.base) || 0;
  const sale = Number(variant?.price?.sale);
  return Number.isFinite(sale) ? sale : base;
};

const getProductListPrice = (product) => {
  const variant = getProductPrimaryVariant(product);
  return Number(variant?.price?.base) || 0;
};

const getProductDiscountPct = (product) => {
  const base = getProductListPrice(product);
  const pay = getProductPayPrice(product);
  return base > 0 ? Math.round(((base - pay) / base) * 100) : 0;
};

const getProductCreatedTime = (product) => {
  const raw = product?.createdAt ?? product?.updatedAt ?? product?.created_at;
  const t = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
};


// ── FilterPanel — OUTSIDE TagProducts to fix Rules of Hooks violation ─────────
const FilterPanel = ({ filters, toggleFilter, clearFilters, activeFilterCount }) => (
  <div className="space-y-7 font-['satoshi']">
    {/* Price */}
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">Price Range</h4>
      <div className="space-y-1.5">
        {[
          { label: "Under ₹29", val: "u29" },
          { label: "₹29 - ₹49", val: "29-49" },
          { label: "₹49 - ₹79", val: "49-79" },
          { label: "₹99 & above", val: "o99" },
        ].map(({ label, val }) => (
          <label key={val} className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${filters.price.includes(val) ? "bg-zinc-900 border-zinc-900" : "border-zinc-300 group-hover:border-zinc-500"
                }`}
              onClick={() => toggleFilter("price", val)}
            >
              {filters.price.includes(val) && (
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
            </div>
            <span
              className={`text-sm ${filters.price.includes(val) ? "text-zinc-900 font-medium" : "text-zinc-800"}`}
              onClick={() => toggleFilter("price", val)}
            >
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>

    <div className="h-px bg-zinc-100" />

    {/* Availability */}
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">Availability</h4>
      <div className="space-y-1.5">
        {[
          { label: "In stock", val: "instock" },
          { label: "Out of stock", val: "outofstock" },
        ].map(({ label, val }) => (
          <label key={val} className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${filters.availability.includes(val) ? "bg-zinc-900 border-zinc-900" : "border-zinc-300 group-hover:border-zinc-500"
                }`}
              onClick={() => toggleFilter("availability", val)}
            >
              {filters.availability.includes(val) && (
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              className={`text-sm transition-colors ${filters.availability.includes(val) ? "text-zinc-900 font-medium" : "text-zinc-800"}`}
              onClick={() => toggleFilter("availability", val)}
            >
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>

    <div className="h-px bg-zinc-100" />

    {/* Discount */}
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">Discount</h4>
      <div className="space-y-1.5">
        {[
          { label: "Under 10%", val: "u10" },
          // { label: "10% or more", val: "10" },
          { label: "25% or more", val: "25" },
          { label: "50% or more", val: "50" },
        ].map(({ label, val }) => (
          <label key={val} className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${filters.discount.includes(val) ? "bg-zinc-900 border-zinc-900" : "border-zinc-300 group-hover:border-zinc-500"
                }`}
              onClick={() => toggleFilter("discount", val)}
            >
              {filters.discount.includes(val) && (
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              className={`text-sm transition-colors ${filters.discount.includes(val) ? "text-zinc-900 font-medium" : "text-zinc-800"}`}
              onClick={() => toggleFilter("discount", val)}
            >
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>

    {activeFilterCount > 0 && (
      <button
        onClick={clearFilters}
        className="w-full py-2.5 text-[11px] font-bold uppercase tracking-widest border border-zinc-200 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
      >
        Clear all filters
      </button>
    )}
  </div>
);

// ── VirtualizedProductGrid ────────────────────────────────────────────────────
const VirtualizedProductGrid = ({ products, loadingMore }) => {
  const parentRef = useRef(null);
  const [cols, setCols] = useState(getColumnCount);

  useEffect(() => {
    const onResize = () => setCols(getColumnCount());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < products.length; i += cols) {
      result.push(products.slice(i, i + cols));
    }
    return result;
  }, [products, cols]);

  const skeletonRowCount = loadingMore ? Math.ceil(LOAD_MORE_SKELETON_COUNT / cols) : 0;
  const totalRows = rows.length + skeletonRowCount;

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 420,
    overscan: 3,
  });

  return (
    <div ref={parentRef} style={{ width: "100%" }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const isSkeletonRow = virtualRow.index >= rows.length;
          const rowItems = isSkeletonRow ? Array(cols).fill(null) : rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-x-4 gap-y-10 md:gap-x-8 pb-10">
                {isSkeletonRow
                  ? Array(cols).fill(null).map((_, i) => (
                    <SkeletonCard key={`skel-${virtualRow.index}-${i}`} />
                  ))
                  : rowItems.map((product, i) => (
                    <ProductCard
                      key={product._id || i}
                      product={product}
                      index={virtualRow.index * cols + i}
                      seed={i}
                    />
                  ))
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── TagProducts — Main Component ──────────────────────────────────────────────
const TagProducts = (props) => {
  const { tag } = useParams();
  const rawTag = props?.tag || tag;
  const normalizedTag = rawTag.replace("_", "-");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const meta = TAG_META[normalizedTag] || {
    title: normalizedTag,
    subtitle: "",
    accentColor: "#F7A221",
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [filters, setFilters] = useState({
    price: [],
    availability: [],
    discount: [],
  });

  // ── Memoized selectors ────────────────────────────────────────────────────
  const selectProducts = useMemo(() => selectProductsByTag(normalizedTag), [normalizedTag]);
  const selectLoading = useMemo(() => selectLoadingByTag(normalizedTag), [normalizedTag]);
  const selectPagination = useMemo(() => selectPaginationByTag(normalizedTag), [normalizedTag]);

  // ── fetchParams memoized — prevent new object reference every render ──────
  const fetchParams = useMemo(() => ({ tag: normalizedTag }), [normalizedTag]);

  // ── Paginated fetch ───────────────────────────────────────────────────────
  const {
    data: products,
    isLoading,
    isFetchingMore: loadingMore,
    pagination,
    loadMore: handleLoadMore,
    resetPage,
  } = usePaginatedFetch({
    fetchAction: fetchProductsByTag,
    selectData: selectProducts,
    selectLoading: selectLoading,
    selectPagination: selectPagination,
    fetchParams,
    limit: 25,
  });

  // ── Tag change: reset filters + scroll ───────────────────────────────────
  useEffect(() => {
    setFilters({ price: [], availability: [], discount: [] });
    setSortBy("default");
  }, [normalizedTag]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useLayoutEffect(() => {
    return () => dispatch(clearTagProducts(normalizedTag));
  }, [normalizedTag, dispatch]);

  // ── Filter logic ──────────────────────────────────────────────────────────
  const toggleFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const exists = prev[key].includes(value);
      return {
        ...prev,
        [key]: exists ? prev[key].filter((v) => v !== value) : [...prev[key], value],
      };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ price: [], availability: [], discount: [] });
  }, []);

  const activeFilterCount = useMemo(() => {
    return filters.price.length + filters.availability.length + filters.discount.length;
  }, [filters]);

  const filteredProducts = useMemo(() => {
    if (!products?.length) return [];
    return products.filter((product) => {
      const variant = getProductPrimaryVariant(product);
      const base = getProductListPrice(product);
      const pay = getProductPayPrice(product);
      const qty = variant?.inventory?.quantity ?? 0;
      const discount = getProductDiscountPct(product);

      if (filters.price.length > 0) {
        const priceMatch = filters.price.some((p) => {
          if (p === "u29")   return pay <= 29;
          if (p === "29-49") return pay >= 29 && pay < 49;
          if (p === "49-79") return pay >= 49 && pay < 79;
          if (p === "o99")   return pay >= 99;
          return false;
        });
        if (!priceMatch) return false;
      }

      if (filters.availability.length > 0) {
        const stockMatch = filters.availability.some((a) => {
          if (a === "instock") return qty > 0;
          if (a === "outofstock") return qty <= 0;
          return false;
        });
        if (!stockMatch) return false;
      }

      if (filters.discount.length > 0) {
        const discountMatch = filters.discount.some((d) => {
          if (d === "u10") return discount < 10;
          if (d === "25")  return discount >= 25;
          if (d === "50")  return discount >= 50;
          return false;
        });
        if (!discountMatch) return false;
      }

      return true;
    });
  }, [products, filters]);

  const sortedProducts = useMemo(() => {
    const data = [...filteredProducts];
    switch (sortBy) {
      case "priceLowHigh":
        return data.sort((a, b) => getProductPayPrice(a) - getProductPayPrice(b));
      case "priceHighLow":
        return data.sort((a, b) => getProductPayPrice(b) - getProductPayPrice(a));
      case "discount":
        return data.sort((a, b) => getProductDiscountPct(b) - getProductDiscountPct(a));
      case "az":
        return data.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
      case "za":
        return data.sort((a, b) => String(b?.name || "").localeCompare(String(a?.name || "")));
      case "newest":
        return data.sort((a, b) => getProductCreatedTime(b) - getProductCreatedTime(a));
      default:
        return data;
    }
  }, [filteredProducts, sortBy]);

  const error = useSelector(selectErrorByTag(normalizedTag));
  const hasError = !isLoading && !!error;
  const hasMore = pagination?.hasNextPage ?? false;

  const handleRetry = useCallback(() => resetPage(), [resetPage]);

  // ── Scroll to section when filters/sort changes ────────────────────────────
  useEffect(() => {
    setTimeout(() => {
      const element = document.getElementById("tagProducts-grid");
      if (element) {
        const elementPosition = element.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - 800; // 120px offset from top
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    }, 0);
  }, [filters, sortBy]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* STICKY BREADCRUMB */}
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-40" id="tagProducts-top">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-1 text-zinc-500 hover:text-zinc-900">
              <ArrowLeft size={20} />
            </button>
            <nav className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
              <Link to="/" className="text-gray-700">Home</Link>
              <ChevronRight size={10} />
              <span className="text-zinc-900 font-bold">{meta.title}</span>
            </nav>
          </div>
          <button onClick={() => setIsFilterOpen(true)} className="md:hidden flex items-center gap-2 p-2 text-zinc-900">
            <Filter size={18} />
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* HERO */}
      {/* HERO */}
      <section className="relative h-[40vh] md:h-[50vh] flex items-end overflow-hidden">
        {/* BACKGROUND IMAGE - DIFFERENT FOR EACH TAG */}
        <div className="absolute inset-0">
          {normalizedTag === "on-sale" && (
            <img
              src="/Sale.png"  /* CHANGE THIS TO YOUR SALE IMAGE PATH */
              alt="Sale Banner"
              className="w-full h-full object-cover"
            />
          )}
          {normalizedTag === "today-arrival" && (
            <img
              src="Today.png"  /* CHANGE THIS TO YOUR TODAY'S DEAL IMAGE PATH */
              alt="Today's Deal Banner"
              className="w-full h-full object-cover"
            />
          )}
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
        </div>

        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: meta.accentColor }} />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 pb-10 md:pb-14">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-3 flex items-center gap-2" style={{ color: meta.accentColor }}>
                <span className="w-6 h-[2px] inline-block" style={{ backgroundColor: meta.accentColor }} />
                Collection
              </p>
              <h1 className="text-5xl md:text-7xl font-black text-white uppercase leading-none tracking-tighter">
                {meta.title}
              </h1>
              <p className="mt-4 max-w-md text-gray-200 text-sm leading-relaxed font-medium">
                {meta.subtitle}
              </p>
            </div>
            {!isLoading && (
              <div className="hidden md:flex flex-col items-center flex-shrink-0">
                <span className="text-5xl font-black text-white leading-none">
                  {pagination?.total || 0}
                </span>
                <span className="text-[11px] text-center font-bold uppercase tracking-[0.2em] text-gray-300 mt-1">
                  Products
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-12 flex flex-col md:flex-row gap-10">

        {/* SIDEBAR */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="sticky top-24">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-6">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={15} />
                <span className="text-sm font-bold uppercase tracking-widest">Filters</span>
              </div>
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <FilterPanel
              filters={filters}
              toggleFilter={toggleFilter}
              clearFilters={clearFilters}
              activeFilterCount={activeFilterCount}
            />
          </div>
        </aside>

        {/* PRODUCT GRID */}
        <div className="flex-grow" id="tagProducts-grid">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <p className="text-xs font-['satoshi'] font-semibold uppercase text-zinc-800 tracking-[0.1em]">Sort By :</p>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white/60 backdrop-blur-md px-3 pr-10 py-2 text-sm font-semibold text-zinc-800 rounded-md shadow-sm border border-zinc-200 hover:border-zinc-400 focus:border-black focus:ring-0 outline-none transition-all cursor-pointer"
                >
                  <option value="default">Default</option>

                  <option value="priceLowHigh">Price: Low to High</option>
                  <option value="priceHighLow">Price: High to Low</option>
                  <option value="discount">Highest Discount</option>
                  <option value="newest">Newest First</option>

                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-full border border-zinc-200">
              <span className="text-lg font-semibold text-zinc-800">{filteredProducts.length}</span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-400">Products</span>
            </div>
          </div>

          {/* Content */}
          <div className="relative min-h-[60vh]">

            {/* ERROR */}
            {hasError && (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <div className="p-4 rounded-full bg-red-50 mb-4">
                  <AlertCircle size={28} className="text-red-400" />
                </div>
                <p className="text-zinc-600 text-sm mb-6 max-w-sm">Something went wrong while loading products.</p>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-5 py-2 border border-zinc-300 rounded-full hover:bg-black hover:text-white transition-all"
                >
                  <RefreshCw size={14} /> Retry
                </button>
              </div>
            )}

            {/* INITIAL LOADING */}
            {isLoading && (!products || products.length === 0) && (
               <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="animate-pulse space-y-3">
                    <div className="aspect-[4/5] bg-gradient-to-br from-zinc-100 to-zinc-200 rounded-lg" />
                    <div className="h-3 bg-zinc-200 rounded w-3/4" />
                    <div className="h-3 bg-zinc-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* MAIN GRID */}
            {!isLoading && !hasError && sortedProducts.length > 0 && (
              <div className="animate-in fade-in duration-700">
                <VirtualizedProductGrid products={sortedProducts} loadingMore={loadingMore} key={normalizedTag} />

                {/* LOAD MORE */}
                <div className="mt-20 text-center">
                  {hasMore ? (
                    <div className="space-y-6">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="group relative px-10 py-3 rounded-full hover:bg-orange-400 duration-300 bg-zinc-800 text-zinc-100 overflow-hidden transition-all disabled:opacity-60"
                      >
                        <span className="relative z-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
                          {loadingMore ? <Loader2 size={14} className="animate-spin" /> : "Load More"}
                        </span>
                      </button>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                        {products.length} / {pagination?.total || 0} viewed
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs uppercase tracking-[0.4em] text-zinc-300 py-10">End of Collection</p>
                  )}
                </div>
              </div>
            )}

            {/* EMPTY — filters ne sab hataya */}
            {!isLoading && !hasError && sortedProducts.length === 0 && products?.length > 0 && (
              <div className="py-32 flex flex-col items-center text-center">
                <h2 className="text-xl font-semibold text-zinc-700 mb-2">No products found</h2>
                <p className="text-zinc-400 text-xs uppercase tracking-widest mb-6">Try different filters</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 text-xs font-semibold uppercase tracking-wider border border-zinc-300 rounded-full hover:bg-black hover:text-white transition"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE FILTER DRAWER */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold uppercase tracking-tighter">Filters</h3>
                {activeFilterCount > 0 && (
                  <span className="text-[10px] font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button onClick={() => setIsFilterOpen(false)}><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <FilterPanel
                filters={filters}
                toggleFilter={toggleFilter}
                clearFilters={clearFilters}
                activeFilterCount={activeFilterCount}
              />
            </div>
            <div className="px-6 py-4 border-t border-zinc-100">
              <button
                onClick={() => setIsFilterOpen(false)}
                className="w-full bg-zinc-900 text-white py-4 text-xs font-black uppercase tracking-widest"
              >
                Show {filteredProducts.length} products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagProducts;