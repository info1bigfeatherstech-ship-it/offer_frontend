import React, { useEffect, useCallback, useState, useRef, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate, Link, useNavigationType } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Filter,
  X,
  SlidersHorizontal,
  Loader2,
  ChevronDown,
  Home,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import ProductCard from "../ProductCard";
import SkeletonCard from "../Product_Card_Skelleton/SkeletonCard";

import {
  fetchProductsByCategory,
  selectProductsBySlug,
  selectLoadingBySlug,
  selectErrorBySlug,
  selectPaginationBySlug,
} from "../../../components/REDUX_FEATURES/REDUX_SLICES/userProductsSlice";

import {
  fetchCategoryBySlug,  
  clearCurrentCategory,
  selectCurrentCategory,
} from "../../../components/REDUX_FEATURES/REDUX_SLICES/userCategoriesSlice";
import Breadcrumb from "../Breadcrumb/Breadcrumb";
import usePaginatedFetch from "../../../components/HOOKS/usePaginatedFetch";

// ── How many columns at each breakpoint ──────────────────────────────────────
// Must match Tailwind grid classes used below
const getColumnCount = () => {
  const w = window.innerWidth;
  if (w >= 1280) return 6; // xl:grid-cols-6 (6 cards on large screens)
  if (w >= 1024) return 3; // lg:grid-cols-3 (3 cards on tablet)
  return 2;                // grid-cols-2 (2 cards on mobile)
};



const LOAD_MORE_SKELETON_COUNT = 25;

const getProductPrimaryVariant = (product) => product?.variants?.[0] ?? null;

const getProductPayPrice = (product) => {
  const variant = getProductPrimaryVariant(product);
  if (!variant) return 0;
  const { base, sale, isSaleActive } = variant.price ?? {};
  const baseNum = Number(base) || 0;
  const saleNum = Number(sale);
  // Use sale price if sale is active and sale price is a valid finite number
  if (isSaleActive && Number.isFinite(saleNum)) return saleNum;
  return baseNum;
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

const getProductAppliedTags = (product) =>
  Array.isArray(product?.appliedTags) ? product.appliedTags : [];

const isProductOnSale = (product) => {
  if (getProductAppliedTags(product).includes("on-sale")) return true;
  const base = getProductListPrice(product);
  const pay = getProductPayPrice(product);
  return base > 0 && pay < base;
};

const isProductTodayDeal = (product) => {
  if (getProductAppliedTags(product).includes("today-arrival")) return true;
  return Boolean(product?.isTodayDeal || product?.todayDeal);
};

// ── VirtualizedProductGrid ────────────────────────────────────────────────────
// Virtualizes rows of a CSS grid.
// Only rows near the viewport are in the DOM — off-screen rows are unmounted.
const VirtualizedProductGrid = ({ products, loadingMore }) => {
  const parentRef = useRef(null);
  const [cols, setCols] = useState(getColumnCount);

  useEffect(() => {
    const onResize = () => setCols(getColumnCount());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Chunk flat array into rows
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
    estimateSize: () => 420,  // approximate row height — adjust to your card
    overscan: 3,
  });



  return (
    <div ref={parentRef} style={{ width: "100%" }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const isSkeletonRow = virtualRow.index >= rows.length;
          const rowItems = isSkeletonRow
            ? Array(cols).fill(null)
            : rows[virtualRow.index];

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

// ── CatProducts ───────────────────────────────────────────────────────────────
const CatProducts = () => {
  const { slug } = useParams();
  const navigationType = useNavigationType();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  // console.log(sortBy);

  // values: default | priceLowHigh | priceHighLow | newest | discount
  // ← ADD THESE
  // ── Filters state ──────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    price: [],   // "u1000" | "1000-5000" | "5000-15000" | "o15000"
    availability: [],   // "instock" | "outofstock"
    discount: [],   // "10" | "25" | "50"
    onSale: false,
    todayDeal: false,  // Changed from todayArrival to todayDeal as requested
  });

  useEffect(() => {
  window.scrollTo({ top: 0, behavior: 'instant' });
}, [filters.onSale, filters.todayDeal]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const toggleFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const exists = prev[key].includes(value);

      return {
        ...prev,
        [key]: exists
          ? prev[key].filter((v) => v !== value)
          : [...prev[key], value],
      };
    });
  }, []);

  // ── Category metadata ──────────────────────────────────────────────────────
  const currentCategory = useSelector(selectCurrentCategory);
  const categoryLoadingState = useSelector((s) => s.userCategories.loading.category);
  const categoryErrorState = useSelector((s) => s.userCategories.error.category);

  // ── Memoized selectors ────────────────────────────────────────────────────
  const selectProducts = useMemo(() => selectProductsBySlug(slug), [slug]);
  const selectLoading = useMemo(() => selectLoadingBySlug(slug), [slug]);
  const selectPagination = useMemo(() => selectPaginationBySlug(slug), [slug]);




  const activeTags = useMemo(() => {
    const tags = [];
    if (filters.onSale) tags.push("on_sale");
    if (filters.todayDeal) tags.push("today-arrival");
    return tags.join(","); // "on_sale" | "today-arrival" | "on_sale,today-arrival" | ""
  }, [filters.onSale, filters.todayDeal]);

  // ── Paginated products ────────────────────────────────────────────────────

  const {
    data: products,
    isLoading: catLoading,
    isFetchingMore: loadingMore,
    pagination,
    loadMore: handleLoadMore,
    resetPage,
  } = usePaginatedFetch({
    fetchAction: fetchProductsByCategory,
    selectData: selectProducts,
    selectLoading: selectLoading,
    selectPagination: selectPagination,
    fetchParams: { slug, tags: activeTags },
    limit: 25, // Changed from 8 to 12 for 2 rows of 6 cards
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  const isLoading = (catLoading || categoryLoadingState) && products.length === 0;
  const hasError = !isLoading && !!categoryErrorState;
  const hasMore = pagination?.hasNextPage ?? false;

  // Friendly copy for bad slug / missing category (API still returns e.g. "Category not found")
  const categoryErrorUserMessage = useMemo(() => {
    const raw = (categoryErrorState?.message || "").trim();
    const low = raw.toLowerCase();
    if (!low) return "We're Updating this Category";
    if (low.includes("category not found") || low.includes("not found")) {
      return "We're Updating this Category";
    }
    if (low.includes("failed to load category") || low.includes("failed to fetch category")) {
      return "We're Updating this Category";
    }
    if (low.includes("404") || low.includes("status code 404")) {
      return "We're Updating this Category";
    }
    return raw;
  }, [categoryErrorState]);

  // ── Filter logic ───────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!products?.length) return [];

    return products.filter((product) => {
      const variant = getProductPrimaryVariant(product);
      const qty = variant?.inventory?.quantity ?? 0;
      const discount = getProductDiscountPct(product);
      const isOnSale = isProductOnSale(product);
      const isTodayDeal = isProductTodayDeal(product);

      // ✅ PRICE (multi-select)
      // Use effective price: sale price if isSaleActive, otherwise base price
      if (filters.price.length > 0) {
        const effectivePrice = getProductPayPrice(product);
        const priceMatch = filters.price.some((p) => {
          if (p === "u29") return effectivePrice < 29;
          if (p === "29-49") return effectivePrice >= 29 && effectivePrice <= 49;
          if (p === "49-79") return effectivePrice >= 49 && effectivePrice <= 79;
          if (p === "o99") return effectivePrice >= 99;
          return false;
        });

        if (!priceMatch) return false;
      }

      // ✅ AVAILABILITY (multi-select)
      if (filters.availability.length > 0) {
        const stockMatch = filters.availability.some((a) => {
          if (a === "instock") return qty > 0;
          if (a === "outofstock") return qty <= 0;
          return false;
        });

        if (!stockMatch) return false;
      }

      // ✅ DISCOUNT (multi-select) — "10" = 10% or more, "25" = 25%+, "50" = 50%+
      if (filters.discount.length > 0) {
        const discountMatch = filters.discount.some((d) => {
          const minPct = Number(d);
          if (!Number.isFinite(minPct)) return false;
          return discount >= minPct;
        });

        if (!discountMatch) return false;
      }

      // ✅ ON SALE
      if (filters.onSale && !isOnSale) return false;
      
      // ✅ TODAY DEAL
      if (filters.todayDeal && !isTodayDeal) return false;

      return true;
    });
  }, [products, filters]);
  
  const sortedProducts = useMemo(() => {
    const data = [...filteredProducts];

    switch (sortBy) {
      case "priceLowHigh":
        return data.sort(
          (a, b) => getProductPayPrice(a) - getProductPayPrice(b)
        );

      case "priceHighLow":
        return data.sort(
          (a, b) => getProductPayPrice(b) - getProductPayPrice(a)
        );

      case "discount":
        return data.sort(
          (a, b) => getProductDiscountPct(b) - getProductDiscountPct(a)
        );

      case "az":
        return data.sort((a, b) =>
          String(a?.name || "").localeCompare(String(b?.name || ""))
        );

      case "za":
        return data.sort((a, b) =>
          String(b?.name || "").localeCompare(String(a?.name || ""))
        );

      case "newest":
        return data.sort(
          (a, b) => getProductCreatedTime(b) - getProductCreatedTime(a)
        );

      default:
        return data;
    }
  }, [filteredProducts, sortBy]);

  const activeFilterCount = useMemo(() => {
    return (
      filters.price.length +
      filters.availability.length +
      filters.discount.length +
      (filters.onSale ? 1 : 0) +
      (filters.todayDeal ? 1 : 0)   // Updated to todayDeal
    );
  }, [filters])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const clearFilters = useCallback(() => {
    setFilters({
      price: [],
      availability: [],
      discount: [],
      onSale: false,
      todayDeal: false,  // Updated to todayDeal
    });
  }, []);

  // ── Scroll to top on category navigation (PUSH), not on browser back (POP) ─
  // so history scroll restoration can return the user to their previous scroll position.
  // Must live on CatProducts, not VirtualizedProductGrid — the grid only mounts
  // after successful load with products; loading/error left the window at footer scroll.
  // useLayoutEffect runs before paint. Use behavior: "instant" so CSS scroll-behavior: smooth
  // on html/body cannot turn this into a slow animated scroll; microtask re-runs after any
  // sync layout churn in the same turn without waiting a full frame (unlike rAF).
  useLayoutEffect(() => {
    if (!slug) return;
    if (navigationType === "POP") return;
    const toTop = () => {
      const html = document.documentElement;
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      } catch {
        window.scrollTo(0, 0);
      }
      html.scrollTop = 0;
      document.body.scrollTop = 0;
      html.style.scrollBehavior = prev;
    };
    toTop();
    queueMicrotask(toTop);
  }, [slug, navigationType]);

  // ── Category metadata fetch ────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    dispatch(clearCurrentCategory());
    dispatch(fetchCategoryBySlug(slug));
    return () => dispatch(clearCurrentCategory());
  }, [slug, dispatch]);

  // ── Retry ──────────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    dispatch(fetchCategoryBySlug(slug));
    resetPage();
  }, [slug, dispatch, resetPage]);

  const categoryName = currentCategory?.name
    || slug?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    || "Collection"; 
    
  useLayoutEffect(() => {
    if (!slug) return;
    clearFilters(); // ← add karo

    dispatch(clearCurrentCategory());
    dispatch(fetchCategoryBySlug(slug));
    return () => dispatch(clearCurrentCategory());
  }, [slug, dispatch]);


  // ── Filter Panel (shared between sidebar + drawer) ─────────────────────────
  const FilterPanel = () => (
    <div className="space-y-7 font-['satoshi']">

      {/* Price */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">
          Price Range
        </h4>
        <div className="space-y-1.5">
          {[
            { label: "Under ₹29", val: "u29" },
            { label: "₹29 - ₹49", val: "29-49" },
            { label: "₹49 - ₹79", val: "49-79" },
            { label: "₹99 & above", val: "o99" },
          ].map(({ label, val }) => (
            <label key={val} className="flex items-center gap-3 cursor-pointer group">

              <div
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all
        ${filters.price.includes(val)
                    ? "bg-zinc-900 border-zinc-900"
                    : "border-zinc-300 group-hover:border-zinc-500"
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
                className={`text-sm ${filters.price.includes(val)
                  ? "text-zinc-900 font-medium"
                  : "text-zinc-800"
                  }`}
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
        <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">
          Availability
        </h4>
        <div className="space-y-1.5">
          {[
            { label: "In stock", val: "instock" },
            { label: "Out of stock", val: "outofstock" },
          ].map(({ label, val }) => (
            <label
              key={val}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all
                  ${filters.availability.includes(val)
                    ? "bg-zinc-900 border-zinc-900"
                    : "border-zinc-300 group-hover:border-zinc-500"
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
                className={`text-sm transition-colors ${filters.availability.includes(val) ? "text-zinc-900 font-medium" : "text-zinc-800 group-hover:text-zinc-800"}`}
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
        <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">
          Discount
        </h4>
        <div className="space-y-1.5">
          {[
            { label: "under 10% or more", val: "10" },
            { label: "25% or more", val: "25" },
            { label: "50% or more", val: "50" },
          ].map(({ label, val }) => (
            <label
              key={val}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all
                  ${filters.discount.includes(val)
                    ? "bg-zinc-900 border-zinc-900"
                    : "border-zinc-300 group-hover:border-zinc-500"
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
                className={`text-sm transition-colors ${filters.discount.includes(val) ? "text-zinc-900 font-medium" : "text-zinc-800 group-hover:text-zinc-800"}`}
                onClick={() => toggleFilter("discount", val)}
              >
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="h-px bg-zinc-100" />

      {/* Deals - New Section as requested */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">
          Deals
        </h4>

        {/* On Sale Toggle */}
        <label className="flex items-center gap-3 cursor-pointer group mb-3">
          <button
            onClick={() => setFilters((prev) => ({ ...prev, onSale: !prev.onSale }))}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${filters.onSale ? "bg-zinc-900" : "bg-zinc-200"
              }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${filters.onSale ? "translate-x-4" : "translate-x-0"
                }`}
            />
          </button>
          <span className={`text-sm transition-colors ${filters.onSale ? "text-zinc-900 font-medium" : "text-zinc-800"}`}>
            On sale only
          </span>
        </label>

        {/* Today Deal Toggle */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <button
            onClick={() => setFilters((prev) => ({ ...prev, todayDeal: !prev.todayDeal }))}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${filters.todayDeal ? "bg-zinc-900" : "bg-zinc-200"
              }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${filters.todayDeal ? "translate-x-4" : "translate-x-0"
                }`}
            />
          </button>
          <span className={`text-sm transition-colors ${filters.todayDeal ? "text-zinc-900 font-medium" : "text-zinc-800"}`}>
            Today&apos;s Deal
          </span>
        </label>
      </div>

      {/* Clear */}
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

        {/* ── STICKY BREADCRUMB ── */}
        <div className="bg-white border-b border-zinc-100 sticky top-0 z-40">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-1 text-zinc-500 hover:text-zinc-900">
                <ArrowLeft size={20} />
              </button>
              <nav className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                <Link to="/" className="text-zinc-900">Home</Link>
                <ChevronRight size={10} />
                <span className="text-zinc-900 font-bold">{categoryName}</span>
              </nav>
            </div>
            <button
              onClick={() => setIsFilterOpen(true)}
              className="md:hidden flex items-center gap-2 p-2 text-zinc-900"
            >
              <Filter size={18} />
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── HERO ── */}
        <section className="relative h-[40vh] md:h-[24vh] flex flex-col overflow-hidden bg-gray-900">
          {currentCategory?.image?.url && (
            <img
              src={currentCategory.image.url}
              alt={categoryName}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 " />
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F7A221]" />
          <div className="relative z-10 flex flex-1 flex-col justify-end min-h-0 w-full max-w-7xl mx-auto px-4 md:px-8 pb-0">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="mb-3 inline-flex w-fit items-center gap-2 rounded-md bg-zinc-800/90 px-2.5 py-1.5 text-[#F7A221] text-[10px] font-black uppercase tracking-[0.25em] shadow-sm">
                  <span className="w-6 h-[2px] shrink-0 bg-[#F7A221] inline-block" />
                  Collection
                </p>
                <h1 className="text-4xl md:text-5xl text-gray-900 ">
                  <span className="inline-block w-fit max-w-full rounded-lg bg-zinc-200/95 px-3 py-1.5 shadow-sm">
                    {categoryName}
                  </span>
                </h1>
                {currentCategory?.description && (
                  <p className="mt-4 max-w-md text-zinc-800 text-sm leading-relaxed font-medium">
                    {currentCategory.description}
                  </p>
                )}
              </div>
              {!isLoading && (
  <div className="hidden md:flex flex-col items-center flex-shrink-0 rounded-xl bg-zinc-200/95 px-3 py-2 shadow-sm">
    <span className="text-5xl font-black text-zinc-900 leading-none">
      {pagination?.total || 0}
    </span>
    <span className="text-[11px] text-center font-bold uppercase tracking-[0.2em] text-zinc-700 mt-1">
      Products
    </span>
  </div>
)}
            </div>
          </div>
        </section>

        {/* ── MAIN CONTENT ── */}
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-12 flex flex-col md:flex-row gap-10">

          {/* ── SIDEBAR ── */}
          <aside className="hidden md:block md:px-18 w-64 flex-shrink-0">
            <div className="sticky top-50">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <SlidersHorizontal size={15} />
                    <span className="text-sm font-bold uppercase tracking-widest">Filters</span>
                  </div>
                
                </div>
                {activeFilterCount > 0 && (
                  <span className="text-[10px] font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <FilterPanel />
            </div>
          </aside>
          {isSortOpen && (
            <div className="fixed inset-0 z-[100] md:hidden">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setIsSortOpen(false)}
              />

              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 animate-in slide-in-from-bottom duration-300">

                <h3 className="text-sm font-bold mb-4 uppercase tracking-widest">
                  Sort By
                </h3>

                <div className="space-y-4">
                  {[
                    { label: "Default", val: "default" },
                    { label: "Price Low → High", val: "priceLowHigh" },
                    { label: "Price High → Low", val: "priceHighLow" },
                    { label: "Highest Discount", val: "discount" },
                    { label: "Newest First", val: "newest" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => {
                        setSortBy(opt.val);
                        setIsSortOpen(false);
                      }}
                      className={`block w-full text-left text-sm ${sortBy === opt.val ? "font-bold text-black" : "text-zinc-500"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUCT GRID AREA ── */}
          <div className="flex-grow">
            {/* --- Toolbar --- */}
            <div className="flex items-center justify-between mb-10">

              {/* LEFT */}
              <div className="flex items-center gap-4">
                <p className="text-xs font-['satoshi'] font-semibold uppercase text-zinc-800 tracking-[0.1em]">
                  Sort By :
                </p>

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

                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* RIGHT COUNT */}
              <div className="hidden sm:flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-full border border-zinc-200">
                <span className="text-lg font-semibold text-zinc-800">
                  {sortedProducts.length}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Products
                </span>
              </div>
            </div>

            {/* --- Content --- */}
            <div className="relative min-h-[60vh]">

              {/* ERROR */}
              {hasError && (
                <div className="flex flex-col items-center justify-center py-28 text-center animate-in fade-in duration-500">
                  <div className="p-4 rounded-full bg-red-50 mb-4">
                    <AlertCircle size={28} className="text-red-400" />
                  </div>

                  <p className="text-zinc-600 text-sm mb-6 max-w-sm">
                    {categoryErrorUserMessage}
                  </p>

                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-5 py-2 border border-zinc-300 rounded-full hover:bg-black hover:text-white transition-all"
                  >
                    <RefreshCw size={14} />
                    Retry
                  </button>
                </div>
              )}

              {/* LOADING */}
              {isLoading && (
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
                  <VirtualizedProductGrid
                    key={slug}
                    products={sortedProducts}
                    loadingMore={loadingMore}
                  />

                  {/* LOAD MORE */}
                  <div className="mt-20 text-center cursor-pointer">
                    {hasMore ? (
                      <div className="space-y-6">
                        <button
                          onClick={handleLoadMore}
                          disabled={catLoading}
                          className="group relative cursor-pointer px-10 py-3 rounded-full hover:bg-orange-400 duration-300 bg-zinc-800 text-zinc-100 border-zinc-300 overflow-hidden transition-all"
                        >
                          <span className="relative z-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
                            {loadingMore ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : "Load More"}
                          </span>
                        </button>

                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                          {products.length} / {pagination?.total || 0} viewed
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs uppercase tracking-[0.4em] text-zinc-300 py-10">
                        End of Collection
                      </p>
                    )}
                  </div>
                </div>
              )}
        {!isLoading && !hasError && products.length === 0 && (
  <>
    {/* If no products at all */}
    <div className="py-32 flex flex-col items-center text-center animate-in fade-in">
      <h2 className="text-xl font-semibold text-zinc-700 mb-2">
        Coming Soon
      </h2>
      <p className="text-zinc-400 text-xs uppercase tracking-widest">
        We're updating this category
      </p>
    </div>
  </>
)}

{!isLoading && !hasError && products.length > 0 && filteredProducts.length === 0 && (
  <>
    {/* If products exist but filters show nothing */}
    <div className="py-32 flex flex-col items-center text-center animate-in fade-in">
      <h2 className="text-xl font-semibold text-zinc-700 mb-2">
        No products found
      </h2>
      <p className="text-zinc-400 text-xs uppercase tracking-widest mb-6">
        Try different filters
      </p>
      <button
        onClick={clearFilters}
        className="px-6 py-2 text-xs font-semibold uppercase tracking-wider border border-zinc-300 rounded-full hover:bg-black hover:text-white transition"
      >
        Reset Filters
      </button>
    </div>
  </>
)}
            </div>
          </div>
        </div>

        {/* ── MOBILE FILTER DRAWER ── */}
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
                <button onClick={() => setIsFilterOpen(false)}>
                  <X size={22} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <FilterPanel />
              </div>
              <div className="px-6 py-4 border-t border-zinc-100">
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="w-full bg-zinc-900 text-white py-4 text-xs font-black uppercase tracking-widest"
                >
                  Show {sortedProducts.length} products
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CatProducts;