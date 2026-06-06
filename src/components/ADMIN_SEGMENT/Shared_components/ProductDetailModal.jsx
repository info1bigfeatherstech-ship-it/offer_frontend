// Shared_components/ProductDetailModal.jsx

import React, { useState } from "react";
import {
  getEffectiveEcommStatus,
  getEffectiveVariantEcommStatus,
  ecommStatusAdminLabel,
} from "../../../utils/adminProductCatalogStatus";

const ProductDetailModal = ({ product, categories, onClose, formatIndianRupee, getDiscountPercentage }) => {
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

  if (!product) return null;

  // const activeVariant = product.variants?.[activeVariantIndex] || {};
  const activeVariant =
    product?.variants && product.variants.length > 0
      ? product.variants[activeVariantIndex] || product.variants[0]
      : null;
  const totalStock = product.variants?.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0) || 0;
  const isLowStock = product.variants?.some(v => v.inventory?.quantity < v.inventory?.lowStockThreshold);

  const effectiveEcommStatus = getEffectiveEcommStatus(product);
  const statusColors = {
    active: "bg-green-100 text-green-700 border-green-200",
    draft: "bg-gray-100 text-gray-600 border-gray-200",
    archived: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const getCategoryName = (productCategory) => {
    if (!productCategory) return 'Uncategorized';

    // Case (a): already a populated object with name
    if (typeof productCategory === 'object' && productCategory.name) {
      return productCategory.name;
    }

    // Case (b): raw ObjectId string — look up in categories prop
    const categoryId = typeof productCategory === 'object'
      ? productCategory._id
      : productCategory;

    const found = categories.find(
      (cat) => cat._id === categoryId || cat._id?.toString() === categoryId?.toString()
    );

    return found ? found.name : 'Uncategorized';
  };
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">

        {/* ── Header ── */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{product.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[effectiveEcommStatus] || statusColors.draft}`}>
                  {ecommStatusAdminLabel(effectiveEcommStatus).toUpperCase()}
                </span>
                {product.isFeatured && (
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                    ⭐ FEATURED
                  </span>
                )}
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {product.slug}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Row 1: Basic Info + Price Summary ── */}
          <div className="grid grid-cols-3 gap-4">
            {/* Basic Info */}
            <div className="col-span-2 bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Information</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <p className="text-xs text-gray-400">Category</p>
                  {/* <p className="text-sm font-medium text-gray-800">{product.category?.name || "Uncategorized"}</p> */}
                  {getCategoryName(product.category)}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Brand</p>
                  <p className="text-sm font-medium text-gray-800">{product.brand || "Generic"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Created</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(product.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Updated</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(product.updatedAt)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Description</p>
                  <p className="text-sm text-gray-700 mt-0.5">{product.description || "—"}</p>
                </div>
              </div>
            </div>

            {/* Price + Stock Summary */}
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Price Range</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {/* {formatIndianRupee(product.priceRange?.min || 0)} */}
                  {activeVariant?.price?.base
                    ? formatIndianRupee(activeVariant.price.base)
                    : "—"}
                  {product.priceRange
                    ? formatIndianRupee(product.priceRange.min)
                    : "—"}
                </p>
              </div>
              <div className={`rounded-xl p-4 ${isLowStock ? "bg-red-50" : "bg-green-50"}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isLowStock ? "text-red-700" : "text-green-700"}`}>
                  Total Stock
                </h3>
                <p className={`text-2xl font-bold ${isLowStock ? "text-red-700" : "text-green-700"}`}>
                  {totalStock}
                  {isLowStock && <span className="text-sm ml-2 font-normal">⚠ Low</span>}
                </p>
              </div>
            </div>
          </div>

          {/* ── Variants ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100">
              <h3 className="text-sm font-semibold text-indigo-800">
                Product Variants ({product.variants?.length || 0})
              </h3>
            </div>

            {/* Variant Tabs */}
            {product.variants?.length > 0 && (
              <div className="border-b border-gray-100 flex overflow-x-auto">
                {product.variants.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveVariantIndex(i)}
                    className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeVariantIndex === i
                      ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    {v.attributes?.map(a => a.value).join(" / ") || `Variant ${i + 1}`}
                    {getEffectiveVariantEcommStatus(v) !== "active" && (
                      <span className="ml-1 text-xs text-gray-400">(inactive)</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Active Variant Details */}
            {activeVariant && (
              <div className="p-4">
                <div className="grid grid-cols-3 gap-4">
                  {/* Attributes */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Attributes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeVariant.attributes?.map((attr, i) => (
                        <span key={i} className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                          {attr.key}: {attr.value}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Pricing</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Base Price:</span>
                        <span className="font-semibold text-gray-900">{formatIndianRupee(activeVariant.price?.base || 0)}</span>
                      </div>
                      {activeVariant?.price?.sale != null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Sale Price:</span>
                          <span className="font-semibold text-green-700">{formatIndianRupee(activeVariant.price.sale)}</span>
                        </div>
                      )}
                      {activeVariant?.price?.sale != null && activeVariant.price.sale < activeVariant.price?.base && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Discount:</span>
                          <span className="font-semibold text-green-600">
                            {getDiscountPercentage(activeVariant.price.base, activeVariant.price.sale)}% OFF
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inventory */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Inventory</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Quantity:</span>
                        <span className={`font-semibold ${activeVariant.inventory?.quantity < activeVariant.inventory?.lowStockThreshold
                          ? "text-red-600" : "text-gray-900"
                          }`}>
                          {activeVariant.inventory?.quantity ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Low Stock At:</span>
                        <span className="font-medium text-gray-700">{activeVariant.inventory?.lowStockThreshold ?? 5}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tracking:</span>
                        <span className={`font-medium ${activeVariant.inventory?.trackInventory ? "text-green-600" : "text-gray-400"}`}>
                          {activeVariant.inventory?.trackInventory ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Status:</span>
                        <span className={`font-medium ${getEffectiveVariantEcommStatus(activeVariant) === "active" ? "text-green-600" : "text-gray-400"}`}>
                          {ecommStatusAdminLabel(getEffectiveVariantEcommStatus(activeVariant))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variant Images */}
                {activeVariant.images?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 mb-2">Images</p>
                    <div className="flex gap-2 flex-wrap">
                      {activeVariant.images.map((img, i) => (
                        <div key={i} className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${img.isMain ? "border-indigo-500" : "border-gray-200"}`}>
                          <img src={img.url} alt={img.altText || ""} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variant SKU */}
                {activeVariant.sku && (
                  <div className="mt-3">
                    <span className="text-xs text-gray-400">SKU: </span>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{activeVariant.sku}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Attributes ── */}
          {product.attributes?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Product Attributes</h3>
              <div className="grid grid-cols-3 gap-2">
                {product.attributes.map((attr, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-2.5">
                    <p className="text-xs text-gray-400">{attr.key}</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{attr.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Shipping + Marketing row ── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Shipping */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Shipping</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Weight:</span>
                  <span className="font-medium text-gray-800">{product.shipping?.weight ?? "—"} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Length:</span>
                  <span className="font-medium text-gray-800">{product.shipping?.dimensions?.length ?? "—"} cm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Width:</span>
                  <span className="font-medium text-gray-800">{product.shipping?.dimensions?.width ?? "—"} cm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Height:</span>
                  <span className="font-medium text-gray-800">{product.shipping?.dimensions?.height ?? "—"} cm</span>
                </div>
              </div>
            </div>

            {/* Marketing */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Marketing</h3>
              <div className="space-y-2">
                {/* Sold Info */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Sold Info</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${product.soldInfo?.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {product.soldInfo?.enabled ? `${product.soldInfo.count} sold` : "Disabled"}
                  </span>
                </div>
                {/* FOMO */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">FOMO</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${product.fomo?.enabled ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                    {product.fomo?.enabled ? product.fomo.type?.replace("_", " ") : "Disabled"}
                  </span>
                </div>
                {product.fomo?.enabled && product.fomo.type === "viewing_now" && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Viewing Now</span>
                    <span className="text-sm font-medium text-purple-700">{product.fomo.viewingNow}</span>
                  </div>
                )}
                {product.fomo?.enabled && product.fomo.type === "product_left" && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Left in Stock</span>
                    <span className="text-sm font-medium text-purple-700">{product.fomo.productLeft}</span>
                  </div>
                )}
                {product.fomo?.enabled && product.fomo.type === "custom" && product.fomo.customMessage && (
                  <div>
                    <span className="text-sm text-gray-500">Message:</span>
                    <p className="text-sm text-purple-700 mt-0.5">"{product.fomo.customMessage}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="p-5 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;