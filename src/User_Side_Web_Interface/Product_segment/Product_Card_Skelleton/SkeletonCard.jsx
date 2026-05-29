import React from "react";

// ── Shimmer base — mirrors the exact anatomy of ProductCard ───────────────────
// Widths are intentionally varied between cards via the `seed` prop so a grid
// of skeletons doesn't look like stamped clones.
const SkeletonCard = ({ seed = 0 }) => {
  // Vary line widths per card so the grid feels organic, not stamped
  const w = [
    ["45%", "90%", "60%", "55%"],
    ["55%", "80%", "70%", "45%"],
    ["35%", "95%", "55%", "60%"],
    ["50%", "85%", "65%", "50%"],
  ][seed % 4];

  return (
    <div className="group relative flex flex-col rounded-2xl bg-white border border-zinc-100 overflow-hidden">

      {/* ── Image area — exact aspect-square match ── */}
      <div className="relative w-full aspect-square bg-zinc-100 overflow-hidden">
        <div className="absolute inset-0 skeleton-shimmer" />

        {/* Discount badge ghost */}
        <div className="absolute top-2 left-2 h-[18px] w-12 rounded-md skeleton-shimmer" />

        {/* Action button ghosts */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          <div className="w-8 h-8 rounded-full skeleton-shimmer" />
          <div className="w-8 h-8 rounded-full skeleton-shimmer" />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3 gap-2">

        {/* Category */}
        <div className="h-[9px] rounded skeleton-shimmer" style={{ width: w[0] }} />

        {/* Title — 2 lines */}
        <div className="flex flex-col gap-1.5">
          <div className="h-3 rounded skeleton-shimmer" style={{ width: w[1] }} />
          <div className="h-3 rounded skeleton-shimmer" style={{ width: w[2] }} />
        </div>

        {/* Sold info */}
        <div className="h-[9px] rounded skeleton-shimmer hidden sm:block" style={{ width: w[3] }} />

        {/* Price row */}
        <div className="flex items-center gap-2 mt-0.5">
          <div className="h-4 w-14 rounded skeleton-shimmer" />
          <div className="h-3 w-9 rounded skeleton-shimmer" />
        </div>

        {/* Button */}
        <div className="mt-auto pt-2">
          <div className="h-9 sm:h-[46px] w-full rounded-xl skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
};

const styles = document.createElement('style');
styles.textContent = `
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }

  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      #f4f4f5 25%,
      #e4e4e7 37%,
      #f4f4f5 63%
    );
    background-size: 600px 100%;
    animation: shimmer 1.4s ease infinite;
  }
`;
document.head.appendChild(styles);

export default SkeletonCard;
