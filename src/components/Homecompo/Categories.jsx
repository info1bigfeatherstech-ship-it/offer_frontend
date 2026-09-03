import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllCategories,
  selectHierarchicalCategories,
} from "../REDUX_FEATURES/REDUX_SLICES/userCategoriesSlice";

// ─── Cloudinary helper ────────────────────────────────────────────────────────
// Default: c_fill crops to a tight square (good for most category art).
// Per-slug overrides (e.g. fashion-world): c_fit keeps the full artwork in-frame
// so wide lettering is not clipped at the rounded square edges.
const DEFAULT_CLOUDINARY_TRANSFORM =
  "c_fill,g_center,w_500,h_500,q_auto,f_auto";
const CLOUDINARY_TRANSFORM_BY_SLUG = {
  "fashion-world": "c_fit,g_center,w_500,h_500,q_auto,f_auto",
};

/**
 * Inject a display transform into a Cloudinary delivery URL.
 * Leaves non-Cloudinary / empty / already-transformed URLs unchanged.
 */
const cloudinaryCrop = (url, slug) => {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  // Already has a transform segment (e.g. c_fill,... or w_500) — do not double-inject.
  if (/\/upload\/[^/]*[,_][^/]*\//.test(url)) {
    return url;
  }
  const transform =
    (slug && CLOUDINARY_TRANSFORM_BY_SLUG[slug]) || DEFAULT_CLOUDINARY_TRANSFORM;
  return url.replace("/upload/", `/upload/${transform}/`);
};

/** Safe CSS url(...) value — prevents quote breakage in style attributes. */
const cssUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  return `url("${url.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
};

/**
 * Top Categories tile image from admin `cardImage` only (not banner `image`).
 * @param {{ cardImage?: { url?: string } | string } | null | undefined} cat
 */
const getCategoryCardImageUrl = (cat) => {
  const raw =
    typeof cat?.cardImage === "string"
      ? cat.cardImage
      : cat?.cardImage?.url;
  const url = String(raw || "").trim();
  return url || null;
};

// Optional per-slug background behavior (default: bg-cover + strong scale).
const CATEGORY_BG_OVERRIDES = {
  "fashion-world": {
    // c_fit + contain; bg position + slight -translateY nudges art upward in the tile
    layerClass:
      "absolute inset-0 bg-[center_42%] bg-contain bg-no-repeat bg-white scale-[2.4] group-hover:scale-[2.4] -translate-y-[-3.4%] transition-transform duration-500 ease-in-out",
  },
};

const Categories = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [endIndex, setEndIndex] = useState(10);

  const categories = useSelector(selectHierarchicalCategories);
  const visibleCategories = categories.slice(0, endIndex);
  const { loading, error } = useSelector((state) => state.userCategories);

  useEffect(() => {
    if (categories.length === 0) {
      dispatch(fetchAllCategories()).catch((err) => {
        console.error("❌ Categories fetch failed:", err);
      });
    }
  }, [dispatch, categories.length]);

  const handleCategoryClick = (category) => {
    const slug =
      category.slug || category.name?.toLowerCase().replace(/\s+/g, "-");
    navigate(`/category/${slug}`);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading.categories) {
    return (
      <div className="w-full bg-white py-8 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-center mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-full aspect-square rounded-2xl bg-gray-200 animate-pulse" />
                <div className="h-3 w-20 bg-gray-200 rounded mt-3 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error.categories) {
    return (
      <div className="w-full py-8 flex flex-col items-center gap-3">
        <p className="text-sm text-gray-500">Failed to load categories</p>
        <button
          onClick={() => dispatch(fetchAllCategories())}
          className="px-5 py-2 bg-black text-white cursor-pointer text-sm font-semibold rounded-xl hover:bg-[#F7A221] transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (!categories || categories.length === 0) return null;

  // ── Main Render ──────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-white py-8 md:py-1 overflow-hidden">
      <section className="container mx-auto px-4">

        {/* Header — id for /#top-categories deep link (About page CTA, etc.) */}
        <div id="top-categories" className="flex flex-row items-center justify-center mb-8 md:mb-12">
          <h3 className="text-xl sm:text-2xl md:text-4xl font-lato flex items-center gap-2 md:gap-4 text-gray-900">
            <span className="w-2 h-8 md:w-3 md:h-12 bg-[#f7a221] rounded-full shadow-[0_0_15px_rgba(247,162,33,0.3)]" />
            Top Categories
          </h3>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6 lg:gap-8 max-w-7xl mx-auto">
          {visibleCategories.map((cat, idx) => {
            const rawUrl = getCategoryCardImageUrl(cat);
            const imageUrl = rawUrl ? cloudinaryCrop(rawUrl, cat.slug) : null;
            const bgLayerClass =
              (cat.slug && CATEGORY_BG_OVERRIDES[cat.slug]?.layerClass) ||
              "absolute inset-0 bg-center bg-cover scale-[1.9] group-hover:scale-[1.9] transition-transform duration-500 ease-in-out";

            return (
              <div
                key={cat._id || idx}
                onClick={() => handleCategoryClick(cat)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleCategoryClick(cat)}
                className="flex flex-col items-center group cursor-pointer transition-all duration-300 w-full max-w-[180px] mx-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7a221] rounded-2xl"
              >
                <div className="w-full aspect-square rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] overflow-hidden relative ring-1 ring-black/5 group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-300 bg-gray-100">
                  {/*
                    Image source: admin category.cardImage.url (Top Categories tile).
                    Banner stays on category.image for the category page hero.
                  */}
                  {imageUrl ? (
                    <div
                      className={bgLayerClass}
                      style={{ backgroundImage: cssUrl(imageUrl) }}
                      aria-hidden="true"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-gray-100"
                      aria-hidden="true"
                    >
                      <svg
                        className="w-10 h-10 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  {/* amber tint on hover */}
                  <div className="absolute inset-0 bg-[#f7a221]/0 group-hover:bg-[#f7a221]/10 transition-colors duration-300" />
                </div>

                <span className="text-[9px] md:text-[11px] font-bold mt-3 group-hover:text-[#f7a221] text-gray-600 text-center uppercase tracking-tight md:tracking-wider transition-colors duration-300 leading-tight line-clamp-2 px-1">
                  {cat.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* View More */}
        {endIndex < categories.length && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setEndIndex((prev) => prev + 5)}
              className="px-6 py-2 cursor-pointer rounded-xl bg-black text-white text-sm font-semibold hover:bg-[#F7A221] transition"
            >
              View More
            </button>
          </div>
        )}

      </section>
    </div>
  );
};

export default Categories;
