import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  toggleCategoryVisibility,
  fetchCategories,
} from "../ADMIN_REDUX_MANAGEMENT/categoriesSlice";

// ─────────────────────────────────────────────────────────────
//  ICONS  (inline SVG — no extra dependency)
// ─────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, className = "", strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {Array.isArray(d)
      ? d.map((p, i) => <path key={i} d={p} />)
      : <path d={d} />}
  </svg>
);

const ICONS = {
  close:     "M18 6L6 18M6 6l12 12",
  trash:     "M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  pencil:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  eye:       ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", "M12 9a3 3 0 100 6 3 3 0 000-6z"],
  eyeOff:   ["M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94", "M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19", "M14.12 14.12a3 3 0 01-4.24-4.24", "M1 1l22 22"],
  image:    ["M21 15l-5-5L5 21", "M3 3h18v18H3z", "M8.5 8.5a1 1 0 100 2 1 1 0 000-2z"],
  replace:  ["M1 4v6h6", "M23 20v-6h-6", "M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"],
  plus:      "M12 5v14M5 12h14",
  save:     ["M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z", "M17 21v-8H7v8M7 3v5h8"],
  alert:    ["M12 9v4", "M12 17h.01", "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"],
  gripLines: ["M4 8h16", "M4 16h16"],
};

// ─────────────────────────────────────────────────────────────
//  IMAGE PREVIEW  (real extracted component — never remounts)
// ─────────────────────────────────────────────────────────────
const ImagePreview = memo(({ src, isNewFile, onClear, onReplace, onUploadClick }) => {
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  // data: URIs are already in memory — treat them as instantly loaded.
  // Only remote http(s) URLs need the loading skeleton / onLoad wait.
  const isDataUri   = src?.startsWith("data:");
  const showVisible = loaded || isDataUri;   // show image immediately for local files

  useEffect(() => {
    // For data URIs we skip the skeleton entirely, so no need to reset.
    if (!isDataUri) {
      setLoaded(false);
      setError(false);
    } else {
      // Reset error state when a new data URI arrives
      setError(false);
    }
  }, [src, isDataUri]);

  if (!src) {
    return (
      <button
        type="button"
        onClick={onUploadClick}
        className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all duration-150"
      >
        <Icon d={ICONS.image} size={20} />
        <span className="text-xs font-medium">Click to upload image</span>
        <span className="text-[10px] text-gray-300">PNG · JPG · WEBP · max 5 MB</span>
      </button>
    );
  }

  return (
    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
      {/* Skeleton — only for remote URLs while they load */}
      {!showVisible && !error && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse z-10" />
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-gray-400 z-10">
          <Icon d={ICONS.alert} size={20} />
          <span className="text-xs">Failed to load image</span>
        </div>
      )}
      <img
        key={src}
        src={src}
        alt="Category preview"
        onLoad={() => { setLoaded(true); setError(false); }}
        onError={() => { setError(true); setLoaded(false); }}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${showVisible ? "opacity-100" : "opacity-0"}`}
      />
      {isNewFile && (
        <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full z-20 shadow-sm">
          New
        </span>
      )}
      <button
        type="button"
        onClick={onClear}
        title="Remove image"
        className="absolute cursor-pointer top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-md hover:bg-red-50 transition-colors z-20"
      >
        <Icon d={ICONS.close} size={13} className="text-red-500" />
      </button>
      <button
        type="button"
        onClick={onReplace}
        className="absolute bottom-2 cursor-pointer right-2 bg-white rounded-lg px-2.5 py-1 text-xs font-medium text-gray-700 shadow-md hover:bg-gray-50 transition-colors z-20 flex items-center gap-1.5"
      >
        <Icon d={ICONS.replace} size={11} />
        Replace
      </button>
    </div>
  );
});
ImagePreview.displayName = "ImagePreview";

// ─────────────────────────────────────────────────────────────
//  CATEGORY ROW
// ─────────────────────────────────────────────────────────────
const CategoryRow = ({
  cat,
  index,
  isEditing,
  isConfirmDelete,
  isDraggingOver,
  deleteLoading,
  toggleLoading,
  onSelect,
  onEdit,
  onToggleVisibility,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) => {
  const isHidden = cat.status === "inactive";

  const catImgUrl =
    cat?.image?.url ||
    cat?.image?.secure_url ||
    (typeof cat?.image === "string" && cat.image !== "" ? cat.image : null);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className={[
        "flex items-center gap-2 rounded-xl px-1.5 py-1 transition-all select-none border",
        isDraggingOver
          ? "border-blue-400 bg-blue-50/60 shadow-sm"
          : "border-transparent",
        isHidden  ? "opacity-50 bg-gray-50"            : (!isDraggingOver ? "hover:bg-gray-50" : ""),
        isEditing ? "ring-1 ring-blue-300 bg-blue-50"  : "",
      ].join(" ")}
    >
      {/* Drag handle */}
      <div
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors p-0.5 flex-shrink-0"
        title="Drag to reorder"
      >
        <Icon d={ICONS.gripLines} size={16} />
      </div>

      {/* Thumbnail */}
      {catImgUrl ? (
        <img
          src={catImgUrl}
          alt={cat.name}
          className={`w-8 h-8 rounded-md object-cover flex-shrink-0 border ${isHidden ? "border-gray-200 grayscale" : "border-gray-100"}`}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-100">
          <Icon d={ICONS.image} size={13} className="text-gray-300" />
        </div>
      )}

      {/* Name — click to select */}
      <button
        type="button"
        onClick={() => onSelect(cat._id)}
        className="flex-1 text-left px-2 py-1.5 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-sm text-gray-700 transition-colors min-w-0"
        title="Select this category"
      >
        <span className={`font-medium cursor-grab block truncate ${isHidden ? "line-through text-gray-400" : ""}`}>
          {cat.name}
        </span>
        {cat.description && (
          <span className="text-[11px] text-gray-400 truncate block leading-tight">
            {cat.description}
          </span>
        )}
      </button>

      {/* Visibility toggle */}
      <button
        type="button"
        onClick={() => onToggleVisibility(cat)}
        disabled={toggleLoading}
        title={isHidden ? "Show category" : "Hide category"}
        className={[
          "p-1.5 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40",
          isHidden
            ? "text-gray-400 cursor-pointer hover:text-green-600 hover:bg-green-50"
            : "text-green-500 cursor-pointer hover:text-gray-400 hover:bg-gray-100",
        ].join(" ")}
      >
        {isHidden
          ? <Icon d={ICONS.eyeOff} size={15} />
          : <Icon d={ICONS.eye}    size={15} />
        }
      </button>

      {/* Edit */}
      <button
        type="button"
        onClick={() => onEdit(cat)}
        title="Edit category"
        className={[
          "p-1.5 rounded-lg transition-colors flex-shrink-0",
          isEditing
            ? "text-blue-600 bg-blue-100"
            : "text-gray-400 cursor-pointer hover:text-blue-600 hover:bg-blue-50",
        ].join(" ")}
      >
        <Icon d={ICONS.pencil} size={15} />
      </button>

      {/* Delete */}
      {isConfirmDelete ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onDeleteConfirm(cat._id)}
            disabled={deleteLoading}
            className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1 transition-colors"
          >
            {deleteLoading
              ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              : "Delete"
            }
          </button>
          <button
            type="button"
            onClick={onDeleteCancel}
            className="px-2.5 py-1 text-xs cursor-pointer font-medium bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onDeleteRequest(cat._id)}
          title="Delete category"
          className="p-1.5 rounded-lg cursor-pointer text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
        >
          <Icon d={ICONS.trash} size={15} />
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  MAIN MODAL
// ─────────────────────────────────────────────────────────────
const CategoryModal = ({ onSelect, onClose }) => {
  const dispatch = useDispatch();

  const {
    categories,
    createLoading, createError,
    updateLoading, updateError,
    deleteLoading, deleteError,
    reorderLoading,
    toggleLoading,
  } = useSelector((state) => state.categories);

  // ── Ordered list (visual state for drag) ─────────────────────
  const [orderedCategories, setOrderedCategories] = useState([]);
  const [hasReordered,      setHasReordered]      = useState(false);
  const [dragOverIndex,     setDragOverIndex]      = useState(null);

  const dragSourceIndexRef = useRef(null);
  const orderedCatsRef     = useRef([]);

  useEffect(() => {
    orderedCatsRef.current = orderedCategories;
  }, [orderedCategories]);

  // ── Form ─────────────────────────────────────────────────────
  const [editingCat,    setEditingCat]    = useState(null);
  const [formName,      setFormName]      = useState("");
  const [formDesc,      setFormDesc]      = useState("");
  const [formImageFile, setFormImageFile] = useState(null);   // File | null
  const [formImageSrc,  setFormImageSrc]  = useState("");     // data URI | server URL | ""
  // Tracks the server URL of the category being edited so we can
  // restore it if the user cancels a new file selection.
  const existingImageUrlRef = useRef("");

  // ── Delete confirm ───────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const imageInputRef = useRef(null);
  const formTopRef    = useRef(null);

  const isEditMode = editingCat !== null;

  // ── Sync Redux → local list (only when drag is NOT active) ────
  useEffect(() => {
    if (dragSourceIndexRef.current !== null) return;
    const sorted = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setOrderedCategories(sorted);
  }, [categories]);

  // ── Fetch on mount ───────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // ── Keyboard: Escape closes ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ─────────────────────────────────────────────────────────────
  //  THE FIX: drive preview purely from state via useEffect
  //
  //  Previously applyPreview was async and called inside callbacks.
  //  Async state updates inside useCallback can silently lose the
  //  update if the component re-renders between the await and the
  //  setState call (React batches/discards in strict mode too).
  //
  //  Solution: watch formImageFile with a useEffect.
  //  - If a new File is picked  → generate data URI and set src.
  //  - If formImageFile is null → fall back to existingImageUrlRef
  //    (the server URL of the category being edited, or "" for create).
  //  This runs synchronously after every file change, guaranteed.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    if (formImageFile) {
      // New local file selected — generate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!cancelled) setFormImageSrc(e.target.result);
      };
      reader.onerror = () => {
        if (!cancelled) setFormImageSrc(existingImageUrlRef.current);
      };
      reader.readAsDataURL(formImageFile);
    } else {
      // No file selected — show existing server image (or nothing for create)
      setFormImageSrc(existingImageUrlRef.current);
    }

    return () => { cancelled = true; };
  }, [formImageFile]);

  // ─────────────────────────────────────────────────────────────
  //  IMAGE URL HELPER
  // ─────────────────────────────────────────────────────────────
  const getExistingImageUrl = useCallback((cat) =>
    cat?.image?.url ||
    cat?.image?.secure_url ||
    (typeof cat?.image === "string" && cat.image !== "" ? cat.image : null) ||
    ""
  , []);

  // ─────────────────────────────────────────────────────────────
  //  FORM CONTROLS
  // ─────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setEditingCat(null);
    setFormName("");
    setFormDesc("");
    setFormImageFile(null);
    existingImageUrlRef.current = "";
    // formImageSrc will auto-clear via the useEffect above
    if (imageInputRef.current) imageInputRef.current.value = "";
  }, []);

 const openEdit = useCallback((cat) => {
    setEditingCat(cat);
    setFormName(cat.name || "");
    setFormDesc(cat.description || "");
    setFormImageFile(null);
    const existingUrl = getExistingImageUrl(cat);
    existingImageUrlRef.current = existingUrl;
    setFormImageSrc(existingUrl);   // ← force-set directly, don't rely on useEffect
    if (imageInputRef.current) imageInputRef.current.value = "";
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [getExistingImageUrl]);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image (PNG, JPG, WEBP, etc.).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB.");
      return;
    }
    // Setting formImageFile triggers the useEffect which generates the preview
    setFormImageFile(file);
  }, []);

  const clearImage = useCallback(() => {
    setFormImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    // useEffect will restore existingImageUrlRef.current automatically
  }, []);

  // ─────────────────────────────────────────────────────────────
  //  CRUD
  // ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const name = formName.trim();
    if (!name) { alert("Category name is required."); return; }
    const result = await dispatch(createCategory({
      name,
      description: formDesc.trim(),
      imageFile: formImageFile || undefined,
    }));
    if (createCategory.fulfilled.match(result)) {
      await dispatch(fetchCategories());
      onSelect(result.payload._id);
      onClose();
    }
  };

  const handleSaveEdit = async () => {
    const name = formName.trim();
    if (!name) { alert("Category name is required."); return; }
    const result = await dispatch(updateCategory({
      id: editingCat._id,
      categoryData: {
        name,
        description: formDesc.trim(),
        imageFile: formImageFile || undefined,
      },
    }));
    if (updateCategory.fulfilled.match(result)) {
      await dispatch(fetchCategories());
      resetForm();
    }
  };

  const handleDelete = async (id) => {
    const result = await dispatch(deleteCategory(id));
    if (deleteCategory.fulfilled.match(result)) {
      setConfirmDeleteId(null);
      if (editingCat?._id === id) resetForm();
      await dispatch(fetchCategories());
    }
  };

  // ── Visibility toggle — optimistic + server rollback ──────────
  const handleToggleVisibility = useCallback(async (cat) => {
    const wasHidden = cat.status === "inactive";
    setOrderedCategories((prev) =>
      prev.map((c) =>
        c._id === cat._id
          ? { ...c, status: wasHidden ? "active" : "inactive" }
          : c
      )
    );
    const result = await dispatch(
      toggleCategoryVisibility({ id: cat._id, isHidden: !wasHidden })
    );
    if (!toggleCategoryVisibility.fulfilled.match(result)) {
      await dispatch(fetchCategories());
    }
  }, [dispatch]);

  const handleSelect = useCallback((catId) => {
    onSelect(catId);
    onClose();
  }, [onSelect, onClose]);

  // ─────────────────────────────────────────────────────────────
  //  DRAG & DROP
  // ─────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, index) => {
    dragSourceIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    e.currentTarget.style.opacity = "0.4";
  }, []);

  const handleDragEnd = useCallback((e) => {
    dragSourceIndexRef.current = null;
    setDragOverIndex(null);
    if (e.currentTarget) e.currentTarget.style.opacity = "";
  }, []);

  const handleDragOver = useCallback((e, targetIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const sourceIndex = dragSourceIndexRef.current;
    setDragOverIndex(targetIndex);

    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const current = [...orderedCatsRef.current];
    const [moved] = current.splice(sourceIndex, 1);
    current.splice(targetIndex, 0, moved);

    dragSourceIndexRef.current = targetIndex;
    setOrderedCategories(current);
    setHasReordered(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = useCallback((e, _targetIndex) => {
    e.preventDefault();
    dragSourceIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  const handleSaveOrder = async () => {
    const result = await dispatch(reorderCategories(orderedCategories));
    if (reorderCategories.fulfilled.match(result)) {
      setHasReordered(false);
      await dispatch(fetchCategories());
    } else {
      alert("Failed to save order. Please try again.");
      const sorted = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setOrderedCategories(sorted);
      setHasReordered(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────
  const anyError = createError || updateError || deleteError;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Manage Categories</h3>
            <p className="text-xs text-gray-400 mt-0.5">Create, edit, reorder or hide categories</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 cursor-pointer rounded-xl transition-colors text-gray-400 hover:text-gray-600"
          >
            <Icon d={ICONS.close} size={18} />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────── */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 min-h-0">

          {/* Error banner */}
          {anyError && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
              <Icon d={ICONS.alert} size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm leading-snug">{anyError}</p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              CREATE / EDIT FORM
          ══════════════════════════════════════════════════ */}
          <div ref={formTopRef} className="space-y-3">

            {/* Form header */}
            <div className="flex items-center justify-between min-h-6">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Editing:&nbsp;
                    <span className="text-blue-600 font-semibold truncate max-w-[160px]">
                      {editingCat.name}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-600">New category</span>
                )}
              </h4>
              {isEditMode && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-gray-400 cursor-pointer hover:text-gray-700 flex items-center gap-1 transition-colors"
                >
                  <Icon d={ICONS.close} size={12} />
                  Cancel edit
                </button>
              )}
            </div>

            {/* Name */}
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Category name (e.g. Electronics)"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter") isEditMode ? handleSaveEdit() : handleCreate();
              }}
            />

            {/* Image */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Category image
              </label>
              <ImagePreview
                src={formImageSrc}
                isNewFile={!!formImageFile}
                onClear={clearImage}
                onReplace={() => imageInputRef.current?.click()}
                onUploadClick={() => imageInputRef.current?.click()}
              />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Submit */}
            {isEditMode ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={updateLoading || !formName.trim()}
                  className="flex-1 py-2.5 cursor-pointer bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {updateLoading
                    ? <><span className="w-4 h-4 cursor-pointer border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                    : <><Icon d={ICONS.save} size={15} /> Save changes</>
                  }
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 border cursor-pointer border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                disabled={createLoading || !formName.trim()}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {createLoading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
                  : <><Icon d={ICONS.plus} size={15} /> Create &amp; select</>
                }
              </button>
            )}
          </div>

          {/* ── Divider ─────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] font-medium text-gray-400 tracking-wide uppercase">
              or select existing
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* ── Toolbar ─────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <Icon d={ICONS.gripLines} size={12} className="text-gray-300" />
              Drag to reorder
              <span className="mx-1 text-gray-200">·</span>
              <Icon d={ICONS.eye} size={12} className="text-gray-300" />
              Toggle visibility
            </p>

            {hasReordered && (
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={reorderLoading}
                className="flex items-center cursor-pointer gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {reorderLoading
                  ? <><span className="w-3 h-3 border-2 cursor-pointer border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                  : <><Icon d={ICONS.save} size={12} /> Save order</>
                }
              </button>
            )}
          </div>

          {/* ══════════════════════════════════════════════════
              CATEGORY LIST
          ══════════════════════════════════════════════════ */}
          <div className="space-y-0.5">
            {orderedCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Icon d={ICONS.image} size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No categories yet</p>
                <p className="text-xs text-gray-300 mt-0.5">Create one above to get started</p>
              </div>
            ) : (
              orderedCategories.map((cat, index) => (
                <CategoryRow
                  key={cat._id}
                  cat={cat}
                  index={index}
                  isEditing={editingCat?._id === cat._id}
                  isConfirmDelete={confirmDeleteId === cat._id}
                  isDraggingOver={dragOverIndex === index}
                  deleteLoading={deleteLoading}
                  toggleLoading={toggleLoading}
                  onSelect={handleSelect}
                  onEdit={openEdit}
                  onToggleVisibility={handleToggleVisibility}
                  onDeleteRequest={setConfirmDeleteId}
                  onDeleteConfirm={handleDelete}
                  onDeleteCancel={() => setConfirmDeleteId(null)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              ))
            )}
          </div>

          {/* ── Legend ──────────────────────────────────────── */}
          {orderedCategories.length > 0 && (
            <div className="flex items-center justify-center gap-4 text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              <span className="flex items-center gap-1">
                <Icon d={ICONS.eye} size={12} className="text-green-500" />
                Visible
              </span>
              <span className="text-gray-200">|</span>
              <span className="flex items-center gap-1">
                <Icon d={ICONS.eyeOff} size={12} className="text-gray-400" />
                Hidden
              </span>
              <span className="text-gray-200">|</span>
              <span className="flex items-center gap-1">
                <Icon d={ICONS.gripLines} size={12} className="text-gray-400" />
                Drag to reorder
              </span>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default CategoryModal;



// code is working but upper code have drag and drop plus hid cat 
// // Shared_components/CategoryModal.jsx

// import React, { useState, useRef, useEffect, useCallback } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   createCategory,
//   updateCategory,
//   deleteCategory,
// } from "../ADMIN_REDUX_MANAGEMENT/categoriesSlice";

// // ── Props ────────────────────────────────────────────────────
// // onSelect(categoryId) — called after user picks or creates a category
// // onClose()           — close the modal
// const CategoryModal = ({ onSelect, onClose }) => {
//   const dispatch = useDispatch();

//   const {
//     categories,
//     createLoading,
//     createError,
//     updateLoading,
//     updateError,
//     deleteLoading,
//     deleteError,
//   } = useSelector((state) => state.categories);

//   // ── Unified top-form state ───────────────────────────────────
//   const [editingCat, setEditingCat]       = useState(null);   // null = create mode
//   const [formName, setFormName]           = useState("");
//   const [formDescription, setFormDescription] = useState("");
//   const [formImageFile, setFormImageFile] = useState(null);   // raw File object
//   const [formImageSrc, setFormImageSrc]   = useState("");     // data: URI for <img>
//   const [imgLoaded, setImgLoaded]         = useState(false);  // track <img> load state
//   const [imgError, setImgError]           = useState(false);  // track <img> error state

//   const imageInputRef   = useRef(null);
//   const formTopRef      = useRef(null);

//   // ── Delete confirm ───────────────────────────────────────────
//   const [confirmDeleteId, setConfirmDeleteId] = useState(null);

//   const isEditMode = editingCat !== null;

//   // ─────────────────────────────────────────────────────────────
//   //  Convert File → base64 data URI  (avoids blob: URL issues)
//   // ─────────────────────────────────────────────────────────────
//   const fileToDataURI = (file) =>
//     new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload  = (e) => resolve(e.target.result);
//       reader.onerror = ()  => reject(new Error("FileReader failed"));
//       reader.readAsDataURL(file);
//     });

//   // ─────────────────────────────────────────────────────────────
//   //  Set the preview src — accepts a File or a URL string
//   // ─────────────────────────────────────────────────────────────
//   const applyPreview = useCallback(async (source) => {
//     setImgLoaded(false);
//     setImgError(false);

//     if (!source) {
//       setFormImageSrc("");
//       return;
//     }

//     if (source instanceof File) {
//       try {
//         const dataURI = await fileToDataURI(source);
//         setFormImageSrc(dataURI);
//       } catch (err) {
//         console.error("[CategoryModal] fileToDataURI failed:", err);
//         setFormImageSrc("");
//         setImgError(true);
//       }
//     } else if (typeof source === "string" && source.trim() !== "") {
//       // Already a URL (existing category image)
//       setFormImageSrc(source);
//     } else {
//       setFormImageSrc("");
//     }
//   }, []);

//   // ─────────────────────────────────────────────────────────────
//   //  RESET FORM
//   // ─────────────────────────────────────────────────────────────
//   const resetForm = useCallback(() => {
//     setEditingCat(null);
//     setFormName("");
//     setFormDescription("");
//     setFormImageFile(null);
//     setFormImageSrc("");
//     setImgLoaded(false);
//     setImgError(false);
//     if (imageInputRef.current) imageInputRef.current.value = "";
//   }, []);

//   // ─────────────────────────────────────────────────────────────
//   //  OPEN EDIT — prefills top form
//   // ─────────────────────────────────────────────────────────────
//   const openEdit = useCallback(async (cat) => {
//     setEditingCat(cat);
//     setFormName(cat.name || "");
//     setFormDescription(cat.description || "");
//     setFormImageFile(null);
//     if (imageInputRef.current) imageInputRef.current.value = "";

//     // Resolve the existing image URL from common shapes
//     const existingUrl =
//       cat?.image?.url ||
//       cat?.image?.secure_url ||
//       (typeof cat?.image === "string" && cat.image !== "" ? cat.image : null);

//     await applyPreview(existingUrl || null);

//     // Scroll to form top
//     setTimeout(() => {
//       formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
//     }, 50);
//   }, [applyPreview]);

//   // ─────────────────────────────────────────────────────────────
//   //  IMAGE INPUT CHANGE HANDLER
//   // ─────────────────────────────────────────────────────────────
//   const handleImageChange = useCallback(async (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     if (!file.type.startsWith("image/")) {
//       alert("Please select a valid image file (PNG, JPG, WEBP, etc.).");
//       return;
//     }
//     if (file.size > 5 * 1024 * 1024) {
//       alert("Image must be under 5 MB.");
//       return;
//     }

//     setFormImageFile(file);
//     await applyPreview(file);
//   }, [applyPreview]);

//   // ─────────────────────────────────────────────────────────────
//   //  CLEAR IMAGE
//   // ─────────────────────────────────────────────────────────────
//   const clearImage = useCallback(async () => {
//     setFormImageFile(null);
//     if (imageInputRef.current) imageInputRef.current.value = "";

//     if (isEditMode) {
//       // Revert to the saved category image
//       const existingUrl =
//         editingCat?.image?.url ||
//         editingCat?.image?.secure_url ||
//         (typeof editingCat?.image === "string" && editingCat.image !== ""
//           ? editingCat.image
//           : null);
//       await applyPreview(existingUrl || null);
//     } else {
//       await applyPreview(null);
//     }
//   }, [isEditMode, editingCat, applyPreview]);

//   // ─────────────────────────────────────────────────────────────
//   //  CREATE
//   // ─────────────────────────────────────────────────────────────
//   const handleCreate = async () => {
//     const name = formName.trim();
//     if (!name) {
//       alert("Category name is required.");
//       return;
//     }

//     const result = await dispatch(
//       createCategory({
//         name,
//         description: formDescription.trim(),
//         imageFile: formImageFile || undefined,
//       })
//     );

//     if (createCategory.fulfilled.match(result)) {
//       console.info("[CategoryModal] Created category:", result.payload);
//       onSelect(result.payload._id);
//       onClose();
//     } else {
//       console.error("[CategoryModal] createCategory failed:", result.payload);
//     }
//   };

//   // ─────────────────────────────────────────────────────────────
//   //  SAVE EDIT
//   // ─────────────────────────────────────────────────────────────
//   const handleSaveEdit = async () => {
//     const name = formName.trim();
//     if (!name) {
//       alert("Category name is required.");
//       return;
//     }

//     const result = await dispatch(
//       updateCategory({
//         id: editingCat._id,
//         categoryData: {
//           name,
//           description: formDescription.trim(),
//           imageFile: formImageFile || undefined,
//         },
//       })
//     );

//     if (updateCategory.fulfilled.match(result)) {
//       console.info("[CategoryModal] Updated category:", result.payload);
//       resetForm();
//     } else {
//       console.error(
//         "[CategoryModal] updateCategory failed for id=%s:",
//         editingCat._id,
//         result.payload
//       );
//     }
//   };

//   // ─────────────────────────────────────────────────────────────
//   //  DELETE
//   // ─────────────────────────────────────────────────────────────
//   const handleDelete = async (id) => {
//     const result = await dispatch(deleteCategory(id));

//     if (deleteCategory.fulfilled.match(result)) {
//       console.info("[CategoryModal] Deleted category id:", id);
//       setConfirmDeleteId(null);
//       if (editingCat?._id === id) resetForm();
//     } else {
//       console.error(
//         "[CategoryModal] deleteCategory failed for id=%s:",
//         id,
//         result.payload
//       );
//     }
//   };

//   // ─────────────────────────────────────────────────────────────
//   //  SELECT EXISTING
//   // ─────────────────────────────────────────────────────────────
//   const handleSelect = (catId) => {
//     onSelect(catId);
//     onClose();
//   };

//   // ─────────────────────────────────────────────────────────────
//   //  KEYBOARD — close on Escape
//   // ─────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
//     window.addEventListener("keydown", onKeyDown);
//     return () => window.removeEventListener("keydown", onKeyDown);
//   }, [onClose]);

//   const activeCategories = categories.filter((c) => c.status !== "inactive");

//   // ─────────────────────────────────────────────────────────────
//   //  IMAGE PREVIEW BLOCK (reused in the form)
//   // ─────────────────────────────────────────────────────────────
//   const ImagePreviewBlock = () => {
//     if (!formImageSrc) {
//       // Upload zone
//       return (
//         <button
//           type="button"
//           onClick={() => imageInputRef.current?.click()}
//           className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200"
//         >
//           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//               d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
//             />
//           </svg>
//           <span className="text-xs font-medium">Click to upload image</span>
//           <span className="text-[10px] text-gray-300">PNG, JPG, WEBP · max 5 MB</span>
//         </button>
//       );
//     }

//     return (
//       <div
//         style={{ position: "relative", width: "100%", height: "128px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e7eb", backgroundColor: "#f3f4f6" }}
//       >
//         {/* Loading shimmer — shown until image loads */}
//         {!imgLoaded && !imgError && (
//           <div
//             style={{
//               position: "absolute", inset: 0,
//               background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
//               backgroundSize: "200% 100%",
//               animation: "shimmer 1.2s infinite",
//               zIndex: 1,
//             }}
//           />
//         )}

//         {/* Error state */}
//         {imgError && (
//           <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", color: "#9ca3af", zIndex: 1 }}>
//             <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//             </svg>
//             <span style={{ fontSize: "11px" }}>Failed to load image</span>
//           </div>
//         )}

//         {/* The actual image — key forces remount on src change */}
//         <img
//           key={formImageSrc}
//           src={formImageSrc}
//           alt="Category preview"
//           onLoad={() => { setImgLoaded(true); setImgError(false); }}
//           onError={() => { setImgError(true); setImgLoaded(false); }}
//           style={{
//             position: "absolute", inset: 0,
//             width: "100%", height: "100%",
//             objectFit: "cover",
//             opacity: imgLoaded ? 1 : 0,
//             transition: "opacity 0.2s ease",
//             display: "block",
//           }}
//         />

//         {/* "New" badge */}
//         {formImageFile && imgLoaded && (
//           <span style={{
//             position: "absolute", top: 8, left: 8,
//             background: "#2563eb", color: "#fff",
//             fontSize: "10px", fontWeight: 700,
//             padding: "2px 8px", borderRadius: "999px",
//             boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
//             zIndex: 2,
//           }}>
//             New
//           </span>
//         )}

//         {/* Remove button */}
//         <button
//           type="button"
//           onClick={clearImage}
//           title="Remove image"
//           style={{
//             position: "absolute", top: 8, right: 8,
//             background: "#fff", border: "none", borderRadius: "50%",
//             width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
//             boxShadow: "0 1px 4px rgba(0,0,0,0.2)", cursor: "pointer", zIndex: 2,
//           }}
//         >
//           <svg style={{ width: 14, height: 14, color: "#ef4444", stroke: "#ef4444" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
//           </svg>
//         </button>

//         {/* Replace button */}
//         <button
//           type="button"
//           onClick={() => imageInputRef.current?.click()}
//           style={{
//             position: "absolute", bottom: 8, right: 8,
//             background: "#fff", border: "none", borderRadius: "8px",
//             padding: "4px 10px", fontSize: "11px", fontWeight: 600,
//             color: "#374151", cursor: "pointer",
//             boxShadow: "0 1px 4px rgba(0,0,0,0.15)", zIndex: 2,
//             display: "flex", alignItems: "center", gap: 4,
//           }}
//         >
//           <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
//           </svg>
//           Replace
//         </button>
//       </div>
//     );
//   };

//   // ─────────────────────────────────────────────────────────────
//   //  RENDER
//   // ─────────────────────────────────────────────────────────────
//   return (
//     <>
//       {/* Shimmer keyframe */}
//       <style>{`
//         @keyframes shimmer {
//           0%   { background-position: -200% 0; }
//           100% { background-position:  200% 0; }
//         }
//       `}</style>

//       <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[70]">
//         <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col">

//           {/* ── Header ── */}
//           <div className="p-5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
//             <h3 className="text-lg font-bold text-gray-900">Manage Categories</h3>
//             <button
//               type="button"
//               onClick={onClose}
//               className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
//             >
//               <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>
//           </div>

//           {/* ── Scrollable Body ── */}
//           <div className="p-5 space-y-5 overflow-y-auto flex-1">

//             {/* Error Banners */}
//             {createError && (
//               <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
//                 <p className="text-red-700 text-sm">❌ Create failed: {createError}</p>
//               </div>
//             )}
//             {updateError && (
//               <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
//                 <p className="text-red-700 text-sm">❌ Update failed: {updateError}</p>
//               </div>
//             )}
//             {deleteError && (
//               <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
//                 <p className="text-red-700 text-sm">❌ Delete failed: {deleteError}</p>
//               </div>
//             )}

//             {/* ══════════════════════════════════════════════════
//                 TOP FORM — Create OR Edit (shared)
//             ══════════════════════════════════════════════════ */}
//             <div ref={formTopRef} className="space-y-3">

//               {/* Dynamic header */}
//               <div className="flex items-center justify-between min-h-[24px]">
//                 <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
//                   {isEditMode ? (
//                     <>
//                       <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
//                       Editing:&nbsp;
//                       <span className="text-blue-600 font-bold">{editingCat.name}</span>
//                     </>
//                   ) : (
//                     "Create New Category"
//                   )}
//                 </h4>
//                 {isEditMode && (
//                   <button
//                     type="button"
//                     onClick={resetForm}
//                     className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
//                   >
//                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                     Cancel edit
//                   </button>
//                 )}
//               </div>

//               {/* Name */}
//               <input
//                 type="text"
//                 value={formName}
//                 onChange={(e) => setFormName(e.target.value)}
//                 placeholder="Category name (e.g., Electronics)"
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter") isEditMode ? handleSaveEdit() : handleCreate();
//                 }}
//               />

//               {/* Description */}
//               {/* <input
//                 type="text"
//                 value={formDescription}
//                 onChange={(e) => setFormDescription(e.target.value)}
//                 placeholder="Description (optional)"
//                 className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
//               /> */}

//               {/* Image */}
//               <div>
//                 <label className="block text-xs font-medium text-gray-500 mb-1.5">
//                   Category Image
//                 </label>
//                 <ImagePreviewBlock />
//                 <input
//                   ref={imageInputRef}
//                   type="file"
//                   accept="image/*"
//                   className="hidden"
//                   onChange={handleImageChange}
//                 />
//               </div>

//               {/* Submit */}
//               {isEditMode ? (
//                 <div className="flex gap-2">
//                   <button
//                     type="button"
//                     onClick={handleSaveEdit}
//                     disabled={updateLoading || !formName.trim()}
//                     className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
//                   >
//                     {updateLoading ? (
//                       <>
//                         <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
//                         Saving...
//                       </>
//                     ) : (
//                       <>
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                         </svg>
//                         Save Changes
//                       </>
//                     )}
//                   </button>
//                   <button
//                     type="button"
//                     onClick={resetForm}
//                     className="px-4 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
//                   >
//                     Cancel
//                   </button>
//                 </div>
//               ) : (
//                 <button
//                   type="button"
//                   onClick={handleCreate}
//                   disabled={createLoading || !formName.trim()}
//                   className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
//                 >
//                   {createLoading ? (
//                     <>
//                       <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
//                       Creating...
//                     </>
//                   ) : (
//                     "+ Create & Select"
//                   )}
//                 </button>
//               )}
//             </div>

//             {/* ── Divider ── */}
//             <div className="flex items-center gap-3">
//               <div className="flex-1 h-px bg-gray-200" />
//               <span className="text-xs text-gray-400 font-medium">OR SELECT EXISTING</span>
//               <div className="flex-1 h-px bg-gray-200" />
//             </div>

//             {/* ══════════════════════════════════════════════════
//                 EXISTING CATEGORIES LIST
//             ══════════════════════════════════════════════════ */}
//             <div className="max-h-60 overflow-y-auto space-y-1">
//               {activeCategories.length === 0 ? (
//                 <p className="text-center text-gray-400 text-sm py-6">
//                   No categories yet. Create one above.
//                 </p>
//               ) : (
//                 activeCategories.map((cat) => {
//                   const catImgUrl =
//                     cat?.image?.url ||
//                     cat?.image?.secure_url ||
//                     (typeof cat?.image === "string" && cat.image !== "" ? cat.image : null);

//                   return (
//                     <div
//                       key={cat._id}
//                       className={`flex items-center gap-2 rounded-xl px-1 py-0.5 transition-colors ${
//                         editingCat?._id === cat._id ? "bg-blue-50 ring-1 ring-blue-200" : ""
//                       }`}
//                     >
//                       {/* Thumbnail */}
//                       {catImgUrl && (
//                         <img
//                           src={catImgUrl}
//                           alt={cat.name}
//                           className="w-8 h-8 rounded-md object-cover flex-shrink-0 border border-gray-100"
//                           onError={(e) => { e.currentTarget.style.display = "none"; }}
//                         />
//                       )}

//                       {/* Name / Description — click to select */}
//                       <button
//                         type="button"
//                         onClick={() => handleSelect(cat._id)}
//                         className="flex-1 text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-sm text-gray-700 transition-colors min-w-0"
//                       >
//                         <span className="font-medium block truncate">{cat.name}</span>
//                         {cat.description && (
//                           <span className="text-xs text-gray-400 truncate block">
//                             {cat.description}
//                           </span>
//                         )}
//                       </button>

//                       {/* Edit pencil */}
//                       <button
//                         type="button"
//                         onClick={() => openEdit(cat)}
//                         title="Edit category"
//                         className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
//                           editingCat?._id === cat._id
//                             ? "text-blue-600 bg-blue-100"
//                             : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
//                         }`}
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
//                         </svg>
//                       </button>

//                       {/* Delete trash / inline confirm */}
//                       {confirmDeleteId === cat._id ? (
//                         <div className="flex items-center gap-1 flex-shrink-0">
//                           <button
//                             type="button"
//                             onClick={() => handleDelete(cat._id)}
//                             disabled={deleteLoading}
//                             className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60 flex items-center gap-1 transition-colors"
//                           >
//                             {deleteLoading ? (
//                               <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
//                             ) : "Yes"}
//                           </button>
//                           <button
//                             type="button"
//                             onClick={() => setConfirmDeleteId(null)}
//                             className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
//                           >
//                             No
//                           </button>
//                         </div>
//                       ) : (
//                         <button
//                           type="button"
//                           onClick={() => setConfirmDeleteId(cat._id)}
//                           title="Delete category"
//                           className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
//                         >
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                           </svg>
//                         </button>
//                       )}
//                     </div>
//                   );
//                 })
//               )}
//             </div>
//           </div>

//           {/* ── Footer ── */}
//           <div className="p-5 border-t border-gray-100 flex-shrink-0">
//             <button
//               type="button"
//               onClick={onClose}
//               className="w-full py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
//             >
//               Close
//             </button>
//           </div>

//         </div>
//       </div>
//     </>
//   );
// };

// export default CategoryModal;
// upper code have image upload option also for category 
// // Shared_components/CategoryModal.jsx

// import React, { useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { createCategory } from "../ADMIN_REDUX_MANAGEMENT/categoriesSlice";

// // ── Props ────────────────────────────────────────────────────
// // onSelect(categoryId) — called after user picks or creates a category
// // onClose()           — close the modal
// const CategoryModal = ({ onSelect, onClose }) => {
//   const dispatch = useDispatch();

//   // Categories + loading state from Redux
//   const { categories, createLoading, createError } = useSelector(
//     (state) => state.categories
//   );

//   const [newCategoryName, setNewCategoryName] = useState("");
//   const [newCategoryDescription, setNewCategoryDescription] = useState("");

//   // ── Create new category via API ──────────────────────────────
//   const handleCreate = async () => {
//     const name = newCategoryName.trim();
//     if (!name) {
//       alert("Category name is required");
//       return;
//     }

//     const result = await dispatch(
//       createCategory({ name, description: newCategoryDescription.trim() })
//     );

//     // If creation succeeded, auto-select the new category and close
//     if (createCategory.fulfilled.match(result)) {
//       const newCat = result.payload;
//       onSelect(newCat._id);
//       onClose();
//     }
//     // If failed, createError in Redux will show the error banner below
//   };

//   // ── Select existing ──────────────────────────────────────────
//   const handleSelect = (catId) => {
//     onSelect(catId);
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[70]">
//       <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">

//         {/* Header */}
//         <div className="p-5 border-b border-gray-200 flex items-center justify-between">
//           <h3 className="text-lg font-bold text-gray-900">Manage Categories</h3>
//           <button
//             type="button"
//             onClick={onClose}
//             className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
//           >
//             <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>

//         <div className="p-5 space-y-5">

//           {/* Error Banner */}
//           {createError && (
//             <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
//               <p className="text-red-700 text-sm">❌ {createError}</p>
//             </div>
//           )}

//           {/* Create New Category */}
//           <div className="space-y-3">
//             <h4 className="text-sm font-semibold text-gray-700">Create New Category</h4>
//             <input
//               type="text"
//               value={newCategoryName}
//               onChange={(e) => setNewCategoryName(e.target.value)}
//               placeholder="Category name (e.g., Electronics)"
//               className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
//               onKeyDown={(e) => e.key === "Enter" && handleCreate()}
//             />
//             <input
//               type="text"
//               value={newCategoryDescription}
//               onChange={(e) => setNewCategoryDescription(e.target.value)}
//               placeholder="Description (optional)"
//               className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
//             />
//             <button
//               type="button"
//               onClick={handleCreate}
//               disabled={createLoading || !newCategoryName.trim()}
//               className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//             >
//               {createLoading ? (
//                 <>
//                   <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
//                   Creating...
//                 </>
//               ) : (
//                 "+ Create & Select"
//               )}
//             </button>
//           </div>

//           {/* Divider */}
//           <div className="flex items-center gap-3">
//             <div className="flex-1 h-px bg-gray-200" />
//             <span className="text-xs text-gray-400 font-medium">OR SELECT EXISTING</span>
//             <div className="flex-1 h-px bg-gray-200" />
//           </div>

//           {/* Existing Categories List */}
//           <div className="max-h-52 overflow-y-auto space-y-1">
//             {categories.length === 0 ? (
//               <p className="text-center text-gray-400 text-sm py-6">
//                 No categories yet. Create one above.
//               </p>
//             ) : (
//               categories
//                 .filter((c) => c.status !== "inactive") // hide soft-deleted
//                 .map((cat) => (
//                   <button
//                     key={cat._id}
//                     type="button"
//                     onClick={() => handleSelect(cat._id)}
//                     className="w-full text-left px-4 py-2.5 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-sm text-gray-700 transition-colors flex items-center justify-between group"
//                   >
//                     <span className="font-medium">{cat.name}</span>
//                     {cat.description && (
//                       <span className="text-xs text-gray-400 group-hover:text-blue-500 truncate ml-3 max-w-[150px]">
//                         {cat.description}
//                       </span>
//                     )}
//                   </button>
//                 ))
//             )}
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="p-5 border-t border-gray-100">
//           <button
//             type="button"
//             onClick={onClose}
//             className="w-full py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
//           >
//             Cancel
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CategoryModal;

// code is working but upside code is api integrated ************
// import React, { useState } from 'react';

// const CategoryModal = ({ categories, setCategories, onSelect, onClose }) => {
//   const [newCategory, setNewCategory] = useState('');

//   const handleAdd = () => {
//     if (newCategory.trim()) {
//       const newCat = { _id: Date.now().toString(), name: newCategory };
//       setCategories([...categories, newCat]);
//       onSelect(newCat._id);
//       setNewCategory('');
//       onClose();
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
//       <div className="bg-white rounded-2xl max-w-md w-full p-6">
//         <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Category</h3>
//         <input
//           type="text"
//           value={newCategory}
//           onChange={(e) => setNewCategory(e.target.value)}
//           onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
//           className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg mb-4"
//           placeholder="e.g., Electronics"
//           autoFocus
//         />
//         <div className="flex justify-end gap-3">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 text-gray-600 hover:text-gray-800"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleAdd}
//             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//           >
//             Add
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CategoryModal;