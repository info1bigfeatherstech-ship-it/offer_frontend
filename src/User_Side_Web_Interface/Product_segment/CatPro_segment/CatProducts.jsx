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
      const base = getProductListPrice(product);
      const qty = variant?.inventory?.quantity ?? 0;
      const discount = getProductDiscountPct(product);
      const isOnSale = isProductOnSale(product);
      const isTodayDeal = isProductTodayDeal(product);

      // ✅ PRICE (multi-select)
      if (filters.price.length > 0) {
        const priceMatch = filters.price.some((p) => {
          if (p === "u29") return base < 29;
          if (p === "29-49") return base >= 29 && base <= 49;
          if (p === "49-79") return base >= 49 && base <= 79;
          if (p === "o99") return base >= 99;
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

              {/* EMPTY */}
              {!isLoading && !hasError && sortedProducts.length === 0 && products.length > 0 && (
                <div className="py-32 flex flex-col items-center text-center animate-in fade-in">
                  <h2 className="text-xl font-semibold text-zinc-700 mb-2">
                    No products found
                  </h2>

                  <p className="text-zinc-400 text-xs uppercase tracking-widest mb-6">
                    Try different filters
                  </p>

                  <button                    onClick={clearFilters}
                    className="px-6 py-2 text-xs font-semibold uppercase tracking-wider border border-zinc-300 rounded-full hover:bg-black hover:text-white transition"
                  >
                    Reset Filters
                  </button>
                </div>
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
// update the code show 6 cards in lg screens and 2 cards in mobile
// import React, { useEffect, useCallback, useState, useRef, useMemo, useLayoutEffect } from "react";
// import { useParams, useNavigate, Link } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   ArrowLeft,
//   AlertCircle,
//   RefreshCw,
//   ChevronRight,
//   Filter,
//   X,
//   SlidersHorizontal,
//   Loader2,
//   ChevronDown,
//   Home,
// } from "lucide-react";
// import { useVirtualizer } from "@tanstack/react-virtual";

// import ProductCard from "../ProductCard";
// import SkeletonCard from "../Product_Card_Skelleton/SkeletonCard";

// import {
//   fetchProductsByCategory,
//   selectProductsBySlug,
//   selectLoadingBySlug,
//   selectErrorBySlug,
//   selectPaginationBySlug,
// } from "../../../components/REDUX_FEATURES/REDUX_SLICES/userProductsSlice";

// import {
//   fetchCategoryBySlug,
//   clearCurrentCategory,
//   selectCurrentCategory,
// } from "../../../components/REDUX_FEATURES/REDUX_SLICES/userCategoriesSlice";
// import Breadcrumb from "../Breadcrumb/Breadcrumb";
// import usePaginatedFetch from "../../../components/HOOKS/usePaginatedFetch";

// // ── How many columns at each breakpoint ──────────────────────────────────────
// // Must match Tailwind grid classes used below
// const getColumnCount = () => {
//   const w = window.innerWidth;
//   if (w >= 1280) return 4; // xl:grid-cols-4
//   if (w >= 1024) return 3; // lg:grid-cols-3
//   return 1;                // grid-cols-2 (mobile + tablet)
// };

// const LOAD_MORE_SKELETON_COUNT = 12;

// // ── VirtualizedProductGrid ────────────────────────────────────────────────────
// // Virtualizes rows of a CSS grid.
// // Only rows near the viewport are in the DOM — off-screen rows are unmounted.
// const VirtualizedProductGrid = ({ products, loadingMore }) => {
//   const parentRef = useRef(null);
//   const [cols, setCols] = useState(getColumnCount);

//   useEffect(() => {
//     const onResize = () => setCols(getColumnCount());
//     window.addEventListener("resize", onResize);
//     return () => window.removeEventListener("resize", onResize);
//   }, []);

//    useEffect(() => {
//       window.scrollTo({ top: 0, behavior: "smooth" })
//     }, [])

//   // Chunk flat array into rows
//   const rows = useMemo(() => {
//     const result = [];
//     for (let i = 0; i < products.length; i += cols) {
//       result.push(products.slice(i, i + cols));
//     }
//     return result;
//   }, [products, cols]);

//   const skeletonRowCount = loadingMore ? Math.ceil(LOAD_MORE_SKELETON_COUNT / cols) : 0;
//   const totalRows = rows.length + skeletonRowCount;

//   const rowVirtualizer = useVirtualizer({
//     count: totalRows,
//     getScrollElement: () => parentRef.current,
//     estimateSize: () => 420,  // approximate row height — adjust to your card
//     overscan: 3,
//   });



//   return (
//     <div ref={parentRef} style={{ width: "100%" }}>
//       <div
//         style={{
//           height: `${rowVirtualizer.getTotalSize()}px`,
//           width: "100%",
//           position: "relative",
//         }}
//       >
//         {rowVirtualizer.getVirtualItems().map((virtualRow) => {
//           const isSkeletonRow = virtualRow.index >= rows.length;
//           const rowItems = isSkeletonRow
//             ? Array(cols).fill(null)
//             : rows[virtualRow.index];

//           return (
//             <div
//               key={virtualRow.key}
//               data-index={virtualRow.index}
//               ref={rowVirtualizer.measureElement}
//               style={{
//                 position: "absolute",
//                 top: 0,
//                 left: 0,
//                 width: "100%",
//                 transform: `translateY(${virtualRow.start}px)`,
//               }}
//             >
//               <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-8 pb-10">
//                 {isSkeletonRow
//                   ? Array(cols).fill(null).map((_, i) => (
//                     <SkeletonCard key={`skel-${virtualRow.index}-${i}`} />
//                   ))
//                   : rowItems.map((product, i) => (
//                     <ProductCard
//                       key={product._id || i}
//                       product={product}
//                       index={virtualRow.index * cols + i}
//                       seed={i}
//                     />
//                   ))
//                 }
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// // ── CatProducts ───────────────────────────────────────────────────────────────
// const CatProducts = () => {
//   const { slug } = useParams();
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const [isFilterOpen, setIsFilterOpen] = useState(false);
//   const [sortBy, setSortBy] = useState("default");
//   // console.log(sortBy);

//   // values: default | priceLowHigh | priceHighLow | newest | discount

//   // ── Filters state ──────────────────────────────────────────────────────────
//   const [filters, setFilters] = useState({
//     price: [],   // "u1000" | "1000-5000" | "5000-15000" | "o15000"
//     availability: [],   // "instock" | "outofstock"
//     discount: [],   // "10" | "25" | "50"
//     onSale: false,
//     todayArrival: false,
//   });
//   const [isSortOpen, setIsSortOpen] = useState(false);
//   const toggleFilter = useCallback((key, value) => {
//     setFilters((prev) => {
//       const exists = prev[key].includes(value);

//       return {
//         ...prev,
//         [key]: exists
//           ? prev[key].filter((v) => v !== value)
//           : [...prev[key], value],
//       };
//     });
//   }, []);

//   // ── Category metadata ──────────────────────────────────────────────────────
//   const currentCategory = useSelector(selectCurrentCategory);
//   const categoryLoadingState = useSelector((s) => s.userCategories.loading.category);
//   const categoryErrorState = useSelector((s) => s.userCategories.error.category);

//   // ── Memoized selectors ────────────────────────────────────────────────────
//   const selectProducts = useMemo(() => selectProductsBySlug(slug), [slug]);
//   const selectLoading = useMemo(() => selectLoadingBySlug(slug), [slug]);
//   const selectPagination = useMemo(() => selectPaginationBySlug(slug), [slug]);




//   const activeTags = useMemo(() => {
//     const tags = [];
//     if (filters.onSale) tags.push("on_sale");
//     if (filters.todayArrival) tags.push("today_arrival");
//     return tags.join(","); // "on_sale" | "today_arrival" | "on_sale,today_arrival" | ""
//   }, [filters.onSale, filters.todayArrival]);

//   // ── Paginated products ────────────────────────────────────────────────────

//   const {
//     data: products,
//     isLoading: catLoading,
//     isFetchingMore: loadingMore,
//     pagination,
//     loadMore: handleLoadMore,
//     resetPage,
//   } = usePaginatedFetch({
//     fetchAction: fetchProductsByCategory,
//     selectData: selectProducts,
//     selectLoading: selectLoading,
//     selectPagination: selectPagination,
//     fetchParams: { slug, tags: activeTags },
//     limit: 8,
//   });

//   // ── Derived ────────────────────────────────────────────────────────────────
//   const isLoading = (catLoading || categoryLoadingState) && products.length === 0;
//   const hasError = !isLoading && !!categoryErrorState;
//   const hasMore = pagination?.hasNextPage ?? false;

//   // ── Filter logic ───────────────────────────────────────────────────────────
//   const filteredProducts = useMemo(() => {
//     if (!products?.length) return [];

//     return products.filter((product) => {
//       const variant = product.variants?.[0];
//       // console.log("data", product);


//       const base = variant?.price?.base ?? 0;
//       const sale = variant?.price?.sale ?? base;
//       const qty = variant?.inventory?.quantity ?? 0;

//       const discount =
//         base > 0 ? Math.round(((base - sale) / base) * 100) : 0;

//       const isOnSale = sale < base || false;

//       // ✅ PRICE (multi-select)
//       if (filters.price.length > 0) {
//         const priceMatch = filters.price.some((p) => {
//           if (p === "u29") return base < 29;
//           if (p === "29-49") return base >= 29 && base <= 49;
//           if (p === "49-79") return base >= 49 && base <= 79;
//           if (p === "o99") return base > 99;
//           return false;
//         });

//         if (!priceMatch) return false;
//       }

//       // ✅ AVAILABILITY (multi-select)
//       if (filters.availability.length > 0) {
//         const stockMatch = filters.availability.some((a) => {
//           if (a === "instock") return qty > 0;
//           if (a === "outofstock") return qty <= 0;
//           return false;
//         });

//         if (!stockMatch) return false;
//       }

//       // ✅ DISCOUNT (multi-select)
//       if (filters.discount.length > 0) {
//         const discountMatch = filters.discount.some(
//           (d) => discount >= Number(d)
//         );

//         if (!discountMatch) return false;
//       }

//       // ✅ ON SALE
//       if (filters.onSale && !isOnSale) return false;

//       return true;
//     });
//   }, [products, filters]);
//   const sortedProducts = useMemo(() => {
//     let data = [...filteredProducts];

//     switch (sortBy) {
//       case "priceLowHigh":
//         return data.sort((a, b) => {
//           const aPrice = a.variants?.[0]?.price?.sale ?? a.variants?.[0]?.price?.base ?? 0;
//           const bPrice = b.variants?.[0]?.price?.sale ?? b.variants?.[0]?.price?.base ?? 0;
//           return aPrice - bPrice;
//         });

//       case "priceHighLow":
//         return data.sort((a, b) => {
//           const aPrice = a.variants?.[0]?.price?.sale ?? a.variants?.[0]?.price?.base ?? 0;
//           const bPrice = b.variants?.[0]?.price?.sale ?? b.variants?.[0]?.price?.base ?? 0;
//           return bPrice - aPrice;
//         });

//       case "discount":
//         return data.sort((a, b) => {
//           const getDiscount = (p) => {
//             const base = p.variants?.[0]?.price?.base ?? 0;
//             const sale = p.variants?.[0]?.price?.sale ?? base;
//             return base > 0 ? ((base - sale) / base) * 100 : 0;
//           };
//           return getDiscount(b) - getDiscount(a);
//         });
//       case "az":
//         return data.sort((a, b) => a.name.localeCompare(b.name));

//       case "za":
//         return data.sort((a, b) => b.name.localeCompare(a.name));

//       case "newest":
//         return data.sort(
//           (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
//         );

//       default:
//         return data;
//     }
//   }, [filteredProducts, sortBy]);

//   const activeFilterCount = useMemo(() => {
//     return (
//       filters.price.length +
//       filters.availability.length +
//       filters.discount.length +
//       (filters.onSale ? 1 : 0) +
//       (filters.todayArrival ? 1 : 0)   // ✅ add kiya
//     );
//   }, [filters])

//   // ── Helpers ────────────────────────────────────────────────────────────────
//   const clearFilters = useCallback(() => {
//     setFilters({
//       price: [],
//       availability: [],
//       discount: [],
//       onSale: false,
//       todayArrival: false,
//     });
//   }, []);

//   // ── Category metadata fetch ────────────────────────────────────────────────
//   useEffect(() => {
//     if (!slug) return;
//     dispatch(clearCurrentCategory());
//     dispatch(fetchCategoryBySlug(slug));
//     return () => dispatch(clearCurrentCategory());
//   }, [slug, dispatch]);

//   // ── Retry ──────────────────────────────────────────────────────────────────
//   const handleRetry = useCallback(() => {
//     dispatch(fetchCategoryBySlug(slug));
//     resetPage();
//   }, [slug, dispatch, resetPage]);

//   const categoryName = currentCategory?.name
//     || slug?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
//     || "Collection"; useLayoutEffect(() => {
//       if (!slug) return;
//       // console.log("I m working");
//       clearFilters(); // ← add karo

//       dispatch(clearCurrentCategory());
//       dispatch(fetchCategoryBySlug(slug));
//       return () => dispatch(clearCurrentCategory());
//       console.log("img", currentCategory.image.url);
//     }, [slug, dispatch]);


//   // ── Filter Panel (shared between sidebar + drawer) ─────────────────────────
//   const FilterPanel = () => (
//     <div className="space-y-7 font-['satoshi']">

//       {/* Price */}
//       <div>
//         <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">
//           Price Range
//         </h4>
//         <div className="space-y-1.5">
//           {[
//             { label: "Under ₹29", val: "u29" },
//             { label: "₹29 - ₹49", val: "29-49" },
//             { label: "₹49 - ₹79", val: "49-79" },
//             { label: "Over ₹99", val: "o99" },
//           ].map(({ label, val }) => (
//             <label key={val} className="flex items-center gap-3 cursor-pointer group">

//               <div
//                 className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all
//         ${filters.price.includes(val)
//                     ? "bg-zinc-900 border-zinc-900"
//                     : "border-zinc-300 group-hover:border-zinc-500"
//                   }`}
//                 onClick={() => toggleFilter("price", val)}
//               >
//                 {filters.price.includes(val) && (
//                   <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8">
//                     <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" />
//                   </svg>
//                 )}
//               </div>

//               <span
//                 className={`text-sm ${filters.price.includes(val)
//                   ? "text-zinc-900 font-medium"
//                   : "text-zinc-800"
//                   }`}
//                 onClick={() => toggleFilter("price", val)}
//               >
//                 {label}
//               </span>
//             </label>
//           ))}
//         </div>
//       </div>

//       <div className="h-px bg-zinc-100" />

//       {/* Availability */}
//       <div>
//         <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">
//           Availability
//         </h4>
//         <div className="space-y-1.5">
//           {[
//             { label: "In stock", val: "instock" },
//             { label: "Out of stock", val: "outofstock" },
//           ].map(({ label, val }) => (
//             <label
//               key={val}
//               className="flex items-center gap-3 cursor-pointer group"
//             >
//               <div
//                 className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all
//                   ${filters.availability.includes(val)
//                     ? "bg-zinc-900 border-zinc-900"
//                     : "border-zinc-300 group-hover:border-zinc-500"
//                   }`}
//                 onClick={() => toggleFilter("availability", val)}
//               >
//                 {filters.availability.includes(val) && (
//                   <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
//                     <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//                   </svg>
//                 )}
//               </div>
//               <span
//                 className={`text-sm transition-colors ${filters.availability.includes(val) ? "text-zinc-900 font-medium" : "text-zinc-800 group-hover:text-zinc-800"}`}
//                 onClick={() => toggleFilter("availability", val)}
//               >
//                 {label}
//               </span>
//             </label>
//           ))}
//         </div>
//       </div>

//       <div className="h-px bg-zinc-100" />

//       {/* Discount */}
//       <div>
//         <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">
//           Discount
//         </h4>
//         <div className="space-y-1.5">
//           {[
//             { label: "10% or more", val: "10" },
//             { label: "25% or more", val: "25" },
//             { label: "50% or more", val: "50" },
//           ].map(({ label, val }) => (
//             <label
//               key={val}
//               className="flex items-center gap-3 cursor-pointer group"
//             >
//               <div
//                 className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all
//                   ${filters.discount.includes(val)
//                     ? "bg-zinc-900 border-zinc-900"
//                     : "border-zinc-300 group-hover:border-zinc-500"
//                   }`}
//                 onClick={() => toggleFilter("discount", val)}
//               >
//                 {filters.discount.includes(val) && (
//                   <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
//                     <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//                   </svg>
//                 )}
//               </div>
//               <span
//                 className={`text-sm transition-colors ${filters.discount.includes(val) ? "text-zinc-900 font-medium" : "text-zinc-800 group-hover:text-zinc-800"}`}
//                 onClick={() => toggleFilter("discount", val)}
//               >
//                 {label}
//               </span>
//             </label>
//           ))}
//         </div>
//       </div>

//       <div className="h-px bg-zinc-100" />

//       {/* On Sale */}
//       <div>
//         <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">
//           Deals
//         </h4>

//         {/* On Sale Toggle */}
//         <label className="flex items-center gap-3 cursor-pointer group mb-3">
//           <button
//             onClick={() => setFilters((prev) => ({ ...prev, onSale: !prev.onSale }))}
//             className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${filters.onSale ? "bg-zinc-900" : "bg-zinc-200"
//               }`}
//           >
//             <span
//               className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${filters.onSale ? "translate-x-4" : "translate-x-0"
//                 }`}
//             />
//           </button>
//           <span className={`text-sm transition-colors ${filters.onSale ? "text-zinc-900 font-medium" : "text-zinc-800"}`}>
//             On sale only
//           </span>
//         </label>

//         {/* Today Arrival Toggle */}
//       </div>

//       {/* Clear */}
//       {activeFilterCount > 0 && (
//         <button
//           onClick={clearFilters}
//           className="w-full py-2.5 text-[11px] font-bold uppercase tracking-widest border border-zinc-200 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
//         >
//           Clear all filters
//         </button>
//       )}
//     </div>
//   );

//   // ── Render ─────────────────────────────────────────────────────────────────
//   return (
//     <>
//       <div className="min-h-screen" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

//         {/* ── STICKY BREADCRUMB ── */}
//         <div className="bg-white border-b border-zinc-100 sticky top-0 z-40">
//           <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <button onClick={() => navigate(-1)} className="p-1 text-zinc-500 hover:text-zinc-900">
//                 <ArrowLeft size={20} />
//               </button>
//               <nav className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
//                 <Link to="/" className="text-zinc-900">Home</Link>
//                 <ChevronRight size={10} />
//                 <span className="text-zinc-900 font-bold">{categoryName}</span>
//               </nav>
//             </div>
//             <button
//               onClick={() => setIsFilterOpen(true)}
//               className="md:hidden flex items-center gap-2 p-2 text-zinc-900"
//             >
//               <Filter size={18} />
//               {activeFilterCount > 0 && (
//                 <span className="w-4 h-4 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
//                   {activeFilterCount}
//                 </span>
//               )}
//             </button>
//           </div>
//         </div>

//         {/* ── HERO ── */}
//         <section className="relative h-[40vh] md:h-[20vh] flex items-end overflow-hidden bg-gray-900">
//           {currentCategory?.image?.url && (
//             <img
//               src={currentCategory.image.url}
//               alt={categoryName}
//               className="absolute inset-0 w-full h-full object-cover opacity-50"
//             />
//           )}
//           <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
//           <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F7A221]" />
//           <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 pb-10 md:pb-14">
//             <div className="flex items-end justify-between gap-6">
//               <div>
//                 <p className="text-[#F7A221] text-[10px] font-black uppercase tracking-[0.25em] mb-3 flex items-center gap-2">
//                   <span className="w-6 h-[2px] bg-[#F7A221] inline-block" />
//                   Collection
//                 </p>
//                 <h1 className="text-5xl md:text-6xl font-['satoshi'] text-white font-bold leading-none tracking-wide">
//                   {categoryName}
//                 </h1>
//                 {currentCategory?.description && (
//                   <p className="mt-4 max-w-md text-gray-400 text-sm leading-relaxed font-medium">
//                     {currentCategory.description}
//                   </p>
//                 )}
//               </div>
//               {!isLoading && (
//                 <div className="hidden md:flex flex-col items-end flex-shrink-0">
//                   <span className="text-5xl font-black text-white leading-none">
//                     {pagination?.total || 0}
//                   </span>
//                   <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-1">
//                     Products
//                   </span>
//                 </div>
//               )}
//             </div>
//           </div>
//         </section>

//         {/* ── MAIN CONTENT ── */}
//         <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-12 flex flex-col md:flex-row gap-10">

//           {/* ── SIDEBAR ── */}
//           <aside className="hidden md:block md:px-18 w-64 flex-shrink-0">
//             <div className="sticky top-50">
//               <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-6">
//                 <div>
//                   <div className="flex items-center gap-2 mb-2">
//                     <SlidersHorizontal size={15} />
//                     <span className="text-sm font-bold uppercase tracking-widest">Filters</span>
//                   </div>
//                   <Link to="/" className="text-zinc-900 flex items-center gap-2 hover:text-yellow-500 transition-colors">
//                     <Home size={16} /> {/* or House, HomeIcon depending on your icon library */}
//                     <span className="text-sm">Go  home</span>
//                     <ChevronRight size={14} />
//                   </Link>
//                 </div>
//                 {activeFilterCount > 0 && (
//                   <span className="text-[10px] font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-full">
//                     {activeFilterCount}
//                   </span>
//                 )}
//               </div>
//               <FilterPanel />
//             </div>
//           </aside>
//           {isSortOpen && (
//             <div className="fixed inset-0 z-[100] md:hidden">
//               <div
//                 className="absolute inset-0 bg-black/40"
//                 onClick={() => setIsSortOpen(false)}
//               />

//               <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 animate-in slide-in-from-bottom duration-300">

//                 <h3 className="text-sm font-bold mb-4 uppercase tracking-widest">
//                   Sort By
//                 </h3>

//                 <div className="space-y-4">
//                   {[
//                     { label: "A-Z", val: "az" },
//                     { label: "Z-A", val: "za" },
//                     { label: "Price Low → High", val: "priceLowHigh" },
//                     { label: "Price High → Low", val: "priceHighLow" },
//                   ].map((opt) => (
//                     <button
//                       key={opt.val}
//                       onClick={() => {
//                         setSortBy(opt.val);
//                         setIsSortOpen(false);
//                       }}
//                       className={`block w-full text-left text-sm ${sortBy === opt.val ? "font-bold text-black" : "text-zinc-500"
//                         }`}
//                     >
//                       {opt.label}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* ── PRODUCT GRID AREA ── */}
//           <div className="flex-grow">
//             {/* --- Toolbar --- */}
//             <div className="flex items-center justify-between mb-10">

//               {/* LEFT */}
//               <div className="flex items-center gap-4">
//                 <p className="text-xs font-['satoshi'] font-semibold uppercase text-zinc-800 tracking-[0.1em]">
//                   Sort By :
//                 </p>

//                 <div className="relative">
//                   <select
//                     value={sortBy}
//                     onChange={(e) => setSortBy(e.target.value)}
//                     className="appearance-none bg-white/60 backdrop-blur-md px-3 pr-10 py-2 text-sm font-semibold text-zinc-800 rounded-md shadow-sm border border-zinc-200 hover:border-zinc-400 focus:border-black focus:ring-0 outline-none transition-all cursor-pointer"
//                   >
//                     <option value="az">Alphabetically, A-Z</option>
//                     <option value="za">Alphabetically, Z-A</option>
//                     <option value="priceLowHigh">Price: Low to High</option>
//                     <option value="priceHighLow">Price: High to Low</option>
//                   </select>

//                   <ChevronDown
//                     size={16}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
//                   />
//                 </div>
//               </div>

//               {/* RIGHT COUNT */}
//               <div className="hidden sm:flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-full border border-zinc-200">
//                 <span className="text-lg font-semibold text-zinc-800">
//                   {filteredProducts.length}
//                 </span>
//                 <span className="text-[10px] uppercase tracking-widest text-zinc-400">
//                   Products
//                 </span>
//               </div>
//             </div>

//             {/* --- Content --- */}
//             <div className="relative min-h-[60vh]">

//               {/* ERROR */}
//               {hasError && (
//                 <div className="flex flex-col items-center justify-center py-28 text-center animate-in fade-in duration-500">
//                   <div className="p-4 rounded-full bg-red-50 mb-4">
//                     <AlertCircle size={28} className="text-red-400" />
//                   </div>

//                   <p className="text-zinc-600 text-sm mb-6 max-w-sm">
//                     {categoryErrorState?.message || "Something went wrong while loading products."}
//                   </p>

//                   <button
//                     onClick={handleRetry}
//                     className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-5 py-2 border border-zinc-300 rounded-full hover:bg-black hover:text-white transition-all"
//                   >
//                     <RefreshCw size={14} />
//                     Retry
//                   </button>
//                 </div>
//               )}

//               {/* LOADING */}
//               {isLoading && (
//                 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//                   {[...Array(8)].map((_, i) => (
//                     <div key={i} className="animate-pulse space-y-3">
//                       <div className="aspect-[4/5] bg-gradient-to-br from-zinc-100 to-zinc-200 rounded-lg" />
//                       <div className="h-3 bg-zinc-200 rounded w-3/4" />
//                       <div className="h-3 bg-zinc-100 rounded w-1/2" />
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* MAIN GRID */}
//               {!isLoading && !hasError && filteredProducts.length > 0 && (
//                 <div className="animate-in fade-in duration-700">
//                   <VirtualizedProductGrid
//                     key={slug}
//                     products={sortedProducts}
//                     loadingMore={loadingMore}
//                   />

//                   {/* LOAD MORE */}
//                   <div className="mt-20 text-center cursor-pointer">
//                     {hasMore ? (
//                       <div className="space-y-6">
//                         <button
//                           onClick={handleLoadMore}
//                           disabled={catLoading}
//                           className="group relative cursor-pointer px-10 py-3 rounded-full hover:bg-orange-400 duration-300 bg-zinc-800 text-zinc-100 border-zinc-300 overflow-hidden transition-all"
//                         >
//                           <span className="relative z-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
//                             {loadingMore ? (
//                               <Loader2 size={14} className="animate-spin" />
//                             ) : "Load More"}
//                           </span>
//                         </button>

//                         <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
//                           {products.length} / {pagination?.total || 0} viewed
//                         </p>
//                       </div>
//                     ) : (
//                       <p className="text-xs uppercase tracking-[0.4em] text-zinc-300 py-10">
//                         End of Collection
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {/* EMPTY */}
//               {!isLoading && !hasError && filteredProducts.length === 0 && products.length > 0 && (
//                 <div className="py-32 flex flex-col items-center text-center animate-in fade-in">
//                   <h2 className="text-xl font-semibold text-zinc-700 mb-2">
//                     No products found
//                   </h2>

//                   <p className="text-zinc-400 text-xs uppercase tracking-widest mb-6">
//                     Try different filters
//                   </p>

//                   <button
//                     onClick={clearFilters}
//                     className="px-6 py-2 text-xs font-semibold uppercase tracking-wider border border-zinc-300 rounded-full hover:bg-black hover:text-white transition"
//                   >
//                     Reset Filters
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* ── MOBILE FILTER DRAWER ── */}
//         {isFilterOpen && (
//           <div className="fixed inset-0 z-[100] md:hidden">
//             <div
//               className="absolute inset-0 bg-black/40 backdrop-blur-sm"
//               onClick={() => setIsFilterOpen(false)}
//             />
//             <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[85vh]">
//               <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
//                 <div className="flex items-center gap-2">
//                   <h3 className="text-base font-bold uppercase tracking-tighter">Filters</h3>
//                   {activeFilterCount > 0 && (
//                     <span className="text-[10px] font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-full">
//                       {activeFilterCount}
//                     </span>
//                   )}
//                 </div>
//                 <button onClick={() => setIsFilterOpen(false)}>
//                   <X size={22} />
//                 </button>
//               </div>
//               <div className="flex-1 overflow-y-auto px-6 py-4">
//                 <FilterPanel />
//               </div>
//               <div className="px-6 py-4 border-t border-zinc-100">
//                 <button
//                   onClick={() => setIsFilterOpen(false)}
//                   className="w-full bg-zinc-900 text-white py-4 text-xs font-black uppercase tracking-widest"
//                 >
//                   Show {filteredProducts.length} products
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </>
//   );
// };

// export default CatProducts;
// code working but try to add virtulization

// import React, { useEffect, useCallback, useState } from "react";
// import { useParams, useNavigate, Link } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   ArrowLeft,
//   AlertCircle,
//   RefreshCw,
//   ChevronRight,
//   Filter,
//   X,
//   SlidersHorizontal
// } from "lucide-react";

// import ProductCard from "../ProductCard";
// import SkeletonCard from "../Product_Card_Skelleton/SkeletonCard";

// import {
//   fetchProductsByCategory,
//   selectProductsBySlug,
//   selectLoadingBySlug,
//   selectErrorBySlug,
//   selectPaginationBySlug,
// } from "../../../components/REDUX_FEATURES/REDUX_SLICES/userProductsSlice";

// import {
//   fetchCategoryBySlug,
//   clearCurrentCategory,
//   selectCurrentCategory,
// } from "../../../components/REDUX_FEATURES/REDUX_SLICES/userCategoriesSlice";

// // ─────────────────────────────────────────────────────────────────────────────
// // Premium Pagination
// // ─────────────────────────────────────────────────────────────────────────────
// const Pagination = ({ pagination, onPageChange }) => {
//   const { page, totalPages } = pagination;
//   if (!totalPages || totalPages <= 1) return null;

//   const delta = 1;
//   const pages = [];
//   for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
//     pages.push(i);
//   }

//   return (
//     <div className="flex items-center justify-center gap-2 mt-16 py-8 border-t border-zinc-100">
//       <button
//         disabled={page <= 1}
//         onClick={() => onPageChange(page - 1)}
//         className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-zinc-200 disabled:opacity-30 hover:bg-zinc-900 hover:text-white transition-all"
//       >
//         Prev
//       </button>
//       {pages.map((p) => (
//         <button
//           key={p}
//           onClick={() => onPageChange(p)}
//           className={`w-10 h-10 text-xs font-bold transition-all ${
//             p === page ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-900"
//           }`}
//         >
//           {p}
//         </button>
//       ))}
//       <button
//         disabled={page >= totalPages}
//         onClick={() => onPageChange(page + 1)}
//         className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-zinc-200 disabled:opacity-30 hover:bg-zinc-900 hover:text-white transition-all"
//       >
//         Next
//       </button>
//     </div>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // CatProducts — Main Component
// // ─────────────────────────────────────────────────────────────────────────────
// const CatProducts = () => {
//   const { slug } = useParams();
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const [isFilterOpen, setIsFilterOpen] = useState(false);

//   // ── Selectors ──────────────────────────────────────────────────────────────
//   // ✅ now reads from per-slug buckets — no race condition with homepage sections
//   const products   = useSelector(selectProductsBySlug(slug));
//   const pagination = useSelector(selectPaginationBySlug(slug)) || { page: 1, totalPages: 1, total: 0 };
//   const catLoading = useSelector(selectLoadingBySlug(slug));
//   const catError   = useSelector(selectErrorBySlug(slug));

//   // category meta (name, image, description)
//   const currentCategory    = useSelector(selectCurrentCategory);
//   const categoryLoadingState = useSelector((s) => s.userCategories.loading.category);
//   const categoryErrorState   = useSelector((s) => s.userCategories.error.category);

//   // ── Derived state ──────────────────────────────────────────────────────────
//   const isLoading = catLoading || categoryLoadingState;
//   const hasError  = !isLoading && (!!catError || !!categoryErrorState);

//   // ── Effects ────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!slug) return;

//     // console.log(`🗂️ [CatProducts] slug changed → "${slug}"`);

//     // clear previous category meta so stale name/image doesn't flash
//     dispatch(clearCurrentCategory());

//     // fetch category meta (name, description, image)
//     dispatch(fetchCategoryBySlug(slug));

//     // fetch products for this slug
//     // ✅ stored in categoryProducts[slug] — won't overwrite other slugs
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 12 }));

//     return () => {
//       // console.log(`🧹 [CatProducts] cleanup for slug="${slug}"`);
//       dispatch(clearCurrentCategory());
//       // NOTE: we intentionally do NOT clear categoryProducts[slug] here
//       // so if the user navigates back, they see cached products instantly
//     };
//   }, [slug, dispatch]);

//   // ── Handlers ───────────────────────────────────────────────────────────────
//   const handlePageChange = useCallback((newPage) => {
//     // console.log(`📄 [CatProducts] slug="${slug}" → page=${newPage}`);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//     dispatch(fetchProductsByCategory({ slug, page: newPage, limit: 12 }));
//   }, [slug, dispatch]);

//   const handleRetry = () => {
//     // console.log(`🔄 [CatProducts] Retrying slug="${slug}"`);
//     dispatch(fetchCategoryBySlug(slug));
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 12 }));
//   };

//   const categoryName = currentCategory?.name || slug?.replace(/-/g, " ") || "Collection";

//   // ── Render ─────────────────────────────────────────────────────────────────
//   return (
//     <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

//       {/* ── BREADCRUMB HEADER ── */}
//       <div className="bg-white border-b border-zinc-100 sticky top-0 z-40">
//         <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
//           <div className="flex items-center gap-4">
//             <button onClick={() => navigate(-1)} className="p-1 text-zinc-500 hover:text-zinc-900">
//               <ArrowLeft size={20} />
//             </button>
//             <nav className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
//               <Link to="/" className="hover:text-zinc-900">Home</Link>
//               <ChevronRight size={10} />
//               <span className="text-zinc-900 font-bold">{categoryName}</span>
//             </nav>
//           </div>
//           <button
//             onClick={() => setIsFilterOpen(true)}
//             className="md:hidden p-2 text-zinc-900"
//           >
//             <Filter size={20} />
//           </button>
//         </div>
//       </div>

//       {/* ── HERO HEADER ── */}
//       <section className="relative h-[40vh] md:h-[50vh] flex items-center justify-center overflow-hidden bg-zinc-900">
//         {currentCategory?.image?.url ? (
//           <>
//             <img
//               src={currentCategory.image.url}
//               alt={categoryName}
//               className="absolute inset-0 w-full h-full object-cover opacity-60"
//             />
//             <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent" />
//           </>
//         ) : (
//           <div className="absolute inset-0 bg-zinc-100" />
//         )}

//         <div className="relative z-10 text-center px-4">
//           <h1 className="text-4xl md:text-6xl font-bold text-white uppercase tracking-tight mb-4">
//             {categoryName}
//           </h1>
//           {currentCategory?.description && (
//             <p className="max-w-xl mx-auto text-zinc-200 text-sm md:text-base font-light leading-relaxed">
//               {currentCategory.description}
//             </p>
//           )}
//         </div>
//       </section>

//       {/* ── MAIN CONTENT AREA ── */}
//       <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-12 flex flex-col md:flex-row gap-10">

//         {/* ── SIDEBAR ── */}
//         <aside className="hidden md:block w-64 flex-shrink-0">
//           <div className="sticky top-24 space-y-8">
//             <div className="flex items-center gap-2 pb-4 border-b border-zinc-100">
//               <SlidersHorizontal size={16} />
//               <span className="text-sm font-bold uppercase tracking-widest">Filters</span>
//             </div>

//             <div className="space-y-6">
//               <div>
//                 <h4 className="text-[11px] font-black uppercase tracking-widest mb-4">Price Range</h4>
//                 <div className="space-y-2">
//                   {['Under ₹1000', '₹1000 - ₹5000', 'Over ₹5000'].map(range => (
//                     <label key={range} className="flex items-center gap-3 text-sm text-zinc-600 cursor-pointer hover:text-zinc-900">
//                       <input type="checkbox" className="w-4 h-4 accent-zinc-900" />
//                       {range}
//                     </label>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </aside>

//         {/* ── PRODUCT GRID ── */}
//         <div className="flex-grow">
//           <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-50 md:border-none">
//             <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
//               {pagination.total || 0} Products Found
//             </p>
//           </div>

//           {/* Error State */}
//           {hasError && (
//             <div className="py-20 text-center">
//               <AlertCircle size={40} className="mx-auto text-red-400 mb-4" />
//               <p className="text-zinc-600 mb-2">
//                 {catError?.message || categoryErrorState?.message || "Error loading products"}
//               </p>
//               <p className="text-zinc-400 text-xs mb-6">slug: {slug}</p>
//               <button
//                 onClick={handleRetry}
//                 className="inline-flex items-center gap-2 bg-zinc-900 text-white px-8 py-3 text-xs font-bold uppercase tracking-widest"
//               >
//                 <RefreshCw size={14} /> Retry
//               </button>
//             </div>
//           )}

//           {/* Loading State */}
//           {isLoading && (
//             <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//               {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
//             </div>
//           )}

//           {/* Products */}
//           {!isLoading && !hasError && products.length > 0 && (
//             <>
//               <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-8">
//                 {products.map((product, idx) => (
//                   <ProductCard key={product._id || idx} product={product} index={idx} />
//                 ))}
//               </div>
//               <Pagination pagination={pagination} onPageChange={handlePageChange} />
//             </>
//           )}

//           {/* Empty State */}
//           {!isLoading && !hasError && products.length === 0 && (
//             <div className="py-20 text-center border-2 border-dashed border-zinc-100">
//               <p className="text-zinc-400 uppercase tracking-widest text-xs">No products found</p>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ── MOBILE FILTER DRAWER ── */}
//       {isFilterOpen && (
//         <div className="fixed inset-0 z-[100] md:hidden">
//           <div
//             className="absolute inset-0 bg-black/40 backdrop-blur-sm"
//             onClick={() => setIsFilterOpen(false)}
//           />
//           <div className="absolute inset-y-0 right-0 w-[80%] bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-300">
//             <div className="flex items-center justify-between mb-8">
//               <h3 className="text-lg font-bold uppercase tracking-tighter">Filter</h3>
//               <button onClick={() => setIsFilterOpen(false)}><X size={24} /></button>
//             </div>
//             <div className="space-y-8">
//               <p className="text-xs font-black uppercase tracking-widest mb-4">Price</p>
//               <div className="space-y-4">
//                 {['Under ₹1000', '₹1000 - ₹5000', 'Over ₹5000'].map(range => (
//                   <div key={range} className="flex items-center justify-between">
//                     <span className="text-sm">{range}</span>
//                     <input type="checkbox" className="w-5 h-5 accent-zinc-900" />
//                   </div>
//                 ))}
//               </div>
//               <button
//                 onClick={() => setIsFilterOpen(false)}
//                 className="w-full bg-zinc-900 text-white py-4 text-xs font-black uppercase tracking-widest"
//               >
//                 Apply Filters
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CatProducts;

// import React, { useEffect, useCallback, useState } from "react";
// import { useParams, useNavigate, Link } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   ShoppingCart,
//   Heart,
//   Eye,
//   ArrowLeft,
//   AlertCircle,
//   RefreshCw,
//   Star,
// } from "lucide-react";

// // IMPORT THE NEW COMPONENTS
// import ProductCard from "../ProductCard";
// import SkeletonCard from "../Product_Card_Skelleton/SkeletonCard";

// import {
//   fetchProductsByCategory,
//   clearProducts,
//   selectAllProducts,
//   selectProductPagination,
//   selectProductsLoading,
//   selectProductsError,
// } from "../../../components/REDUX_FEATURES/REDUX_SLICES/userProductsSlice";

// import {
//   fetchCategoryBySlug,
//   clearCurrentCategory,
//   selectCurrentCategory,
// } from "../../../components/REDUX_FEATURES/REDUX_SLICES/userCategoriesSlice";

// // ─────────────────────────────────────────────────────────────────────────────
// // Helpers (only keep the ones used in this file)
// // ─────────────────────────────────────────────────────────────────────────────
// const formatPrice = (amount) => {
//   if (amount == null) return "—";
//   return new Intl.NumberFormat("en-IN", {
//     maximumFractionDigits: 0
//   }).format(amount);
// };

// const logError = (context, error, info = {}) => {
//   console.group(`🔴 [CatProducts] ERROR in ${context}`);
//   console.error("Error:", error);
//   console.log("Info:", info);
//   console.groupEnd();
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Pagination (stays here as it's page-specific)
// // ─────────────────────────────────────────────────────────────────────────────
// const Pagination = ({ pagination, onPageChange }) => {
//   const { page, totalPages } = pagination;
//   if (!totalPages || totalPages <= 1) return null;

//   const delta = 2;
//   const pages = [];
//   for (
//     let i = Math.max(1, page - delta);
//     i <= Math.min(totalPages, page + delta);
//     i++
//   ) {
//     pages.push(i);
//   }

//   return (
//     <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
//       <button
//         disabled={page <= 1}
//         onClick={() => onPageChange(page - 1)}
//         className="px-4 py-2 text-sm rounded-xl border border-gray-200 disabled:opacity-40 hover:border-[#f7a221] hover:text-[#f7a221] transition-colors duration-200 font-medium"
//       >
//         ‹ Prev
//       </button>

//       {pages[0] > 1 && (
//         <>
//           <button
//             onClick={() => onPageChange(1)}
//             className="px-3 py-2 text-sm rounded-xl border border-gray-200 hover:border-[#f7a221] hover:text-[#f7a221] transition-colors font-medium"
//           >
//             1
//           </button>
//           {pages[0] > 2 && <span className="text-gray-400 text-sm px-1">…</span>}
//         </>
//       )}

//       {pages.map((p) => (
//         <button
//           key={p}
//           onClick={() => onPageChange(p)}
//           className={`px-3 py-2 text-sm rounded-xl border transition-colors duration-200 font-medium ${
//             p === page
//               ? "bg-[#f7a221] border-[#f7a221] text-white"
//               : "border-gray-200 hover:border-[#f7a221] hover:text-[#f7a221]"
//           }`}
//         >
//           {p}
//         </button>
//       ))}

//       {pages[pages.length - 1] < totalPages && (
//         <>
//           {pages[pages.length - 1] < totalPages - 1 && (
//             <span className="text-gray-400 text-sm px-1">…</span>
//           )}
//           <button
//             onClick={() => onPageChange(totalPages)}
//             className="px-3 py-2 text-sm rounded-xl border border-gray-200 hover:border-[#f7a221] hover:text-[#f7a221] transition-colors font-medium"
//           >
//             {totalPages}
//           </button>
//         </>
//       )}

//       <button
//         disabled={page >= totalPages}
//         onClick={() => onPageChange(page + 1)}
//         className="px-4 py-2 text-sm rounded-xl border border-gray-200 disabled:opacity-40 hover:border-[#f7a221] hover:text-[#f7a221] transition-colors duration-200 font-medium"
//       >
//         Next ›
//       </button>
//     </div>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // CatProducts — Main Component
// // ─────────────────────────────────────────────────────────────────────────────
// const CatProducts = () => {
//   const { slug } = useParams();
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   // ── Redux selectors — products ────────────────────────────────────────────
//   const products        = useSelector(selectAllProducts);
//   const pagination      = useSelector(selectProductPagination);
//   const loadingMap      = useSelector(selectProductsLoading);
//   const errorMap        = useSelector(selectProductsError);
//   const loadingProducts = loadingMap.categoryProducts;
//   const errorProducts   = errorMap.categoryProducts;

//   // ── Redux selectors — category ────────────────────────────────────────────
//   const currentCategory = useSelector(selectCurrentCategory);
//   const loadingCategory = useSelector((s) => s.userCategories.loading.category);
//   const errorCategory   = useSelector((s) => s.userCategories.error.category);

//   // ── Fetch on slug change ──────────────────────────────────────────────────
//   useEffect(() => {
//     if (!slug) return;

//     console.log(`🗂️ [CatProducts] mounting → slug: "${slug}"`);

//     // Clear stale data from previous category
//     dispatch(clearProducts());
//     dispatch(clearCurrentCategory());

//     // Fire both requests in parallel
//     dispatch(fetchCategoryBySlug(slug))
//       .unwrap()
//       .then((d) =>
//         // console.log(`✅ [CatProducts] category: "${d.category?.name}"`)
//         // console.log(`✅ [CatProducts] category: "${d.category?.name}"`)
//           console.log("RAW API RESPONSE....??:", JSON.stringify(d, null, 2))
//       )
//       .catch((e) => logError("fetchCategoryBySlug", e, { slug }));

//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 12 }))
//       .unwrap()
//       .then((d) =>
//         // console.log(`✅ [CatProducts] products loaded: ${d.products?.length}`)
//          console.log("FIRST PRODUCT FULL OBJECt PRODUCT:", JSON.stringify(d.products?.[0], null, 2))
//       )
//       .catch((e) => logError("fetchProductsByCategory", e, { slug }));

//     // Cleanup stale data when leaving the page
//     return () => {
//       dispatch(clearProducts());
//       dispatch(clearCurrentCategory());
//     };
//   }, [slug, dispatch]);

//   // ── Page change ───────────────────────────────────────────────────────────
//   const handlePageChange = useCallback(
//     (newPage) => {
//       console.log(`📄 [CatProducts] page → ${newPage}`);
//       window.scrollTo({ top: 0, behavior: "smooth" });
//       dispatch(fetchProductsByCategory({ slug, page: newPage, limit: 12 }))
//         .unwrap()
//         .catch((e) =>
//           logError("fetchProductsByCategory (pagination)", e, { slug, newPage })
//         );
//     },
//     [slug, dispatch]
//   );

//   // ── Retry ─────────────────────────────────────────────────────────────────
//   const handleRetry = () => {
//     console.log(`🔄 [CatProducts] retrying → slug: "${slug}"`);
//     dispatch(fetchCategoryBySlug(slug));
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 12 }));
//   };

//   // ── Derived state ─────────────────────────────────────────────────────────
//   const isLoading = loadingProducts || loadingCategory;
//   const hasError  = !isLoading && (!!errorProducts || !!errorCategory);
//   const categoryName =
//     currentCategory?.name ||
//     slug?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
//     "Category";

//   // ─────────────────────────────────────────────────────────────────────────
//   return (
//     <div className="min-h-screen bg-gray-50">

//       {/* ── Sticky breadcrumb bar ──────────────────────────────────────────── */}
//       <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center gap-3">
//           <button
//             onClick={() => navigate(-1)}
//             aria-label="Go back"
//             className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors duration-200 flex-shrink-0"
//           >
//             <ArrowLeft size={20} />
//           </button>

//           <nav
//             aria-label="Breadcrumb"
//             className="text-xs sm:text-sm text-gray-400 flex items-center gap-1.5 flex-wrap min-w-0"
//           >
//             <Link to="/" className="hover:text-[#f7a221] transition-colors whitespace-nowrap">
//               Home
//             </Link>
//             <span>/</span>
//             <span className="text-gray-700 font-semibold capitalize truncate">
//               {categoryName}
//             </span>
//           </nav>
//         </div>
//       </div>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

//         {/* ── Category hero — name + image, top center ───────────────────── */}
//         <div className="text-center mb-8 sm:mb-12">
//           {currentCategory?.image?.url && (
//             <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden mx-auto mb-4 shadow-md border border-gray-100">
//               <img
//                 src={currentCategory.image.url}
//                 alt={categoryName}
//                 className="w-full h-full object-cover"
//               />
//             </div>
//           )}

//           <div className="flex items-center justify-center gap-3 mb-2">
//             <span className="w-2 h-8 md:w-2.5 md:h-10 bg-[#f7a221] rounded-full shadow-[0_0_14px_rgba(247,162,33,0.4)] flex-shrink-0" />
//             <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 capitalize tracking-tight">
//               {categoryName}
//             </h1>
//           </div>

//           {currentCategory?.description && (
//             <p className="text-gray-500 text-sm sm:text-base mt-2 max-w-xl mx-auto leading-relaxed">
//               {currentCategory.description}
//             </p>
//           )}

//           {!isLoading && !hasError && pagination.total > 0 && (
//             <p className="text-xs text-gray-400 mt-3">
//               {pagination.total} product{pagination.total !== 1 ? "s" : ""} found
//             </p>
//           )}
//         </div>

//         {/* ── Error state ───────────────────────────────────────────────────── */}
//         {hasError && (
//           <div className="flex flex-col items-center justify-center py-16 gap-4">
//             <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
//               <AlertCircle size={28} className="text-red-400" />
//             </div>
//             <p className="text-gray-600 text-sm sm:text-base text-center max-w-sm">
//               {errorProducts?.message ||
//                 errorCategory?.message ||
//                 "Something went wrong. Please try again."}
//             </p>
//             <button
//               onClick={handleRetry}
//               className="flex items-center gap-2 bg-[#f7a221] hover:bg-[#e6941e] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors duration-200 active:scale-95"
//             >
//               <RefreshCw size={15} />
//               Try Again
//             </button>
//           </div>
//         )}

//         {/* ── Loading skeletons ── USING IMPORTED SkeletonCard ─────────────── */}
//         {isLoading && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
//             {[...Array(8)].map((_, i) => (
//               <SkeletonCard key={i} />
//             ))}
//           </div>
//         )}

//         {/* ── Products grid ── USING IMPORTED ProductCard ──────────────────── */}
//         {!isLoading && !hasError && products.length > 0 && (
//           <>
//             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
//               {products.map((product, idx) => (
//                 <ProductCard
//                   key={product._id || product.slug || idx}
//                   product={product}
//                   index={idx}
//                 />
//               ))}
//             </div>
//             <Pagination pagination={pagination} onPageChange={handlePageChange} />
//           </>
//         )}

//         {/* ── Empty state ──────────────────────────────────────────────────── */}
//         {!isLoading && !hasError && products.length === 0 && (
//           <div className="flex flex-col items-center justify-center py-20 gap-4">
//             <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl select-none">
//               📦
//             </div>
//             <p className="text-gray-500 text-base sm:text-lg font-medium text-center">
//               No products in this category yet.
//             </p>
//             <button
//               onClick={() => navigate("/")}
//               className="bg-[#f7a221] hover:bg-[#e6941e] text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors duration-200 active:scale-95"
//             >
//               Browse All Products
//             </button>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// };

// export default CatProducts;