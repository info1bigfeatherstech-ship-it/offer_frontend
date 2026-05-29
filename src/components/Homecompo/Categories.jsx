import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllCategories,
  selectHierarchicalCategories,
} from "../REDUX_FEATURES/REDUX_SLICES/userCategoriesSlice";
import { useEffect } from "react";
import { useState } from "react";

// ─── Cloudinary helper ────────────────────────────────────────────────────────
// Default: c_fill crops to a tight square (good for most category art).
// Per-slug overrides (e.g. fashion-world): c_fit keeps the full artwork in-frame
// so wide lettering is not clipped at the rounded square edges.
const DEFAULT_CLOUDINARY_TRANSFORM =
  "c_fill,g_center,w_500,h_500,q_auto,f_auto";
const CLOUDINARY_TRANSFORM_BY_SLUG = {
  "fashion-world": "c_fit,g_center,w_500,h_500,q_auto,f_auto",
};

const cloudinaryCrop = (url, slug) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const transform =
    (slug && CLOUDINARY_TRANSFORM_BY_SLUG[slug]) || DEFAULT_CLOUDINARY_TRANSFORM;
  return url.replace("/upload/", `/upload/${transform}/`);
};

// Optional per-slug background behavior (default: bg-cover + strong scale).
const CATEGORY_BG_OVERRIDES = {
  "fashion-world": {
    // c_fit + contain; bg position + slight -translateY nudges art upward in the tile
    layerClass:
      "absolute inset-0 bg-[center_42%] bg-contain bg-no-repeat bg-white scale-[2.4] group-hover:scale-[2.4] -translate-y-[-3.4%] transition-transform duration-500 ease-in-out",
  },
};

const CATEGORY_THUMBNAILS = {
  "home-and-kitchen":
    "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572784/sve/frere/Home_Kitchen.jpg",
  "smart-life-gadgets":
    "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572772/sve/frere/Smart_Life_Gadget.jpg",
  "fashion-world":
    "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572775/sve/frere/Fashion.jpg",
  "sports-and-fitness":
    "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572776/sve/frere/sports_Fitness.jpg",
  "tours-and-travels":
    "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572778/sve/frere/tours_travels.jpg",
  stationary:
    "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572785/sve/frere/Stationary.jpg",
  "baby-items":
    "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572780/sve/frere/Baby_Items.jpg",
  "cleaning-and-housekeeping-supplies":
    "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572769/sve/frere/Cleaning_housekeeping_supplies.jpg",
  gifts:
    "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572782/sve/frere/Gift.jpg",
  "mix-items":
    "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572771/sve/frere/mix_items.jpg",
  "car-accessories":
    "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572774/sve/frere/Car_Accessories.jpg",
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
  }, [dispatch]);

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
            const rawUrl =
              CATEGORY_THUMBNAILS[cat.slug] ||
              cat.image?.url ||
              "/placeholder-category.jpg";

            // Cloudinary server-side crop → strips background padding at source
            const imageUrl = cloudinaryCrop(rawUrl, cat.slug);
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
                <div className="w-full aspect-square rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] overflow-hidden relative ring-1 ring-black/5 group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-300">
                  {/*
                    Default: Cloudinary c_fill + bg-cover + scale for edge-to-edge tiles.
                    Per-slug overrides (see CATEGORY_BG_OVERRIDES), e.g. fashion-world uses
                    c_fit + bg-contain so wide lettering stays inside the rounded frame.
                  */}
                  <div
                    className={bgLayerClass}
                    style={{ backgroundImage: `url('${imageUrl}')` }}
                    aria-hidden="true"
                  />
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

