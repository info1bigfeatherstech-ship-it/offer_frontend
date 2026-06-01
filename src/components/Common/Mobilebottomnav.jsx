import React, { memo, useCallback } from 'react';
import { Heart, Search, User, ShoppingCart, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * MobileBottomNav — floating pill bottom nav (mobile only, lg:hidden)
 *
 * Props:
 *   wishlistCount  {number}   badge count for wishlist
 *   cartCount      {number}   badge count for cart
 *   isLoggedIn     {boolean}
 *   onWishlist     {fn}       called when wishlist tapped (handled in Navbar)
 *   onCart         {fn}       open cart sidebar
 *   onAccount      {fn}       open login modal OR account dropdown
 *   onSearch       {fn}       search action (TBD)
 */
const MobileBottomNav = memo(({
  wishlistCount = 0,
  cartCount     = 0,
  isLoggedIn    = false,
  onWishlist,
  onCart,
  onAccount,
  onSearch,
}) => {
  const navigate = useNavigate();

  /**
   * Unified tap handler:
   *  1. navigator.vibrate(30) — short 30ms buzz (feels like iOS/Android tap)
   *  2. scale bounce via CSS class
   *  3. call the actual action
   */
  const handleTap = useCallback((fn) => (e) => {
    // Haptic feedback — works on Android Chrome; silently ignored on iOS/desktop
    if (navigator.vibrate) navigator.vibrate(30);

    // Visual bounce
    const el = e.currentTarget;
    el.classList.add('mbn-tapped');
    setTimeout(() => el.classList.remove('mbn-tapped'), 320);

    // Run the action
    if (fn) fn();
  }, []);

  // ── Individual action handlers ──────────────────────────────────────────

  const handleHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Wishlist: if logged in → navigate; if not → open sidebar (guest items)
  // This matches the onWishlist prop logic already in Navbar.jsx:
  //   isLoggedIn → navigate('/account/userwishlist')
  //   !isLoggedIn → setIsWishCartOpen(true)
  const handleWishlist = useCallback(() => {
    if (onWishlist) onWishlist();
  }, [onWishlist]);

  // Cart: always open cart sidebar
  const handleCart = useCallback(() => {
    if (onCart) onCart();
  }, [onCart]);

  // Account: if logged in → account dropdown; if not → auth modal
  const handleAccount = useCallback(() => {
    if (onAccount) onAccount();
  }, [onAccount]);

  // Search: TBD — kept as prop
  const handleSearch = useCallback(() => {
    if (onSearch) onSearch();
  }, [onSearch]);

  // ────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="mbn-wrapper lg:hidden" role="navigation" aria-label="Bottom navigation">
        <div className="mbn-pill">

          {/* ── LEFT: Home + Wishlist ── */}
          <div className="mbn-group">

            {/* Home */}
            <button
              className="mbn-btn"
              aria-label="Home"
              onClick={handleTap(handleHome)}
            >
              <div className="mbn-icon-wrap">
                <Home size={20} strokeWidth={2.2} />
              </div>
              <span className="mbn-label">Home</span>
            </button>

            {/* Wishlist */}
            <button
              className="mbn-btn"
              aria-label="Wishlist"
              onClick={handleTap(handleWishlist)}
            >
              <div className="mbn-icon-wrap">
                <Heart size={20} strokeWidth={2.2} />
                {wishlistCount > 0 && (
                  <span className="mbn-badge mbn-badge--red">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </div>
              <span className="mbn-label">Wishlist</span>
            </button>

          </div>

          {/* ── CENTER: Search Orb ── */}
          <button
            className="mbn-center"
            aria-label="Search"
            onClick={handleTap(handleSearch)}
          >
            <Search size={22} strokeWidth={2.5} className="mbn-search-icon" />
          </button>

          {/* ── RIGHT: Account + Cart ── */}
          <div className="mbn-group">

            {/* Account */}
            <button
              className="mbn-btn"
              aria-label={isLoggedIn ? 'Account' : 'Login'}
              onClick={handleTap(handleAccount)}
            >
              <div className="mbn-icon-wrap">
                <User size={20} strokeWidth={2.2} />
                {isLoggedIn && <span className="mbn-online-dot" />}
              </div>
              <span className="mbn-label">{isLoggedIn ? 'Account' : 'Login'}</span>
            </button>

            {/* Cart */}
            <button
              className="mbn-btn"
              aria-label="Cart"
              onClick={handleTap(handleCart)}
            >
              <div className="mbn-icon-wrap">
                <ShoppingCart size={20} strokeWidth={2.2} />
                {cartCount > 0 && (
                  <span className="mbn-badge mbn-badge--dark">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <span className="mbn-label">Cart</span>
            </button>

          </div>
        </div>
      </div>

      <style>{`
        /* ─── Wrapper ───────────────────────────────────────────────── */
        .mbn-wrapper {
          position: fixed;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 500;
          width: 92%;
          max-width: 440px;
          pointer-events: none;
        }

        /* ─── Pill container ────────────────────────────────────────── */
        .mbn-pill {
          pointer-events: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border-radius: 999px;
          padding: 8px 16px;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.13),
            0 2px 8px rgba(0, 0, 0, 0.07),
            0 0 0 1.5px rgba(247, 162, 33, 0.10),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          border: 1.5px solid rgba(247, 162, 33, 0.15);
          position: relative;
        }

        /* ─── Left / Right button groups ───────────────────────────── */
        .mbn-group {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        /* ─── Each icon button ──────────────────────────────────────── */
        .mbn-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          background: none;
          border: none;
          padding: 7px 10px;
          border-radius: 14px;
          cursor: pointer;
          color: #888;
          min-width: 48px;
          min-height: 48px;
          transition:
            color 0.18s ease,
            background 0.18s ease,
            transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        .mbn-btn:hover {
          color: #F7A221;
          background: rgba(247, 162, 33, 0.08);
        }
        .mbn-btn:focus-visible {
          outline: 2px solid #F7A221;
          outline-offset: 2px;
        }

        /* Tap bounce — triggered via JS classList */
        .mbn-btn.mbn-tapped {
          transform: scale(0.82);
          color: #F7A221;
        }

        /* ─── Icon wrapper (badge anchor) ───────────────────────────── */
        .mbn-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        /* ─── Count badges ──────────────────────────────────────────── */
        .mbn-badge {
          position: absolute;
          top: -7px;
          right: -9px;
          min-width: 16px;
          height: 16px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fff;
          padding: 0 3px;
          line-height: 1;
          letter-spacing: -0.3px;
          pointer-events: none;
        }
        .mbn-badge--red  { background: #e53e3e; }
        .mbn-badge--dark { background: #1a1a1a; }

        /* ─── Logged-in green dot ────────────────────────────────────── */
        .mbn-online-dot {
          position: absolute;
          top: -3px;
          right: -4px;
          width: 7px;
          height: 7px;
          background: #22c55e;
          border-radius: 50%;
          border: 1.5px solid #fff;
          animation: mbn-dot-pulse 2.2s ease-in-out infinite;
          pointer-events: none;
        }

        /* ─── Center Search Orb ─────────────────────────────────────── */
        .mbn-center {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          /* Brand gradient background */
          background: linear-gradient(135deg, #F7A221 0%, #e8920e 100%);
          border: 2.5px solid #fff;
          box-shadow:
            0 6px 20px rgba(247, 162, 33, 0.45),
            0 2px 8px rgba(0, 0, 0, 0.12);
          /* Float above the pill */
          transform: translateY(-36%);
          cursor: pointer;
          /* White icon on brand bg */
          color: #ffffff;
          transition:
            transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.22s ease,
            background 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          outline: none;
          user-select: none;
        }
        .mbn-center:hover {
          transform: translateY(-44%) scale(1.07);
          box-shadow:
            0 12px 28px rgba(247, 162, 33, 0.55),
            0 4px 12px rgba(0, 0, 0, 0.14);
          background: linear-gradient(135deg, #ffb340 0%, #F7A221 100%);
        }
        .mbn-center:focus-visible {
          outline: 3px solid #F7A221;
          outline-offset: 3px;
        }
        .mbn-center.mbn-tapped {
          transform: translateY(-36%) scale(0.88);
          box-shadow: 0 4px 14px rgba(247, 162, 33, 0.35);
        }

        .mbn-search-icon {
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
        }
        .mbn-center:hover .mbn-search-icon {
          transform: scale(1.12) rotate(-8deg);
        }

        /* ─── Labels ─────────────────────────────────────────────────── */
        .mbn-label {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          line-height: 1;
          color: inherit;
          white-space: nowrap;
        }

        /* ─── Animations ─────────────────────────────────────────────── */
        @keyframes mbn-dot-pulse {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.4); }
        }

        /* ─── iPhone / Android safe area (notch / home bar) ──────────── */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .mbn-wrapper {
            bottom: calc(16px + env(safe-area-inset-bottom));
          }
        }

        /* ─── Hide above lg (Tailwind handles this via className but
               belt-and-suspenders in case Tailwind purges it) ──────── */
        @media (min-width: 1024px) {
          .mbn-wrapper { display: none !important; }
        }
      `}</style>
    </>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';
export default MobileBottomNav;

