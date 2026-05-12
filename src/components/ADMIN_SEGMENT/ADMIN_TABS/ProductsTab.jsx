
// ADMIN_TABS/ProductsTab.jsx

import React, { useState, useEffect, useRef, useMemo,useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

import ProductDetailModal from "../Shared_components/ProductDetailModal";
import CategoryModal from "../Shared_components/CategoryModal";
import StatsCards from "../TOPBAR/StatsCards";
import ProductModal from "../PRODUCT_MODAL_SEGMENT/ProductModal";
import EditProductModal from "../PRODUCT_MODAL_SEGMENT/EditProductModal";
import StatsCardSkeleton from "./SKELLETON_HUB/StatsCardSkeleton";
import ProductTableSkeleton from "./SKELLETON_HUB/ProductTableSkeleton";

import { fetchCategories } from "../ADMIN_REDUX_MANAGEMENT/categoriesSlice";
import {
  fetchProducts,
  optimisticUpdateProduct,
  fetchLowStockProducts,
  fetchActiveProductsCount,
  setCurrentPage,
  optimisticBulkTagUpdate,
} from "../ADMIN_REDUX_MANAGEMENT/adminGetProductsSlice";
import { fetchArchivedProducts } from "../ADMIN_REDUX_MANAGEMENT/adminArchivedSlice";
import {
  softDeleteProduct,
  toggleFeaturedProduct,
  changeProductStatus,
  clearErrors,
  // bulkUpdateChannelStatus,
} from "../ADMIN_REDUX_MANAGEMENT/adminEditProductSlice";

import axiosInstance from "../../../SERVICES/axiosInstance";
import FlagToggle from "../../Common/FlagToggle";

// ── Formatters ────────────────────────────────────────────────────────────────
const formatIndianRupee = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const getDiscountPercentage = (base, sale) => {
  if (!base || !sale || Number(sale) >= Number(base)) return 0;
  return Math.round(((Number(base) - Number(sale)) / Number(base)) * 100);
};

const DEFAULT_BRANDS = ["Sony", "Samsung", "Apple", "Nike", "Adidas", "Generic"];

// ── Date filter presets ───────────────────────────────────────────────────────
const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Custom range", value: "custom" },
];

const getPresetDates = (preset) => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (preset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

// ── DateFilterButton component ────────────────────────────────────────────────
const DateFilterButton = ({ dateFilter, setDateFilter }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive =
    dateFilter.preset !== null || (dateFilter.customStart && dateFilter.customEnd);

  const handlePresetClick = (preset) => {
    if (preset === "custom") {
      setDateFilter((prev) => ({ ...prev, preset: "custom" }));
    } else {
      setDateFilter({
        preset,
        dateField: dateFilter.dateField,
        customStart: "",
        customEnd: "",
      });
      setOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setDateFilter({ preset: null, dateField: "createdAt", customStart: "", customEnd: "" });
    setOpen(false);
  };

  const handleApplyCustom = () => {
    if (!dateFilter.customStart || !dateFilter.customEnd) {
      toast.error("Please select both start and end dates");
      return;
    }
    if (new Date(dateFilter.customStart) > new Date(dateFilter.customEnd)) {
      toast.error("Start date cannot be after end date");
      return;
    }
    setOpen(false);
  };

  const getLabel = () => {
    if (!isActive) return "Date Filter";
    if (dateFilter.preset === "custom" && dateFilter.customStart && dateFilter.customEnd) {
      return `${dateFilter.customStart} → ${dateFilter.customEnd}`;
    }
    const p = DATE_PRESETS.find((p) => p.value === dateFilter.preset);
    return p ? p.label : "Date Filter";
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex cursor-pointer items-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm transition-all ${
          isActive
            ? "bg-blue-600 text-white border-blue-600 shadow-md"
            : "bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="max-w-[140px] truncate">{getLabel()}</span>
        {isActive && (
          <span
            onClick={handleClear}
            className="ml-1 w-4 h-4 rounded-full bg-white bg-opacity-30 flex items-center justify-center hover:bg-opacity-50 cursor-pointer"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute cursor-pointer right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filter by</p>
            <div className="flex gap-2">
              {[
                { value: "createdAt", label: "Created date" },
                { value: "updatedAt", label: "Updated date" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDateFilter((prev) => ({ ...prev, dateField: value }))}
                  className={`flex-1 py-1.5 cursor-pointer text-xs rounded-lg font-medium transition-colors ${
                    dateFilter.dateField === value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">Quick presets</p>
            <div className="space-y-1 cursor-pointer">
              {DATE_PRESETS.filter((p) => p.value !== "custom").map((p) => (
                <button
                  key={p.value}
                  onClick={() => handlePresetClick(p.value)}
                  className={`w-full cursor-pointer text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    dateFilter.preset === p.value
                      ? "bg-blue-50 cursor-pointer text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {p.label}
                  {dateFilter.preset === p.value && (
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
            <button
              onClick={() => handlePresetClick("custom")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between mb-2 ${
                dateFilter.preset === "custom"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Custom range
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {dateFilter.preset === "custom" && (
              <div className="space-y-2 mt-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">From</label>
                  <input
                    type="date"
                    value={dateFilter.customStart}
                    onChange={(e) =>
                      setDateFilter((prev) => ({ ...prev, customStart: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">To</label>
                  <input
                    type="date"
                    value={dateFilter.customEnd}
                    onChange={(e) =>
                      setDateFilter((prev) => ({ ...prev, customEnd: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleApplyCustom}
                  className="w-full cursor-pointer py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-gray-100">
              <button
                onClick={handleClear}
                className="w-full py-2 cursor-pointer bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Date Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main ProductsTab ──────────────────────────────────────────────────────────
const ProductsTab = ({ onSwitchTab }) => {
  const dispatch = useDispatch();
  const [todayArrival, setTodayArrival] = useState(false);
const [onSale, setOnSale] = useState(false);
const [flagLoading, setFlagLoading] = useState(false);

const handleBulkFlagUpdate = async (flagType) => {
  if (selectedSlugs.size === 0) {
    toast.error("No products selected");
    return;
  }
    const slugs = Array.from(selectedSlugs);

  if (flagLoading) return;

  const stateMap = {
    "today-arrival": [todayArrival, setTodayArrival],
    "on-sale": [onSale, setOnSale],
  };

  const stateEntry = stateMap[flagType];

  if (!stateEntry) {
    console.error("Invalid flagType:", flagType);
    return;
  }

  const [currentValue, setValue] = stateEntry;

  const isIndeterminate =
    flagType === "today-arrival"
      ? todayIndeterminate
      : saleIndeterminate;

  let newValue = isIndeterminate ? true : !currentValue;

  setFlagLoading(true);

  // optimistic UI
  setValue(newValue);
  dispatch(optimisticBulkTagUpdate({
  slugs,
  flagType,
  value: newValue
}));

  try {
    const res = await axiosInstance.put(`/admin/products/updateFlags`, {
      slugs,
      flagType,
      value: newValue,
    });

    if (!res?.data?.success) {
      throw new Error(res?.data?.message || "Update failed");
    }

    toast.success("Products updated successfully");
   setTimeout(() => {
  setSelectedSlugs(new Set());
}, 400);

  } catch (err) {
    setValue(currentValue);
    dispatch(optimisticBulkTagUpdate({
  slugs,
  flagType,
  value: !newValue
}));
    toast.error(err?.response?.data?.message || "Failed to update flags");

    // rollback
  } finally {
    setFlagLoading(false);
  }
};

  const {
    products,
    totalProducts,
    currentPage,
    totalPages,
    realActiveCount,
    realLowStockCount,
    loading: productsLoading,
    error: productsError,
  } = useSelector((s) => s.adminGetProducts);
 const normalizedProducts = useMemo(
  () =>
    products.map((p) => ({
      ...p,
      tags: p.tags || [],
    })),
  [products]
);

  const {
    products: lowStockProducts,
    total: lowStockTotal,
    loading: lowStockLoading,
  } = useSelector(
    (s) =>
      s.adminGetProducts.lowStockProducts || {
        products: [],
        total: 0,
        loading: false,
      }
  );

  const { products: archivedProducts } = useSelector((s) => s.adminArchived);
  const { actionLoading, actionError, deleteLoading, deleteSuccess } =
    useSelector((s) => s.adminEditProduct);
  const { categories } = useSelector((s) => s.categories);

  const [brands, setBrands] = useState(DEFAULT_BRANDS);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [detailProduct, setDetailProduct] = useState(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedSlugs, setSelectedSlugs] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkActionType, setBulkActionType] = useState(null);

  const [dateFilter, setDateFilter] = useState({
    preset: null,
    dateField: "createdAt",
    customStart: "",
    customEnd: "",
  });

  useEffect(() => {
    dispatch(fetchProducts({ page: 1, limit: 15 }));
    dispatch(fetchCategories());
    dispatch(fetchLowStockProducts({ page: 1, limit: 1 }));
    dispatch(fetchActiveProductsCount());
  }, [dispatch]);
  const [todayIndeterminate, setTodayIndeterminate] = useState(false);
const [saleIndeterminate, setSaleIndeterminate] = useState(false);

useEffect(() => {
  if (selectedSlugs.size === 0) {
    setTodayArrival(false);
    setOnSale(false);
    setTodayIndeterminate(false);
    setSaleIndeterminate(false);
    return;
  }

  const selected = normalizedProducts.filter(p =>
    selectedSlugs.has(p.slug)
  );

  const total = selected.length;

  const todayCount = selected.filter(p =>
    p.tags?.includes("today-arrival")
  ).length;

  const saleCount = selected.filter(p =>
    p.tags?.includes("on-sale")
  ).length;

  // today arrival
  setTodayArrival(todayCount === total);
  setTodayIndeterminate(todayCount > 0 && todayCount < total);

  // on sale
  setOnSale(saleCount === total);
  setSaleIndeterminate(saleCount > 0 && saleCount < total);

}, [selectedSlugs, normalizedProducts]);

  useEffect(() => {
    setSelectedSlugs(new Set());
  }, [currentPage]);

  useEffect(() => {
    if (productsError) toast.error(`Failed to load products: ${productsError}`);
  }, [productsError]);

  useEffect(() => {
    if (actionError) {
      toast.error(`Action failed: ${actionError}`);
      dispatch(clearErrors());
    }
  }, [actionError, dispatch]);

  useEffect(() => {
    if (deleteSuccess) {
      toast.success("Product archived successfully");
      dispatch(fetchArchivedProducts());
      dispatch(fetchLowStockProducts({ page: 1, limit: 1 }));
    }
  }, [deleteSuccess, dispatch]);

 const refreshProducts = useCallback(() => {
  dispatch(fetchProducts({ page: currentPage, limit: 15 }));
  dispatch(fetchLowStockProducts({ page: 1, limit: 1 }));
}, [dispatch, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      dispatch(fetchProducts({ page: newPage, limit: 15 }));
    }
  };

  const handleSoftDelete = (productId) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return;
    if (window.confirm(`Archive "${product.name}"? It will be hidden from the website.`)) {
      dispatch(softDeleteProduct(product.slug))
        .unwrap()
        .catch(() => {
          refreshProducts();
          toast.error("Failed to archive product");
        });
    }
  };

  const toggleFeatured = (productId) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return;
    dispatch(optimisticUpdateProduct({ _id: productId, isFeatured: !product.isFeatured }));
    dispatch(toggleFeaturedProduct({ product }))
      .unwrap()
      .catch(() => {
        dispatch(optimisticUpdateProduct({ _id: productId, isFeatured: product.isFeatured }));
        toast.error("Failed to toggle featured");
      });
  };

  const changeStatus = (productId, newStatus) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return;
    const prevStatus = product.status;
    dispatch(optimisticUpdateProduct({ _id: productId, status: newStatus }));
    dispatch(changeProductStatus({ product, status: newStatus }))
      .unwrap()
      .catch(() => {
        dispatch(optimisticUpdateProduct({ _id: productId, status: prevStatus }));
        toast.error("Failed to change status");
      });
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedSlugs(new Set(filteredProducts.map((p) => p.slug)));
    } else {
      setSelectedSlugs(new Set());
    }
  };

  const handleSelectOne = (slug) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // UPDATED: Bulk status update with channel support
  const handleBulkStatusUpdate = async (status, channel = null) => {
    if (selectedSlugs.size === 0) return;

    const channelName = channel === "ecomm" ? "Ecom" : channel === "wholesale" ? "Wholesale" : "";
    const actionLabel = channelName ? `Set as ${channelName} → ${status}` : `Set as ${status}`;
    
    if (!window.confirm(`${actionLabel} for ${selectedSlugs.size} product(s)?`)) return;

    setBulkLoading(true);
    setBulkActionType(channel || "legacy");

    try {
      let payload;
      if (channel === "ecomm") {
        payload = { channelStatus: { ecomm: status }, slugs: Array.from(selectedSlugs) };
      } else if (channel === "wholesale") {
        payload = { channelStatus: { wholesale: status }, slugs: Array.from(selectedSlugs) };
      } else {
        payload = { status, slugs: Array.from(selectedSlugs) };
      }

      const res = await axiosInstance.patch("/admin/products/bulk-status", payload);

      if (res.data.success) {
        toast.success(
          `${res.data.updatedCount || res.data.modified || selectedSlugs.size} product(s) updated`
        );
        setSelectedSlugs(new Set());
        refreshProducts();
        if (status === "archived") dispatch(fetchArchivedProducts());
        dispatch(fetchActiveProductsCount());
      } else {
        toast.error(res.data.message || "Bulk update failed");
      }
    } catch (err) {
      console.error("Bulk update error:", err);
      toast.error(err.response?.data?.message || "Bulk update failed");
    } finally {
      setBulkLoading(false);
      setBulkActionType(null);
    }
  };

  const getCategoryName = (productCategory) => {
    if (!productCategory) return "Uncategorized";
    if (typeof productCategory === "object" && productCategory.name) return productCategory.name;
    const categoryId = typeof productCategory === "object" ? productCategory._id : productCategory;
    const found = categories.find((cat) => cat._id === categoryId || cat._id?.toString() === categoryId?.toString());
    return found ? found.name : "Uncategorized";
  };

  const getCategoryId = (productCategory) => {
    if (!productCategory) return null;
    if (typeof productCategory === "object") return productCategory._id;
    return productCategory;
  };

  const handleCategorySelect = (categoryId) => {
    setFilterCategory(categoryId);
    setShowCategoryModal(false);
    dispatch(fetchCategories());
  };

  const activeProducts = realActiveCount;
  const featuredProducts = normalizedProducts.filter((p) => p.isFeatured).length;
  const lowStockCount = realLowStockCount;

  const getDateFilterRange = useCallback(() => {
    const { preset, dateField, customStart, customEnd } = dateFilter;
    if (!preset) return null;
    let start, end;
    if (preset === "custom") {
      if (!customStart || !customEnd) return null;
      start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
    } else {
      ({ start, end } = getPresetDates(preset));
    }
    return { start, end, dateField };
  }, [dateFilter]);

  const filteredProducts = useMemo(() => {
    return normalizedProducts.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === "all" || product.status === filterStatus;
    const matchesCategory = filterCategory === "all" || getCategoryId(product.category) === filterCategory;
    const matchesLowStock = !showLowStockOnly || lowStockProducts.some((lp) => lp._id === product._id);

    const range = getDateFilterRange();
    let matchesDate = true;
    if (range) {
      const raw = product[range.dateField];
      if (raw) {
        const d = new Date(raw);
        matchesDate = d >= range.start && d <= range.end;
      } else {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesLowStock && matchesDate;
  });
}, [normalizedProducts, searchTerm, filterStatus, filterCategory, showLowStockOnly, lowStockProducts,
  getDateFilterRange])

  const allOnPageSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedSlugs.has(p.slug));
  const someSelected = selectedSlugs.size > 0;
  const isIndeterminate = someSelected && !filteredProducts.every((p) => selectedSlugs.has(p.slug));

  if (productsLoading || lowStockLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-6">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
        <ProductTableSkeleton />
      </div>
    );
  }

  const getEcomStatusBadge = (product) => {
    const status = product.channelStatus?.ecomm || product.status;
    const colors = {
      active: "bg-green-100 text-green-700",
      draft: "bg-gray-100 text-gray-600",
      archived: "bg-gray-100 text-gray-600",
    };
    const label = status === "active" ? "Active" : "Inactive";
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.draft}`}>{label}</span>;
  };

  const getWholesaleStatusBadge = (product) => {
    const status = product.channelStatus?.wholesale || "draft";
    const colors = {
      active: "bg-purple-100 text-purple-700",
      draft: "bg-gray-100 text-gray-500",
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.draft}`}>{status === "active" ? "Active" : "Inactive"}</span>;
  };

  return (
    <div className="space-y-6">
      {(actionLoading || deleteLoading || bulkLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-4 shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-700">
              {bulkLoading ? `Applying bulk action${bulkActionType ? ` (${bulkActionType})` : ""}...` : "Processing..."}
            </span>
          </div>
        </div>
      )}

      <StatsCards
        activeProducts={activeProducts}
        featuredProducts={featuredProducts}
        archivedProducts={archivedProducts?.length || 0}
        lowStockProducts={lowStockCount}
        onViewArchived={() => onSwitchTab("archived")}
      />

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Products</p>
              <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Active Products (Ecom)</p>
              <p className="text-3xl font-bold text-gray-900">{activeProducts}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Featured (Ecom)</p>
              <p className="text-3xl font-bold text-gray-900">{featuredProducts}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
        </div>
        <div
          className={`bg-white rounded-2xl shadow-sm border p-6 cursor-pointer transition-all ${
            showLowStockOnly ? "border-red-500 ring-2 ring-red-200" : "border-gray-200 hover:border-red-300"
          }`}
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
        >
          <div className="flex items-center justify-between relative cursor-pointer group">
            <div>
              <p className="text-sm text-gray-500 mb-1">Low Stock</p>
              <p className="text-3xl font-bold text-gray-900">{lowStockCount}</p>
              {showLowStockOnly && <p className="text-xs text-red-600 mt-1">Filter active</p>}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${showLowStockOnly ? "bg-red-200" : "bg-red-100"}`}>
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 transition text-xs bg-black text-white px-2 py-1 rounded">
              Click to filter low stock items
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        {someSelected ? (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-medium text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {selectedSlugs.size} product{selectedSlugs.size > 1 ? "s" : ""} selected
              </div>
              <button
                onClick={() => setSelectedSlugs(new Set())}
                className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-3">
  <FlagToggle
    label="Today Deals"
    checked={todayArrival}
    indeterminate={todayIndeterminate}
    loading={flagLoading}
    onChange={() => handleBulkFlagUpdate("today-arrival")}
  />
  <FlagToggle
    label="On Sale"
    checked={onSale}
    indeterminate={saleIndeterminate}
    loading={flagLoading}
    onChange={() => handleBulkFlagUpdate("on-sale")}
  />
</div>

            {/* SET AS ECOM BUTTON */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center justify-between gap-3 px-4 py-2 bg-white border border-green-500 rounded-xl text-sm font-medium hover:border-green-600 transition-all min-w-[160px] cursor-pointer"
              >
                <span className="text-green-700">Set as Ecom</span>
                <svg className="w-4 h-4 text-green-500 group-hover:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-1.5 flex flex-col gap-1">
                <button
                  onClick={() => handleBulkStatusUpdate("active", "ecomm")}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  Active
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate("draft", "ecomm")}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                  Inactive
                </button>
                {/* <button  onClick={() => handleBulkStatusUpdate("archived", "ecomm")}   disabled={bulkLoading}       className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"   >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Archive
                </button> */}
              </div>
            </div>

            {/* SET AS WHOLESALE BUTTON */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center justify-between gap-3 px-4 py-2 bg-white border border-purple-500 rounded-xl text-sm font-medium hover:border-purple-600 transition-all min-w-[160px] cursor-pointer"
              >
                <span className="text-purple-700">Set as Wholesale</span>
                <svg className="w-4 h-4 text-purple-500 group-hover:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-1.5 flex flex-col gap-1">
                <button
                  onClick={() => handleBulkStatusUpdate("active", "wholesale")}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                  Active
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate("draft", "wholesale")}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                  Inactive
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <DateFilterButton dateFilter={dateFilter} setDateFilter={setDateFilter} />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 cursor-pointer py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status (Ecom)</option>
              <option value="draft">Inactive</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>

            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 pr-12 appearance-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="absolute cursor-pointer right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                title="Add New Category"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {showLowStockOnly && (
              <button
                onClick={() => setShowLowStockOnly(false)}
                className="px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 font-medium flex items-center gap-2"
              >
                <span>Clear Low Stock Filter</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <button
              onClick={() => setShowProductModal(true)}
              className="px-6 cursor-pointer py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Product</span>
            </button>
          </div>
        )}
      </div>

      {productsLoading ? (
        <ProductTableSkeleton />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ecom Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wholesale Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const isChecked = selectedSlugs.has(product.slug)                
                const mainVariant = product.variants?.[0] || {};
                const basePrice = mainVariant.price?.base || 0;
                const salePrice = mainVariant.price?.sale;
                const discountPct = salePrice ? getDiscountPercentage(basePrice, salePrice) : 0;
                const totalStock = product.variants?.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0) || 0;
                const isLowStock = product.variants?.some((v) => v.inventory?.quantity < v.inventory?.lowStockThreshold);
                const v0Images = mainVariant.images || [];
                const thumbUrl = (v0Images.find((img) => img.isMain) || v0Images[0])?.url || product.images?.[0]?.url || null;

                return (
                  <tr key={product._id} className={`hover:bg-gray-50 transition-colors group ${isChecked ? "bg-blue-50 hover:bg-blue-50" : ""}`}>
                    {/* { console.log(product.name, product.tags)} */}
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleSelectOne(product.slug)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{product.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{product.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {getCategoryName(product.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {!product.brand || product.brand === "Generic" ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className="font-medium text-gray-700">{product.brand}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {salePrice ? (
                          <>
                            <span className="text-gray-400 line-through text-xs mr-2">{formatIndianRupee(basePrice)}</span>
                            <span className="font-bold text-gray-900">{formatIndianRupee(salePrice)}</span>
                            {discountPct > 0 && (
                              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                {discountPct}% OFF
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="font-bold text-gray-900">{formatIndianRupee(basePrice)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${isLowStock ? "text-red-600" : "text-gray-700"}`}>{totalStock}</span>
                        {isLowStock && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Low</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getEcomStatusBadge(product)}</td>
                    <td className="px-6 py-4">{getWholesaleStatusBadge(product)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleFeatured(product._id)}
                        disabled={actionLoading}
                        className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
                          actionLoading ? "opacity-50 cursor-not-allowed" : ""
                        } ${
                          product.isFeatured
                            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {product.isFeatured ? "⭐ Featured" : "Regular"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setDetailProduct(product)}
                          className="p-2 text-gray-500 cursor-pointer hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 cursor-pointer text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleSoftDelete(product._id)}
                          className="p-2 cursor-pointer text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Archive"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500">
                {showLowStockOnly ? "No low stock products at the moment" : dateFilter.preset ? "No products match the selected date range" : `Click "Add Product" to create your first product`}
              </p>
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * 15 + 1}–{Math.min(currentPage * 15, totalProducts)} of {totalProducts} products
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                        pageNum === currentPage ? "bg-blue-600 text-white" : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          categories={categories}
          onClose={() => setDetailProduct(null)}
          formatIndianRupee={formatIndianRupee}
          getDiscountPercentage={getDiscountPercentage}
        />
      )}

      {showCategoryModal && <CategoryModal onSelect={handleCategorySelect} onClose={() => setShowCategoryModal(false)} />}
      {showProductModal && <ProductModal onClose={() => { setShowProductModal(false); refreshProducts(); }} brands={brands} setBrands={setBrands} />}
      {showEditModal && selectedProduct && (
        <EditProductModal product={selectedProduct} onClose={() => { setShowEditModal(false); setSelectedProduct(null); refreshProducts(); }} brands={brands} setBrands={setBrands} />
      )}
    </div>
  );
};

export default ProductsTab;
// down code is working upper code have wholesale sepration functionality 
// // ADMIN_TABS/ProductsTab.jsx

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";

// import ProductDetailModal from "../Shared_components/ProductDetailModal";
// import CategoryModal from "../Shared_components/CategoryModal";
// import StatsCards from "../TOPBAR/StatsCards";
// import ProductModal from "../PRODUCT_MODAL_SEGMENT/ProductModal";
// import EditProductModal from "../PRODUCT_MODAL_SEGMENT/EditProductModal";
// import StatsCardSkeleton from "./SKELLETON_HUB/StatsCardSkeleton";
// import ProductTableSkeleton from "./SKELLETON_HUB/ProductTableSkeleton";

// import { fetchCategories } from "../ADMIN_REDUX_MANAGEMENT/categoriesSlice";
// import {
//   fetchProducts,
//   optimisticUpdateProduct,
//   fetchLowStockProducts,
//   fetchActiveProductsCount,
//   setCurrentPage,
// } from "../ADMIN_REDUX_MANAGEMENT/adminGetProductsSlice";
// import { fetchArchivedProducts } from "../ADMIN_REDUX_MANAGEMENT/adminArchivedSlice";
// import {
//   softDeleteProduct,
//   toggleFeaturedProduct,
//   changeProductStatus,
//   clearErrors,
// } from "../ADMIN_REDUX_MANAGEMENT/adminEditProductSlice";

// import axiosInstance from "../../../SERVICES/axiosInstance";

// // ── Formatters ────────────────────────────────────────────────────────────────
// const formatIndianRupee = (amount) =>
//   new Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: "INR",
//     minimumFractionDigits: 0,
//     maximumFractionDigits: 0,
//   }).format(amount);

// const getDiscountPercentage = (base, sale) => {
//   if (!base || !sale || Number(sale) >= Number(base)) return 0;
//   return Math.round(((Number(base) - Number(sale)) / Number(base)) * 100);
// };

// const handlePresetClick = (preset) => {
//   // Handle clear/reset
//   // if (preset === "clear") {
//   //   setDateFilter({ preset: null, dateField: "createdAt", customStart: "", customEnd: "" });
//   //   setOpen(false);
//   //   return;
//   // }
  
//   if (preset === "custom") {
//     setDateFilter((prev) => ({ ...prev, preset: "custom" }));
//   } else {
//     setDateFilter({
//       preset,
//       dateField: dateFilter.dateField,
//       customStart: "",
//       customEnd: "",
//     });
//     setOpen(false);
//   }
// };
// const DEFAULT_BRANDS = ["Sony", "Samsung", "Apple", "Nike", "Adidas", "Generic"];

// // ── Date filter presets ───────────────────────────────────────────────────────
// const DATE_PRESETS = [
//   { label: "Today", value: "today" },
//   { label: "Last 7 days", value: "7d" },
//   { label: "Last 30 days", value: "30d" },
//   { label: "Last 90 days", value: "90d" },
//   { label: "Custom range", value: "custom" },
//   // { label: "Clear Filter", value: "clear", isClear: true },
// ];

// // Compute start/end Date objects from preset string
// const getPresetDates = (preset) => {
//   const now = new Date();
//   const end = new Date(now);
//   end.setHours(23, 59, 59, 999);

//   if (preset === "today") {
//     const start = new Date(now);
//     start.setHours(0, 0, 0, 0);
//     return { start, end };
//   }
//   const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
//   const start = new Date(now);
//   start.setDate(start.getDate() - (days - 1));
//   start.setHours(0, 0, 0, 0);
//   return { start, end };
// };

// // ── DateFilterButton component ────────────────────────────────────────────────
// const DateFilterButton = ({ dateFilter, setDateFilter }) => {
//   const [open, setOpen] = useState(false);
//   const ref = useRef(null);

//   // close on outside click
//   useEffect(() => {
//     const handler = (e) => {
//       if (ref.current && !ref.current.contains(e.target)) setOpen(false);
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   const isActive =
//     dateFilter.preset !== null || (dateFilter.customStart && dateFilter.customEnd);

//   const handlePresetClick = (preset) => {
//     if (preset === "custom") {
//       setDateFilter((prev) => ({ ...prev, preset: "custom" }));
//     } else {
//       setDateFilter({
//         preset,
//         dateField: dateFilter.dateField,
//         customStart: "",
//         customEnd: "",
//       });
//       setOpen(false);
//     }
//   };

//   const handleClear = (e) => {
//     e.stopPropagation();
//     setDateFilter({ preset: null, dateField: "createdAt", customStart: "", customEnd: "" });
//     setOpen(false);
//   };

//   const handleApplyCustom = () => {
//     if (!dateFilter.customStart || !dateFilter.customEnd) {
//       toast.error("Please select both start and end dates");
//       return;
//     }
//     if (new Date(dateFilter.customStart) > new Date(dateFilter.customEnd)) {
//       toast.error("Start date cannot be after end date");
//       return;
//     }
//     setOpen(false);
//   };

//   const getLabel = () => {
//     if (!isActive) return "Date Filter";
//     if (dateFilter.preset === "custom" && dateFilter.customStart && dateFilter.customEnd) {
//       return `${dateFilter.customStart} → ${dateFilter.customEnd}`;
//     }
//     const p = DATE_PRESETS.find((p) => p.value === dateFilter.preset);
//     return p ? p.label : "Date Filter";
//   };

//   return (
//      <div className="relative" ref={ref}>
//       <button
//         onClick={() => setOpen((o) => !o)}
//         className={`flex cursor-pointer items-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm transition-all ${
//           isActive
//             ? "bg-blue-600 text-white border-blue-600 shadow-md"
//             : "bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
//         }`}
//       >
//         <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//             d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//         </svg>
//         <span className="max-w-[140px] truncate">{getLabel()}</span>
//         {isActive && (
//           <span
//             onClick={handleClear}
//             className="ml-1 w-4 h-4 rounded-full bg-white bg-opacity-30 flex items-center justify-center hover:bg-opacity-50 cursor-pointer"
//           >
//             <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </span>
//         )}
//       </button>

//       {open && (
//         <div className="absolute cursor-pointer right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
//           {/* Date field toggle */}
//           <div className="px-4 pt-4 pb-2">
//             <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filter by</p>
//             <div className="flex gap-2">
//               {[
//                 { value: "createdAt", label: "Created date" },
//                 { value: "updatedAt", label: "Updated date" },
//               ].map(({ value, label }) => (
//                 <button
//                   key={value}
//                   onClick={() => setDateFilter((prev) => ({ ...prev, dateField: value }))}
//                   className={`flex-1 py-1.5 cursor-pointer text-xs rounded-lg font-medium transition-colors ${
//                     dateFilter.dateField === value
//                       ? "bg-blue-600 text-white"
//                       : "bg-gray-100 text-gray-600 hover:bg-gray-200"
//                   }`}
//                 >
//                   {label}
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div className="px-4 pb-2">
//             <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">Quick presets</p>
//             <div className="space-y-1 cursor-pointer">
//               {DATE_PRESETS.filter((p) => p.value !== "custom").map((p) => (
//                 <button
//                   key={p.value}
//                   onClick={() => handlePresetClick(p.value)}
//                   className={`w-full cursor-pointer text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
//                     dateFilter.preset === p.value
//                       ? "bg-blue-50 cursor-pointer text-blue-700 font-medium"
//                       : "text-gray-700 hover:bg-gray-50"
//                   }`}
//                 >
//                   {p.label}
//                   {dateFilter.preset === p.value && (
//                     <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
//                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                     </svg>
//                   )}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Custom range */}
//           <div className="px-4 pb-4 border-t border-gray-100 pt-3">
//             <button
//               onClick={() => handlePresetClick("custom")}
//               className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between mb-2 ${
//                 dateFilter.preset === "custom"
//                   ? "bg-blue-50 text-blue-700 font-medium"
//                   : "text-gray-700 hover:bg-gray-50"
//               }`}
//             >
//               Custom range
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//               </svg>
//             </button>

//             {dateFilter.preset === "custom" && (
//               <div className="space-y-2 mt-2">
//                 <div>
//                   <label className="text-xs text-gray-500 mb-1 block">From</label>
//                   <input
//                     type="date"
//                     value={dateFilter.customStart}
//                     onChange={(e) =>
//                       setDateFilter((prev) => ({ ...prev, customStart: e.target.value }))
//                     }
//                     className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs text-gray-500 mb-1 block">To</label>
//                   <input
//                     type="date"
//                     value={dateFilter.customEnd}
//                     onChange={(e) =>
//                       setDateFilter((prev) => ({ ...prev, customEnd: e.target.value }))
//                     }
//                     className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   />
//                 </div>
//                 <button
//                   onClick={handleApplyCustom}
//                   className="w-full cursor-pointer py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
//                 >
//                   Apply
//                 </button>
//               </div>
//             )}

//             {/* ✅ RESET BUTTON - THIS IS THE ONLY ADDITION ✅ */}
//             <div className="mt-3 pt-2 border-t border-gray-100">
//               <button
//                 onClick={handleClear}
//                 className="w-full py-2 cursor-pointer bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
//               >
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                 </svg>
//                 Clear Date Filter
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// // ── Main ProductsTab ──────────────────────────────────────────────────────────
// const ProductsTab = ({ onSwitchTab }) => {
//   const dispatch = useDispatch();

//   // ── Redux state ─────────────────────────────────────────────────────────────
//   const {
//     products,
//     totalProducts,
//     currentPage,
//     totalPages,
//     realActiveCount,
//     realLowStockCount,
//     loading: productsLoading,
//     error: productsError,
//   } = useSelector((s) => s.adminGetProducts);

//   const {
//     products: lowStockProducts,
//     total: lowStockTotal,
//     loading: lowStockLoading,
//   } = useSelector(
//     (s) =>
//       s.adminGetProducts.lowStockProducts || {
//         products: [],
//         total: 0,
//         loading: false,
//       }
//   );

//   const { products: archivedProducts } = useSelector((s) => s.adminArchived);

//   const { actionLoading, actionError, deleteLoading, deleteSuccess } =
//     useSelector((s) => s.adminEditProduct);

//   const { categories } = useSelector((s) => s.categories);

//   // ── Local state ──────────────────────────────────────────────────────────────
//   const [brands, setBrands] = useState(DEFAULT_BRANDS);
//   const [showProductModal, setShowProductModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedProduct, setSelectedProduct] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [filterStatus, setFilterStatus] = useState("all");
//   const [filterCategory, setFilterCategory] = useState("all");
//   const [detailProduct, setDetailProduct] = useState(null);
//   const [showLowStockOnly, setShowLowStockOnly] = useState(false);
//   const [showCategoryModal, setShowCategoryModal] = useState(false);

//   // ── Bulk selection state ─────────────────────────────────────────────────────
//   const [selectedSlugs, setSelectedSlugs] = useState(new Set());
//   const [bulkLoading, setBulkLoading] = useState(false);

//   // ── Date filter state ────────────────────────────────────────────────────────
//   const [dateFilter, setDateFilter] = useState({
//     preset: null,           // null | "today" | "7d" | "30d" | "90d" | "custom"
//     dateField: "createdAt", // "createdAt" | "updatedAt"
//     customStart: "",        // "YYYY-MM-DD"
//     customEnd: "",          // "YYYY-MM-DD"
//   });

//   // ── Initial fetch ────────────────────────────────────────────────────────────
//   useEffect(() => {
//     dispatch(fetchProducts({ page: 1, limit: 15 }));
//     dispatch(fetchCategories());
//     dispatch(fetchLowStockProducts({ page: 1, limit: 1 }));
//     dispatch(fetchActiveProductsCount());
//   }, [dispatch]);

//   // Clear selection when page changes
//   useEffect(() => {
//     setSelectedSlugs(new Set());
//   }, [currentPage]);

//   // ── Error handling ───────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (productsError) toast.error(`Failed to load products: ${productsError}`);
//   }, [productsError]);

//   useEffect(() => {
//     if (actionError) {
//       toast.error(`Action failed: ${actionError}`);
//       dispatch(clearErrors());
//     }
//   }, [actionError, dispatch]);

//   useEffect(() => {
//     if (deleteSuccess) {
//       toast.success("Product archived successfully");
//       dispatch(fetchArchivedProducts());
//       dispatch(fetchLowStockProducts({ page: 1, limit: 1 }));
//     }
//   }, [deleteSuccess, dispatch]);

//   // ── Refresh helpers ──────────────────────────────────────────────────────────
//   const refreshProducts = () => {
//     dispatch(fetchProducts({ page: currentPage, limit: 15 }));
//     dispatch(fetchLowStockProducts({ page: 1, limit: 1 }));
//   };

//   const handlePageChange = (newPage) => {
//     if (newPage >= 1 && newPage <= totalPages) {
//       dispatch(fetchProducts({ page: newPage, limit: 15 }));
//     }
//   };

//   // ── Product actions ──────────────────────────────────────────────────────────
//   const handleSoftDelete = (productId) => {
//     const product = products.find((p) => p._id === productId);
//     if (!product) return;
//     if (window.confirm(`Archive "${product.name}"? It will be hidden from the website.`)) {
//       dispatch(softDeleteProduct(product.slug))
//         .unwrap()
//         .catch(() => {
//           refreshProducts();
//           toast.error("Failed to archive product");
//         });
//     }
//   };

//   const toggleFeatured = (productId) => {
//     const product = products.find((p) => p._id === productId);
//     if (!product) return;
//     dispatch(optimisticUpdateProduct({ _id: productId, isFeatured: !product.isFeatured }));
//     dispatch(toggleFeaturedProduct({ product }))
//       .unwrap()
//       .catch(() => {
//         dispatch(optimisticUpdateProduct({ _id: productId, isFeatured: product.isFeatured }));
//         toast.error("Failed to toggle featured");
//       });
//   };

//   const changeStatus = (productId, newStatus) => {
//     const product = products.find((p) => p._id === productId);
//     if (!product) return;
//     const prevStatus = product.status;
//     dispatch(optimisticUpdateProduct({ _id: productId, status: newStatus }));
//     dispatch(changeProductStatus({ product, status: newStatus }))
//       .unwrap()
//       .catch(() => {
//         dispatch(optimisticUpdateProduct({ _id: productId, status: prevStatus }));
//         toast.error("Failed to change status");
//       });
//   };

//   const openEditModal = (product) => {
//     setSelectedProduct(product);
//     setShowEditModal(true);
//   };

//   // ── Bulk actions ─────────────────────────────────────────────────────────────
//   const handleSelectAll = (e) => {
//     if (e.target.checked) {
//       setSelectedSlugs(new Set(filteredProducts.map((p) => p.slug)));
//     } else {
//       setSelectedSlugs(new Set());
//     }
//   };

//   const handleSelectOne = (slug) => {
//     setSelectedSlugs((prev) => {
//       const next = new Set(prev);
//       if (next.has(slug)) next.delete(slug);
//       else next.add(slug);
//       return next;
//     });
//   };

//   const handleBulkStatusUpdate = async (status) => {
//     if (selectedSlugs.size === 0) return;

//     const label = status === "archived" ? "archive" : `set to ${status}`;
//     if (
//       !window.confirm(
//         `${label.charAt(0).toUpperCase() + label.slice(1)} ${selectedSlugs.size} product(s)? This cannot be easily undone.`
//       )
//     )
//       return;

//     setBulkLoading(true);
//     try {
//       const res = await axiosInstance.patch("/admin/products/bulk-status", {
//         status,
//         slugs: Array.from(selectedSlugs),
//       });

//       if (res.data.success) {
//         const { modified, notFoundCount } = res.data;
//         toast.success(
//           `${modified} product(s) updated to "${status}"` +
//             (notFoundCount > 0 ? ` • ${notFoundCount} not found` : "")
//         );
//         setSelectedSlugs(new Set());
//         refreshProducts();
//         if (status === "archived") dispatch(fetchArchivedProducts());
//         dispatch(fetchActiveProductsCount());
//       } else {
//         toast.error(res.data.message || "Bulk update failed");
//       }
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Bulk update failed");
//     } finally {
//       setBulkLoading(false);
//     }
//   };

//   // ── Category helpers ─────────────────────────────────────────────────────────
//   const getCategoryName = (productCategory) => {
//     if (!productCategory) return "Uncategorized";
//     if (typeof productCategory === "object" && productCategory.name)
//       return productCategory.name;
//     const categoryId =
//       typeof productCategory === "object" ? productCategory._id : productCategory;
//     const found = categories.find(
//       (cat) =>
//         cat._id === categoryId || cat._id?.toString() === categoryId?.toString()
//     );
//     return found ? found.name : "Uncategorized";
//   };

//   const getCategoryId = (productCategory) => {
//     if (!productCategory) return null;
//     if (typeof productCategory === "object") return productCategory._id;
//     return productCategory;
//   };

//   const handleCategorySelect = (categoryId) => {
//     setFilterCategory(categoryId);
//     setShowCategoryModal(false);
//     dispatch(fetchCategories());
//   };

//   // ── Derived stats ────────────────────────────────────────────────────────────
//   const activeProducts = realActiveCount;
//   const featuredProducts = products.filter((p) => p.isFeatured).length;
//   const lowStockCount = realLowStockCount;

//   // ── Date filter logic (client-side) ──────────────────────────────────────────
//   const getDateFilterRange = useCallback(() => {
//     const { preset, dateField, customStart, customEnd } = dateFilter;
//     if (!preset) return null;

//     let start, end;

//     if (preset === "custom") {
//       if (!customStart || !customEnd) return null;
//       start = new Date(customStart);
//       start.setHours(0, 0, 0, 0);
//       end = new Date(customEnd);
//       end.setHours(23, 59, 59, 999);
//     } else {
//       ({ start, end } = getPresetDates(preset));
//     }

//     return { start, end, dateField };
//   }, [dateFilter]);

//   // ── Filtered list ────────────────────────────────────────────────────────────
//   const filteredProducts = products.filter((product) => {
//     // search
//     const matchesSearch =
//       product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));

//     // status
//     const matchesStatus = filterStatus === "all" || product.status === filterStatus;

//     // category
//     const matchesCategory =
//       filterCategory === "all" || getCategoryId(product.category) === filterCategory;

//     // low stock
//     const matchesLowStock =
//       !showLowStockOnly || lowStockProducts.some((lp) => lp._id === product._id);

//     // date filter (client-side)
//     const range = getDateFilterRange();
//     let matchesDate = true;
//     if (range) {
//       const raw = product[range.dateField];
//       if (raw) {
//         const d = new Date(raw);
//         matchesDate = d >= range.start && d <= range.end;
//       } else {
//         matchesDate = false;
//       }
//     }

//     return matchesSearch && matchesStatus && matchesCategory && matchesLowStock && matchesDate;
//   });

//   // Derived checkbox states
//   const allOnPageSelected =
//     filteredProducts.length > 0 &&
//     filteredProducts.every((p) => selectedSlugs.has(p.slug));
//   const someSelected = selectedSlugs.size > 0;
//   const isIndeterminate =
//     someSelected && !filteredProducts.every((p) => selectedSlugs.has(p.slug));

//   // ── Loading ──────────────────────────────────────────────────────────────────
//   if (productsLoading || lowStockLoading) {
//     return (
//       <div className="space-y-6">
//         <div className="grid grid-cols-4 gap-6">
//           <StatsCardSkeleton />
//           <StatsCardSkeleton />
//           <StatsCardSkeleton />
//           <StatsCardSkeleton />
//         </div>
//         <ProductTableSkeleton />
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">

//       {/* Action loading overlay */}
//       {(actionLoading || deleteLoading || bulkLoading) && (
//         <div className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center">
//           <div className="bg-white rounded-xl px-6 py-4 shadow-xl flex items-center gap-3">
//             <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//             <span className="text-sm font-medium text-gray-700">
//               {bulkLoading ? "Applying bulk action..." : "Processing..."}
//             </span>
//           </div>
//         </div>
//       )}

//       {/* StatsCards */}
//       <StatsCards
//         activeProducts={activeProducts}
//         featuredProducts={featuredProducts}
//         archivedProducts={archivedProducts?.length || 0}
//         lowStockProducts={lowStockCount}
//         onViewArchived={() => onSwitchTab("archived")}
//       />

//       {/* Stats grid */}
//       <div className="grid grid-cols-4 gap-6">
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Total Products</p>
//               <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Active Products</p>
//               <p className="text-3xl font-bold text-gray-900">{activeProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Featured</p>
//               <p className="text-3xl font-bold text-gray-900">{featuredProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
//                 <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div
//           className={`bg-white rounded-2xl shadow-sm border p-6 cursor-pointer transition-all ${
//             showLowStockOnly ? "border-red-500 ring-2 ring-red-200" : "border-gray-200 hover:border-red-300"
//           }`}
//           onClick={() => setShowLowStockOnly(!showLowStockOnly)}
//         >
//           <div className="flex items-center justify-between relative cursor-pointer group">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Low Stock</p>
//               <p className="text-3xl font-bold text-gray-900">{lowStockCount}</p>
//               {showLowStockOnly && <p className="text-xs text-red-600 mt-1">Filter active</p>}
//             </div>
//             <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${showLowStockOnly ? "bg-red-200" : "bg-red-100"}`}>
//               <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//               </svg>
//             </div>
//             <div className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 transition text-xs bg-black text-white px-2 py-1 rounded">
//               Click to filter low stock items
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ── Filters / Bulk action bar ─────────────────────────────────────────── */}
//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
//         {someSelected ? (
//           /* ── BULK ACTION BAR (replaces filter bar when items selected) ── */
//           <div className="flex items-center gap-4">
//             {/* Selection count + clear */}
//             <div className="flex items-center gap-3 flex-1">
//               <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-medium text-sm">
//                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
//                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 {selectedSlugs.size} product{selectedSlugs.size > 1 ? "s" : ""} selected
//               </div>
//               <button
//                 onClick={() => setSelectedSlugs(new Set())}
//                 className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
//               >
//                 Clear selection
//               </button>
//             </div>

//            {/* Bulk action buttons - Select Type */}
//           <div className="flex items-center gap-2">
//             <span className="text-xl text-black  font-bold mr-1">Set as:</span>

//             <div className="relative group  border border-black rounded-xl">
//               {/* The Select Trigger */}
//               <button
//                 type="button"
//                 className="flex items-center animate-pulse justify-between gap-3 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:border-blue-300 transition-all min-w-[160px] cursor-pointer"
//               >
//                 <span className="text-black ">Choose Action</span>
//                 <svg className="w-4 h-4 text-gray-400 group-hover:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                 </svg>
//               </button>

//               {/* The Dropdown Menu - Opens on Hover or Click */}
//               <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-1.5 flex flex-col gap-1">
                
//                 {/* Draft Option - Kept your original style */}
//                 <button
//                   onClick={() => handleBulkStatusUpdate("draft")}
//                   disabled={bulkLoading}
//                   className="flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 border border-transparent rounded-xl text-sm font-medium hover:bg-yellow-100 transition-colors disabled:opacity-50 cursor-pointer"
//                 >
//                   <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
//                   Draft
//                 </button>

//                 {/* Active Option - Kept your original style */}
//                 <button
//                   onClick={() => handleBulkStatusUpdate("active")}
//                   disabled={bulkLoading}
//                   className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-transparent rounded-xl text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50 cursor-pointer"
//                 >
//                   <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
//                   Active
//                 </button>

//                 {/* Archive Option - Kept your original style */}
//                 <button
//                   onClick={() => handleBulkStatusUpdate("archived")}
//                   disabled={bulkLoading}
//                   className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 border border-transparent rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
//                 >
//                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
//                   </svg>
//                   Archive
//                 </button>

//               </div>
//             </div>
//           </div>
//           </div>
//         ) : (
//           /* ── NORMAL FILTER BAR ── */
//           <div className="flex gap-4">
//             {/* Search */}
//             <div className="flex-1 relative">
//               <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//               </svg>
//               <input
//                 type="text"
//                 placeholder="Search products..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             {/* Date Filter */}
//             <DateFilterButton dateFilter={dateFilter} setDateFilter={setDateFilter} />

//             {/* Status */}
//             <select
//               value={filterStatus}
//               onChange={(e) => setFilterStatus(e.target.value)}
//               className="px-4 cursor-pointer py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="all">All Status</option>
//               <option value="draft">Draft</option>
//               <option value="active">Active</option>
//             </select>

//             {/* Category */}
//             <div className="relative">
//               <select
//                 value={filterCategory}
//                 onChange={(e) => setFilterCategory(e.target.value)}
//                 className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 pr-12 appearance-none cursor-pointer"
//               >
//                 <option value="all">All Categories</option>
//                 {categories.map((cat) => (
//                   <option key={cat._id} value={cat._id}>{cat.name}</option>
//                 ))}
//               </select>
//               <button
//                 onClick={() => setShowCategoryModal(true)}
//                 className="absolute cursor-pointer right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
//                 title="Add New Category"
//               >
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
//                 </svg>
//               </button>
//             </div>

//             {/* Clear low stock */}
//             {showLowStockOnly && (
//               <button
//                 onClick={() => setShowLowStockOnly(false)}
//                 className="px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 font-medium flex items-center gap-2"
//               >
//                 <span>Clear Low Stock Filter</span>
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                 </svg>
//               </button>
//             )}

//             {/* Add Product */}
//             <button
//               onClick={() => setShowProductModal(true)}
//               className="px-6 cursor-pointer py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center space-x-2"
//             >
//               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//               </svg>
//               <span>Add Product</span>
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Products Table */}
//       {productsLoading ? (
//         <ProductTableSkeleton />
//       ) : (
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
//           <table className="w-full">
//             <thead>
//               <tr className="bg-gray-50 border-b border-gray-200">
//                 {/* ── Select All checkbox ── */}
//                 <th className="px-4 py-4 w-10">
//                   <input
//                     type="checkbox"
//                     checked={allOnPageSelected}
//                     ref={(el) => {
//                       if (el) el.indeterminate = isIndeterminate;
//                     }}
//                     onChange={handleSelectAll}
//                     className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
//                   />
//                 </th>
//                 <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
//                 <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
//                 <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
//                 <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
//                 <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
//                 <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//                 <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
//                 <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-200">
//               {filteredProducts.map((product) => {
//                 const isChecked = selectedSlugs.has(product.slug);
//                 const mainVariant = product.variants?.[0] || {};
//                 const basePrice = mainVariant.price?.base || 0;
//                 const salePrice = mainVariant.price?.sale;
//                 const discountPct = salePrice ? getDiscountPercentage(basePrice, salePrice) : 0;
//                 const totalStock =
//                   product.variants?.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0) || 0;
//                 const isLowStock = product.variants?.some(
//                   (v) => v.inventory?.quantity < v.inventory?.lowStockThreshold
//                 );
//                 const v0Images = mainVariant.images || [];
//                 const thumbUrl =
//                   (v0Images.find((img) => img.isMain) || v0Images[0])?.url ||
//                   product.images?.[0]?.url ||
//                   null;

//                 return (
//                   <tr
//                     key={product._id}
//                     className={`hover:bg-gray-50 transition-colors group ${isChecked ? "bg-blue-50 hover:bg-blue-50" : ""}`}
//                   >
//                     {/* ── Row checkbox ── */}
//                     <td className="px-4 py-4">
//                       <input
//                         type="checkbox"
//                         checked={isChecked}
//                         onChange={() => handleSelectOne(product.slug)}
//                         className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
//                       />
//                     </td>

//                     <td className="px-6 py-4">
//                       <div className="flex items-center gap-3">
//                         {thumbUrl ? (
//                           <img
//                             src={thumbUrl}
//                             alt={product.name}
//                             className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0"
//                           />
//                         ) : (
//                           <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
//                             <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                                 d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                             </svg>
//                           </div>
//                         )}
//                         <div className="min-w-0">
//                           <div className="font-medium text-gray-900 truncate">{product.name}</div>
//                           <div className="text-sm text-gray-500 truncate max-w-xs">{product.title}</div>
//                         </div>
//                       </div>
//                     </td>

//                     <td className="px-6 py-4">
//                       <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
//                         {getCategoryName(product.category)}
//                       </span>
//                     </td>

//                     <td className="px-6 py-4 text-sm">
//                       {!product.brand || product.brand === "Generic" ? (
//                         <span className="text-gray-400">—</span>
//                       ) : (
//                         <span className="font-medium text-gray-700">{product.brand}</span>
//                       )}
//                     </td>

//                     <td className="px-6 py-4">
//                       <div className="text-sm">
//                         {salePrice ? (
//                           <>
//                             <span className="text-gray-400 line-through text-xs mr-2">{formatIndianRupee(basePrice)}</span>
//                             <span className="font-bold text-gray-900">{formatIndianRupee(salePrice)}</span>
//                             {discountPct > 0 && (
//                               <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                                 {discountPct}% OFF
//                               </span>
//                             )}
//                           </>
//                         ) : (
//                           <span className="font-bold text-gray-900">{formatIndianRupee(basePrice)}</span>
//                         )}
//                       </div>
//                     </td>

//                     <td className="px-6 py-4">
//                       <div className="flex items-center space-x-2">
//                         <span className={`text-sm font-medium ${isLowStock ? "text-red-600" : "text-gray-700"}`}>
//                           {totalStock}
//                         </span>
//                         {isLowStock && (
//                           <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Low</span>
//                         )}
//                       </div>
//                     </td>

//                     <td className="px-6 py-4">
//                       <select
//                         value={product.status}
//                         onChange={(e) => changeStatus(product._id, e.target.value)}
//                         disabled={actionLoading}
//                         className={`text-xs px-3 py-1.5 cursor-pointer rounded-xl font-medium border-0 focus:ring-2 cursor-pointer transition-all ${
//                           actionLoading ? "opacity-50 cursor-not-allowed" : ""
//                         } ${
//                           product.status === "active"
//                             ? "bg-green-100 cursor-pointer text-green-700"
//                             : product.status === "draft"
//                             ? "bg-yellow-100 cursor-pointer text-yellow-700"
//                             : "bg-gray-100 cursor-pointer text-gray-700"
//                         }`}
//                       >
//                         <option value="draft">Draft</option>
//                         <option value="active">Active</option>
//                       </select>
//                     </td>

//                     <td className="px-6 py-4">
//                       <button
//                         onClick={() => toggleFeatured(product._id)}
//                         disabled={actionLoading}
//                         className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
//                           actionLoading ? "opacity-50 cursor-not-allowed" : ""
//                         } ${
//                           product.isFeatured
//                             ? "bg-yellow-100 cursor-pointer  text-yellow-700 hover:bg-yellow-200"
//                             : "bg-gray-100 cursor-pointer text-gray-600 hover:bg-gray-200"
//                         }`}
//                       >
//                         {product.isFeatured ? "⭐ Featured" : "Regular"}
//                       </button>
//                     </td>

//                     <td className="px-6 py-4">
//                       <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                         <button
//                           onClick={() => setDetailProduct(product)}
//                           className="p-2 text-gray-500 cursor-pointer hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
//                           title="View Details"
//                         >
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                               d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                           </svg>
//                         </button>
//                         <button
//                           onClick={() => openEditModal(product)}
//                           className="p-2 cursor-pointer text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
//                           title="Edit"
//                         >
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                               d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                           </svg>
//                         </button>
//                         <button
//                           onClick={() => handleSoftDelete(product._id)}
//                           className="p-2 cursor-pointer text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                           title="Archive"
//                         >
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                               d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
//                           </svg>
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>

//           {filteredProducts.length === 0 && (
//             <div className="text-center py-16">
//               <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
//               </svg>
//               <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
//               <p className="text-gray-500">
//                 {showLowStockOnly
//                   ? "No low stock products at the moment"
//                   : dateFilter.preset
//                   ? "No products match the selected date range"
//                   : `Click "Add Product" to create your first product`}
//               </p>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Pagination */}
//       {totalPages > 1 && (
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-4">
//           <div className="flex items-center justify-between">
//             <p className="text-sm text-gray-500">
//               Showing {(currentPage - 1) * 15 + 1}–{Math.min(currentPage * 15, totalProducts)} of{" "}
//               {totalProducts} products
//             </p>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => handlePageChange(currentPage - 1)}
//                 disabled={currentPage === 1}
//                 className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//                 </svg>
//                 Previous
//               </button>
//               <div className="flex gap-1">
//                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
//                   let pageNum;
//                   if (totalPages <= 5) pageNum = i + 1;
//                   else if (currentPage <= 3) pageNum = i + 1;
//                   else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
//                   else pageNum = currentPage - 2 + i;
//                   return (
//                     <button
//                       key={pageNum}
//                       onClick={() => handlePageChange(pageNum)}
//                       className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
//                         pageNum === currentPage
//                           ? "bg-blue-600 text-white"
//                           : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
//                       }`}
//                     >
//                       {pageNum}
//                     </button>
//                   );
//                 })}
//               </div>
//               <button
//                 onClick={() => handlePageChange(currentPage + 1)}
//                 disabled={currentPage === totalPages}
//                 className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 Next
//                 <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                 </svg>
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Modals */}
//       {detailProduct && (
//         <ProductDetailModal
//           product={detailProduct}
//           categories={categories}
//           onClose={() => setDetailProduct(null)}
//           formatIndianRupee={formatIndianRupee}
//           getDiscountPercentage={getDiscountPercentage}
//         />
//       )}

//       {showCategoryModal && (
//         <CategoryModal
//           onSelect={handleCategorySelect}
//           onClose={() => setShowCategoryModal(false)}
//         />
//       )}

//       {showProductModal && (
//         <ProductModal
//           onClose={() => {
//             setShowProductModal(false);
//             refreshProducts();
//           }}
//           brands={brands}
//           setBrands={setBrands}
//         />
//       )}

//       {showEditModal && selectedProduct && (
//         <EditProductModal
//           product={selectedProduct}
//           onClose={() => {
//             setShowEditModal(false);
//             setSelectedProduct(null);
//             refreshProducts();
//           }}
//           brands={brands}
//           setBrands={setBrands}
//         />
//       )}
//     </div>
//   );
// };

// export default ProductsTab;


// // ADMIN_TABS/ProductsTab.jsx

// import React, { useState, useEffect } from "react";
// import { useDispatch, useSelector }   from "react-redux";
// import { toast }                      from "react-toastify";

// import ProductDetailModal from "../Shared_components/ProductDetailModal";
// import CategoryModal      from "../Shared_components/CategoryModal";
// import StatsCards         from "../TOPBAR/StatsCards";
// import ProductModal       from "../PRODUCT_MODAL_SEGMENT/ProductModal";
// import EditProductModal   from "../PRODUCT_MODAL_SEGMENT/EditProductModal";

// import StatsCardSkeleton from "./SKELLETON_HUB/StatsCardSkeleton";
// import ProductTableSkeleton from "./SKELLETON_HUB/ProductTableSkeleton";

// import { fetchCategories } from "../ADMIN_REDUX_MANAGEMENT/categoriesSlice";
// import { fetchProducts, optimisticUpdateProduct, fetchLowStockProducts,fetchActiveProductsCount  , setCurrentPage } from "../ADMIN_REDUX_MANAGEMENT/adminGetProductsSlice";
// import { fetchArchivedProducts } from "../ADMIN_REDUX_MANAGEMENT/adminArchivedSlice";
// import {
//   softDeleteProduct,
//   toggleFeaturedProduct,
//   changeProductStatus,
//   clearErrors,
// }from "../ADMIN_REDUX_MANAGEMENT/adminEditProductSlice";

// // ── Formatters (no prop drilling needed) ─────────────────────────────────────
// const formatIndianRupee = (amount) =>
//   new Intl.NumberFormat("en-IN", {
//     style: "currency", currency: "INR",
//     minimumFractionDigits: 0, maximumFractionDigits: 0,
//   }).format(amount);

// const getDiscountPercentage = (base, sale) => {
//   if (!base || !sale || Number(sale) >= Number(base)) return 0;
//   return Math.round(((Number(base) - Number(sale)) / Number(base)) * 100);
// };

// // ── Default brands ────────────────────────────────────────────────────────────
// const DEFAULT_BRANDS = ["Sony", "Samsung", "Apple", "Nike", "Adidas", "Generic"];

// const ProductsTab = ({ onSwitchTab }) => {
//   const dispatch = useDispatch();

//   // ── Redux state ─────────────────────────────────────────────────────────────
//   const { 
//     products, 
//     totalProducts,      // ✅ ADDED: real total count
//     currentPage,        // ✅ ADDED: current page from Redux
//     totalPages,         // ✅ ADDED: total pages available
//       realActiveCount,     // ADD THIS
//   realLowStockCount,
//     loading: productsLoading, 
//     error: productsError 
//   } = useSelector((s) => s.adminGetProducts);

//   const {
//     products: lowStockProducts,
//     total:    lowStockTotal,
//     loading:  lowStockLoading,
//   } = useSelector((s) => s.adminGetProducts.lowStockProducts || {
//     products: [], total: 0, loading: false,
//   });

//   const { products: archivedProducts } =
//     useSelector((s) => s.adminArchived);

//   const { actionLoading, actionError, deleteLoading, deleteSuccess } =
//     useSelector((s) => s.adminEditProduct);

//   const { categories } = useSelector((s) => s.categories);

//   // ── Local state ──────────────────────────────────────────────────────────────
//   const [brands,          setBrands]          = useState(DEFAULT_BRANDS);
//   const [showProductModal, setShowProductModal] = useState(false);
//   const [showEditModal,    setShowEditModal]    = useState(false);
//   const [selectedProduct,  setSelectedProduct]  = useState(null);
//   const [searchTerm,       setSearchTerm]       = useState("");
//   const [filterStatus,     setFilterStatus]     = useState("all");
//   const [filterCategory,   setFilterCategory]   = useState("all");
//   const [detailProduct,    setDetailProduct]    = useState(null);
//   const [showLowStockOnly, setShowLowStockOnly] = useState(false);
//   const [showCategoryModal, setShowCategoryModal] = useState(false);

//   // ── Initial fetch ────────────────────────────────────────────────────────────
//   useEffect(() => {
//     dispatch(fetchProducts({ page: 1, limit: 15 }));  // ✅ Changed to 15 per page
//     dispatch(fetchCategories());
//     dispatch(fetchLowStockProducts({ page: 1, limit: 1 }));
//       dispatch(fetchActiveProductsCount());
//   }, [dispatch]);

//   // ── Error handling ───────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (productsError) toast.error(`Failed to load products: ${productsError}`);
//   }, [productsError]);

//   useEffect(() => {
//     if (actionError) {
//       toast.error(`Action failed: ${actionError}`);
//       dispatch(clearErrors());
//     }
//   }, [actionError, dispatch]);

//   useEffect(() => {
//     if (deleteSuccess) {
//       toast.success("Product archived successfully");
//       dispatch(fetchArchivedProducts());
//       dispatch(fetchLowStockProducts({ page: 1, limit: 1 }));
//     }
//   }, [deleteSuccess, dispatch]);

//   // ── Refresh helpers ──────────────────────────────────────────────────────────
//   const refreshProducts = () => {
//     dispatch(fetchProducts({ page: currentPage, limit: 15 }));  // ✅ Stay on same page
//     dispatch(fetchLowStockProducts({ page: 1, limit: 1 }));
//   };

//   // ✅ ADDED: Pagination handler
//   const handlePageChange = (newPage) => {
//     if (newPage >= 1 && newPage <= totalPages) {
//       dispatch(fetchProducts({ page: newPage, limit: 15 }));
//     }
//   };

//   // ── Product actions ──────────────────────────────────────────────────────────
//   const handleSoftDelete = (productId) => {
//     const product = products.find((p) => p._id === productId);
//     if (!product) return;
//     if (window.confirm(`Archive "${product.name}"? It will be hidden from the website.`)) {
//       dispatch(softDeleteProduct(product.slug))
//         .unwrap()
//         .catch(() => {
//           refreshProducts();
//           toast.error("Failed to archive product");
//         });
//     }
//   };

//   const toggleFeatured = (productId) => {
//     const product = products.find((p) => p._id === productId);
//     if (!product) return;
//     dispatch(optimisticUpdateProduct({ _id: productId, isFeatured: !product.isFeatured }));
//     dispatch(toggleFeaturedProduct({ product }))
//       .unwrap()
//       .catch(() => {
//         dispatch(optimisticUpdateProduct({ _id: productId, isFeatured: product.isFeatured }));
//         toast.error("Failed to toggle featured");
//       });
//   };

//   const changeStatus = (productId, newStatus) => {
//     const product = products.find((p) => p._id === productId);
//     if (!product) return;
//     const prevStatus = product.status;
//     dispatch(optimisticUpdateProduct({ _id: productId, status: newStatus }));
//     dispatch(changeProductStatus({ product, status: newStatus }))
//       .unwrap()
//       .catch(() => {
//         dispatch(optimisticUpdateProduct({ _id: productId, status: prevStatus }));
//         toast.error("Failed to change status");
//       });
//   };

//   const openEditModal = (product) => {
//     setSelectedProduct(product);
//     setShowEditModal(true);
//   };

//   // ── Category helpers ─────────────────────────────────────────────────────────
//   const getCategoryName = (productCategory) => {
//     if (!productCategory) return "Uncategorized";
//     if (typeof productCategory === "object" && productCategory.name) return productCategory.name;
//     const categoryId = typeof productCategory === "object" ? productCategory._id : productCategory;
//     const found = categories.find(
//       (cat) => cat._id === categoryId || cat._id?.toString() === categoryId?.toString()
//     );
//     return found ? found.name : "Uncategorized";
//   };

//   const getCategoryId = (productCategory) => {
//     if (!productCategory) return null;
//     if (typeof productCategory === "object") return productCategory._id;
//     return productCategory;
//   };

//   const handleCategorySelect = (categoryId) => {
//     setFilterCategory(categoryId);
//     setShowCategoryModal(false);
//     dispatch(fetchCategories());
//   };

//   // ── Derived stats ────────────────────────────────────────────────────────────
//   // const activeProducts   = products.filter((p) => p.status === "active").length;
//   const activeProducts = realActiveCount;
//   const featuredProducts = products.filter((p) => p.isFeatured).length;
//   // const lowStockCount    = lowStockTotal || 0;
//   const lowStockCount = realLowStockCount;

//   // ── Filtered list (now works on current page only) ──────────────────────────
//   const filteredProducts = products.filter((product) => {
//     const matchesSearch =
//       product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
//     const matchesStatus   = filterStatus   === "all" || product.status === filterStatus;
//     const matchesCategory = filterCategory === "all" || getCategoryId(product.category) === filterCategory;
//     const matchesLowStock = !showLowStockOnly ||
//       lowStockProducts.some((lp) => lp._id === product._id);
//     return matchesSearch && matchesStatus && matchesCategory && matchesLowStock;
//   });

//   // ── Loading ──────────────────────────────────────────────────────────────────
//  // ── Loading ──────────────────────────────────────────────────────────────────
// if (productsLoading || lowStockLoading) {
//   return (
//     <div className="space-y-6">
//       <div className="grid grid-cols-4 gap-6">
//         <StatsCardSkeleton />
//         <StatsCardSkeleton />
//         <StatsCardSkeleton />
//         <StatsCardSkeleton />
//       </div>
//       <ProductTableSkeleton />
//     </div>
//   );
// }

//   return (
//     <div className="space-y-6">

//       {/* Action loading overlay */}
//       {(actionLoading || deleteLoading) && (
//         <div className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center">
//           <div className="bg-white rounded-xl px-6 py-4 shadow-xl flex items-center gap-3">
//             <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//             <span className="text-sm font-medium text-gray-700">Processing...</span>
//           </div>
//         </div>
//       )}

//       {/* StatsCards — all data available right here */}
//       <StatsCards
//         activeProducts={activeProducts}
//         featuredProducts={featuredProducts}
//         archivedProducts={archivedProducts?.length || 0}
//         lowStockProducts={lowStockCount}
//         onViewArchived={() => onSwitchTab("archived")}
//       />

//       {/* Stats grid */}
//       <div className="grid grid-cols-4 gap-6">
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Total Products</p>
//               <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>  {/* ✅ FIXED: shows real total */}
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Active Products</p>
//               <p className="text-3xl font-bold text-gray-900">{activeProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Featured</p>
//               <p className="text-3xl font-bold text-gray-900">{featuredProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
//                 <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div
//           className={`bg-white rounded-2xl shadow-sm border p-6 cursor-pointer transition-all ${
//             showLowStockOnly ? "border-red-500 ring-2 ring-red-200" : "border-gray-200 hover:border-red-300"
//           }`}
//           onClick={() => setShowLowStockOnly(!showLowStockOnly)}
//         >
//          <div
//           className="flex items-center justify-between relative cursor-pointer group"
//           onClick={() => setShowLowStockOnly(prev => !prev)}
//         >
//           {/* LEFT */}
//           <div>
//             <p className="text-sm text-gray-500 mb-1">Low Stock</p>
//             <p className="text-3xl font-bold text-gray-900">{lowStockCount}</p>

//             {showLowStockOnly && (
//               <p className="text-xs text-red-600 mt-1">Filter active</p>
//             )}
//           </div>

//           {/* ICON */}
//           <div
//             className={`w-12 h-12 rounded-xl flex items-center justify-center ${
//               showLowStockOnly ? "bg-red-200" : "bg-red-100"
//             }`}
//           >
//             <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//             </svg>
//           </div>

//           {/* TOOLTIP */}
//           <div className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 transition text-xs bg-black text-white px-2 py-1 rounded">
//             Click to filter low stock items
//           </div>
//         </div>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
//         <div className="flex gap-4">
//           <div className="flex-1 relative">
//             <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//             </svg>
//             <input
//               type="text" placeholder="Search products..." value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <select
//             value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
//             className="px-4 cursor-pointer py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="all">All Status</option>
//             <option value="draft">Draft</option>
//             <option value="active">Active</option>
//           </select>
//           <div className="relative">
//             <select
//               value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
//               className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 pr-12 appearance-none cursor-pointer"
//             >
//               <option value="all">All Categories</option>
//               {categories.map((cat) => (
//                 <option key={cat._id} value={cat._id}>{cat.name}</option>
//               ))}
//             </select>
//             <button
//               onClick={() => setShowCategoryModal(true)}
//               className="absolute cursor-pointer right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
//               title="Add New Category"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
//               </svg>
//             </button>
//           </div>
//           {showLowStockOnly && (
//             <button
//               onClick={() => setShowLowStockOnly(false)}
//               className="px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 font-medium flex items-center gap-2"
//             >
//               <span>Clear Low Stock Filter</span>
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>
//           )}
//           <button
//             onClick={() => setShowProductModal(true)}
//             className="px-6 cursor-pointer py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center space-x-2"
//           >
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//             </svg>
//             <span>Add Product</span>
//           </button>
//         </div>
//       </div>
//             {/* Products Table - With Skeleton Loading */}
// {productsLoading ? (
//   <ProductTableSkeleton />
// ) : (
//   <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
//     <table className="w-full">
//       <thead>
//         <tr className="bg-gray-50 border-b border-gray-200">
//           <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
//           <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
//           <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
//           <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
//           <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
//           <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//           <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
//           <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
//         </tr>
//       </thead>
//       <tbody className="divide-y divide-gray-200">
//         {filteredProducts.map((product) => {
//           const mainVariant = product.variants?.[0] || {};
//           const basePrice   = mainVariant.price?.base || 0;
//           const salePrice   = mainVariant.price?.sale;
//           const discountPct = salePrice ? getDiscountPercentage(basePrice, salePrice) : 0;
//           const totalStock  = product.variants?.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0) || 0;
//           const isLowStock  = product.variants?.some((v) => v.inventory?.quantity < v.inventory?.lowStockThreshold);
//           const v0Images    = mainVariant.images || [];
//           const thumbUrl    = (v0Images.find((img) => img.isMain) || v0Images[0])?.url
//                            || product.images?.[0]?.url || null;

//           return (
//             <tr key={product._id} className="hover:bg-gray-50 transition-colors group">
//               <td className="px-6 py-4">
//                 <div className="flex items-center gap-3">
//                   {thumbUrl ? (
//                     <img src={thumbUrl} alt={product.name}
//                       className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
//                   ) : (
//                     <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
//                       <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                           d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                       </svg>
//                     </div>
//                   )}
//                   <div className="min-w-0">
//                     <div className="font-medium text-gray-900 truncate">{product.name}</div>
//                     <div className="text-sm text-gray-500 truncate max-w-xs">{product.title}</div>
//                   </div>
//                 </div>
//               </td>
//               <td className="px-6 py-4">
//                 <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
//                   {getCategoryName(product.category)}
//                 </span>
//               </td>
//               <td className="px-6 py-4 text-sm">
//                 {!product.brand || product.brand === "Generic"
//                   ? <span className="text-gray-400">—</span>
//                   : <span className="font-medium text-gray-700">{product.brand}</span>}
//               </td>
//               <td className="px-6 py-4">
//                 <div className="text-sm">
//                   {salePrice ? (
//                     <>
//                       <span className="text-gray-400 line-through text-xs mr-2">{formatIndianRupee(basePrice)}</span>
//                       <span className="font-bold text-gray-900">{formatIndianRupee(salePrice)}</span>
//                       {discountPct > 0 && (
//                         <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                           {discountPct}% OFF
//                         </span>
//                       )}
//                     </>
//                   ) : (
//                     <span className="font-bold text-gray-900">{formatIndianRupee(basePrice)}</span>
//                   )}
//                 </div>
//               </td>
//               <td className="px-6 py-4">
//                 <div className="flex items-center space-x-2">
//                   <span className={`text-sm font-medium ${isLowStock ? "text-red-600" : "text-gray-700"}`}>
//                     {totalStock}
//                   </span>
//                   {isLowStock && (
//                     <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Low</span>
//                   )}
//                 </div>
//               </td>
//               <td className="px-6 py-4">
//                 <select
//                   value={product.status}
//                   onChange={(e) => changeStatus(product._id, e.target.value)}
//                   disabled={actionLoading}
//                   className={`text-xs px-3 py-1.5 rounded-xl font-medium border-0 focus:ring-2 cursor-pointer transition-all ${
//                     actionLoading ? "opacity-50 cursor-not-allowed" : ""
//                   } ${
//                     product.status === "active" ? "bg-green-100 text-green-700" :
//                     product.status === "draft"  ? "bg-yellow-100 text-yellow-700" :
//                                                   "bg-gray-100 text-gray-700"
//                   }`}
//                 >
//                   <option value="draft">Draft</option>
//                   <option value="active">Active</option>
//                 </select>
//               </td>
//               <td className="px-6 py-4">
//                 <button
//                   onClick={() => toggleFeatured(product._id)}
//                   disabled={actionLoading}
//                   className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
//                     actionLoading ? "opacity-50 cursor-not-allowed" : ""
//                   } ${
//                     product.isFeatured
//                       ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
//                       : "bg-gray-100 text-gray-600 hover:bg-gray-200"
//                   }`}
//                 >
//                   {product.isFeatured ? "⭐ Featured" : "Regular"}
//                 </button>
//               </td>
//               <td className="px-6 py-4">
//                 <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                   <button onClick={() => setDetailProduct(product)}
//                     className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
//                     title="View Details">
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                         d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                     </svg>
//                   </button>
//                   <button onClick={() => openEditModal(product)}
//                     className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                         d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                     </svg>
//                   </button>
//                   <button onClick={() => handleSoftDelete(product._id)}
//                     className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Archive">
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                         d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
//                     </svg>
//                   </button>
//                 </div>
//               </td>
//             </tr>
//           );
//         })}
//       </tbody>
//     </table>

//           {filteredProducts.length === 0 && (
//             <div className="text-center py-16">
//               <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
//               </svg>
//               <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
//               <p className="text-gray-500">
//                 {showLowStockOnly
//                   ? "No low stock products at the moment"
//                   : `Click "Add Product" to create your first product`}
//               </p>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ✅ ADDED: Pagination Component */}
//       {totalPages > 1 && (
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-4">
//           <div className="flex items-center justify-between">
//             <p className="text-sm text-gray-500">
//               Showing {(currentPage - 1) * 15 + 1}–{Math.min(currentPage * 15, totalProducts)} of {totalProducts} products
//             </p>
//             <div className="flex items-center gap-2">
//               {/* Previous Button */}
//               <button
//                 onClick={() => handlePageChange(currentPage - 1)}
//                 disabled={currentPage === 1}
//                 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//                 </svg>
//                 Previous
//               </button>
              
//               {/* Page Numbers */}
//               <div className="flex gap-1">
//                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
//                   let pageNum;
//                   if (totalPages <= 5) {
//                     pageNum = i + 1;
//                   } else if (currentPage <= 3) {
//                     pageNum = i + 1;
//                   } else if (currentPage >= totalPages - 2) {
//                     pageNum = totalPages - 4 + i;
//                   } else {
//                     pageNum = currentPage - 2 + i;
//                   }
                  
//                   return (
//                     <button
//                       key={pageNum}
//                       onClick={() => handlePageChange(pageNum)}
//                       className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
//                         pageNum === currentPage
//                           ? "bg-blue-600 text-white"
//                           : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
//                       }`}
//                     >
//                       {pageNum}
//                     </button>
//                   );
//                 })}
//               </div>
              
//               {/* Next Button */}
//               <button
//                 onClick={() => handlePageChange(currentPage + 1)}
//                 disabled={currentPage === totalPages}
//                 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 Next
//                 <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                 </svg>
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Detail modal */}
//       {detailProduct && (
//         <ProductDetailModal
//           product={detailProduct}
//           categories={categories}
//           onClose={() => setDetailProduct(null)}
//           formatIndianRupee={formatIndianRupee}
//           getDiscountPercentage={getDiscountPercentage}
//         />
//       )}

//       {/* Category modal */}
//       {showCategoryModal && (
//         <CategoryModal
//           onSelect={handleCategorySelect}
//           onClose={() => setShowCategoryModal(false)}
//         />
//       )}

//       {/* Create product modal */}
//       {showProductModal && (
//         <ProductModal
//           onClose={() => {
//             setShowProductModal(false);
//             refreshProducts();
//           }}
//           brands={brands}
//           setBrands={setBrands}
//         />
//       )}

//       {/* Edit product modal */}
//       {showEditModal && selectedProduct && (
//         <EditProductModal
//           product={selectedProduct}
//           onClose={() => {
//             setShowEditModal(false);
//             setSelectedProduct(null);
//             refreshProducts();
//           }}
//           brands={brands}
//           setBrands={setBrands}
//         />
//       )}

//     </div>
//   );
// };

// export default ProductsTab;
// code is working but upper code have pagination 
// // ADMIN_TABS/ProductsTab.jsx
// import React, { useState, useEffect } from "react";
// import { useDispatch, useSelector }   from "react-redux";
// import { toast }                      from "react-toastify";

// import ProductDetailModal from "../Shared_components/ProductDetailModal";
// import CategoryModal      from "../Shared_components/CategoryModal";
// import StatsCards         from "../TOPBAR/StatsCards";
// import ProductModal       from "../PRODUCT_MODAL_SEGMENT/ProductModal";
// import EditProductModal   from "../PRODUCT_MODAL_SEGMENT/EditProductModal";

// import { fetchCategories } from "../ADMIN_REDUX_MANAGEMENT/categoriesSlice";
// import { fetchProducts, optimisticUpdateProduct,fetchLowStockProducts }from "../ADMIN_REDUX_MANAGEMENT/adminGetProductsSlice";
// import { fetchArchivedProducts } from "../ADMIN_REDUX_MANAGEMENT/adminArchivedSlice";
// import {
//   softDeleteProduct,
//   toggleFeaturedProduct,
//   changeProductStatus,
//   clearErrors,
// }from "../ADMIN_REDUX_MANAGEMENT/adminEditProductSlice";

// // ── Formatters (no prop drilling needed) ─────────────────────────────────────
// const formatIndianRupee = (amount) =>
//   new Intl.NumberFormat("en-IN", {
//     style: "currency", currency: "INR",
//     minimumFractionDigits: 0, maximumFractionDigits: 0,
//   }).format(amount);

// const getDiscountPercentage = (base, sale) => {
//   if (!base || !sale || Number(sale) >= Number(base)) return 0;
//   return Math.round(((Number(base) - Number(sale)) / Number(base)) * 100);
// };

// // ── Default brands ────────────────────────────────────────────────────────────
// const DEFAULT_BRANDS = ["Sony", "Samsung", "Apple", "Nike", "Adidas", "Generic"];

// const ProductsTab = ({ onSwitchTab }) => {
//   const dispatch = useDispatch();

//   // ── Redux state ─────────────────────────────────────────────────────────────
//   const { products, loading: productsLoading, error: productsError } =
//     useSelector((s) => s.adminGetProducts);

//   const {
//     products: lowStockProducts,
//     total:    lowStockTotal,
//     loading:  lowStockLoading,
//   } = useSelector((s) => s.adminGetProducts.lowStockProducts || {
//     products: [], total: 0, loading: false,
//   });

//   const { products: archivedProducts } =
//     useSelector((s) => s.adminArchived);

//   const { actionLoading, actionError, deleteLoading, deleteSuccess } =
//     useSelector((s) => s.adminEditProduct);

//   const { categories } = useSelector((s) => s.categories);

//   // ── Local state ──────────────────────────────────────────────────────────────
//   const [brands,          setBrands]          = useState(DEFAULT_BRANDS);
//   const [showProductModal, setShowProductModal] = useState(false);
//   const [showEditModal,    setShowEditModal]    = useState(false);
//   const [selectedProduct,  setSelectedProduct]  = useState(null);
//   const [searchTerm,       setSearchTerm]       = useState("");
//   const [filterStatus,     setFilterStatus]     = useState("all");
//   const [filterCategory,   setFilterCategory]   = useState("all");
//   const [detailProduct,    setDetailProduct]    = useState(null);
//   const [showLowStockOnly, setShowLowStockOnly] = useState(false);
//   const [showCategoryModal, setShowCategoryModal] = useState(false);

//   // ── Initial fetch ────────────────────────────────────────────────────────────
//   useEffect(() => {
//     dispatch(fetchProducts({ page: 1, limit: 15 }));
//     dispatch(fetchCategories());
//     dispatch(fetchLowStockProducts({ page: 1, limit: 1 }));
//   }, [dispatch]);

//   // ── Error handling ───────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (productsError) toast.error(`Failed to load products: ${productsError}`);
//   }, [productsError]);

//   useEffect(() => {
//     if (actionError) {
//       toast.error(`Action failed: ${actionError}`);
//       dispatch(clearErrors());
//     }
//   }, [actionError, dispatch]);

//   useEffect(() => {
//     if (deleteSuccess) {
//       toast.success("Product archived successfully");
//       dispatch(fetchArchivedProducts());
//       dispatch(fetchLowStockProducts({ page: 1, limit: 1 }));
//     }
//   }, [deleteSuccess, dispatch]);

//   // ── Refresh helpers ──────────────────────────────────────────────────────────
//   const refreshProducts = () => {
//     dispatch(fetchProducts({ page: 1, limit: 50 }));
//     dispatch(fetchLowStockProducts({ page: 1, limit: 1 }));
//   };

//   // ── Product actions ──────────────────────────────────────────────────────────
//   const handleSoftDelete = (productId) => {
//     const product = products.find((p) => p._id === productId);
//     if (!product) return;
//     if (window.confirm(`Archive "${product.name}"? It will be hidden from the website.`)) {
//       dispatch(softDeleteProduct(product.slug))
//         .unwrap()
//         .catch(() => {
//           refreshProducts();
//           toast.error("Failed to archive product");
//         });
//     }
//   };

//   const toggleFeatured = (productId) => {
//     const product = products.find((p) => p._id === productId);
//     if (!product) return;
//     dispatch(optimisticUpdateProduct({ _id: productId, isFeatured: !product.isFeatured }));
//     dispatch(toggleFeaturedProduct({ product }))
//       .unwrap()
//       .catch(() => {
//         dispatch(optimisticUpdateProduct({ _id: productId, isFeatured: product.isFeatured }));
//         toast.error("Failed to toggle featured");
//       });
//   };

//   const changeStatus = (productId, newStatus) => {
//     const product = products.find((p) => p._id === productId);
//     if (!product) return;
//     const prevStatus = product.status;
//     dispatch(optimisticUpdateProduct({ _id: productId, status: newStatus }));
//     dispatch(changeProductStatus({ product, status: newStatus }))
//       .unwrap()
//       .catch(() => {
//         dispatch(optimisticUpdateProduct({ _id: productId, status: prevStatus }));
//         toast.error("Failed to change status");
//       });
//   };

//   const openEditModal = (product) => {
//     setSelectedProduct(product);
//     setShowEditModal(true);
//   };

//   // ── Category helpers ─────────────────────────────────────────────────────────
//   const getCategoryName = (productCategory) => {
//     if (!productCategory) return "Uncategorized";
//     if (typeof productCategory === "object" && productCategory.name) return productCategory.name;
//     const categoryId = typeof productCategory === "object" ? productCategory._id : productCategory;
//     const found = categories.find(
//       (cat) => cat._id === categoryId || cat._id?.toString() === categoryId?.toString()
//     );
//     return found ? found.name : "Uncategorized";
//   };

//   const getCategoryId = (productCategory) => {
//     if (!productCategory) return null;
//     if (typeof productCategory === "object") return productCategory._id;
//     return productCategory;
//   };

//   const handleCategorySelect = (categoryId) => {
//     setFilterCategory(categoryId);
//     setShowCategoryModal(false);
//     dispatch(fetchCategories());
//   };

//   // ── Derived stats ────────────────────────────────────────────────────────────
//   const totalProducts    = products.length;
//   const activeProducts   = products.filter((p) => p.status === "active").length;
//   const featuredProducts = products.filter((p) => p.isFeatured).length;
//   const lowStockCount    = lowStockTotal || 0;

//   // ── Filtered list ────────────────────────────────────────────────────────────
//   const filteredProducts = products.filter((product) => {
//     const matchesSearch =
//       product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
//     const matchesStatus   = filterStatus   === "all" || product.status === filterStatus;
//     const matchesCategory = filterCategory === "all" || getCategoryId(product.category) === filterCategory;
//     const matchesLowStock = !showLowStockOnly ||
//       lowStockProducts.some((lp) => lp._id === product._id);
//     return matchesSearch && matchesStatus && matchesCategory && matchesLowStock;
//   });

//   // ── Loading ──────────────────────────────────────────────────────────────────
//   if (productsLoading || lowStockLoading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
//           <p className="text-gray-500">Loading products...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">

//       {/* Action loading overlay */}
//       {(actionLoading || deleteLoading) && (
//         <div className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center">
//           <div className="bg-white rounded-xl px-6 py-4 shadow-xl flex items-center gap-3">
//             <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//             <span className="text-sm font-medium text-gray-700">Processing...</span>
//           </div>
//         </div>
//       )}

//       {/* StatsCards — all data available right here */}
//       <StatsCards
//         activeProducts={activeProducts}
//         featuredProducts={featuredProducts}
//         archivedProducts={archivedProducts?.length || 0}
//         lowStockProducts={lowStockCount}
//         onViewArchived={() => onSwitchTab("archived")}
//       />

//       {/* Stats grid */}
//       <div className="grid grid-cols-4 gap-6">
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Total Products</p>
//               <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Active Products</p>
//               <p className="text-3xl font-bold text-gray-900">{activeProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Featured</p>
//               <p className="text-3xl font-bold text-gray-900">{featuredProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
//                 <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div
//           className={`bg-white rounded-2xl shadow-sm border p-6 cursor-pointer transition-all ${
//             showLowStockOnly ? "border-red-500 ring-2 ring-red-200" : "border-gray-200 hover:border-red-300"
//           }`}
//           onClick={() => setShowLowStockOnly(!showLowStockOnly)}
//         >
//          <div
//           className="flex items-center justify-between relative cursor-pointer group"
//           onClick={() => setShowLowStockOnly(prev => !prev)}
//         >
//           {/* LEFT */}
//           <div>
//             <p className="text-sm text-gray-500 mb-1">Low Stock</p>
//             <p className="text-3xl font-bold text-gray-900">{lowStockCount}</p>

//             {showLowStockOnly && (
//               <p className="text-xs text-red-600 mt-1">Filter active</p>
//             )}
//           </div>

//           {/* ICON */}
//           <div
//             className={`w-12 h-12 rounded-xl flex items-center justify-center ${
//               showLowStockOnly ? "bg-red-200" : "bg-red-100"
//             }`}
//           >
//             <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//             </svg>
//           </div>

//           {/* TOOLTIP */}
//           <div className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 transition text-xs bg-black text-white px-2 py-1 rounded">
//             Click to filter low stock items
//           </div>
//         </div>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
//         <div className="flex gap-4">
//           <div className="flex-1 relative">
//             <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//             </svg>
//             <input
//               type="text" placeholder="Search products..." value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <select
//             value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
//             className="px-4 cursor-pointer py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="all">All Status</option>
//             <option value="draft">Draft</option>
//             <option value="active">Active</option>
//           </select>
//           <div className="relative">
//             <select
//               value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
//               className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 pr-12 appearance-none cursor-pointer"
//             >
//               <option value="all">All Categories</option>
//               {categories.map((cat) => (
//                 <option key={cat._id} value={cat._id}>{cat.name}</option>
//               ))}
//             </select>
//             <button
//               onClick={() => setShowCategoryModal(true)}
//               className="absolute cursor-pointer right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
//               title="Add New Category"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
//               </svg>
//             </button>
//           </div>
//           {showLowStockOnly && (
//             <button
//               onClick={() => setShowLowStockOnly(false)}
//               className="px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 font-medium flex items-center gap-2"
//             >
//               <span>Clear Low Stock Filter</span>
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>
//           )}
//           <button
//             onClick={() => setShowProductModal(true)}
//             className="px-6 cursor-pointer py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center space-x-2"
//           >
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//             </svg>
//             <span>Add Product</span>
//           </button>
//         </div>
//       </div>

//       {/* Products Table */}
//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
//         <table className="w-full">
//           <thead>
//             <tr className="bg-gray-50 border-b border-gray-200">
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-200">
//             {filteredProducts.map((product) => {
//               const mainVariant = product.variants?.[0] || {};
//               const basePrice   = mainVariant.price?.base || 0;
//               const salePrice   = mainVariant.price?.sale;
//               const discountPct = salePrice ? getDiscountPercentage(basePrice, salePrice) : 0;
//               const totalStock  = product.variants?.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0) || 0;
//               const isLowStock  = product.variants?.some((v) => v.inventory?.quantity < v.inventory?.lowStockThreshold);
//               const v0Images    = mainVariant.images || [];
//               const thumbUrl    = (v0Images.find((img) => img.isMain) || v0Images[0])?.url
//                                || product.images?.[0]?.url || null;

//               return (
//                 <tr key={product._id} className="hover:bg-gray-50 transition-colors group">
//                   <td className="px-6 py-4">
//                     <div className="flex items-center gap-3">
//                       {thumbUrl ? (
//                         <img src={thumbUrl} alt={product.name}
//                           className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
//                       ) : (
//                         <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
//                           <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                               d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                           </svg>
//                         </div>
//                       )}
//                       <div className="min-w-0">
//                         <div className="font-medium text-gray-900 truncate">{product.name}</div>
//                         <div className="text-sm text-gray-500 truncate max-w-xs">{product.title}</div>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
//                       {getCategoryName(product.category)}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 text-sm">
//                     {!product.brand || product.brand === "Generic"
//                       ? <span className="text-gray-400">—</span>
//                       : <span className="font-medium text-gray-700">{product.brand}</span>}
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="text-sm">
//                       {salePrice ? (
//                         <>
//                           <span className="text-gray-400 line-through text-xs mr-2">{formatIndianRupee(basePrice)}</span>
//                           <span className="font-bold text-gray-900">{formatIndianRupee(salePrice)}</span>
//                           {discountPct > 0 && (
//                             <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                               {discountPct}% OFF
//                             </span>
//                           )}
//                         </>
//                       ) : (
//                         <span className="font-bold text-gray-900">{formatIndianRupee(basePrice)}</span>
//                       )}
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex items-center space-x-2">
//                       <span className={`text-sm font-medium ${isLowStock ? "text-red-600" : "text-gray-700"}`}>
//                         {totalStock}
//                       </span>
//                       {isLowStock && (
//                         <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Low</span>
//                       )}
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <select
//                       value={product.status}
//                       onChange={(e) => changeStatus(product._id, e.target.value)}
//                       disabled={actionLoading}
//                       className={`text-xs px-3 py-1.5 rounded-xl font-medium border-0 focus:ring-2 cursor-pointer transition-all ${
//                         actionLoading ? "opacity-50 cursor-not-allowed" : ""
//                       } ${
//                         product.status === "active" ? "bg-green-100 text-green-700" :
//                         product.status === "draft"  ? "bg-yellow-100 text-yellow-700" :
//                                                       "bg-gray-100 text-gray-700"
//                       }`}
//                     >
//                       <option value="draft">Draft</option>
//                       <option value="active">Active</option>
//                     </select>
//                   </td>
//                   <td className="px-6 py-4">
//                     <button
//                       onClick={() => toggleFeatured(product._id)}
//                       disabled={actionLoading}
//                       className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
//                         actionLoading ? "opacity-50 cursor-not-allowed" : ""
//                       } ${
//                         product.isFeatured
//                           ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
//                           : "bg-gray-100 text-gray-600 hover:bg-gray-200"
//                       }`}
//                     >
//                       {product.isFeatured ? "⭐ Featured" : "Regular"}
//                     </button>
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                       <button onClick={() => setDetailProduct(product)}
//                         className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
//                         title="View Details">
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                             d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                         </svg>
//                       </button>
//                       <button onClick={() => openEditModal(product)}
//                         className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                             d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                         </svg>
//                       </button>
//                       <button onClick={() => handleSoftDelete(product._id)}
//                         className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Archive">
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                             d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
//                         </svg>
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>

//         {filteredProducts.length === 0 && (
//           <div className="text-center py-16">
//             <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                 d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
//             </svg>
//             <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
//             <p className="text-gray-500">
//               {showLowStockOnly
//                 ? "No low stock products at the moment"
//                 : `Click "Add Product" to create your first product`}
//             </p>
//           </div>
//         )}
//       </div>

//       {/* Detail modal */}
//       {detailProduct && (
//         <ProductDetailModal
//           product={detailProduct}
//           categories={categories}
//           onClose={() => setDetailProduct(null)}
//           formatIndianRupee={formatIndianRupee}
//           getDiscountPercentage={getDiscountPercentage}
//         />
//       )}

//       {/* Category modal */}
//       {showCategoryModal && (
//         <CategoryModal
//           onSelect={handleCategorySelect}
//           onClose={() => setShowCategoryModal(false)}
//         />
//       )}

//       {/* Create product modal */}
//       {showProductModal && (
//         <ProductModal
//           onClose={() => {
//             setShowProductModal(false);
//             refreshProducts();
//           }}
//           brands={brands}
//           setBrands={setBrands}
//         />
//       )}

//       {/* Edit product modal */}
//       {showEditModal && selectedProduct && (
//         <EditProductModal
//           product={selectedProduct}
//           onClose={() => {
//             setShowEditModal(false);
//             setSelectedProduct(null);
//             refreshProducts();
//           }}
//           brands={brands}
//           setBrands={setBrands}
//         />
//       )}

//     </div>
//   );
// };

// export default ProductsTab;
// tryig to make component independent

// // ADMIN_TABS/ProductsTab.jsx

// import React, { useState } from 'react';
// import ProductDetailModal from '../Shared_components/ProductDetailModal';
// import CategoryModal from '../Shared_components/CategoryModal';
// const ProductsTab = ({
//   products,
//   categories,
//   brands,
//   onAddClick,
//   onEdit,
//   onDelete,
//   onToggleFeatured,
//   onChangeStatus,
//   formatIndianRupee,
//   getDiscountPercentage,
//   loading,
//   actionLoading,
//   // NEW: Add these props
//   lowStockProducts = [],
//   lowStockLoading = false,
//    onCategoryChange,
// }) => {
//   const [searchTerm,     setSearchTerm]     = useState('');
//   const [filterStatus,   setFilterStatus]   = useState('all');
//   const [filterCategory, setFilterCategory] = useState('all');
//   const [detailProduct,  setDetailProduct]  = useState(null);
//   const [showLowStockOnly, setShowLowStockOnly] = useState(false);
//   const [showCategoryModal, setShowCategoryModal] = useState(false);

//   const getCategoryName = (productCategory) => {
//     if (!productCategory) return 'Uncategorized';
//     if (typeof productCategory === 'object' && productCategory.name) return productCategory.name;
//     const categoryId = typeof productCategory === 'object' ? productCategory._id : productCategory;
//     const found = categories.find(
//       (cat) => cat._id === categoryId || cat._id?.toString() === categoryId?.toString()
//     );
//     return found ? found.name : 'Uncategorized';
//   };

//   const getCategoryId = (productCategory) => {
//     if (!productCategory) return null;
//     if (typeof productCategory === 'object') return productCategory._id;
//     return productCategory;
//   };
//   const handleCategorySelect = (categoryId) => {
//     // Auto-select the newly created category in the dropdown
//     setFilterCategory(categoryId);
//     setShowCategoryModal(false);
    
//     // Refresh categories list from parent if callback provided
//     if (onCategoryChange) {
//       onCategoryChange();
//     }
//   };
//   const totalProducts    = products.length;
//   const activeProducts   = products.filter((p) => p.status === 'active').length;
//   const featuredProducts = products.filter((p) => p.isFeatured).length;
  
//   // FIXED: Use the low stock count from the API
//   const lowStockCount = lowStockProducts?.length || 0;

//   // Filter products based on search, status, category, and low stock toggle
//   const filteredProducts = products.filter((product) => {
//     const matchesSearch =
//       product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    
//     const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
//     const matchesCategory = filterCategory === 'all' || getCategoryId(product.category) === filterCategory;
    
//     // If low stock filter is active, only show products that are in the lowStockProducts list
//     const matchesLowStock = !showLowStockOnly || 
//       lowStockProducts.some(lp => lp._id === product._id);
    
//     return matchesSearch && matchesStatus && matchesCategory && matchesLowStock;
//   });

//   if (loading || lowStockLoading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
//           <p className="text-gray-500">Loading products...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">

//       {/* Stats Cards */}
//       <div className="grid grid-cols-4 gap-6">
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Total Products</p>
//               <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Active Products</p>
//               <p className="text-3xl font-bold text-gray-900">{activeProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Featured</p>
//               <p className="text-3xl font-bold text-gray-900">{featuredProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
//                 <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         {/* FIXED: Low Stock card now shows count from API and can be clicked to filter */}
//         <div 
//           className={`bg-white rounded-2xl shadow-sm border p-6 cursor-pointer transition-all ${
//             showLowStockOnly 
//               ? 'border-red-500 ring-2 ring-red-200' 
//               : 'border-gray-200 hover:border-red-300'
//           }`}
//           onClick={() => setShowLowStockOnly(!showLowStockOnly)}
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Low Stock</p>
//               <p className="text-3xl font-bold text-gray-900">{lowStockCount}</p>
//               {showLowStockOnly && (
//                 <p className="text-xs text-red-600 mt-1">Filter active</p>
//               )}
//             </div>
//             <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
//               showLowStockOnly ? 'bg-red-200' : 'bg-red-100'
//             }`}>
//               <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
//         <div className="flex gap-4">
//           <div className="flex-1 relative">
//             <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//             </svg>
//             <input type="text" placeholder="Search products..." value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
//           </div>
//           <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
//             className="px-4 cursor-pointer py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
//             <option value="all">All Status</option>
//             <option value="draft">Draft</option>
//             <option value="active">Active</option>
//           </select>
//        {/* MODIFIED: Category dropdown with plus icon */}
//           <div className="relative">  {/* ✅ NEW wrapper div with relative positioning */}
//             <select 
//               value={filterCategory} 
//               onChange={(e) => setFilterCategory(e.target.value)}
//               className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 pr-12 appearance-none cursor-pointer"  // ✅ ADDED pr-12 for icon space
//             >
//               <option value="all">All Categories</option>
//               {categories.map((cat) => (
//                 <option key={cat._id} value={cat._id}>{cat.name}</option>
//               ))}
//             </select>
            
//             {/* ✅ NEW: Plus icon button */}
//             <button
//               onClick={() => setShowCategoryModal(true)}  // Opens modal
//               className="absolute cursor-pointer right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg transform hover:scale-105"
//               title="Add New Category"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
//               </svg>
//             </button>
//           </div>
//           {showLowStockOnly && (
//             <button
//               onClick={() => setShowLowStockOnly(false)}
//               className="px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 font-medium flex items-center gap-2"
//             >
//               <span>Clear Low Stock Filter</span>
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>
//           )}
//           <button onClick={onAddClick}
//             className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center space-x-2">
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//             </svg>
//             <span>Add Product</span>
//           </button>
//         </div>
//       </div>

//       {/* Products Table */}
//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
//         <table className="w-full">
//           <thead>
//             <tr className="bg-gray-50 border-b border-gray-200">
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-200">
//             {filteredProducts.map((product) => {
//               const mainVariant = product.variants?.[0] || {};
//               const basePrice   = mainVariant.price?.base || 0;
//               const salePrice   = mainVariant.price?.sale;
//               const discountPct = salePrice ? getDiscountPercentage(basePrice, salePrice) : 0;
//               const totalStock  = product.variants?.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0) || 0;
//               const isLowStock  = product.variants?.some((v) => v.inventory?.quantity < v.inventory?.lowStockThreshold);

//               // Thumbnail
//               const v0Images   = mainVariant.images || [];
//               const thumbUrl   = (v0Images.find((img) => img.isMain) || v0Images[0])?.url
//                               || product.images?.[0]?.url
//                               || null;

//               return (
//                 <tr key={product._id} className="hover:bg-gray-50 transition-colors group">
//                   <td className="px-6 py-4">
//                     <div className="flex items-center gap-3">
//                       {thumbUrl ? (
//                         <img src={thumbUrl} alt={product.name}
//                           className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
//                       ) : (
//                         <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
//                           <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                               d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                           </svg>
//                         </div>
//                       )}
//                       <div className="min-w-0">
//                         <div className="font-medium text-gray-900 truncate">{product.name}</div>
//                         <div className="text-sm text-gray-500 truncate max-w-xs">{product.title}</div>
//                       </div>
//                     </div>
//                   </td>

//                   <td className="px-6 py-4">
//                     <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
//                       {getCategoryName(product.category)}
//                     </span>
//                   </td>

//                   <td className="px-6 py-4 text-sm">
//                     {!product.brand || product.brand === 'Generic'
//                       ? <span className="text-gray-400">—</span>
//                       : <span className="font-medium text-gray-700">{product.brand}</span>}
//                   </td>

//                   <td className="px-6 py-4">
//                     <div className="text-sm">
//                       {salePrice ? (
//                         <>
//                           <span className="text-gray-400 line-through text-xs mr-2">{formatIndianRupee(basePrice)}</span>
//                           <span className="font-bold text-gray-900">{formatIndianRupee(salePrice)}</span>
//                           {discountPct > 0 && (
//                             <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                               {discountPct}% OFF
//                             </span>
//                           )}
//                         </>
//                       ) : (
//                         <span className="font-bold text-gray-900">{formatIndianRupee(basePrice)}</span>
//                       )}
//                     </div>
//                   </td>

//                   <td className="px-6 py-4">
//                     <div className="flex items-center space-x-2">
//                       <span className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-700'}`}>
//                         {totalStock}
//                       </span>
//                       {isLowStock && (
//                         <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Low</span>
//                       )}
//                     </div>
//                   </td>

//                   <td className="px-6 py-4">
//                     <select
//                       value={product.status}
//                       onChange={(e) => onChangeStatus(product._id, e.target.value)}
//                       disabled={actionLoading}
//                       className={`text-xs px-3 py-1.5 rounded-xl font-medium border-0 focus:ring-2 cursor-pointer transition-all ${
//                         actionLoading ? 'opacity-50 cursor-not-allowed' : ''
//                       } ${
//                         product.status === 'active' ? 'bg-green-100 text-green-700' :
//                         product.status === 'draft'  ? 'bg-yellow-100 text-yellow-700' :
//                                                       'bg-gray-100 text-gray-700'
//                       }`}
//                     >
//                       <option value="draft">Draft</option>
//                       <option value="active">Active</option>
//                     </select>
//                   </td>

//                   <td className="px-6 py-4">
//                     <button
//                       onClick={() => onToggleFeatured(product._id)}
//                       disabled={actionLoading}
//                       className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
//                         actionLoading ? 'opacity-50 cursor-not-allowed' : ''
//                       } ${
//                         product.isFeatured
//                           ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
//                           : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//                       }`}
//                     >
//                       {product.isFeatured ? '⭐ Featured' : 'Regular'}
//                     </button>
//                   </td>

//                   <td className="px-6 py-4">
//                     <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                       <button onClick={() => setDetailProduct(product)}
//                         className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
//                         title="View Details">
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                             d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                         </svg>
//                       </button>
//                       <button onClick={() => onEdit(product)}
//                         className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                             d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                         </svg>
//                       </button>
//                       <button onClick={() => onDelete(product._id)}
//                         className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Archive">
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                             d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
//                         </svg>
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>

//         {filteredProducts.length === 0 && (
//           <div className="text-center py-16">
//             <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                 d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
//             </svg>
//             <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
//             <p className="text-gray-500">
//               {showLowStockOnly 
//                 ? "No low stock products at the moment" 
//                 : "Click \"Add Product\" to create your first product"}
//             </p>
//           </div>
//         )}
//       </div>

//       {detailProduct && (
//         <ProductDetailModal
//           product={detailProduct}
//           categories={categories}
//           onClose={() => setDetailProduct(null)}
//           formatIndianRupee={formatIndianRupee}
//           getDiscountPercentage={getDiscountPercentage}
//         />
//       )}
//       {showCategoryModal && (
//       <CategoryModal
//         onSelect={handleCategorySelect}  // Called when category is created/selected
//         onClose={() => setShowCategoryModal(false)}  // Close modal
//       />
//     )}

//     </div>
//   );
// };

// export default ProductsTab;
// start again 

// // ADMIN_TABS/ProductsTab.jsx

// import React, { useState } from 'react';
// import { useSelector } from 'react-redux';
// import ProductDetailModal from '../Shared_components/ProductDetailModal';

// const ProductsTab = ({
//   products,
//   categories,
//   brands,
//   onAddClick,
//   onEdit,
//   onDelete,
//   onToggleFeatured,
//   onChangeStatus,
//   formatIndianRupee,
//   getDiscountPercentage,
//   loading
// }) => {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterStatus, setFilterStatus] = useState('all');
//   const [filterCategory, setFilterCategory] = useState('all');
//   const [detailProduct, setDetailProduct] = useState(null);

//   // Disable status/featured controls while an action is in progress
//   const { actionLoading } = useSelector((state) => state.adminProducts);
//   // ─────────────────────────────────────────────────────────────
//   const getCategoryName = (productCategory) => {
//     if (!productCategory) return 'Uncategorized';

//     // Case (a): already a populated object with name
//     if (typeof productCategory === 'object' && productCategory.name) {
//       return productCategory.name;
//     }

//     // Case (b): raw ObjectId string — look up in categories prop
//     const categoryId = typeof productCategory === 'object'
//       ? productCategory._id
//       : productCategory;

//     const found = categories.find(
//       (cat) => cat._id === categoryId || cat._id?.toString() === categoryId?.toString()
//     );

//     return found ? found.name : 'Uncategorized';
//   };

//   // Stats
//   const totalProducts = products.length;
//   const activeProducts = products.filter(p => p.status === 'active').length;
//   const featuredProducts = products.filter(p => p.isFeatured).length;
//   const lowStock = products.filter(p =>
//     p.variants?.some(v => v.inventory?.quantity < v.inventory?.lowStockThreshold)
//   ).length;

//   // Filter — also uses getCategoryId helper for matching
//   const getCategoryId = (productCategory) => {
//     if (!productCategory) return null;
//     if (typeof productCategory === 'object') return productCategory._id;
//     return productCategory; // already a string id
//   };

//   const filteredProducts = products.filter(product => {
//     const matchesSearch =
//       product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));

//     const matchesStatus = filterStatus === 'all' || product.status === filterStatus;

//     const matchesCategory =
//       filterCategory === 'all' ||
//       getCategoryId(product.category) === filterCategory;

//     return matchesSearch && matchesStatus && matchesCategory;
//   });

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
//           <p className="text-gray-500">Loading products...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">

//       {/* ── Stats Cards ── */}
//       <div className="grid grid-cols-4 gap-6">
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Total Products</p>
//               <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
//               </svg>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Active Products</p>
//               <p className="text-3xl font-bold text-gray-900">{activeProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Featured</p>
//               <p className="text-3xl font-bold text-gray-900">{featuredProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
//                 <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
//               </svg>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Low Stock</p>
//               <p className="text-3xl font-bold text-gray-900">{lowStock}</p>
//             </div>
//             <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ── Filters Bar ── */}
//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
//         <div className="flex gap-4">
//           <div className="flex-1 relative">
//             <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//             </svg>
//             <input
//               type="text"
//               placeholder="Search products..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <select
//             value={filterStatus}
//             onChange={(e) => setFilterStatus(e.target.value)}
//             className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="all">All Status</option>
//             <option value="draft">Draft</option>
//             <option value="active">Active</option>
//           </select>
//           <select
//             value={filterCategory}
//             onChange={(e) => setFilterCategory(e.target.value)}
//             className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="all">All Categories</option>
//             {categories.map(cat => (
//               <option key={cat._id} value={cat._id}>{cat.name}</option>
//             ))}
//           </select>
//           <button
//             onClick={onAddClick}
//             className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center space-x-2"
//           >
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//             </svg>
//             <span>Add Product</span>
//           </button>
//         </div>
//       </div>

//       {/* ── Products Table ── */}
//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
//         <table className="w-full">
//           <thead>
//             <tr className="bg-gray-50 border-b border-gray-200">
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-200">
//             {filteredProducts.map((product) => {
//               const mainVariant = product.variants?.[0] || {};
//               const basePrice = mainVariant.price?.base || 0;
//               const salePrice = mainVariant.price?.sale;
//               const discountPercentage = salePrice ? getDiscountPercentage(basePrice, salePrice) : 0;
//               const totalStock = product.variants?.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0) || 0;
//               const isLowStock = product.variants?.some(v =>
//                 v.inventory?.quantity < v.inventory?.lowStockThreshold
//               );

//               return (
//                 <tr key={product._id} className="hover:bg-gray-50 transition-colors group">

//                   {/* Product Name + Title */}
//                   <td className="px-6 py-4">
//                     <div>
//                       <div className="font-medium text-gray-900">{product.name}</div>
//                       <div className="text-sm text-gray-500 truncate max-w-xs">{product.title}</div>
//                     </div>
//                   </td>

//                   {/* Category — uses getCategoryName() to handle both
//                       populated objects AND raw ObjectId strings from backend */}
//                   <td className="px-6 py-4">
//                     <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
//                       {getCategoryName(product.category)}
//                     </span>
//                   </td>

//                   {/* Brand */}
//                   <td className="px-6 py-4 text-sm">
//                     {!product.brand || product.brand === 'Generic' ? (
//                       <span className="text-gray-400">—</span>
//                     ) : (
//                       <span className="font-medium text-gray-700">{product.brand}</span>
//                     )}
//                   </td>

//                   {/* Price */}
//                   <td className="px-6 py-4">
//                     <div className="text-sm">
//                       {salePrice ? (
//                         <>
//                           <span className="text-gray-400 line-through text-xs mr-2">
//                             {formatIndianRupee(basePrice)}
//                           </span>
//                           <span className="font-bold text-gray-900">
//                             {formatIndianRupee(salePrice)}
//                           </span>
//                           {discountPercentage > 0 && (
//                             <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                               {discountPercentage}% OFF
//                             </span>
//                           )}
//                         </>
//                       ) : (
//                         <span className="font-bold text-gray-900">{formatIndianRupee(basePrice)}</span>
//                       )}
//                     </div>
//                   </td>

//                   {/* Inventory */}
//                   <td className="px-6 py-4">
//                     <div className="flex items-center space-x-2">
//                       <span className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-700'}`}>
//                         {totalStock}
//                       </span>
//                       {isLowStock && (
//                         <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Low</span>
//                       )}
//                     </div>
//                   </td>

//                   {/* Status — disabled while actionLoading */}
//                   <td className="px-6 py-4">
//                     <select
//                       value={product.status}
//                       onChange={(e) => onChangeStatus(product._id, e.target.value)}
//                       disabled={actionLoading}
//                       className={`text-xs px-3 py-1.5 rounded-xl font-medium border-0 focus:ring-2 transition-opacity ${
//                         actionLoading ? 'opacity-50 cursor-not-allowed' : ''
//                       } ${
//                         product.status === 'active' ? 'bg-green-100 text-green-700' :
//                         product.status === 'draft'  ? 'bg-yellow-100 text-yellow-700' :
//                                                       'bg-gray-100 text-gray-700'
//                       }`}
//                     >
//                       <option value="draft">Draft</option>
//                       <option value="active">Active</option>
//                     </select>
//                   </td>

//                   {/* Featured — disabled while actionLoading */}
//                   <td className="px-6 py-4">
//                     <button
//                       onClick={() => onToggleFeatured(product._id)}
//                       disabled={actionLoading}
//                       className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
//                         actionLoading ? 'opacity-50 cursor-not-allowed' : ''
//                       } ${
//                         product.isFeatured
//                           ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
//                           : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//                       }`}
//                     >
//                       {product.isFeatured ? '⭐ Featured' : 'Regular'}
//                     </button>
//                   </td>

//                   {/* Actions: View, Edit, Archive */}
//                   <td className="px-6 py-4">
//                     <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">

//                       {/* 👁 View Detail */}
//                       <button
//                         onClick={() => setDetailProduct(product)}
//                         className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
//                         title="View Details"
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                         </svg>
//                       </button>

//                       {/* ✏️ Edit */}
//                       <button
//                         onClick={() => onEdit(product)}
//                         className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
//                         title="Edit"
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                         </svg>
//                       </button>

//                       {/* 🗄 Archive */}
//                       <button
//                         onClick={() => onDelete(product._id)}
//                         className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                         title="Archive"
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
//                         </svg>
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>

//         {filteredProducts.length === 0 && (
//           <div className="text-center py-16">
//             <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
//             </svg>
//             <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
//             <p className="text-gray-500">Click "Add Product" to create your first product</p>
//           </div>
//         )}
//       </div>

//       {/* ── Product Detail Modal ── */}
//       {detailProduct && (
//         <ProductDetailModal
//           product={detailProduct}
//           categories={categories}
//           onClose={() => setDetailProduct(null)}
//           formatIndianRupee={formatIndianRupee}
//           getDiscountPercentage={getDiscountPercentage}
//         />
//       )}
//     </div>
//   );
// };

// export default ProductsTab;
// category issue fixed

// // ADMIN_TABS/ProductsTab.jsx

// import React, { useState } from 'react';
// import { useSelector } from 'react-redux';
// import ProductDetailModal from '../Shared_components/ProductDetailModal';

// const ProductsTab = ({
//   products,
//   categories,
//   brands,
//   onAddClick,
//   onEdit,
//   onDelete,
//   onToggleFeatured,
//   onChangeStatus,
//   formatIndianRupee,
//   getDiscountPercentage,
//   loading
// }) => {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterStatus, setFilterStatus] = useState('all');
//   const [filterCategory, setFilterCategory] = useState('all');
//   const [detailProduct, setDetailProduct] = useState(null);

//   // Disable status/featured controls while an action is in progress
//   const { actionLoading } = useSelector((state) => state.adminProducts);

//   // Stats
//   const totalProducts = products.length;
//   const activeProducts = products.filter(p => p.status === 'active').length;
//   const featuredProducts = products.filter(p => p.isFeatured).length;
//   const lowStock = products.filter(p =>
//     p.variants?.some(v => v.inventory?.quantity < v.inventory?.lowStockThreshold)
//   ).length;

//   // Filter
//   const filteredProducts = products.filter(product => {
//     const matchesSearch =
//       product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
//     const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
//     const matchesCategory =
//       filterCategory === 'all' ||
//       product.category?._id === filterCategory ||
//       product.category === filterCategory;
//     return matchesSearch && matchesStatus && matchesCategory;
//   });

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
//           <p className="text-gray-500">Loading products...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">

//       {/* ── Stats Cards ── */}
//       <div className="grid grid-cols-4 gap-6">
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Total Products</p>
//               <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Active Products</p>
//               <p className="text-3xl font-bold text-gray-900">{activeProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Featured</p>
//               <p className="text-3xl font-bold text-gray-900">{featuredProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
//                 <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Low Stock</p>
//               <p className="text-3xl font-bold text-gray-900">{lowStock}</p>
//             </div>
//             <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ── Filters Bar ── */}
//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
//         <div className="flex gap-4">
//           <div className="flex-1 relative">
//             <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//             </svg>
//             <input
//               type="text"
//               placeholder="Search products..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <select
//             value={filterStatus}
//             onChange={(e) => setFilterStatus(e.target.value)}
//             className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="all">All Status</option>
//             <option value="draft">Draft</option>
//             <option value="active">Active</option>
//           </select>
//           <select
//             value={filterCategory}
//             onChange={(e) => setFilterCategory(e.target.value)}
//             className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="all">All Categories</option>
//             {categories.map(cat => (
//               <option key={cat._id} value={cat._id}>{cat.name}</option>
//             ))}
//           </select>
//           <button
//             onClick={onAddClick}
//             className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center space-x-2"
//           >
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//             </svg>
//             <span>Add Product</span>
//           </button>
//         </div>
//       </div>

//       {/* ── Products Table ── */}
//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
//         <table className="w-full">
//           <thead>
//             <tr className="bg-gray-50 border-b border-gray-200">
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-200">
//             {filteredProducts.map((product) => {
//               const mainVariant = product.variants?.[0] || {};
//               const basePrice = mainVariant.price?.base || 0;
//               const salePrice = mainVariant.price?.sale;
//               const discountPercentage = salePrice ? getDiscountPercentage(basePrice, salePrice) : 0;
//               const totalStock = product.variants?.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0) || 0;
//               const isLowStock = product.variants?.some(v =>
//                 v.inventory?.quantity < v.inventory?.lowStockThreshold
//               );

//               return (
//                 <tr key={product._id} className="hover:bg-gray-50 transition-colors group">

//                   {/* Product Name + Title */}
//                   <td className="px-6 py-4">
//                     <div>
//                       <div className="font-medium text-gray-900">{product.name}</div>
//                       <div className="text-sm text-gray-500 truncate max-w-xs">{product.title}</div>
//                     </div>
//                   </td>

//                   {/* Category */}
//                   <td className="px-6 py-4">
//                     <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
//                       {product.category?.name || 'Uncategorized'}
//                     </span>
//                   </td>

//                   {/* Brand */}
//                   <td className="px-6 py-4 text-sm">
//                     {!product.brand || product.brand === 'Generic' ? (
//                       <span className="text-gray-400">—</span>
//                     ) : (
//                       <span className="font-medium text-gray-700">{product.brand}</span>
//                     )}
//                   </td>

//                   {/* Price */}
//                   <td className="px-6 py-4">
//                     <div className="text-sm">
//                       {salePrice ? (
//                         <>
//                           <span className="text-gray-400 line-through text-xs mr-2">
//                             {formatIndianRupee(basePrice)}
//                           </span>
//                           <span className="font-bold text-gray-900">
//                             {formatIndianRupee(salePrice)}
//                           </span>
//                           {discountPercentage > 0 && (
//                             <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                               {discountPercentage}% OFF
//                             </span>
//                           )}
//                         </>
//                       ) : (
//                         <span className="font-bold text-gray-900">{formatIndianRupee(basePrice)}</span>
//                       )}
//                     </div>
//                   </td>

//                   {/* Inventory */}
//                   <td className="px-6 py-4">
//                     <div className="flex items-center space-x-2">
//                       <span className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-700'}`}>
//                         {totalStock}
//                       </span>
//                       {isLowStock && (
//                         <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Low</span>
//                       )}
//                     </div>
//                   </td>

//                   {/* Status — disabled while actionLoading */}
//                   <td className="px-6 py-4">
//                     <select
//                       value={product.status}
//                       onChange={(e) => onChangeStatus(product._id, e.target.value)}
//                       disabled={actionLoading}
//                       className={`text-xs px-3 py-1.5 rounded-xl font-medium border-0 focus:ring-2 transition-opacity ${
//                         actionLoading ? 'opacity-50 cursor-not-allowed' : ''
//                       } ${
//                         product.status === 'active' ? 'bg-green-100 text-green-700' :
//                         product.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
//                         'bg-gray-100 text-gray-700'
//                       }`}
//                     >
//                       <option value="draft">Draft</option>
//                       <option value="active">Active</option>
//                     </select>
//                   </td>

//                   {/* Featured — disabled while actionLoading */}
//                   <td className="px-6 py-4">
//                     <button
//                       onClick={() => onToggleFeatured(product._id)}
//                       disabled={actionLoading}
//                       className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
//                         actionLoading ? 'opacity-50 cursor-not-allowed' : ''
//                       } ${
//                         product.isFeatured
//                           ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
//                           : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//                       }`}
//                     >
//                       {product.isFeatured ? '⭐ Featured' : 'Regular'}
//                     </button>
//                   </td>

//                   {/* Actions: View, Edit, Archive */}
//                   <td className="px-6 py-4">
//                     <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">

//                       {/* 👁 View Detail */}
//                       <button
//                         onClick={() => setDetailProduct(product)}
//                         className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
//                         title="View Details"
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                         </svg>
//                       </button>

//                       {/* ✏️ Edit */}
//                       <button
//                         onClick={() => onEdit(product)}
//                         className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
//                         title="Edit"
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                         </svg>
//                       </button>

//                       {/* 🗄 Archive */}
//                       <button
//                         onClick={() => onDelete(product._id)}
//                         className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                         title="Archive"
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
//                         </svg>
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>

//         {filteredProducts.length === 0 && (
//           <div className="text-center py-16">
//             <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
//             </svg>
//             <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
//             <p className="text-gray-500">Click "Add Product" to create your first product</p>
//           </div>
//         )}
//       </div>

//       {/* ── Product Detail Modal ── */}
//       {detailProduct && (
//         <ProductDetailModal
//           product={detailProduct}
//           onClose={() => setDetailProduct(null)}
//           formatIndianRupee={formatIndianRupee}
//           getDiscountPercentage={getDiscountPercentage}
//         />
//       )}
//     </div>
//   );
// };

// export default ProductsTab;

// code upside api integration
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';

// const ProductsTab = ({ 
//   products, 
//   categories, 
//   brands, 
//   onAddClick, 
//   onEdit, 
//   onDelete, 
//   onToggleFeatured, 
//   onChangeStatus,
//   formatIndianRupee,
//   getDiscountPercentage,
//   archivedProducts
// }) => {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterStatus, setFilterStatus] = useState('all');
//   const [filterCategory, setFilterCategory] = useState('all');
//   const navigate = useNavigate(); 
//   // Stats for cards
//   const totalProducts = products.length;
//   // const archivedProducts = products.filter(p => p.status === 'archived').length;
//   const activeProducts = products.filter(p => p.status === 'active').length;
//   const featuredProducts = products.filter(p => p.isFeatured).length;
//   const lowStock = products.filter(p => 
//     p.inventory?.quantity < p.inventory?.lowStockThreshold
//   ).length;

//   // Filter products
//   const filteredProducts = products.filter(product => {
//     const matchesSearch = 
//       product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    
//     const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
//     const matchesCategory = filterCategory === 'all' || product.category?._id === filterCategory;
    
//     return matchesSearch && matchesStatus && matchesCategory;
//   });

//   return (
//     <div className="space-y-6">
//       {/* Stats Cards */}
//       <div className="grid grid-cols-5 gap-6">
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Total Products</p>
//               <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
//               </svg>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Active Products</p>
//               <p className="text-3xl font-bold text-gray-900">{activeProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Featured</p>
//               <p className="text-3xl font-bold text-gray-900">{featuredProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
//                 <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
//               </svg>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-500 mb-1">Low Stock</p>
//               <p className="text-3xl font-bold text-gray-900">{lowStock}</p>
//             </div>
//             <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//               </svg>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
//           <div className="flex items-center justify-between">
//             <div onClick={()=>{navigate('/admin/products/archived')}} className="cursor-pointer">
//               <p className="text-sm text-gray-500 mb-1">Archived Products</p>
//               <p className="text-3xl font-bold text-gray-900">{archivedProducts}</p>
//             </div>
//             <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-5-5A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
//               </svg>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Filters Bar */}
//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
//         <div className="flex gap-4">
//           <div className="flex-1 relative">
//             <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//             </svg>
//             <input
//               type="text"
//               placeholder="Search products..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <select
//             value={filterStatus}
//             onChange={(e) => setFilterStatus(e.target.value)}
//             className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="all">All Status</option>
//             <option value="draft">Draft</option>
//             <option value="active">Active</option>
//           </select>
//           <select
//             value={filterCategory}
//             onChange={(e) => setFilterCategory(e.target.value)}
//             className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="all">All Categories</option>
//             {categories.map(cat => (
//               <option key={cat._id} value={cat._id}>{cat.name}</option>
//             ))}
//           </select>
//           <button
//             onClick={onAddClick}
//             className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center space-x-2"
//           >
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//             </svg>
//             <span>Add Product</span>
//           </button>
//         </div>
//       </div>

//       {/* Products Table */}
//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
//         <table className="w-full">
//           <thead>
//             <tr className="bg-gray-50 border-b border-gray-200">
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
//               <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-200">
//             {filteredProducts.map((product) => {
//               const discountPercentage = getDiscountPercentage(product.price.base, product.price.sale);
//               const isLowStock = product.inventory?.quantity < product.inventory?.lowStockThreshold;
              
//               return (
//                 <tr key={product._id} className="hover:bg-gray-50 transition-colors group">
//                   <td className="px-6 py-4">
//                     <div>
//                       <div className="font-medium text-gray-900">{product.name}</div>
//                       <div className="text-sm text-gray-500 truncate max-w-xs">{product.title}</div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
//                       {product.category?.name || 'Uncategorized'}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 text-sm">
//                     {product.brand === 'Generic' ? (
//                       <span className="text-gray-400">—</span>
//                     ) : (
//                       <span className="font-medium text-gray-700">{product.brand}</span>
//                     )}
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="text-sm">
//                       <span className="text-gray-400 line-through text-xs mr-2">
//                         {formatIndianRupee(product.price.base)}
//                       </span>
//                       <span className="font-bold text-gray-900">
//                         {formatIndianRupee(product.price.sale || product.price.base)}
//                       </span>
//                       {discountPercentage > 0 && (
//                         <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                           {discountPercentage}% OFF
//                         </span>
//                       )}
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex items-center space-x-2">
//                       <span className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-700'}`}>
//                         {product.inventory?.quantity || 0}
//                       </span>
//                       {isLowStock && (
//                         <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
//                           Low
//                         </span>
//                       )}
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <select
//                       value={product.status}
//                       onChange={(e) => onChangeStatus(product._id, e.target.value)}
//                       className={`text-xs px-3 py-1.5 rounded-xl font-medium border-0 focus:ring-2 ${
//                         product.status === 'active' ? 'bg-green-100 text-green-700' :
//                         product.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
//                         'bg-gray-100 text-gray-700'
//                       }`}
//                     >
//                       <option value="draft">Draft</option>
//                       <option value="active">Active</option>
//                     </select>
//                   </td>
//                   <td className="px-6 py-4">
//                     <button
//                       onClick={() => onToggleFeatured(product._id)}
//                       className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
//                         product.isFeatured 
//                           ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
//                           : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//                       }`}
//                     >
//                       {product.isFeatured ? 'Featured' : 'Regular'}
//                     </button>
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                       <button
//                         onClick={() => onEdit(product)}
//                         className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
//                         title="Edit"
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                         </svg>
//                       </button>
//                       <button
//                         onClick={() => onDelete(product._id)}
//                         className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                         title="Archive"
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
//                         </svg>
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
        
//         {filteredProducts.length === 0 && (
//           <div className="text-center py-16">
//             <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
//             </svg>
//             <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
//             <p className="text-gray-500">Click "Add Product" to create your first product</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ProductsTab;