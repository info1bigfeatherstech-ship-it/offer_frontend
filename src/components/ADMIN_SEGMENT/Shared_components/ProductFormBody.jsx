// Shared_components/ProductFormBody.jsx

import React, { useState } from "react";

const TAX_RATE_OPTIONS = [
  { value: 0, label: "0% (Nil Rated)" },
  { value: 5, label: "5% (GST)" },
  { value: 12, label: "12% (GST)" },
  { value: 18, label: "18% (GST)" },
  { value: 28, label: "28% (GST)" },
];

const ProductFormBody = ({
  formData,
  setFormData,
  categories,
  brands,
  onOpenCategoryModal,
  onOpenBrandModal,
  onOpenAttributeModal,
  onOpenCustomMessage,
  onOpenAddVariant,
  onOpenEditVariant,
  onDeleteVariant,
  onToggleVariantActive,
  onRemoveAttribute,
  formatIndianRupee,
  getDiscountPercentage,
  productSlug,
  actionLoading = false,
  actionError = null,
}) => {
  const isEditMode = !!productSlug;
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [isDraggingZone, setIsDraggingZone] = useState(false);

  const galleryImages = isEditMode ? (formData.variants?.[0]?.images || []) : (formData.images || []);

  const setGalleryImages = (updater) => {
    if (isEditMode) {
      setFormData((p) => {
        const v = [...(p.variants || [])];
        if (!v[0]) return p;
        const next = typeof updater === "function" ? updater(v[0].images || []) : updater;
        v[0] = { ...v[0], images: next };
        return { ...p, variants: v };
      });
    } else {
      setFormData((p) => {
        const next = typeof updater === "function" ? updater(p.images || []) : updater;
        return { ...p, images: next };
      });
    }
  };

  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files);
    const current = [...galleryImages];
    files.forEach((file, i) => {
      if (current.length >= 5) return;
      const id = `gimg-${Date.now()}-${i}`;
      const reader = new FileReader();
      reader.onloadend = () => {
        current.push({ id, url: reader.result, file, name: file.name, isMain: current.length === 0 });
        setGalleryImages([...current]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeGalleryImage = (id) =>
    setGalleryImages((imgs) => {
      const wasMain = imgs.find((img) => img.id === id || img.url === id)?.isMain;
      const next = imgs.filter((img) => img.id !== id && img.url !== id);
      if (wasMain && next.length > 0) next[0] = { ...next[0], isMain: true };
      return next;
    });

  const setMainGalleryImage = (id) =>
    setGalleryImages((imgs) => imgs.map((img) => ({ ...img, isMain: img.id === id || img.url === id })));

  const handleGalleryDragStart = (e, index) => setDraggedIdx(index);
  const handleGalleryDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    const imgs = [...galleryImages];
    const [moved] = imgs.splice(draggedIdx, 1);
    imgs.splice(index, 0, moved);
    imgs.forEach((img, i) => { img.isMain = i === 0; });
    setGalleryImages(imgs);
    setDraggedIdx(index);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("shipping.dimensions.")) {
      const dim = name.split(".")[2];
      setFormData((p) => ({ ...p, shipping: { ...p.shipping, dimensions: { ...p.shipping.dimensions, [dim]: value } } }));
    } else if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((p) => ({ ...p, [parent]: { ...p[parent], [child]: type === "checkbox" ? checked : value } }));
    } else {
      setFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    }
  };

  const updateMainVariantField = (field, value) => {
    setFormData((p) => {
      const v = [...(p.variants || [])];
      if (!v[0]) return p;
      v[0] = { ...v[0], [field]: value };
      return { ...p, variants: v };
    });
  };

  const updateMainVariantPrice = (field, value) => {
    setFormData((p) => {
      const v = [...(p.variants || [])];
      if (!v[0]) return p;
      v[0] = { ...v[0], price: { ...v[0].price, [field]: value } };
      return { ...p, variants: v };
    });
  };

  const updateMainVariantInventory = (field, value) => {
    setFormData((p) => {
      const v = [...(p.variants || [])];
      if (!v[0]) return p;
      v[0] = { ...v[0], inventory: { ...v[0].inventory, [field]: value } };
      return { ...p, variants: v };
    });
  };

  // NEW: Update main variant channel visibility (ecomm)
  const updateMainVariantChannelVisibility = (field, value) => {
    setFormData((p) => {
      const v = [...(p.variants || [])];
      if (!v[0]) return p;
      const currentVisibility = v[0].channelVisibility || { ecomm: "active", wholesale: "draft" };
      v[0] = {
        ...v[0],
        channelVisibility: { ...currentVisibility, [field]: value }
      };
      return { ...p, variants: v };
    });
  };

  const primaryVariant = isEditMode ? (formData.variants?.[0] ?? null) : null;
  const extraVariants = isEditMode ? (formData.variants?.slice(1) ?? []) : (formData.variants ?? []);
  const extraOffset = isEditMode ? 1 : 0;

  const primaryBase = formData.price?.base ?? "";
  const primarySale = formData.price?.sale ?? "";
  const primaryTrack = formData.inventory?.trackInventory ?? true;
  const primaryQty = formData.inventory?.quantity ?? 0;
  const primaryLow = formData.inventory?.lowStockThreshold ?? 5;

  const mainGalleryImage = galleryImages.find((img) => img.isMain) || galleryImages[0] || null;

  // Helper to determine if variant is wholesale eligible (for read-only badge)
  const isWholesaleEligible = (variant) => {
    return variant?.wholesale === true && (variant?.price?.wholesaleBase > 0);
  };

  const isWholesaleMoqUnmet = (variant) => {
    if (!variant?.wholesale) return false;
    const quantity = Number(variant?.inventory?.quantity ?? 0);
    const moq = Number(variant?.minimumOrderQuantity ?? 1);
    return moq > quantity;
  };

  // Get wholesale visibility badge text
  const getWholesaleVisibilityBadge = (variant) => {
    const isEligible = isWholesaleEligible(variant);
    if (!isEligible) return { text: "Ineligible", color: "bg-gray-100 text-gray-500" };
    const isActive = variant?.channelVisibility?.wholesale === "active";
    return isActive
      ? { text: "Active", color: "bg-purple-100 text-purple-700" }
      : { text: "Draft", color: "bg-gray-100 text-gray-500" };
  };

  // Get ecomm visibility badge text (for read-only display)
  const getEcommVisibilityBadge = (variant) => {
    const isActive = variant?.channelVisibility?.ecomm === "active";
    return isActive
      ? { text: "Active", color: "bg-green-100 text-green-700" }
      : { text: "Draft", color: "bg-gray-100 text-gray-500" };
  };


  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        {/* Essential Details - unchanged */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Essential Details</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name <span className="text-red-400">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500" placeholder="e.g., Premium Wireless Headphones" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title <span className="text-red-400">*</span></label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500" placeholder="e.g., Noise Cancelling Headphones" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description <span className="text-red-400">*</span></label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Describe your product..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="flex gap-2">
                  <select name="category" value={formData.category} onChange={handleInputChange} className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Select category</option>
                    {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                  </select>
                  <button type="button" onClick={onOpenCategoryModal} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                <div className="flex gap-2">
                  <select name="brand" value={formData.brand} onChange={handleInputChange} className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                    {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <button type="button" onClick={onOpenBrandModal} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Marketing & Visibility Panel - UPDATED with read-only channel status badges */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Marketing & Visibility</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Read-only Ecom Status Badge */}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Featured Product</span>
              <button type="button" onClick={() => setFormData((p) => ({ ...p, isFeatured: !p.isFeatured }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isFeatured ? "bg-yellow-500" : "bg-gray-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isFeatured ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Sold Info</span>
                <button type="button" onClick={() => setFormData((p) => ({ ...p, soldInfo: { ...p.soldInfo, enabled: !p.soldInfo.enabled } }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.soldInfo?.enabled ? "bg-blue-500" : "bg-gray-300"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.soldInfo?.enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              {formData.soldInfo?.enabled && (
                <input type="number" value={formData.soldInfo?.count ?? 0} onChange={(e) => setFormData((p) => ({ ...p, soldInfo: { ...p.soldInfo, count: parseInt(e.target.value) || 0 } }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Number sold" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">FOMO</span>
                <button type="button" onClick={() => setFormData((p) => ({ ...p, fomo: { ...p.fomo, enabled: !p.fomo.enabled } }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.fomo?.enabled ? "bg-purple-500" : "bg-gray-300"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.fomo?.enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              {formData.fomo?.enabled && (
                <div className="space-y-2">
                  <select value={formData.fomo.type} onChange={(e) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, type: e.target.value } }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <option value="viewing_now">Viewing Now</option>
                    <option value="product_left">Product Left</option>
                    <option value="custom">Custom</option>
                  </select>
                  {formData.fomo.type === "viewing_now" && (
                    <input type="number" value={formData.fomo.viewingNow ?? 0} onChange={(e) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, viewingNow: parseInt(e.target.value) || 0 } }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Viewing now count" />
                  )}
                  {formData.fomo.type === "product_left" && (
                    <input type="number" value={formData.fomo.productLeft ?? 0} onChange={(e) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, productLeft: parseInt(e.target.value) || 0 } }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Items left" />
                  )}
                  {formData.fomo.type === "custom" && (
                    <div className="flex gap-2">
                      <input type="text" value={formData.fomo.customMessage ?? ""} readOnly className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Custom message" />
                      <button type="button" onClick={() => onOpenCustomMessage(formData.fomo.customMessage || "")} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Variant Card - UPDATED with channel visibility toggles */}

{isEditMode && primaryVariant && (
  <div className="bg-white rounded-xl border-2 border-indigo-300 overflow-hidden">
    <div className="p-4 border-b border-indigo-200 bg-indigo-50">
      <h3 className="font-semibold text-gray-900">Main Variant</h3>
      <p className="text-xs text-indigo-500 mt-0.5 font-mono">📦 ProductCode: {primaryVariant.productCode}</p>
    </div>

    <div className="p-4 space-y-4">
      {/* Ecom Visibility Toggle */}
      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
        <div>
          <label className="text-sm font-semibold text-gray-700">Ecom Visibility</label>
          <p className="text-xs text-gray-500">Show on ecommerce storefront</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const newValue = primaryVariant.channelVisibility?.ecomm === "active" ? "draft" : "active";
            updateMainVariantChannelVisibility("ecomm", newValue);
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${primaryVariant.channelVisibility?.ecomm === "active" ? "bg-green-500" : "bg-gray-300"}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${primaryVariant.channelVisibility?.ecomm === "active" ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      {/* Wholesale Visibility Badge (read-only, calculated from price.wholesaleBase) */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${(primaryVariant.wholesale && primaryVariant.price?.wholesaleBase > 0) ? "bg-purple-50 border-purple-200" : "bg-gray-50 border-gray-200"}`}>
        <div>
          <label className="text-sm font-semibold text-gray-700">Wholesale Visibility</label>
          <p className="text-xs text-gray-500">Auto-calculated from wholesale price</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${(primaryVariant.wholesale && primaryVariant.price?.wholesaleBase > 0) ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
          {(primaryVariant.wholesale && primaryVariant.price?.wholesaleBase > 0) ? "Active" : "Ineligible"}
        </span>
      </div>

      {/* Price inputs */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹)</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Base Price</label>
            <input type="number" value={primaryVariant.price?.base ?? ""} onChange={(e) => updateMainVariantPrice("base", e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Sale Price</label>
            <input type="number" value={primaryVariant.price?.sale ?? ""} onChange={(e) => updateMainVariantPrice("sale", e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Wholesale Toggle */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-700">Wholesale Pricing</label>
          <button type="button" onClick={() => updateMainVariantField("wholesale", !primaryVariant.wholesale)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${primaryVariant.wholesale ? "bg-purple-500" : "bg-gray-300"}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${primaryVariant.wholesale ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        {primaryVariant.wholesale && (
          <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Wholesale Base Price (₹)</label>
                <input type="number" value={primaryVariant.price?.wholesaleBase ?? ""} onChange={(e) => updateMainVariantPrice("wholesaleBase", e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Wholesale Sale Price (₹)</label>
                <input type="number" value={primaryVariant.price?.wholesaleSale ?? ""} onChange={(e) => updateMainVariantPrice("wholesaleSale", e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Order Quantity (MOQ)</label>
              <input type="number" min="1" value={primaryVariant.minimumOrderQuantity ?? 1} onChange={(e) => updateMainVariantField("minimumOrderQuantity", parseInt(e.target.value) || 1)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg" />
            </div>
            {isWholesaleMoqUnmet(primaryVariant) && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                Wholesale warning: MOQ ({primaryVariant.minimumOrderQuantity ?? 1}) is greater than stock ({primaryVariant.inventory?.quantity ?? 0})
              </p>
            )}
          </div>
        )}
      </div>

      {/* Inventory */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Inventory</label>
          <button type="button" onClick={() => updateMainVariantInventory("trackInventory", !primaryVariant.inventory?.trackInventory)} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${primaryVariant.inventory?.trackInventory !== false ? "bg-indigo-500" : "bg-gray-300"}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${primaryVariant.inventory?.trackInventory !== false ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        {primaryVariant.inventory?.trackInventory !== false && (
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={primaryVariant.inventory?.quantity ?? 0} onChange={(e) => updateMainVariantInventory("quantity", parseInt(e.target.value) || 0)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Quantity" />
            <input type="number" value={primaryVariant.inventory?.lowStockThreshold ?? 5} onChange={(e) => updateMainVariantInventory("lowStockThreshold", parseInt(e.target.value) || 5)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Low stock alert" />
          </div>
        )}
      </div>
    </div>
              <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg p-2">
                💡 Images for main variant are managed in the <strong>Product Gallery</strong> panel →. All changes here are saved when you click <strong>Save Changes</strong>.
              </p>
  </div>
)}

        {/* CREATE MODE: ProductCode + price + inventory */}
        {!isEditMode && (
          <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Product Details</h3>
              <p className="text-xs text-gray-500 mt-0.5">These become variants[0] on submit</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Code <span className="text-red-400">*</span></label>
                <input type="text" value={formData.ProductCode || ""} onChange={(e) => setFormData((p) => ({ ...p, ProductCode: e.target.value }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono" placeholder="e.g., 1234567890128" maxLength={20} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Price (₹) <span className="text-red-400">*</span></label>
                  <input type="number" value={primaryBase} onChange={(e) => setFormData((p) => ({ ...p, price: { ...p.price, base: e.target.value } }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500" placeholder="29999" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (₹)</label>
                  <input type="number" value={primarySale} onChange={(e) => setFormData((p) => ({ ...p, price: { ...p.price, sale: e.target.value } }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500" placeholder="19999" />
                </div>
              </div>
              {primaryBase && primarySale && (
                <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                  <span className="text-gray-400 line-through text-sm">{formatIndianRupee(primaryBase)}</span>
                  <span className="text-lg font-bold text-gray-900">{formatIndianRupee(primarySale)}</span>
                  {Number(primarySale) < Number(primaryBase) && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">{getDiscountPercentage(primaryBase, primarySale)}% OFF</span>
                  )}
                </div>
              )}

              {/* Wholesale Toggle for CREATE mode */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Wholesale Pricing</label>
                    <p className="text-xs text-gray-500 mt-0.5">Enable bulk pricing for wholesalers</p>
                  </div>
                  <button type="button" onClick={() => setFormData((p) => ({ ...p, wholesale: !p.wholesale }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.wholesale ? "bg-purple-500" : "bg-gray-300"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.wholesale ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {formData.wholesale && (
                  <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Wholesale Base Price (₹) <span className="text-red-400">*</span></label>
                        <input type="number" value={formData.wholesaleBase || ""} onChange={(e) => setFormData((p) => ({ ...p, wholesaleBase: e.target.value }))} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400" placeholder="e.g., 25000" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Wholesale Sale Price (₹)</label>
                        <input type="number" value={formData.wholesaleSale || ""} onChange={(e) => setFormData((p) => ({ ...p, wholesaleSale: e.target.value }))} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400" placeholder="e.g., 23000" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Order Quantity (MOQ) <span className="text-red-400">*</span></label>
                      <input type="number" min="1" value={formData.minimumOrderQuantity || 1} onChange={(e) => setFormData((p) => ({ ...p, minimumOrderQuantity: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400" placeholder="Minimum quantity for wholesale price" />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Track Inventory</span>
                  <button type="button" onClick={() => setFormData((p) => ({ ...p, inventory: { ...p.inventory, trackInventory: !p.inventory.trackInventory } }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${primaryTrack ? "bg-blue-500" : "bg-gray-300"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${primaryTrack ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {primaryTrack && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                      <input type="number" value={primaryQty} onChange={(e) => setFormData((p) => ({ ...p, inventory: { ...p.inventory, quantity: parseInt(e.target.value) || 0 } }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Low Stock Alert</label>
                      <input type="number" value={primaryLow} onChange={(e) => setFormData((p) => ({ ...p, inventory: { ...p.inventory, lowStockThreshold: parseInt(e.target.value) || 5 } }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="5" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Shipping - unchanged */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Shipping Details</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HSN Code <span className="text-red-400">*</span></label>
              <input type="text" value={formData.hsnCode || ""} onChange={(e) => setFormData((p) => ({ ...p, hsnCode: e.target.value }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500" placeholder="e.g., 180987" maxLength={10} />
              <p className="text-xs text-gray-500 mt-1">Harmonized System Nomenclature code for tax purposes</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate <span className="text-red-400">*</span></label>
              <select value={formData.taxRate ?? ""} onChange={(e) => setFormData((p) => ({ ...p, taxRate: e.target.value === "" ? "" : parseFloat(e.target.value) }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500">
                <option value="">Select Tax Rate</option>
                {TAX_RATE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Is Fragile? <span className="text-red-400">*</span></label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="isFragile" value="true" checked={formData.isFragile === true} onChange={() => setFormData((p) => ({ ...p, isFragile: true }))} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Yes (Fragile)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="isFragile" value="false" checked={formData.isFragile === false} onChange={() => setFormData((p) => ({ ...p, isFragile: false }))} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">No</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">Indicates if special handling is required during shipping</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
              <input type="number" step="0.1" value={formData.shipping?.weight ?? ""} onChange={(e) => setFormData((p) => ({ ...p, shipping: { ...p.shipping, weight: parseFloat(e.target.value) || 0 } }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500" placeholder="0.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions (cm)</label>
              <div className="grid grid-cols-3 gap-2">
                {["length", "width", "height"].map((dim) => (
                  <input key={dim} type="number" value={formData.shipping?.dimensions?.[dim] ?? ""} onChange={(e) => setFormData((p) => ({ ...p, shipping: { ...p.shipping, dimensions: { ...p.shipping.dimensions, [dim]: parseFloat(e.target.value) || 0 } } }))} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder={dim[0].toUpperCase() + dim.slice(1)} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Product Attributes - unchanged */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Product Attributes</h3>
            <button type="button" onClick={onOpenAttributeModal} className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 whitespace-nowrap">+ Add</button>
          </div>
          <div className="p-4">
            {!formData.attributes?.length ? (
              <p className="text-center text-gray-400 py-4 text-sm">No attributes added yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {formData.attributes.map((attr) => (
                  <div key={attr.id} className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg group hover:bg-gray-100 transition-colors">
                    <span className="text-sm whitespace-nowrap"><span className="font-medium text-gray-700">{attr.key}:</span> <span className="text-gray-600">{attr.value}</span></span>
                    <button type="button" onClick={() => onRemoveAttribute(attr.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Additional Variants - UPDATED with channel visibility badges */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900">{isEditMode ? "Additional Variants" : "Product Variants"}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{isEditMode ? "variants[1+] · each has its own ProductCode, price, images" : "e.g., different colors or sizes — each needs a unique ProductCode"}</p>
            </div>
            <button type="button" onClick={onOpenAddVariant} disabled={actionLoading && isEditMode} className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 flex items-center gap-1.5 disabled:opacity-60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Variant
            </button>
          </div>
          <div className="p-4">
            {actionError && isEditMode && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700 text-sm">❌ {actionError}</p></div>
            )}
            {extraVariants.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                <p className="text-gray-400 text-sm">{isEditMode ? "No additional variants — main variant is the card above" : "No variants yet"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {extraVariants.map((variant, idx) => {
                  const realIndex = extraOffset + idx;
                  const variantThumb = variant.images?.find((img) => img.isMain)?.url || variant.images?.[0]?.url || null;
                  const ecommBadge = getEcommVisibilityBadge(variant);
                  const wholesaleBadge = getWholesaleVisibilityBadge(variant);
                  const isEligibleForWholesale = isWholesaleEligible(variant);

                  return (
                    <div key={variant._id || variant.productCode || `v-${realIndex}`} className={`rounded-lg border-2 p-3 transition-all ${ecommBadge.text === "Active" ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-gray-50 opacity-60"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {variantThumb ? (
                            <img src={variantThumb} alt="" className="w-10 h-10 rounded-lg object-cover border border-indigo-200 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {variant.attributes?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-1.5">
                                {variant.attributes.map((attr, aIdx) => (
                                  <span key={aIdx} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{attr.key}: {attr.value}</span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm">
                              <span className="font-semibold text-gray-900">{formatIndianRupee(variant.price?.sale || variant.price?.base)}</span>
                              {variant.price?.sale != null && Number(variant.price.sale) > 0 && Number(variant.price.sale) < Number(variant.price.base) && (
                                <>
                                  <span className="text-gray-400 line-through text-xs">{formatIndianRupee(variant.price.base)}</span>
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">{getDiscountPercentage(variant.price.base, variant.price.sale)}% OFF</span>
                                </>
                              )}
                              <span className="text-gray-400 text-xs">·</span>
                              <span className="text-gray-600 text-xs">Qty: {variant.inventory?.quantity ?? 0}</span>
                              {variant.productCode != null && (
                                <>
                                  <span className="text-gray-400 text-xs">·</span>
                                  <span className="text-xs font-mono text-gray-700 bg-white border border-gray-300 px-1.5 py-0.5 rounded">📦 {variant.productCode}</span>
                                </>
                              )}
                              {/* Ecom visibility badge */}
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ecommBadge.color}`}>Ecom: {ecommBadge.text}</span>
                              {/* Wholesale visibility badge - conditional on eligibility */}
                              {isEligibleForWholesale && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${wholesaleBadge.color}`}>Wholesale: {wholesaleBadge.text}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button type="button" onClick={() => onToggleVariantActive(realIndex)} disabled={actionLoading && isEditMode} title={ecommBadge.text === "Active" ? "Click to deactivate (ecom)" : "Click to activate (ecom)"} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${ecommBadge.text === "Active" ? "bg-indigo-500" : "bg-gray-300"}`}>
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${ecommBadge.text === "Active" ? "translate-x-5" : "translate-x-1"}`} />
                          </button>
                          <button type="button" onClick={() => onOpenEditVariant(realIndex)} disabled={actionLoading && isEditMode} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button type="button" onClick={() => onDeleteVariant(realIndex)} disabled={actionLoading && isEditMode} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Product Gallery unchanged */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Product Gallery</h3>
            <p className="text-xs text-gray-500 mt-1">{isEditMode ? "Main variant images · ★ = thumbnail · saved with Save Changes" : "Up to 5 · drag to reorder · ★ = thumbnail"}</p>
          </div>
          {mainGalleryImage && (
            <div className="px-4 pt-4">
              <div className="relative rounded-lg overflow-hidden border-2 border-blue-400">
                <img src={mainGalleryImage.url} alt="Main" className="w-full h-40 object-contain bg-gray-50" />
                <div className="absolute top-2 left-2"><span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">★ MAIN</span></div>
              </div>
            </div>
          )}
          <div className="p-4">
            <label className={`block w-full border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${isDraggingZone ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"} ${galleryImages.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}`} onDragOver={(e) => { e.preventDefault(); setIsDraggingZone(true); }} onDragLeave={() => setIsDraggingZone(false)} onDrop={(e) => { e.preventDefault(); setIsDraggingZone(false); handleGalleryUpload({ target: { files: e.dataTransfer.files } }); }}>
              <input type="file" multiple accept="image/*" className="hidden" disabled={galleryImages.length >= 5} onChange={handleGalleryUpload} />
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="text-sm text-gray-600">{galleryImages.length}/5 · click or drop</p>
            </label>
            {galleryImages.length > 0 && (
              <div className="mt-3 space-y-2">
                {galleryImages.map((image, index) => (
                  <div key={image.id || image.url} draggable onDragStart={(e) => handleGalleryDragStart(e, index)} onDragOver={(e) => handleGalleryDragOver(e, index)} onDragEnd={() => setDraggedIdx(null)} className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${image.isMain ? "border-blue-500 bg-blue-50" : "border-transparent bg-gray-50 hover:border-gray-200"}`}>
                    <div className="w-10 h-10 rounded overflow-hidden bg-white flex-shrink-0 border border-gray-100"><img src={image.url} alt="" className="w-full h-full object-cover" /></div>
                    <div className="flex-1 text-xs truncate text-gray-600">{image.isMain && <span className="text-blue-600 font-bold mr-1">★</span>}{image.name || "Uploaded image"}</div>
                    <div className="flex items-center gap-1">
                      {!image.isMain && (<button type="button" onClick={() => setMainGalleryImage(image.id || image.url)} title="Set as main thumbnail" className="p-1 text-gray-400 hover:text-blue-600">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                      </button>)}
                      <button type="button" onClick={() => removeGalleryImage(image.id || image.url)} className="p-1 text-gray-400 hover:text-red-600">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400 text-center">Drag to reorder · ★ = thumbnail</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductFormBody;
// code is woking but upper code have wholesaler sepration handling 
// // Shared_components/ProductFormBody.jsx
// //
// // EDIT MODE (productSlug set):
// //   • variants[0] = ALWAYS DIRECTLY EDITABLE inline card
// //     - price inputs + inventory inputs always visible (no "Edit" button needed)
// //     - NO attributes section (product has its own Product Attributes section)
// //     - NO "Update Main Variant" button — Save Changes handles it
// //     - ProductCode is READ-ONLY (locked)
// //     - isActive toggle is inline
// //   • variants[1+] = cards with Edit/Delete/Toggle → opens VariantModal
// //
// // CREATE MODE (no productSlug):
// //   • Single form: ProductCode + price + inventory → becomes variants[0] on submit

// import React, { useState } from "react";

// // Tax rate options for dropdown
// const TAX_RATE_OPTIONS = [
//   { value: 0,  label: "0% (Nil Rated)" },
//   { value: 5,  label: "5% (GST)"       },
//   { value: 12, label: "12% (GST)"      },
//   { value: 18, label: "18% (GST)"      },
//   { value: 28, label: "28% (GST)"      },
// ];

// const ProductFormBody = ({
//   formData,
//   setFormData,
//   categories,
//   brands,
//   onOpenCategoryModal,
//   onOpenBrandModal,
//   onOpenAttributeModal,
//   onOpenCustomMessage,
//   onOpenAddVariant,
//   onOpenEditVariant,
//   onDeleteVariant,
//   onToggleVariantActive,
//   onRemoveAttribute,
//   formatIndianRupee,
//   getDiscountPercentage,
//   productSlug,
//   actionLoading = false,
//   actionError   = null,
// }) => {
//   const isEditMode = !!productSlug;

//   // ── Gallery drag state ────────────────────────────────────────────────────
//   const [draggedIdx,     setDraggedIdx]     = useState(null);
//   const [isDraggingZone, setIsDraggingZone] = useState(false);

//   // ── Gallery images ────────────────────────────────────────────────────────
//   // Edit mode: gallery = variants[0].images
//   // Create mode: gallery = formData.images
//   const galleryImages = isEditMode
//     ? (formData.variants?.[0]?.images || [])
//     : (formData.images || []);

//   const setGalleryImages = (updater) => {
//     if (isEditMode) {
//       setFormData((p) => {
//         const v = [...(p.variants || [])];
//         if (!v[0]) return p;
//         const next = typeof updater === "function" ? updater(v[0].images || []) : updater;
//         v[0] = { ...v[0], images: next };
//         return { ...p, variants: v };
//       });
//     } else {
//       setFormData((p) => {
//         const next = typeof updater === "function" ? updater(p.images || []) : updater;
//         return { ...p, images: next };
//       });
//     }
//   };

//   const handleGalleryUpload = (e) => {
//     const files   = Array.from(e.target.files);
//     const current = [...galleryImages];
//     files.forEach((file, i) => {
//       if (current.length >= 5) return;
//       const id     = `gimg-${Date.now()}-${i}`;
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         current.push({ id, url: reader.result, file, name: file.name, isMain: current.length === 0 });
//         setGalleryImages([...current]);
//       };
//       reader.readAsDataURL(file);
//     });
//   };

//   const removeGalleryImage = (id) =>
//     setGalleryImages((imgs) => {
//       const wasMain = imgs.find((img) => img.id === id || img.url === id)?.isMain;
//       const next    = imgs.filter((img) => img.id !== id && img.url !== id);
//       if (wasMain && next.length > 0) next[0] = { ...next[0], isMain: true };
//       return next;
//     });

//   const setMainGalleryImage = (id) =>
//     setGalleryImages((imgs) =>
//       imgs.map((img) => ({ ...img, isMain: img.id === id || img.url === id }))
//     );

//   const handleGalleryDragStart = (e, index) => setDraggedIdx(index);
//   const handleGalleryDragOver  = (e, index) => {
//     e.preventDefault();
//     if (draggedIdx === null || draggedIdx === index) return;
//     const imgs = [...galleryImages];
//     const [moved] = imgs.splice(draggedIdx, 1);
//     imgs.splice(index, 0, moved);
//     imgs.forEach((img, i) => { img.isMain = i === 0; });
//     setGalleryImages(imgs);
//     setDraggedIdx(index);
//   };

//   // ── Generic field handler ─────────────────────────────────────────────────
//   const handleInputChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     if (name.startsWith("shipping.dimensions.")) {
//       const dim = name.split(".")[2];
//       setFormData((p) => ({ ...p, shipping: { ...p.shipping, dimensions: { ...p.shipping.dimensions, [dim]: value } } }));
//     } else if (name.includes(".")) {
//       const [parent, child] = name.split(".");
//       setFormData((p) => ({ ...p, [parent]: { ...p[parent], [child]: type === "checkbox" ? checked : value } }));
//     } else {
//       setFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
//     }
//   };

//   // ── variants[0] direct field updaters ────────────────────────────────────
//   const updateMainVariantField = (field, value) => {
//     setFormData((p) => {
//       const v = [...(p.variants || [])];
//       if (!v[0]) return p;
//       v[0] = { ...v[0], [field]: value };
//       return { ...p, variants: v };
//     });
//   };

//   const updateMainVariantPrice = (field, value) => {
//     setFormData((p) => {
//       const v = [...(p.variants || [])];
//       if (!v[0]) return p;
//       v[0] = { ...v[0], price: { ...v[0].price, [field]: value } };
//       return { ...p, variants: v };
//     });
//   };

//   const updateMainVariantInventory = (field, value) => {
//     setFormData((p) => {
//       const v = [...(p.variants || [])];
//       if (!v[0]) return p;
//       v[0] = { ...v[0], inventory: { ...v[0].inventory, [field]: value } };
//       return { ...p, variants: v };
//     });
//   };

//   // ── Derived values ────────────────────────────────────────────────────────
//   const primaryVariant  = isEditMode ? (formData.variants?.[0] ?? null) : null;
//   const extraVariants   = isEditMode ? (formData.variants?.slice(1) ?? []) : (formData.variants ?? []);
//   const extraOffset     = isEditMode ? 1 : 0;

//   // For CREATE mode display
//   const primaryBase  = formData.price?.base  ?? "";
//   const primarySale  = formData.price?.sale  ?? "";
//   const primaryTrack = formData.inventory?.trackInventory ?? true;
//   const primaryQty   = formData.inventory?.quantity       ?? 0;
//   const primaryLow   = formData.inventory?.lowStockThreshold ?? 5;

//   const mainGalleryImage = galleryImages.find((img) => img.isMain) || galleryImages[0] || null;

//   return (
//     <div className="grid grid-cols-3 gap-6">

//       {/* ══════════════════════════ LEFT 2 COLS ═══════════════════════════════ */}
//       <div className="col-span-2 space-y-6">

//         {/* ── Essential Details ───────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Essential Details</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Product Name <span className="text-red-400">*</span>
//                 </label>
//                 <input type="text" name="name" value={formData.name}
//                   onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g., Premium Wireless Headphones" required />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Title <span className="text-red-400">*</span>
//                 </label>
//                 <input type="text" name="title" value={formData.title}
//                   onChange={handleInputChange}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g., Noise Cancelling Headphones" required />
//               </div>
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Description <span className="text-red-400">*</span>
//               </label>
//               <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3"
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none"
//                 placeholder="Describe your product..." />
//             </div>
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
//                 <div className="flex gap-2">
//                   <select name="category" value={formData.category} onChange={handleInputChange}
//                     className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
//                     <option value="">Select category</option>
//                     {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
//                   </select>
//                   <button type="button" onClick={onOpenCategoryModal}
//                     className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
//                 <div className="flex gap-2">
//                   <select name="brand" value={formData.brand} onChange={handleInputChange}
//                     className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
//                     {brands.map((b) => <option key={b} value={b}>{b}</option>)}
//                   </select>
//                   <button type="button" onClick={onOpenBrandModal}
//                     className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ── Main Variant Card (variants[0]) — EDIT MODE ONLY ────────────── */}
//         {isEditMode && primaryVariant && (
//           <div className="bg-white rounded-xl border-2 border-indigo-300 overflow-hidden">
//             <div className="p-4 border-b border-indigo-200 bg-indigo-50 flex items-center justify-between">
//               <div>
//                 <div className="flex items-center gap-2">
//                   <h3 className="font-semibold text-gray-900">Main Variant</h3>
//                   <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 text-xs font-bold rounded-full">variants[0]</span>
//                   {primaryVariant.isActive
//                     ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
//                     : <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs rounded-full">Inactive</span>}
//                 </div>
//                 {/* ✅ FIX: use productCode (lowercase) not ProductCode */}
//                 <p className="text-xs text-indigo-500 mt-0.5 font-mono">
//                   📦 ProductCode: {primaryVariant.productCode}
//                   {primaryVariant.sku && <span className="ml-3 text-gray-400">SKU: {primaryVariant.sku}</span>}
//                 </p>
//               </div>
//               {/* Active toggle */}
//               <div className="flex items-center gap-2">
//                 <span className="text-xs text-gray-500">{primaryVariant.isActive ? "Active" : "Inactive"}</span>
//                 <button
//                   type="button"
//                   onClick={() => updateMainVariantField("isActive", !primaryVariant.isActive)}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${primaryVariant.isActive ? "bg-indigo-500" : "bg-gray-300"}`}>
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${primaryVariant.isActive ? "translate-x-6" : "translate-x-1"}`} />
//                 </button>
//               </div>
//             </div>

//             <div className="p-4 space-y-4">

//               {/* ProductCode — read-only, ✅ FIX: .productCode not .ProductCode */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">ProductCode</label>
//                 <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg">
//                   <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 5v14M10 5v14M13 5v4M13 11v8M16 5v14" />
//                   </svg>
//                   <span className="font-mono text-gray-800 text-sm flex-1">{primaryVariant.productCode}</span>
//                   <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">locked</span>
//                 </div>
//               </div>

//               {/* Price inputs */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   Price (₹) <span className="text-red-400">*</span>
//                 </label>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div>
//                     <label className="text-xs text-gray-500 mb-1 block">Base Price</label>
//                     <input
//                       type="number"
//                       value={primaryVariant.price?.base ?? ""}
//                       onChange={(e) => updateMainVariantPrice("base", e.target.value)}
//                       className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-400"
//                       placeholder="29999" />
//                   </div>
//                   <div>
//                     <label className="text-xs text-gray-500 mb-1 block">Sale Price</label>
//                     <input
//                       type="number"
//                       value={primaryVariant.price?.sale ?? ""}
//                       onChange={(e) => updateMainVariantPrice("sale", e.target.value)}
//                       className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-400"
//                       placeholder="19999" />
//                   </div>
//                 </div>
//                 {primaryVariant.price?.base && primaryVariant.price?.sale &&
//                   Number(primaryVariant.price.sale) > 0 &&
//                   Number(primaryVariant.price.sale) < Number(primaryVariant.price.base) && (
//                     <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 rounded-lg text-xs text-green-700 border border-green-200">
//                       💰 {getDiscountPercentage(primaryVariant.price.base, primaryVariant.price.sale)}% discount applied
//                     </div>
//                   )}
//               </div>

//               {/* Wholesale Toggle for Main Variant */}
//               <div className="border-t border-gray-200 pt-4">
//                 <div className="flex items-center justify-between mb-3">
//                   <div>
//                     <label className="text-sm font-semibold text-gray-700">Wholesale Pricing</label>
//                     <p className="text-xs text-gray-500 mt-0.5">Enable bulk pricing for wholesalers</p>
//                   </div>
//                   <button
//                     type="button"
//                     onClick={() => updateMainVariantField("wholesale", !primaryVariant.wholesale)}
//                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${primaryVariant.wholesale ? "bg-purple-500" : "bg-gray-300"}`}>
//                     <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${primaryVariant.wholesale ? "translate-x-6" : "translate-x-1"}`} />
//                   </button>
//                 </div>
//                 {primaryVariant.wholesale && (
//                   <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
//                     <div className="grid grid-cols-2 gap-3">
//                       <div>
//                         <label className="block text-xs font-medium text-gray-700 mb-1">
//                           Wholesale Base Price (₹) <span className="text-red-400">*</span>
//                         </label>
//                         <input
//                           type="number"
//                           value={primaryVariant.price?.wholesaleBase ?? ""}
//                           onChange={(e) => updateMainVariantPrice("wholesaleBase", e.target.value)}
//                           className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400"
//                           placeholder="e.g., 25000" />
//                       </div>
//                       <div>
//                         <label className="block text-xs font-medium text-gray-700 mb-1">
//                           Wholesale Sale Price (₹)
//                         </label>
//                         <input
//                           type="number"
//                           value={primaryVariant.price?.wholesaleSale ?? ""}
//                           onChange={(e) => updateMainVariantPrice("wholesaleSale", e.target.value)}
//                           className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400"
//                           placeholder="e.g., 23000" />
//                       </div>
//                     </div>
//                     <div>
//                       <label className="block text-xs font-medium text-gray-700 mb-1">
//                         Minimum Order Quantity (MOQ) <span className="text-red-400">*</span>
//                       </label>
//                       <input
//                         type="number"
//                         min="1"
//                         value={primaryVariant.minimumOrderQuantity ?? 1}
//                         onChange={(e) => updateMainVariantField("minimumOrderQuantity", parseInt(e.target.value) || 1)}
//                         className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400"
//                         placeholder="Minimum quantity for wholesale price" />
//                     </div>
//                   </div>
//                 )}
//               </div>

//               {/* Inventory inputs */}
//               <div>
//                 <div className="flex items-center justify-between mb-2">
//                   <label className="text-sm font-semibold text-gray-700">Inventory</label>
//                   <div className="flex items-center gap-2">
//                     <span className="text-xs text-gray-500">Track inventory</span>
//                     <button
//                       type="button"
//                       onClick={() => updateMainVariantInventory("trackInventory", !primaryVariant.inventory?.trackInventory)}
//                       className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${primaryVariant.inventory?.trackInventory !== false ? "bg-indigo-500" : "bg-gray-300"}`}>
//                       <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${primaryVariant.inventory?.trackInventory !== false ? "translate-x-5" : "translate-x-0.5"}`} />
//                     </button>
//                   </div>
//                 </div>
//                 {primaryVariant.inventory?.trackInventory !== false && (
//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
//                       <input
//                         type="number"
//                         value={primaryVariant.inventory?.quantity ?? 0}
//                         onChange={(e) => updateMainVariantInventory("quantity", parseInt(e.target.value) || 0)}
//                         className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
//                         placeholder="0" />
//                     </div>
//                     <div>
//                       <label className="text-xs text-gray-500 mb-1 block">Low Stock Alert</label>
//                       <input
//                         type="number"
//                         value={primaryVariant.inventory?.lowStockThreshold ?? 5}
//                         onChange={(e) => updateMainVariantInventory("lowStockThreshold", parseInt(e.target.value) || 5)}
//                         className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
//                         placeholder="5" />
//                     </div>
//                   </div>
//                 )}
//               </div>

//               <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg p-2">
//                 💡 Images for main variant are managed in the <strong>Product Gallery</strong> panel →. All changes here are saved when you click <strong>Save Changes</strong>.
//               </p>
//             </div>
//           </div>
//         )}

//         {/* ── CREATE MODE: ProductCode + price + inventory ─────────────────── */}
//         {!isEditMode && (
//           <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
//             <div className="p-4 border-b border-gray-100 bg-gray-50">
//               <h3 className="font-semibold text-gray-900">Product Details</h3>
//               <p className="text-xs text-gray-500 mt-0.5">These become variants[0] on submit</p>
//             </div>
//             <div className="p-4 space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Product Code <span className="text-red-400">*</span>
//                 </label>
//                 <input type="text" value={formData.ProductCode || ""}
//                   onChange={(e) => setFormData((p) => ({ ...p, ProductCode: e.target.value }))}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
//                   placeholder="e.g., 1234567890128" maxLength={20} />
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Base Price (₹) <span className="text-red-400">*</span>
//                   </label>
//                   <input type="number" value={primaryBase}
//                     onChange={(e) => setFormData((p) => ({ ...p, price: { ...p.price, base: e.target.value } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder="29999" />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (₹)</label>
//                   <input type="number" value={primarySale}
//                     onChange={(e) => setFormData((p) => ({ ...p, price: { ...p.price, sale: e.target.value } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder="19999" />
//                 </div>
//               </div>
//               {primaryBase && primarySale && (
//                 <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-3">
//                   <span className="text-gray-400 line-through text-sm">{formatIndianRupee(primaryBase)}</span>
//                   <span className="text-lg font-bold text-gray-900">{formatIndianRupee(primarySale)}</span>
//                   {Number(primarySale) < Number(primaryBase) && (
//                     <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                       {getDiscountPercentage(primaryBase, primarySale)}% OFF
//                     </span>
//                   )}
//                 </div>
//               )}

//               {/* Wholesale Toggle for CREATE mode */}
//               <div className="border-t border-gray-200 pt-4">
//                 <div className="flex items-center justify-between mb-3">
//                   <div>
//                     <label className="text-sm font-semibold text-gray-700">Wholesale Pricing</label>
//                     <p className="text-xs text-gray-500 mt-0.5">Enable bulk pricing for wholesalers</p>
//                   </div>
//                   <button
//                     type="button"
//                     onClick={() => setFormData((p) => ({ ...p, wholesale: !p.wholesale }))}
//                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.wholesale ? "bg-purple-500" : "bg-gray-300"}`}>
//                     <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.wholesale ? "translate-x-6" : "translate-x-1"}`} />
//                   </button>
//                 </div>
//                 {formData.wholesale && (
//                   <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
//                     <div className="grid grid-cols-2 gap-3">
//                       <div>
//                         <label className="block text-xs font-medium text-gray-700 mb-1">
//                           Wholesale Base Price (₹) <span className="text-red-400">*</span>
//                         </label>
//                         <input
//                           type="number"
//                           value={formData.wholesaleBase || ""}
//                           onChange={(e) => setFormData((p) => ({ ...p, wholesaleBase: e.target.value }))}
//                           className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400"
//                           placeholder="e.g., 25000" />
//                       </div>
//                       <div>
//                         <label className="block text-xs font-medium text-gray-700 mb-1">
//                           Wholesale Sale Price (₹)
//                         </label>
//                         <input
//                           type="number"
//                           value={formData.wholesaleSale || ""}
//                           onChange={(e) => setFormData((p) => ({ ...p, wholesaleSale: e.target.value }))}
//                           className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400"
//                           placeholder="e.g., 23000" />
//                       </div>
//                     </div>
//                     <div>
//                       <label className="block text-xs font-medium text-gray-700 mb-1">
//                         Minimum Order Quantity (MOQ) <span className="text-red-400">*</span>
//                       </label>
//                       <input
//                         type="number"
//                         min="1"
//                         value={formData.minimumOrderQuantity || 1}
//                         onChange={(e) => setFormData((p) => ({ ...p, minimumOrderQuantity: parseInt(e.target.value) || 1 }))}
//                         className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400"
//                         placeholder="Minimum quantity for wholesale price" />
//                     </div>
//                   </div>
//                 )}
//               </div>

//               <div className="pt-2 border-t border-gray-100">
//                 <div className="flex items-center justify-between mb-3">
//                   <span className="text-sm font-medium text-gray-700">Track Inventory</span>
//                   <button type="button"
//                     onClick={() => setFormData((p) => ({ ...p, inventory: { ...p.inventory, trackInventory: !p.inventory.trackInventory } }))}
//                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${primaryTrack ? "bg-blue-500" : "bg-gray-300"}`}>
//                     <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${primaryTrack ? "translate-x-6" : "translate-x-1"}`} />
//                   </button>
//                 </div>
//                 {primaryTrack && (
//                   <div className="grid grid-cols-2 gap-4">
//                     <div>
//                       <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
//                       <input type="number" value={primaryQty}
//                         onChange={(e) => setFormData((p) => ({ ...p, inventory: { ...p.inventory, quantity: parseInt(e.target.value) || 0 } }))}
//                         className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         placeholder="0" />
//                     </div>
//                     <div>
//                       <label className="block text-xs font-medium text-gray-600 mb-1">Low Stock Alert</label>
//                       <input type="number" value={primaryLow}
//                         onChange={(e) => setFormData((p) => ({ ...p, inventory: { ...p.inventory, lowStockThreshold: parseInt(e.target.value) || 5 } }))}
//                         className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         placeholder="5" />
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//         {/* ── Shipping ─────────────────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Shipping Details</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 HSN Code <span className="text-red-400">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={formData.hsnCode || ""}
//                 onChange={(e) => setFormData((p) => ({ ...p, hsnCode: e.target.value }))}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                 placeholder="e.g., 180987"
//                 maxLength={10} />
//               <p className="text-xs text-gray-500 mt-1">Harmonized System Nomenclature code for tax purposes</p>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Tax Rate <span className="text-red-400">*</span>
//               </label>
//               <select
//                 value={formData.taxRate ?? ""}
//                 onChange={(e) => setFormData((p) => ({
//                   ...p,
//                   taxRate: e.target.value === "" ? "" : parseFloat(e.target.value)
//                 }))}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500">
//                 <option value="">Select Tax Rate</option>
//                 {TAX_RATE_OPTIONS.map((option) => (
//                   <option key={option.value} value={option.value}>{option.label}</option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-3">
//                 Is Fragile? <span className="text-red-400">*</span>
//               </label>
//               <div className="flex gap-6">
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input
//                     type="radio" name="isFragile" value="true"
//                     checked={formData.isFragile === true}
//                     onChange={() => setFormData((p) => ({ ...p, isFragile: true }))}
//                     className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
//                   <span className="text-sm text-gray-700">Yes (Fragile)</span>
//                 </label>
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input
//                     type="radio" name="isFragile" value="false"
//                     checked={formData.isFragile === false}
//                     onChange={() => setFormData((p) => ({ ...p, isFragile: false }))}
//                     className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
//                   <span className="text-sm text-gray-700">No</span>
//                 </label>
//               </div>
//               <p className="text-xs text-gray-500 mt-1">Indicates if special handling is required during shipping</p>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
//               <input type="number" step="0.1" value={formData.shipping?.weight ?? ""}
//                 onChange={(e) => setFormData((p) => ({ ...p, shipping: { ...p.shipping, weight: parseFloat(e.target.value) || 0 } }))}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                 placeholder="0.5" />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions (cm)</label>
//               <div className="grid grid-cols-3 gap-2">
//                 {["length", "width", "height"].map((dim) => (
//                   <input key={dim} type="number"
//                     value={formData.shipping?.dimensions?.[dim] ?? ""}
//                     onChange={(e) => setFormData((p) => ({ ...p, shipping: { ...p.shipping, dimensions: { ...p.shipping.dimensions, [dim]: parseFloat(e.target.value) || 0 } } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                     placeholder={dim[0].toUpperCase() + dim.slice(1)} />
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ── Product Attributes ────────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <h3 className="font-semibold text-gray-900">Product Attributes</h3>
//             <button type="button" onClick={onOpenAttributeModal}
//               className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 whitespace-nowrap">
//               + Add
//             </button>
//           </div>
//           <div className="p-4">
//             {!formData.attributes?.length ? (
//               <p className="text-center text-gray-400 py-4 text-sm">No attributes added yet</p>
//             ) : (
//               <div className="flex flex-wrap gap-2">
//                 {formData.attributes.map((attr) => (
//                   <div key={attr.id}
//                     className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg group hover:bg-gray-100 transition-colors">
//                     <span className="text-sm whitespace-nowrap">
//                       <span className="font-medium text-gray-700">{attr.key}:</span>{" "}
//                       <span className="text-gray-600">{attr.value}</span>
//                     </span>
//                     <button type="button" onClick={() => onRemoveAttribute(attr.id)}
//                       className="text-gray-400 hover:text-red-500 transition-colors">
//                       <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                       </svg>
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* ── Additional Variants (variants[1+]) ───────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <div>
//               <h3 className="font-semibold text-gray-900">
//                 {isEditMode ? "Additional Variants" : "Product Variants"}
//               </h3>
//               <p className="text-xs text-gray-500 mt-0.5">
//                 {isEditMode
//                   ? "variants[1+] · each has its own ProductCode, price, images"
//                   : "e.g., different colors or sizes — each needs a unique ProductCode"}
//               </p>
//             </div>
//             <button type="button" onClick={onOpenAddVariant} disabled={actionLoading && isEditMode}
//               className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 flex items-center gap-1.5 disabled:opacity-60">
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//               </svg>
//               Add Variant
//             </button>
//           </div>
//           <div className="p-4">
//             {actionError && isEditMode && (
//               <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
//                 <p className="text-red-700 text-sm">❌ {actionError}</p>
//               </div>
//             )}
//             {extraVariants.length === 0 ? (
//               <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
//                 <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                     d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
//                 </svg>
//                 <p className="text-gray-400 text-sm">
//                   {isEditMode ? "No additional variants — main variant is the card above" : "No variants yet"}
//                 </p>
//               </div>
//             ) : (
//               <div className="space-y-3">
//                 {extraVariants.map((variant, idx) => {
//                   const realIndex  = extraOffset + idx;
//                   const isActive   = variant.isActive !== false;
//                   const variantThumb = variant.images?.find((img) => img.isMain)?.url || variant.images?.[0]?.url || null;

//                   return (
//                     <div key={variant._id || variant.productCode || `v-${realIndex}`}
//                       className={`rounded-lg border-2 p-3 transition-all ${isActive ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-gray-50 opacity-60"}`}>
//                       <div className="flex items-start justify-between gap-3">
//                         <div className="flex items-start gap-3 flex-1 min-w-0">
//                           {variantThumb ? (
//                             <img src={variantThumb} alt=""
//                               className="w-10 h-10 rounded-lg object-cover border border-indigo-200 flex-shrink-0" />
//                           ) : (
//                             <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
//                               <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                                   d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                               </svg>
//                             </div>
//                           )}
//                           <div className="flex-1 min-w-0">
//                             {variant.attributes?.length > 0 && (
//                               <div className="flex flex-wrap gap-1.5 mb-1.5">
//                                 {variant.attributes.map((attr, aIdx) => (
//                                   <span key={aIdx} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
//                                     {attr.key}: {attr.value}
//                                   </span>
//                                 ))}
//                               </div>
//                             )}
//                             <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm">
//                               <span className="font-semibold text-gray-900">
//                                 {formatIndianRupee(variant.price?.sale || variant.price?.base)}
//                               </span>
//                               {variant.price?.sale != null && Number(variant.price.sale) > 0 && Number(variant.price.sale) < Number(variant.price.base) && (
//                                 <>
//                                   <span className="text-gray-400 line-through text-xs">{formatIndianRupee(variant.price.base)}</span>
//                                   <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
//                                     {getDiscountPercentage(variant.price.base, variant.price.sale)}% OFF
//                                   </span>
//                                 </>
//                               )}
//                               {variant.wholesale && (
//                                 <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
//                                   🏷️ Wholesale
//                                 </span>
//                               )}
//                               <span className="text-gray-400 text-xs">·</span>
//                               <span className="text-gray-600 text-xs">Qty: {variant.inventory?.quantity ?? 0}</span>
//                               {/* ✅ FIX: use productCode (lowercase) not ProductCode */}
//                               {(variant.productCode != null) && (
//                                 <>
//                                   <span className="text-gray-400 text-xs">·</span>
//                                   <span className="text-xs font-mono text-gray-700 bg-white border border-gray-300 px-1.5 py-0.5 rounded">
//                                     📦 {variant.productCode}
//                                   </span>
//                                 </>
//                               )}
//                             </div>
//                           </div>
//                         </div>
//                         <div className="flex items-center gap-2 flex-shrink-0">
//                           <button type="button" onClick={() => onToggleVariantActive(realIndex)}
//                             disabled={actionLoading && isEditMode}
//                             title={isActive ? "Click to deactivate" : "Click to activate"}
//                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${isActive ? "bg-indigo-500" : "bg-gray-300"}`}>
//                             <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isActive ? "translate-x-5" : "translate-x-1"}`} />
//                           </button>
//                           <button type="button" onClick={() => onOpenEditVariant(realIndex)}
//                             disabled={actionLoading && isEditMode}
//                             className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg disabled:opacity-50">
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                                 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                             </svg>
//                           </button>
//                           <button type="button" onClick={() => onDeleteVariant(realIndex)}
//                             disabled={actionLoading && isEditMode}
//                             className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                                 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                             </svg>
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         </div>

//       </div>

//       {/* ══════════════════════════ RIGHT COLUMN ═══════════════════════════════ */}
//       <div className="space-y-6">

//         {/* ── Product Gallery ──────────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Product Gallery</h3>
//             <p className="text-xs text-gray-500 mt-1">
//               {isEditMode
//                 ? "Main variant images · ★ = thumbnail · saved with Save Changes"
//                 : "Up to 5 · drag to reorder · ★ = thumbnail"}
//             </p>
//           </div>
//           {mainGalleryImage && (
//             <div className="px-4 pt-4">
//               <div className="relative rounded-lg overflow-hidden border-2 border-blue-400">
//                 <img src={mainGalleryImage.url} alt="Main" className="w-full h-40 object-contain bg-gray-50" />
//                 <div className="absolute top-2 left-2">
//                   <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">★ MAIN</span>
//                 </div>
//               </div>
//             </div>
//           )}
//           <div className="p-4">
//             <label
//               className={`block w-full border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${isDraggingZone ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
//                 } ${galleryImages.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}`}
//               onDragOver={(e) => { e.preventDefault(); setIsDraggingZone(true); }}
//               onDragLeave={() => setIsDraggingZone(false)}
//               onDrop={(e) => {
//                 e.preventDefault();
//                 setIsDraggingZone(false);
//                 handleGalleryUpload({ target: { files: e.dataTransfer.files } });
//               }}>
//               <input type="file" multiple accept="image/*" className="hidden"
//                 disabled={galleryImages.length >= 5} onChange={handleGalleryUpload} />
//               <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//               </svg>
//               <p className="text-sm text-gray-600">{galleryImages.length}/5 · click or drop</p>
//             </label>
//             {galleryImages.length > 0 && (
//               <div className="mt-3 space-y-2">
//                 {galleryImages.map((image, index) => (
//                   <div key={image.id || image.url} draggable
//                     onDragStart={(e) => handleGalleryDragStart(e, index)}
//                     onDragOver={(e) => handleGalleryDragOver(e, index)}
//                     onDragEnd={() => setDraggedIdx(null)}
//                     className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${image.isMain ? "border-blue-500 bg-blue-50" : "border-transparent bg-gray-50 hover:border-gray-200"}`}>
//                     <div className="w-10 h-10 rounded overflow-hidden bg-white flex-shrink-0 border border-gray-100">
//                       <img src={image.url} alt="" className="w-full h-full object-cover" />
//                     </div>
//                     <div className="flex-1 text-xs truncate text-gray-600">
//                       {image.isMain && <span className="text-blue-600 font-bold mr-1">★</span>}
//                       {image.name || "Uploaded image"}
//                     </div>
//                     <div className="flex items-center gap-1">
//                       {!image.isMain && (
//                         <button type="button"
//                           onClick={() => setMainGalleryImage(image.id || image.url)}
//                           title="Set as main thumbnail"
//                           className="p-1 text-gray-400 hover:text-blue-600">
//                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                               d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
//                           </svg>
//                         </button>
//                       )}
//                       <button type="button"
//                         onClick={() => removeGalleryImage(image.id || image.url)}
//                         className="p-1 text-gray-400 hover:text-red-600">
//                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                         </svg>
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//                 <p className="text-xs text-gray-400 text-center">Drag to reorder · ★ = thumbnail</p>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* ── Marketing & Visibility ────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Marketing & Visibility</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div className="flex items-center justify-between">
//               <span className="text-sm font-medium text-gray-700">Featured Product</span>
//               <button type="button"
//                 onClick={() => setFormData((p) => ({ ...p, isFeatured: !p.isFeatured }))}
//                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isFeatured ? "bg-yellow-500" : "bg-gray-300"}`}>
//                 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isFeatured ? "translate-x-6" : "translate-x-1"}`} />
//               </button>
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
//               <select name="status" value={formData.status} onChange={handleInputChange}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
//                 <option value="draft">Draft</option>
//                 <option value="active">Active</option>
//                 <option value="archived">Archived</option>
//               </select>
//             </div>
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-gray-700">Sold Info</span>
//                 <button type="button"
//                   onClick={() => setFormData((p) => ({ ...p, soldInfo: { ...p.soldInfo, enabled: !p.soldInfo.enabled } }))}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.soldInfo?.enabled ? "bg-blue-500" : "bg-gray-300"}`}>
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.soldInfo?.enabled ? "translate-x-6" : "translate-x-1"}`} />
//                 </button>
//               </div>
//               {formData.soldInfo?.enabled && (
//                 <input type="number" value={formData.soldInfo?.count ?? 0}
//                   onChange={(e) => setFormData((p) => ({ ...p, soldInfo: { ...p.soldInfo, count: parseInt(e.target.value) || 0 } }))}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Number sold" />
//               )}
//             </div>
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-gray-700">FOMO</span>
//                 <button type="button"
//                   onClick={() => setFormData((p) => ({ ...p, fomo: { ...p.fomo, enabled: !p.fomo.enabled } }))}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.fomo?.enabled ? "bg-purple-500" : "bg-gray-300"}`}>
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.fomo?.enabled ? "translate-x-6" : "translate-x-1"}`} />
//                 </button>
//               </div>
//               {formData.fomo?.enabled && (
//                 <div className="space-y-2">
//                   <select value={formData.fomo.type}
//                     onChange={(e) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, type: e.target.value } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
//                     <option value="viewing_now">Viewing Now</option>
//                     <option value="product_left">Product Left</option>
//                     <option value="custom">Custom</option>
//                   </select>
//                   {formData.fomo.type === "viewing_now" && (
//                     <input type="number" value={formData.fomo.viewingNow ?? 0}
//                       onChange={(e) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, viewingNow: parseInt(e.target.value) || 0 } }))}
//                       className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Viewing now count" />
//                   )}
//                   {formData.fomo.type === "product_left" && (
//                     <input type="number" value={formData.fomo.productLeft ?? 0}
//                       onChange={(e) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, productLeft: parseInt(e.target.value) || 0 } }))}
//                       className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Items left" />
//                   )}
//                   {formData.fomo.type === "custom" && (
//                     <div className="flex gap-2">
//                       <input type="text" value={formData.fomo.customMessage ?? ""} readOnly
//                         className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Custom message" />
//                       <button type="button" onClick={() => onOpenCustomMessage(formData.fomo.customMessage || "")}
//                         className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                         </svg>
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default ProductFormBody;
// code is working but upper code have wholeseller section plus add some more fields like hsn code etc
// // Shared_components/ProductFormBody.jsx
// //
// // EDIT MODE (productSlug set):
// //   • variants[0] = ALWAYS DIRECTLY EDITABLE inline card
// //     - price inputs + inventory inputs always visible (no "Edit" button needed)
// //     - NO attributes section (product has its own Product Attributes section)
// //     - NO "Update Main Variant" button — Save Changes handles it
// //     - barcode is READ-ONLY (locked)
// //     - isActive toggle is inline
// //   • variants[1+] = cards with Edit/Delete/Toggle → opens VariantModal
// //
// // CREATE MODE (no productSlug):
// //   • Single form: barcode + price + inventory → becomes variants[0] on submit

// import React, { useState } from "react";

// const ProductFormBody = ({
//   formData,
//   setFormData,
//   categories,
//   brands,
//   onOpenCategoryModal,
//   onOpenBrandModal,
//   onOpenAttributeModal,
//   onOpenCustomMessage,
//   onOpenAddVariant,
//   onOpenEditVariant,
//   onDeleteVariant,
//   onToggleVariantActive,
//   onRemoveAttribute,
//   formatIndianRupee,
//   getDiscountPercentage,
//   productSlug,
//   actionLoading = false,
//   actionError = null,
// }) => {
//   const isEditMode = !!productSlug;

//   // ── Gallery drag state ────────────────────────────────────────────────────
//   const [draggedIdx, setDraggedIdx] = useState(null);
//   const [isDraggingZone, setIsDraggingZone] = useState(false);

//   // ── Gallery images ────────────────────────────────────────────────────────
//   // Edit mode: gallery = variants[0].images
//   // Create mode: gallery = formData.images
//   const galleryImages = isEditMode
//     ? (formData.variants?.[0]?.images || [])
//     : (formData.images || []);

//   const setGalleryImages = (updater) => {
//     if (isEditMode) {
//       setFormData((p) => {
//         const v = [...(p.variants || [])];
//         if (!v[0]) return p;
//         const next = typeof updater === "function" ? updater(v[0].images || []) : updater;
//         v[0] = { ...v[0], images: next };
//         return { ...p, variants: v };
//       });
//     } else {
//       setFormData((p) => {
//         const next = typeof updater === "function" ? updater(p.images || []) : updater;
//         return { ...p, images: next };
//       });
//     }
//   };

//   const handleGalleryUpload = (e) => {
//     const files = Array.from(e.target.files);
//     const current = [...galleryImages];
//     files.forEach((file, i) => {
//       if (current.length >= 5) return;
//       const id = `gimg-${Date.now()}-${i}`;
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         current.push({ id, url: reader.result, file, name: file.name, isMain: current.length === 0 });
//         setGalleryImages([...current]);
//       };
//       reader.readAsDataURL(file);
//     });
//   };

//   const removeGalleryImage = (id) =>
//     setGalleryImages((imgs) => {
//       const wasMain = imgs.find((img) => img.id === id || img.url === id)?.isMain;
//       const next = imgs.filter((img) => img.id !== id && img.url !== id);
//       if (wasMain && next.length > 0) next[0] = { ...next[0], isMain: true };
//       return next;
//     });

//   // ★ Sort isMain=true to index 0 — slice will use this order when sending to backend
//   const setMainGalleryImage = (id) =>
//     setGalleryImages((imgs) =>
//       imgs.map((img) => ({ ...img, isMain: img.id === id || img.url === id }))
//     );

//   const handleGalleryDragStart = (e, index) => setDraggedIdx(index);
//   const handleGalleryDragOver = (e, index) => {
//     e.preventDefault();
//     if (draggedIdx === null || draggedIdx === index) return;
//     const imgs = [...galleryImages];
//     const [moved] = imgs.splice(draggedIdx, 1);
//     imgs.splice(index, 0, moved);
//     imgs.forEach((img, i) => { img.isMain = i === 0; });
//     setGalleryImages(imgs);
//     setDraggedIdx(index);
//   };

//   // ── Generic field handler ─────────────────────────────────────────────────
//   const handleInputChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     if (name.startsWith("shipping.dimensions.")) {
//       const dim = name.split(".")[2];
//       setFormData((p) => ({ ...p, shipping: { ...p.shipping, dimensions: { ...p.shipping.dimensions, [dim]: value } } }));
//     } else if (name.includes(".")) {
//       const [parent, child] = name.split(".");
//       setFormData((p) => ({ ...p, [parent]: { ...p[parent], [child]: type === "checkbox" ? checked : value } }));
//     } else {
//       setFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
//     }
//   };

//   // ── variants[0] direct field updaters ────────────────────────────────────
//   // These write directly into formData.variants[0] — no separate edit state needed
//   const updateMainVariantField = (field, value) => {
//     setFormData((p) => {
//       const v = [...(p.variants || [])];
//       if (!v[0]) return p;
//       v[0] = { ...v[0], [field]: value };
//       return { ...p, variants: v };
//     });
//   };

//   const updateMainVariantPrice = (field, value) => {
//     setFormData((p) => {
//       const v = [...(p.variants || [])];
//       if (!v[0]) return p;
//       v[0] = { ...v[0], price: { ...v[0].price, [field]: value } };
//       return { ...p, variants: v };
//     });
//   };

//   const updateMainVariantInventory = (field, value) => {
//     setFormData((p) => {
//       const v = [...(p.variants || [])];
//       if (!v[0]) return p;
//       v[0] = { ...v[0], inventory: { ...v[0].inventory, [field]: value } };
//       return { ...p, variants: v };
//     });
//   };

//   // ── Derived values ────────────────────────────────────────────────────────
//   const primaryVariant = isEditMode ? (formData.variants?.[0] ?? null) : null;
//   const extraVariants = isEditMode ? (formData.variants?.slice(1) ?? []) : (formData.variants ?? []);
//   const extraOffset = isEditMode ? 1 : 0;

//   // For CREATE mode display
//   const primaryBase = formData.price?.base ?? "";
//   const primarySale = formData.price?.sale ?? "";
//   const primaryTrack = formData.inventory?.trackInventory ?? true;
//   const primaryQty = formData.inventory?.quantity ?? 0;
//   const primaryLow = formData.inventory?.lowStockThreshold ?? 5;

//   const mainGalleryImage = galleryImages.find((img) => img.isMain) || galleryImages[0] || null;

//   return (
//     <div className="grid grid-cols-3 gap-6">

//       {/* ══════════════════════════ LEFT 2 COLS ═══════════════════════════════ */}
//       <div className="col-span-2 space-y-6">

//         {/* ── Essential Details ───────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Essential Details</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Product Name <span className="text-red-400">*</span>
//                 </label>
//                 <input type="text" name="name" value={formData.name}
//                   onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g., Premium Wireless Headphones" required />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Title <span className="text-red-400">*</span>
//                 </label>
//                 <input type="text" name="title" value={formData.title}
//                   onChange={handleInputChange}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g., Noise Cancelling Headphones" required />
//               </div>
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Description <span className="text-red-400">*</span></label>
//               <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3"
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none"
//                 placeholder="Describe your product..." />
//             </div>
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
//                 <div className="flex gap-2">
//                   <select name="category" value={formData.category} onChange={handleInputChange}
//                     className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
//                     <option value="">Select category</option>
//                     {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
//                   </select>
//                   <button type="button" onClick={onOpenCategoryModal}
//                     className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
//                 <div className="flex gap-2">
//                   <select name="brand" value={formData.brand} onChange={handleInputChange}
//                     className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
//                     {brands.map((b) => <option key={b} value={b}>{b}</option>)}
//                   </select>
//                   <button type="button" onClick={onOpenBrandModal}
//                     className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ── Main Variant Card (variants[0]) — ALWAYS DIRECTLY EDITABLE ─────── */}
//         {isEditMode && primaryVariant && (
//           <div className="bg-white rounded-xl border-2 border-indigo-300 overflow-hidden">
//             <div className="p-4 border-b border-indigo-200 bg-indigo-50 flex items-center justify-between">
//               <div>
//                 <div className="flex items-center gap-2">
//                   <h3 className="font-semibold text-gray-900">Main Variant</h3>
//                   <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 text-xs font-bold rounded-full">variants[0]</span>
//                   {primaryVariant.isActive
//                     ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
//                     : <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs rounded-full">Inactive</span>}
//                 </div>
//                 <p className="text-xs text-indigo-500 mt-0.5 font-mono">
//                   📦 Barcode: {primaryVariant.barcode}
//                   {primaryVariant.sku && <span className="ml-3 text-gray-400">SKU: {primaryVariant.sku}</span>}
//                 </p>
//               </div>
//               {/* Active toggle — inline in header */}
//               <div className="flex items-center gap-2">
//                 <span className="text-xs text-gray-500">{primaryVariant.isActive ? "Active" : "Inactive"}</span>
//                 <button
//                   type="button"
//                   onClick={() => updateMainVariantField("isActive", !primaryVariant.isActive)}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${primaryVariant.isActive ? "bg-indigo-500" : "bg-gray-300"}`}>
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${primaryVariant.isActive ? "translate-x-6" : "translate-x-1"}`} />
//                 </button>
//               </div>
//             </div>

//             <div className="p-4 space-y-4">

//               {/* Barcode — read-only */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
//                 <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg">
//                   <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 5v14M10 5v14M13 5v4M13 11v8M16 5v14" />
//                   </svg>
//                   <span className="font-mono text-gray-800 text-sm flex-1">{primaryVariant.barcode}</span>
//                   <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">locked</span>
//                 </div>
//               </div>

//               {/* Price inputs — always visible */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   Price (₹) <span className="text-red-400">*</span>
//                 </label>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div>
//                     <label className="text-xs text-gray-500 mb-1 block">Base Price</label>
//                     <input
//                       type="number"
//                       value={primaryVariant.price?.base ?? ""}
//                       onChange={(e) => updateMainVariantPrice("base", e.target.value)}
//                       className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-400"
//                       placeholder="29999" />
//                   </div>
//                   <div>
//                     <label className="text-xs text-gray-500 mb-1 block">Sale Price <span className="text-red-400">*</span></label>
//                     <input
//                       type="number"
//                       value={primaryVariant.price?.sale ?? ""}
//                       onChange={(e) => updateMainVariantPrice("sale", e.target.value)}
//                       className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-400"
//                       placeholder="19999" />
//                   </div>
//                 </div>
//                 {primaryVariant.price?.base && primaryVariant.price?.sale &&
//                   Number(primaryVariant.price.sale) > 0 &&
//                   Number(primaryVariant.price.sale) < Number(primaryVariant.price.base) && (
//                     <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 rounded-lg text-xs text-green-700 border border-green-200">
//                       💰 {getDiscountPercentage(primaryVariant.price.base, primaryVariant.price.sale)}% discount applied
//                     </div>
//                   )}
//               </div>

//               {/* Inventory inputs — always visible */}
//               <div>
//                 <div className="flex items-center justify-between mb-2">
//                   <label className="text-sm font-semibold text-gray-700">Inventory</label>
//                   <div className="flex items-center gap-2">
//                     <span className="text-xs text-gray-500">Track inventory</span>
//                     <button
//                       type="button"
//                       onClick={() => updateMainVariantInventory("trackInventory", !primaryVariant.inventory?.trackInventory)}
//                       className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${primaryVariant.inventory?.trackInventory !== false ? "bg-indigo-500" : "bg-gray-300"}`}>
//                       <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${primaryVariant.inventory?.trackInventory !== false ? "translate-x-5" : "translate-x-0.5"}`} />
//                     </button>
//                   </div>
//                 </div>
//                 {primaryVariant.inventory?.trackInventory !== false && (
//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
//                       <input
//                         type="number"
//                         value={primaryVariant.inventory?.quantity ?? 0}
//                         onChange={(e) => updateMainVariantInventory("quantity", parseInt(e.target.value) || 0)}
//                         className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
//                         placeholder="0" />
//                     </div>
//                     <div>
//                       <label className="text-xs text-gray-500 mb-1 block">Low Stock Alert</label>
//                       <input
//                         type="number"
//                         value={primaryVariant.inventory?.lowStockThreshold ?? 5}
//                         onChange={(e) => updateMainVariantInventory("lowStockThreshold", parseInt(e.target.value) || 5)}
//                         className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
//                         placeholder="5" />
//                     </div>
//                   </div>
//                 )}
//               </div>

//               <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg p-2">
//                 💡 Images for main variant are managed in the <strong>Product Gallery</strong> panel →. All changes here are saved when you click <strong>Save Changes</strong>.
//               </p>
//             </div>
//           </div>
//         )}

//         {/* ── CREATE MODE: barcode + price + inventory ─────────────────────── */}
//         {!isEditMode && (
//           <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
//             <div className="p-4 border-b border-gray-100 bg-gray-50">
//               <h3 className="font-semibold text-gray-900">Product Details</h3>
//               <p className="text-xs text-gray-500 mt-0.5">These become variants[0] on submit</p>
//             </div>
//             <div className="p-4 space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Barcode <span className="text-red-400">*</span>
//                 </label>
//                 <input type="text" value={formData.barcode || ""}
//                   onChange={(e) => setFormData((p) => ({ ...p, barcode: e.target.value }))}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
//                   placeholder="e.g., 1234567890128" maxLength={20} />
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Base Price (₹) <span className="text-red-400">*</span>
//                   </label>
//                   <input type="number" value={primaryBase}
//                     onChange={(e) => setFormData((p) => ({ ...p, price: { ...p.price, base: e.target.value } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder="29999" />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (₹)</label>
//                   <input type="number" value={primarySale}
//                     onChange={(e) => setFormData((p) => ({ ...p, price: { ...p.price, sale: e.target.value } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder="19999" />
//                 </div>
//               </div>
//               {primaryBase && primarySale && (
//                 <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-3">
//                   <span className="text-gray-400 line-through text-sm">{formatIndianRupee(primaryBase)}</span>
//                   <span className="text-lg font-bold text-gray-900">{formatIndianRupee(primarySale)}</span>
//                   {Number(primarySale) < Number(primaryBase) && (
//                     <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                       {getDiscountPercentage(primaryBase, primarySale)}% OFF
//                     </span>
//                   )}
//                 </div>
//               )}
//               <div className="pt-2 border-t border-gray-100">
//                 <div className="flex items-center justify-between mb-3">
//                   <span className="text-sm font-medium text-gray-700">Track Inventory</span>
//                   <button type="button"
//                     onClick={() => setFormData((p) => ({ ...p, inventory: { ...p.inventory, trackInventory: !p.inventory.trackInventory } }))}
//                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${primaryTrack ? "bg-blue-500" : "bg-gray-300"}`}>
//                     <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${primaryTrack ? "translate-x-6" : "translate-x-1"}`} />
//                   </button>
//                 </div>
//                 {primaryTrack && (
//                   <div className="grid grid-cols-2 gap-4">
//                     <div>
//                       <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
//                       <input type="number" value={primaryQty}
//                         onChange={(e) => setFormData((p) => ({ ...p, inventory: { ...p.inventory, quantity: parseInt(e.target.value) || 0 } }))}
//                         className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         placeholder="0" />
//                     </div>
//                     <div>
//                       <label className="block text-xs font-medium text-gray-600 mb-1">Low Stock Alert</label>
//                       <input type="number" value={primaryLow}
//                         onChange={(e) => setFormData((p) => ({ ...p, inventory: { ...p.inventory, lowStockThreshold: parseInt(e.target.value) || 5 } }))}
//                         className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         placeholder="5" />
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//         {/* ── Shipping ─────────────────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Shipping Details</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
//               <input type="number" step="0.1" value={formData.shipping?.weight ?? ""}
//                 onChange={(e) => setFormData((p) => ({ ...p, shipping: { ...p.shipping, weight: parseFloat(e.target.value) || 0 } }))}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                 placeholder="0.5" />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions (cm)</label>
//               <div className="grid grid-cols-3 gap-2">
//                 {["length", "width", "height"].map((dim) => (
//                   <input key={dim} type="number"
//                     value={formData.shipping?.dimensions?.[dim] ?? ""}
//                     onChange={(e) => setFormData((p) => ({ ...p, shipping: { ...p.shipping, dimensions: { ...p.shipping.dimensions, [dim]: parseFloat(e.target.value) } } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                     placeholder={dim[0].toUpperCase() + dim.slice(1)} />
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ── Product Attributes ────────────────────────────────────────────── */}
//         {/* <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <h3 className="font-semibold text-gray-900">Product Attributes</h3>
//             <button type="button" onClick={onOpenAttributeModal}
//               className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">
//               + Add
//             </button>
//           </div>
//           <div className="p-4">
//             {!formData.attributes?.length ? (
//               <p className="text-center text-gray-400 py-4 text-sm">No attributes added yet</p>
//             ) : (
//               <div className="space-y-2">
//                 {formData.attributes.map((attr) => (
//                   <div key={attr.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
//                     <span className="text-sm">
//                       <span className="font-medium text-gray-700">{attr.key}:</span>{" "}
//                       <span className="text-gray-600">{attr.value}</span>
//                     </span>
//                     <button type="button" onClick={() => onRemoveAttribute(attr.id)}
//                       className="text-gray-400 hover:text-red-500">
//                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                       </svg>
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div> */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <h3 className="font-semibold text-gray-900">Product Attributes</h3>
//             <button type="button" onClick={onOpenAttributeModal}
//               className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 whitespace-nowrap">
//               + Add
//             </button>
//           </div>
//           <div className="p-4">
//             {!formData.attributes?.length ? (
//               <p className="text-center text-gray-400 py-4 text-sm">No attributes added yet</p>
//             ) : (
//               <div className="flex flex-wrap gap-2">
//                 {formData.attributes.map((attr) => (
//                   <div
//                     key={attr.id}
//                     className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg group hover:bg-gray-100 transition-colors"
//                   >
//                     <span className="text-sm whitespace-nowrap">
//                       <span className="font-medium text-gray-700">{attr.key}:</span>{" "}
//                       <span className="text-gray-600">{attr.value}</span>
//                     </span>
//                     <button
//                       type="button"
//                       onClick={() => onRemoveAttribute(attr.id)}
//                       className="text-gray-400 hover:text-red-500 transition-colors"
//                     >
//                       <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                       </svg>
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* ── Additional Variants (variants[1+]) ───────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <div>
//               <h3 className="font-semibold text-gray-900">
//                 {isEditMode ? "Additional Variants" : "Product Variants"}
//               </h3>
//               <p className="text-xs text-gray-500 mt-0.5">
//                 {isEditMode
//                   ? "variants[1+] · each has its own barcode, price, images"
//                   : "e.g., different colors or sizes — each needs a unique barcode"}
//               </p>
//             </div>
//             <button type="button" onClick={onOpenAddVariant} disabled={actionLoading && isEditMode}
//               className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 flex items-center gap-1.5 disabled:opacity-60">
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//               </svg>
//               Add Variant
//             </button>
//           </div>
//           <div className="p-4">
//             {actionError && isEditMode && (
//               <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
//                 <p className="text-red-700 text-sm">❌ {actionError}</p>
//               </div>
//             )}
//             {extraVariants.length === 0 ? (
//               <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
//                 <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                     d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
//                 </svg>
//                 <p className="text-gray-400 text-sm">
//                   {isEditMode ? "No additional variants — main variant is the card above" : "No variants yet"}
//                 </p>
//               </div>
//             ) : (
//               <div className="space-y-3">
//                 {extraVariants.map((variant, idx) => {
//                   const realIndex = extraOffset + idx;
//                   const isActive = variant.isActive !== false;
//                   const variantThumb = variant.images?.find((img) => img.isMain)?.url || variant.images?.[0]?.url || null;

//                   return (
//                     <div key={variant._id || variant.barcode || `v-${realIndex}`}
//                       className={`rounded-lg border-2 p-3 transition-all ${isActive ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-gray-50 opacity-60"}`}>
//                       <div className="flex items-start justify-between gap-3">
//                         <div className="flex items-start gap-3 flex-1 min-w-0">
//                           {variantThumb ? (
//                             <img src={variantThumb} alt=""
//                               className="w-10 h-10 rounded-lg object-cover border border-indigo-200 flex-shrink-0" />
//                           ) : (
//                             <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
//                               <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                                   d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                               </svg>
//                             </div>
//                           )}
//                           <div className="flex-1 min-w-0">
//                             {variant.attributes?.length > 0 && (
//                               <div className="flex flex-wrap gap-1.5 mb-1.5">
//                                 {variant.attributes.map((attr, aIdx) => (
//                                   <span key={aIdx} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
//                                     {attr.key}: {attr.value}
//                                   </span>
//                                 ))}
//                               </div>
//                             )}
//                             <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm">
//                               <span className="font-semibold text-gray-900">
//                                 {formatIndianRupee(variant.price?.sale || variant.price?.base)}
//                               </span>
//                               {variant.price?.sale != null && Number(variant.price.sale) > 0 && Number(variant.price.sale) < Number(variant.price.base) && (
//                                 <>
//                                   <span className="text-gray-400 line-through text-xs">{formatIndianRupee(variant.price.base)}</span>
//                                   <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
//                                     {getDiscountPercentage(variant.price.base, variant.price.sale)}% OFF
//                                   </span>
//                                 </>
//                               )}
//                               <span className="text-gray-400 text-xs">·</span>
//                               <span className="text-gray-600 text-xs">Qty: {variant.inventory?.quantity ?? 0}</span>
//                               {(variant.barcode || variant.barcode === 0) && (
//                                 <>
//                                   <span className="text-gray-400 text-xs">·</span>
//                                   <span className="text-xs font-mono text-gray-700 bg-white border border-gray-300 px-1.5 py-0.5 rounded">
//                                     📦 {variant.barcode}
//                                   </span>
//                                 </>
//                               )}
//                             </div>
//                           </div>
//                         </div>
//                         <div className="flex items-center gap-2 flex-shrink-0">
//                           <button type="button" onClick={() => onToggleVariantActive(realIndex)}
//                             disabled={actionLoading && isEditMode}
//                             title={isActive ? "Click to deactivate" : "Click to activate"}
//                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${isActive ? "bg-indigo-500" : "bg-gray-300"}`}>
//                             <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isActive ? "translate-x-5" : "translate-x-1"}`} />
//                           </button>
//                           <button type="button" onClick={() => onOpenEditVariant(realIndex)}
//                             disabled={actionLoading && isEditMode}
//                             className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg disabled:opacity-50">
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                                 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                             </svg>
//                           </button>
//                           <button type="button" onClick={() => onDeleteVariant(realIndex)}
//                             disabled={actionLoading && isEditMode}
//                             className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                                 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                             </svg>
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         </div>

//       </div>

//       {/* ══════════════════════════ RIGHT COLUMN ═══════════════════════════════ */}
//       <div className="space-y-6">

//         {/* ── Product Gallery ──────────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Product Gallery</h3>
//             <p className="text-xs text-gray-500 mt-1">
//               {isEditMode
//                 ? "Main variant images · ★ = thumbnail · saved with Save Changes"
//                 : "Up to 5 · drag to reorder · ★ = thumbnail"}
//             </p>
//           </div>
//           {mainGalleryImage && (
//             <div className="px-4 pt-4">
//               <div className="relative rounded-lg overflow-hidden border-2 border-blue-400">
//                 <img src={mainGalleryImage.url} alt="Main" className="w-full h-40 object-contain bg-gray-50" />
//                 <div className="absolute top-2 left-2">
//                   <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">★ MAIN</span>
//                 </div>
//               </div>
//             </div>
//           )}
//           <div className="p-4">
//             <label
//               className={`block w-full border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${isDraggingZone ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
//                 } ${galleryImages.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}`}
//               onDragOver={(e) => { e.preventDefault(); setIsDraggingZone(true); }}
//               onDragLeave={() => setIsDraggingZone(false)}
//               onDrop={(e) => {
//                 e.preventDefault();
//                 setIsDraggingZone(false);
//                 handleGalleryUpload({ target: { files: e.dataTransfer.files } });
//               }}>
//               <input type="file" multiple accept="image/*" className="hidden"
//                 disabled={galleryImages.length >= 5} onChange={handleGalleryUpload} />
//               <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//               </svg>
//               <p className="text-sm text-gray-600">{galleryImages.length}/5 · click or drop</p>
//             </label>
//             {galleryImages.length > 0 && (
//               <div className="mt-3 space-y-2">
//                 {galleryImages.map((image, index) => (
//                   <div key={image.id || image.url} draggable
//                     onDragStart={(e) => handleGalleryDragStart(e, index)}
//                     onDragOver={(e) => handleGalleryDragOver(e, index)}
//                     onDragEnd={() => setDraggedIdx(null)}
//                     className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${image.isMain ? "border-blue-500 bg-blue-50" : "border-transparent bg-gray-50 hover:border-gray-200"
//                       }`}>
//                     <div className="w-10 h-10 rounded overflow-hidden bg-white flex-shrink-0 border border-gray-100">
//                       <img src={image.url} alt="" className="w-full h-full object-cover" />
//                     </div>
//                     <div className="flex-1 text-xs truncate text-gray-600">
//                       {image.isMain && <span className="text-blue-600 font-bold mr-1">★</span>}
//                       {image.name || "Uploaded image"}
//                     </div>
//                     <div className="flex items-center gap-1">
//                       {!image.isMain && (
//                         <button type="button"
//                           onClick={() => setMainGalleryImage(image.id || image.url)}
//                           title="Set as main thumbnail"
//                           className="p-1 text-gray-400 hover:text-blue-600">
//                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                               d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
//                           </svg>
//                         </button>
//                       )}
//                       <button type="button"
//                         onClick={() => removeGalleryImage(image.id || image.url)}
//                         className="p-1 text-gray-400 hover:text-red-600">
//                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                         </svg>
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//                 <p className="text-xs text-gray-400 text-center">Drag to reorder · ★ = thumbnail</p>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* ── Marketing & Visibility ────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Marketing & Visibility</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div className="flex items-center justify-between">
//               <span className="text-sm font-medium text-gray-700">Featured Product</span>
//               <button type="button"
//                 onClick={() => setFormData((p) => ({ ...p, isFeatured: !p.isFeatured }))}
//                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isFeatured ? "bg-yellow-500" : "bg-gray-300"}`}>
//                 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isFeatured ? "translate-x-6" : "translate-x-1"}`} />
//               </button>
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
//               <select name="status" value={formData.status} onChange={handleInputChange}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
//                 <option value="draft">Draft</option>
//                 <option value="active">Active</option>
//                 <option value="archived">Archived</option>
//               </select>
//             </div>
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-gray-700">Sold Info</span>
//                 <button type="button"
//                   onClick={() => setFormData((p) => ({ ...p, soldInfo: { ...p.soldInfo, enabled: !p.soldInfo.enabled } }))}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.soldInfo?.enabled ? "bg-blue-500" : "bg-gray-300"}`}>
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.soldInfo?.enabled ? "translate-x-6" : "translate-x-1"}`} />
//                 </button>
//               </div>
//               {formData.soldInfo?.enabled && (
//                 <input type="number" value={formData.soldInfo?.count ?? 0}
//                   onChange={(e) => setFormData((p) => ({ ...p, soldInfo: { ...p.soldInfo, count: parseInt(e.target.value) || 0 } }))}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Number sold" />
//               )}
//             </div>
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-gray-700">FOMO</span>
//                 <button type="button"
//                   onClick={() => setFormData((p) => ({ ...p, fomo: { ...p.fomo, enabled: !p.fomo.enabled } }))}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.fomo?.enabled ? "bg-purple-500" : "bg-gray-300"}`}>
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.fomo?.enabled ? "translate-x-6" : "translate-x-1"}`} />
//                 </button>
//               </div>
//               {formData.fomo?.enabled && (
//                 <div className="space-y-2">
//                   <select value={formData.fomo.type}
//                     onChange={(e) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, type: e.target.value } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
//                     <option value="viewing_now">Viewing Now</option>
//                     <option value="product_left">Product Left</option>
//                     <option value="custom">Custom</option>
//                   </select>
//                   {formData.fomo.type === "viewing_now" && (
//                     <input type="number" value={formData.fomo.viewingNow ?? 0}
//                       onChange={(e) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, viewingNow: parseInt(e.target.value) || 0 } }))}
//                       className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Viewing now count" />
//                   )}
//                   {formData.fomo.type === "product_left" && (
//                     <input type="number" value={formData.fomo.productLeft ?? 0}
//                       onChange={(e) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, productLeft: parseInt(e.target.value) || 0 } }))}
//                       className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Items left" />
//                   )}
//                   {formData.fomo.type === "custom" && (
//                     <div className="flex gap-2">
//                       <input type="text" value={formData.fomo.customMessage ?? ""} readOnly
//                         className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Custom message" />
//                       <button type="button" onClick={() => onOpenCustomMessage(formData.fomo.customMessage || "")}
//                         className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                         </svg>
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default ProductFormBody;

// try to fix it the image issue
// // Shared_components/ProductFormBody.jsx
// //
// // EDIT MODE (productSlug set):
// //   • variants[0] = FULLY INLINE EDITABLE card
// //     - price, inventory, attributes, images all editable directly
// //     - "Update Main Variant" button → calls onSaveMainVariant(data)
// //     - barcode is READ-ONLY (locked after creation)
// //   • variants[1+] = cards with Edit button → opens VariantModal (prefilled)
// //
// // CREATE MODE (no productSlug):
// //   • Single form: barcode + price + inventory → becomes variants[0] on submit
// //   • Gallery → becomes variantImages_0
// //   • Product Variants section → becomes variants[1+]

// import React, { useState } from "react";

// const ProductFormBody = ({
//   formData,
//   setFormData,
//   categories,
//   brands,
//   onOpenCategoryModal,
//   onOpenBrandModal,
//   onOpenAttributeModal,
//   onOpenCustomMessage,
//   onOpenAddVariant,
//   onOpenEditVariant,     // opens VariantModal for variants[1+]
//   onSaveMainVariant,     // called when variants[0] inline edit is saved
//   onDeleteVariant,
//   onToggleVariantActive,
//   onRemoveAttribute,
//   formatIndianRupee,
//   getDiscountPercentage,
//   productSlug,
//   actionLoading = false,
//   actionError   = null,
//   mainVariantSaving = false,
//   mainVariantError  = null,
// }) => {
//   const isEditMode = !!productSlug;

//   // ── Inline edit state for variants[0] ────────────────────────────────────
//   const [v0Edit, setV0Edit] = useState(null); // null = display mode, object = editing

//   // ── Gallery drag state ─────────────────────────────────────────────────
//   const [draggedIdx,     setDraggedIdx]     = useState(null);
//   const [isDraggingZone, setIsDraggingZone] = useState(false);

//   // ── Gallery images ────────────────────────────────────────────────────────
//   const galleryImages = isEditMode
//     ? (formData.variants?.[0]?.images || [])
//     : (formData.images || []);

//   const setGalleryImages = (updater) => {
//     if (isEditMode) {
//       setFormData((p) => {
//         const v = [...(p.variants || [])];
//         if (!v[0]) return p;
//         const next = typeof updater === "function" ? updater(v[0].images || []) : updater;
//         v[0] = { ...v[0], images: next };
//         return { ...p, variants: v };
//       });
//     } else {
//       setFormData((p) => {
//         const next = typeof updater === "function" ? updater(p.images || []) : updater;
//         return { ...p, images: next };
//       });
//     }
//   };

//   const handleGalleryUpload = (e) => {
//     const files   = Array.from(e.target.files);
//     const current = [...galleryImages];
//     files.forEach((file, i) => {
//       if (current.length >= 5) return;
//       const id     = `gimg-${Date.now()}-${i}`;
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         current.push({ id, url: reader.result, file, name: file.name, isMain: current.length === 0 });
//         setGalleryImages([...current]);
//       };
//       reader.readAsDataURL(file);
//     });
//   };

//   const removeGalleryImage = (id) =>
//     setGalleryImages((imgs) => {
//       const wasMain = imgs.find((img) => img.id === id)?.isMain;
//       const next    = imgs.filter((img) => img.id !== id);
//       if (wasMain && next.length > 0) next[0] = { ...next[0], isMain: true };
//       return next;
//     });

//   const setMainGalleryImage = (id) =>
//     setGalleryImages((imgs) => imgs.map((img) => ({ ...img, isMain: img.id === id })));

//   const handleGalleryDragStart = (e, index) => setDraggedIdx(index);
//   const handleGalleryDragOver  = (e, index) => {
//     e.preventDefault();
//     if (draggedIdx === null || draggedIdx === index) return;
//     const imgs = [...galleryImages];
//     const [moved] = imgs.splice(draggedIdx, 1);
//     imgs.splice(index, 0, moved);
//     imgs.forEach((img, i) => { img.isMain = i === 0; });
//     setGalleryImages(imgs);
//     setDraggedIdx(index);
//   };

//   // ── Generic field handler ─────────────────────────────────────────────────
//   const handleInputChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     if (name.startsWith("shipping.dimensions.")) {
//       const dim = name.split(".")[2];
//       setFormData((p) => ({ ...p, shipping: { ...p.shipping, dimensions: { ...p.shipping.dimensions, [dim]: value } } }));
//     } else if (name.includes(".")) {
//       const [parent, child] = name.split(".");
//       setFormData((p) => ({ ...p, [parent]: { ...p[parent], [child]: type === "checkbox" ? checked : value } }));
//     } else {
//       setFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
//     }
//   };

//   // ── variants[0] inline editing helpers ───────────────────────────────────
//   const primaryVariant = isEditMode ? (formData.variants?.[0] ?? null) : null;

//   const startEditMainVariant = () => {
//     if (!primaryVariant) return;
//     setV0Edit({
//       price:     { base: primaryVariant.price?.base ?? "", sale: primaryVariant.price?.sale ?? "" },
//       inventory: {
//         quantity:          primaryVariant.inventory?.quantity          ?? 0,
//         lowStockThreshold: primaryVariant.inventory?.lowStockThreshold ?? 5,
//         trackInventory:    primaryVariant.inventory?.trackInventory    !== false,
//       },
//       attributes: primaryVariant.attributes?.length > 0
//         ? primaryVariant.attributes.map((a) => ({ key: a.key || "", value: a.value || "" }))
//         : [{ key: "", value: "" }],
//       isActive: primaryVariant.isActive !== false,
//     });
//   };

//   const cancelEditMainVariant = () => setV0Edit(null);

//   const saveMainVariant = () => {
//     if (!v0Edit) return;
//     if (!v0Edit.price.base) { alert("Base price is required"); return; }
//     const base = parseFloat(v0Edit.price.base);
//     const sale = (v0Edit.price.sale !== "" && v0Edit.price.sale != null && v0Edit.price.sale !== "null")
//       ? parseFloat(v0Edit.price.sale)
//       : null;
//     if (isNaN(base) || base <= 0) { alert("Base price must be a valid number greater than 0"); return; }
//     if (sale !== null && sale >= base) { alert("Sale price must be less than base price"); return; }

//     onSaveMainVariant({
//       price:      { base, sale },
//       inventory:  v0Edit.inventory,
//       attributes: v0Edit.attributes.filter((a) => a.key.trim() && a.value.trim()),
//       isActive:   v0Edit.isActive,
//       images:     galleryImages,   // current gallery images (may include new File uploads)
//       barcode:    primaryVariant.barcode,
//     });
//     setV0Edit(null);
//   };

//   // V0 attribute helpers
//   const v0AddAttr    = () => setV0Edit((p) => ({ ...p, attributes: [...p.attributes, { key: "", value: "" }] }));
//   const v0RemoveAttr = (i) => setV0Edit((p) => ({ ...p, attributes: p.attributes.filter((_, idx) => idx !== i) }));
//   const v0UpdateAttr = (i, field, val) =>
//     setV0Edit((p) => ({ ...p, attributes: p.attributes.map((a, idx) => idx === i ? { ...a, [field]: val } : a) }));

//   // ── Derived values ─────────────────────────────────────────────────────
//   const extraVariants = isEditMode ? (formData.variants?.slice(1) ?? []) : (formData.variants ?? []);
//   const extraOffset   = isEditMode ? 1 : 0;

//   // For CREATE mode display
//   const primaryBase  = formData.price?.base  ?? "";
//   const primarySale  = formData.price?.sale  ?? "";
//   const primaryTrack = formData.inventory?.trackInventory ?? true;
//   const primaryQty   = formData.inventory?.quantity          ?? 0;
//   const primaryLow   = formData.inventory?.lowStockThreshold ?? 5;

//   const mainGalleryImage = galleryImages.find((img) => img.isMain) || galleryImages[0] || null;

//   return (
//     <div className="grid grid-cols-3 gap-6">

//       {/* ══════════════════════════ LEFT 2 COLS ═══════════════════════════════ */}
//       <div className="col-span-2 space-y-6">

//         {/* ── Essential Details ───────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Essential Details</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Product Name <span className="text-red-400">*</span>
//                 </label>
//                 <input type="text" name="name" value={formData.name}
//                   onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g., Premium Wireless Headphones" required />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Title <span className="text-red-400">*</span>
//                 </label>
//                 <input type="text" name="title" value={formData.title}
//                   onChange={handleInputChange}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g., Noise Cancelling Headphones" required />
//               </div>
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
//               <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3"
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none"
//                 placeholder="Describe your product..." />
//             </div>
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
//                 <div className="flex gap-2">
//                   <select name="category" value={formData.category} onChange={handleInputChange}
//                     className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
//                     <option value="">Select category</option>
//                     {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
//                   </select>
//                   <button type="button" onClick={onOpenCategoryModal}
//                     className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
//                 <div className="flex gap-2">
//                   <select name="brand" value={formData.brand} onChange={handleInputChange}
//                     className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
//                     {brands.map((b) => <option key={b} value={b}>{b}</option>)}
//                   </select>
//                   <button type="button" onClick={onOpenBrandModal}
//                     className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ── Main Variant Card (variants[0]) — INLINE EDITABLE in edit mode ── */}
//         {isEditMode && primaryVariant && (
//           <div className="bg-white rounded-xl border-2 border-indigo-300 overflow-hidden">
//             {/* Card header */}
//             <div className="p-4 border-b border-indigo-200 bg-indigo-50 flex items-center justify-between">
//               <div>
//                 <div className="flex items-center gap-2">
//                   <h3 className="font-semibold text-gray-900">Main Variant</h3>
//                   <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 text-xs font-bold rounded-full">variants[0]</span>
//                   {primaryVariant.isActive
//                     ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
//                     : <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs rounded-full">Inactive</span>}
//                 </div>
//                 <p className="text-xs text-indigo-500 mt-0.5 font-mono">
//                   📦 Barcode: {primaryVariant.barcode}
//                   {primaryVariant.sku && <span className="ml-3 text-gray-400">SKU: {primaryVariant.sku}</span>}
//                 </p>
//               </div>
//               <div className="flex items-center gap-2">
//                 {v0Edit ? (
//                   <>
//                     <button type="button" onClick={cancelEditMainVariant}
//                       className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50">
//                       Cancel
//                     </button>
//                     <button type="button" onClick={saveMainVariant} disabled={mainVariantSaving}
//                       className="px-4 py-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-60 flex items-center gap-1.5">
//                       {mainVariantSaving
//                         ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
//                         : "✓ Update Main Variant"}
//                     </button>
//                   </>
//                 ) : (
//                   <button type="button" onClick={startEditMainVariant}
//                     className="px-3 py-1.5 bg-indigo-500 text-white text-xs font-medium rounded-lg hover:bg-indigo-600 flex items-center gap-1.5">
//                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                         d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                     </svg>
//                     Edit Main Variant
//                   </button>
//                 )}
//               </div>
//             </div>

//             {mainVariantError && (
//               <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
//                 <p className="text-red-700 text-sm">❌ {mainVariantError}</p>
//               </div>
//             )}

//             <div className="p-4 space-y-4">

//               {/* Barcode — always read-only */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
//                 <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg">
//                   <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                       d="M7 5v14M10 5v14M13 5v4M13 11v8M16 5v14" />
//                   </svg>
//                   <span className="font-mono text-gray-800 text-sm flex-1">{primaryVariant.barcode}</span>
//                   <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">locked</span>
//                 </div>
//               </div>

//               {/* ── DISPLAY MODE (v0Edit === null) ── */}
//               {!v0Edit ? (
//                 <>
//                   {/* Price display */}
//                   <div className="grid grid-cols-2 gap-4">
//                     <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
//                       <p className="text-xs text-gray-500 mb-1">Base Price</p>
//                       <p className="text-xl font-bold text-gray-900">{formatIndianRupee(primaryVariant.price?.base)}</p>
//                     </div>
//                     <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
//                       <p className="text-xs text-gray-500 mb-1">Sale Price</p>
//                       {primaryVariant.price?.sale
//                         ? <p className="text-xl font-bold text-green-700">{formatIndianRupee(primaryVariant.price.sale)}</p>
//                         : <p className="text-sm text-gray-400 italic mt-1">No sale</p>}
//                     </div>
//                   </div>
//                   {primaryVariant.price?.sale && Number(primaryVariant.price.sale) < Number(primaryVariant.price.base) && (
//                     <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
//                       <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
//                         {getDiscountPercentage(primaryVariant.price.base, primaryVariant.price.sale)}% OFF
//                       </span>
//                       <span className="text-xs text-green-700">Sale price is active</span>
//                     </div>
//                   )}

//                   {/* Inventory display */}
//                   <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
//                     <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Inventory</p>
//                     <div className="flex items-center gap-4 text-sm flex-wrap">
//                       <div>
//                         <span className="text-gray-500 text-xs">Stock: </span>
//                         <span className={`font-bold ${primaryVariant.inventory?.quantity === 0 ? "text-red-600" : primaryVariant.inventory?.quantity <= primaryVariant.inventory?.lowStockThreshold ? "text-amber-600" : "text-gray-900"}`}>
//                           {primaryVariant.inventory?.quantity ?? 0}
//                         </span>
//                       </div>
//                       <span className="text-gray-300">·</span>
//                       <div><span className="text-gray-500 text-xs">Alert at: </span><span className="font-medium">{primaryVariant.inventory?.lowStockThreshold ?? 5}</span></div>
//                       <span className="text-gray-300">·</span>
//                       <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${primaryVariant.inventory?.trackInventory !== false ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"}`}>
//                         {primaryVariant.inventory?.trackInventory !== false ? "Tracked" : "Untracked"}
//                       </span>
//                     </div>
//                   </div>

//                   {/* Attributes display */}
//                   {primaryVariant.attributes?.length > 0 && (
//                     <div>
//                       <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attributes</p>
//                       <div className="flex flex-wrap gap-2">
//                         {primaryVariant.attributes.map((attr, i) => (
//                           <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-200">
//                             {attr.key}: {attr.value}
//                           </span>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   <div className="pt-1">
//                     <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
//                       <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                       </svg>
//                       Click <strong>Edit Main Variant</strong> to update price, inventory, attributes or images.
//                       The <strong>Save Changes</strong> button below updates only product details (name, category, brand, etc.).
//                     </p>
//                   </div>
//                 </>
//               ) : (
//                 /* ── EDIT MODE (v0Edit is set) ── */
//                 <>
//                   {/* Price inputs */}
//                   <div>
//                     <label className="block text-sm font-semibold text-gray-700 mb-2">
//                       Price (₹) <span className="text-red-400">*</span>
//                     </label>
//                     <div className="grid grid-cols-2 gap-3">
//                       <div>
//                         <label className="text-xs text-gray-500 mb-1 block">Base Price</label>
//                         <input type="number" value={v0Edit.price.base}
//                           onChange={(e) => setV0Edit((p) => ({ ...p, price: { ...p.price, base: e.target.value } }))}
//                           className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-400"
//                           placeholder="29999" />
//                       </div>
//                       <div>
//                         <label className="text-xs text-gray-500 mb-1 block">Sale Price <span className="text-gray-400">(optional)</span></label>
//                         <input type="number" value={v0Edit.price.sale ?? ""}
//                           onChange={(e) => setV0Edit((p) => ({ ...p, price: { ...p.price, sale: e.target.value } }))}
//                           className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-400"
//                           placeholder="19999" />
//                       </div>
//                     </div>
//                     {v0Edit.price.base && v0Edit.price.sale &&
//                       Number(v0Edit.price.sale) < Number(v0Edit.price.base) && (
//                       <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 rounded-lg text-xs text-green-700 border border-green-200">
//                         💰 {getDiscountPercentage(v0Edit.price.base, v0Edit.price.sale)}% discount
//                       </div>
//                     )}
//                   </div>

//                   {/* Inventory inputs */}
//                   <div>
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="text-sm font-semibold text-gray-700">Inventory</label>
//                       <button type="button"
//                         onClick={() => setV0Edit((p) => ({ ...p, inventory: { ...p.inventory, trackInventory: !p.inventory.trackInventory } }))}
//                         className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${v0Edit.inventory.trackInventory ? "bg-indigo-500" : "bg-gray-300"}`}>
//                         <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${v0Edit.inventory.trackInventory ? "translate-x-5" : "translate-x-0.5"}`} />
//                       </button>
//                     </div>
//                     {v0Edit.inventory.trackInventory && (
//                       <div className="grid grid-cols-2 gap-3">
//                         <div>
//                           <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
//                           <input type="number" value={v0Edit.inventory.quantity}
//                             onChange={(e) => setV0Edit((p) => ({ ...p, inventory: { ...p.inventory, quantity: parseInt(e.target.value) || 0 } }))}
//                             className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
//                             placeholder="0" />
//                         </div>
//                         <div>
//                           <label className="text-xs text-gray-500 mb-1 block">Low Stock Alert</label>
//                           <input type="number" value={v0Edit.inventory.lowStockThreshold}
//                             onChange={(e) => setV0Edit((p) => ({ ...p, inventory: { ...p.inventory, lowStockThreshold: parseInt(e.target.value) || 5 } }))}
//                             className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
//                             placeholder="5" />
//                         </div>
//                       </div>
//                     )}
//                   </div>

//                   {/* Attributes inputs */}
//                   <div>
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="text-sm font-semibold text-gray-700">Attributes <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
//                       <button type="button" onClick={v0AddAttr}
//                         className="text-xs px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium">
//                         + Add
//                       </button>
//                     </div>
//                     <div className="space-y-2">
//                       {v0Edit.attributes.map((attr, i) => (
//                         <div key={i} className="flex gap-2 items-center">
//                           <input type="text" value={attr.key}
//                             onChange={(e) => v0UpdateAttr(i, "key", e.target.value)}
//                             className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400"
//                             placeholder="Key (e.g., Color)" />
//                           <input type="text" value={attr.value}
//                             onChange={(e) => v0UpdateAttr(i, "value", e.target.value)}
//                             className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400"
//                             placeholder="Value (e.g., Black)" />
//                           {v0Edit.attributes.length > 1 && (
//                             <button type="button" onClick={() => v0RemoveAttr(i)}
//                               className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50">
//                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                               </svg>
//                             </button>
//                           )}
//                         </div>
//                       ))}
//                     </div>
//                   </div>

//                   {/* Active toggle */}
//                   <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
//                     <span className="text-sm font-medium text-gray-700">Variant Active</span>
//                     <button type="button"
//                       onClick={() => setV0Edit((p) => ({ ...p, isActive: !p.isActive }))}
//                       className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${v0Edit.isActive ? "bg-indigo-500" : "bg-gray-300"}`}>
//                       <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${v0Edit.isActive ? "translate-x-6" : "translate-x-1"}`} />
//                     </button>
//                   </div>

//                   <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg p-2">
//                     💡 Images for main variant are managed in the <strong>Product Gallery</strong> panel on the right. Upload/reorder there, then click <strong>Update Main Variant</strong>.
//                   </p>
//                 </>
//               )}
//             </div>
//           </div>
//         )}

//         {/* ── CREATE MODE: barcode + price + inventory ─────────────────────── */}
//         {!isEditMode && (
//           <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
//             <div className="p-4 border-b border-gray-100 bg-gray-50">
//               <h3 className="font-semibold text-gray-900">Product Details</h3>
//               <p className="text-xs text-gray-500 mt-0.5">These become variants[0] on submit</p>
//             </div>
//             <div className="p-4 space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Barcode <span className="text-red-400">*</span>
//                 </label>
//                 <input type="text" value={formData.barcode || ""}
//                   onChange={(e) => setFormData((p) => ({ ...p, barcode: e.target.value }))}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
//                   placeholder="e.g., 1234567890128" maxLength={20} />
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Base Price (₹) <span className="text-red-400">*</span>
//                   </label>
//                   <input type="number" value={primaryBase}
//                     onChange={(e) => setFormData((p) => ({ ...p, price: { ...p.price, base: e.target.value } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder="29999" />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (₹)</label>
//                   <input type="number" value={primarySale}
//                     onChange={(e) => setFormData((p) => ({ ...p, price: { ...p.price, sale: e.target.value } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder="19999" />
//                 </div>
//               </div>
//               {primaryBase && primarySale && (
//                 <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-3">
//                   <span className="text-gray-400 line-through text-sm">{formatIndianRupee(primaryBase)}</span>
//                   <span className="text-lg font-bold text-gray-900">{formatIndianRupee(primarySale)}</span>
//                   {Number(primarySale) < Number(primaryBase) && (
//                     <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                       {getDiscountPercentage(primaryBase, primarySale)}% OFF
//                     </span>
//                   )}
//                 </div>
//               )}
//               <div className="pt-2 border-t border-gray-100">
//                 <div className="flex items-center justify-between mb-3">
//                   <span className="text-sm font-medium text-gray-700">Track Inventory</span>
//                   <button type="button"
//                     onClick={() => setFormData((p) => ({ ...p, inventory: { ...p.inventory, trackInventory: !p.inventory.trackInventory } }))}
//                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${primaryTrack ? "bg-blue-500" : "bg-gray-300"}`}>
//                     <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${primaryTrack ? "translate-x-6" : "translate-x-1"}`} />
//                   </button>
//                 </div>
//                 {primaryTrack && (
//                   <div className="grid grid-cols-2 gap-4">
//                     <div>
//                       <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
//                       <input type="number" value={primaryQty}
//                         onChange={(e) => setFormData((p) => ({ ...p, inventory: { ...p.inventory, quantity: parseInt(e.target.value) || 0 } }))}
//                         className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         placeholder="0" />
//                     </div>
//                     <div>
//                       <label className="block text-xs font-medium text-gray-600 mb-1">Low Stock Alert</label>
//                       <input type="number" value={primaryLow}
//                         onChange={(e) => setFormData((p) => ({ ...p, inventory: { ...p.inventory, lowStockThreshold: parseInt(e.target.value) || 5 } }))}
//                         className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         placeholder="5" />
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//         {/* ── Shipping ─────────────────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Shipping Details</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
//               <input type="number" step="0.1" value={formData.shipping?.weight ?? ""}
//                 onChange={(e) => setFormData((p) => ({ ...p, shipping: { ...p.shipping, weight: parseFloat(e.target.value) || 0 } }))}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                 placeholder="0.5" />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions (cm)</label>
//               <div className="grid grid-cols-3 gap-2">
//                 {["length", "width", "height"].map((dim) => (
//                   <input key={dim} type="number"
//                     value={formData.shipping?.dimensions?.[dim] ?? ""}
//                     onChange={(e) => setFormData((p) => ({ ...p, shipping: { ...p.shipping, dimensions: { ...p.shipping.dimensions, [dim]: parseFloat(e.target.value) } } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                     placeholder={dim[0].toUpperCase() + dim.slice(1)} />
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ── Product Attributes ────────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <h3 className="font-semibold text-gray-900">Product Attributes</h3>
//             <button type="button" onClick={onOpenAttributeModal}
//               className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">
//               + Add
//             </button>
//           </div>
//           <div className="p-4">
//             {!formData.attributes?.length ? (
//               <p className="text-center text-gray-400 py-4 text-sm">No attributes added yet</p>
//             ) : (
//               <div className="space-y-2">
//                 {formData.attributes.map((attr) => (
//                   <div key={attr.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
//                     <span className="text-sm">
//                       <span className="font-medium text-gray-700">{attr.key}:</span>{" "}
//                       <span className="text-gray-600">{attr.value}</span>
//                     </span>
//                     <button type="button" onClick={() => onRemoveAttribute(attr.id)}
//                       className="text-gray-400 hover:text-red-500">
//                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                       </svg>
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* ── Additional Variants (variants[1+]) ───────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <div>
//               <h3 className="font-semibold text-gray-900">
//                 {isEditMode ? "Additional Variants" : "Product Variants"}
//               </h3>
//               <p className="text-xs text-gray-500 mt-0.5">
//                 {isEditMode
//                   ? "variants[1+] · each has its own barcode, price, images"
//                   : "e.g., different colors or sizes — each needs a unique barcode"}
//               </p>
//             </div>
//             <button type="button" onClick={onOpenAddVariant} disabled={actionLoading && isEditMode}
//               className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 flex items-center gap-1.5 disabled:opacity-60">
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//               </svg>
//               Add Variant
//             </button>
//           </div>
//           <div className="p-4">
//             {actionError && isEditMode && (
//               <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
//                 <p className="text-red-700 text-sm">❌ {actionError}</p>
//               </div>
//             )}
//             {extraVariants.length === 0 ? (
//               <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
//                 <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                     d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
//                 </svg>
//                 <p className="text-gray-400 text-sm">
//                   {isEditMode ? "No additional variants — main variant is the card above" : "No variants yet"}
//                 </p>
//               </div>
//             ) : (
//               <div className="space-y-3">
//                 {extraVariants.map((variant, idx) => {
//                   const realIndex    = extraOffset + idx;
//                   const isActive     = variant.isActive !== false;
//                   const variantThumb = variant.images?.find((img) => img.isMain)?.url || variant.images?.[0]?.url || null;

//                   return (
//                     <div key={variant._id || variant.barcode || `v-${realIndex}`}
//                       className={`rounded-lg border-2 p-3 transition-all ${isActive ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-gray-50 opacity-60"}`}>
//                       <div className="flex items-start justify-between gap-3">
//                         <div className="flex items-start gap-3 flex-1 min-w-0">
//                           {variantThumb ? (
//                             <img src={variantThumb} alt=""
//                               className="w-10 h-10 rounded-lg object-cover border border-indigo-200 flex-shrink-0" />
//                           ) : (
//                             <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
//                               <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                                   d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                               </svg>
//                             </div>
//                           )}
//                           <div className="flex-1 min-w-0">
//                             {variant.attributes?.length > 0 && (
//                               <div className="flex flex-wrap gap-1.5 mb-1.5">
//                                 {variant.attributes.map((attr, aIdx) => (
//                                   <span key={aIdx} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
//                                     {attr.key}: {attr.value}
//                                   </span>
//                                 ))}
//                               </div>
//                             )}
//                             <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm">
//                               <span className="font-semibold text-gray-900">
//                                 ₹{Number(variant.price?.sale || 0).toLocaleString("en-IN")}
//                               </span>
//                               {variant.price?.sale != null && Number(variant.price.sale) > 0 && Number(variant.price.sale) < Number(variant.price.base) && (
//                                 <>
//                                   <span className="text-gray-400 line-through text-xs">₹{Number(variant.price.base).toLocaleString("en-IN")}</span>
//                                   <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
//                                     {getDiscountPercentage(variant.price.base, variant.price.sale)}% OFF
//                                   </span>
//                                 </>
//                               )}
//                               <span className="text-gray-400 text-xs">·</span>
//                               <span className="text-gray-600 text-xs">Qty: {variant.inventory?.quantity ?? 0}</span>
//                               {(variant.barcode || variant.barcode === 0) && (
//                                 <>
//                                   <span className="text-gray-400 text-xs">·</span>
//                                   <span className="text-xs font-mono text-gray-700 bg-white border border-gray-300 px-1.5 py-0.5 rounded">
//                                     📦 {variant.barcode}
//                                   </span>
//                                 </>
//                               )}
//                             </div>
//                           </div>
//                         </div>
//                         <div className="flex items-center gap-2 flex-shrink-0">
//                           <button type="button" onClick={() => onToggleVariantActive(realIndex)}
//                             disabled={actionLoading && isEditMode}
//                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${isActive ? "bg-indigo-500" : "bg-gray-300"}`}>
//                             <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isActive ? "translate-x-5" : "translate-x-1"}`} />
//                           </button>
//                           <button type="button" onClick={() => onOpenEditVariant(realIndex)}
//                             disabled={actionLoading && isEditMode}
//                             className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg disabled:opacity-50">
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                                 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                             </svg>
//                           </button>
//                           <button type="button" onClick={() => onDeleteVariant(realIndex)}
//                             disabled={actionLoading && isEditMode}
//                             className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                                 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                             </svg>
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         </div>

//       </div>

//       {/* ══════════════════════════ RIGHT COLUMN ═══════════════════════════════ */}
//       <div className="space-y-6">

//         {/* ── Product Gallery ──────────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Product Gallery</h3>
//             <p className="text-xs text-gray-500 mt-1">
//               {isEditMode ? "Main variant images · ★ = thumbnail · upload then click Update Main Variant" : "Up to 5 · drag to reorder · ★ = thumbnail"}
//             </p>
//           </div>
//           {mainGalleryImage && (
//             <div className="px-4 pt-4">
//               <div className="relative rounded-lg overflow-hidden border-2 border-blue-400">
//                 <img src={mainGalleryImage.url} alt="Main" className="w-full h-40 object-contain bg-gray-50" />
//                 <div className="absolute top-2 left-2">
//                   <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">★ MAIN</span>
//                 </div>
//               </div>
//             </div>
//           )}
//           <div className="p-4">
//             <label
//               className={`block w-full border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
//                 isDraggingZone ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
//               } ${galleryImages.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}`}
//               onDragOver={(e) => { e.preventDefault(); setIsDraggingZone(true); }}
//               onDragLeave={() => setIsDraggingZone(false)}
//               onDrop={(e) => { e.preventDefault(); setIsDraggingZone(false); handleGalleryUpload({ target: { files: e.dataTransfer.files } }); }}>
//               <input type="file" multiple accept="image/*" className="hidden"
//                 disabled={galleryImages.length >= 5} onChange={handleGalleryUpload} />
//               <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//               </svg>
//               <p className="text-sm text-gray-600">{galleryImages.length}/5 · click or drop</p>
//             </label>
//             {galleryImages.length > 0 && (
//               <div className="mt-3 space-y-2">
//                 {galleryImages.map((image, index) => (
//                   <div key={image.id || image.url} draggable
//                     onDragStart={(e) => handleGalleryDragStart(e, index)}
//                     onDragOver={(e)  => handleGalleryDragOver(e, index)}
//                     onDragEnd={() => setDraggedIdx(null)}
//                     className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
//                       image.isMain ? "border-blue-500 bg-blue-50" : "border-transparent bg-gray-50 hover:border-gray-200"
//                     }`}>
//                     <div className="w-10 h-10 rounded overflow-hidden bg-white flex-shrink-0 border border-gray-100">
//                       <img src={image.url} alt="" className="w-full h-full object-cover" />
//                     </div>
//                     <div className="flex-1 text-xs truncate text-gray-600">
//                       {image.isMain && <span className="text-blue-600 font-bold mr-1">★</span>}
//                       {image.name || "Uploaded image"}
//                     </div>
//                     <div className="flex items-center gap-1">
//                       {!image.isMain && (
//                         <button type="button" onClick={() => setMainGalleryImage(image.id || image.url)}
//                           title="Set as main thumbnail"
//                           className="p-1 text-gray-400 hover:text-blue-600">
//                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                               d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
//                           </svg>
//                         </button>
//                       )}
//                       <button type="button" onClick={() => removeGalleryImage(image.id || image.url)}
//                         className="p-1 text-gray-400 hover:text-red-600">
//                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                         </svg>
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//                 <p className="text-xs text-gray-400 text-center">Drag to reorder · ★ = thumbnail in table</p>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* ── Marketing & Visibility ────────────────────────────────────────── */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Marketing & Visibility</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div className="flex items-center justify-between">
//               <span className="text-sm font-medium text-gray-700">Featured Product</span>
//               <button type="button"
//                 onClick={() => setFormData((p) => ({ ...p, isFeatured: !p.isFeatured }))}
//                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isFeatured ? "bg-yellow-500" : "bg-gray-300"}`}>
//                 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isFeatured ? "translate-x-6" : "translate-x-1"}`} />
//               </button>
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
//               <select name="status" value={formData.status} onChange={handleInputChange}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
//                 <option value="draft">Draft</option>
//                 <option value="active">Active</option>
//                 <option value="archived">Archived</option>
//               </select>
//             </div>
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-gray-700">Sold Info</span>
//                 <button type="button"
//                   onClick={() => setFormData((p) => ({ ...p, soldInfo: { ...p.soldInfo, enabled: !p.soldInfo.enabled } }))}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.soldInfo?.enabled ? "bg-blue-500" : "bg-gray-300"}`}>
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.soldInfo?.enabled ? "translate-x-6" : "translate-x-1"}`} />
//                 </button>
//               </div>
//               {formData.soldInfo?.enabled && (
//                 <input type="number" value={formData.soldInfo?.count ?? 0}
//                   onChange={(e) => setFormData((p) => ({ ...p, soldInfo: { ...p.soldInfo, count: parseInt(e.target.value) || 0 } }))}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Number sold" />
//               )}
//             </div>
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-gray-700">FOMO</span>
//                 <button type="button"
//                   onClick={() => setFormData((p) => ({ ...p, fomo: { ...p.fomo, enabled: !p.fomo.enabled } }))}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.fomo?.enabled ? "bg-purple-500" : "bg-gray-300"}`}>
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.fomo?.enabled ? "translate-x-6" : "translate-x-1"}`} />
//                 </button>
//               </div>
//               {formData.fomo?.enabled && (
//                 <div className="space-y-2">
//                   <select value={formData.fomo.type}
//                     onChange={(e) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, type: e.target.value } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
//                     <option value="viewing_now">Viewing Now</option>
//                     <option value="product_left">Product Left</option>
//                     <option value="custom">Custom</option>
//                   </select>
//                   {formData.fomo.type === "viewing_now" && (
//                     <input type="number" value={formData.fomo.viewingNow ?? 0}
//                       onChange={(e) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, viewingNow: parseInt(e.target.value) || 0 } }))}
//                       className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Viewing now count" />
//                   )}
//                   {formData.fomo.type === "product_left" && (
//                     <input type="number" value={formData.fomo.productLeft ?? 0}
//                       onChange={(e) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, productLeft: parseInt(e.target.value) || 0 } }))}
//                       className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Items left" />
//                   )}
//                   {formData.fomo.type === "custom" && (
//                     <div className="flex gap-2">
//                       <input type="text" value={formData.fomo.customMessage ?? ""} readOnly
//                         className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" placeholder="Custom message" />
//                       <button type="button" onClick={() => onOpenCustomMessage(formData.fomo.customMessage || "")}
//                         className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                         </svg>
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default ProductFormBody;
// start again


// // Shared_components/ProductFormBody.jsx
// //
// // BARCODE RULES:
// //  • Product-level barcode: optional field in Essential Details (stored locally,
// //    NOT sent to backend — backend doesn't have a product.barcode field)
// //  • Variant-level barcode: REQUIRED by backend for each variant
// //    Shown in variant list, managed inside VariantModal
// //
// // productSlug prop (from EditProductModal only):
// //  • When set → variant DELETE hits API directly via deleteVariantFromProduct thunk
// //  • When not set (create flow) → delegates to parent's onDeleteVariant (local state)

// import React, { useState } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { deleteVariantFromProduct } from '../ADMIN_REDUX_MANAGEMENT/adminProductsSlice';

// const ProductFormBody = ({
//   formData,
//   setFormData,
//   categories,
//   brands,
//   onOpenCategoryModal,
//   onOpenBrandModal,
//   onOpenAttributeModal,
//   onOpenCustomMessage,
//   onOpenAddVariant,
//   onOpenEditVariant,
//   onRemoveAttribute,
//   onDeleteVariant,        // create mode: local state
//   onToggleVariantActive,
//   formatIndianRupee,
//   getDiscountPercentage,
//   productSlug,            // edit mode: enables direct API calls
// }) => {

//   const dispatch = useDispatch();
//   const { actionLoading, actionError } = useSelector(s => s.adminProducts);

//   // Image state
//   const [uploadProgress,    setUploadProgress]    = useState({});
//   const [draggedImageIndex, setDraggedImageIndex] = useState(null);
//   const [isDragging,        setIsDragging]        = useState(false);

//   // ── Image handlers ────────────────────────────────────────────
//   const handleImageUpload = (e) => {
//     const files    = Array.from(e.target.files);
//     const newImages = [...formData.images];
//     files.forEach((file, index) => {
//       if (newImages.length < 5) {
//         const reader  = new FileReader();
//         const imageId = `img-${Date.now()}-${index}`;
//         setUploadProgress(prev => ({ ...prev, [imageId]: 0 }));
//         reader.onloadstart = () => setUploadProgress(prev => ({ ...prev, [imageId]: 10 }));
//         reader.onprogress  = (p) => {
//           if (p.lengthComputable)
//             setUploadProgress(prev => ({ ...prev, [imageId]: (p.loaded / p.total) * 90 + 10 }));
//         };
//         reader.onloadend = () => {
//           setUploadProgress(prev => ({ ...prev, [imageId]: 100 }));
//           setTimeout(() => setUploadProgress(prev => { const n = { ...prev }; delete n[imageId]; return n; }), 500);
//           newImages.push({ id: imageId, url: reader.result, file, name: file.name, size: file.size, isMain: newImages.length === 0 });
//           setFormData(prev => ({ ...prev, images: [...newImages] }));
//         };
//         reader.readAsDataURL(file);
//       }
//     });
//   };

//   const removeImage = (imageId) => {
//     const newImages = formData.images.filter(img => img.id !== imageId);
//     if (formData.images.find(img => img.id === imageId)?.isMain && newImages.length > 0) newImages[0].isMain = true;
//     setFormData(prev => ({ ...prev, images: newImages }));
//   };

//   const setMainImage = (imageId) =>
//     setFormData(prev => ({ ...prev, images: prev.images.map(img => ({ ...img, isMain: img.id === imageId })) }));

//   const handleImageDragStart = (e, index) => { setDraggedImageIndex(index); e.dataTransfer.effectAllowed = 'move'; };
//   const handleImageDragOver  = (e, index) => {
//     e.preventDefault();
//     if (draggedImageIndex === null || draggedImageIndex === index) return;
//     const imgs   = [...formData.images];
//     const dragged = imgs[draggedImageIndex];
//     imgs.splice(draggedImageIndex, 1);
//     imgs.splice(index, 0, dragged);
//     imgs.forEach((img, idx) => { img.isMain = idx === 0; });
//     setFormData(prev => ({ ...prev, images: imgs }));
//     setDraggedImageIndex(index);
//   };
//   const handleImageDragEnd = () => { setDraggedImageIndex(null); setIsDragging(false); };

//   // ── Input change handler ──────────────────────────────────────
//   const handleInputChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     if (name.includes('shipping.dimensions.')) {
//       const dim = name.split('.')[2];
//       setFormData(prev => ({ ...prev, shipping: { ...prev.shipping, dimensions: { ...prev.shipping.dimensions, [dim]: value } } }));
//     } else if (name.includes('.')) {
//       const [parent, child] = name.split('.');
//       setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: type === 'checkbox' ? checked : value } }));
//     } else {
//       setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
//     }
//   };

//   // ── Variant delete ────────────────────────────────────────────
//   // Edit mode (productSlug set): DELETE /admin/products/:slug/variants { barcode }
//   // Create mode: local state via onDeleteVariant
//   const handleDeleteVariant = (index) => {
//     const variant = formData.variants[index];

//     if (productSlug) {
//       // EDIT MODE — hit real API
//       if (!variant?.barcode && variant?.barcode !== 0) {
//         alert("Cannot delete — variant has no barcode");
//         return;
//       }
//       if (!window.confirm(`Delete variant with barcode ${variant.barcode}? This cannot be undone.`)) return;

//       dispatch(deleteVariantFromProduct({ slug: productSlug, barcode: variant.barcode }))
//         .unwrap()
//         .then(({ product: updatedProduct }) => {
//           // Sync formData variants from backend response
//           setFormData(prev => ({
//             ...prev,
//             variants: (updatedProduct.variants || []).map((v) => ({
//               ...v,
//               price:  { base: v.price?.base ?? '', sale: v.price?.sale ?? '' },
//               images: v.images || [],
//             })),
//           }));
//         })
//         .catch((err) => {
//           alert(`Failed to delete variant: ${err}`);
//         });
//     } else {
//       // CREATE MODE — local state
//       onDeleteVariant(index);
//     }
//   };

//   return (
//     <div className="grid grid-cols-3 gap-6">

//       {/* ════════════ LEFT COLUMN ════════════ */}
//       <div className="col-span-2 space-y-6">

//         {/* Essential Details */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Essential Details</h3>
//           </div>
//           <div className="p-4 space-y-4">

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Product Name <span className="text-red-400">*</span>
//                 </label>
//                 <input
//                   type="text" value={formData.name}
//                   onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g., Premium Wireless Headphones" required />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Title <span className="text-red-400">*</span>
//                 </label>
//                 <input
//                   type="text" name="title" value={formData.title}
//                   onChange={handleInputChange}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g., Noise Cancelling Headphones" required />
//               </div>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Description
//               </label>
//               <textarea
//                 name="description" value={formData.description} onChange={handleInputChange}
//                 rows="3"
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none"
//                 placeholder="Describe your product in detail..." />
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               {/* Category */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
//                 <div className="flex gap-2">
//                   <select name="category" value={formData.category} onChange={handleInputChange}
//                     className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
//                     <option value="">Select category</option>
//                     {categories.map(cat => (
//                       <option key={cat._id} value={cat._id}>{cat.name}</option>
//                     ))}
//                   </select>
//                   <button type="button" onClick={onOpenCategoryModal} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>
//               {/* Brand */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
//                 <div className="flex gap-2">
//                   <select name="brand" value={formData.brand} onChange={handleInputChange}
//                     className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
//                     {brands.map(brand => (
//                       <option key={brand} value={brand}>{brand}</option>
//                     ))}
//                   </select>
//                   <button type="button" onClick={onOpenBrandModal} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {/* ── PRODUCT-LEVEL BARCODE ──────────────────────────
//                 Optional. Stored locally in formData.
//                 NOT sent to backend (backend has no product.barcode field).
//                 Useful for internal reference / future API.
//                 Variant-level barcodes are separate (inside each variant).
//             ─────────────────────────────────────────────────── */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Product Barcode
//                 <span className="ml-2 text-xs font-normal text-gray-400">(optional — internal reference, separate from variant barcodes)</span>
//               </label>
//               <div className="relative">
//                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
//                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                       d="M3 5h2M3 9h2M3 13h2M3 17h2M3 19h2 M7 5v14M10 5v14M13 5v4M13 11v8 M16 5v14M19 5h2M19 9h2M19 13h2M19 17h2M19 19h2" />
//                   </svg>
//                 </div>
//                 <input
//                   type="text" value={formData.barcode || ''}
//                   onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
//                   className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono tracking-widest text-sm"
//                   placeholder="e.g., 1234567890128"
//                   maxLength={20} />
//                 {formData.barcode && (
//                   <button type="button"
//                     onClick={() => setFormData(prev => ({ ...prev, barcode: '' }))}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors">
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                   </button>
//                 )}
//               </div>
//               {formData.barcode && (
//                 <p className="text-xs text-blue-600 mt-1 font-mono">📦 {formData.barcode}</p>
//               )}
//             </div>

//           </div>
//         </div>

//         {/* Pricing */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Pricing (₹ Indian Rupees)</h3>
//           </div>
//           <div className="p-4">
//             <div className="grid grid-cols-3 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">MRP / Base Price (₹)</label>
//                 <input type="number" value={formData.price.base}
//                   onChange={(e) => setFormData({ ...formData, price: { ...formData.price, base: e.target.value } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="29999" />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (₹)</label>
//                 <input type="number" value={formData.price.sale}
//                   onChange={(e) => setFormData({ ...formData, price: { ...formData.price, sale: e.target.value } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="19999" />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Cost Price (₹)</label>
//                 <input type="number" value={formData.price.costPrice}
//                   onChange={(e) => setFormData({ ...formData, price: { ...formData.price, costPrice: e.target.value } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="15000" />
//               </div>
//             </div>
//             {formData.price.base && formData.price.sale && (
//               <div className="mt-4 p-3 bg-blue-50 rounded-lg">
//                 <p className="text-sm text-gray-600 mb-1">Price Preview:</p>
//                 <div className="flex items-center space-x-3">
//                   <span className="text-gray-400 line-through">{formatIndianRupee(formData.price.base)}</span>
//                   <span className="text-lg font-bold text-gray-900">{formatIndianRupee(formData.price.sale)}</span>
//                   {Number(formData.price.sale) < Number(formData.price.base) && (
//                     <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                       {getDiscountPercentage(formData.price.base, formData.price.sale)}% OFF
//                     </span>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Inventory */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <h3 className="font-semibold text-gray-900">Inventory Management</h3>
//             <button type="button"
//               onClick={() => setFormData(prev => ({ ...prev, inventory: { ...prev.inventory, trackInventory: !prev.inventory.trackInventory } }))}
//               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.inventory.trackInventory ? 'bg-blue-500' : 'bg-gray-300'}`}>
//               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.inventory.trackInventory ? 'translate-x-6' : 'translate-x-1'}`} />
//             </button>
//           </div>
//           {formData.inventory.trackInventory && (
//             <div className="p-4">
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Quantity in Stock</label>
//                   <input type="number" value={formData.inventory.quantity}
//                     onChange={(e) => setFormData({ ...formData, inventory: { ...formData.inventory, quantity: parseInt(e.target.value) || 0 } })}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder="0" />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Low Stock Threshold</label>
//                   <input type="number" value={formData.inventory.lowStockThreshold}
//                     onChange={(e) => setFormData({ ...formData, inventory: { ...formData.inventory, lowStockThreshold: parseInt(e.target.value) || 5 } })}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder="5" />
//                 </div>
//               </div>
//               <p className="text-xs text-gray-500 mt-2">Low stock alert shows when quantity falls below threshold</p>
//             </div>
//           )}
//         </div>

//         {/* Shipping */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Shipping Details</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
//               <input type="number" step="0.1" value={formData.shipping.weight ?? ''}
//                 onChange={(e) => setFormData({ ...formData, shipping: { ...formData.shipping, weight: parseFloat(e.target.value) || 0 } })}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                 placeholder="0.5" />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions (cm)</label>
//               <div className="grid grid-cols-3 gap-2">
//                 {['length', 'width', 'height'].map(dim => (
//                   <input key={dim} type="number"
//                     value={formData.shipping.dimensions?.[dim] ?? ''}
//                     onChange={(e) => setFormData({ ...formData, shipping: { ...formData.shipping, dimensions: { ...formData.shipping.dimensions, [dim]: parseFloat(e.target.value) } } })}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder={dim.charAt(0).toUpperCase() + dim.slice(1)} />
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Attributes */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <h3 className="font-semibold text-gray-900">Product Attributes</h3>
//             <button type="button" onClick={onOpenAttributeModal} className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">
//               + Add Attribute
//             </button>
//           </div>
//           <div className="p-4">
//             {formData.attributes.length === 0 ? (
//               <p className="text-center text-gray-500 py-4">No attributes added yet</p>
//             ) : (
//               <div className="space-y-2">
//                 {formData.attributes.map((attr) => (
//                   <div key={attr.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
//                     <div className="flex items-center space-x-2">
//                       <span className="text-sm font-medium text-gray-700">{attr.key}:</span>
//                       <span className="text-sm text-gray-600">{attr.value}</span>
//                     </div>
//                     <button type="button" onClick={() => onRemoveAttribute(attr.id)} className="text-gray-400 hover:text-red-500">
//                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                       </svg>
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Variants */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <div>
//               <h3 className="font-semibold text-gray-900">Product Variants</h3>
//               <p className="text-xs text-gray-500 mt-0.5">
//                 {productSlug
//                   ? 'Add → API immediately • Edit → updates price & inventory • Delete → API immediately'
//                   : 'e.g., different colors, sizes — each needs a unique barcode'}
//               </p>
//             </div>
//             <button type="button" onClick={onOpenAddVariant} disabled={actionLoading && !!productSlug}
//               className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed">
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//               </svg>
//               Add Variant
//             </button>
//           </div>
//           <div className="p-4">

//             {/* Action error in edit mode */}
//             {actionError && productSlug && (
//               <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
//                 <p className="text-red-700 text-sm font-medium">❌ {actionError}</p>
//               </div>
//             )}

//             {formData.variants.length === 0 ? (
//               <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
//                 <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
//                 </svg>
//                 <p className="text-gray-500 text-sm">No variants added yet</p>
//                 <p className="text-gray-400 text-xs mt-1">Click "Add Variant" — each variant needs a unique barcode</p>
//               </div>
//             ) : (
//               <div className="space-y-3">
//                 {formData.variants.map((variant, index) => (
//                   <div
//                     key={variant._id || variant.barcode || index}
//                     className={`rounded-lg border-2 p-3 transition-all ${
//                       variant.isActive !== false ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-gray-50 opacity-60'
//                     }`}
//                   >
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="flex-1 min-w-0">

//                         {/* Attribute badges */}
//                         <div className="flex flex-wrap gap-1.5 mb-2">
//                           {(variant.attributes || []).map((attr, aIdx) => (
//                             <span key={aIdx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
//                               {attr.key}: {attr.value}
//                             </span>
//                           ))}
//                         </div>

//                         {/* Price row */}
//                         <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm">
//                           <span className="font-semibold text-gray-900">
//                             ₹{Number(variant.price?.base || 0).toLocaleString('en-IN')}
//                           </span>
//                           {variant.price?.sale && Number(variant.price.sale) > 0 && (
//                             <>
//                               <span className="text-gray-400 line-through text-xs">
//                                 ₹{Number(variant.price.sale).toLocaleString('en-IN')}
//                               </span>
//                               {Number(variant.price.sale) < Number(variant.price.base) && (
//                                 <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
//                                   {getDiscountPercentage(variant.price.base, variant.price.sale)}% OFF
//                                 </span>
//                               )}
//                             </>
//                           )}
//                           <span className="text-gray-400 text-xs">•</span>
//                           <span className="text-gray-600 text-xs">Qty: {variant.inventory?.quantity ?? 0}</span>

//                           {/* VARIANT BARCODE BADGE — always visible */}
//                           {(variant.barcode || variant.barcode === 0) && (
//                             <>
//                               <span className="text-gray-400 text-xs">•</span>
//                               <span className="text-xs font-mono text-gray-700 bg-white border border-gray-300 px-1.5 py-0.5 rounded">
//                                 📦 {variant.barcode}
//                               </span>
//                             </>
//                           )}
//                           {/* Missing barcode warning (create mode only) */}
//                           {!variant.barcode && variant.barcode !== 0 && !productSlug && (
//                             <>
//                               <span className="text-gray-400 text-xs">•</span>
//                               <span className="text-xs text-red-500 font-medium bg-red-50 px-1.5 py-0.5 rounded">⚠️ No barcode</span>
//                             </>
//                           )}

//                           {/* SKU */}
//                           {variant.sku && (
//                             <>
//                               <span className="text-gray-400 text-xs">•</span>
//                               <span className="text-xs font-mono text-gray-400">SKU: {variant.sku}</span>
//                             </>
//                           )}
//                         </div>

//                         {/* Image thumbnails */}
//                         {variant.images && variant.images.length > 0 && (
//                           <div className="flex items-center gap-2 mt-2">
//                             {variant.images.slice(0, 3).map((img, iIdx) => (
//                               <div key={iIdx} className="w-8 h-8 rounded overflow-hidden border border-indigo-200">
//                                 <img src={img.url} alt="" className="w-full h-full object-cover" />
//                               </div>
//                             ))}
//                             {variant.images.length > 3 && (
//                               <span className="text-xs text-gray-400">+{variant.images.length - 3} more</span>
//                             )}
//                           </div>
//                         )}
//                       </div>

//                       {/* Actions */}
//                       <div className="flex items-center gap-2 flex-shrink-0">
//                         {/* Active toggle */}
//                         <button type="button"
//                           onClick={() => onToggleVariantActive(index)}
//                           className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
//                             variant.isActive !== false ? 'bg-indigo-500' : 'bg-gray-300'
//                           }`}
//                           title={variant.isActive !== false ? 'Active' : 'Inactive'}>
//                           <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
//                             variant.isActive !== false ? 'translate-x-5' : 'translate-x-1'
//                           }`} />
//                         </button>

//                         {/* Edit */}
//                         <button type="button"
//                           onClick={() => onOpenEditVariant(index)}
//                           disabled={actionLoading && !!productSlug}
//                           className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
//                           title="Edit variant">
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                           </svg>
//                         </button>

//                         {/* Delete */}
//                         <button type="button"
//                           onClick={() => handleDeleteVariant(index)}
//                           disabled={actionLoading && !!productSlug}
//                           className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
//                           title="Delete variant">
//                           {actionLoading && productSlug ? (
//                             <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
//                           ) : (
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                             </svg>
//                           )}
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 ))}

//                 <p className="text-xs text-gray-400 text-center pt-1">
//                   {formData.variants.length} variant{formData.variants.length !== 1 ? 's' : ''}
//                   {productSlug && <span className="ml-2 text-indigo-400">• Add/delete saves immediately to DB</span>}
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>

//       </div>

//       {/* ════════════ RIGHT COLUMN ════════════ */}
//       <div className="space-y-6">

//         {/* Product Gallery */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Product Gallery</h3>
//             <p className="text-xs text-gray-500 mt-1">Upload up to 5 images (drag to reorder)</p>
//           </div>
//           <div className="p-4">
//             <label
//               className={`block w-full border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
//               onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
//               onDragLeave={() => setIsDragging(false)}
//               onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleImageUpload({ target: { files: e.dataTransfer.files } }); }}>
//               <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" disabled={formData.images.length >= 5} />
//               <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//               </svg>
//               <p className="text-sm text-gray-600">{formData.images.length}/5 images</p>
//             </label>
//             {formData.images.length > 0 && (
//               <div className="mt-4 space-y-2">
//                 {formData.images.map((image, index) => (
//                   <div key={image.id} draggable
//                     onDragStart={(e) => handleImageDragStart(e, index)}
//                     onDragOver={(e)  => handleImageDragOver(e, index)}
//                     onDragEnd={handleImageDragEnd}
//                     className={`flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border-2 cursor-grab ${image.isMain ? 'border-blue-500' : 'border-transparent'}`}>
//                     <div className="w-12 h-12 rounded overflow-hidden bg-white flex-shrink-0">
//                       <img src={image.url} alt="" className="w-full h-full object-cover" />
//                     </div>
//                     <div className="flex-1 text-xs truncate">{image.name}</div>
//                     <div className="flex items-center space-x-1 flex-shrink-0">
//                       {!image.isMain && (
//                         <button type="button" onClick={() => setMainImage(image.id)} className="p-1 text-gray-500 hover:text-blue-600" title="Make main">
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
//                           </svg>
//                         </button>
//                       )}
//                       <button type="button" onClick={() => removeImage(image.id)} className="p-1 text-gray-500 hover:text-red-600">
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                         </svg>
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Marketing & Visibility */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Marketing & Visibility</h3>
//           </div>
//           <div className="p-4 space-y-4">

//             {/* Featured */}
//             <div className="flex items-center justify-between">
//               <span className="text-sm font-medium text-gray-700">Featured Product</span>
//               <button type="button"
//                 onClick={() => setFormData(prev => ({ ...prev, isFeatured: !prev.isFeatured }))}
//                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isFeatured ? 'bg-yellow-500' : 'bg-gray-300'}`}>
//                 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
//               </button>
//             </div>

//             {/* Status */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
//               <select name="status" value={formData.status} onChange={handleInputChange}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
//                 <option value="draft">Draft</option>
//                 <option value="active">Active</option>
//                 <option value="archived">Archived</option>
//               </select>
//             </div>

//             {/* Sold Info */}
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-gray-700">Sold Info</span>
//                 <button type="button"
//                   onClick={() => setFormData(prev => ({ ...prev, soldInfo: { ...prev.soldInfo, enabled: !prev.soldInfo.enabled } }))}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.soldInfo.enabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.soldInfo.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
//                 </button>
//               </div>
//               {formData.soldInfo.enabled && (
//                 <input type="number" value={formData.soldInfo.count}
//                   onChange={(e) => setFormData(prev => ({ ...prev, soldInfo: { ...prev.soldInfo, count: parseInt(e.target.value) || 0 } }))}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                   placeholder="Number sold" />
//               )}
//             </div>

//             {/* FOMO */}
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-gray-700">FOMO</span>
//                 <button type="button"
//                   onClick={() => setFormData(prev => ({ ...prev, fomo: { ...prev.fomo, enabled: !prev.fomo.enabled } }))}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.fomo.enabled ? 'bg-purple-500' : 'bg-gray-300'}`}>
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.fomo.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
//                 </button>
//               </div>
//               {formData.fomo.enabled && (
//                 <div className="space-y-2">
//                   <select value={formData.fomo.type}
//                     onChange={(e) => setFormData(prev => ({ ...prev, fomo: { ...prev.fomo, type: e.target.value } }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
//                     <option value="viewing_now">Viewing Now</option>
//                     <option value="product_left">Product Left</option>
//                     <option value="custom">Custom</option>
//                   </select>
//                   {formData.fomo.type === 'viewing_now' && (
//                     <input type="number" value={formData.fomo.viewingNow}
//                       onChange={(e) => setFormData(prev => ({ ...prev, fomo: { ...prev.fomo, viewingNow: parseInt(e.target.value) || 0 } }))}
//                       className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                       placeholder="Viewing now" />
//                   )}
//                   {formData.fomo.type === 'product_left' && (
//                     <input type="number" value={formData.fomo.productLeft}
//                       onChange={(e) => setFormData(prev => ({ ...prev, fomo: { ...prev.fomo, productLeft: parseInt(e.target.value) || 0 } }))}
//                       className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                       placeholder="Items left" />
//                   )}
//                   {formData.fomo.type === 'custom' && (
//                     <div className="flex gap-2">
//                       <input type="text" value={formData.fomo.customMessage} readOnly
//                         placeholder="Custom message"
//                         className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
//                       <button type="button" onClick={() => onOpenCustomMessage(formData.fomo.customMessage || '')}
//                         className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                         </svg>
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default ProductFormBody;

// ADD THE BARCODE API INTEGRATION DOWN CODE JUST HAVE INPUT FIELDS

// import React, { useState } from 'react';

// // ============================================================
// // ProductFormBody — receives formData + setFormData from parent
// // Owns its own image upload state (uploadProgress, draggedImageIndex, isDragging)
// // All modal open triggers passed as props from parent
// // ============================================================

// const ProductFormBody = ({
//   formData,
//   setFormData,
//   categories,
//   brands,
//   onOpenCategoryModal,
//   onOpenBrandModal,
//   onOpenAttributeModal,
//   onOpenCustomMessage,
//   onOpenAddVariant,
//   onOpenEditVariant,
//   onRemoveAttribute,
//   onDeleteVariant,
//   onToggleVariantActive,
//   formatIndianRupee,
//   getDiscountPercentage,
// }) => {

//   // ================= IMAGE STATE =================
//   const [uploadProgress, setUploadProgress] = useState({});
//   const [draggedImageIndex, setDraggedImageIndex] = useState(null);
//   const [isDragging, setIsDragging] = useState(false);

//   // ================= IMAGE HANDLING =================
//   const handleImageUpload = (e) => {
//     const files = Array.from(e.target.files);
//     const newImages = [...formData.images];

//     files.forEach((file, index) => {
//       if (newImages.length < 5) {
//         const reader = new FileReader();
//         const imageId = `img-${Date.now()}-${index}`;

//         setUploadProgress(prev => ({ ...prev, [imageId]: 0 }));

//         reader.onloadstart = () => {
//           setUploadProgress(prev => ({ ...prev, [imageId]: 10 }));
//         };

//         reader.onprogress = (progress) => {
//           if (progress.lengthComputable) {
//             const percent = (progress.loaded / progress.total) * 90 + 10;
//             setUploadProgress(prev => ({ ...prev, [imageId]: percent }));
//           }
//         };

//         reader.onloadend = () => {
//           setUploadProgress(prev => ({ ...prev, [imageId]: 100 }));
//           setTimeout(() => {
//             setUploadProgress(prev => {
//               const newProgress = { ...prev };
//               delete newProgress[imageId];
//               return newProgress;
//             });
//           }, 500);

//           newImages.push({
//             id: imageId,
//             url: reader.result,
//             file: file,
//             name: file.name,
//             size: file.size,
//             isMain: newImages.length === 0
//           });

//           setFormData(prev => ({ ...prev, images: newImages }));
//         };

//         reader.readAsDataURL(file);
//       }
//     });
//   };

//   const removeImage = (imageId) => {
//     const newImages = formData.images.filter(img => img.id !== imageId);
//     if (formData.images.find(img => img.id === imageId)?.isMain && newImages.length > 0) {
//       newImages[0].isMain = true;
//     }
//     setFormData(prev => ({ ...prev, images: newImages }));
//   };

//   const setMainImage = (imageId) => {
//     setFormData(prev => ({
//       ...prev,
//       images: prev.images.map(img => ({ ...img, isMain: img.id === imageId }))
//     }));
//   };

//   const handleImageDragStart = (e, index) => {
//     setDraggedImageIndex(index);
//     e.dataTransfer.effectAllowed = 'move';
//   };

//   const handleImageDragOver = (e, index) => {
//     e.preventDefault();
//     if (draggedImageIndex === null || draggedImageIndex === index) return;

//     const newImages = [...formData.images];
//     const draggedImage = newImages[draggedImageIndex];
//     newImages.splice(draggedImageIndex, 1);
//     newImages.splice(index, 0, draggedImage);
//     newImages.forEach((img, idx) => { img.isMain = idx === 0; });

//     setFormData(prev => ({ ...prev, images: newImages }));
//     setDraggedImageIndex(index);
//   };

//   const handleImageDragEnd = () => {
//     setDraggedImageIndex(null);
//     setIsDragging(false);
//   };

//   // ================= handleInputChange =================
//   const handleInputChange = (e) => {
//     const { name, value, type, checked } = e.target;

//     if (name.includes('.')) {
//       const [parent, child] = name.split('.');
//       setFormData(prev => ({
//         ...prev,
//         [parent]: { ...prev[parent], [child]: type === 'checkbox' ? checked : value }
//       }));
//     } else if (name.includes('shipping.dimensions.')) {
//       const dimension = name.split('.')[2];
//       setFormData(prev => ({
//         ...prev,
//         shipping: {
//           ...prev.shipping,
//           dimensions: { ...prev.shipping.dimensions, [dimension]: value }
//         }
//       }));
//     } else {
//       setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
//     }
//   };

//   // ============================================================
//   return (
//     <div className="grid grid-cols-3 gap-6">

//       {/* ===== LEFT COLUMN ===== */}
//       <div className="col-span-2 space-y-6">

//         {/* Essential Details Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Essential Details</h3>
//           </div>
//           <div className="p-4 space-y-4">

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Product Name <span className="text-red-400">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   value={formData.name}
//                   onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g., Premium Wireless Headphones"
//                   required
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Title <span className="text-red-400">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="title"
//                   value={formData.title}
//                   onChange={handleInputChange}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g., Noise Cancelling Headphones"
//                   required
//                 />
//               </div>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Description <span className="text-red-400">*</span>
//               </label>
//               <textarea
//                 name="description"
//                 value={formData.description}
//                 onChange={handleInputChange}
//                 rows="3"
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none"
//                 placeholder="Describe your product in detail..."
//                 required
//               />
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
//                 <div className="flex gap-2">
//                   <select
//                     name="category"
//                     value={formData.category}
//                     onChange={handleInputChange}
//                     className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   >
//                     <option value="">Select category</option>
//                     {categories.map(cat => (
//                       <option key={cat._id} value={cat._id}>{cat.name}</option>
//                     ))}
//                   </select>
//                   <button
//                     type="button"
//                     onClick={onOpenCategoryModal}
//                     className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
//                   >
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
//                 <div className="flex gap-2">
//                   <select
//                     name="brand"
//                     value={formData.brand}
//                     onChange={handleInputChange}
//                     className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   >
//                     {brands.map(brand => (
//                       <option key={brand} value={brand}>{brand}</option>
//                     ))}
//                   </select>
//                   <button
//                     type="button"
//                     onClick={onOpenBrandModal}
//                     className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
//                   >
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {/* ── Product-level Barcode ── */}
//             {/* LOCAL ONLY: not sent to backend. When API is ready, add
//                 fd.append("barcode", formData.barcode || "") in buildProductFormData */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Product Barcode
//                 <span className="ml-2 text-xs font-normal text-gray-400">(optional — stored locally)</span>
//               </label>
//               <div className="relative">
//                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
//                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                       d="M3 5h2M3 9h2M3 13h2M3 17h2M3 19h2
//                          M7 5v14M10 5v14M13 5v4M13 11v8
//                          M16 5v14M19 5h2M19 9h2M19 13h2M19 17h2M19 19h2" />
//                   </svg>
//                 </div>
//                 <input
//                   type="text"
//                   value={formData.barcode || ''}
//                   onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
//                   className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono tracking-widest text-sm"
//                   placeholder="e.g., 1234567890128"
//                   maxLength={20}
//                 />
//                 {formData.barcode && (
//                   <button
//                     type="button"
//                     onClick={() => setFormData(prev => ({ ...prev, barcode: '' }))}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                   </button>
//                 )}
//               </div>
//               {formData.barcode && (
//                 <p className="text-xs text-blue-600 mt-1 font-mono">📦 {formData.barcode}</p>
//               )}
//             </div>

//           </div>
//         </div>

//         {/* Pricing Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Pricing (₹ Indian Rupees)</h3>
//           </div>
//           <div className="p-4">
//             <div className="grid grid-cols-3 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">MRP / Base Price (₹)</label>
//                 <input
//                   type="number"
//                   value={formData.price.base}
//                   onChange={(e) => setFormData({ ...formData, price: { ...formData.price, base: e.target.value } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="29999"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (₹)</label>
//                 <input
//                   type="number"
//                   value={formData.price.sale}
//                   onChange={(e) => setFormData({ ...formData, price: { ...formData.price, sale: e.target.value } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="19999"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Cost Price (₹)</label>
//                 <input
//                   type="number"
//                   value={formData.price.costPrice}
//                   onChange={(e) => setFormData({ ...formData, price: { ...formData.price, costPrice: e.target.value } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="15000"
//                 />
//               </div>
//             </div>

//             {formData.price.base && formData.price.sale && (
//               <div className="mt-4 p-3 bg-blue-50 rounded-lg">
//                 <p className="text-sm text-gray-600 mb-1">Price Preview:</p>
//                 <div className="flex items-center space-x-3">
//                   <span className="text-gray-400 line-through">{formatIndianRupee(formData.price.base)}</span>
//                   <span className="text-lg font-bold text-gray-900">{formatIndianRupee(formData.price.sale)}</span>
//                   {formData.price.sale < formData.price.base && (
//                     <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                       {getDiscountPercentage(formData.price.base, formData.price.sale)}% OFF
//                     </span>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Inventory Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <h3 className="font-semibold text-gray-900">Inventory Management</h3>
//             <button
//               type="button"
//               onClick={() => setFormData(prev => ({
//                 ...prev,
//                 inventory: { ...prev.inventory, trackInventory: !prev.inventory.trackInventory }
//               }))}
//               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
//                 formData.inventory.trackInventory ? 'bg-blue-500' : 'bg-gray-300'
//               }`}
//             >
//               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
//                 formData.inventory.trackInventory ? 'translate-x-6' : 'translate-x-1'
//               }`} />
//             </button>
//           </div>
//           {formData.inventory.trackInventory && (
//             <div className="p-4">
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Quantity in Stock</label>
//                   <input
//                     type="number"
//                     value={formData.inventory.quantity}
//                     onChange={(e) => setFormData({ ...formData, inventory: { ...formData.inventory, quantity: parseInt(e.target.value) || 0 } })}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder="0"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Low Stock Threshold</label>
//                   <input
//                     type="number"
//                     value={formData.inventory.lowStockThreshold}
//                     onChange={(e) => setFormData({ ...formData, inventory: { ...formData.inventory, lowStockThreshold: parseInt(e.target.value) || 5 } })}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder="5"
//                   />
//                 </div>
//               </div>
//               <p className="text-xs text-gray-500 mt-2">Low stock alert will show when quantity is below threshold</p>
//             </div>
//           )}
//         </div>

//         {/* Shipping Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Shipping Details</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
//               <input
//                 type="number"
//                 step="0.1"
//                 value={formData.shipping.weight ?? ''}
//                 onChange={(e) => setFormData({ ...formData, shipping: { ...formData.shipping, weight: parseFloat(e.target.value) || 0 } })}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                 placeholder="0.5"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions (cm)</label>
//               <div className="grid grid-cols-3 gap-2">
//                 <input
//                   type="number"
//                   value={formData.shipping.dimensions.length ?? ''}
//                   onChange={(e) => setFormData({ ...formData, shipping: { ...formData.shipping, dimensions: { ...formData.shipping.dimensions, length: parseFloat(e.target.value) } } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="Length"
//                 />
//                 <input
//                   type="number"
//                   value={formData.shipping.dimensions.width ?? ''}
//                   onChange={(e) => setFormData({ ...formData, shipping: { ...formData.shipping, dimensions: { ...formData.shipping.dimensions, width: parseFloat(e.target.value) } } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="Width"
//                 />
//                 <input
//                   type="number"
//                   value={formData.shipping.dimensions.height ?? ''}
//                   onChange={(e) => setFormData({ ...formData, shipping: { ...formData.shipping, dimensions: { ...formData.shipping.dimensions, height: parseFloat(e.target.value) } } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="Height"
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Attributes Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <h3 className="font-semibold text-gray-900">Product Attributes</h3>
//             <button
//               type="button"
//               onClick={onOpenAttributeModal}
//               className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
//             >
//               + Add Attribute
//             </button>
//           </div>
//           <div className="p-4">
//             {formData.attributes.length === 0 ? (
//               <p className="text-center text-gray-500 py-4">No attributes added yet</p>
//             ) : (
//               <div className="space-y-2">
//                 {formData.attributes.map((attr) => (
//                   <div key={attr.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
//                     <div className="flex items-center space-x-2">
//                       <span className="text-sm font-medium text-gray-700">{attr.key}:</span>
//                       <span className="text-sm text-gray-600">{attr.value}</span>
//                     </div>
//                     <button
//                       type="button"
//                       onClick={() => onRemoveAttribute(attr.id)}
//                       className="text-gray-400 hover:text-red-500"
//                     >
//                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                       </svg>
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Variants Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <div>
//               <h3 className="font-semibold text-gray-900">Product Variants</h3>
//               <p className="text-xs text-gray-500 mt-0.5">e.g., different colors, sizes with own price & stock</p>
//             </div>
//             <button
//               type="button"
//               onClick={onOpenAddVariant}
//               className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 flex items-center gap-1.5"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//               </svg>
//               Add Variant
//             </button>
//           </div>
//           <div className="p-4">
//             {formData.variants.length === 0 ? (
//               <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
//                 <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
//                 </svg>
//                 <p className="text-gray-500 text-sm">No variants added yet</p>
//                 <p className="text-gray-400 text-xs mt-1">Click "Add Variant" to add color, size or other variants</p>
//               </div>
//             ) : (
//               <div className="space-y-3">
//                 {formData.variants.map((variant, index) => (
//                   <div
//                     key={index}
//                     className={`rounded-lg border-2 p-3 transition-all ${
//                       variant.isActive ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-gray-50 opacity-60'
//                     }`}
//                   >
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="flex-1 min-w-0">

//                         {/* Attribute badges */}
//                         <div className="flex flex-wrap gap-1.5 mb-2">
//                           {variant.attributes.map((attr, aIdx) => (
//                             <span key={aIdx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
//                               {attr.key}: {attr.value}
//                             </span>
//                           ))}
//                         </div>

//                         {/* Price row */}
//                         <div className="flex items-center gap-3 text-sm">
//                           <span className="font-semibold text-gray-900">
//                             ₹{Number(variant.price.base).toLocaleString('en-IN')}
//                           </span>
//                           {variant.price.sale && (
//                             <>
//                               <span className="text-gray-400 line-through text-xs">
//                                 ₹{Number(variant.price.sale).toLocaleString('en-IN')}
//                               </span>
//                               {variant.price.sale < variant.price.base && (
//                                 <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
//                                   {getDiscountPercentage(variant.price.base, variant.price.sale)}% OFF
//                                 </span>
//                               )}
//                             </>
//                           )}
//                           <span className="text-gray-400 text-xs">•</span>
//                           <span className="text-gray-600 text-xs">Qty: {variant.inventory.quantity}</span>
//                           {/* Show barcode badge if present */}
//                           {variant.barcode && (
//                             <>
//                               <span className="text-gray-400 text-xs">•</span>
//                               <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
//                                 📦 {variant.barcode}
//                               </span>
//                             </>
//                           )}
//                         </div>

//                         {/* Image thumbnails */}
//                         {variant.images && variant.images.length > 0 && (
//                           <div className="flex items-center gap-2 mt-2">
//                             {variant.images.slice(0, 3).map((img, iIdx) => (
//                               <div key={iIdx} className="w-8 h-8 rounded overflow-hidden border border-indigo-200">
//                                 <img src={img.url} alt="" className="w-full h-full object-cover" />
//                               </div>
//                             ))}
//                             {variant.images.length > 3 && (
//                               <span className="text-xs text-gray-400">+{variant.images.length - 3} more</span>
//                             )}
//                           </div>
//                         )}
//                       </div>

//                       {/* Actions */}
//                       <div className="flex items-center gap-2 flex-shrink-0">
//                         <button
//                           type="button"
//                           onClick={() => onToggleVariantActive(index)}
//                           className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
//                             variant.isActive ? 'bg-indigo-500' : 'bg-gray-300'
//                           }`}
//                           title={variant.isActive ? 'Active' : 'Inactive'}
//                         >
//                           <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
//                             variant.isActive ? 'translate-x-5' : 'translate-x-1'
//                           }`} />
//                         </button>

//                         <button
//                           type="button"
//                           onClick={() => onOpenEditVariant(index)}
//                           className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
//                           title="Edit variant"
//                         >
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                           </svg>
//                         </button>

//                         <button
//                           type="button"
//                           onClick={() => onDeleteVariant(index)}
//                           className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                           title="Delete variant"
//                         >
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                           </svg>
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 ))}

//                 <p className="text-xs text-gray-400 text-center pt-1">
//                   {formData.variants.length} variant{formData.variants.length !== 1 ? 's' : ''} added
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>

//       </div>

//       {/* ===== RIGHT COLUMN ===== */}
//       <div className="space-y-6">

//         {/* Product Gallery Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Product Gallery</h3>
//             <p className="text-xs text-gray-500 mt-1">Upload up to 5 images (drag to reorder)</p>
//           </div>
//           <div className="p-4">
//             <label
//               className={`block w-full border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
//                 isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
//               }`}
//               onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
//               onDragLeave={() => setIsDragging(false)}
//               onDrop={(e) => {
//                 e.preventDefault();
//                 setIsDragging(false);
//                 handleImageUpload({ target: { files: e.dataTransfer.files } });
//               }}
//             >
//               <input
//                 type="file"
//                 multiple
//                 accept="image/*"
//                 onChange={handleImageUpload}
//                 className="hidden"
//                 disabled={formData.images.length >= 5}
//               />
//               <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//               </svg>
//               <p className="text-sm text-gray-600">{formData.images.length}/5 images</p>
//             </label>

//             {formData.images.length > 0 && (
//               <div className="mt-4 space-y-2">
//                 {formData.images.map((image, index) => (
//                   <div
//                     key={image.id}
//                     draggable
//                     onDragStart={(e) => handleImageDragStart(e, index)}
//                     onDragOver={(e) => handleImageDragOver(e, index)}
//                     onDragEnd={handleImageDragEnd}
//                     className={`flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border-2 ${
//                       image.isMain ? 'border-blue-500' : 'border-transparent'
//                     }`}
//                   >
//                     <div className="w-12 h-12 rounded overflow-hidden bg-white">
//                       <img src={image.url} alt="" className="w-full h-full object-cover" />
//                     </div>
//                     <div className="flex-1 text-xs truncate">{image.name}</div>
//                     <div className="flex items-center space-x-1">
//                       {!image.isMain && (
//                         <button
//                           type="button"
//                           onClick={() => setMainImage(image.id)}
//                           className="p-1 text-gray-500 hover:text-blue-600"
//                           title="Make main"
//                         >
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
//                           </svg>
//                         </button>
//                       )}
//                       <button
//                         type="button"
//                         onClick={() => removeImage(image.id)}
//                         className="p-1 text-gray-500 hover:text-red-600"
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                         </svg>
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Marketing & Visibility Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Marketing & Visibility</h3>
//           </div>
//           <div className="p-4 space-y-4">

//             {/* Featured Toggle */}
//             <div className="flex items-center justify-between">
//               <span className="text-sm font-medium text-gray-700">Featured Product</span>
//               <button
//                 type="button"
//                 onClick={() => setFormData(prev => ({ ...prev, isFeatured: !prev.isFeatured }))}
//                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
//                   formData.isFeatured ? 'bg-yellow-500' : 'bg-gray-300'
//                 }`}
//               >
//                 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
//                   formData.isFeatured ? 'translate-x-6' : 'translate-x-1'
//                 }`} />
//               </button>
//             </div>

//             {/* Status */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
//               <select
//                 name="status"
//                 value={formData.status}
//                 onChange={handleInputChange}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//               >
//                 <option value="draft">Draft</option>
//                 <option value="active">Active</option>
//                 <option value="archived">Archived</option>
//               </select>
//             </div>

//             {/* Sold Info */}
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-gray-700">Sold Info</span>
//                 <button
//                   type="button"
//                   onClick={() => setFormData(prev => ({
//                     ...prev,
//                     soldInfo: { ...prev.soldInfo, enabled: !prev.soldInfo.enabled }
//                   }))}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
//                     formData.soldInfo.enabled ? 'bg-blue-500' : 'bg-gray-300'
//                   }`}
//                 >
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
//                     formData.soldInfo.enabled ? 'translate-x-6' : 'translate-x-1'
//                   }`} />
//                 </button>
//               </div>
//               {formData.soldInfo.enabled && (
//                 <input
//                   type="number"
//                   value={formData.soldInfo.count}
//                   onChange={(e) => setFormData(prev => ({
//                     ...prev,
//                     soldInfo: { ...prev.soldInfo, count: parseInt(e.target.value) || 0 }
//                   }))}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                   placeholder="Number sold"
//                 />
//               )}
//             </div>

//             {/* FOMO */}
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-gray-700">FOMO</span>
//                 <button
//                   type="button"
//                   onClick={() => setFormData(prev => ({
//                     ...prev,
//                     fomo: { ...prev.fomo, enabled: !prev.fomo.enabled }
//                   }))}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
//                     formData.fomo.enabled ? 'bg-purple-500' : 'bg-gray-300'
//                   }`}
//                 >
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
//                     formData.fomo.enabled ? 'translate-x-6' : 'translate-x-1'
//                   }`} />
//                 </button>
//               </div>
//               {formData.fomo.enabled && (
//                 <div className="space-y-2">
//                   <select
//                     value={formData.fomo.type}
//                     onChange={(e) => setFormData(prev => ({
//                       ...prev,
//                       fomo: { ...prev.fomo, type: e.target.value }
//                     }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                   >
//                     <option value="viewing_now">Viewing Now</option>
//                     <option value="product_left">Product Left</option>
//                     <option value="custom">Custom</option>
//                   </select>

//                   {formData.fomo.type === 'viewing_now' && (
//                     <input
//                       type="number"
//                       value={formData.fomo.viewingNow}
//                       onChange={(e) => setFormData(prev => ({
//                         ...prev,
//                         fomo: { ...prev.fomo, viewingNow: parseInt(e.target.value) || 0 }
//                       }))}
//                       className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                       placeholder="Viewing now"
//                     />
//                   )}

//                   {formData.fomo.type === 'product_left' && (
//                     <input
//                       type="number"
//                       value={formData.fomo.productLeft}
//                       onChange={(e) => setFormData(prev => ({
//                         ...prev,
//                         fomo: { ...prev.fomo, productLeft: parseInt(e.target.value) || 0 }
//                       }))}
//                       className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                       placeholder="Items left"
//                     />
//                   )}

//                   {formData.fomo.type === 'custom' && (
//                     <div className="flex gap-2">
//                       <input
//                         type="text"
//                         value={formData.fomo.customMessage}
//                         readOnly
//                         placeholder="Custom message"
//                         className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                       />
//                       <button
//                         type="button"
//                         onClick={() => onOpenCustomMessage(formData.fomo.customMessage || '')}
//                         className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
//                       >
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                         </svg>
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default ProductFormBody;
// ADD THE BARCODE INPUT FIELDS AS DESIRE TO CLIENT
// import React, { useState } from 'react';

// // ============================================================
// // ProductFormBody — receives formData + setFormData from parent
// // Owns its own image upload state (uploadProgress, draggedImageIndex, isDragging)
// // All modal open triggers passed as props from parent
// // ============================================================

// const ProductFormBody = ({
//   // Core form data
//   formData,
//   setFormData,

//   // Dropdowns data
//   categories,
//   brands,

//   // Modal open triggers (parent owns modal visibility state)
//   onOpenCategoryModal,
//   onOpenBrandModal,
//   onOpenAttributeModal,
//   onOpenCustomMessage,    // called with current customMessage string
//   onOpenAddVariant,
//   onOpenEditVariant,      // called with (index)

//   // In-card actions that don't need a modal
//   onRemoveAttribute,      // (attributeId)
//   onDeleteVariant,        // (index)
//   onToggleVariantActive,  // (index)

//   // Helper functions
//   formatIndianRupee,
//   getDiscountPercentage,
// }) => {

//   // ================= IMAGE STATE (owned here) =================
//   const [uploadProgress, setUploadProgress] = useState({});
//   const [draggedImageIndex, setDraggedImageIndex] = useState(null);
//   const [isDragging, setIsDragging] = useState(false);

//   // ================= IMAGE HANDLING =================
//   const handleImageUpload = (e) => {
//     const files = Array.from(e.target.files);
//     const newImages = [...formData.images];

//     files.forEach((file, index) => {
//       if (newImages.length < 5) {
//         const reader = new FileReader();
//         const imageId = `img-${Date.now()}-${index}`;

//         setUploadProgress(prev => ({ ...prev, [imageId]: 0 }));

//         reader.onloadstart = () => {
//           setUploadProgress(prev => ({ ...prev, [imageId]: 10 }));
//         };

//         reader.onprogress = (progress) => {
//           if (progress.lengthComputable) {
//             const percent = (progress.loaded / progress.total) * 90 + 10;
//             setUploadProgress(prev => ({ ...prev, [imageId]: percent }));
//           }
//         };

//         reader.onloadend = () => {
//           setUploadProgress(prev => ({ ...prev, [imageId]: 100 }));
//           setTimeout(() => {
//             setUploadProgress(prev => {
//               const newProgress = { ...prev };
//               delete newProgress[imageId];
//               return newProgress;
//             });
//           }, 500);

//           newImages.push({
//             id: imageId,
//             url: reader.result,
//             file: file,
//             name: file.name,
//             size: file.size,
//             isMain: newImages.length === 0
//           });

//           setFormData(prev => ({ ...prev, images: newImages }));
//         };

//         reader.readAsDataURL(file);
//       }
//     });
//   };

//   const removeImage = (imageId) => {
//     const newImages = formData.images.filter(img => img.id !== imageId);
//     if (formData.images.find(img => img.id === imageId)?.isMain && newImages.length > 0) {
//       newImages[0].isMain = true;
//     }
//     setFormData(prev => ({ ...prev, images: newImages }));
//   };

//   const setMainImage = (imageId) => {
//     setFormData(prev => ({
//       ...prev,
//       images: prev.images.map(img => ({ ...img, isMain: img.id === imageId }))
//     }));
//   };

//   const handleImageDragStart = (e, index) => {
//     setDraggedImageIndex(index);
//     e.dataTransfer.effectAllowed = 'move';
//   };

//   const handleImageDragOver = (e, index) => {
//     e.preventDefault();
//     if (draggedImageIndex === null || draggedImageIndex === index) return;

//     const newImages = [...formData.images];
//     const draggedImage = newImages[draggedImageIndex];
//     newImages.splice(draggedImageIndex, 1);
//     newImages.splice(index, 0, draggedImage);
//     newImages.forEach((img, idx) => { img.isMain = idx === 0; });

//     setFormData(prev => ({ ...prev, images: newImages }));
//     setDraggedImageIndex(index);
//   };

//   const handleImageDragEnd = () => {
//     setDraggedImageIndex(null);
//     setIsDragging(false);
//   };

//   // ================= handleInputChange (for named inputs) =================
//   const handleInputChange = (e) => {
//     const { name, value, type, checked } = e.target;

//     if (name.includes('.')) {
//       const [parent, child] = name.split('.');
//       setFormData(prev => ({
//         ...prev,
//         [parent]: { ...prev[parent], [child]: type === 'checkbox' ? checked : value }
//       }));
//     } else if (name.includes('shipping.dimensions.')) {
//       const dimension = name.split('.')[2];
//       setFormData(prev => ({
//         ...prev,
//         shipping: {
//           ...prev.shipping,
//           dimensions: { ...prev.shipping.dimensions, [dimension]: value }
//         }
//       }));
//     } else {
//       setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
//     }
//   };

//   // ============================================================
//   return (
//     <div className="grid grid-cols-3 gap-6">

//       {/* ===== LEFT COLUMN ===== */}
//       <div className="col-span-2 space-y-6">

//         {/* Essential Details Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Essential Details</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Product Name <span className="text-red-400">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   value={formData.name}
//                   onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g., Premium Wireless Headphones"
//                   required
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Title <span className="text-red-400">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="title"
//                   value={formData.title}
//                   onChange={handleInputChange}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g., Noise Cancelling Headphones"
//                   required
//                 />
//               </div>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Description <span className="text-red-400">*</span>
//               </label>
//               <textarea
//                 name="description"
//                 value={formData.description}
//                 onChange={handleInputChange}
//                 rows="3"
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none"
//                 placeholder="Describe your product in detail..."
//                 required
//               />
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
//                 <div className="flex gap-2">
//                   <select
//                     name="category"
//                     value={formData.category}
//                     onChange={handleInputChange}
//                     className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   >
//                     <option value="">Select category</option>
//                     {categories.map(cat => (
//                       <option key={cat._id} value={cat._id}>{cat.name}</option>
//                     ))}
//                   </select>
//                   <button
//                     type="button"
//                     onClick={onOpenCategoryModal}
//                     className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
//                   >
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
//                 <div className="flex gap-2">
//                   <select
//                     name="brand"
//                     value={formData.brand}
//                     onChange={handleInputChange}
//                     className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   >
//                     {brands.map(brand => (
//                       <option key={brand} value={brand}>{brand}</option>
//                     ))}
//                   </select>
//                   <button
//                     type="button"
//                     onClick={onOpenBrandModal}
//                     className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
//                   >
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Pricing Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Pricing (₹ Indian Rupees)</h3>
//           </div>
//           <div className="p-4">
//             <div className="grid grid-cols-3 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">MRP / Base Price (₹)</label>
//                 <input
//                   type="number"
//                   value={formData.price.base}
//                   onChange={(e) => setFormData({ ...formData, price: { ...formData.price, base: e.target.value } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="29999"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (₹)</label>
//                 <input
//                   type="number"
//                   value={formData.price.sale}
//                   onChange={(e) => setFormData({ ...formData, price: { ...formData.price, sale: e.target.value } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="19999"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Cost Price (₹)</label>
//                 <input
//                   type="number"
//                   value={formData.price.costPrice}
//                   onChange={(e) => setFormData({ ...formData, price: { ...formData.price, costPrice: e.target.value } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="15000"
//                 />
//               </div>
//             </div>

//             {/* Price Preview */}
//             {formData.price.base && formData.price.sale && (
//               <div className="mt-4 p-3 bg-blue-50 rounded-lg">
//                 <p className="text-sm text-gray-600 mb-1">Price Preview:</p>
//                 <div className="flex items-center space-x-3">
//                   <span className="text-gray-400 line-through">{formatIndianRupee(formData.price.base)}</span>
//                   <span className="text-lg font-bold text-gray-900">{formatIndianRupee(formData.price.sale)}</span>
//                   {formData.price.sale < formData.price.base && (
//                     <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                       {getDiscountPercentage(formData.price.base, formData.price.sale)}% OFF
//                     </span>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Inventory Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <h3 className="font-semibold text-gray-900">Inventory Management</h3>
//             <button
//               type="button"
//               onClick={() => setFormData(prev => ({
//                 ...prev,
//                 inventory: { ...prev.inventory, trackInventory: !prev.inventory.trackInventory }
//               }))}
//               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
//                 formData.inventory.trackInventory ? 'bg-blue-500' : 'bg-gray-300'
//               }`}
//             >
//               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
//                 formData.inventory.trackInventory ? 'translate-x-6' : 'translate-x-1'
//               }`} />
//             </button>
//           </div>
//           {formData.inventory.trackInventory && (
//             <div className="p-4">
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Quantity in Stock</label>
//                   <input
//                     type="number"
//                     value={formData.inventory.quantity}
//                     onChange={(e) => setFormData({ ...formData, inventory: { ...formData.inventory, quantity: parseInt(e.target.value) || 0 } })}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder="0"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Low Stock Threshold</label>
//                   <input
//                     type="number"
//                     value={formData.inventory.lowStockThreshold}
//                     onChange={(e) => setFormData({ ...formData, inventory: { ...formData.inventory, lowStockThreshold: parseInt(e.target.value) || 5 } })}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                     placeholder="5"
//                   />
//                 </div>
//               </div>
//               <p className="text-xs text-gray-500 mt-2">Low stock alert will show when quantity is below threshold</p>
//             </div>
//           )}
//         </div>

//         {/* Shipping Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Shipping Details</h3>
//           </div>
//           <div className="p-4 space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
//               <input
//                 type="number"
//                 step="0.1"
//                 value={formData.shipping.weight ?? ''}
//                 onChange={(e) => setFormData({ ...formData, shipping: { ...formData.shipping, weight: parseFloat(e.target.value) || 0 } })}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                 placeholder="0.5"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions (cm)</label>
//               <div className="grid grid-cols-3 gap-2">
//                 <input
//                   type="number"
//                   value={formData.shipping.dimensions.length ?? ''}
//                   onChange={(e) => setFormData({ ...formData, shipping: { ...formData.shipping, dimensions: { ...formData.shipping.dimensions, length: parseFloat(e.target.value) } } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="Length"
//                 />
//                 <input
//                   type="number"
//                   value={formData.shipping.dimensions.width ?? ''}
//                   onChange={(e) => setFormData({ ...formData, shipping: { ...formData.shipping, dimensions: { ...formData.shipping.dimensions, width: parseFloat(e.target.value) } } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="Width"
//                 />
//                 <input
//                   type="number"
//                   value={formData.shipping.dimensions.height ?? ''}
//                   onChange={(e) => setFormData({ ...formData, shipping: { ...formData.shipping, dimensions: { ...formData.shipping.dimensions, height: parseFloat(e.target.value) } } })}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
//                   placeholder="Height"
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Attributes Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <h3 className="font-semibold text-gray-900">Product Attributes</h3>
//             <button
//               type="button"
//               onClick={onOpenAttributeModal}
//               className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
//             >
//               + Add Attribute
//             </button>
//           </div>
//           <div className="p-4">
//             {formData.attributes.length === 0 ? (
//               <p className="text-center text-gray-500 py-4">No attributes added yet</p>
//             ) : (
//               <div className="space-y-2">
//                 {formData.attributes.map((attr) => (
//                   <div key={attr.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
//                     <div className="flex items-center space-x-2">
//                       <span className="text-sm font-medium text-gray-700">{attr.key}:</span>
//                       <span className="text-sm text-gray-600">{attr.value}</span>
//                     </div>
//                     <button
//                       type="button"
//                       onClick={() => onRemoveAttribute(attr.id)}
//                       className="text-gray-400 hover:text-red-500"
//                     >
//                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                       </svg>
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Variants Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//             <div>
//               <h3 className="font-semibold text-gray-900">Product Variants</h3>
//               <p className="text-xs text-gray-500 mt-0.5">e.g., different colors, sizes with own price & stock</p>
//             </div>
//             <button
//               type="button"
//               onClick={onOpenAddVariant}
//               className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 flex items-center gap-1.5"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//               </svg>
//               Add Variant
//             </button>
//           </div>
//           <div className="p-4">
//             {formData.variants.length === 0 ? (
//               <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
//                 <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
//                 </svg>
//                 <p className="text-gray-500 text-sm">No variants added yet</p>
//                 <p className="text-gray-400 text-xs mt-1">Click "Add Variant" to add color, size or other variants</p>
//               </div>
//             ) : (
//               <div className="space-y-3">
//                 {formData.variants.map((variant, index) => (
//                   <div
//                     key={index}
//                     className={`rounded-lg border-2 p-3 transition-all ${
//                       variant.isActive ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-gray-50 opacity-60'
//                     }`}
//                   >
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="flex-1 min-w-0">
//                         {/* Attribute badges */}
//                         <div className="flex flex-wrap gap-1.5 mb-2">
//                           {variant.attributes.map((attr, aIdx) => (
//                             <span key={aIdx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
//                               {attr.key}: {attr.value}
//                             </span>
//                           ))}
//                         </div>

//                         {/* Price row */}
//                         <div className="flex items-center gap-3 text-sm">
//                           <span className="font-semibold text-gray-900">
//                             ₹{Number(variant.price.base).toLocaleString('en-IN')}
//                           </span>
//                           {variant.price.sale && (
//                             <>
//                               <span className="text-gray-400 line-through text-xs">
//                                 ₹{Number(variant.price.sale).toLocaleString('en-IN')}
//                               </span>
//                               {variant.price.sale < variant.price.base && (
//                                 <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
//                                   {getDiscountPercentage(variant.price.base, variant.price.sale)}% OFF
//                                 </span>
//                               )}
//                             </>
//                           )}
//                           <span className="text-gray-400 text-xs">•</span>
//                           <span className="text-gray-600 text-xs">Qty: {variant.inventory.quantity}</span>
//                         </div>

//                         {/* Image thumbnails */}
//                         {variant.images && variant.images.length > 0 && (
//                           <div className="flex items-center gap-2 mt-2">
//                             {variant.images.slice(0, 3).map((img, iIdx) => (
//                               <div key={iIdx} className="w-8 h-8 rounded overflow-hidden border border-indigo-200">
//                                 <img src={img.url} alt="" className="w-full h-full object-cover" />
//                               </div>
//                             ))}
//                             {variant.images.length > 3 && (
//                               <span className="text-xs text-gray-400">+{variant.images.length - 3} more</span>
//                             )}
//                           </div>
//                         )}
//                       </div>

//                       {/* Actions */}
//                       <div className="flex items-center gap-2 flex-shrink-0">
//                         {/* Active toggle */}
//                         <button
//                           type="button"
//                           onClick={() => onToggleVariantActive(index)}
//                           className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
//                             variant.isActive ? 'bg-indigo-500' : 'bg-gray-300'
//                           }`}
//                           title={variant.isActive ? 'Active' : 'Inactive'}
//                         >
//                           <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
//                             variant.isActive ? 'translate-x-5' : 'translate-x-1'
//                           }`} />
//                         </button>

//                         {/* Edit */}
//                         <button
//                           type="button"
//                           onClick={() => onOpenEditVariant(index)}
//                           className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
//                           title="Edit variant"
//                         >
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                           </svg>
//                         </button>

//                         {/* Delete */}
//                         <button
//                           type="button"
//                           onClick={() => onDeleteVariant(index)}
//                           className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                           title="Delete variant"
//                         >
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                           </svg>
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 ))}

//                 <p className="text-xs text-gray-400 text-center pt-1">
//                   {formData.variants.length} variant{formData.variants.length !== 1 ? 's' : ''} added
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>

//       </div>

//       {/* ===== RIGHT COLUMN ===== */}
//       <div className="space-y-6">

//         {/* Product Gallery Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Product Gallery</h3>
//             <p className="text-xs text-gray-500 mt-1">Upload up to 5 images (drag to reorder)</p>
//           </div>
//           <div className="p-4">
//             <label
//               className={`block w-full border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
//                 isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
//               }`}
//               onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
//               onDragLeave={() => setIsDragging(false)}
//               onDrop={(e) => {
//                 e.preventDefault();
//                 setIsDragging(false);
//                 handleImageUpload({ target: { files: e.dataTransfer.files } });
//               }}
//             >
//               <input
//                 type="file"
//                 multiple
//                 accept="image/*"
//                 onChange={handleImageUpload}
//                 className="hidden"
//                 disabled={formData.images.length >= 5}
//               />
//               <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//               </svg>
//               <p className="text-sm text-gray-600">{formData.images.length}/5 images</p>
//             </label>

//             {formData.images.length > 0 && (
//               <div className="mt-4 space-y-2">
//                 {formData.images.map((image, index) => (
//                   <div
//                     key={image.id}
//                     draggable
//                     onDragStart={(e) => handleImageDragStart(e, index)}
//                     onDragOver={(e) => handleImageDragOver(e, index)}
//                     onDragEnd={handleImageDragEnd}
//                     className={`flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border-2 ${
//                       image.isMain ? 'border-blue-500' : 'border-transparent'
//                     }`}
//                   >
//                     <div className="w-12 h-12 rounded overflow-hidden bg-white">
//                       <img src={image.url} alt="" className="w-full h-full object-cover" />
//                     </div>
//                     <div className="flex-1 text-xs truncate">{image.name}</div>
//                     <div className="flex items-center space-x-1">
//                       {!image.isMain && (
//                         <button
//                           type="button"
//                           onClick={() => setMainImage(image.id)}
//                           className="p-1 text-gray-500 hover:text-blue-600"
//                           title="Make main"
//                         >
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
//                           </svg>
//                         </button>
//                       )}
//                       <button
//                         type="button"
//                         onClick={() => removeImage(image.id)}
//                         className="p-1 text-gray-500 hover:text-red-600"
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                         </svg>
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Marketing & Visibility Card */}
//         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b border-gray-100 bg-gray-50">
//             <h3 className="font-semibold text-gray-900">Marketing & Visibility</h3>
//           </div>
//           <div className="p-4 space-y-4">

//             {/* Featured Toggle */}
//             <div className="flex items-center justify-between">
//               <span className="text-sm font-medium text-gray-700">Featured Product</span>
//               <button
//                 type="button"
//                 onClick={() => setFormData(prev => ({ ...prev, isFeatured: !prev.isFeatured }))}
//                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
//                   formData.isFeatured ? 'bg-yellow-500' : 'bg-gray-300'
//                 }`}
//               >
//                 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
//                   formData.isFeatured ? 'translate-x-6' : 'translate-x-1'
//                 }`} />
//               </button>
//             </div>

//             {/* Status */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
//               <select
//                 name="status"
//                 value={formData.status}
//                 onChange={handleInputChange}
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//               >
//                 <option value="draft">Draft</option>
//                 <option value="active">Active</option>
//                 <option value="archived">Archived</option>
//               </select>
//             </div>

//             {/* Sold Info */}
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-gray-700">Sold Info</span>
//                 <button
//                   type="button"
//                   onClick={() => setFormData(prev => ({
//                     ...prev,
//                     soldInfo: { ...prev.soldInfo, enabled: !prev.soldInfo.enabled }
//                   }))}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
//                     formData.soldInfo.enabled ? 'bg-blue-500' : 'bg-gray-300'
//                   }`}
//                 >
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
//                     formData.soldInfo.enabled ? 'translate-x-6' : 'translate-x-1'
//                   }`} />
//                 </button>
//               </div>
//               {formData.soldInfo.enabled && (
//                 <input
//                   type="number"
//                   value={formData.soldInfo.count}
//                   onChange={(e) => setFormData(prev => ({
//                     ...prev,
//                     soldInfo: { ...prev.soldInfo, count: parseInt(e.target.value) || 0 }
//                   }))}
//                   className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                   placeholder="Number sold"
//                 />
//               )}
//             </div>

//             {/* FOMO */}
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-gray-700">FOMO</span>
//                 <button
//                   type="button"
//                   onClick={() => setFormData(prev => ({
//                     ...prev,
//                     fomo: { ...prev.fomo, enabled: !prev.fomo.enabled }
//                   }))}
//                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
//                     formData.fomo.enabled ? 'bg-purple-500' : 'bg-gray-300'
//                   }`}
//                 >
//                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
//                     formData.fomo.enabled ? 'translate-x-6' : 'translate-x-1'
//                   }`} />
//                 </button>
//               </div>
//               {formData.fomo.enabled && (
//                 <div className="space-y-2">
//                   <select
//                     value={formData.fomo.type}
//                     onChange={(e) => setFormData(prev => ({
//                       ...prev,
//                       fomo: { ...prev.fomo, type: e.target.value }
//                     }))}
//                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                   >
//                     <option value="viewing_now">Viewing Now</option>
//                     <option value="product_left">Product Left</option>
//                     <option value="custom">Custom</option>
//                   </select>

//                   {formData.fomo.type === 'viewing_now' && (
//                     <input
//                       type="number"
//                       value={formData.fomo.viewingNow}
//                       onChange={(e) => setFormData(prev => ({
//                         ...prev,
//                         fomo: { ...prev.fomo, viewingNow: parseInt(e.target.value) || 0 }
//                       }))}
//                       className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                       placeholder="Viewing now"
//                     />
//                   )}

//                   {formData.fomo.type === 'product_left' && (
//                     <input
//                       type="number"
//                       value={formData.fomo.productLeft}
//                       onChange={(e) => setFormData(prev => ({
//                         ...prev,
//                         fomo: { ...prev.fomo, productLeft: parseInt(e.target.value) || 0 }
//                       }))}
//                       className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                       placeholder="Items left"
//                     />
//                   )}

//                   {formData.fomo.type === 'custom' && (
//                     <div className="flex gap-2">
//                       <input
//                         type="text"
//                         value={formData.fomo.customMessage}
//                         readOnly
//                         placeholder="Custom message"
//                         className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
//                       />
//                       <button
//                         type="button"
//                         onClick={() => onOpenCustomMessage(formData.fomo.customMessage || '')}
//                         className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
//                       >
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                         </svg>
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default ProductFormBody;