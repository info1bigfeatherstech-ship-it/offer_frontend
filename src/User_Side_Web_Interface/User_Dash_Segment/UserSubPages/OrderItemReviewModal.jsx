import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X, Camera, Image as ImageIcon } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../../SERVICES/axiosInstance";
import StarRatingInput from "../../Product_segment/StarRatingInput";

const MAX_REVIEW_IMAGES = 5;

/**
 * In-order product review modal — write review without leaving My Orders.
 */
export default function OrderItemReviewModal({
  open,
  onClose,
  orderId,
  productId,
  productName,
  productImage,
  variantId = null,
  onSuccess,
}) {
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [mediaMenuOpen, setMediaMenuOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    setRating(5);
    setComment("");
    setNewFiles([]);
    setNewPreviews([]);
    setMediaMenuOpen(false);

    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, submitting, onClose]);

  useEffect(() => {
    return () => {
      newPreviews.forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [newPreviews]);

  if (!open) return null;

  const remainingSlots = MAX_REVIEW_IMAGES - newFiles.length;

  const handlePickImages = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    const allowed = picked.slice(0, Math.max(0, remainingSlots));
    if (allowed.length < picked.length) {
      toast.info(`You can add up to ${MAX_REVIEW_IMAGES} photos`);
    }
    if (!allowed.length) return;
    setNewFiles((prev) => [...prev, ...allowed]);
    setNewPreviews((prev) => [
      ...prev,
      ...allowed.map((f) => URL.createObjectURL(f)),
    ]);
    e.target.value = "";
  };

  const removeNewAt = (idx) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => {
      const url = prev[idx];
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId || !orderId) {
      toast.error("Missing product or order reference");
      return;
    }
    if (!rating || rating < 1) {
      toast.info("Please select a star rating");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("productId", String(productId));
      fd.append("rating", String(rating));
      fd.append("comment", String(comment || "").trim());
      fd.append("orderId", String(orderId));
      if (variantId) fd.append("variantId", String(variantId));
      newFiles.forEach((file) => fd.append("reviewImages", file));

      await axiosInstance.post("/product-reviews", fd);
      toast.success("Thanks! Your review will appear after moderation.");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Could not save review"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={() => {
        if (!submitting) onClose();
      }}
      role="presentation"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Write a review"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-3xl z-10">
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900">Write a review</p>
            <p className="text-[11px] text-gray-400 font-medium truncate">
              Order {orderId}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden shrink-0">
            {productImage ? (
              <img
                src={productImage}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-amber-500">
                <Camera size={20} />
              </div>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
            {productName || "Product"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-6 pt-2 space-y-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Your rating
            </p>
            <StarRatingInput
              value={rating}
              onChange={setRating}
              disabled={submitting}
              size={34}
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
              Comment (optional)
            </label>

            <div className="relative rounded-2xl border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-200 focus-within:border-amber-200 transition">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={2000}
                disabled={submitting}
                placeholder="How was the product? Share your experience…"
                className="w-full text-sm bg-transparent resize-none px-3 pt-3 pb-12 focus:outline-none"
              />

              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                <div className="relative">
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg,image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handlePickImages(e);
                      setMediaMenuOpen(false);
                    }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      handlePickImages(e);
                      setMediaMenuOpen(false);
                    }}
                  />

                  {remainingSlots > 0 ? (
                    <>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setMediaMenuOpen((v) => !v)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition shadow-sm disabled:opacity-40"
                        aria-label="Add photos"
                        title="Add photos"
                      >
                        <Camera size={18} />
                      </button>

                      {mediaMenuOpen && (
                        <div className="absolute bottom-11 left-0 z-20 w-48 rounded-2xl border border-gray-100 bg-white shadow-xl p-1.5">
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                              setMediaMenuOpen(false);
                              cameraInputRef.current?.click();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-50 cursor-pointer"
                          >
                            <Camera size={16} className="text-zinc-700" />
                            Take photo
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                              setMediaMenuOpen(false);
                              galleryInputRef.current?.click();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-50 cursor-pointer"
                          >
                            <ImageIcon size={16} className="text-zinc-700" />
                            From gallery
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] font-medium text-gray-400 px-2">
                      Max {MAX_REVIEW_IMAGES} photos
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-gray-400 tabular-nums">
                  {String(comment || "").length}/2000
                  {remainingSlots > 0 && remainingSlots < MAX_REVIEW_IMAGES
                    ? ` · ${remainingSlots} photo slots left`
                    : ""}
                </span>
              </div>
            </div>

            {newPreviews.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {newPreviews.map((url, idx) => (
                  <div key={url} className="relative">
                    <img
                      src={url}
                      alt=""
                      className="w-14 h-14 object-cover rounded-xl border border-gray-200"
                    />
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => removeNewAt(idx)}
                      className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full p-0.5"
                      aria-label="Remove new photo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || rating < 1}
            className="w-full min-h-[48px] rounded-2xl bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving…
              </>
            ) : (
              "Submit review"
            )}
          </button>
          <p className="text-[11px] text-center text-gray-400">
            Reviews appear on the product page after moderation. Reviews cannot be
            edited or deleted after submission.
          </p>
        </form>
      </div>
    </div>,
    document.body
  );
}
