import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Star, Loader2, X, ImagePlus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../SERVICES/axiosInstance";
import StarRatingInput from "./StarRatingInput";
import {
  getProductRatingDisplay,
  getBlendedStarDistribution,
} from "../../utils/productRatingDisplay";

const MAX_REVIEW_IMAGES = 5;

function logError(scope, err) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[ProductReviews:${scope}]`, err);
  }
}

function ReviewImageLightbox({ images, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex || 0);
  const total = images?.length || 0;

  useEffect(() => {
    setIndex(startIndex || 0);
  }, [startIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % total);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + total) % total);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, total]);

  if (!total) return null;
  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Review image preview"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white/90 hover:text-white p-2 rounded-full bg-black/40"
        aria-label="Close"
      >
        <X size={22} />
      </button>
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i - 1 + total) % total);
            }}
            className="absolute left-3 sm:left-6 text-white/90 hover:text-white p-2 rounded-full bg-black/40"
            aria-label="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i + 1) % total);
            }}
            className="absolute right-3 sm:right-6 text-white/90 hover:text-white p-2 rounded-full bg-black/40"
            aria-label="Next image"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
      <img
        src={current.url}
        alt={`Review photo ${index + 1}`}
        className="max-h-[85vh] max-w-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      {total > 1 && (
        <p className="absolute bottom-4 text-white/80 text-sm">
          {index + 1} / {total}
        </p>
      )}
    </div>
  );
}

function ReviewCard({ review, onImageClick, isOwn = false, onDelete, deleting = false }) {
  const images = Array.isArray(review.images) ? review.images : [];
  const authorInitial =
    typeof review.author === "string" && review.author.length > 0
      ? review.author.charAt(0)
      : "?";

  return (
    <li className="border-b border-gray-100 py-5 first:pt-0 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-zinc-700 uppercase">
            {authorInitial}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
            <span className="text-sm font-semibold text-gray-900">
              {isOwn ? "You" : review.author}
            </span>
            {review.verifiedPurchase ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Verified purchase
              </span>
            ) : null}
            {isOwn && (
              <button
                type="button"
                disabled={deleting}
                onClick={() => onDelete?.(review)}
                title="Delete review"
                aria-label="Delete review"
                className="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={14}
                  className={
                    s <= Math.round(Number(review.rating))
                      ? "text-amber-400 fill-amber-400"
                      : "text-gray-200 fill-gray-200"
                  }
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">
              {review.createdAt
                ? new Date(review.createdAt).toLocaleDateString()
                : ""}
            </span>
          </div>

          {review.comment?.trim() ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
              {review.comment.trim()}
            </p>
          ) : (
            <p className="text-sm text-gray-500 italic">Rated {review.rating} stars</p>
          )}

          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <button
                  key={img.publicId || img.url || idx}
                  type="button"
                  onClick={() => onImageClick(images, idx)}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-200 hover:border-amber-400 transition cursor-pointer"
                >
                  <img
                    src={img.url}
                    alt={`Review ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

const ProductReviewsContext = createContext(null);

function useProductReviewsCtx() {
  const ctx = useContext(ProductReviewsContext);
  if (!ctx) {
    throw new Error("Product review panels must be used inside ProductReviewsProvider");
  }
  return ctx;
}

/**
 * Shared review data + write form state for PDP compose (under gallery)
 * and published order-review list (before footer).
 */
export function ProductReviewsProvider({
  product,
  isLoggedIn,
  openAuthModal,
  reviewOrderIdFromQuery = "",
  wantsReviewFocus = false,
  children,
}) {
  const productId = product?._id ? String(product._id) : null;
  const composeRef = useRef(null);
  const reviewIntentHandledRef = useRef(false);
  const fileInputRef = useRef(null);

  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myReview, setMyReview] = useState(null);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [filterStar, setFilterStar] = useState(null);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [removeExistingPublicIds, setRemoveExistingPublicIds] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  const ratingDisplay = useMemo(
    () => getProductRatingDisplay(product, reviewSummary),
    [product, reviewSummary]
  );

  const resetImageDraft = useCallback(() => {
    setNewImageFiles((prevFiles) => {
      setNewImagePreviews((prevUrls) => {
        prevUrls.forEach((url) => {
          if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
        });
        return [];
      });
      return [];
    });
    setRemoveExistingPublicIds([]);
  }, []);

  const reloadReviews = useCallback(async (pid) => {
    const [sumRes, listRes] = await Promise.all([
      axiosInstance.get(`/product-reviews/public/${pid}/summary`),
      axiosInstance.get(`/product-reviews/public/${pid}`, { params: { limit: 100 } }),
    ]);
    setReviewSummary(sumRes.data?.summary ?? null);
    setReviewsList(Array.isArray(listRes.data?.reviews) ? listRes.data.reviews : []);
  }, []);

  const reloadMine = useCallback(
    async (pid) => {
      if (!isLoggedIn) {
        setMyReview(null);
        setReviewEligibility(null);
        return;
      }
      const mineRes = await axiosInstance.get(`/product-reviews/mine/${pid}`);
      const r = mineRes.data?.review;
      setMyReview(r || null);
      // Keep compose form clean — edit/delete from My Orders or published list
      setReviewForm({ rating: 5, comment: "" });

      const eligibilityRes = await axiosInstance.get(
        `/product-reviews/eligibility/${pid}`
      );
      setReviewEligibility(eligibilityRes.data?.eligibility || null);
    },
    [isLoggedIn]
  );

  useEffect(() => {
    if (!productId) {
      setReviewSummary(null);
      setReviewsList([]);
      setMyReview(null);
      setReviewEligibility(null);
      resetImageDraft();
      reviewIntentHandledRef.current = false;
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setReviewsLoading(true);
      try {
        await reloadReviews(productId);
      } catch (err) {
        logError("loadPublicReviews", err);
        if (!cancelled) {
          setReviewSummary(null);
          setReviewsList([]);
        }
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, reloadReviews, resetImageDraft]);

  useEffect(() => {
    if (!productId || !isLoggedIn) {
      if (!isLoggedIn) {
        setMyReview(null);
        setReviewEligibility(null);
      }
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        await reloadMine(productId);
      } catch (err) {
        logError("loadMine", err);
        if (!cancelled) {
          setMyReview(null);
          setReviewEligibility(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, isLoggedIn, reloadMine]);

  // Deep-link from My Orders → scroll to write form under gallery
  useEffect(() => {
    if (!wantsReviewFocus || !productId || reviewsLoading) return;
    if (reviewIntentHandledRef.current) return;
    if (!isLoggedIn) return;
    if (reviewEligibility == null && !myReview) return;

    reviewIntentHandledRef.current = true;
    const t = window.setTimeout(() => {
      composeRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 180);

    return () => window.clearTimeout(t);
  }, [
    wantsReviewFocus,
    productId,
    reviewsLoading,
    isLoggedIn,
    myReview,
    reviewEligibility,
  ]);

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [newImagePreviews]);

  /** All published storefront reviews: admin-generated + customer (verified purchase). */
  const publishedReviews = useMemo(() => reviewsList, [reviewsList]);

  /** Histogram = stable placeholder base + real published reviews (additive). */
  const starCounts = useMemo(
    () => getBlendedStarDistribution(product, publishedReviews),
    [product, publishedReviews]
  );

  const filteredPublishedReviews = filterStar
    ? publishedReviews.filter((r) => Math.round(r.rating) === filterStar)
    : publishedReviews;
  const visiblePublishedReviews = filteredPublishedReviews.slice(0, visibleCount);
  const canWriteOrUpdateReview = Boolean(
    myReview?._id || reviewEligibility?.canCreate
  );

  /**
   * Photos only in purchase context (My Orders / order deep-link).
   * Cold PDP reviews stay stars + comment only.
   */
  const canAttachImages = Boolean(String(reviewOrderIdFromQuery || "").trim());

  const isVerifiedMyReview = Boolean(
    myReview?.verifiedPurchase || myReview?.orderId
  );

  const existingKeptImages = useMemo(() => {
    const base = Array.isArray(myReview?.images) ? myReview.images : [];
    const removeSet = new Set(removeExistingPublicIds);
    return base.filter((img) => {
      const key = img.publicId || img.url;
      return key ? !removeSet.has(key) : true;
    });
  }, [myReview?.images, removeExistingPublicIds]);

  const remainingImageSlots =
    MAX_REVIEW_IMAGES - existingKeptImages.length - newImageFiles.length;

  const handlePickImages = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    const allowed = picked.slice(0, Math.max(0, remainingImageSlots));
    if (allowed.length < picked.length) {
      toast.info(`You can add up to ${MAX_REVIEW_IMAGES} photos per review`);
    }
    if (!allowed.length) return;
    setNewImageFiles((prev) => [...prev, ...allowed]);
    setNewImagePreviews((prev) => [
      ...prev,
      ...allowed.map((f) => URL.createObjectURL(f)),
    ]);
    e.target.value = "";
  };

  const removeNewImageAt = (idx) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewImagePreviews((prev) => {
      const url = prev[idx];
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const buildReviewFormData = () => {
    const fd = new FormData();
    fd.append("productId", productId);
    fd.append("rating", String(reviewForm.rating));
    fd.append("comment", String(reviewForm.comment || "").trim());
    const orderId =
      reviewOrderIdFromQuery || reviewEligibility?.qualifyingOrderId || "";
    if (orderId) fd.append("orderId", orderId);
    if (canAttachImages) {
      newImageFiles.forEach((file) => fd.append("reviewImages", file));
      if (removeExistingPublicIds.length) {
        fd.append("removeImagePublicIds", JSON.stringify(removeExistingPublicIds));
      }
    }
    return fd;
  };

  const submitProductReview = async (e) => {
    e.preventDefault();
    if (!productId || !isLoggedIn) {
      toast.info("Please log in to write a review");
      return;
    }
    if (myReview?._id) {
      if (isVerifiedMyReview) {
        toast.info("You’ve already reviewed this product. Manage it from My Orders.");
      } else {
        toast.info("You’ve already reviewed this product.");
      }
      return;
    }

    setReviewSubmitting(true);
    try {
      const fd = buildReviewFormData();
      await axiosInstance.post("/product-reviews", fd);
      toast.success("Thanks! Your review will appear after moderation.");

      await reloadReviews(productId);
      await reloadMine(productId);
      resetImageDraft();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Could not save review";
      toast.error(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const deleteMyReview = useCallback(
    async (reviewLike) => {
      const id = reviewLike?._id || myReview?._id;
      if (!id || !productId) return;
      if (
        !window.confirm(
          "Delete your review? Stars, comment, and photos will be removed."
        )
      ) {
        return;
      }
      setDeletingReviewId(String(id));
      try {
        await axiosInstance.delete(`/product-reviews/${id}`);
        toast.success("Review deleted");
        resetImageDraft();
        await reloadReviews(productId);
        await reloadMine(productId);
      } catch (err) {
        toast.error(
          err?.response?.data?.message || err?.message || "Could not delete review"
        );
      } finally {
        setDeletingReviewId(null);
      }
    },
    [myReview?._id, productId, reloadMine, reloadReviews, resetImageDraft]
  );

  const value = {
    product,
    productId,
    isLoggedIn,
    openAuthModal,
    composeRef,
    fileInputRef,
    reviewsLoading,
    ratingDisplay,
    starCounts,
    filterStar,
    setFilterStar,
    setVisibleCount,
    myReview,
    reviewEligibility,
    canWriteOrUpdateReview,
    canAttachImages,
    isVerifiedMyReview,
    reviewForm,
    setReviewForm,
    reviewSubmitting,
    submitProductReview,
    deleteMyReview,
    deletingReviewId,
    existingKeptImages,
    newImagePreviews,
    remainingImageSlots,
    handlePickImages,
    removeNewImageAt,
    setRemoveExistingPublicIds,
    filteredPublishedReviews,
    visiblePublishedReviews,
    visibleCount,
    lightbox,
    setLightbox,
  };

  return (
    <ProductReviewsContext.Provider value={value}>
      {children}
      {lightbox && (
        <ReviewImageLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </ProductReviewsContext.Provider>
  );
}

/** Write-a-review + star summary — under product gallery (original position). */
export function ProductReviewCompose() {
  const {
    productId,
    isLoggedIn,
    openAuthModal,
    composeRef,
    fileInputRef,
    reviewsLoading,
    ratingDisplay,
    starCounts,
    filterStar,
    setFilterStar,
    setVisibleCount,
    myReview,
    canAttachImages,
    isVerifiedMyReview,
    reviewForm,
    setReviewForm,
    reviewSubmitting,
    submitProductReview,
    deleteMyReview,
    deletingReviewId,
    newImagePreviews,
    remainingImageSlots,
    handlePickImages,
    removeNewImageAt,
  } = useProductReviewsCtx();

  if (!productId) return null;

  const { average: displayAvg, count: displayCount } = ratingDisplay;

  return (
    <div
      id="product-reviews-write"
      ref={composeRef}
      className="order-3 lg:order-none w-full mt-4 lg:mt-0"
    >
      <div className="border border-zinc-100 rounded-2xl overflow-hidden bg-white flex flex-col min-h-0 w-full">
        <div className="px-4 py-5 sm:px-6 sm:pt-6 sm:pb-4 flex-shrink-0 border-b border-zinc-100/90">
          <p className="text-lg font-bold text-gray-900 mb-3">Customer reviews</p>

          {reviewsLoading ? (
            <p className="text-sm text-gray-500 py-2">Loading reviews…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  {Number(displayAvg).toFixed(1)}
                </span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={18}
                      className={
                        s <= Math.round(Number(displayAvg))
                          ? "text-amber-400 fill-amber-400"
                          : "text-gray-200 fill-gray-200"
                      }
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {displayCount} {displayCount === 1 ? "rating" : "ratings"}
                </span>
              </div>

              <div className="space-y-1.5 mb-4">
                {starCounts.map(({ star, pct }) => {
                  const isActive = filterStar === star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setFilterStar(filterStar === star ? null : star);
                        setVisibleCount(5);
                        document
                          .getElementById("product-reviews-published")
                          ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
                      }}
                      className={`w-full flex items-center gap-2 sm:gap-3 px-2 py-1 rounded-lg transition-colors text-sm cursor-pointer ${
                        isActive ? "bg-amber-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-12 sm:w-14 text-left text-xs sm:text-sm text-gray-600 font-medium flex-shrink-0">
                        {star} star
                      </span>
                      <div className="flex-1 h-2.5 sm:h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isActive ? "bg-amber-500" : "bg-amber-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-gray-500 flex-shrink-0">
                        {pct}%
                      </span>
                    </button>
                  );
                })}
              </div>

              {!isLoggedIn && (
                <p className="text-sm text-gray-500 mt-2">
                  <button
                    type="button"
                    onClick={openAuthModal}
                    className="text-orange-600 font-bold hover:underline"
                  >
                    Log in
                  </button>{" "}
                  to leave a review
                </p>
              )}
            </>
          )}
        </div>

        {isLoggedIn && !reviewsLoading && (
          <div className="px-4 sm:px-6 py-4">
            {myReview?._id ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-3 space-y-2">
                {isVerifiedMyReview ? (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    You’ve already reviewed this product
                    {myReview.isActive
                      ? ". See it in the reviews below."
                      : " — pending moderation."}{" "}
                    Edit or delete with photos from{" "}
                    <span className="font-semibold text-gray-800">My Orders</span>.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    You’ve already reviewed this product
                    {myReview.isActive
                      ? "."
                      : "."}
                  </p>
                )}
                {!isVerifiedMyReview && (
                  <button
                    type="button"
                    disabled={deletingReviewId === String(myReview._id)}
                    onClick={() => deleteMyReview(myReview)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50 cursor-pointer"
                  >
                    {deletingReviewId === String(myReview._id) ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Delete my review
                  </button>
                )}
              </div>
            ) : (
              <form
                onSubmit={submitProductReview}
                className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 sm:p-4 space-y-3"
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Write a review
                </p>

                <StarRatingInput
                  value={reviewForm.rating}
                  onChange={(n) => setReviewForm((f) => ({ ...f, rating: n }))}
                  disabled={reviewSubmitting}
                  size={30}
                />

                <textarea
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm((f) => ({ ...f, comment: e.target.value }))
                  }
                  rows={3}
                  maxLength={2000}
                  placeholder="Share your thoughts about this product… (optional)"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition"
                />

                {canAttachImages && newImagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newImagePreviews.map((url, idx) => (
                      <div key={url} className="relative">
                        <img
                          src={url}
                          alt="New upload"
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImageAt(idx)}
                          className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full p-0.5"
                          aria-label="Remove new image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {canAttachImages && remainingImageSlots > 0 && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      multiple
                      className="hidden"
                      onChange={handlePickImages}
                    />
                    <button
                      type="button"
                      disabled={reviewSubmitting}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 cursor-pointer"
                    >
                      <ImagePlus size={16} />
                      Add photos
                    </button>
                  </>
                )}

                <button
                  type="submit"
                  disabled={reviewSubmitting || reviewForm.rating === 0}
                  className={`text-sm font-semibold px-5 py-2.5 ml-5 rounded-lg transition cursor-pointer ${
                    reviewForm.rating === 0
                      ? "bg-zinc-900 text-white opacity-40 cursor-not-allowed"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  } disabled:opacity-40`}
                >
                  {reviewSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    "Submit review"
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Amazon-style published reviews — admin-generated + customer reviews together
 * (below “Customers also bought”, before site footer).
 */
export function ProductPublishedReviews() {
  const {
    productId,
    reviewsLoading,
    filterStar,
    setFilterStar,
    setVisibleCount,
    filteredPublishedReviews,
    visiblePublishedReviews,
    visibleCount,
    setLightbox,
    myReview,
    deleteMyReview,
    deletingReviewId,
  } = useProductReviewsCtx();

  if (!productId) return null;

  return (
    <section
      id="product-reviews-published"
      className="mt-10 sm:mt-14 border-t border-gray-200 pt-8 sm:pt-10"
      aria-label="Published customer reviews"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Customer reviews
        </h2>
        {filterStar !== null && (
          <button
            type="button"
            onClick={() => {
              setFilterStar(null);
              setVisibleCount(5);
            }}
            className="text-xs font-semibold text-amber-600 hover:underline cursor-pointer"
          >
            Clear {filterStar}-star filter
          </button>
        )}
      </div>

      {reviewsLoading ? (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Loading reviews…
        </p>
      ) : filteredPublishedReviews.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">
          {filterStar != null
            ? `No reviews with ${filterStar} stars.`
            : "No published reviews yet."}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {visiblePublishedReviews.map((r) => {
              const isOwn =
                Boolean(myReview?._id) &&
                String(myReview._id) === String(r._id);
              return (
                <ReviewCard
                  key={r._id}
                  review={r}
                  isOwn={isOwn}
                  deleting={deletingReviewId === String(r._id)}
                  onDelete={deleteMyReview}
                  onImageClick={(images, idx) =>
                    setLightbox({ images, index: idx })
                  }
                />
              );
            })}
          </ul>

          {visibleCount < filteredPublishedReviews.length && (
            <div className="flex flex-col items-center gap-2 pt-6">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 5)}
                className="border border-zinc-200 rounded-xl px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                See more reviews
              </button>
              <p className="text-xs text-gray-400">
                Showing {Math.min(visibleCount, filteredPublishedReviews.length)} of{" "}
                {filteredPublishedReviews.length} reviews
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** @deprecated Prefer ProductReviewsProvider + compose/published panels */
export default function ProductReviewsSection(props) {
  return (
    <ProductReviewsProvider {...props}>
      <ProductPublishedReviews />
    </ProductReviewsProvider>
  );
}
