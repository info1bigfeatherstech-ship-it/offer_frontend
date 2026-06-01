/**
 * HeroSlider — Option A
 * ─────────────────────────────────────────────────────────────
 * A single Swiper showing MULTIPLE cards at once.
 *
 * Breakpoints:
 *   ≥1024px  →  3 cards visible  (desktop)
 *   640–1023 →  2 cards visible  (tablet)
 *   480–639  →  1.15 cards       (large phone — next card peeks)
 *   0–479    →  1 card           (small phone, full width)
 *
 * Arrows sit OUTSIDE the swiper rail and shift ALL visible cards.
 * ─────────────────────────────────────────────────────────────
 */

import React, { useRef, useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';

import offer1 from '../../assets/Banner/offerwalebaba-1.jpg';
import offer2 from '../../assets/Banner/offerwalebaba-2.jpg';
import offer3 from '../../assets/Banner/offerwalebaba-3.jpg';
import offer4 from '../../assets/Banner/offerwalebaba-4.jpg';
import offer5 from '../../assets/Banner/offerwalebaba-5.jpg';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

/* ─── Slide data ───────────────────────────────────────────── */
const slides = [
  { id: 1, image: offer1, alt: 'Offer 1' },
  { id: 2, image: offer2, alt: 'Offer 2' },
  { id: 3, image: offer3, alt: 'Offer 3' },
  { id: 4, image: offer4, alt: 'Offer 4' },
  { id: 5, image: offer5, alt: 'Offer 5' },
];

/* ─── Responsive breakpoints ───────────────────────────────── */
const breakpoints = {
  0: {
    slidesPerView: 1,
    spaceBetween: 0,
  },
  480: {
    slidesPerView: 1.15,   // teases the next card on large phones
    spaceBetween: 10,
  },
  640: {
    slidesPerView: 2,
    spaceBetween: 12,
  },
  1024: {
    slidesPerView: 3,
    spaceBetween: 16,
  },
  1440: {
    slidesPerView: 3,
    spaceBetween: 20,
  },
};

/* ─── Component ────────────────────────────────────────────── */
const HeroSlider = () => {
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const swiperRef = useRef(null);
  const [ready, setReady] = useState(false);

  /**
   * Swiper initialises before React renders the button refs into the DOM.
   * We need to manually re-attach navigation after both are ready.
   */
  useEffect(() => {
    if (!ready || !swiperRef.current) return;
    const swiper = swiperRef.current;
    swiper.params.navigation.prevEl = prevRef.current;
    swiper.params.navigation.nextEl = nextRef.current;
    swiper.navigation.destroy();
    swiper.navigation.init();
    swiper.navigation.update();
  }, [ready]);

  return (
    <section className="hs-root" aria-label="Promotional banners">

      {/* ── Prev arrow ─────────────────────────────────────── */}
      <button ref={prevRef} className="hs-nav hs-prev" aria-label="Previous">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* ── Swiper ─────────────────────────────────────────── */}
      <div className="hs-swiper-wrapper">
        <Swiper
          modules={[Autoplay, Navigation, Pagination]}
          breakpoints={breakpoints}
          loop={true}
          grabCursor={true}
          centeredSlides={false}
          watchSlidesProgress={true}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          pagination={{
            clickable: true,
            dynamicBullets: true,
            el: '.hs-pagination',
          }}
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            setReady(true);
          }}
          className="hs-swiper"
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide.id} className="hs-slide">
              <div className="hs-card">
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className="hs-img"
                  loading="lazy"
                  draggable={false}
                />
                <div className="hs-overlay" aria-hidden="true" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* ── Next arrow ─────────────────────────────────────── */}
      <button ref={nextRef} className="hs-nav hs-next" aria-label="Next">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* ── Pagination dots (outside swiper so they don't clip) */}
      <div className="hs-pagination" />

      {/* ════════════════════════════════════════════════════ */}
      {/*  STYLES                                             */}
      {/* ════════════════════════════════════════════════════ */}
      <style>{`

        /* ── Reset box model ─────────────────────────────── */
        .hs-root *,
        .hs-root *::before,
        .hs-root *::after {
          box-sizing: border-box;
        }

        /* ── Outer section ───────────────────────────────── */
        /*
         * padding-left / padding-right make room for the arrows
         * that sit OUTSIDE the swiper rail.
         * On desktop: 44px each side.
         * On mobile:  32px each side.
         */
        .hs-root {
          position: relative;
          width: 100%;
          padding: 0 50px 36px; /* bottom 36px = space for dots */
          /* Clip only horizontal overflow, not vertical
             (needed so peek cards don't create a scrollbar) */
          overflow: hidden;
        }

        @media (max-width: 479px) {
          .hs-root {
            padding: 0 32px 32px;
          }
        }

        /* ── Swiper wrapper div ───────────────────────────── */
        /* This wrapper clips peek-cards so they don't spill
           past the section on mobile.                        */
        .hs-swiper-wrapper {
          width: 100%;
          overflow: hidden;
          border-radius: 12px;
        }

        /* ── Swiper container ────────────────────────────── */
        .hs-swiper {
          width: 100%;
          overflow: visible !important; /* let 1.15 peek work */
        }

        /* ── Single slide ────────────────────────────────── */
        .hs-slide {
          height: auto; /* let aspect-ratio drive height */
        }

        /* ── Card ────────────────────────────────────────── */
        .hs-card {
          position: relative;
          width: 100%;
          /*
           * 16:9 on desktop / tablet.
           * 4:3 on small phones (taller = more impact on narrow screens).
           */
          aspect-ratio: 10 / 6;
          border-radius: 12px;
          overflow: hidden;
          background: #0d0d20;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
          /* Smooth hover lift */
          transition: transform 0.28s ease, box-shadow 0.28s ease;
          will-change: transform;
        }

        @media (hover: hover) {
          /* Only apply hover lift on devices that support hover
             (avoids sticky "lifted" state on touch screens)   */
          .hs-card:hover {
            transform: translateY(0px);
            box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22);
          }
        }

        @media (max-width: 479px) {
          .hs-card {
            aspect-ratio: 4 / 3;
            border-radius: 8px;
          }
        }

        /* ── Banner image ────────────────────────────────── */
        .hs-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          /* Remove space under img (inline default) */
          font-size: 0;
          transition: transform 0.45s ease;
          will-change: transform;
        }

        @media (hover: hover) {
          .hs-card:hover .hs-img {
            transform: scale(1.04);
          }
        }

        /* ── Bottom gradient overlay ─────────────────────── */
        .hs-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            transparent 55%,
            rgba(0, 0, 0, 0.20) 100%
          );
          pointer-events: none;
          border-radius: inherit;
        }

        /* ── Navigation arrows ───────────────────────────── */
        /*
         * Arrows are absolutely positioned relative to .hs-root.
         * top: 50% then translateY(-50%) but we also subtract
         * half of the pagination height (≈18px) so the arrows
         * are centred on the CARD, not the whole section.
         */
        .hs-nav {
          position: absolute;
          top: calc(50% - 18px); /* subtract half pagination area */
          transform: translateY(-50%);
          z-index: 20;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1.5px solid rgba(0, 0, 0, 0.10);
          background: #ffffff;
          color: #333333;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
          padding: 0;
          /* Remove default button chrome */
          -webkit-appearance: none;
          appearance: none;
          outline: none;
          flex-shrink: 0;
          transition:
            background   0.2s ease,
            box-shadow   0.2s ease,
            transform    0.15s ease,
            border-color 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .hs-nav svg {
          width: 15px;
          height: 15px;
          flex-shrink: 0;
          display: block;
        }

        @media (hover: hover) {
          .hs-nav:hover {
            background: #f5f5f5;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.20);
          }
        }

        .hs-nav:active {
          transform: translateY(-50%) scale(0.92);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.14);
        }

        /* Swiper adds this class when loop=false and at edge */
        .hs-nav.swiper-button-disabled {
          opacity: 0.30;
          cursor: not-allowed;
          pointer-events: none;
        }

        /* Positioning */
        .hs-prev { left: 4px; }
        .hs-next { right: 4px; }

        /* Slightly smaller on mobile */
        @media (max-width: 479px) {
          .hs-nav {
            width: 30px;
            height: 30px;
          }
          .hs-nav svg {
            width: 13px;
            height: 13px;
          }
          .hs-prev { left: 2px; }
          .hs-next { right: 2px; }
        }

        /* ── Pagination dots ─────────────────────────────── */
        .hs-pagination {
          display: flex;
          justify-content: center;
          margin-top: 14px;
          height: 20px;
        }

        /* Swiper's injected bullet styles */
        .hs-pagination .swiper-pagination-bullet {
          width: 7px !important;
          height: 7px !important;
          background: #cccccc !important;
          opacity: 1 !important;
          margin: 0 4px !important;
          border-radius: 4px !important;
          transition: background 0.25s ease, width 0.25s ease !important;
        }

        .hs-pagination .swiper-pagination-bullet-active {
          background: #f97316 !important; /* orange accent */
          width: 22px !important;
          border-radius: 4px !important;
        }

        /* ── Touch optimisation ──────────────────────────── */
        .hs-swiper {
          /* Allow vertical scroll while swiping horizontally */
          touch-action: pan-y pinch-zoom;
        }

        /* ── Accessibility: respect reduced motion ───────── */
        @media (prefers-reduced-motion: reduce) {
          .hs-card,
          .hs-img,
          .hs-nav,
          .hs-pagination .swiper-pagination-bullet {
            transition: none !important;
            animation: none !important;
          }
        }

        /* ── Cross-browser image rendering ──────────────── */
        .hs-img {
          image-rendering: auto;
          /* Safari fix for object-fit inside absolute */
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }

      `}</style>
    </section>
  );
};

export default HeroSlider;

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 HOW THIS UI (OPTION A) WORKS — EXPLAINED FOR DEVELOPERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The key idea behind Option A is a single Swiper instance configured
to display MULTIPLE slides simultaneously using the `slidesPerView`
prop, rather than the classic full-width single-slide carousel.

1. MULTIPLE CARDS AT ONCE
   Set `slidesPerView: 3` (desktop) so Swiper automatically
   divides the container width into 3 equal slots and renders
   one slide per slot. `spaceBetween` adds the gap between cards.
   This is the only real difference from a standard carousel —
   everything else (looping, autoplay, navigation) works identically.

2. RESPONSIVE BREAKPOINTS
   The `breakpoints` prop is a plain object where each key is a
   min-width in pixels. Swiper reads the current viewport width,
   picks the largest matching key, and applies that config — so
   the same component automatically shows 3 cards on desktop,
   2 on tablet, and 1 (or 1.15 to tease the next card) on mobile.
   No media queries, no JavaScript resize listeners needed.

3. ARROWS OUTSIDE THE RAIL
   The prev/next buttons live in the parent <section>, not inside
   Swiper. The parent has `padding: 0 44px` which pushes the
   Swiper rail inward, leaving room for the arrows on each side.
   We attach the buttons to Swiper by passing their DOM refs to
   `navigation.prevEl` / `navigation.nextEl`, and we re-attach
   them inside a `useEffect` (after both the Swiper instance AND
   the button refs are ready) because React renders refs after
   Swiper's `onSwiper` callback fires.

4. PEEK EFFECT ON MOBILE
   Setting `slidesPerView: 1.15` at the 480px breakpoint makes
   Swiper render 1.15 slides — the extra 0.15 shows the left edge
   of the next card. This signals to the user that more content
   exists and the slider is swipeable. The outer wrapper div has
   `overflow: hidden` to clip the partial card neatly.

5. LOOP + AUTOPLAY
   `loop: true` makes Swiper clone the first and last few slides
   internally so the transition never hits a hard edge. Combined
   with `autoplay.pauseOnMouseEnter: true`, the slider auto-advances
   on desktop but pauses the moment the user hovers, giving them
   time to read or click a banner.

6. ASPECT RATIO INSTEAD OF FIXED HEIGHT
   Using `aspect-ratio: 16 / 9` on each card means the height
   always scales proportionally to the width — no hardcoded px
   values that break on different screens. Mobile gets a taller
   `4 / 3` ratio because a narrow card looks better portrait-ish.

7. HOVER-SAFE ANIMATIONS
   All hover effects (card lift, image scale) are wrapped inside
   `@media (hover: hover)` so they only activate on real pointer
   devices (mouse/trackpad). On touchscreens the `:hover` state
   can "stick" after a tap, causing an unintended lifted card —
   this media query prevents that.

8. ACCESSIBILITY
   - The <section> has `aria-label` so screen readers announce it.
   - Arrow <button>s have `aria-label` text.
   - SVG icons have `aria-hidden="true"` so they're skipped.
   - `@media (prefers-reduced-motion: reduce)` disables all
     transitions and animations for users who opt out of motion.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
