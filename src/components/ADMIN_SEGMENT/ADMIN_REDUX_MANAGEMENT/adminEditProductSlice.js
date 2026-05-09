// ADMIN_REDUX_MANAGEMENT/adminEditProductSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../SERVICES/axiosInstance";

const toNum = (raw) => {
  if (raw === "" || raw === null || raw === undefined) return undefined;
  const n = parseFloat(raw);
  return isNaN(n) ? undefined : n;
};

const buildPriceObj = (price, label = "Base price") => {
  const base = toNum(price?.base);
  if (!base) throw new Error(`${label} is required and must be greater than 0`);
  const saleRaw = toNum(price?.sale);
  const sale = price?.sale !== "" && price?.sale != null && saleRaw !== undefined ? saleRaw : null;

  const priceObj = { base, sale };

  // CRITICAL: wholesaleBase and wholesaleSale MUST be inside price object
  if (price?.wholesaleBase !== undefined && price?.wholesaleBase !== "") {
    priceObj.wholesaleBase = toNum(price.wholesaleBase) || 0;
  }
  if (price?.wholesaleSale !== undefined && price?.wholesaleSale !== "") {
    priceObj.wholesaleSale = toNum(price.wholesaleSale) || null;
  }

  return priceObj;
};

const buildInventoryObj = (inv) => ({
  quantity: parseInt(inv?.quantity) || 0,
  lowStockThreshold: parseInt(inv?.lowStockThreshold) || 5,
  trackInventory: inv?.trackInventory !== false,
});

// Helper to check if variant is wholesale eligible (SINGLE SOURCE OF TRUTH)
export const isVariantWholesaleEligible = (variant) => {
  if (!variant) return false;
  const wholesaleFlag = variant.wholesale === true;
  const wholesaleBase = variant.price?.wholesaleBase ? parseFloat(variant.price.wholesaleBase) : 0;
  return wholesaleFlag && wholesaleBase > 0;
};

// Helper to get wholesale visibility (READ-ONLY, auto-calculated)
export const getWholesaleVisibility = (variant) => {
  return isVariantWholesaleEligible(variant) ? "active" : "draft";
};

// UPDATE PRODUCT - PRODUCT LEVEL ONLY (NO VARIANT DATA)
export const updateProduct = createAsyncThunk(
  "adminEditProduct/update",
  async ({ slug, formData: pd }, { rejectWithValue }) => {
    try {
      const fd = new FormData();

      // Product-level fields only - NO variant data here
      if (pd.name) fd.append("name", pd.name);
      if (pd.title) fd.append("title", pd.title);
      if (pd.description) fd.append("description", pd.description);
      if (pd.category) fd.append("category", pd.category);
      if (pd.brand) fd.append("brand", pd.brand);
      if (pd.isFeatured !== undefined) fd.append("isFeatured", String(pd.isFeatured));
      if (pd.hsnCode) fd.append("hsnCode", pd.hsnCode);
      if (pd.taxRate !== undefined && pd.taxRate !== "") fd.append("gstRate", String(pd.taxRate));
      if (pd.isFragile !== undefined) fd.append("isFragile", String(pd.isFragile));

      const shippingData = {
        ...pd.shipping,
        weight: pd.shipping?.weight || 0,
        dimensions: pd.shipping?.dimensions || { length: 0, width: 0, height: 0 }
      };
      fd.append("shipping", JSON.stringify(shippingData));

      if (pd.soldInfo) fd.append("soldInfo", JSON.stringify(pd.soldInfo));
      if (pd.fomo) fd.append("fomo", JSON.stringify(pd.fomo));
      if (pd.attributes?.length) fd.append("attributes", JSON.stringify(pd.attributes));

      const res = await axiosInstance.put(`/admin/products/${slug}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) return { product: res.data.product };
      return rejectWithValue(res.data.message || "Update failed");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// UPDATE VARIANT BY BARCODE - COMPLETE VARIANT UPDATE
// This is the ONLY way to update variant data (price, inventory, images, channelVisibility)
export const updateVariantByBarcode = createAsyncThunk(
  "adminVariants/updateByBarcode",
  async (
    { 
      slug, 
      barcode, 
      price,           // MUST contain { base, sale, wholesaleBase, wholesaleSale }
      inventory, 
      attributes, 
      isActive, 
      images, 
      wholesale, 
      minimumOrderQuantity, 
      channelVisibility 
    }, 
    { rejectWithValue }
  ) => {
    try {
      const fd = new FormData();
      fd.append("productCode", String(barcode));

      // Price - MUST be complete object with wholesale fields inside
      if (price !== undefined) {
        let pricePayload;
        try {
          pricePayload = buildPriceObj(price, "Variant base price");
        } catch (e) {
          return rejectWithValue(e.message);
        }
        fd.append("price", JSON.stringify(pricePayload));
      }

      if (inventory !== undefined) {
        fd.append("inventory", JSON.stringify(buildInventoryObj(inventory)));
      }

      if (attributes !== undefined) {
        const cleanAttrs = Array.isArray(attributes)
          ? attributes.filter((a) => a.key && a.value).map((a) => ({ key: a.key, value: a.value }))
          : [];
        fd.append("attributes", JSON.stringify(cleanAttrs));
      }

      if (isActive !== undefined) fd.append("isActive", String(isActive));
      if (wholesale !== undefined) fd.append("wholesale", String(wholesale));
      if (minimumOrderQuantity !== undefined) fd.append("minimumOrderQuantity", String(minimumOrderQuantity));

      // CRITICAL: channelVisibility MUST be sent for every variant update
      if (channelVisibility !== undefined) {
        fd.append("channelVisibility", JSON.stringify(channelVisibility));
      }

      // Images handling
      if (images !== undefined && images !== null) {
        const existingImages = images.filter((img) => img.url && !(img.file instanceof File));
        const newFiles = images.filter((img) => img.file instanceof File);

        if (existingImages.length > 0) {
          const sorted = [...existingImages].sort((a, b) => {
            if (a.isMain && !b.isMain) return -1;
            if (!a.isMain && b.isMain) return 1;
            return 0;
          });
          const existingPayload = sorted.map((img, i) => ({
            url: img.url,
            publicId: img.publicId || img.public_id || "",
            altText: img.altText || "",
            order: i,
          }));
          fd.append("existingImages", JSON.stringify(existingPayload));
        }

        newFiles.forEach((img) => {
          fd.append("variantImages", img.file);
        });
      }

      const res = await axiosInstance.put(`/admin/products/${slug}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 150000,
      });
      if (res.data.success) return { product: res.data.product };
      return rejectWithValue(res.data.message || "Variant update failed");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const addVariantToProduct = createAsyncThunk(
  "adminVariants/add",
  async ({ slug, variantData }, { rejectWithValue }) => {
    try {
      const rawCode = variantData.ProductCode ?? variantData.productCode;
      if (!rawCode && rawCode !== 0) return rejectWithValue("ProductCode is required to add a variant");
      const upper = String(rawCode).trim().toUpperCase();
      const m = upper.match(/^([A-Z0-9]+)-(\d+)$/);
      const seq = m ? Number(m[2]) : NaN;
      if (!m || !Number.isInteger(seq) || seq < 1)
        return rejectWithValue("ProductCode must be BASE-N (e.g., 3897-1 or 3897-01)");
      const canonicalProductCode = `${m[1]}-${seq}`;

      const fd = new FormData();
      fd.append("productCode", canonicalProductCode);

      let pricePayload;
      try {
        pricePayload = buildPriceObj(variantData.price, "Variant base price");
      } catch (e) {
        return rejectWithValue(e.message);
      }
      fd.append("price", JSON.stringify(pricePayload));

      const cleanAttrs = Array.isArray(variantData.attributes)
        ? variantData.attributes.filter((a) => a.key && a.value).map((a) => ({ key: a.key, value: a.value }))
        : [];
      fd.append("attributes", JSON.stringify(cleanAttrs));
      fd.append("inventory", JSON.stringify(buildInventoryObj(variantData.inventory || {})));
      fd.append("isActive", variantData.isActive !== false ? "true" : "false");
      fd.append("wholesale", variantData.wholesale ? "true" : "false");
      if (variantData.minimumOrderQuantity) fd.append("minimumOrderQuantity", String(variantData.minimumOrderQuantity));

      if (variantData.channelVisibility) {
        fd.append("channelVisibility", JSON.stringify(variantData.channelVisibility));
      }

      if (variantData.images?.length) {
        variantData.images.forEach((img) => {
          if (img?.file instanceof File) fd.append("variantImages", img.file);
        });
      }

      const res = await axiosInstance.post(`/admin/products/${slug}/variants`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) return { product: res.data.product };
      return rejectWithValue(res.data.message || "Add variant failed");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const softDeleteProduct = createAsyncThunk(
  "adminEditProduct/softDelete",
  async (slug, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/admin/products/${slug}`);
      if (response.data.success) return { slug, product: response.data.product };
      return rejectWithValue(response.data.message || "Archive failed");
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const toggleFeaturedProduct = createAsyncThunk(
  "adminEditProduct/toggleFeatured",
  async ({ product }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(`/admin/products/${product.slug}`, { isFeatured: !product.isFeatured });
      if (res.data.success) return { product: res.data.product };
      return rejectWithValue(res.data.message || "Toggle featured failed");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const changeProductStatus = createAsyncThunk(
  "adminEditProduct/changeStatus",
  async ({ product, status }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(`/admin/products/${product.slug}`, { status });
      if (res.data.success) return { product: res.data.product };
      return rejectWithValue(res.data.message || "Status change failed");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteVariantFromProduct = createAsyncThunk(
  "adminVariants/delete",
  async ({ slug, barcode }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.delete(`/admin/products/${slug}/variants`, { data: { productCode: barcode } });
      if (res.data.success) return { product: res.data.product };
      return rejectWithValue(res.data.message || "Delete variant failed");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const adminEditProductSlice = createSlice({
  name: "adminEditProduct",
  initialState: {
    updateLoading: false,
    updateError: null,
    updateSuccess: false,
    actionLoading: false,
    actionError: null,
    variantLoading: false,
    variantError: null,
    deleteLoading: false,
    deleteError: null,
    deleteSuccess: false,
  },
  reducers: {
    resetUpdateSuccess: (s) => { s.updateSuccess = false; },
    resetUpdateError: (s) => { s.updateError = null; },
    resetActionError: (s) => { s.actionError = null; },
    resetVariantError: (s) => { s.variantError = null; },
    resetDeleteSuccess: (s) => { s.deleteSuccess = false; },
    clearErrors: (s) => {
      s.updateError = null;
      s.actionError = null;
      s.variantError = null;
      s.deleteError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateProduct.pending, (s) => { s.updateLoading = true; s.updateError = null; s.updateSuccess = false; })
      .addCase(updateProduct.fulfilled, (s) => { s.updateLoading = false; s.updateSuccess = true; })
      .addCase(updateProduct.rejected, (s, { payload }) => { s.updateLoading = false; s.updateError = payload; })

      .addCase(updateVariantByBarcode.pending, (s) => { s.variantLoading = true; s.variantError = null; })
      .addCase(updateVariantByBarcode.fulfilled, (s) => { s.variantLoading = false; })
      .addCase(updateVariantByBarcode.rejected, (s, { payload }) => { s.variantLoading = false; s.variantError = payload; })

      .addCase(addVariantToProduct.pending, (s) => { s.variantLoading = true; s.variantError = null; })
      .addCase(addVariantToProduct.fulfilled, (s) => { s.variantLoading = false; })
      .addCase(addVariantToProduct.rejected, (s, { payload }) => { s.variantLoading = false; s.variantError = payload; })

      .addCase(softDeleteProduct.pending, (s) => { s.deleteLoading = true; s.deleteError = null; s.deleteSuccess = false; })
      .addCase(softDeleteProduct.fulfilled, (s) => { s.deleteLoading = false; s.deleteSuccess = true; })
      .addCase(softDeleteProduct.rejected, (s, { payload }) => { s.deleteLoading = false; s.deleteError = payload; })

      .addCase(toggleFeaturedProduct.pending, (s) => { s.actionLoading = true; s.actionError = null; })
      .addCase(toggleFeaturedProduct.fulfilled, (s) => { s.actionLoading = false; })
      .addCase(toggleFeaturedProduct.rejected, (s, { payload }) => { s.actionLoading = false; s.actionError = payload; })

      .addCase(changeProductStatus.pending, (s) => { s.actionLoading = true; s.actionError = null; })
      .addCase(changeProductStatus.fulfilled, (s) => { s.actionLoading = false; })
      .addCase(changeProductStatus.rejected, (s, { payload }) => { s.actionLoading = false; s.actionError = payload; })

      .addCase(deleteVariantFromProduct.pending, (s) => { s.variantLoading = true; s.variantError = null; })
      .addCase(deleteVariantFromProduct.fulfilled, (s) => { s.variantLoading = false; })
      .addCase(deleteVariantFromProduct.rejected, (s, { payload }) => { s.variantLoading = false; s.variantError = payload; });
  },
});

export const { resetUpdateSuccess, resetUpdateError, resetActionError, resetVariantError, resetDeleteSuccess, clearErrors } = adminEditProductSlice.actions;
export default adminEditProductSlice.reducer;
// code is working but upper code have wholesale sepration 
// // ADMIN_REDUX_MANAGEMENT/adminEditProductSlice.js
// //
// // ╔══════════════════════════════════════════════════════════════════════╗
// // ║  BACKEND: ONE ROUTE FOR ALL PRODUCT + VARIANT UPDATES               ║
// // ║  PUT /admin/products/:slug                                           ║
// // ║                                                                      ║
// // ║  Controller routing logic:                                           ║
// // ║  • req.body.productCode present → updates THAT variant by productCode║
// // ║    (price, inventory, attributes, isActive, images)                  ║
// // ║  • req.body.productCode absent  → updates product fields only        ║
// // ║    (name, title, desc, category, brand, status, shipping, etc.)      ║
// // ║                                                                      ║
// // ║  Other routes:                                                       ║
// // ║  POST   /:slug/variants   → add new variant                          ║
// // ║  DELETE /:slug            → soft delete product                      ║
// // ║  DELETE /:slug/variants   → delete variant { productCode }           ║
// // ╚══════════════════════════════════════════════════════════════════════╝

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axiosInstance from "../../../SERVICES/axiosInstance";

// // ─────────────────────────────────────────────────────────────────────────────
// // HELPERS
// // ─────────────────────────────────────────────────────────────────────────────
// const toNum = (raw) => {
//   if (raw === "" || raw === null || raw === undefined) return undefined;
//   const n = parseFloat(raw);
//   return isNaN(n) ? undefined : n;
// };

// const buildPriceObj = (price, label = "Base price") => {
//   const base = toNum(price?.base);
//   if (!base) throw new Error(`${label} is required and must be greater than 0`);
//   const saleRaw = toNum(price?.sale);
//   const sale =
//     price?.sale !== "" && price?.sale != null && saleRaw !== undefined
//       ? saleRaw
//       : null;

//   const priceObj = { base, sale };

//   if (price?.wholesaleBase !== undefined && price?.wholesaleBase !== "") {
//     priceObj.wholesaleBase = toNum(price.wholesaleBase) || 0;
//   }
//   if (price?.wholesaleSale !== undefined && price?.wholesaleSale !== "") {
//     priceObj.wholesaleSale = toNum(price.wholesaleSale) || null;
//   }

//   return priceObj;
// };

// const buildInventoryObj = (inv) => ({
//   quantity:          parseInt(inv?.quantity)          || 0,
//   lowStockThreshold: parseInt(inv?.lowStockThreshold) || 5,
//   trackInventory:    inv?.trackInventory !== false,
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // updateProduct — PUT /:slug  (NO productCode → product fields only)
// // Updates: name, title, description, category, brand, status,
// //          isFeatured, shipping, soldInfo, fomo, attributes
// // Does NOT update variants — backend does `delete updates.variants`
// // ─────────────────────────────────────────────────────────────────────────────
// export const updateProduct = createAsyncThunk(
//   "adminEditProduct/update",
//   async ({ slug, formData: pd }, { rejectWithValue }) => {
//     try {
//       const fd = new FormData();

//       if (pd.name)                     fd.append("name",        pd.name);
//       if (pd.title)                    fd.append("title",       pd.title);
//       if (pd.description)              fd.append("description", pd.description);
//       if (pd.category)                 fd.append("category",    pd.category);
//       if (pd.brand)                    fd.append("brand",       pd.brand);
//       if (pd.status)                   fd.append("status",      pd.status);
//       if (pd.isFeatured !== undefined) fd.append("isFeatured",  String(pd.isFeatured));

//       // Root level fields — taxRate in form maps to gstRate for backend
//       if (pd.hsnCode) fd.append("hsnCode", pd.hsnCode);
//       if (pd.taxRate !== undefined && pd.taxRate !== "") {
//         fd.append("gstRate", String(pd.taxRate));   // taxRate (form) → gstRate (backend)
//       }
//       if (pd.isFragile !== undefined) {
//         fd.append("isFragile", String(pd.isFragile));
//       }

//       // Don't include hsnCode, gstRate, isFragile inside shipping
//       const shippingData = {
//         ...pd.shipping,
//         weight: pd.shipping?.weight || 0,
//         dimensions: pd.shipping?.dimensions || { length: 0, width: 0, height: 0 }
//       };
//       fd.append("shipping", JSON.stringify(shippingData));

//       if (pd.soldInfo)           fd.append("soldInfo",   JSON.stringify(pd.soldInfo));
//       if (pd.fomo)               fd.append("fomo",       JSON.stringify(pd.fomo));
//       if (pd.attributes?.length) fd.append("attributes", JSON.stringify(pd.attributes));

//       const res = await axiosInstance.put(`/admin/products/${slug}`, fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Update failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // updateVariantByBarcode — PUT /:slug  WITH productCode in body
// // Controller sees productCode → routes to variant update branch
// //
// // ── IMAGE STRATEGY (two-channel) ────────────────────────────────────────────
// //
// //  CHANNEL 1 — existingImages (JSON string):
// //    Existing cloudinary images sent in their CORRECT ORDER.
// //    ★ FIX: images are sorted so isMain=true is ALWAYS at index 0.
// //    Backend stores order field; index 0 = main thumbnail on product pages.
// //    This is how "Set as main (★)" persists across saves — no re-upload needed.
// //
// //  CHANNEL 2 — variantImages (multipart files):
// //    New File uploads only. Backend will delete old cloudinary images
// //    and upload these new ones. Use when admin uploads fresh images.
// //
// //  Both channels can be combined when admin uploads new files AND
// //  has existing images in a specific order they want to keep.
// //
// // ── isActive FIX ────────────────────────────────────────────────────────────
// //  Backend variant branch was MISSING isActive in updateFields.
// //  See BACKEND_updateProduct_PATCH.js for the required backend change.
// //  Frontend correctly sends: fd.append("isActive", String(true/false))
// // ─────────────────────────────────────────────────────────────────────────────
// export const updateVariantByBarcode = createAsyncThunk(
//   "adminVariants/updateByBarcode",
//   async (
//     { slug, barcode, price, inventory, attributes, isActive, images, wholesale, minimumOrderQuantity },
//     { rejectWithValue }
//   ) => {
//     try {
//       const fd = new FormData();

//       // productCode MUST be sent — tells controller this is a variant update
//       // NOTE: param is named "barcode" in this thunk's signature for backwards
//       // compatibility with all call sites, but we send it as "productCode" to backend
//       fd.append("productCode", String(barcode));

//       // Price
//       if (price !== undefined) {
//         let pricePayload;
//         try {
//           pricePayload = buildPriceObj(price, "Variant base price");
//         } catch (e) {
//           return rejectWithValue(e.message);
//         }
//         fd.append("price", JSON.stringify(pricePayload));
//       }

//       // Inventory
//       if (inventory !== undefined) {
//         fd.append("inventory", JSON.stringify(buildInventoryObj(inventory)));
//       }

//       // Attributes
//       if (attributes !== undefined) {
//         const cleanAttrs = Array.isArray(attributes)
//           ? attributes
//               .filter((a) => a.key && a.value)
//               .map((a) => ({ key: a.key, value: a.value }))
//           : [];
//         fd.append("attributes", JSON.stringify(cleanAttrs));
//       }

//       // isActive
//       if (isActive !== undefined) {
//         fd.append("isActive", String(isActive));
//       }

//       // Wholesale flag
//       if (wholesale !== undefined) {
//         fd.append("wholesale", String(wholesale));
//       }

//       // Minimum Order Quantity
//       if (minimumOrderQuantity !== undefined) {
//         fd.append("minimumOrderQuantity", String(minimumOrderQuantity));
//       }

//       // ── IMAGES: two-channel approach ─────────────────────────────────────
//       if (images !== undefined && images !== null) {
//         const existingImages = images.filter(
//           (img) => img.url && !(img.file instanceof File)
//         );
//         const newFiles = images.filter((img) => img.file instanceof File);

//         // Channel 1: existing cloudinary images
//         // ★ KEY FIX: sort so isMain=true is at index 0
//         if (existingImages.length > 0) {
//           const sorted = [...existingImages].sort((a, b) => {
//             if (a.isMain && !b.isMain) return -1;
//             if (!a.isMain && b.isMain) return 1;
//             return 0;
//           });
//           const existingPayload = sorted.map((img, i) => ({
//             url:      img.url,
//             publicId: img.publicId || img.public_id || "",
//             altText:  img.altText  || "",
//             order:    i,
//           }));
//           fd.append("existingImages", JSON.stringify(existingPayload));
//         }

//         // Channel 2: new file uploads
//         newFiles.forEach((img) => {
//           fd.append("variantImages", img.file);
//         });
//       }

//       const res = await axiosInstance.put(`/admin/products/${slug}`, fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//         timeout: 150000,
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Variant update failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // addVariantToProduct — POST /:slug/variants
// // ─────────────────────────────────────────────────────────────────────────────
// export const addVariantToProduct = createAsyncThunk(
//   "adminVariants/add",
//   async ({ slug, variantData }, { rejectWithValue }) => {
//     try {
//       // productCode validation (variantData.ProductCode comes from VariantModal)
//       const rawCode = variantData.ProductCode ?? variantData.productCode;
//       if (!rawCode && rawCode !== 0)
//         return rejectWithValue("ProductCode is required to add a variant");
//       if (isNaN(Number(rawCode)))
//         return rejectWithValue("ProductCode must be a valid number");

//       const fd = new FormData();

//       fd.append("productCode", String(Number(rawCode)));   // barcode → productCode

//       let pricePayload;
//       try {
//         pricePayload = buildPriceObj(variantData.price, "Variant base price");
//       } catch (e) {
//         return rejectWithValue(e.message);
//       }
//       fd.append("price", JSON.stringify(pricePayload));

//       const cleanAttrs = Array.isArray(variantData.attributes)
//         ? variantData.attributes
//             .filter((a) => a.key && a.value)
//             .map((a) => ({ key: a.key, value: a.value }))
//         : [];
//       fd.append("attributes", JSON.stringify(cleanAttrs));

//       fd.append(
//         "inventory",
//         JSON.stringify(buildInventoryObj(variantData.inventory || {}))
//       );

//       fd.append("isActive", variantData.isActive !== false ? "true" : "false");

//       // Wholesale fields
//       fd.append("wholesale", variantData.wholesale ? "true" : "false");
//       if (variantData.minimumOrderQuantity) {
//         fd.append("minimumOrderQuantity", String(variantData.minimumOrderQuantity));
//       }

//       if (variantData.images?.length) {
//         variantData.images.forEach((img) => {
//           if (img?.file instanceof File) fd.append("variantImages", img.file);
//         });
//       }

//       const res = await axiosInstance.post(
//         `/admin/products/${slug}/variants`,
//         fd,
//         { headers: { "Content-Type": "multipart/form-data" } }
//       );

//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Add variant failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // softDeleteProduct — DELETE /:slug
// // ─────────────────────────────────────────────────────────────────────────────
// export const softDeleteProduct = createAsyncThunk(
//   "adminEditProduct/softDelete",
//   async (slug, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.delete(`/admin/products/${slug}`);
//       if (response.data.success) {
//         return {
//           slug,
//           product: response.data.product
//         };
//       }
//       return rejectWithValue(response.data.message || "Archive failed");
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || error.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // toggleFeaturedProduct — PUT /:slug  { isFeatured }
// // ─────────────────────────────────────────────────────────────────────────────
// export const toggleFeaturedProduct = createAsyncThunk(
//   "adminEditProduct/toggleFeatured",
//   async ({ product }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.put(`/admin/products/${product.slug}`, {
//         isFeatured: !product.isFeatured,
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Toggle featured failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // changeProductStatus — PUT /:slug  { status }
// // ─────────────────────────────────────────────────────────────────────────────
// export const changeProductStatus = createAsyncThunk(
//   "adminEditProduct/changeStatus",
//   async ({ product, status }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.put(`/admin/products/${product.slug}`, {
//         status,
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Status change failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // deleteVariantFromProduct — DELETE /:slug/variants  body: { productCode }
// // ─────────────────────────────────────────────────────────────────────────────
// export const deleteVariantFromProduct = createAsyncThunk(
//   "adminVariants/delete",
//   async ({ slug, barcode }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.delete(
//         `/admin/products/${slug}/variants`,
//         { data: { productCode: barcode } }   // barcode param → productCode for backend
//       );
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Delete variant failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // SLICE
// // ─────────────────────────────────────────────────────────────────────────────
// const adminEditProductSlice = createSlice({
//   name: "adminEditProduct",
//   initialState: {
//     updateLoading:  false,
//     updateError:    null,
//     updateSuccess:  false,
//     actionLoading:  false,
//     actionError:    null,
//     variantLoading: false,
//     variantError:   null,
//     deleteLoading:  false,
//     deleteError:    null,
//     deleteSuccess:  false,
//   },
//   reducers: {
//     resetUpdateSuccess: (s) => { s.updateSuccess = false; },
//     resetUpdateError:   (s) => { s.updateError   = null;  },
//     resetActionError:   (s) => { s.actionError   = null;  },
//     resetVariantError:  (s) => { s.variantError  = null;  },
//     resetDeleteSuccess: (s) => { s.deleteSuccess = false; },
//     clearErrors: (s) => {
//       s.updateError  = null;
//       s.actionError  = null;
//       s.variantError = null;
//       s.deleteError  = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(updateProduct.pending,   (s) => { s.updateLoading = true;  s.updateError = null; s.updateSuccess = false; })
//       .addCase(updateProduct.fulfilled, (s) => { s.updateLoading = false; s.updateSuccess = true; })
//       .addCase(updateProduct.rejected,  (s, { payload }) => { s.updateLoading = false; s.updateError = payload; })

//       .addCase(softDeleteProduct.pending,   (s) => { s.deleteLoading = true;  s.deleteError = null; s.deleteSuccess = false; })
//       .addCase(softDeleteProduct.fulfilled, (s) => { s.deleteLoading = false; s.deleteSuccess = true; })
//       .addCase(softDeleteProduct.rejected,  (s, { payload }) => { s.deleteLoading = false; s.deleteError = payload; })

//       .addCase(toggleFeaturedProduct.pending,   (s) => { s.actionLoading = true;  s.actionError = null; })
//       .addCase(toggleFeaturedProduct.fulfilled, (s) => { s.actionLoading = false; })
//       .addCase(toggleFeaturedProduct.rejected,  (s, { payload }) => { s.actionLoading = false; s.actionError = payload; })

//       .addCase(changeProductStatus.pending,   (s) => { s.actionLoading = true;  s.actionError = null; })
//       .addCase(changeProductStatus.fulfilled, (s) => { s.actionLoading = false; })
//       .addCase(changeProductStatus.rejected,  (s, { payload }) => { s.actionLoading = false; s.actionError = payload; })

//       .addCase(addVariantToProduct.pending,   (s) => { s.variantLoading = true;  s.variantError = null; })
//       .addCase(addVariantToProduct.fulfilled, (s) => { s.variantLoading = false; })
//       .addCase(addVariantToProduct.rejected,  (s, { payload }) => { s.variantLoading = false; s.variantError = payload; })

//       .addCase(updateVariantByBarcode.pending,   (s) => { s.variantLoading = true;  s.variantError = null; })
//       .addCase(updateVariantByBarcode.fulfilled, (s) => { s.variantLoading = false; })
//       .addCase(updateVariantByBarcode.rejected,  (s, { payload }) => { s.variantLoading = false; s.variantError = payload; })

//       .addCase(deleteVariantFromProduct.pending,   (s) => { s.variantLoading = true;  s.variantError = null; })
//       .addCase(deleteVariantFromProduct.fulfilled, (s) => { s.variantLoading = false; })
//       .addCase(deleteVariantFromProduct.rejected,  (s, { payload }) => { s.variantLoading = false; s.variantError = payload; });
//   },
// });

// export const {
//   resetUpdateSuccess, resetUpdateError, resetActionError,
//   resetVariantError,  resetDeleteSuccess, clearErrors,
// } = adminEditProductSlice.actions;

// export default adminEditProductSlice.reducer;
// code is wokring but upper code handle new fileds 
// // ADMIN_REDUX_MANAGEMENT/adminEditProductSlice.js
// //
// // ╔══════════════════════════════════════════════════════════════════════╗
// // ║  BACKEND: ONE ROUTE FOR ALL PRODUCT + VARIANT UPDATES               ║
// // ║  PUT /admin/products/:slug                                           ║
// // ║                                                                      ║
// // ║  Controller routing logic:                                           ║
// // ║  • req.body.barcode present → updates THAT variant by barcode       ║
// // ║    (price, inventory, attributes, isActive, images)                  ║
// // ║  • req.body.barcode absent  → updates product fields only            ║
// // ║    (name, title, desc, category, brand, status, shipping, etc.)      ║
// // ║                                                                      ║
// // ║  Other routes:                                                       ║
// // ║  POST   /:slug/variants   → add new variant                          ║
// // ║  DELETE /:slug            → soft delete product                      ║
// // ║  DELETE /:slug/variants   → delete variant { barcode }               ║
// // ╚══════════════════════════════════════════════════════════════════════╝

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axiosInstance from "../../../SERVICES/axiosInstance";

// // ─────────────────────────────────────────────────────────────────────────────
// // HELPERS
// // ─────────────────────────────────────────────────────────────────────────────
// const toNum = (raw) => {
//   if (raw === "" || raw === null || raw === undefined) return undefined;
//   const n = parseFloat(raw);
//   return isNaN(n) ? undefined : n;
// };

// const buildPriceObj = (price, label = "Base price") => {
//   const base = toNum(price?.base);
//   if (!base) throw new Error(`${label} is required and must be greater than 0`);
//   const saleRaw = toNum(price?.sale);
//   const sale =
//     price?.sale !== "" && price?.sale != null && saleRaw !== undefined
//       ? saleRaw
//       : null;
//   return { base, sale };
// };

// const buildInventoryObj = (inv) => ({
//   quantity:          parseInt(inv?.quantity)          || 0,
//   lowStockThreshold: parseInt(inv?.lowStockThreshold) || 5,
//   trackInventory:    inv?.trackInventory !== false,
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // updateProduct — PUT /:slug  (NO barcode → product fields only)
// // Updates: name, title, description, category, brand, status,
// //          isFeatured, shipping, soldInfo, fomo, attributes
// // Does NOT update variants — backend does `delete updates.variants`
// // ─────────────────────────────────────────────────────────────────────────────
// export const updateProduct = createAsyncThunk(
//   "adminEditProduct/update",
//   async ({ slug, formData: pd }, { rejectWithValue }) => {
//     try {
//       const fd = new FormData();

//       if (pd.name)                     fd.append("name",        pd.name);
//       if (pd.title)                    fd.append("title",       pd.title);
//       if (pd.description)              fd.append("description", pd.description);
//       if (pd.category)                 fd.append("category",    pd.category);
//       if (pd.brand)                    fd.append("brand",       pd.brand);
//       if (pd.status)                   fd.append("status",      pd.status);
//       if (pd.isFeatured !== undefined) fd.append("isFeatured",  String(pd.isFeatured));
//       if (pd.shipping)                 fd.append("shipping",    JSON.stringify(pd.shipping));
//       if (pd.soldInfo)                 fd.append("soldInfo",    JSON.stringify(pd.soldInfo));
//       if (pd.fomo)                     fd.append("fomo",        JSON.stringify(pd.fomo));
//       if (pd.attributes?.length)       fd.append("attributes",  JSON.stringify(pd.attributes));

//       const res = await axiosInstance.put(`/admin/products/${slug}`, fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Update failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // updateVariantByBarcode — PUT /:slug  WITH barcode in body
// // Controller sees barcode → routes to variant update branch
// //
// // ── IMAGE STRATEGY (two-channel) ────────────────────────────────────────────
// //
// //  CHANNEL 1 — existingImages (JSON string):
// //    Existing cloudinary images sent in their CORRECT ORDER.
// //    ★ FIX: images are sorted so isMain=true is ALWAYS at index 0.
// //    Backend stores order field; index 0 = main thumbnail on product pages.
// //    This is how "Set as main (★)" persists across saves — no re-upload needed.
// //
// //  CHANNEL 2 — variantImages (multipart files):
// //    New File uploads only. Backend will delete old cloudinary images
// //    and upload these new ones. Use when admin uploads fresh images.
// //
// //  Both channels can be combined when admin uploads new files AND
// //  has existing images in a specific order they want to keep.
// //
// // ── isActive FIX ────────────────────────────────────────────────────────────
// //  Backend variant branch was MISSING isActive in updateFields.
// //  See BACKEND_updateProduct_PATCH.js for the required backend change.
// //  Frontend correctly sends: fd.append("isActive", String(true/false))
// // ─────────────────────────────────────────────────────────────────────────────
// export const updateVariantByBarcode = createAsyncThunk(
//   "adminVariants/updateByBarcode",
//   async (
//     { slug, barcode, price, inventory, attributes, isActive, images },
//     { rejectWithValue }
//   ) => {
//     try {
//       const fd = new FormData();

//       // barcode MUST be sent — tells controller this is a variant update
//       fd.append("barcode", String(barcode));

//       // Price
//       if (price !== undefined) {
//         let pricePayload;
//         try {
//           pricePayload = buildPriceObj(price, "Variant base price");
//         } catch (e) {
//           return rejectWithValue(e.message);
//         }
//         fd.append("price", JSON.stringify(pricePayload));
//       }

//       // Inventory
//       if (inventory !== undefined) {
//         fd.append("inventory", JSON.stringify(buildInventoryObj(inventory)));
//       }

//       // Attributes
//       if (attributes !== undefined) {
//         const cleanAttrs = Array.isArray(attributes)
//           ? attributes
//               .filter((a) => a.key && a.value)
//               .map((a) => ({ key: a.key, value: a.value }))
//           : [];
//         fd.append("attributes", JSON.stringify(cleanAttrs));
//       }

//       // isActive — backend variant branch now handles this (see backend patch)
//       if (isActive !== undefined) {
//         fd.append("isActive", String(isActive));
//       }

//       // ── IMAGES: two-channel approach ─────────────────────────────────────
//       if (images !== undefined && images !== null) {
//         const existingImages = images.filter(
//           (img) => img.url && !(img.file instanceof File)
//         );
//         const newFiles = images.filter((img) => img.file instanceof File);

//         // Channel 1: existing cloudinary images
//         // ★ KEY FIX: sort so isMain=true is at index 0
//         // Backend uses array index as order; index 0 = main thumbnail
//         // Without this sort, clicking ★ would have no effect on the backend
//         if (existingImages.length > 0) {
//           const sorted = [...existingImages].sort((a, b) => {
//             if (a.isMain && !b.isMain) return -1;
//             if (!a.isMain && b.isMain) return 1;
//             return 0;
//           });
//           const existingPayload = sorted.map((img, i) => ({
//             url:      img.url,
//             publicId: img.publicId || img.public_id || "",
//             altText:  img.altText  || "",
//             order:    i,
//           }));
//           fd.append("existingImages", JSON.stringify(existingPayload));
//         }

//         // Channel 2: new file uploads
//         newFiles.forEach((img) => {
//           fd.append("variantImages", img.file);
//         });
//       }

//       const res = await axiosInstance.put(`/admin/products/${slug}`, fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Variant update failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // addVariantToProduct — POST /:slug/variants
// // ─────────────────────────────────────────────────────────────────────────────
// export const addVariantToProduct = createAsyncThunk(
//   "adminVariants/add",
//   async ({ slug, variantData }, { rejectWithValue }) => {
//     try {
//       if (!variantData.barcode && variantData.barcode !== 0)
//         return rejectWithValue("Barcode is required to add a variant");
//       if (isNaN(Number(variantData.barcode)))
//         return rejectWithValue("Barcode must be a valid number");

//       const fd = new FormData();

//       fd.append("barcode", String(Number(variantData.barcode)));

//       let pricePayload;
//       try {
//         pricePayload = buildPriceObj(variantData.price, "Variant base price");
//       } catch (e) {
//         return rejectWithValue(e.message);
//       }
//       fd.append("price", JSON.stringify(pricePayload));

//       const cleanAttrs = Array.isArray(variantData.attributes)
//         ? variantData.attributes
//             .filter((a) => a.key && a.value)
//             .map((a) => ({ key: a.key, value: a.value }))
//         : [];
//       fd.append("attributes", JSON.stringify(cleanAttrs));

//       fd.append(
//         "inventory",
//         JSON.stringify(buildInventoryObj(variantData.inventory || {}))
//       );

//       fd.append("isActive", variantData.isActive !== false ? "true" : "false");

//       if (variantData.images?.length) {
//         variantData.images.forEach((img) => {
//           if (img?.file instanceof File) fd.append("variantImages", img.file);
//         });
//       }

//       const res = await axiosInstance.post(
//         `/admin/products/${slug}/variants`,
//         fd,
//         { headers: { "Content-Type": "multipart/form-data" } }
//       );

//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Add variant failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // softDeleteProduct — DELETE /:slug
// // ─────────────────────────────────────────────────────────────────────────────
// export const softDeleteProduct = createAsyncThunk(
//   "adminEditProduct/softDelete",
//   async (slug, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.delete(`/admin/products/${slug}`);
//       if (response.data.success) {
//         // Make sure we return the product data in the expected format
//         return { 
//           slug, 
//           product: response.data.product // This must be present!
//         };
//       }
//       return rejectWithValue(response.data.message || "Archive failed");
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || error.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // toggleFeaturedProduct — PUT /:slug  { isFeatured }
// // ─────────────────────────────────────────────────────────────────────────────
// export const toggleFeaturedProduct = createAsyncThunk(
//   "adminEditProduct/toggleFeatured",
//   async ({ product }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.put(`/admin/products/${product.slug}`, {
//         isFeatured: !product.isFeatured,
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Toggle featured failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // changeProductStatus — PUT /:slug  { status }
// // ─────────────────────────────────────────────────────────────────────────────
// export const changeProductStatus = createAsyncThunk(
//   "adminEditProduct/changeStatus",
//   async ({ product, status }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.put(`/admin/products/${product.slug}`, {
//         status,
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Status change failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // deleteVariantFromProduct — DELETE /:slug/variants  body: { barcode }
// // ─────────────────────────────────────────────────────────────────────────────
// export const deleteVariantFromProduct = createAsyncThunk(
//   "adminVariants/delete",
//   async ({ slug, barcode }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.delete(
//         `/admin/products/${slug}/variants`,
//         { data: { barcode } }
//       );
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Delete variant failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // SLICE
// // ─────────────────────────────────────────────────────────────────────────────
// const adminEditProductSlice = createSlice({
//   name: "adminEditProduct",
//   initialState: {
//     updateLoading:  false,
//     updateError:    null,
//     updateSuccess:  false,
//     actionLoading:  false,
//     actionError:    null,
//     variantLoading: false,
//     variantError:   null,
//     deleteLoading:  false,
//     deleteError:    null,
//     deleteSuccess:  false,
//   },
//   reducers: {
//     resetUpdateSuccess: (s) => { s.updateSuccess = false; },
//     resetUpdateError:   (s) => { s.updateError   = null;  },
//     resetActionError:   (s) => { s.actionError   = null;  },
//     resetVariantError:  (s) => { s.variantError  = null;  },
//     resetDeleteSuccess: (s) => { s.deleteSuccess = false; },
//     clearErrors: (s) => {
//       s.updateError  = null;
//       s.actionError  = null;
//       s.variantError = null;
//       s.deleteError  = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(updateProduct.pending,   (s) => { s.updateLoading = true;  s.updateError = null; s.updateSuccess = false; })
//       .addCase(updateProduct.fulfilled, (s) => { s.updateLoading = false; s.updateSuccess = true; })
//       .addCase(updateProduct.rejected,  (s, { payload }) => { s.updateLoading = false; s.updateError = payload; })

//       .addCase(softDeleteProduct.pending,   (s) => { s.deleteLoading = true;  s.deleteError = null; s.deleteSuccess = false; })
//       .addCase(softDeleteProduct.fulfilled, (s) => { s.deleteLoading = false; s.deleteSuccess = true; })
//       .addCase(softDeleteProduct.rejected,  (s, { payload }) => { s.deleteLoading = false; s.deleteError = payload; })

//       .addCase(toggleFeaturedProduct.pending,   (s) => { s.actionLoading = true;  s.actionError = null; })
//       .addCase(toggleFeaturedProduct.fulfilled, (s) => { s.actionLoading = false; })
//       .addCase(toggleFeaturedProduct.rejected,  (s, { payload }) => { s.actionLoading = false; s.actionError = payload; })

//       .addCase(changeProductStatus.pending,   (s) => { s.actionLoading = true;  s.actionError = null; })
//       .addCase(changeProductStatus.fulfilled, (s) => { s.actionLoading = false; })
//       .addCase(changeProductStatus.rejected,  (s, { payload }) => { s.actionLoading = false; s.actionError = payload; })

//       .addCase(addVariantToProduct.pending,   (s) => { s.variantLoading = true;  s.variantError = null; })
//       .addCase(addVariantToProduct.fulfilled, (s) => { s.variantLoading = false; })
//       .addCase(addVariantToProduct.rejected,  (s, { payload }) => { s.variantLoading = false; s.variantError = payload; })

//       .addCase(updateVariantByBarcode.pending,   (s) => { s.variantLoading = true;  s.variantError = null; })
//       .addCase(updateVariantByBarcode.fulfilled, (s) => { s.variantLoading = false; })
//       .addCase(updateVariantByBarcode.rejected,  (s, { payload }) => { s.variantLoading = false; s.variantError = payload; })

//       .addCase(deleteVariantFromProduct.pending,   (s) => { s.variantLoading = true;  s.variantError = null; })
//       .addCase(deleteVariantFromProduct.fulfilled, (s) => { s.variantLoading = false; })
//       .addCase(deleteVariantFromProduct.rejected,  (s, { payload }) => { s.variantLoading = false; s.variantError = payload; });
//   },
// });

// export const {
//   resetUpdateSuccess, resetUpdateError, resetActionError,
//   resetVariantError,  resetDeleteSuccess, clearErrors,
// } = adminEditProductSlice.actions;

// export default adminEditProductSlice.reducer;

// work but try to fix the price issue
// // ADMIN_REDUX_MANAGEMENT/adminEditProductSlice.js
// //
// // ╔══════════════════════════════════════════════════════════════════════╗
// // ║  BACKEND: ONE ROUTE FOR ALL PRODUCT + VARIANT UPDATES               ║
// // ║  PUT /admin/products/:slug                                           ║
// // ║                                                                      ║
// // ║  Controller routing logic:                                           ║
// // ║  • req.body.barcode present → updates THAT variant by barcode       ║
// // ║    (price, inventory, attributes, isActive, images)                  ║
// // ║  • req.body.barcode absent  → updates product fields only            ║
// // ║    (name, title, desc, category, brand, status, shipping, etc.)      ║
// // ║                                                                      ║
// // ║  Other routes:                                                       ║
// // ║  POST   /:slug/variants   → add new variant                          ║
// // ║  DELETE /:slug            → soft delete product                      ║
// // ║  DELETE /:slug/variants   → delete variant { barcode }               ║
// // ╚══════════════════════════════════════════════════════════════════════╝

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axiosInstance from "../../../SERVICES/axiosInstance";

// // ─────────────────────────────────────────────────────────────────────────────
// // HELPERS
// // ─────────────────────────────────────────────────────────────────────────────
// const toNum = (raw) => {
//   if (raw === "" || raw === null || raw === undefined) return undefined;
//   const n = parseFloat(raw);
//   return isNaN(n) ? undefined : n;
// };

// const buildPriceObj = (price, label = "Base price") => {
//   const base = toNum(price?.base);
//   if (!base) throw new Error(`${label} is required and must be greater than 0`);
//   const saleRaw = toNum(price?.sale);
//   const sale = (price?.sale !== "" && price?.sale != null && saleRaw !== undefined) ? saleRaw : null;
//   return { base, sale };
// };

// const buildInventoryObj = (inv) => ({
//   quantity:          parseInt(inv?.quantity)          || 0,
//   lowStockThreshold: parseInt(inv?.lowStockThreshold) || 5,
//   trackInventory:    inv?.trackInventory !== false,
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // updateProduct — PUT /:slug  (NO barcode → product fields only)
// // Updates: name, title, description, category, brand, status,
// //          isFeatured, shipping, soldInfo, fomo, attributes, images
// // Does NOT update variants — backend does `delete updates.variants`
// // ─────────────────────────────────────────────────────────────────────────────
// export const updateProduct = createAsyncThunk(
//   "adminEditProduct/update",
//   async ({ slug, formData: pd }, { rejectWithValue }) => {
//     try {
//       const fd = new FormData();

//       if (pd.name)                     fd.append("name",        pd.name);
//       if (pd.title)                    fd.append("title",       pd.title);
//       if (pd.description)              fd.append("description", pd.description);
//       if (pd.category)                 fd.append("category",    pd.category);
//       if (pd.brand)                    fd.append("brand",       pd.brand);
//       if (pd.status)                   fd.append("status",      pd.status);
//       if (pd.isFeatured !== undefined) fd.append("isFeatured",  String(pd.isFeatured));
//       if (pd.shipping)                 fd.append("shipping",    JSON.stringify(pd.shipping));
//       if (pd.soldInfo)                 fd.append("soldInfo",    JSON.stringify(pd.soldInfo));
//       if (pd.fomo)                     fd.append("fomo",        JSON.stringify(pd.fomo));
//       if (pd.attributes?.length)       fd.append("attributes",  JSON.stringify(pd.attributes));

//       if (pd.images?.length) {
//         pd.images.forEach((img) => {
//           if (img.file instanceof File) fd.append("images", img.file);
//         });
//       }

//       const res = await axiosInstance.put(`/admin/products/${slug}`, fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Update failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // updateVariantByBarcode — PUT /:slug  WITH barcode in body
// // Controller sees barcode → routes to variant update branch
// // Updates: price, inventory, attributes, isActive, variantImages
// // Works for variants[0], variants[1], variants[2]... ALL of them
// // ─────────────────────────────────────────────────────────────────────────────
// export const updateVariantByBarcode = createAsyncThunk(
//   "adminVariants/updateByBarcode",
//   async ({ slug, barcode, price, inventory, attributes, isActive, images }, { rejectWithValue }) => {
//     try {
//       const fd = new FormData();

//       // barcode MUST be sent — this is the key that switches the controller to variant mode
//       fd.append("barcode", String(barcode));

//       if (price !== undefined) {
//         let pricePayload;
//         try { pricePayload = buildPriceObj(price, "Variant base price"); }
//         catch (e) { return rejectWithValue(e.message); }
//         fd.append("price", JSON.stringify(pricePayload));
//       }

//       if (inventory !== undefined) {
//         fd.append("inventory", JSON.stringify(buildInventoryObj(inventory)));
//       }

//       if (attributes !== undefined) {
//         fd.append("attributes", JSON.stringify(
//           Array.isArray(attributes) ? attributes.filter((a) => a.key && a.value) : []
//         ));
//       }

//       if (isActive !== undefined) {
//         fd.append("isActive", String(isActive));
//       }

//       if (images?.length) {
//         images.forEach((img) => {
//           if (img?.file instanceof File) fd.append("variantImages", img.file);
//         });
//       }

//       // SAME ROUTE as updateProduct — barcode in body tells controller it's a variant update
//       const res = await axiosInstance.put(`/admin/products/${slug}`, fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Variant update failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // addVariantToProduct — POST /:slug/variants
// // ─────────────────────────────────────────────────────────────────────────────
// export const addVariantToProduct = createAsyncThunk(
//   "adminVariants/add",
//   async ({ slug, variantData }, { rejectWithValue }) => {
//     try {
//       const fd = new FormData();

//       fd.append("barcode", String(variantData.barcode));
//       fd.append("attributes", JSON.stringify(
//         Array.isArray(variantData.attributes)
//           ? variantData.attributes.filter((a) => a.key && a.value)
//           : []
//       ));

//       let pricePayload;
//       try { pricePayload = buildPriceObj(variantData.price, "Variant base price"); }
//       catch (e) { return rejectWithValue(e.message); }

//       fd.append("price",     JSON.stringify(pricePayload));
//       fd.append("inventory", JSON.stringify(buildInventoryObj(variantData.inventory)));
//       fd.append("isActive",  variantData.isActive !== false ? "true" : "false");

//       if (variantData.images?.length) {
//         variantData.images.forEach((img) => {
//           if (img?.file instanceof File) fd.append("variantImages", img.file);
//         });
//       }

//       const res = await axiosInstance.post(`/admin/products/${slug}/variants`, fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Add variant failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // softDeleteProduct — DELETE /:slug
// // ─────────────────────────────────────────────────────────────────────────────
// export const softDeleteProduct = createAsyncThunk(
//   "adminEditProduct/softDelete",
//   async (slug, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.delete(`/admin/products/${slug}`);
//       if (res.data.success) return { slug, product: res.data.product };
//       return rejectWithValue(res.data.message || "Archive failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // toggleFeaturedProduct — PUT /:slug  { isFeatured }
// // ─────────────────────────────────────────────────────────────────────────────
// export const toggleFeaturedProduct = createAsyncThunk(
//   "adminEditProduct/toggleFeatured",
//   async ({ product }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.put(`/admin/products/${product.slug}`, {
//         isFeatured: !product.isFeatured,
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Toggle featured failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // changeProductStatus — PUT /:slug  { status }
// // ─────────────────────────────────────────────────────────────────────────────
// export const changeProductStatus = createAsyncThunk(
//   "adminEditProduct/changeStatus",
//   async ({ product, status }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.put(`/admin/products/${product.slug}`, { status });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Status change failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // deleteVariantFromProduct — DELETE /:slug/variants  body: { barcode }
// // ─────────────────────────────────────────────────────────────────────────────
// export const deleteVariantFromProduct = createAsyncThunk(
//   "adminVariants/delete",
//   async ({ slug, barcode }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.delete(`/admin/products/${slug}/variants`, {
//         data: { barcode },
//       });
//       if (res.data.success) return { product: res.data.product };
//       return rejectWithValue(res.data.message || "Delete variant failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // SLICE
// // ─────────────────────────────────────────────────────────────────────────────
// const adminEditProductSlice = createSlice({
//   name: "adminEditProduct",
//   initialState: {
//     updateLoading:  false,
//     updateError:    null,
//     updateSuccess:  false,
//     actionLoading:  false,
//     actionError:    null,
//     variantLoading: false,
//     variantError:   null,
//     deleteLoading:  false,
//     deleteError:    null,
//     deleteSuccess:  false,
//   },
//   reducers: {
//     resetUpdateSuccess: (s) => { s.updateSuccess = false; },
//     resetUpdateError:   (s) => { s.updateError   = null;  },
//     resetActionError:   (s) => { s.actionError   = null;  },
//     resetVariantError:  (s) => { s.variantError  = null;  },
//     resetDeleteSuccess: (s) => { s.deleteSuccess = false; },
//     clearErrors: (s) => {
//       s.updateError  = null;
//       s.actionError  = null;
//       s.variantError = null;
//       s.deleteError  = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(updateProduct.pending,   (s) => { s.updateLoading = true;  s.updateError = null; s.updateSuccess = false; })
//       .addCase(updateProduct.fulfilled, (s) => { s.updateLoading = false; s.updateSuccess = true; })
//       .addCase(updateProduct.rejected,  (s, { payload }) => { s.updateLoading = false; s.updateError = payload; })

//       .addCase(softDeleteProduct.pending,   (s) => { s.deleteLoading = true;  s.deleteError = null; s.deleteSuccess = false; })
//       .addCase(softDeleteProduct.fulfilled, (s) => { s.deleteLoading = false; s.deleteSuccess = true; })
//       .addCase(softDeleteProduct.rejected,  (s, { payload }) => { s.deleteLoading = false; s.deleteError = payload; })

//       .addCase(toggleFeaturedProduct.pending,   (s) => { s.actionLoading = true;  s.actionError = null; })
//       .addCase(toggleFeaturedProduct.fulfilled, (s) => { s.actionLoading = false; })
//       .addCase(toggleFeaturedProduct.rejected,  (s, { payload }) => { s.actionLoading = false; s.actionError = payload; })

//       .addCase(changeProductStatus.pending,   (s) => { s.actionLoading = true;  s.actionError = null; })
//       .addCase(changeProductStatus.fulfilled, (s) => { s.actionLoading = false; })
//       .addCase(changeProductStatus.rejected,  (s, { payload }) => { s.actionLoading = false; s.actionError = payload; })

//       .addCase(addVariantToProduct.pending,   (s) => { s.variantLoading = true;  s.variantError = null; })
//       .addCase(addVariantToProduct.fulfilled, (s) => { s.variantLoading = false; })
//       .addCase(addVariantToProduct.rejected,  (s, { payload }) => { s.variantLoading = false; s.variantError = payload; })

//       .addCase(updateVariantByBarcode.pending,   (s) => { s.variantLoading = true;  s.variantError = null; })
//       .addCase(updateVariantByBarcode.fulfilled, (s) => { s.variantLoading = false; })
//       .addCase(updateVariantByBarcode.rejected,  (s, { payload }) => { s.variantLoading = false; s.variantError = payload; })

//       .addCase(deleteVariantFromProduct.pending,   (s) => { s.variantLoading = true;  s.variantError = null; })
//       .addCase(deleteVariantFromProduct.fulfilled, (s) => { s.variantLoading = false; })
//       .addCase(deleteVariantFromProduct.rejected,  (s, { payload }) => { s.variantLoading = false; s.variantError = payload; });
//   },
// });

// export const {
//   resetUpdateSuccess, resetUpdateError, resetActionError,
//   resetVariantError,  resetDeleteSuccess, clearErrors,
// } = adminEditProductSlice.actions;

// export default adminEditProductSlice.reducer;

// // ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminEditProductSlice.js

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axiosInstance from "../../../SERVICES/axiosInstance";

// // ─────────────────────────────────────────────────────────────────────────────
// // HELPERS
// // ─────────────────────────────────────────────────────────────────────────────
// const buildProductFormData = (productData) => {
//   const fd = new FormData();

//   if (productData.name)        fd.append("name",        productData.name);
//   if (productData.title)       fd.append("title",       productData.title);
//   if (productData.description) fd.append("description", productData.description);
//   if (productData.category)    fd.append("category",    productData.category);
//   if (productData.brand)       fd.append("brand",       productData.brand);
//   if (productData.status)      fd.append("status",      productData.status);
//   if (productData.isFeatured !== undefined) fd.append("isFeatured", productData.isFeatured);

//   if (productData.shipping)  fd.append("shipping",  JSON.stringify(productData.shipping));
//   if (productData.soldInfo)  fd.append("soldInfo",  JSON.stringify(productData.soldInfo));
//   if (productData.fomo)      fd.append("fomo",      JSON.stringify(productData.fomo));
//   if (productData.attributes?.length) fd.append("attributes", JSON.stringify(productData.attributes));

//   if (productData.images?.length) {
//     productData.images.forEach((img) => {
//       if (img.file instanceof File) fd.append("images", img.file);
//     });
//   }

//   return fd;
// };

// const buildVariantFormData = (variantData) => {
//   const fd = new FormData();

//   fd.append("barcode", String(variantData.barcode));
//   fd.append("attributes", JSON.stringify(
//     Array.isArray(variantData.attributes)
//       ? variantData.attributes.filter((a) => a.key && a.value)
//       : []
//   ));
//   fd.append("price", JSON.stringify({
//     base: Number(variantData.price?.base) || 0,
//     sale:
//       variantData.price?.sale !== "" && variantData.price?.sale != null
//         ? Number(variantData.price.sale)
//         : null,
//   }));
//   fd.append("inventory", JSON.stringify({
//     quantity:          Number(variantData.inventory?.quantity)          || 0,
//     lowStockThreshold: Number(variantData.inventory?.lowStockThreshold) || 5,
//     trackInventory:    variantData.inventory?.trackInventory !== false,
//   }));
//   fd.append("isActive", variantData.isActive !== false ? "true" : "false");

//   if (variantData.images?.length) {
//     variantData.images.forEach((img) => {
//       if (img?.file instanceof File) fd.append("variantImages", img.file);
//     });
//   }

//   return fd;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // THUNKS
// // ─────────────────────────────────────────────────────────────────────────────

// // Update product fields (name, description, images, soldInfo, fomo, etc.)
// export const updateProduct = createAsyncThunk(
//   "adminEditProduct/update",
//   async ({ slug, formData: productData, silent = false }, { rejectWithValue }) => {
//     try {
//       const fd = buildProductFormData(productData);
//       const response = await axiosInstance.put(`/admin/products/${slug}`, fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       if (response.data.success) return { product: response.data.product, silent };
//       return rejectWithValue(response.data.message || "Update failed");
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || error.message);
//     }
//   }
// );

// // Soft delete (archive)
// export const softDeleteProduct = createAsyncThunk(
//   "adminEditProduct/softDelete",
//   async (slug, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.delete(`/admin/products/${slug}`);
//       if (response.data.success) return { slug, product: response.data.product };
//       return rejectWithValue(response.data.message || "Archive failed");
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || error.message);
//     }
//   }
// );

// // Toggle featured
// export const toggleFeaturedProduct = createAsyncThunk(
//   "adminEditProduct/toggleFeatured",
//   async ({ product }, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.put(`/admin/products/${product.slug}`, {
//         isFeatured: !product.isFeatured,
//       });
//       if (response.data.success) return { product: response.data.product };
//       return rejectWithValue(response.data.message || "Toggle featured failed");
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || error.message);
//     }
//   }
// );

// // Change status
// export const changeProductStatus = createAsyncThunk(
//   "adminEditProduct/changeStatus",
//   async ({ product, status }, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.put(`/admin/products/${product.slug}`, { status });
//       if (response.data.success) return { product: response.data.product };
//       return rejectWithValue(response.data.message || "Status change failed");
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || error.message);
//     }
//   }
// );

// // Add variant — POST /admin/products/:slug/variants  (multipart)
// export const addVariantToProduct = createAsyncThunk(
//   "adminVariants/add",
//   async ({ slug, variantData }, { rejectWithValue }) => {
//     try {
//       const fd = buildVariantFormData(variantData);
//       const response = await axiosInstance.post(`/admin/products/${slug}/variants`, fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       if (response.data.success) return { product: response.data.product };
//       return rejectWithValue(response.data.message || "Add variant failed");
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || error.message);
//     }
//   }
// );

// // Update variant by barcode — PUT /admin/products/:slug  (multipart, includes barcode)
// export const updateVariantByBarcode = createAsyncThunk(
//   "adminVariants/updateByBarcode",
//   async ({ slug, barcode, price, inventory, attributes, isActive, images }, { rejectWithValue }) => {
//     try {
//       const fd = new FormData();
//       fd.append("barcode", String(barcode));

//       if (price !== undefined)      fd.append("price",      JSON.stringify(price));
//       if (inventory !== undefined)  fd.append("inventory",  JSON.stringify(inventory));
//       if (attributes !== undefined) fd.append("attributes", JSON.stringify(attributes));
//       if (isActive !== undefined)   fd.append("isActive",   String(isActive));

//       if (images?.length) {
//         images.forEach((img) => {
//           if (img?.file instanceof File) fd.append("variantImages", img.file);
//         });
//       }

//       const response = await axiosInstance.put(`/admin/products/${slug}`, fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       if (response.data.success) return { product: response.data.product };
//       return rejectWithValue(response.data.message || "Update variant failed");
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || error.message);
//     }
//   }
// );

// // Delete variant — DELETE /admin/products/:slug/variants
// export const deleteVariantFromProduct = createAsyncThunk(
//   "adminVariants/delete",
//   async ({ slug, barcode }, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.delete(`/admin/products/${slug}/variants`, {
//         data: { barcode },
//       });
//       if (response.data.success) return { product: response.data.product };
//       return rejectWithValue(response.data.message || "Delete variant failed");
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || error.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // SLICE
// // ─────────────────────────────────────────────────────────────────────────────
// const adminEditProductSlice = createSlice({
//   name: "adminEditProduct",
//   initialState: {
//     updateLoading:  false,
//     updateError:    null,
//     updateSuccess:  false,
//     actionLoading:  false,
//     actionError:    null,
//     variantLoading: false,
//     variantError:   null,
//     deleteLoading:  false,
//     deleteError:    null,
//     deleteSuccess:  false,
//   },
//   reducers: {
//     resetUpdateSuccess: (state) => { state.updateSuccess = false; },
//     resetUpdateError:   (state) => { state.updateError   = null;  },
//     resetActionError:   (state) => { state.actionError   = null;  },
//     resetVariantError:  (state) => { state.variantError  = null;  },
//     resetDeleteSuccess: (state) => { state.deleteSuccess = false; },
//     clearErrors: (state) => {
//       state.updateError  = null;
//       state.actionError  = null;
//       state.variantError = null;
//       state.deleteError  = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(updateProduct.pending,   (state) => { state.updateLoading = true;  state.updateError = null; state.updateSuccess = false; })
//       .addCase(updateProduct.fulfilled, (state) => { state.updateLoading = false; state.updateSuccess = true; })
//       .addCase(updateProduct.rejected,  (state, { payload }) => { state.updateLoading = false; state.updateError = payload; })

//       .addCase(softDeleteProduct.pending,   (state) => { state.deleteLoading = true;  state.deleteError = null; state.deleteSuccess = false; })
//       .addCase(softDeleteProduct.fulfilled, (state) => { state.deleteLoading = false; state.deleteSuccess = true; })
//       .addCase(softDeleteProduct.rejected,  (state, { payload }) => { state.deleteLoading = false; state.deleteError = payload; })

//       .addCase(toggleFeaturedProduct.pending,   (state) => { state.actionLoading = true;  state.actionError = null; })
//       .addCase(toggleFeaturedProduct.fulfilled, (state) => { state.actionLoading = false; })
//       .addCase(toggleFeaturedProduct.rejected,  (state, { payload }) => { state.actionLoading = false; state.actionError = payload; })

//       .addCase(changeProductStatus.pending,   (state) => { state.actionLoading = true;  state.actionError = null; })
//       .addCase(changeProductStatus.fulfilled, (state) => { state.actionLoading = false; })
//       .addCase(changeProductStatus.rejected,  (state, { payload }) => { state.actionLoading = false; state.actionError = payload; })

//       .addCase(addVariantToProduct.pending,   (state) => { state.variantLoading = true;  state.variantError = null; })
//       .addCase(addVariantToProduct.fulfilled, (state) => { state.variantLoading = false; })
//       .addCase(addVariantToProduct.rejected,  (state, { payload }) => { state.variantLoading = false; state.variantError = payload; })

//       .addCase(updateVariantByBarcode.pending,   (state) => { state.variantLoading = true;  state.variantError = null; })
//       .addCase(updateVariantByBarcode.fulfilled, (state) => { state.variantLoading = false; })
//       .addCase(updateVariantByBarcode.rejected,  (state, { payload }) => { state.variantLoading = false; state.variantError = payload; })

//       .addCase(deleteVariantFromProduct.pending,   (state) => { state.variantLoading = true;  state.variantError = null; })
//       .addCase(deleteVariantFromProduct.fulfilled, (state) => { state.variantLoading = false; })
//       .addCase(deleteVariantFromProduct.rejected,  (state, { payload }) => { state.variantLoading = false; state.variantError = payload; });
//   },
// });

// export const {
//   resetUpdateSuccess,
//   resetUpdateError,
//   resetActionError,
//   resetVariantError,
//   resetDeleteSuccess,
//   clearErrors,
// } = adminEditProductSlice.actions;

// export default adminEditProductSlice.reducer;