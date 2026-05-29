import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { fetchProducts, clearProducts, selectAllProducts } from "../../components/REDUX_FEATURES/REDUX_SLICES/userProductsSlice";
import { ArrowLeft, ChevronDown, ChevronRight, Home, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "../Product_segment/ProductCard";
import SkeletonCard from "../Product_segment/Product_Card_Skelleton/SkeletonCard";

const CLIENT_PAGE_SIZE = 24;

const ShopByPrice = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [filters, setFilters] = useState({
    availability: [],
    discount: [],
    onSale: false,
  });
  const [visibleCount, setVisibleCount] = useState(CLIENT_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);

  const allProducts = useSelector(selectAllProducts);
  const loadingState = useSelector((state) => state.userProducts.loading.products);

  // EXCLUSIVE price range mapping
  const { priceRange, isValid } = useMemo(() => {
    if (!slug) return { priceRange: null, isValid: false };
    
    // Handle different slug formats
    if (slug === "under-rs-29") {
      return { priceRange: { type: "under", max: 29, min: 0 }, isValid: true };
    } else if (slug === "under-rs-49") {
      return { priceRange: { type: "under", max: 49, min: 29 }, isValid: true };
    } else if (slug === "under-rs-79") {
      return { priceRange: { type: "under", max: 79, min: 49 }, isValid: true };
    } else if (slug === "above-rs-99") {
      return { priceRange: { type: "above", min: 99 }, isValid: true };
    }
    
    return { priceRange: null, isValid: false };
  }, [slug]);

  const hasFetched = useRef(false);
  const prevSlug = useRef(null);

    useEffect(() => {
      window.scrollTo({
        top: 0,
        behavior: 'instant'
      });
    }, []);

  useEffect(() => {
    if (prevSlug.current === slug && hasFetched.current) return;
    prevSlug.current = slug;
    hasFetched.current = true;

    setVisibleCount(CLIENT_PAGE_SIZE);
    setIsLoading(true);

    dispatch(clearProducts());
    dispatch(fetchProducts({ page: 1, limit: 2000 }))
      .finally(() => setIsLoading(false));
  }, [slug, dispatch]);

  const getEffectivePrice = useCallback((product) => {
    if (!Array.isArray(product?.variants) || product.variants.length === 0) return null;
    let minPrice = null;
    for (const variant of product.variants) {
      if (!variant?.price) continue;
      const { base, sale } = variant.price;
      let effective = null;
      if (sale != null && base != null) {
        effective = sale < base ? sale : base;
      } else if (base != null) {
        effective = base;
      } else if (sale != null) {
        effective = sale;
      }
      if (effective !== null && (minPrice === null || effective < minPrice)) {
        minPrice = effective;
      }
    }
    return minPrice;
  }, []);

  // EXCLUSIVE price filter - NO OVERLAPPING
  const priceFiltered = useMemo(() => {
    if (!isValid || !Array.isArray(allProducts) || allProducts.length === 0) return [];
    
    return allProducts.filter((p) => {
      const price = getEffectivePrice(p);
      if (price === null) return false;
      
      if (priceRange.type === "above") {
        return price > priceRange.min;
      } else {
        // For "under" ranges: price > min AND price <= max
        return price > priceRange.min && price <= priceRange.max;
      }
    });
  }, [allProducts, priceRange, isValid, getEffectivePrice]);

  // Additional filters
  const filteredProducts = useMemo(() => {
    return priceFiltered.filter((product) => {
      const variant = product.variants?.[0];
      const base = variant?.price?.base ?? 0;
      const sale = variant?.price?.sale ?? base;
      const qty = variant?.inventory?.quantity ?? 0;
      const discount = base > 0 && sale < base
        ? Math.round(((base - sale) / base) * 100)
        : 0;
      const isOnSale = sale < base && sale > 0;

      if (filters.availability.length > 0) {
        const match = filters.availability.some((a) =>
          a === "instock" ? qty > 0 : qty <= 0
        );
        if (!match) return false;
      }
      if (filters.discount.length > 0) {
        const match = filters.discount.some((d) => discount >= Number(d));
        if (!match) return false;
      }
      if (filters.onSale && !isOnSale) return false;
      return true;
    });
  }, [priceFiltered, filters]);

  // Sorting
  const sortedProducts = useMemo(() => {
    const copy = [...filteredProducts];
    switch (sortBy) {
      case "priceLowHigh":
        return copy.sort((a, b) => (getEffectivePrice(a) ?? Infinity) - (getEffectivePrice(b) ?? Infinity));
      case "priceHighLow":
        return copy.sort((a, b) => (getEffectivePrice(b) ?? 0) - (getEffectivePrice(a) ?? 0));
      case "discount":
        return copy.sort((a, b) => {
          const disc = (p) => {
            const base = p.variants?.[0]?.price?.base ?? 0;
            const sale = p.variants?.[0]?.price?.sale ?? base;
            return base > 0 && sale < base ? ((base - sale) / base) * 100 : 0;
          };
          return disc(b) - disc(a);
        });
      case "az": return copy.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      case "za": return copy.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
      case "newest":
        return copy.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      default: return copy;
    }
  }, [filteredProducts, sortBy, getEffectivePrice]);

  const visibleProducts = useMemo(() => sortedProducts.slice(0, visibleCount), [sortedProducts, visibleCount]);
  const hasMore = visibleCount < sortedProducts.length;
  const remainingCount = sortedProducts.length - visibleCount;

  const handleShowMore = useCallback(() => {
    setVisibleCount((prev) => prev + CLIENT_PAGE_SIZE);
  }, []);

  useEffect(() => {
    setVisibleCount(CLIENT_PAGE_SIZE);
  }, [filters, sortBy, slug]);

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
    setFilters({ availability: [], discount: [], onSale: false });
  }, []);

  const activeFilterCount = useMemo(
    () => filters.availability.length + filters.discount.length + (filters.onSale ? 1 : 0),
    [filters]
  );

  const pageTitle = useMemo(() => {
    if (priceRange?.type === "above") return `Above ₹${priceRange.min}`;
    return `Under ₹${priceRange?.max}`;
  }, [priceRange]);

  const showLoading = isLoading || loadingState;

  const FilterPanel = () => (
    <div className="space-y-7 font-['satoshi']">
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">
          Availability
        </h4>
        <div className="space-y-1.5">
          {[{ label: "In stock", val: "instock" }, { label: "Out of stock", val: "outofstock" }].map(
            ({ label, val }) => (
              <label key={val} className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    filters.availability.includes(val)
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
                  className={`text-sm transition-colors ${
                    filters.availability.includes(val) ? "text-zinc-900 font-medium" : "text-zinc-800"
                  }`}
                  onClick={() => toggleFilter("availability", val)}
                >
                  {label}
                </span>
              </label>
            )
          )}
        </div>
      </div>

      <div className="h-px bg-zinc-100" />

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">
          Discount
        </h4>
        <div className="space-y-1.5">
          {[
            { label: "10% or more", val: "10" },
            { label: "25% or more", val: "25" },
            { label: "50% or more", val: "50" },
          ].map(({ label, val }) => (
            <label key={val} className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                  filters.discount.includes(val)
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
                className={`text-sm transition-colors ${
                  filters.discount.includes(val) ? "text-zinc-900 font-medium" : "text-zinc-800"
                }`}
                onClick={() => toggleFilter("discount", val)}
              >
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="h-px bg-zinc-100" />

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-800 mb-4">
          Deals
        </h4>
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            onClick={() => setFilters((prev) => ({ ...prev, onSale: !prev.onSale }))}
            className={`relative w-9 h-5 rounded-full transition-all duration-300 flex-shrink-0 ${
              filters.onSale ? "bg-zinc-900" : "bg-zinc-200"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                filters.onSale ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-sm ${filters.onSale ? "text-zinc-900 font-medium" : "text-zinc-800"}`}>
            On sale only
          </span>
        </label>
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

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full flex items-center justify-between pt-6 px-4">
        <nav className="flex items-center md:px-10 gap-2 text-xs font-medium uppercase tracking-widest text-zinc-400 whitespace-nowrap">
          <Link to="/"><ArrowLeft size={16} /></Link>
          <Link to="/" className="text-zinc-900">Home</Link>
          <ChevronDown size={12} />
          <span className="text-zinc-900 font-bold text-[10px] sm:text-xs capitalize">
            {pageTitle}
          </span>
        </nav>
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex items-center gap-2 text-xs font-bold rounded-xl p-2 bg-white shadow-sm border"
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="w-full h-25 bg-black mt-6 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[#F7A221]/10" />
        <div className="text-center relative z-10">
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
            Shop By Price
          </h1>
          <p className="text-white text-[25px] mt-2 font-medium capitalize">{pageTitle}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="sticky top-50 bg-gray-50 rounded-2xl p-6">
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <SlidersHorizontal size={15} />
                <span className="text-sm font-bold uppercase tracking-widest">Filters</span>
              </div>
              {/* <Link
                to="/"
                className="text-zinc-900 flex items-center gap-2 hover:text-yellow-500 transition-colors"
              >
                <Home size={16} />
                <span className="text-sm">Go home</span>
                <ChevronRight size={14} />
              </Link> */}
            </div>
            <FilterPanel />
          </div>
        </aside>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            {/* <div className="flex items-center gap-4">
              <p className="text-xs font-semibold uppercase text-zinc-800 tracking-[0.1em]">Sort By:</p>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white/60 backdrop-blur-md px-3 pr-10 py-2 text-sm font-semibold text-zinc-800 rounded-md shadow-sm border border-zinc-200 hover:border-zinc-400 focus:border-black focus:ring-0 outline-none transition-all cursor-pointer"
                >
                  <option value="default">Default</option>
                  <option value="priceLowHigh">Price: Low to High</option>
                  <option value="priceHighLow">Price: High to Low</option>
                </select>
                <ChevronRight
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none rotate-90"
                />
              </div>
            </div> */}
            {/* <div className="hidden sm:flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-full border border-zinc-200">
              <span className="text-lg font-semibold text-zinc-800">{sortedProducts.length}</span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-400">Products</span>
            </div> */}
          </div>

          {showLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} seed={i} />
              ))}
            </div>
          )}

          {!showLoading && priceFiltered.length > 0 && sortedProducts.length === 0 && (
            <div className="py-32 flex flex-col items-center text-center">
              <h2 className="text-xl font-semibold text-zinc-700 mb-2">
                No products match your filters
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
          )}

          {!showLoading && priceFiltered.length === 0 && allProducts.length > 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-5xl mb-4">🛍️</p>
              <h2 className="text-xl font-black uppercase tracking-tight text-gray-800">
                No Products Found
              </h2>
              <p className="text-gray-400 text-sm mt-2">
                No products found {priceRange?.type === "above" ? "above" : "under"} ₹{priceRange?.type === "above" ? priceRange?.min : priceRange?.max}
              </p>
            </div>
          )}

          {!showLoading && allProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-5xl mb-4">📦</p>
              <h2 className="text-xl font-black uppercase tracking-tight text-gray-800">
                No Products Available
              </h2>
              <p className="text-gray-400 text-sm mt-2">Check back later for new products</p>
            </div>
          )}

          {!showLoading && visibleProducts.length > 0 && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {visibleProducts.map((elem, index) => (
                  <ProductCard
                    key={elem._id ?? elem.id ?? index}
                    product={elem}
                    index={index}
                    seed={index}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-20 text-center">
                  <button
                    onClick={handleShowMore}
                    className="px-8 py-3 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-zinc-700 transition-colors"
                  >
                    Show More ({remainingCount} left)
                  </button>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-4">
                    {visibleCount} / {sortedProducts.length} products shown
                  </p>
                </div>
              )}

              {!hasMore && sortedProducts.length > CLIENT_PAGE_SIZE && (
                <div className="mt-16 text-center">
                  <p className="text-xs text-zinc-400 uppercase tracking-widest border-t border-zinc-100 pt-8">
                    ✨ You've seen all {sortedProducts.length} products in this price range ✨
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold uppercase tracking-tighter">Filters</h3>
                {activeFilterCount > 0 && (
                  <span className="text-[10px] font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button onClick={() => setIsMobileFilterOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <FilterPanel />
            </div>
            <div className="px-6 py-4 border-t border-zinc-100">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full bg-zinc-900 text-white py-4 text-xs font-black uppercase tracking-widest rounded-2xl"
              >
                Show {sortedProducts.length} products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopByPrice;

