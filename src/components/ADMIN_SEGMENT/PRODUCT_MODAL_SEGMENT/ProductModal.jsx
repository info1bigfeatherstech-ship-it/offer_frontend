// PRODUCT_MODAL_SEGMENT/ProductModal.jsx

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProductFormBody from "../Shared_components/ProductFormBody";
import VariantModal, { defaultVariant } from "../Shared_components/VariantModal";
import { shippingFormFromVariant } from "../../../utils/variantCatalogForm";
import CategoryModal from "../Shared_components/CategoryModal";
import BrandModal from "../Shared_components/BrandModal";
import AttributeModal from "../Shared_components/AttributeModal";
import CustomMessageModal from "../Shared_components/CustomMessageModal";
import { createProduct, resetCreateSuccess } from "../ADMIN_REDUX_MANAGEMENT/adminProductCreateSlice";

const formatIndianRupee = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);

const getDiscountPercentage = (base, sale) => {
  if (!base || !sale || Number(sale) >= Number(base)) return 0;
  return Math.round(((Number(base) - Number(sale)) / Number(base)) * 100);
};

/** BASE left of hyphen preserved (leading zeros); only suffix digits normalized. */
const SUFFIXED_PRODUCT_CODE_REGEX = /^([A-Z0-9]+)-(\d+)$/;

const validateProductCodeSeries = (rawCodes, contextLabel = "variants") => {
  const normalized = (rawCodes || []).map((c) => String(c || "").trim().toUpperCase()).filter(Boolean);
  if (!normalized.length) {
    throw new Error(`At least one ProductCode is required for ${contextLabel}`);
  }

  const parsed = normalized.map((code, idx) => {
    const match = code.match(SUFFIXED_PRODUCT_CODE_REGEX);
    if (!match) {
      throw new Error(
        `${contextLabel}[${idx + 1}] ProductCode must be BASE-N (e.g., 3897-1 or 3897-01)`
      );
    }
    const seq = Number(match[2]);
    if (!Number.isInteger(seq) || seq < 1) {
      throw new Error(`${contextLabel}[${idx + 1}] ProductCode suffix must be a whole number ≥ 1`);
    }
    const canonical = `${match[1]}-${seq}`;
    return { code: canonical, base: match[1], sequence: seq };
  });

  const base = parsed[0].base;
  const seenCodes = new Set();
  const seenSeq = new Set();

  for (const entry of parsed) {
    if (entry.base !== base) {
      throw new Error(`All ProductCodes must share same base. Expected ${base}-N, got ${entry.code}`);
    }
    if (seenCodes.has(entry.code)) {
      throw new Error(`Duplicate ProductCode found: ${entry.code}`);
    }
    seenCodes.add(entry.code);
    seenSeq.add(entry.sequence);
  }

  for (let expected = 1; expected <= parsed.length; expected++) {
    if (!seenSeq.has(expected)) {
      throw new Error(`ProductCode sequence must be continuous: missing ${base}-${expected}`);
    }
  }
};

const emptyForm = () => ({
  name: "", title: "", description: "", brand: "Generic", category: "",
  ProductCode: "", price: { base: "", sale: "" },
  inventory: { quantity: 0, lowStockThreshold: 5, trackInventory: true },
  images: [], variants: [], attributes: [],
  hsnCode: "",
  taxRate: "",
  isFragile: false,
  shipping: { weight: "", dimensions: { length: "", width: "", height: "" } },
  wholesale: false,
  wholesaleBase: "",
  wholesaleSale: "",
  minimumOrderQuantity: 1,
  soldInfo: { enabled: false, count: 0 },
  fomo: { enabled: false, type: "viewing_now", viewingNow: 0, productLeft: 0, customMessage: "" },
  isFeatured: false, status: "draft",
});

const ProductModal = ({ onClose, brands, setBrands }) => {
  const dispatch = useDispatch();
  const { loading: createLoading, error: createError, success: createSuccess } =
    useSelector((s) => s.adminProductCreate);
  const { categories } = useSelector((s) => s.categories);

  const [formData, setFormData] = useState(emptyForm);
  const [variantForm, setVariantForm] = useState(defaultVariant);
  const [editingVariantIndex, setEditingVariantIndex] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [showCustomMessageModal, setShowCustomMessageModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);

  useEffect(() => {
    if (createSuccess) { dispatch(resetCreateSuccess()); setFormData(emptyForm); onClose(); }
  }, [createSuccess, dispatch, onClose]);

  const openAddVariant = () => {
    setVariantForm(defaultVariant);
    setEditingVariantIndex(null);
    setShowVariantModal(true);
  };

  const openEditVariant = (index) => {
    const v = formData.variants[index];
    setVariantForm({
      ProductCode: v.ProductCode != null ? String(v.ProductCode) : "",
      attributes: v.attributes?.length > 0 ? v.attributes : [{ key: "", value: "" }],
      price: { base: v.price?.base ?? "", sale: v.price?.sale ?? "" },
      inventory: { ...v.inventory },
      images: v.images || [],
      isActive: v.isActive !== false,
      wholesale: v.wholesale || false,
      wholesaleBase: v.wholesaleBase || "",
      wholesaleSale: v.wholesaleSale || "",
      minimumOrderQuantity: v.minimumOrderQuantity || 1,
      channelVisibility: v.channelVisibility || { ecomm: "active", wholesale: "draft" },
      title: v.title || "",
      description: v.description || "",
      shipping: shippingFormFromVariant(v, formData.shipping, formData),
    });
    setEditingVariantIndex(index);
    setShowVariantModal(true);
  };

  const handleVariantSave = (variantToSave) => {
    if (editingVariantIndex !== null) {
      setFormData((p) => ({
        ...p,
        variants: p.variants.map((v, i) => (i === editingVariantIndex ? variantToSave : v)),
      }));
    } else {
      setFormData((p) => ({ ...p, variants: [...p.variants, variantToSave] }));
    }
    setShowVariantModal(false);
    setVariantForm(defaultVariant);
    setEditingVariantIndex(null);
  };

  const deleteVariant = (index) => setFormData((p) => ({ ...p, variants: p.variants.filter((_, i) => i !== index) }));
  const toggleVariantActive = (index) => setFormData((p) => ({ ...p, variants: p.variants.map((v, i) => i === index ? { ...v, isActive: !v.isActive } : v) }));
  const handleAddAttribute = (a) => setFormData((p) => ({ ...p, attributes: [...p.attributes, a] }));
  const removeAttribute = (id) => setFormData((p) => ({ ...p, attributes: p.attributes.filter((a) => a.id !== id) }));
  const handleCustomMessageSave = (msg) => setFormData((p) => ({ ...p, fomo: { ...p.fomo, customMessage: msg } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { alert("Product name is required"); return; }
    if (!formData.title.trim()) { alert("Product title is required"); return; }
    if (!formData.category) { alert("Please select a category"); return; }
    const bc0 = String(formData.ProductCode ?? "").trim();
    if (!bc0) { alert("Main ProductCode is required"); return; }
    {
      const m0 = bc0.toUpperCase().match(SUFFIXED_PRODUCT_CODE_REGEX);
      const s0 = m0 ? Number(m0[2]) : NaN;
      if (!m0 || !Number.isInteger(s0) || s0 < 1) {
        alert("Main ProductCode must be BASE-N (e.g., 3897-1 or 3897-01)");
        return;
      }
    }
    if (!formData.price?.base || isNaN(Number(formData.price.base))) {
      alert("Main variant base price is required"); return;
    }

    for (let i = 0; i < formData.variants.length; i++) {
      const bc = String(formData.variants[i].ProductCode ?? "").trim();
      if (!bc) { alert(`Variant ${i + 1}: ProductCode is required`); return; }
      {
        const mv = bc.toUpperCase().match(SUFFIXED_PRODUCT_CODE_REGEX);
        const sv = mv ? Number(mv[2]) : NaN;
        if (!mv || !Number.isInteger(sv) || sv < 1) {
          alert(`Variant ${i + 1}: ProductCode must be BASE-N (e.g., 3897-1 or 3897-01)`);
          return;
        }
      }
      if (!formData.variants[i].price?.base || isNaN(Number(formData.variants[i].price.base))) {
        alert(`Variant ${i + 1}: base price is required`); return;
      }
    }
    const allBarcodes = [bc0, ...formData.variants.map((v) => String(v.ProductCode).trim())];
    if (new Set(allBarcodes).size !== allBarcodes.length) {
      alert("Duplicate barcodes found — each variant must have a unique ProductCode"); return;
    }
    try {
      validateProductCodeSeries(allBarcodes, "create product variants");
    } catch (seriesError) {
      alert(seriesError.message);
      return;
    }
    dispatch(createProduct(formData));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full my-8 shadow-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Product</h2>
            <p className="text-sm text-gray-500 mt-1">
              Top fields = main variant (variants[0]) · "Add Variant" = extra variants
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={createLoading} className="p-2 hover:bg-gray-100 rounded-xl disabled:opacity-50">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {createError && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm font-medium">❌ {createError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6">
          <ProductFormBody
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            brands={brands}
            onOpenCategoryModal={() => setShowCategoryModal(true)}
            onOpenBrandModal={() => setShowBrandModal(true)}
            onOpenAttributeModal={() => setShowAttributeModal(true)}
            onOpenCustomMessage={() => setShowCustomMessageModal(true)}
            onOpenAddVariant={openAddVariant}
            onOpenEditVariant={openEditVariant}
            onRemoveAttribute={removeAttribute}
            onDeleteVariant={deleteVariant}
            onToggleVariantActive={toggleVariantActive}
            formatIndianRupee={formatIndianRupee}
            getDiscountPercentage={getDiscountPercentage}
          />
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} disabled={createLoading} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-60">Cancel</button>
            <button type="submit" disabled={createLoading} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {createLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</> : "Create Product"}
            </button>
          </div>
        </form>
      </div>

      {showCategoryModal && (<CategoryModal onSelect={(catId) => setFormData((p) => ({ ...p, category: catId }))} onClose={() => setShowCategoryModal(false)} />)}
      {showBrandModal && (<BrandModal brands={brands} setBrands={setBrands} onSelect={(brand) => setFormData((p) => ({ ...p, brand }))} onClose={() => setShowBrandModal(false)} />)}
      {showAttributeModal && (<AttributeModal onAdd={handleAddAttribute} onClose={() => setShowAttributeModal(false)} />)}
      {showCustomMessageModal && (<CustomMessageModal currentMessage={formData.fomo.customMessage} onSave={handleCustomMessageSave} onClose={() => setShowCustomMessageModal(false)} />)}
      {showVariantModal && (
        <VariantModal
          variantForm={variantForm}
          setVariantForm={setVariantForm}
          editingVariantIndex={editingVariantIndex}
          onSave={handleVariantSave}
          onClose={() => { setShowVariantModal(false); setVariantForm(defaultVariant); setEditingVariantIndex(null); }}
          getDiscountPercentage={getDiscountPercentage}
        />
      )}
    </div>
  );
};

export default ProductModal;

