import React from "react";
import { Star } from "lucide-react";

/**
 * Accessible 1–5 star control; value is integer stars (minimum 1 when user has committed).
 */
export default function StarRatingInput({
  value,
  onChange,
  max = 5,
  size = 26,
  disabled = false,
  className = "",
}) {
  const v = Math.max(0, Math.min(max, Number(value) || 0));

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      role="group"
      aria-label="Rating"
    >
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const filled = n <= v;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-label={`${n} out of ${max} stars`}
            onClick={() => onChange(n)}
            className="p-1 rounded-md transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Star
              size={size}
              className={
                filled
                  ? "text-[#F7C85C] fill-[#F7C85C]"
                  : "text-gray-300"
              }
            />
          </button>
        );
      })}
    </div>
  );
}
