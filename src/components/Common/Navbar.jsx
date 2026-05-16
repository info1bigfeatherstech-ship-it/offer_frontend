import React, { useCallback, memo, useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { forceLogout } from '../REDUX_FEATURES/REDUX_SLICES/authSlice';
import {
  selectWishlistCount,
  selectWishlistGuestItems,
} from '../REDUX_FEATURES/REDUX_SLICES/userWishlistSlice';
import { selectDisplayCartCount } from '../REDUX_FEATURES/REDUX_SLICES/userCartSlice';
import CartSidebar from './CartSidebar';
import {
  Search, User, Heart, ShoppingCart, Menu, X, Phone, Mail, Clock,
  ChevronRight, Home, Flame, Package, Tag, Ticket, HeadphonesIcon,
  Smartphone, ChefHat, Shirt, Dumbbell, Plane, Book, Baby, Car, Box, Gift,
  MapPin, LogOut, UserCircle, Settings, Sparkles, TrendingUp, Star, Zap
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import navLogoVideo from "../../assets/Video2.mp4";
import homeIcon from "../../assets/home (2).png";
import Coupon from "../../assets/Tickets.gif";
import Contact from "../../assets/Contact.gif";
import SaleIcon from "../../assets/Shopping bag.gif";
import audio from "../../assets/headphone.png";
import deal from "../../assets/Discount.gif";
import arrivals from "../../assets/Product (5).gif";
import justarrivedIcon from "../../assets/just-arrived (1).png";
import dealIcon from "../../assets/deal.png";
import saleIcon from "../../assets/sale.png";
import coupanIcon from "../../assets/coupon.png";
import customercareIcon from "../../assets/service.png";
import discountBannerIcon from "../../assets/discount-voucher.png";
import WishlistSidebar from './WishlistSidebar';
import { selectDefaultAddress, fetchAddresses } from '../REDUX_FEATURES/REDUX_SLICES/Useraddressslice';
import SearchModal from './Search_Modal/SearchModal';
import MobileBottomNav from './Mobilebottomnav';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

const ActionIcon = memo(({ item, onClick, isLoggedIn }) => (
  <div
    onClick={onClick}
    className="flex flex-col items-center cursor-pointer relative group text-black hover:text-[#F7A221] transition-colors min-w-[40px] xl:min-w-[50px]"
  >
    <div className="p-1 lg:p-1.5 xl:p-2 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
      {item.icon}
    </div>
    {item.count !== undefined && (
      <span className={`absolute top-0 right-0 lg:right-1 xl:top-1 xl:right-2 ${item.badge} text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm group-hover:animate-bounce`}>
        {item.count}
      </span>
    )}
    <span className="text-[9px] lg:text-[10px] mt-0.5 font-bold uppercase tracking-tighter whitespace-nowrap">
      {item.label}
    </span>
  </div>
));

// ── User Account Dropdown ─────────────────────────────────────────────────────
const UserAccountDropdown = ({ user, onLogout, onClose, dropdownRef }) => {
  const navigate = useNavigate();

  const menuItems = [
    { icon: <UserCircle size={16} />, label: 'My Profile',  path: '/account/userprofile' },
    { icon: <Heart size={16} />,       label: 'My Wishlist', path: '/account/userwishlist' },
    { icon: <ShoppingCart size={16} />,label: 'My Orders',   path: '/account/userorders' },
  ];

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[500] animate-slideDown"
    >
      <div className="bg-gradient-to-r from-[#F7A221]/10 to-transparent p-4 border-b">
        <p className="text-xs text-gray-500 mb-1">Welcome back,</p>
        <p className="font-black text-black text-lg truncate">{user?.name || user?.email}</p>
        <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
      </div>
      <div className="py-2">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => { navigate(item.path); onClose(); }}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50 transition-colors text-left group"
          >
            <span className="text-gray-500 group-hover:text-[#F7A221] transition-colors">{item.icon}</span>
            <span className="text-sm font-bold text-gray-700 group-hover:text-black">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="border-t p-2">
        <button
          onClick={() => { onLogout(); onClose(); }}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors rounded-xl text-left group"
        >
          <LogOut size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold text-red-600">Logout</span>
        </button>
      </div>
    </div>
  );
};

// ── Location Display ──────────────────────────────────────────────────────────
const LocationDisplay = ({ isLoggedIn, onOpenAuth, userAddress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  let navigate = useNavigate();

  let handleAddress = () => {
    if (isLoggedIn) { navigate('/account/useraddress'); }
    else { onOpenAuth(); }
  };

  const getDisplayAddress = () => {
    if (isLoggedIn && userAddress) {
      const parts = [];
      if (userAddress.city) parts.push(userAddress.city);
      if (userAddress.postalCode) parts.push(userAddress.postalCode);
      if (parts.length > 0) return parts.join(', ');
      if (userAddress.addressLine1) return userAddress.addressLine1.substring(0, 20);
      return "Select Address";
    }
    return isLoggedIn ? "SELECT ADDRESS" : "ADDRESS";
  };
  let address = getDisplayAddress();

  const destinations = [
    address === !"ADDRESS" ? getDisplayAddress() : address,
    "HOME",
    "OFFICE",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % destinations.length);
        setIsAnimating(false);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoggedIn, userAddress]);

  return (
    <div className="hidden xl:flex items-center gap-3 bg-white cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-xl transition-all hover:border-gray-300 group">
      <MapPin size={20} className="text-red-500 animate-bounce" />
      <div onClick={handleAddress} className="flex flex-col w-44 overflow-hidden">
        <span className="text-[10px] text-gray-500 font-semibold uppercase leading-none">Deliver to</span>
        <div className="flex items-center mt-1">
          {!isLoggedIn && (
            <span className="text-sm font-medium text-gray-700 mr-1 whitespace-nowrap">Your</span>
          )}
          <div className="relative h-[20px] overflow-hidden flex-1">
            <span
              className="absolute left-0 w-full text-sm font-semibold text-gray-900 leading-[20px] transition-transform duration-500 ease-in-out"
              style={{
                top: 0,
                transform: isAnimating && !isLoggedIn || isAnimating && (isLoggedIn && address === "SELECT ADDRESS") ? "translateY(-100%)" : "translateY(0)",
              }}
            >
              {isLoggedIn && !(isLoggedIn && address === "SELECT ADDRESS") ? address : destinations[currentIndex]}
            </span>
            <span
              className="absolute left-0 w-full text-sm font-semibold text-gray-900 leading-[20px] transition-transform duration-500 ease-in-out"
              style={{
                top: "100%",
                transform: isAnimating && !isLoggedIn ? "translateY(-100%)" : "translateY(0)",
                transitionDelay: isAnimating && !isLoggedIn ? "0.25s" : "0s",
              }}
            >
              {isLoggedIn ? address : destinations[(currentIndex + 1) % destinations.length]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Mega Dropdown — 6 top + 5 bottom ─────────────────────────────────────────
const MegaDropdown = ({ isOpen }) => {
  if (!isOpen) return null;

  // Row 1 — first 6 categories
  const topCategories = [
    { label: "Home & Kitchen",        path: "/category/home-and-kitchen" },
    { label: "Smart Life Gadgets",   path: "/category/smart-life-gadgets" },
    { label: "Baby Items",                        path: "/category/baby-items" },
    { label: "Stationary",            path: "/category/stationary" },
    { label: "Cleaning & Housekeeping Supplies",  path: "/category/cleaning-and-housekeeping-supplies" },
    { label: "Sports & Fitness",      path: "/category/sports-and-fitness" },
 
  ];

  // Row 2 — remaining 5 categories
  const bottomCategories = [
     { label: "Tours & Travels",       path: "/category/tours-and-travels" },
    { label: "Fashion World",         path: "/category/fashion-world" },
    { label: "Gifts",                             path: "/category/gifts" },
    { label: "Mix-items",                               path: "/category/mix-items" },
    { label: "Car Accessories",                   path: "/category/car-accessories" },
  ];

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 w-screen bg-white border-t border-gray-200 shadow-2xl z-50 hidden lg:block animate-slideDown">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header label */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Shop by Category
          </p>
          <div className="h-px flex-1 ml-4 bg-gray-200" />
        </div>

        {/* ── Row 1: 6 categories ── */}
        <div className="grid grid-cols-6 gap-3 mb-3">
          {topCategories.map((cat, i) => (
            <Link
              key={i}
              to={cat.path}
              className="group flex items-center justify-center p-3 rounded-xl bg-gray-50
                         hover:bg-[#F7A221] hover:shadow-md
                         border border-transparent hover:border-[#F7A221]
                         transition-all duration-200 active:scale-[.96]"
            >
              <span className="text-sm font-semibold text-gray-800 text-center
                               group-hover:text-white transition-colors">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Subtle divider between rows */}
        <div className="h-px bg-gray-100 my-3" />

        {/* ── Row 2: 5 categories ── */}
        <div className="grid grid-cols-5 gap-3">
          {bottomCategories.map((cat, i) => (
            <Link
              key={i}
              to={cat.path}
              className="group flex items-center justify-center p-3 rounded-xl bg-white
                         hover:bg-[#F7A221] hover:shadow-md
                         border border-gray-100 hover:border-[#F7A221]
                         transition-all duration-200 active:scale-[.96]"
            >
              <span className="text-sm font-semibold text-gray-600 text-center
                               group-hover:text-white transition-colors">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
};

// ── All Categories nav item (no icon, orange active bg, chevron stays) ────────
const NavItemWithDropdown = ({ link }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div
      className="static"
      onClick={() => setIsOpen(!isOpen)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Button — orange bg always, white text on hover */}
      <div
        className={`
          all-cat-btn flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl
          font-bold text-xs uppercase tracking-wide transition-all duration-200
          ${isOpen
            ? 'bg-[#F7A221] text-white'
            : 'bg-[#F7A221]/10 text-[#c27c00] hover:bg-[#F7A221] hover:text-white'
          }
        `}
      >
        <span>{link.label}</span>
        <ChevronRight
          size={14}
          className={`transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
        />
      </div>

      {/* Attach same mouse handlers to dropdown so it doesn't close on entry */}
      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <MegaDropdown isOpen={isOpen} />
      </div>
    </div>
  );
};

// ── Image icon helper ─────────────────────────────────────────────────────────
const ImageIcon = ({ src, alt, className = "", animation = "animate-bounce-soft" }) => (
  <img
    src={src}
    alt={alt}
    className={`w-[40px] h-[40px] object-contain ${animation} ${className}`}
    style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Navbar
// ─────────────────────────────────────────────────────────────────────────────
const Navbar = ({ searchQuery, setSearchQuery, isMenuOpen, setIsMenuOpen, isLoggedIn, user, onOpenAuth }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountTriggerMobileRef = useRef(null);
  const accountTriggerDesktopRef = useRef(null);
  const accountDropdownRef = useRef(null);
  const wishlistCount = useSelector(selectWishlistCount);
  const guestItems = useSelector(selectWishlistGuestItems);
  const cartCount = useSelector(selectDisplayCartCount);
  const userAddress = useSelector(selectDefaultAddress);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishCartOpen, setIsWishCartOpen] = useState(false);
  const displayCount = isLoggedIn ? wishlistCount : guestItems.length;
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showSearchTooltip, setShowSearchTooltip] = useState(false);

  // Fetch user address when logged in
  useEffect(() => {
    if (isLoggedIn) dispatch(fetchAddresses());
  }, [dispatch, isLoggedIn]);

  // Show tooltip on first visit
  useEffect(() => {
    const hasSeenSearchTooltip = localStorage.getItem('hasSeenSearchTooltip');
    if (!hasSeenSearchTooltip) {
      setShowSearchTooltip(true);
      const timer = setTimeout(() => {
        setShowSearchTooltip(false);
        localStorage.setItem('hasSeenSearchTooltip', 'true');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!isAccountDropdownOpen) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      const inTrigger =
        accountTriggerMobileRef.current?.contains(target) ||
        accountTriggerDesktopRef.current?.contains(target);
      const inDropdown = accountDropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) {
        setIsAccountDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isAccountDropdownOpen]);

  const handleSearchFocus = useCallback(() => setIsSearchModalOpen(true), []);

  const handleLogout = async () => {
    await dispatch(forceLogout());
    setIsAccountDropdownOpen(false);
  };

  const handleAccountClick = () => {
    if (isLoggedIn) setIsAccountDropdownOpen(!isAccountDropdownOpen);
    else onOpenAuth();
  };

  const handleWishlist = () => {
    if (isLoggedIn) navigate('/account/userwishlist');
    else setIsWishCartOpen(true);
  };

  const actionIcons = [
    {
      icon: <User size={20} />,
      label: isLoggedIn ? (user?.name?.split(' ')[0]?.slice(0, 6) || "Hi") : "Login",
      onClick: handleAccountClick,
    },
    { icon: <Heart size={20} />,       label: "Wishlist", count: displayCount, badge: "bg-red-600", onClick: handleWishlist },
    { icon: <ShoppingCart size={20} />, label: "Cart",    count: cartCount,    badge: "bg-black",   onClick: () => setIsCartOpen(true) },
  ];

  // ── Bottom nav links (used in desktop nav + mobile sidebar) ────────────────
  // "Just Arrived" uses the same bottom-nav icon scale as Deal/Sale (see [&_img] on the shared wrapper). Sidebar: ImageIcon default 40px unless you pass className.
  const bottomNavLinks = [
    {
      label: "Today's Deal",
      path: "/today-arrival#tagProducts-top",
      icon: <ImageIcon src={deal} alt="Deal" animation="animate-swing" />,
    },
    {
      label: "Just Arrived",
      path: "/#best-sellers",
      icon: (
        <ImageIcon
          src={arrivals}
          alt="Just Arrived"
          animation="animate-float"
          className="object-center"
        />
      ),
    },
    {
      label: "Sale",
      path: "/on-sale#tagProducts-top",
      icon: <ImageIcon src={SaleIcon} alt="Sale" animation="animate-flicker" />,
    },
  ];

  const mobileCategories = [
    { label: "Home & Kitchen",                    path: "/category/home-and-kitchen" },
    { label: "Smart Life Gadgets",                        path: "/category/smart-life-gadgets" },
    { label: "Baby Items",                        path: "/category/baby-items" },
    { label: "Stationary",                        path: "/category/stationary" },
     { label: "Cleaning & Housekeeping Supplies",  path: "/category/cleaning-and-housekeeping-supplies" },
     { label: "Sports & Fitness",                  path: "/category/sports-and-fitness" },
     { label: "Tours & Travels",                   path: "/category/tours-and-travels" },
    { label: "Fashion World",                     path: "/category/fashion-world" },
    { label: "Gifts",                             path: "/category/gifts" },
    { label: "Mix-items",  path: "/category/mix-items" },
    { label: "Car Accessories",                   path: "/category/car-accessories" },
  ];

  return (
    <>
      {/* ── Top Info Bar (tablet + desktop) ─────────────────────────────────
          • Shows from md: (768+). On tablets we render a condensed version
            (phone + short delivery text). On lg+ we render the full content
            (phone + email + full delivery text). Hidden on phones. ──────── */}
      <div className="bg-black text-white py-2 lg:py-3 px-4 hidden md:block border-b border-white/10">
        <div className="container mx-auto flex justify-between items-center text-[10px] lg:text-[11px] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-4 lg:gap-8">
            <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
              <Phone size={12} className="text-[#F7A221] group-hover:animate-shake" /> +91 93706 86008
            </span>
            <a
              href="mailto:support.offerwalebaba@gmail.com"
              className="hidden lg:flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group"
            >
              <Mail size={12} className="text-[#F7A221] group-hover:scale-110" /> support.offerwalebaba@gmail.com
            </a>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <Clock size={12} className="text-[#F7A221] animate-pulse" />
            <span className="text-white/90 hidden lg:inline">Pan India Delivery • 24/7 Support</span>
            <span className="text-white/90 lg:hidden">24/7 Support</span>
          </div>
        </div>
      </div>

      {/* ── Sticky Header ───────────────────────────────────────────────────── */}
      <header className="bg-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4">

          {/* ══ MOBILE LAYOUT (lg:hidden) ════════════════════════════════════ */}
          <div className="lg:hidden relative">
            <div className="flex items-center justify-between py-3 md:py-4 border-b border-gray-100">

           
            {/* Logo — fixed height container, no inline marginTop */}
            <Link
              to="/"
              aria-label="Offer Wale Baba home"
              className="relative inline-flex shrink-0 items-center justify-center"
            >
              <video
                className="relative z-10 block h-auto w-auto max-w-[120px] shrink-0 object-contain sm:max-w-[140px] md:max-w-[170px] pointer-events-none"
                src={navLogoVideo}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
              />
            </Link>

              {/* ══ Inline search bar — tablet only (md → lg) ══════════════════
                  Replaces the cramped centered-icon trigger on tablet widths
                  where there's enough room for a real search input. Hidden on
                  phones (where the centered icon below is used) and on desktop
                  (where the full-size search bar in the desktop layout is
                  used). Clicking opens the same SearchModal via handleSearchFocus. */}
              <div className="hidden md:flex flex-1 items-center relative max-w-md mx-2">
                <input
                  type="text"
                  placeholder="Search products, brands and more..."
                  onClick={handleSearchFocus}
                  readOnly
                  className="w-full py-2.5 pl-10 pr-20 rounded-xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-[#F7A221] focus:bg-white transition-all font-bold text-xs cursor-pointer"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <button
                  onClick={handleSearchFocus}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black text-white py-1.5 px-3 rounded-lg hover:bg-[#F7A221] transition-all shadow-md font-bold text-[10px] uppercase tracking-wider"
                >
                  Search
                </button>
              </div>

              {/* Centered search trigger — phones only (md:hidden).
                  At md+ we render the inline search bar above instead.
                  Bug fix: was `-translate-x-1` (4px shift) — now properly
                  centered with `-translate-x-1/2`. */}
              <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
                {showSearchTooltip && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] md:text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap z-20 backdrop-blur-sm">
                    🔍 Tap to search
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/80 rotate-45" />
                  </div>
                )}
                <button
                  onClick={handleSearchFocus}
                  className="flex flex-col items-center cursor-pointer group hover:scale-105 active:scale-95 transition-transform duration-200 animate-float-slow"
                >
                  <div className="p-1 md:p-1.5 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300 animate-spin-3d">
                    <Search size={20} className="w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-6 md:h-6 text-gray-700 group-hover:text-[#F7A221] transition-colors" strokeWidth={2} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold mt-0.5 uppercase tracking-tighter text-gray-600 group-hover:text-[#F7A221] transition-colors">
                    Search
                  </span>
                </button>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-3 sm:gap-4 md:gap-5 relative z-[500]">
                {/* User */}
                <div ref={accountTriggerMobileRef} onClick={handleAccountClick} className="relative flex flex-col items-center cursor-pointer group">
                  <div className="p-1 md:p-1.5 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
                    <User size={20} className="w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-6 md:h-6 text-gray-700 group-hover:text-[#F7A221] transition-colors" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold mt-0.5 uppercase tracking-tighter text-gray-600 group-hover:text-[#F7A221]">
                    {isLoggedIn ? (user?.name?.split(' ')[0]?.slice(0, 6) || "Hi") : "Login"}
                  </span>
                  {isLoggedIn && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>

                {/* Cart */}
                <div onClick={() => setIsCartOpen(true)} className="relative flex flex-col items-center cursor-pointer group">
                  <div className="p-1 md:p-1.5 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
                    <ShoppingCart size={20} className="w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-6 md:h-6 text-gray-700 group-hover:text-[#F7A221] transition-colors" />
                  </div>
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-black text-white text-[9px] md:text-[10px] w-4 h-4 md:w-[18px] md:h-[18px] rounded-full flex items-center justify-center border border-white font-bold shadow-sm">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                  <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold mt-0.5 uppercase tracking-tighter text-gray-600 group-hover:text-[#F7A221]">Cart</span>
                </div>

                {/* Menu */}
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="flex flex-col items-center cursor-pointer group bg-transparent border-0 p-0"
                >
                  <div className="p-1 md:p-1.5 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
                    <Menu size={20} className="w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-6 md:h-6 text-gray-700 group-hover:text-[#F7A221] transition-colors" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold mt-0.5 uppercase tracking-tighter text-gray-600 group-hover:text-[#F7A221]">Menu</span>
                </button>

                {/* Account dropdown — mobile */}
                {isLoggedIn && isAccountDropdownOpen && (
                  <UserAccountDropdown
                    user={user}
                    onLogout={handleLogout}
                    onClose={() => setIsAccountDropdownOpen(false)}
                    dropdownRef={accountDropdownRef}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ══ DESKTOP LAYOUT (lg:flex) ══════════════════════════════════════ */}
          <div className="hidden lg:flex items-center justify-between lg:gap-3 xl:gap-6 2xl:gap-8 h-24 overflow-visible">

            {/* Logo — positioned to span both header row + bottom nav row */}
            <div className="flex items-end gap-2 self-end overflow-visible">
              <Link
                to="/"
                aria-label="Offer Wale Baba home"
                className="relative inline-flex shrink-0 items-center justify-center p-1 top-9 xl:top-11 2xl:top-12"
              >
                <video
                  className="relative z-10 block h-auto w-auto max-w-[130px] shrink-0 object-contain xl:max-w-[160px] 2xl:max-w-[175px] pointer-events-none"
                  src={navLogoVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                />
              </Link>
            </div>

            {/* Location */}
            <LocationDisplay isLoggedIn={isLoggedIn} onOpenAuth={onOpenAuth} userAddress={userAddress} />

            {/* Search bar */}
            <div className="flex-1 lg:max-w-sm xl:max-w-lg 2xl:max-w-xl relative">
              <input
                type="text"
                placeholder="Search products, brands and more..."
                className="w-full lg:py-3 xl:py-3.5 lg:px-10 xl:px-14 rounded-2xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-[#F7A221] focus:bg-white transition-all font-bold lg:text-xs xl:text-sm"
                onClick={handleSearchFocus}
                readOnly
              />
              <Search className="absolute lg:left-3 xl:left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <button className="absolute right-1.5 lg:right-1 xl:right-2 top-1/2 -translate-y-1/2 bg-black text-white lg:py-1.5 lg:px-3 xl:py-2 xl:px-5 rounded-xl hover:bg-[#F7A221] transition-all shadow-md font-bold text-[10px] xl:text-xs uppercase hover:tracking-widest duration-300">
                Search
              </button>
            </div>

            {/* Action icons */}
            <div className="flex items-center lg:gap-3 xl:gap-5 2xl:gap-8 relative z-[500]">
              {actionIcons.map((item, idx) => (
                <div key={idx} ref={idx === 0 ? accountTriggerDesktopRef : undefined}>
                  <ActionIcon item={item} onClick={item.onClick} isLoggedIn={isLoggedIn} />
                </div>
              ))}
              {isLoggedIn && isAccountDropdownOpen && (
                <UserAccountDropdown
                  user={user}
                  onLogout={handleLogout}
                  onClose={() => setIsAccountDropdownOpen(false)}
                  dropdownRef={accountDropdownRef}
                />
              )}
            </div>
          </div>
        </div>

        {/* ══ DESKTOP BOTTOM NAV ════════════════════════════════════════════════
            Mirrors the TOP header's flex layout 1:1 so each bottom zone aligns
            vertically beneath its corresponding top element:

            TOP   : [Logo 175px] [gap-8] [Address]         [gap-8] [Search flex-1 max-w-xl] [gap-8] [Office|Wishlist|Cart]
            BOTTOM: [Spacer 175px] [gap-8] [Home+Categories] [gap-8] [Deal/Arrived/Sale flex-1 max-w-xl] [gap-8] [Contact us]

            • Same container (`container mx-auto px-4`), same gaps, same flex-1 max-w-xl
              on the center → guarantees vertical alignment across every viewport.
            • Spacer width = logo width (175px) so the LEFT zone starts exactly
              under the address/location component.
            • Responsive variants shrink padding/icons/text at narrow lg (1024px+)
              and scale back up at xl/2xl — no overflow, no overlap, ever.
        ════════════════════════════════════════════════════════════════════════ */}
        <nav className="hidden lg:block relative w-full">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between lg:gap-3 xl:gap-6 2xl:gap-8 py-2">

              {/* ══ LOGO SPACER (aligns the row with top header) ══════════════ */}
              <div className="w-[130px] xl:w-[160px] 2xl:w-[175px] shrink-0" aria-hidden="true" />

              {/* ══ LEFT ZONE: Home + All Categories (under address box) ═════ */}
              <div className="flex items-center gap-1 xl:gap-2 shrink-0 min-w-0">

                {/* ── 1. HOME button — homeIcon + "Home" label ── */}
                <Link
                  to="/"
                  className="home-nav-btn flex items-center gap-1.5 lg:gap-2 px-2 lg:px-2.5 xl:px-3 py-2 rounded-xl
                             font-bold text-[11px] lg:text-xs uppercase tracking-wide transition-all duration-200
                             hover:bg-[#F7A221]/10 text-gray-700 hover:text-[#F7A221] group whitespace-nowrap"
                >
                  <img
                    src={homeIcon}
                    alt="Home"
                    className="w-4 h-4 lg:w-5 lg:h-5 object-cover animate-bounce-soft group-hover:scale-110 transition-transform shrink-0"
                  />
                  <span>Home</span>
                </Link>

                {/* Divider */}
                <div className="h-6 w-[1px] bg-gray-200 mx-0.5 lg:mx-1 shrink-0" />

                {/* ── 2. ALL CATEGORIES — no icon, orange active bg, chevron kept ── */}
                <NavItemWithDropdown
                  link={{ label: "All Categories" }}
                />
              </div>

              {/* ══ CENTER ZONE: Deal/Arrived/Sale (starts at search-bar left edge) ══
                  • `shrink-0` on every Link → `.nav-link`'s `overflow-hidden` can
                    never clip labels (items always keep natural width).
                  • `[&_img]:!w-X` overrides ImageIcon's hardcoded 40px down to
                    28px at lg / 36px at xl / 40px at 2xl — so the 3 items + gaps
                    always fit inside the center zone at every viewport. The
                    override is scoped to this render only; the same ImageIcon
                    used in the mobile sidebar keeps its original 40px size. ══ */}
              <div className="flex-1 lg:max-w-sm xl:max-w-lg 2xl:max-w-xl flex items-center justify-start gap-1 lg:gap-2 xl:gap-4 min-w-0">
                {bottomNavLinks.map((link, idx) => (
                  <Link
                    key={idx}
                    to={link.path}
                    className="shrink-0 text-center justify-center flex items-center px-1 lg:px-1.5 xl:px-3 py-2 lg:py-2.5 gap-1 lg:gap-1.5 xl:gap-2 hover:bg-gray-50 rounded-xl transition-all duration-200 group whitespace-nowrap"
                  >
                    {/* Just Arrived GIF: desktop bottom-nav img sizes — edit the [&_img] classes in the ternary below (other links use the smaller [&_img] scale). */}
                    <div
                     className={
                      link.label === "Just Arrived"
                        ? "transition-transform duration-300 group-hover:scale-125 shrink-0 [&_img]:!w-10 [&_img]:!h-10 lg:[&_img]:!w-[44px] lg:[&_img]:!h-[44px] xl:[&_img]:!w-14 xl:[&_img]:!h-14"
                        : "transition-transform duration-300 group-hover:scale-125 shrink-0 [&_img]:w-6! [&_img]:h-6! lg:[&_img]:w-7! lg:[&_img]:h-7! xl:[&_img]:w-9! xl:[&_img]:h-9! 2xl:[&_img]:w-10! 2xl:[&_img]:h-10!"
                    }
                    >
                      {link.icon}
                    </div>
                    <span className="font-bold text-black text-[11px] lg:text-xs xl:text-[0.85rem] relative z-10">
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>

              {/* ══ RIGHT ZONE: Contact us (under Office/Wishlist/Cart) ═══════ */}
              <div className="flex items-center shrink-0 min-w-0">
                <Link
                  to="/contact"
                  className="group relative flex items-center gap-2 lg:gap-2.5 xl:gap-3 px-2.5 lg:px-3 xl:px-4 py-2 lg:py-2.5 xl:py-3 rounded-2xl overflow-hidden transition-all duration-300 hover:bg-white/10 whitespace-nowrap"
                >
                  <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-white/5 to-white/10 blur-sm" />
                  <div className="relative z-10 flex-shrink-0 w-8 h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-white/10 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <ImageIcon
                      className="w-4 h-4 lg:w-8 lg:h-8 object-cover text-zinc-300 group-hover:text-white transition-colors duration-300"
                      src={audio}
                      alt="Contact"
                    />
                  </div>
                  <span className="relative z-10 font-semibold text-zinc-900 group-hover:text-yellow-500 text-[11px] lg:text-xs xl:text-sm tracking-wide transition-colors duration-300 whitespace-nowrap">
                    Contact us
                  </span>
                  <svg
                    className="relative z-10 w-3 h-3 lg:w-3.5 lg:h-3.5 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-1 transition-all duration-300 ml-1 shrink-0"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

            </div>
          </div>
        </nav>
      </header>

      {/* ── Mobile Sidebar Overlay ───────────────────────────────────────────── */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-[200] flex justify-end bg-black/60 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="h-full w-[85%] max-w-[320px] bg-white shadow-2xl animate-slideRight"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-[#F7A221]/5 to-transparent">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#F7A221]" />
                <span className="text-lg font-black uppercase tracking-tighter text-[#F7A221]">Menu</span>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white rounded-full shadow-sm text-black hover:rotate-90 transition-transform">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto h-[calc(100%-80px)]">
              <div className="p-4 space-y-4">

                {/* Logged-in user card */}
                {isLoggedIn && user && (
                  <div
                    className="bg-gradient-to-r from-[#F7A221]/15 to-transparent p-4 rounded-2xl mb-4 border border-[#F7A221]/20 cursor-pointer"
                    onClick={() => { navigate('/account/userprofile'); setIsMenuOpen(false); }}
                  >
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Welcome back,</p>
                    <p className="font-black text-black text-lg">{user?.name || "User"}</p>
                    <p className="text-xs text-gray-600 mt-1">{user?.email}</p>
                  </div>
                )}

                {/* Quick links — Home added first */}
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">✨ Quick Links</p>

                {/* Home link in sidebar */}
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-all font-bold text-sm group"
                >
                  <span className="p-2 bg-gray-50 rounded-lg group-hover:scale-110 transition-transform">
                    <img src={homeIcon} alt="Home" className="w-[40px] h-[40px] object-contain animate-bounce-soft" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
                  </span>
                  <span className="group-hover:text-[#F7A221]">Home</span>
                </Link>

                {/* Remaining quick links */}
                {bottomNavLinks.map((link, idx) => (
                  <Link
                    key={idx}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-all font-bold text-sm group"
                  >
                    <span
                      className={`p-2 bg-gray-50 rounded-lg group-hover:scale-110 transition-transform ${
                        link.label === "Just Arrived" ? "[&_img]:!h-14 [&_img]:!w-14" : ""
                      }`}
                    >
                      {link.icon}
                    </span>
                    <span className="group-hover:text-[#F7A221]">{link.label}</span>
                  </Link>
                ))}

                {/* Categories grid */}
                <div className="pt-4 border-t">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">🔥 Top Categories</p>
                  <div className="grid grid-cols-2 gap-2">
                    {mobileCategories.map((cat, i) => (
                      <div
                        key={i}
                        onClick={() => { setIsMenuOpen(false); setTimeout(() => navigate(cat.path), 150); }}
                        className="p-3 bg-gray-50 rounded-xl text-[11px] font-bold text-center border border-gray-100 text-gray-800 hover:border-[#F7A221] hover:bg-orange-50 transition-all cursor-pointer"
                      >
                        {cat.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact / help block */}
                <div className="pt-6">
                  <div className="bg-gradient-to-r from-black to-gray-900 rounded-2xl p-4 text-white">
                    <p className="text-[10px] font-bold opacity-60 uppercase mb-2 flex items-center gap-1">
                      <HeadphonesIcon size={10} /> Need Help?
                    </p>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-black">+91 93706 86008</p>
                      <a href="mailto:support.offerwalebaba@gmail.com" className="text-[11px] opacity-80">
                        support.offerwalebaba@gmail.com
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cart Sidebar ─────────────────────────────────────────────────────── */}
      <CartSidebar
        isOpen={isCartOpen}
        isLoggedIn={isLoggedIn}
        onOpenAuth={onOpenAuth}
        user={user}
        onClose={() => setIsCartOpen(false)}
      />

      {/* ── Wishlist Sidebar ──────────────────────────────────────────────────── */}
      <WishlistSidebar
        isOpen={isWishCartOpen}
        onOpenAuth={onOpenAuth}
        onClose={() => setIsWishCartOpen(false)}
      />

      {/* ── Search Modal ──────────────────────────────────────────────────────── */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        initialQuery={searchQuery}
      />

      {/* ── Global styles ─────────────────────────────────────────────────────── */}
      <style>{`
        /* ── Nav link base ── */
        .nav-link {
          padding: 10px 18px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          letter-spacing: 0.03em;
          color: #000000 !important;
        }
        .nav-link:hover {
          background: rgba(247, 162, 33, 0.1);
          transform: translateY(-2px);
        }

        /* ── Home nav button ── */
        .home-nav-btn {
          transition: all 0.25s ease;
        }
        .home-nav-btn:hover {
          transform: translateY(-2px);
        }

        /* ── All Categories button ── */
        .all-cat-btn {
          letter-spacing: 0.03em;
        }
        .all-cat-btn:hover {
          transform: translateY(-1px);
        }

        /* ── Animations ── */
        @keyframes slideRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .animate-slideRight { animation: slideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes swing {
          0%   { transform: rotate(0deg); }
          20%  { transform: rotate(15deg); }
          40%  { transform: rotate(-10deg); }
          60%  { transform: rotate(5deg); }
          80%  { transform: rotate(-5deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-swing { animation: swing 2.5s ease-in-out infinite; transform-origin: top center; }

        @keyframes flicker {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.15); opacity: 0.9; }
          70%       { transform: scale(1.05); opacity: 1; }
        }
        .animate-flicker { animation: flicker 1s ease-in-out infinite; }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }

        @keyframes bounce-soft {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-3px); }
        }
        .animate-bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25%       { transform: translateX(-2px); }
          75%       { transform: translateX(2px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out infinite; }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-15px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes flush-continuous {
          0%   { transform: translate(0,0) scale(0.5) rotate(0deg); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translate(var(--target-x), var(--target-y)) scale(1.2) rotate(var(--target-rot)); opacity: 0; }
        }
        .animate-flush-continuous {
          pointer-events: none;
          animation: flush-continuous 1s ease-out forwards;
        }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes spin3d {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(360deg); }
        }
        .animate-float-slow { animation: float 4s ease-in-out infinite; }
        .animate-spin-3d {
          animation: spin3d 4s linear infinite;
          transform-style: preserve-3d;
          display: inline-block;
        }
      `}</style>
    </>
  );
};

export default memo(Navbar);

// code is working but try to add new  search bar remove the existing one which cause issue is user experince
// import React, { useCallback, memo, useState, useRef, useEffect } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { forceLogout } from '../REDUX_FEATURES/REDUX_SLICES/authSlice';
// import {
//   selectWishlistCount,
//   selectWishlistGuestItems,
// } from '../REDUX_FEATURES/REDUX_SLICES/userWishlistSlice';
// import { selectDisplayCartCount } from '../REDUX_FEATURES/REDUX_SLICES/userCartSlice';
// import CartSidebar from './CartSidebar';
// import {
//   Search, User, Heart, ShoppingCart, Menu, X, Phone, Mail, Clock,
//   ChevronRight, Home, Flame, Package, Tag, Ticket, HeadphonesIcon,
//   Smartphone, ChefHat, Shirt, Dumbbell, Plane, Book, Baby, Car, Box, Gift,
//   MapPin, LogOut, UserCircle, Settings, Sparkles, TrendingUp, Star, Zap
// } from 'lucide-react';
// import { Link, useLocation, useNavigate } from 'react-router-dom';
// import logo from "../../assets/logo2.png";
// import homeIcon from "../../assets/home (2).png";
// import Coupon from "../../assets/Tickets.gif"
// import SaleIcon from "../../assets/Shopping bag.gif"
// import deal from "../../assets/Discount.gif"
// import arrivals from "../../assets/Product (5).gif"
// import justarrivedIcon from "../../assets/just-arrived (1).png";
// import dealIcon from "../../assets/deal.png";
// import { AnimatePresence, motion } from 'framer-motion';
// import saleIcon from "../../assets/sale.png";
// import coupanIcon from "../../assets/coupon.png";
// import customercareIcon from "../../assets/service.png";
// import discountBannerIcon from "../../assets/discount-voucher.png";
// import WishlistSidebar from './WishlistSidebar';
// import { selectDefaultAddress, fetchAddresses } from '../REDUX_FEATURES/REDUX_SLICES/Useraddressslice';
// import SearchModal from './Search_Modal/SearchModal';
// import MobileBottomNav from './Mobilebottomnav';

// // --- Sub-Components ---

// const ActionIcon = memo(({ item, onClick, isLoggedIn }) => (
//   <div 
//     onClick={onClick}
//     className="flex flex-col items-center cursor-pointer relative group text-black hover:text-[#F7A221] transition-colors min-w-[50px]"
//   >
//     <div className="p-1 md:p-2 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
//       {item.icon}
//     </div>
//     {item.count !== undefined && (
//       <span className={`absolute top-0 right-1 md:top-1 md:right-2 ${item.badge} text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm group-hover:animate-bounce`}>
//         {item.count}
//       </span>
//     )}
//     <span className="text-[9px] md:text-[10px] mt-0.5 font-bold uppercase tracking-tighter whitespace-nowrap">
//       {item.label}
//     </span>
//   </div>
// ));

// // User Account Dropdown Component
// const UserAccountDropdown = ({ user, onLogout, onClose }) => {
//   const navigate = useNavigate();
//   const dropdownRef = useRef(null);

//   const menuItems = [
    
//     { icon: <UserCircle size={16} />, label: 'My Profile', path: '/account/userprofile' },
//     { icon: <Heart size={16} />, label: 'My Wishlist', path: '/account/userwishlist' },
//     { icon: <ShoppingCart size={16} />, label: 'My Orders', path: '/account/userorders' },
//   ];

//   return (
//     <div 
//       ref={dropdownRef}
//       className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[500] animate-slideDown"
//     >
//       <div className="bg-gradient-to-r from-[#F7A221]/10 to-transparent p-4 border-b">
//         <p className="text-xs text-gray-500 mb-1">Welcome back,</p>
//         <p className="font-black text-black text-lg truncate">
//           {user?.name || user?.email}
//         </p>
//         <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
//       </div>
//       <div className="py-2">
//         {menuItems.map((item, index) => (
//           <button
//             key={index}
//             onClick={() => {
//               navigate(item.path);
//               close();
//             }}
//             className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50 transition-colors text-left group"
//           >
//             <span className="text-gray-500 group-hover:text-[#F7A221] transition-colors">
//               {item.icon}
//             </span>
//             <span className="text-sm font-bold text-gray-700 group-hover:text-black">
//               {item.label}
//             </span>
//           </button>
//         ))}
//       </div>
//       <div className="border-t p-2">
//         <button
//           onClick={() => {
//             onLogout();
//             onClose();
//           }}
//           className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors rounded-xl text-left group"
//         >
//           <LogOut size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
//           <span className="text-sm font-bold text-red-600">Logout</span>
//         </button>
//       </div>
//     </div>
//   );
// };

// // Location Display Component
// const LocationDisplay = ({ isLoggedIn, onOpenAuth, userAddress }) => {
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [isAnimating, setIsAnimating] = useState(false);
//   let navigate = useNavigate();

//   let handleAddress = () => {
//     if(isLoggedIn) {
//       navigate('/account/useraddress');
//     } else {
//       // Trigger animation to show destinations
//       onOpenAuth();
//     }
//   }
//   const getDisplayAddress = () => {
//     if (isLoggedIn && userAddress) {
//       const parts = [];
//       if (userAddress.city) parts.push(userAddress.city);
//       if (userAddress.postalCode) parts.push(userAddress.postalCode);
//       if (parts.length > 0) return parts.join(', ');
//       if (userAddress.addressLine1) return userAddress.addressLine1.substring(0, 20);
//       return "Select Address";
//     }
//     return isLoggedIn ? "SELECT ADDRESS" : "ADDRESS";
//   };
//    let address = getDisplayAddress()

//   const destinations = [
    
//     address === !"ADDRESS" ? getDisplayAddress() : address,
//     "HOME",
//     "OFFICE",
//   ];

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setIsAnimating(true);
//       setTimeout(() => {
//         setCurrentIndex((prev) => (prev + 1) % destinations.length);
//         setIsAnimating(false);
//       }, 300);
//     }, 2000);
//     return () => clearInterval(interval);
//   }, [isLoggedIn, userAddress]);

//   return (
//   <div className="hidden xl:flex items-center gap-3 bg-white cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-xl transition-all hover:border-gray-300 group">

//   <MapPin size={20} className="text-red-500 animate-bounce" />

//   <div onClick={handleAddress} className="flex flex-col w-44 overflow-hidden">
    
//     <span className="text-[10px] text-gray-500 font-semibold uppercase leading-none">
//       Deliver to
//     </span>

//   <div className="flex items-center mt-1">

//   {!isLoggedIn && (
//     <span className="text-sm font-medium text-gray-700 mr-1 whitespace-nowrap">
//       Your
//     </span>
//   )}

//   <div className="relative h-[20px] overflow-hidden flex-1">
    
//     {/* CURRENT */}
//     <span
//       className="absolute left-0 w-full text-sm font-semibold text-gray-900 leading-[20px] transition-transform duration-500 ease-in-out"
//       style={{
//         top: 0,
//         transform: isAnimating && !isLoggedIn || isAnimating && ( isLoggedIn && address === "SELECT ADDRESS") ? "translateY(-100%)" : "translateY(0)",
//       }}
//     >
//       { isLoggedIn && !( isLoggedIn && address === "SELECT ADDRESS") ? address : destinations[currentIndex]}
//     </span>

//     {/* NEXT */}
//     <span
//       className="absolute left-0 w-full text-sm font-semibold text-gray-900 leading-[20px] transition-transform duration-500 ease-in-out"
//       style={{
//         top: "100%",
//         transform: isAnimating && !isLoggedIn ? "translateY(-100%)" : "translateY(0)",
//         transitionDelay: isAnimating && !isLoggedIn ? "0.25s" : "0s", // 🔥 KEY FIX
//       }}
//     >
//       { isLoggedIn ? address : destinations[(currentIndex + 1) % destinations.length]}
//     </span>

//   </div>
// </div>
//   </div>
// </div>
//   );
// };

// const MegaDropdown = ({ isOpen }) => {
//   if (!isOpen) return null;

//   const categories = [
//     { label: "Smart Life Gadgets", path: "/category/smart-life-gadgets" },
//     { label: "Home & Kitchen", path: "/category/home-and-kitchen" },
//     { label: "Fashion World", path: "/category/fashion-world" },
//     { label: "Sports & Fitness", path: "/category/sports-and-fitness" },
//     { label: "Tours & Travels", path: "/category/tours-and-travels" },
//     { label: "Stationary", path: "/category/stationary" },
//     { label: "Baby Items", path: "/category/baby-items" },
//     { label: "Car Accessories", path: "/category/car-accessories" },
//     // { label: "Mix Items Daily use", icon: <Box size={18} className="text-red-600" />, path: "/category/mix-items-daily-use" },
//     { label: "Cleaning & Housekeeping Supplies", path: "/category/mix-items-daily-use" },
//     { label: "Gifts", path: "/category/gifts" }
//   ];

//   return (
//     <>
//  <div className="absolute top-full left-1/2 -translate-x-1/2 w-screen bg-white border-t border-gray-200 shadow-2xl z-50 hidden lg:block animate-slideDown">

//   {/* CENTER CONTENT */}
//   <div className="max-w-7xl mx-auto px-6 py-8">

//     {/* Header */}
//     <div className="flex items-center justify-between mb-6">
//       <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
//         Shop by Category
//       </p>
//       <div className="h-px flex-1 ml-4 bg-gray-200"></div>
//     </div>

//     {/* Grid */}
//     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">

//       {categories.map((category, index) => (
//         <Link
//           key={index}
//           to={category.path}
//           className="group flex items-center justify-center p-4 rounded-xl bg-gray-50
//                      hover:bg-white hover:shadow-md
//                      border border-transparent hover:border-gray-200
//                      transition-all duration-200 active:scale-[.96]"
//         >
//           <span className="text-sm font-semibold text-gray-800 
//                            group-hover:text-yellow-500 transition-colors">
//             {category.label}
//           </span>
//         </Link>
//       ))}

//     </div>

//   </div>
// </div></>
//   );
// };

// const NavItemWithDropdown = ({ link }) => {
//   const [isOpen, setIsOpen] = useState(false);

//   return (
//     <div
//       className="static"
//       onClick={()=> setIsOpen(!isOpen)}
//       onMouseEnter={()=> setIsOpen(true)}
//       onMouseLeave={()=> setIsOpen(false)}
//     >
//       <div className="nav-link flex items-center gap-2 group cursor-pointer">
//         <img src={homeIcon} className='w-5 h-5 object-cover' alt="" />
//         <span className="font-bold text-black group-hover:text-black transition-colors">{link.label}</span>
//         <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-black' : 'text-zinc-900/70'}`} />
//       </div>
//       <MegaDropdown isOpen={isOpen} />
//     </div>
//   );
// };

// const ImageIcon = ({ src, alt, className = "", animation = "animate-bounce-soft" }) => (
//   <img 
//     src={src} 
//     alt={alt} 
//     className={`w-[40px] h-[40px] object-contain ${animation} ${className}`}
//     style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
//   />
// );

// const Navbar = ({ searchQuery, setSearchQuery, isMenuOpen, setIsMenuOpen, isLoggedIn, user, onOpenAuth }) => {
//   // console.count('NAVBAR RENDER');
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
//   const [isLogoHovered, setIsLogoHovered] = useState(false);
//   const [burstIcons, setBurstIcons] = useState([]);
//   const wishlistCount = useSelector(selectWishlistCount);
//   const guestItems = useSelector(selectWishlistGuestItems);
//   const cartCount = useSelector(selectDisplayCartCount);
//   const userAddress = useSelector(selectDefaultAddress);
//   const [isCartOpen, setIsCartOpen] = useState(false);
//   const [isWishCartOpen, setIsWishCartOpen] = useState(false);
//   const displayCount = isLoggedIn ? wishlistCount : guestItems.length;
//   const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
//   // Fetch user address when logged in
//   useEffect(() => {
//     if (isLoggedIn) {
//       dispatch(fetchAddresses());
//     }
//   }, [dispatch, isLoggedIn]);

// // 3. duplicate fetchAddresses useEffect bhi hata do — do baar hai
// // yeh wala rakho sirf ek baar:
// useEffect(() => {
//   if (isLoggedIn) dispatch(fetchAddresses());
// }, [dispatch, isLoggedIn]);
// useEffect(() => {
//   if (isLoggedIn) {
//     dispatch(fetchAddresses());
//   }
// }, [dispatch, isLoggedIn]);

//  const handleSearchFocus = useCallback(() => {
//   setIsSearchModalOpen(true);
// }, []);

//   const handleLogout = async () => {
//     await dispatch(forceLogout());
//     setIsAccountDropdownOpen(false);
//   };

//   const handleAccountClick = () => {
//     if (isLoggedIn) {
//       setIsAccountDropdownOpen(!isAccountDropdownOpen);
//     } else {
//       onOpenAuth();
//     }
//   };

//   const handleWishlist = () => {
//     if (isLoggedIn) {
//       navigate('/account/userwishlist');
//     } else {
//       setIsWishCartOpen(true);
//     }
//   };
  
//   useEffect(() => {
//     let interval;
//     if (isLogoHovered) {
//       interval = setInterval(() => {
//         const newIcon = {
//           id: Date.now(),
//           ...iconPool[Math.floor(Math.random() * iconPool.length)],
//           x: (Math.random() - 0.5) * 200 + "px",
//           y: (Math.random() - 0.5) * 200 + "px",
//           rotation: Math.random() * 360 + "deg"
//         };
//         setBurstIcons((prev) => [...prev.slice(-15), newIcon]);
//       }, 150);
//     } else {
//       setBurstIcons([]);
//     }
//     return () => clearInterval(interval);
//   }, [isLogoHovered]);

//   const iconPool = [
//     { icon: <Smartphone size={18} />, color: "text-blue-500" },
//     { icon: <Shirt size={18} />, color: "text-orange-500" },
//     { icon: <Dumbbell size={18} />, color: "text-green-500" },
//     { icon: <Package size={18} />, color: "text-purple-500" },
//     { icon: <Baby size={18} />, color: "text-pink-500" },
//     { icon: <ChefHat size={18} />, color: "text-red-500" },
//     { icon: <Car size={18} />, color: "text-gray-600" },
//     { icon: <HeadphonesIcon size={18} />, color: "text-yellow-500" }
//   ];
  
//   const actionIcons = [
//     { 
//       icon: <User size={22} />, 
//       label: isLoggedIn ? (user?.name || "Account") : "Account",
//       onClick: handleAccountClick
//     },
//     { icon: <Heart size={22} />, label: "Wishlist", count: displayCount, badge: "bg-red-600", onClick: handleWishlist },
//     { icon: <ShoppingCart size={22} />, label: "Cart", count: cartCount, badge: "bg-black", onClick: () => setIsCartOpen(true) }
//   ];

//   const bottomNavLinks = [
//     {
//       label: "Todays' Deal",
//       path: "/",
//       icon: <ImageIcon src={deal} alt="Deal" animation="animate-swing" />
//     },
//     {
//       label: "Just Arrived",
//       path: "/just-arrived",
//       icon: <ImageIcon src={arrivals} alt="Just Arrived" animation="animate-float" />
//     },
//     {
//       label: "Sale",
//       path: "/sale",
//       icon: <ImageIcon src={SaleIcon} alt="Sale" animation="animate-flicker" />
//     },
//     {
//       label: "Coupons",
//       path: "/coupons",
//       icon: <ImageIcon src={Coupon} alt="Coupons" animation="animate-bounce-soft" />
//     },
//   ];

//   const mobileCategories = [
//     { label: "Smart Life", path: "/category/smart-life-gadgets" },
//     { label: "Home & Kitchen", path: "/category/home-and-kitchen" },
//     { label: "Fashion World", path: "/category/fashion-world" },
//     { label: "Sports & Fitness", path: "/category/sports-and-fitness" },
//     { label: "Tours & Travels", path: "/category/tours-and-travels" },
//     { label: "Stationary", path: "/category/stationary" },
//     { label: "Baby Items", path: "/category/baby-items" },
//     { label: "Car Accessories", path: "/category/car-accessories" },
//     { label: "Cleaning & Housekeeping Supplies", path: "/category/mix-items-daily-use" },
//     { label: "Gifts", path: "/category/gifts" }
//   ];

//   return (
//     <>
//       {/* Top Info Bar — desktop only */}
//       <div className="bg-black text-white py-3 px-4 hidden lg:block border-b border-white/10">
//         <div className="container mx-auto flex justify-between text-[11px] font-bold uppercase tracking-wider">
//           <div className="flex items-center gap-8">
//             <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//               <Phone size={12} className="text-[#F7A221] group-hover:animate-shake" /> +91 93200 01717
//             </span>
//             <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//               <Mail size={12} className="text-[#F7A221] group-hover:scale-110" /> support@offerwale.com
//             </span>
//           </div>
//           <div className="flex items-center gap-4">
//             <Clock size={12} className="text-[#F7A221] animate-pulse" /> <span className="text-white/90">Pan India Delivery • 24/7 Support</span>
//           </div>
//         </div>
//       </div>

//       <header className="bg-white sticky top-0 z-50 shadow-lg">
//         <div className="container mx-auto px-4">

//           {/* MOBILE LAYOUT (lg:hidden) */}
//           <div className="lg:hidden">
//             {/* ROW 1: Logo + Icons in one row */}
//             <div className="flex items-center justify-between py-3 border-b border-gray-100">
//               {/* Logo Section */}
//               <Link
//                 to="/"
//                 className="relative flex items-center justify-center group"
//                 onMouseEnter={() => setIsLogoHovered(true)}
//                 onMouseLeave={() => setIsLogoHovered(false)}
//               >
//                 {burstIcons.map((item) => (
//                   <div
//                     key={item.id}
//                     className={`absolute z-[-1] ${item.color} animate-flush-continuous`}
//                     style={{
//                       '--target-x': item.x,
//                       '--target-y': item.y,
//                       '--target-rot': item.rotation
//                     }}
//                   >
//                     {item.icon}
//                   </div>
//                 ))}
//                 <img
//                   className="relative z-10 object-contain w-[100px] h-auto transition-transform duration-300 group-hover:scale-105"
//                   src={logo}
//                   alt="Offer Wale Baba"
//                 />
//               </Link>

//               {/* Right Icons Group */}
//               <div className="flex items-center gap-3 relative z-[500]">
//                 {/* User Icon */}
//                 <div
//                   onClick={handleAccountClick}
//                   className="relative flex flex-col items-center cursor-pointer group"
//                 >
//                   <div className="p-2 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-[#F7A221]/20 group-hover:to-orange-100 transition-all duration-300 shadow-sm group-hover:shadow-md">
//                     <User size={20} className="text-gray-700 group-hover:text-[#F7A221] transition-colors" />
//                   </div>
//                   <span className="text-[9px] font-bold mt-0.5 text-gray-600 group-hover:text-[#F7A221]">
//                     {isLoggedIn ? (user?.name?.split(' ')[0]?.slice(0, 6) || "Hi") : "Login"}
//                   </span>
//                   {isLoggedIn && (
//                     <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
//                   )}
//                 </div>

//                 {/* Cart Icon */}
//                 <div
//                   onClick={() => setIsCartOpen(true)}
//                   className="relative flex flex-col items-center cursor-pointer group"
//                 >
//                   <div className="p-2 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-[#F7A221]/20 group-hover:to-orange-100 transition-all duration-300 shadow-sm group-hover:shadow-md">
//                     <ShoppingCart size={20} className="text-gray-700 group-hover:text-[#F7A221] transition-colors" />
//                   </div>
//                   {cartCount > 0 && (
//                     <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-md animate-bounce">
//                       {cartCount > 99 ? '99+' : cartCount}
//                     </span>
//                   )}
//                   <span className="text-[9px] font-bold mt-0.5 text-gray-600">Cart</span>
//                 </div>

//                 {/* Menu Icon */}
//                 <button
//                   onClick={() => setIsMenuOpen(true)}
//                   className="flex flex-col items-center cursor-pointer group bg-transparent border-0 p-0"
//                 >
//                   <div className="p-2 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-[#F7A221]/20 group-hover:to-orange-100 transition-all duration-300 shadow-sm group-hover:shadow-md">
//                     <Menu size={20} className="text-gray-700 group-hover:text-[#F7A221] transition-colors" />
//                   </div>
//                   <span className="text-[9px] font-bold mt-0.5 text-gray-600">Menu</span>
//                 </button>

//                 {/* Account Dropdown — mobile */}
//                 {isLoggedIn && isAccountDropdownOpen && (
//                   <UserAccountDropdown 
//                     user={user}
//                     onLogout={handleLogout}
//                     onClose={() => setIsAccountDropdownOpen(false)}
//                   />
//                 )}
//               </div>
//             </div>

//             {/* ROW 2: Search Bar */}
//                 <motion.div
//                   key="search-bar"
//                   initial={{ height: 0, opacity: 0 }}
//                   animate={{ height: 'auto', opacity: 1 }}
//                   exit={{ height: 0, opacity: 0 }}
//                   transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
//                   style={{ overflow: 'hidden' }}
//                   className="border-b border-gray-100"
//                 >
//                   <div className="py-3 relative group">
//                     <div className="absolute -inset-0.5 bg-gradient-to-r from-[#F7A221] via-orange-400 to-[#F7A221] rounded-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-500 blur-sm" />
//                     <div className="relative">
//                       <input
//                         type="text"
//                         placeholder="Search 10,000+ products..."
//                         className="w-full py-3.5 pl-12 pr-12 rounded-2xl text-black focus:outline-none bg-gray-100 border border-gray-200 focus:border-[#F7A221] focus:bg-white transition-all font-medium text-sm"
//                         value={searchQuery}
//                         onChange={(e) => setSearchQuery(e.target.value)}
//                         onClick={handleSearchFocus}
//                       />
//                       <Search
//                         className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#F7A221]"
//                         size={18}
//                       />
//                     </div>
//                   </div>
//                 </motion.div>
//           </div>

//           {/* DESKTOP LAYOUT */}
//           <div className="hidden lg:flex items-center justify-between gap-2 md:gap-8 h-30 md:h-24">
//             {/* Logo */}
//             <div className="flex items-center gap-2">
//               <Link
//                 to="/"
//                 className="relative flex-shrink-0 flex items-center justify-center p-1 group"
//                 onMouseEnter={() => setIsLogoHovered(true)}
//                 onMouseLeave={() => setIsLogoHovered(false)}
//               >
//                 {burstIcons.map((item) => (
//                   <div
//                     key={item.id}
//                     className={`absolute z-[-1] ${item.color} animate-flush-continuous`}
//                     style={{
//                       '--target-x': item.x,
//                       '--target-y': item.y,
//                       '--target-rot': item.rotation
//                     }}
//                   >
//                     {item.icon}
//                   </div>
//                 ))}
//                 <img
//                   style={{ margin: "auto", display: "flex", justifyContent: "center", alignItems: "center", marginTop: "75px" }}
//                   className="relative z-10 object-contain transition-transform duration-500 w-[180px] h-full flex justify-center items-center"
//                   src={logo}
//                   alt="Logo"
//                 />
//               </Link>
//             </div>

//             {/* Location Display - Desktop Only */}
//             <LocationDisplay isLoggedIn={isLoggedIn} onOpenAuth={onOpenAuth} userAddress={userAddress} />

//             {/* Search Bar */}
//             <div className="flex-1 max-w-xl relative">
//               <input
//                 type="text"
//                 placeholder="Search products, brands and more..."
//                 className="w-full py-3.5 px-14 rounded-2xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-[#F7A221] focus:bg-white transition-all font-bold text-sm"
//                 // value={searchQuery}
//                 onClick={handleSearchFocus}
//               />
//               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//               <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white py-2 px-5 rounded-xl hover:bg-[#F7A221] transition-all shadow-md font-bold text-xs uppercase hover:tracking-widest duration-300">
//                 Search
//               </button>
//             </div>

//             {/* Action Icons */}
//             <div className="flex items-center gap-2 md:gap-4 lg:gap-8 relative z-[500]">
//               {actionIcons.map((item, idx) => (
//                 <ActionIcon 
//                   key={idx} 
//                   item={item} 
//                   onClick={item.onClick}
//                   isLoggedIn={isLoggedIn}
//                 />
//               ))}
//               {isLoggedIn && isAccountDropdownOpen && (
//                 <UserAccountDropdown 
//                   user={user}
//                   onLogout={handleLogout}
//                   onClose={() => setIsAccountDropdownOpen(false)}
//                 />
//               )}
//             </div>
//           </div>
//         </div>
        
//         {/* Bottom Desktop Nav */}
//         <nav style={{ width: "55%", margin: "auto" }} className="shadow-inner hidden lg:block relative">
//           <div className="container mx-auto px-4">
//             <div className="flex items-center justify-center gap-2 py-2">
//               <NavItemWithDropdown
//                 link={{ label: "All Categories", path: "/products", icon: <ImageIcon src={homeIcon} alt="Home" animation="animate-bounce-soft" /> }}
//               />
//               <div className="h-6 w-[1px] bg-white/20 mx-2"></div>
//               {bottomNavLinks.map((link, idx) => (
//                 <Link
//                   key={idx}
//                   to={link.path}
//                   className="nav-link text-center justify-center flex items-center px-2 py-3 gap-2 hover:bg-white/10 group"
//                 >
//                   <div className="transition-transform duration-300 group-hover:scale-125">
//                     {link.icon}
//                   </div>
//                   <span className="font-bold text-black text-md md:text-[0.7rem] relative z-10">{link.label}</span>
//                 </Link>
//               ))}
//             </div>
//           </div>
//         </nav>
//       </header>

//       {/* Mobile Sidebar Overlay */}
//       {isMenuOpen && (
//         <div className="fixed inset-0 bg-black/60 z-[200] lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}>
//           <div className="w-[85%] max-w-[320px] h-full bg-white shadow-2xl animate-slideRight" onClick={(e) => e.stopPropagation()}>
//             <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-[#F7A221]/5 to-transparent">
//               <div className="flex items-center gap-2">
//                 <Sparkles size={18} className="text-[#F7A221]" />
//                 <span className="text-lg font-black uppercase tracking-tighter text-[#F7A221]">Menu</span>
//               </div>
//               <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white rounded-full shadow-sm text-black hover:rotate-90 transition-transform">
//                 <X size={20} />
//               </button>
//             </div>
//             <div className="overflow-y-auto h-[calc(100%-80px)]">
//               <div className="p-4 space-y-4">
//                 {isLoggedIn && user && (
//                   <div className="bg-gradient-to-r  from-[#F7A221]/15 to-transparent p-4 rounded-2xl mb-4 border border-[#F7A221]/20" 
//                   onClick={() => {
//             navigate('/account/userprofile')
//             setIsMenuOpen(false);  }}>
//                     <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Welcome back,</p>
//                     <p className="font-black text-black text-lg">{user?.name || "User"}</p>
//                     <p className="text-xs text-gray-600 mt-1">{user?.email}</p>
//                   </div>
//                 )}
//                 <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">✨ Quick Links</p>
//                 {bottomNavLinks.map((link, idx) => (
//                   <Link key={idx} to={link.path} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-all font-bold text-sm group">
//                     <span className="p-2 bg-gray-50 rounded-lg group-hover:scale-110 transition-transform">{link.icon}</span>
//                     <span className="group-hover:text-[#F7A221]">{link.label}</span>
//                   </Link>
//                 ))}
//                 <div className="pt-4 border-t">
//                   <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">🔥 Top Categories</p>
//                   <div className="grid grid-cols-2 gap-2">
//                     {mobileCategories.map((cat, i) => (
//                       <div key={i} onClick={() => {
//     setIsMenuOpen(false);
//     setTimeout(() => {
//       navigate(cat.path);
//     }, 150);
//   }} to={cat.path} className="p-3 bg-gray-50 rounded-xl text-[11px] font-bold text-center border border-gray-100 text-gray-800 hover:border-[#F7A221] hover:bg-orange-50 transition-all cursor-pointer">
//                         {cat.label}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//                 <div className="pt-6">
//                   <div className="bg-gradient-to-r from-black to-gray-900 rounded-2xl p-4 text-white">
//                     <p className="text-[10px] font-bold opacity-60 uppercase mb-2 flex items-center gap-1"><HeadphonesIcon size={10} /> Need Help?</p>
//                     <div className="flex flex-col gap-1">
//                       <p className="text-sm font-black">+91 93200 01717</p>
//                       <p className="text-[11px] opacity-80">support@offerwale.com</p>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Cart Sidebar */}
//       <CartSidebar 
//         isOpen={isCartOpen}
//         isLoggedIn={isLoggedIn}
//         onOpenAuth={onOpenAuth}
//         user={user}
//         onClose={() => setIsCartOpen(false)}
//       />
//       {/* Wishlist Sidebar */}
//       <WishlistSidebar 
//         isOpen={isWishCartOpen}
//         onOpenAuth={onOpenAuth}
//         onClose={() => setIsWishCartOpen(false)} 
//       />
//       {/* Search Modal */}
//       <SearchModal 
//         isOpen={isSearchModalOpen}
//         onClose={() => setIsSearchModalOpen(false)}
//         initialQuery={searchQuery}
//       />
//     {/* <MobileBottomNav
//   wishlistCount={displayCount}
//   cartCount={cartCount}
//   isLoggedIn={isLoggedIn}
//   onWishlist={handleWishlist}
//   // onCart={() => setIsCartOpen(true)}
//   onCart={() => setIsCartOpen(prev => !prev)}
//   onAccount={handleAccountClick}
//   onSearch={handleSearchFocus}
//   onHome={() => navigate('/')}
// /> */}

//       <style>{`
//         .nav-link {
//           padding: 10px 18px;
//           font-size: 12px;
//           font-weight: 800;
//           text-transform: uppercase;
//           border-radius: 12px;
//           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//           letter-spacing: 0.03em;
//           color: #000000 !important;
//         }
//         .nav-link:hover {
//           background: rgba(247, 162, 33, 0.1);
//           transform: translateY(-2px);
//         }

//         @keyframes slideRight {
//           from { transform: translateX(-100%); }
//           to { transform: translateX(0); }
//         }
//         .animate-slideRight { animation: slideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

//         @keyframes swing {
//           0% { transform: rotate(0deg); }
//           20% { transform: rotate(15deg); }
//           40% { transform: rotate(-10deg); }
//           60% { transform: rotate(5deg); }
//           80% { transform: rotate(-5deg); }
//           100% { transform: rotate(0deg); }
//         }
//         .animate-swing { animation: swing 2.5s ease-in-out infinite; transform-origin: top center; }

//         @keyframes flicker {
//           0%, 100% { transform: scale(1); opacity: 1; }
//           50% { transform: scale(1.15); opacity: 0.9; }
//           70% { transform: scale(1.05); opacity: 1; }
//         }
//         .animate-flicker { animation: flicker 1s ease-in-out infinite; }

//         @keyframes float {
//           0%, 100% { transform: translateY(0); }
//           50% { transform: translateY(-4px); }
//         }
//         .animate-float { animation: float 3s ease-in-out infinite; }

//         @keyframes bounce-soft {
//           0%, 100% { transform: translateY(0); }
//           50% { transform: translateY(-3px); }
//         }
//         .animate-bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }

//         @keyframes tilt {
//           0%, 100% { transform: rotate(0deg); }
//           50% { transform: rotate(10deg); }
//         }
//         .animate-tilt { animation: tilt 3s ease-in-out infinite; }

//         @keyframes shake {
//           0%, 100% { transform: translateX(0); }
//           25% { transform: translateX(-2px); }
//           75% { transform: translateX(2px); }
//         }
//         .animate-shake { animation: shake 0.5s ease-in-out infinite; }

//         @keyframes slideDown {
//           from { opacity: 0; transform: translateY(-15px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

//         @keyframes flush-continuous {
//           0% {
//             transform: translate(0, 0) scale(0.5) rotate(0deg);
//             opacity: 0;
//           }
//           20% {
//             opacity: 1;
//           }
//           100% {
//             transform: translate(var(--target-x), var(--target-y)) scale(1.2) rotate(var(--target-rot));
//             opacity: 0;
//           }
//         }
//         .animate-flush-continuous {
//           pointer-events: none;
//           animation: flush-continuous 1s ease-out forwards;
//         }

//         /* Hide scrollbar for quick chips */
//         .scrollbar-hide::-webkit-scrollbar {
//           display: none;
//         }
//         .scrollbar-hide {
//           -ms-overflow-style: none;
//           scrollbar-width: none;
//         }
//       `}</style>
//     </>
//   );
// };

// export default memo(Navbar);
// add address upside code


// this code have navigation like mobile 
// import React, { useCallback, memo, useState, useRef, useEffect } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { forceLogout } from '../REDUX_FEATURES/REDUX_SLICES/authSlice';
// import {
//   selectWishlistCount,
//   selectWishlistGuestItems,
// } from '../REDUX_FEATURES/REDUX_SLICES/userWishlistSlice';
// import { selectDisplayCartCount } from '../REDUX_FEATURES/REDUX_SLICES/userCartSlice';
// import CartSidebar from './CartSidebar';
// import {
//   Search, User, Heart, ShoppingCart, Menu, X, Phone, Mail, Clock,
//   ChevronRight, HeadphonesIcon, Package,
//   Smartphone, ChefHat, Shirt, Dumbbell, Plane, Book, Baby, Car, Box, Gift,
//   MapPin, LogOut, UserCircle, Sparkles,
// } from 'lucide-react';
// import { Link, useNavigate,useLocation  } from 'react-router-dom';
// import logo from "../../assets/logo2.png";
// import homeIcon from "../../assets/home (2).png";
// import justarrivedIcon from "../../assets/just-arrived (1).png";
// import dealIcon from "../../assets/deal.png";
// import saleIcon from "../../assets/sale.png";
// import coupanIcon from "../../assets/coupon.png";
// import customercareIcon from "../../assets/service.png";
// import discountBannerIcon from "../../assets/discount-voucher.png";
// import WishlistSidebar from './WishlistSidebar';
// import { selectDefaultAddress, fetchAddresses } from '../REDUX_FEATURES/REDUX_SLICES/userAddressSlice';
// import MobileBottomNav from './Mobilebottomnav';

// // ---------------------------------------------------------------------------
// // Sub-Components
// // ---------------------------------------------------------------------------

// const ActionIcon = memo(({ item, onClick, isLoggedIn }) => (
//   <div
//     onClick={onClick}
//     className="flex flex-col items-center cursor-pointer relative group text-black hover:text-[#F7A221] transition-colors min-w-[50px]"
//   >
//     <div className="p-1 md:p-2 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
//       {item.icon}
//     </div>
//     {item.count !== undefined && (
//       <span className={`absolute top-0 right-1 md:top-1 md:right-2 ${item.badge} text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm group-hover:animate-bounce`}>
//         {item.count}
//       </span>
//     )}
//     <span className="text-[9px] md:text-[10px] mt-0.5 font-bold uppercase tracking-tighter whitespace-nowrap">
//       {item.label}
//     </span>
//   </div>
// ));

// // ---------------------------------------------------------------------------
// // User Account Dropdown
// // ---------------------------------------------------------------------------
// const UserAccountDropdown = ({ user, onLogout, onClose }) => {
//   const navigate = useNavigate();
//   const dropdownRef = useRef(null);

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         onClose();
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, [onClose]);

//   const menuItems = [
//     { icon: <UserCircle size={16} />,   label: 'My Profile',  path: '/account/userprofile' },
//     { icon: <Heart size={16} />,        label: 'My Wishlist', path: '/account/userwishlist' },
//     { icon: <ShoppingCart size={16} />, label: 'My Orders',   path: '/account/userorders' },
//   ];

//   return (
//     <div
//       ref={dropdownRef}
//       className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-slideDown"
//     >
//       <div className="bg-gradient-to-r from-[#F7A221]/10 to-transparent p-4 border-b">
//         <p className="text-xs text-gray-500 mb-1">Welcome back,</p>
//         <p className="font-black text-black text-lg truncate">{user?.name || user?.email}</p>
//         <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
//       </div>
//       <div className="py-2">
//         {menuItems.map((item, index) => (
//           <button
//             key={index}
//             onClick={() => { navigate(item.path); onClose(); }}
//             className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50 transition-colors text-left group"
//           >
//             <span className="text-gray-500 group-hover:text-[#F7A221] transition-colors">{item.icon}</span>
//             <span className="text-sm font-bold text-gray-700 group-hover:text-black">{item.label}</span>
//           </button>
//         ))}
//       </div>
//       <div className="border-t p-2">
//         <button
//           onClick={() => { onLogout(); onClose(); }}
//           className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors rounded-xl text-left group"
//         >
//           <LogOut size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
//           <span className="text-sm font-bold text-red-600">Logout</span>
//         </button>
//       </div>
//     </div>
//   );
// };

// // ---------------------------------------------------------------------------
// // Location Display — desktop xl+ only
// // ---------------------------------------------------------------------------
// const LocationDisplay = ({ isLoggedIn, userAddress }) => {
//   const getDisplayAddress = () => {
//     if (isLoggedIn && userAddress) {
//       const parts = [];
//       if (userAddress.city) parts.push(userAddress.city);
//       if (userAddress.postalCode) parts.push(userAddress.postalCode);
//       if (parts.length > 0) return parts.join(' ,');
//       if (userAddress.addressLine1) return userAddress.addressLine1.substring(0, 20);
//       return 'Select Address';
//     }
//     return 'YOUR ADDRESS';
//   };

//   return (
//     <div className="hidden xl:flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-all border border-transparent hover:border-gray-100 group">
//       <MapPin size={22} className="text-red-600 animate-bounce" />
//       <div className="flex flex-col">
//         <span className="text-[10px] text-gray-500 font-bold uppercase leading-none">Deliver to</span>
//         <span className="text-sm text-gray-900 leading-tight font-semibold">{getDisplayAddress()}</span>
//       </div>
//     </div>
//   );
// };

// // ---------------------------------------------------------------------------
// // Mega Dropdown — desktop only
// // ---------------------------------------------------------------------------
// const MegaDropdown = ({ isOpen }) => {
//   if (!isOpen) return null;

//   const categories = [
//     { label: 'Smart Life Gadgets',  icon: <Smartphone size={18} className="text-blue-600" />,   path: '/category/smart-life' },
//     { label: 'Home & Kitchen',      icon: <ChefHat size={18} className="text-red-600" />,        path: '/category/home-kitchen' },
//     { label: 'Fashion World',       icon: <Shirt size={18} className="text-[#F7A221]" />,        path: '/category/fashion' },
//     { label: 'Sports & Fitness',    icon: <Dumbbell size={18} className="text-blue-600" />,      path: '/category/sports-fitness' },
//     { label: 'Tours & Travels',     icon: <Plane size={18} className="text-[#F7A221]" />,        path: '/category/travel' },
//     { label: 'Stationary',          icon: <Book size={18} className="text-red-600" />,           path: '/category/stationary' },
//     { label: 'Baby Items',          icon: <Baby size={18} className="text-blue-600" />,          path: '/category/baby-items' },
//     { label: 'Car Accessories',     icon: <Car size={18} className="text-[#F7A221]" />,          path: '/category/car-accessories' },
//     { label: 'Mix Items Daily use', icon: <Box size={18} className="text-red-600" />,            path: '/category/daily-use' },
//     { label: 'Gifts',               icon: <Gift size={18} className="text-blue-600" />,          path: '/category/gifts' },
//   ];

//   return (
//     <div className="absolute top-[100%] left-0 w-full bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border-t-2 border-[#F7A221] animate-slideDown z-50 hidden lg:block">
//       <div className="container mx-auto px-4 py-10">
//         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
//           {categories.map((category, index) => (
//             <Link
//               key={index}
//               to={category.path}
//               className="flex items-center gap-4 p-4 rounded-2xl hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100 shadow-sm min-w-0"
//             >
//               <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 group-hover:shadow-md group-hover:rotate-3 transition-all duration-300">
//                 {category.icon}
//               </div>
//               <span className="font-bold text-black group-hover:text-[#F7A221] transition-colors text-[10px] md:text-[12px] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
//                 {category.label}
//               </span>
//             </Link>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// // ---------------------------------------------------------------------------
// // Nav item with mega dropdown trigger
// // ---------------------------------------------------------------------------
// const NavItemWithDropdown = ({ link }) => {
//   const [isOpen, setIsOpen] = useState(false);

//   return (
//     <div
//       className="static"
//       onMouseEnter={() => setIsOpen(true)}
//       onMouseLeave={() => setIsOpen(false)}
//     >
//       <div className="nav-link flex items-center gap-2 group cursor-pointer">
//         <div className={`transition-all duration-300 ${isOpen ? 'scale-110 rotate-12' : ''}`}>
//           {link.icon}
//         </div>
//         <span className="font-bold text-black group-hover:text-black transition-colors">{link.label}</span>
//         <ChevronRight
//           size={14}
//           className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-black' : 'text-white/70'}`}
//         />
//       </div>
//       <MegaDropdown isOpen={isOpen} />
//     </div>
//   );
// };

// // ---------------------------------------------------------------------------
// // Animated image icon helper
// // ---------------------------------------------------------------------------
// const ImageIcon = ({ src, alt, className = '', animation = 'animate-bounce-soft' }) => (
//   <img
//     src={src}
//     alt={alt}
//     className={`w-[30px] h-[30px] object-contain ${animation} ${className}`}
//     style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
//   />
// );

// // ---------------------------------------------------------------------------
// // MAIN NAVBAR
// // ---------------------------------------------------------------------------
// const Navbar = ({ searchQuery, setSearchQuery, isMenuOpen, setIsMenuOpen, isLoggedIn, user, onOpenAuth }) => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
//   const [isLogoHovered, setIsLogoHovered]                 = useState(false);
//   const [burstIcons, setBurstIcons]                       = useState([]);
//   const [isCartOpen, setIsCartOpen]                       = useState(false);
//   const [isWishCartOpen, setIsWishCartOpen]               = useState(false);

//   const wishlistCount = useSelector(selectWishlistCount);
//   const guestItems    = useSelector(selectWishlistGuestItems);
//   const cartCount     = useSelector(selectDisplayCartCount);
//   const userAddress   = useSelector(selectDefaultAddress);
//   const displayCount  = isLoggedIn ? wishlistCount : guestItems.length;

//   // Desktop search ref (used if bottom nav triggers search focus on desktop)
//   const desktopSearchRef = useRef(null);
// const location = useLocation();

// // Close all sidebars & menus when route changes
// useEffect(() => {
//   setIsCartOpen(false);
//   setIsWishCartOpen(false);
//   setIsMenuOpen(false); // Also close hamburger menu
// }, [location.pathname]);
//   // Fetch addresses when logged in
//   useEffect(() => {
//     if (isLoggedIn) dispatch(fetchAddresses());
//   }, [dispatch, isLoggedIn]);

//   // Search input handler
//   const handleSearchChange = useCallback((e) => setSearchQuery(e.target.value), [setSearchQuery]);

//   // Logout
//   const handleLogout = async () => {
//     await dispatch(forceLogout());
//     setIsAccountDropdownOpen(false);
//   };

//   // Account click — toggle dropdown if logged in, else open auth modal
//   const handleAccountClick = useCallback(() => {

//     if (isLoggedIn)navigate('/account/userprofile', { replace: true });
//     else onOpenAuth();
//   }, [isLoggedIn, onOpenAuth]);

//   // Wishlist
//   const handleWishlist = useCallback(() => {
//      setIsCartOpen(false); 
//     if (isLoggedIn)navigate('/account/userwishlist', { replace: true });
//     else setIsWishCartOpen(prev => !prev);
//     // else setIsWishCartOpen(true);
//   }, [isLoggedIn, navigate]);

//   // Search focus — focuses desktop search; on mobile you can navigate to /search page
//   const handleSearchFocus = useCallback(() => {
//     if (desktopSearchRef.current) {
//       desktopSearchRef.current.focus();
//     }
//     // Uncomment below if you have a dedicated mobile search page:
//     // navigate('/search');
//   }, []);

//   // Settings
//   const handleSettings = useCallback(() => {
//     navigate('/account/userprofile');
//   }, [navigate]);

//   // Logo burst icon pool
//   const iconPool = [
//     { icon: <Smartphone size={18} />,     color: 'text-blue-500' },
//     { icon: <Shirt size={18} />,          color: 'text-orange-500' },
//     { icon: <Dumbbell size={18} />,       color: 'text-green-500' },
//     { icon: <Package size={18} />,        color: 'text-purple-500' },
//     { icon: <Baby size={18} />,           color: 'text-pink-500' },
//     { icon: <ChefHat size={18} />,        color: 'text-red-500' },
//     { icon: <Car size={18} />,            color: 'text-gray-600' },
//     { icon: <HeadphonesIcon size={18} />, color: 'text-yellow-500' },
//   ];

//   useEffect(() => {
//     let interval;
//     if (isLogoHovered) {
//       interval = setInterval(() => {
//         const newIcon = {
//           id:       Date.now(),
//           ...iconPool[Math.floor(Math.random() * iconPool.length)],
//           x:        (Math.random() - 0.5) * 200 + 'px',
//           y:        (Math.random() - 0.5) * 200 + 'px',
//           rotation: Math.random() * 360 + 'deg',
//         };
//         setBurstIcons((prev) => [...prev.slice(-15), newIcon]);
//       }, 150);
//     } else {
//       setBurstIcons([]);
//     }
//     return () => clearInterval(interval);
//   }, [isLogoHovered]);

//   // Desktop action icons
//   const actionIcons = [
//     {
//       icon:    <User size={22} />,
//       label:   isLoggedIn ? (user?.name || 'Account') : 'Account',
//       onClick: handleAccountClick,
//     },
//     { icon: <Heart size={22} />,        label: 'Wishlist', count: displayCount, badge: 'bg-red-600', onClick: handleWishlist },
//     { icon: <ShoppingCart size={22} />, label: 'Cart',     count: cartCount,    badge: 'bg-black',   onClick: () => setIsCartOpen(true) },
//   ];

//   // Desktop bottom nav links
//   const bottomNavLinks = [
//     { label: "Todays' Deal",  path: '/',             icon: <ImageIcon src={dealIcon}         alt="Deal"          animation="animate-swing" /> },
//     { label: 'Just Arrived',  path: '/just-arrived', icon: <ImageIcon src={justarrivedIcon}  alt="Just Arrived"  animation="animate-float" /> },
//     { label: 'Sale',          path: '/sale',          icon: <ImageIcon src={saleIcon}         alt="Sale"          animation="animate-flicker" /> },
//     { label: 'Coupons',       path: '/coupons',       icon: <ImageIcon src={coupanIcon}       alt="Coupons"       animation="animate-bounce-soft" /> },
//     { label: 'Customer Care', path: '/customer-care', icon: <ImageIcon src={customercareIcon} alt="Customer Care" animation="animate-tilt" /> },
//   ];

//   // Mobile sidebar categories
//   const mobileCategories = [
//     'Smart Life', 'Home & Kitchen', 'Fashion', 'Sports',
//     'Travel', 'Stationary', 'Baby Items', 'Car Accessories',
//   ];

//   // =========================================================================
//   return (
//     <>
//       {/* ── Top Info Bar — desktop only ── */}
//       <div className="bg-black text-white py-3 px-4 hidden lg:block border-b border-white/10">
//         <div className="container mx-auto flex justify-between text-[11px] font-bold uppercase tracking-wider">
//           <div className="flex items-center gap-8">
//             <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//               <Phone size={12} className="text-[#F7A221] group-hover:animate-shake" /> +91 93200 01717
//             </span>
//             <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//               <Mail size={12} className="text-[#F7A221] group-hover:scale-110" /> support@offerwale.com
//             </span>
//           </div>
//           <div className="flex items-center gap-4">
//             <Clock size={12} className="text-[#F7A221] animate-pulse" />
//             <span className="text-white/90">Pan India Delivery • 24/7 Support</span>
//           </div>
//         </div>
//       </div>

//       <header className="bg-white sticky top-0 z-50 shadow-lg">
//         <div className="container mx-auto px-4">

//           {/* ================================================================
//               MOBILE LAYOUT  (lg:hidden)
//               ▸ Only Logo (left) + Hamburger (right) visible
//               ▸ Search bar, User icon, Cart icon → completely removed
//               ▸ All those actions are in MobileBottomNav instead
//           ================================================================= */}
//           <div className="lg:hidden">
//             <div className="flex items-center justify-between py-3">

//               {/* Logo */}
//               <Link
//                 to="/"
//                 className="relative flex items-center justify-center group"
//                 onMouseEnter={() => setIsLogoHovered(true)}
//                 onMouseLeave={() => setIsLogoHovered(false)}
//               >
//                 {burstIcons.map((item) => (
//                   <div
//                     key={item.id}
//                     className={`absolute z-[-1] ${item.color} animate-flush-continuous`}
//                     style={{
//                       '--target-x':   item.x,
//                       '--target-y':   item.y,
//                       '--target-rot': item.rotation,
//                     }}
//                   >
//                     {item.icon}
//                   </div>
//                 ))}
//                 <img
//                   className="relative z-10 object-contain w-[110px] h-auto transition-transform duration-300 group-hover:scale-105"
//                   src={logo}
//                   alt="Offer Wale Baba"
//                 />
//               </Link>

//               {/* Hamburger — the only right-side element on mobile */}
//               <div className="relative flex items-center z-100">
//                 <button
//                   onClick={() => setIsMenuOpen(true)}
//                   className="flex flex-col items-center cursor-pointer group bg-transparent border-0 p-0"
//                   aria-label="Open menu"
//                 >
//                   <div className="p-2.5 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-[#F7A221]/20 group-hover:to-orange-100 transition-all duration-300 shadow-sm group-hover:shadow-md">
//                     <Menu size={22} className="text-gray-700 group-hover:text-[#F7A221] transition-colors" />
//                   </div>
//                   <span className="text-[9px] font-bold mt-0.5 text-gray-600">Menu</span>
//                 </button>

//                 {/* Account dropdown triggered from MobileBottomNav account tap */}
//                 {isLoggedIn && isAccountDropdownOpen && (
//                   <UserAccountDropdown
//                     user={user}
//                     onLogout={handleLogout}
//                     onClose={() => setIsAccountDropdownOpen(false)}
//                   />
//                 )}
//               </div>
//             </div>
//           </div>
//           {/* END MOBILE LAYOUT */}

//           {/* ================================================================
//               DESKTOP LAYOUT  (hidden below lg)
//           ================================================================= */}
//           <div className="hidden lg:flex items-center justify-between gap-2 md:gap-8 h-30 md:h-24">

//             {/* Logo */}
//             <div className="flex items-center gap-2">
//               <Link
//                 to="/"
//                 className="relative flex-shrink-0 flex items-center justify-center p-1 group"
//                 onMouseEnter={() => setIsLogoHovered(true)}
//                 onMouseLeave={() => setIsLogoHovered(false)}
//               >
//                 {burstIcons.map((item) => (
//                   <div
//                     key={item.id}
//                     className={`absolute z-[-1] ${item.color} animate-flush-continuous`}
//                     style={{
//                       '--target-x':   item.x,
//                       '--target-y':   item.y,
//                       '--target-rot': item.rotation,
//                     }}
//                   >
//                     {item.icon}
//                   </div>
//                 ))}
//                 <img
//                   style={{ margin: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '75px' }}
//                   className="relative z-10 object-contain transition-transform duration-500 w-[180px] h-full flex justify-center items-center"
//                   src={logo}
//                   alt="Logo"
//                 />
//               </Link>
//             </div>

//             {/* Location — xl+ */}
//             <LocationDisplay isLoggedIn={isLoggedIn} userAddress={userAddress} />

//             {/* Search Bar */}
//             <div className="flex-1 max-w-xl relative">
//               <input
//                 ref={desktopSearchRef}
//                 type="text"
//                 placeholder="Search products, brands and more..."
//                 className="w-full py-3.5 px-14 rounded-2xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-[#F7A221] focus:bg-white transition-all font-bold text-sm"
//                 value={searchQuery}
//                 onChange={handleSearchChange}
//               />
//               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//               <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white py-2 px-5 rounded-xl hover:bg-[#F7A221] transition-all shadow-md font-bold text-xs uppercase hover:tracking-widest duration-300">
//                 Search
//               </button>
//             </div>

//             {/* Action Icons */}
//             <div className="flex items-center gap-2 md:gap-4 lg:gap-8 relative">
//               {actionIcons.map((item, idx) => (
//                 <ActionIcon key={idx} item={item} onClick={item.onClick} isLoggedIn={isLoggedIn} />
//               ))}
//               {isLoggedIn && isAccountDropdownOpen && (
//                 <UserAccountDropdown
//                   user={user}
//                   onLogout={handleLogout}
//                   onClose={() => setIsAccountDropdownOpen(false)}
//                 />
//               )}
//             </div>
//           </div>
//           {/* END DESKTOP LAYOUT */}

//         </div>

//         {/* Bottom Desktop Nav */}
//         <nav style={{ width: '55%', margin: 'auto' }} className="shadow-inner hidden lg:block relative">
//           <div className="container mx-auto px-4">
//             <div className="flex items-center justify-center gap-2 py-2">
//               <NavItemWithDropdown
//                 link={{
//                   label: 'All Categories',
//                   path:  '/products',
//                   icon:  <ImageIcon src={homeIcon} alt="Home" animation="animate-bounce-soft" />,
//                 }}
//               />
//               <div className="h-6 w-[1px] bg-white/20 mx-2" />
//               {bottomNavLinks.map((link, idx) => (
//                 <Link
//                   key={idx}
//                   to={link.path}
//                   className="nav-link flex items-center gap-2 hover:bg-white/10 group overflow-hidden"
//                 >
//                   <div className="transition-transform duration-300 group-hover:scale-125">{link.icon}</div>
//                   <span className="font-bold text-black relative z-10">{link.label}</span>
//                 </Link>
//               ))}
//             </div>
//           </div>
//         </nav>
//       </header>

//       {/* ── Mobile Sidebar Overlay ── */}
//       {isMenuOpen && (
//         <div
//           className="fixed inset-0 bg-black/60 z-[1000] lg:hidden backdrop-blur-sm transition-opacity"
//           onClick={() => setIsMenuOpen(false)}
//         >
//           <div
//             className="w-[85%] max-w-[320px] h-full bg-white shadow-2xl animate-slideRight"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-[#F7A221]/5 to-transparent">
//               <div className="flex items-center gap-2">
//                 <Sparkles size={18} className="text-[#F7A221]" />
//                 <span className="text-lg font-black uppercase tracking-tighter text-[#F7A221]">Menu</span>
//               </div>
//               <button
//                 onClick={() => setIsMenuOpen(false)}
//                 className="p-2 bg-white rounded-full shadow-sm text-black hover:rotate-90 transition-transform"
//               >
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="overflow-y-auto h-[calc(100%-80px)]">
//               <div className="p-4 space-y-4">

//                 {isLoggedIn && user && (
//                   <div className="bg-gradient-to-r from-[#F7A221]/15 to-transparent p-4 rounded-2xl mb-4 border border-[#F7A221]/20">
//                     <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Welcome back,</p>
//                     <p className="font-black text-black text-lg">{user?.name || 'User'}</p>
//                     <p className="text-xs text-gray-600 mt-1">{user?.email}</p>
//                   </div>
//                 )}

//                 <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">✨ Quick Links</p>
//                 {bottomNavLinks.map((link, idx) => (
//                   <Link
//                     key={idx}
//                     to={link.path}
//                     onClick={() => setIsMenuOpen(false)}
//                     className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-all font-bold text-sm group"
//                   >
//                     <span className="p-2 bg-gray-50 rounded-lg group-hover:scale-110 transition-transform">{link.icon}</span>
//                     <span className="group-hover:text-[#F7A221]">{link.label}</span>
//                   </Link>
//                 ))}

//                 <div className="pt-4 border-t">
//                   <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">🔥 Top Categories</p>
//                   <div className="grid grid-cols-2 gap-2">
//                     {mobileCategories.map((cat, i) => (
//                       <div
//                         key={i}
//                         className="p-3 bg-gray-50 rounded-xl text-[11px] font-bold text-center border border-gray-100 text-gray-800 hover:border-[#F7A221] hover:bg-orange-50 transition-all cursor-pointer"
//                       >
//                         {cat}
//                       </div>
//                     ))}
//                   </div>
//                 </div>

//                 <div className="pt-6">
//                   <div className="bg-gradient-to-r from-black to-gray-900 rounded-2xl p-4 text-white">
//                     <p className="text-[10px] font-bold opacity-60 uppercase mb-2 flex items-center gap-1">
//                       <HeadphonesIcon size={10} /> Need Help?
//                     </p>
//                     <div className="flex flex-col gap-1">
//                       <p className="text-sm font-black">+91 93200 01717</p>
//                       <p className="text-[11px] opacity-80">support@offerwale.com</p>
//                     </div>
//                   </div>
//                 </div>

//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Cart Sidebar */}
//       <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

//       {/* Wishlist Sidebar */}
//       <WishlistSidebar isOpen={isWishCartOpen} onClose={() => setIsWishCartOpen(false)} />

//       {/* ── Mobile Floating Bottom Nav (lg:hidden handled inside MobileBottomNav) ── */}
//     <MobileBottomNav
//   wishlistCount={displayCount}
//   cartCount={cartCount}
//   isLoggedIn={isLoggedIn}
//   onWishlist={handleWishlist}
//   // onCart={() => setIsCartOpen(true)}
//   onCart={() => setIsCartOpen(prev => !prev)}
//   onAccount={handleAccountClick}
//   onSearch={handleSearchFocus}
//   onHome={() => navigate('/')}
// />

//       {/* ── Global Styles ── */}
//       <style jsx>{`
//         .nav-link {
//           padding: 10px 18px;
//           font-size: 12px;
//           font-weight: 800;
//           text-transform: uppercase;
//           border-radius: 12px;
//           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//           letter-spacing: 0.03em;
//           color: #000000 !important;
//         }
//         .nav-link:hover {
//           background: rgba(247, 162, 33, 0.1);
//           transform: translateY(-2px);
//         }

//         @keyframes slideRight {
//           from { transform: translateX(-100%); }
//           to   { transform: translateX(0); }
//         }
//         .animate-slideRight { animation: slideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

//         @keyframes swing {
//           0%   { transform: rotate(0deg); }
//           20%  { transform: rotate(15deg); }
//           40%  { transform: rotate(-10deg); }
//           60%  { transform: rotate(5deg); }
//           80%  { transform: rotate(-5deg); }
//           100% { transform: rotate(0deg); }
//         }
//         .animate-swing { animation: swing 2.5s ease-in-out infinite; transform-origin: top center; }

//         @keyframes flicker {
//           0%, 100% { transform: scale(1); opacity: 1; }
//           50%      { transform: scale(1.15); opacity: 0.9; }
//           70%      { transform: scale(1.05); opacity: 1; }
//         }
//         .animate-flicker { animation: flicker 1s ease-in-out infinite; }

//         @keyframes float {
//           0%, 100% { transform: translateY(0); }
//           50%      { transform: translateY(-4px); }
//         }
//         .animate-float { animation: float 3s ease-in-out infinite; }

//         @keyframes bounce-soft {
//           0%, 100% { transform: translateY(0); }
//           50%      { transform: translateY(-3px); }
//         }
//         .animate-bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }

//         @keyframes tilt {
//           0%, 100% { transform: rotate(0deg); }
//           50%      { transform: rotate(10deg); }
//         }
//         .animate-tilt { animation: tilt 3s ease-in-out infinite; }

//         @keyframes shake {
//           0%, 100% { transform: translateX(0); }
//           25%      { transform: translateX(-2px); }
//           75%      { transform: translateX(2px); }
//         }
//         .animate-shake { animation: shake 0.5s ease-in-out infinite; }

//         @keyframes slideDown {
//           from { opacity: 0; transform: translateY(-15px); }
//           to   { opacity: 1; transform: translateY(0); }
//         }
//         .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

//         @keyframes flush-continuous {
//           0% {
//             transform: translate(0, 0) scale(0.5) rotate(0deg);
//             opacity: 0;
//           }
//           20% { opacity: 1; }
//           100% {
//             transform: translate(var(--target-x), var(--target-y)) scale(1.2) rotate(var(--target-rot));
//             opacity: 0;
//           }
//         }
//         .animate-flush-continuous {
//           pointer-events: none;
//           animation: flush-continuous 1s ease-out forwards;
//         }

//         .scrollbar-hide::-webkit-scrollbar { display: none; }
//         .scrollbar-hide {
//           -ms-overflow-style: none;
//           scrollbar-width: none;
//         }
//       `}</style>
//     </>
//   );
// };

// export default memo(Navbar);



// code is working but dont have address upside code have 
// import React, { useCallback, memo, useState, useRef, useEffect } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { forceLogout } from '../REDUX_FEATURES/REDUX_SLICES/authSlice';
// import {
//   selectWishlistCount,
//   selectWishlistGuestItems,
// } from '../REDUX_FEATURES/REDUX_SLICES/userWishlistSlice';
// import { selectDisplayCartCount } from '../REDUX_FEATURES/REDUX_SLICES/userCartSlice';
// import CartSidebar from './CartSidebar'
// import {
//     Search, User, Heart, ShoppingCart, Menu, X, Phone, Mail, Clock,
//     ChevronRight, Home, Flame, Package, Tag, Ticket, HeadphonesIcon,
//     Smartphone, ChefHat, Shirt, Dumbbell, Plane, Book, Baby, Car, Box, Gift,
//     MapPin, LogOut, UserCircle, Settings, Sparkles, TrendingUp, Star, Zap
// } from 'lucide-react';
// import { Link, useNavigate } from 'react-router-dom';
// import logo from "../../assets/logo2.png";
// import homeIcon from "../../assets/home (2).png";
// import justarrivedIcon from "../../assets/just-arrived (1).png";
// import dealIcon from "../../assets/deal.png";
// import saleIcon from "../../assets/sale.png";
// import coupanIcon from "../../assets/coupon.png";
// import customercareIcon from "../../assets/service.png";
// import discountBannerIcon from "../../assets/discount-voucher.png"
// import WishlistSidebar from './WishlistSidebar';

// // --- Sub-Components ---

// const ActionIcon = memo(({ item, onClick, isLoggedIn }) => (
//     <div 
//         onClick={onClick}
//         className="flex flex-col items-center cursor-pointer relative group text-black hover:text-[#F7A221] transition-colors min-w-[50px]"
//     >
//         <div className="p-1 md:p-2 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
//             {item.icon}
//         </div>
//         {item.count !== undefined && (
//             <span className={`absolute top-0 right-1 md:top-1 md:right-2 ${item.badge} text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm group-hover:animate-bounce`}>
//                 {item.count}
//             </span>
//         )}
//         <span className="text-[9px] md:text-[10px] mt-0.5 font-bold uppercase tracking-tighter whitespace-nowrap">
//             {item.label}
//         </span>
//     </div>
// ));

// // User Account Dropdown Component
// const UserAccountDropdown = ({ user, onLogout, onClose }) => {
//     const navigate = useNavigate();
//     const dropdownRef = useRef(null);

//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//                 onClose();
//             }
//         };
//         document.addEventListener('mousedown', handleClickOutside);
//         return () => document.removeEventListener('mousedown', handleClickOutside);
//     }, [onClose]);

//     const menuItems = [
//         { icon: <UserCircle size={16} />, label: 'My Profile', path: '/account' },
//         { icon: <Heart size={16} />, label: 'My Wishlist', path: '/account/userwishlist' },
//         { icon: <ShoppingCart size={16} />, label: 'My Orders', path: '/account/userorders' },
//     ];

//     return (
//         <div 
//             ref={dropdownRef}
//             className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-slideDown"
//         >
//             <div className="bg-gradient-to-r from-[#F7A221]/10 to-transparent p-4 border-b">
//                 <p className="text-xs text-gray-500 mb-1">Welcome back,</p>
//                 <p className="font-black text-black text-lg truncate">
//                     {user?.name || user?.email}
//                 </p>
//                 <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
//             </div>
//             <div className="py-2">
//                 {menuItems.map((item, index) => (
//                     <button
//                         key={index}
//                         onClick={() => {
//                             navigate(item.path);
//                             onClose();
//                         }}
//                         className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50 transition-colors text-left group"
//                     >
//                         <span className="text-gray-500 group-hover:text-[#F7A221] transition-colors">
//                             {item.icon}
//                         </span>
//                         <span className="text-sm font-bold text-gray-700 group-hover:text-black">
//                             {item.label}
//                         </span>
//                     </button>
//                 ))}
//             </div>
//             <div className="border-t p-2">
//                 <button
//                     onClick={() => {
//                         onLogout();
//                         onClose();
//                     }}
//                     className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors rounded-xl text-left group"
//                 >
//                     <LogOut size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
//                     <span className="text-sm font-bold text-red-600">Logout</span>
//                 </button>
//             </div>
//         </div>
//     );
// };

// const MegaDropdown = ({ isOpen }) => {
//     if (!isOpen) return null;

//     const categories = [
//         { label: "Smart Life Gadgets", icon: <Smartphone size={18} className="text-blue-600" /> },
//         { label: "Home & Kitchen", icon: <ChefHat size={18} className="text-red-600" /> },
//         { label: "Fashion World", icon: <Shirt size={18} className="text-[#F7A221]" /> },
//         { label: "Sports & Fitness", icon: <Dumbbell size={18} className="text-blue-600" /> },
//         { label: "Tours & Travels", icon: <Plane size={18} className="text-[#F7A221]" /> },
//         { label: "Stationary", icon: <Book size={18} className="text-red-600" /> },
//         { label: "Baby Items", icon: <Baby size={18} className="text-blue-600" /> },
//         { label: "Car Accessories", icon: <Car size={18} className="text-[#F7A221]" /> },
//         { label: "Mix Items Daily use", icon: <Box size={18} className="text-red-600" /> },
//         { label: "Gifts", icon: <Gift size={18} className="text-blue-600" /> }
//     ];

//     return (
//         <div className="absolute top-[100%] left-0 w-full bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border-t-2 border-[#F7A221] animate-slideDown z-50 hidden lg:block">
//             <div className="container mx-auto px-4 py-10">
//                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
//                     {categories.map((category, index) => (
//                         <a
//                             key={index}
//                             href="#"
//                             style={{ alignItems: "center" }}
//                             className="flex items-center gap-4 p-4 rounded-2xl hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100 shadow-sm min-w-0"
//                         >
//                             <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 group-hover:shadow-md group-hover:rotate-3 transition-all duration-300">
//                                 {category.icon}
//                             </div>
//                             <span style={{ fontSize: "14px" }} className="font-bold text-black group-hover:text-[#F7A221] transition-colors text-[10px] md:text-[12px] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
//                                 {category.label}
//                             </span>
//                         </a>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// };

// const NavItemWithDropdown = ({ link }) => {
//     const [isOpen, setIsOpen] = useState(false);

//     return (
//         <div
//             className="static"
//             onMouseEnter={() => setIsOpen(true)}
//             onMouseLeave={() => setIsOpen(false)}
//         >
//             <div className="nav-link flex items-center gap-2 group cursor-pointer">
//                 <div className={`transition-all duration-300 ${isOpen ? 'scale-110 rotate-12' : ''}`}>
//                     {link.icon}
//                 </div>
//                 <span className="font-bold text-black group-hover:text-black transition-colors">{link.label}</span>
//                 <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-black' : 'text-white/70'}`} />
//             </div>
//             <MegaDropdown isOpen={isOpen} />
//         </div>
//     );
// };

// const ImageIcon = ({ src, alt, className = "", animation = "animate-bounce-soft" }) => (
//     <img 
//         src={src} 
//         alt={alt} 
//         className={`w-[30px] h-[30px] object-contain ${animation} ${className}`}
//         style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
//     />
// );

// const Navbar = ({ searchQuery, setSearchQuery, isMenuOpen, setIsMenuOpen, isLoggedIn, user, onOpenAuth }) => {
//     const dispatch = useDispatch();
//     const navigate = useNavigate();
//     const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
//     const [isLogoHovered, setIsLogoHovered] = useState(false);
//     const [burstIcons, setBurstIcons] = useState([]);
//     const wishlistCount  = useSelector(selectWishlistCount);
//     const guestItems     = useSelector(selectWishlistGuestItems);
//     const cartCount      = useSelector(selectDisplayCartCount);
//     const [isCartOpen, setIsCartOpen] = useState(false);
//     const [isWishCartOpen, setIsWishCartOpen] = useState(false);
//     const displayCount = isLoggedIn ? wishlistCount : guestItems.length;

//     const handleSearchChange = useCallback((e) => {
//         setSearchQuery(e.target.value);
//     }, [setSearchQuery]);

//     const handleLogout = async () => {
//         await dispatch(forceLogout());
//         setIsAccountDropdownOpen(false);
//     };

//     const handleAccountClick = () => {
//         if (isLoggedIn) {
//             setIsAccountDropdownOpen(!isAccountDropdownOpen);
//         } else {
//             onOpenAuth();
//         }
//     };

//     const HandlWishlist = () => {
//         if (isLoggedIn) {
//             navigate('/account/userwishlist');
//         } else {
//             setIsWishCartOpen(true);
//         }
//     };
    
//     useEffect(() => {
//         let interval;
//         if (isLogoHovered) {
//             interval = setInterval(() => {
//                 const newIcon = {
//                     id: Date.now(),
//                     ...iconPool[Math.floor(Math.random() * iconPool.length)],
//                     x: (Math.random() - 0.5) * 200 + "px",
//                     y: (Math.random() - 0.5) * 200 + "px",
//                     rotation: Math.random() * 360 + "deg"
//                 };
//                 setBurstIcons((prev) => [...prev.slice(-15), newIcon]);
//             }, 150);
//         } else {
//             setBurstIcons([]);
//         }
//         return () => clearInterval(interval);
//     }, [isLogoHovered]);

//     const iconPool = [
//         { icon: <Smartphone size={18} />, color: "text-blue-500" },
//         { icon: <Shirt size={18} />, color: "text-orange-500" },
//         { icon: <Dumbbell size={18} />, color: "text-green-500" },
//         { icon: <Package size={18} />, color: "text-purple-500" },
//         { icon: <Baby size={18} />, color: "text-pink-500" },
//         { icon: <ChefHat size={18} />, color: "text-red-500" },
//         { icon: <Car size={18} />, color: "text-gray-600" },
//         { icon: <HeadphonesIcon size={18} />, color: "text-yellow-500" }
//     ];
    
//     const actionIcons = [
//         { 
//             icon: <User size={22} />, 
//             label: isLoggedIn ? (user?.name || "Account") : "Account",
//             onClick: handleAccountClick
//         },
//         { icon: <Heart size={22} />, label: "Wishlist", count: displayCount, badge: "bg-red-600", onClick: HandlWishlist },
//         { icon: <ShoppingCart size={22} />, label: "Cart", count: cartCount, badge: "bg-black", onClick: () => setIsCartOpen(true) }
//     ];

//     const bottomNavLinks = [
//         {
//             label: "Todays' Deal",
//             path: "/",
//             icon: <ImageIcon src={dealIcon} alt="Deal" animation="animate-swing" />
//         },
//         {
//             label: "Just Arrived",
//             path: "/",
//             icon: <ImageIcon src={justarrivedIcon} alt="Just Arrived" animation="animate-float" />
//         },
//         {
//             label: "Sale",
//             path: "/",
//             icon: <ImageIcon src={saleIcon} alt="Sale" animation="animate-flicker" />
//         },
//         {
//             label: "Coupons",
//             path: "/",
//             icon: <ImageIcon src={coupanIcon} alt="Coupons" animation="animate-bounce-soft" />
//         },
//         {
//             label: "Customer Care",
//             path: "/customer-care",
//             icon: <ImageIcon src={customercareIcon} alt="Customer Care" animation="animate-tilt" />
//         }
//     ];

//     const mobileCategories = [
//         "Smart Life", "Home & Kitchen", "Fashion", "Sports", "Travel", "Stationary", "Baby Items", "Car Accessories"
//     ];

//     return (
//         <>
//             {/* Top Info Bar — desktop only, untouched */}
//             <div className="bg-black text-white py-3 px-4 hidden lg:block border-b border-white/10">
//                 <div className="container mx-auto flex justify-between text-[11px] font-bold uppercase tracking-wider">
//                     <div className="flex items-center gap-8">
//                         <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//                             <Phone size={12} className="text-[#F7A221] group-hover:animate-shake" /> +91 93200 01717
//                         </span>
//                         <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//                             <Mail size={12} className="text-[#F7A221] group-hover:scale-110" /> support@offerwale.com
//                         </span>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <Clock size={12} className="text-[#F7A221] animate-pulse" /> <span className="text-white/90">Pan India Delivery • 24/7 Support</span>
//                     </div>
//                 </div>
//             </div>

//             <header className="bg-white sticky top-0 z-50 shadow-lg">
//                 <div className="container mx-auto px-4">

//                     {/* ============================================
//                         🎨 MOBILE LAYOUT (lg:hidden) — NEW PREMIUM STYLE
//                         ============================================
//                         Structure:
//                         Row 1: [Logo] + [User] [Cart] [☰] — all in one row
//                         Row 2: [——— Full Width Search Bar ———]
                        
//                         DESIGN FEATURES:
//                         - Gradient background on hover effects
//                         - Rounded glass-morphism search bar
//                         - Animated icons with micro-interactions
//                         - Premium shadow and depth
//                     */}
//                     <div className="lg:hidden">
//                         {/* ROW 1: Logo + Icons in one row */}
//                         <div className="flex items-center justify-between py-3 border-b border-gray-100">
//                             {/* Logo Section */}
//                             <Link
//                                 to="/"
//                                 className="relative flex items-center justify-center group"
//                                 onMouseEnter={() => setIsLogoHovered(true)}
//                                 onMouseLeave={() => setIsLogoHovered(false)}
//                             >
//                                 {burstIcons.map((item) => (
//                                     <div
//                                         key={item.id}
//                                         className={`absolute z-[-1] ${item.color} animate-flush-continuous`}
//                                         style={{
//                                             '--target-x': item.x,
//                                             '--target-y': item.y,
//                                             '--target-rot': item.rotation
//                                         }}
//                                     >
//                                         {item.icon}
//                                     </div>
//                                 ))}
//                                 <img
//                                     className="relative z-10 object-contain w-[100px] h-auto transition-transform duration-300 group-hover:scale-105"
//                                     src={logo}
//                                     alt="Offer Wale Baba"
//                                 />
                            
//                             </Link>

//                             {/* Right Icons Group — User, Cart, Menu */}
//                             <div className="flex items-center gap-3 relative">
//                                 {/* User Icon with Premium Ring */}
//                                 <div
//                                     onClick={handleAccountClick}
//                                     className="relative flex flex-col items-center cursor-pointer group"
//                                 >
//                                     <div className="p-2 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-[#F7A221]/20 group-hover:to-orange-100 transition-all duration-300 shadow-sm group-hover:shadow-md">
//                                         <User size={20} className="text-gray-700 group-hover:text-[#F7A221] transition-colors" />
//                                     </div>
//                                     <span className="text-[9px] font-bold mt-0.5 text-gray-600 group-hover:text-[#F7A221]">
//                                         {isLoggedIn ? (user?.name?.split(' ')[0]?.slice(0, 6) || "Hi") : "Login"}
//                                     </span>
//                                     {isLoggedIn && (
//                                         <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
//                                     )}
//                                 </div>

//                                 {/* Cart Icon with Premium Animation */}
//                                 <div
//                                     onClick={() => setIsCartOpen(true)}
//                                     className="relative flex flex-col items-center cursor-pointer group"
//                                 >
//                                     <div className="p-2 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-[#F7A221]/20 group-hover:to-orange-100 transition-all duration-300 shadow-sm group-hover:shadow-md">
//                                         <ShoppingCart size={20} className="text-gray-700 group-hover:text-[#F7A221] transition-colors" />
//                                     </div>
//                                     {cartCount > 0 && (
//                                         <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-md animate-bounce">
//                                             {cartCount > 99 ? '99+' : cartCount}
//                                         </span>
//                                     )}
//                                     <span className="text-[9px] font-bold mt-0.5 text-gray-600">Cart</span>
//                                 </div>

//                                 {/* Menu Icon with Premium Style */}
//                                 <button
//                                     onClick={() => setIsMenuOpen(true)}
//                                     className="flex flex-col items-center cursor-pointer group bg-transparent border-0 p-0"
//                                 >
//                                     <div className="p-2 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-[#F7A221]/20 group-hover:to-orange-100 transition-all duration-300 shadow-sm group-hover:shadow-md">
//                                         <Menu size={20} className="text-gray-700 group-hover:text-[#F7A221] transition-colors" />
//                                     </div>
//                                     <span className="text-[9px] font-bold mt-0.5 text-gray-600">Menu</span>
//                                 </button>

//                                 {/* Account Dropdown — mobile */}
//                                 {isLoggedIn && isAccountDropdownOpen && (
//                                     <UserAccountDropdown 
//                                         user={user}
//                                         onLogout={handleLogout}
//                                         onClose={() => setIsAccountDropdownOpen(false)}
//                                     />
//                                 )}
//                             </div>
//                         </div>

//                         {/* ROW 2: Premium Search Bar — Full Width */}
//                         <div className="py-3">
//                             <div className="relative group">
//                                 {/* Animated gradient border on focus */}
//                                 <div className="absolute -inset-0.5 bg-gradient-to-r from-[#F7A221] via-orange-400 to-[#F7A221] rounded-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-500 blur-sm"></div>
//                                 <div className="relative">
//                                     <input
//                                         type="text"
//                                         placeholder="Search 10,000+ products..."
//                                         className="w-full py-3.5 pl-12 pr-12 rounded-2xl text-black focus:outline-none bg-gray-100 border border-gray-200 focus:border-[#F7A221] focus:bg-white transition-all font-medium text-sm"
//                                         value={searchQuery}
//                                         onChange={handleSearchChange}
//                                     />
//                                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#F7A221] transition-colors" size={18} />
                                    
//                                     {/* Trending badge — optional */}
//                                     <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
//                                         <TrendingUp size={12} className="text-gray-400" />
//                                         <span className="text-[9px] text-gray-400 hidden xs:inline">Trending</span>
//                                     </div>
//                                 </div>
//                             </div>
                            
//                         </div>
//                     </div>

//                     {/* ============================================
//                         DESKTOP LAYOUT (hidden on mobile) — UNTOUCHED
//                         ============================================ */}
//                     <div className="hidden lg:flex items-center justify-between gap-2 md:gap-8 h-30 md:h-24">

//                         {/* Logo & Mobile Menu Toggle — desktop */}
//                         <div className="flex items-center gap-2">
//                             <Link
//                                 to="/"
//                                 className="relative flex-shrink-0 flex items-center justify-center p-1 group"
//                                 onMouseEnter={() => setIsLogoHovered(true)}
//                                 onMouseLeave={() => setIsLogoHovered(false)}
//                             >
//                                 {burstIcons.map((item) => (
//                                     <div
//                                         key={item.id}
//                                         className={`absolute z-[-1] ${item.color} animate-flush-continuous`}
//                                         style={{
//                                             '--target-x': item.x,
//                                             '--target-y': item.y,
//                                             '--target-rot': item.rotation
//                                         }}
//                                     >
//                                         {item.icon}
//                                     </div>
//                                 ))}
//                                 <img
//                                     style={{ margin: "auto", display: "flex", justifyContent: "center", alignItems: "center", marginTop: "75px" }}
//                                     className="relative z-10 object-contain transition-transform duration-500 w-[180px] h-full flex justify-center items-center"
//                                     src={logo}
//                                     alt="Logo"
//                                 />
//                             </Link>
//                         </div>

//                         {/* Location - Desktop Only */}
//                         <div className="hidden xl:flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-all border border-transparent hover:border-gray-100 group">
//                             <MapPin size={22} className="text-red-600 animate-bounce" />
//                             <div className="flex flex-col">
//                                 <span className="text-[10px] text-gray-500 font-bold uppercase leading-none">Deliver to</span>
//                                 <span className="text-sm text-gray-900 leading-tight">Mumbai 421004</span>
//                             </div>
//                         </div>

//                         {/* Search Bar - Desktop */}
//                         <div className="flex-1 max-w-xl relative">
//                             <input
//                                 type="text"
//                                 placeholder="Search products, brands and more..."
//                                 className="w-full py-3.5 px-14 rounded-2xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-[#F7A221] focus:bg-white transition-all font-bold text-sm"
//                                 value={searchQuery}
//                                 onChange={handleSearchChange}
//                             />
//                             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//                             <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white py-2 px-5 rounded-xl hover:bg-[#F7A221] transition-all shadow-md font-bold text-xs uppercase hover:tracking-widest duration-300">
//                                 Search
//                             </button>
//                         </div>

//                         {/* Action Icons - Desktop */}
//                         <div className="flex items-center gap-2 md:gap-4 lg:gap-8 relative">
//                             {actionIcons.map((item, idx) => (
//                                 <ActionIcon 
//                                     key={idx} 
//                                     item={item} 
//                                     onClick={item.onClick}
//                                     isLoggedIn={isLoggedIn}
//                                 />
//                             ))}
//                             {isLoggedIn && isAccountDropdownOpen && (
//                                 <UserAccountDropdown 
//                                     user={user}
//                                     onLogout={handleLogout}
//                                     onClose={() => setIsAccountDropdownOpen(false)}
//                                 />
//                             )}
//                         </div>
//                     </div>

//                 </div>
                                
//                 {/* Bottom Desktop Nav — untouched */}
//                 <nav style={{ width: "55%", margin: "auto" }} className="shadow-inner hidden lg:block relative">
//                     <div className="container mx-auto px-4">
//                         <div className="flex items-center justify-center gap-2 py-2">
//                             <NavItemWithDropdown
//                                 link={{ label: "All Categories", path: "/products", icon: <ImageIcon src={homeIcon} alt="Home" animation="animate-bounce-soft" /> }}
//                             />
//                             <div className="h-6 w-[1px] bg-white/20 mx-2"></div>
//                             {bottomNavLinks.map((link, idx) => (
//                                 <Link
//                                     key={idx}
//                                     to={link.path}
//                                     className="nav-link flex items-center gap-2 hover:bg-white/10 group overflow-hidden"
//                                 >
//                                     <div className="transition-transform duration-300 group-hover:scale-125">
//                                         {link.icon}
//                                     </div>
//                                     <span className="font-bold text-black relative z-10">{link.label}</span>
//                                 </Link>
//                             ))}
//                         </div>
//                     </div>
//                 </nav>
//             </header>

//             {/* Mobile Sidebar Overlay — untouched */}
//             {isMenuOpen && (
//                 <div className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}>
//                     <div className="w-[85%] max-w-[320px] h-full bg-white shadow-2xl animate-slideRight" onClick={(e) => e.stopPropagation()}>
//                         <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-[#F7A221]/5 to-transparent">
//                             <div className="flex items-center gap-2">
//                                 <Sparkles size={18} className="text-[#F7A221]" />
//                                 <span className="text-lg font-black uppercase tracking-tighter text-[#F7A221]">Menu</span>
//                             </div>
//                             <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white rounded-full shadow-sm text-black hover:rotate-90 transition-transform">
//                                 <X size={20} />
//                             </button>
//                         </div>
//                         <div className="overflow-y-auto h-[calc(100%-80px)]">
//                             <div className="p-4 space-y-4">
//                                 {isLoggedIn && user && (
//                                     <div className="bg-gradient-to-r from-[#F7A221]/15 to-transparent p-4 rounded-2xl mb-4 border border-[#F7A221]/20">
//                                         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Welcome back,</p>
//                                         <p className="font-black text-black text-lg">{user?.name || "User"}</p>
//                                         <p className="text-xs text-gray-600 mt-1">{user?.email}</p>
//                                     </div>
//                                 )}
//                                 <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">✨ Quick Links</p>
//                                 {bottomNavLinks.map((link, idx) => (
//                                     <Link key={idx} to={link.path} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-all font-bold text-sm group">
//                                         <span className="p-2 bg-gray-50 rounded-lg group-hover:scale-110 transition-transform">{link.icon}</span>
//                                         <span className="group-hover:text-[#F7A221]">{link.label}</span>
//                                     </Link>
//                                 ))}
//                                 <div className="pt-4 border-t">
//                                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">🔥 Top Categories</p>
//                                     <div className="grid grid-cols-2 gap-2">
//                                         {mobileCategories.map((cat, i) => (
//                                             <div key={i} className="p-3 bg-gray-50 rounded-xl text-[11px] font-bold text-center border border-gray-100 text-gray-800 hover:border-[#F7A221] hover:bg-orange-50 transition-all cursor-pointer">
//                                                 {cat}
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </div>
//                                 <div className="pt-6">
//                                     <div className="bg-gradient-to-r from-black to-gray-900 rounded-2xl p-4 text-white">
//                                         <p className="text-[10px] font-bold opacity-60 uppercase mb-2 flex items-center gap-1"><HeadphonesIcon size={10} /> Need Help?</p>
//                                         <div className="flex flex-col gap-1">
//                                             <p className="text-sm font-black">+91 93200 01717</p>
//                                             <p className="text-[11px] opacity-80">support@offerwale.com</p>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Cart Sidebar */}
//             <CartSidebar 
//                 isOpen={isCartOpen} 
//                 onClose={() => setIsCartOpen(false)} 
//             />
//             {/* Wishlist Sidebar */}
//             <WishlistSidebar 
//                 isOpen={isWishCartOpen} 
//                 onClose={() => setIsWishCartOpen(false)} 
//             />

//             <style jsx>{`
//                 .nav-link {
//                     padding: 10px 18px;
//                     font-size: 12px;
//                     font-weight: 800;
//                     text-transform: uppercase;
//                     border-radius: 12px;
//                     transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//                     letter-spacing: 0.03em;
//                     color: #000000 !important;
//                 }
//                 .nav-link:hover {
//                     background: rgba(247, 162, 33, 0.1);
//                     transform: translateY(-2px);
//                 }

//                 @keyframes slideRight {
//                     from { transform: translateX(-100%); }
//                     to { transform: translateX(0); }
//                 }
//                 .animate-slideRight { animation: slideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

//                 @keyframes swing {
//                     0% { transform: rotate(0deg); }
//                     20% { transform: rotate(15deg); }
//                     40% { transform: rotate(-10deg); }
//                     60% { transform: rotate(5deg); }
//                     80% { transform: rotate(-5deg); }
//                     100% { transform: rotate(0deg); }
//                 }
//                 .animate-swing { animation: swing 2.5s ease-in-out infinite; transform-origin: top center; }

//                 @keyframes flicker {
//                     0%, 100% { transform: scale(1); opacity: 1; }
//                     50% { transform: scale(1.15); opacity: 0.9; }
//                     70% { transform: scale(1.05); opacity: 1; }
//                 }
//                 .animate-flicker { animation: flicker 1s ease-in-out infinite; }

//                 @keyframes float {
//                     0%, 100% { transform: translateY(0); }
//                     50% { transform: translateY(-4px); }
//                 }
//                 .animate-float { animation: float 3s ease-in-out infinite; }

//                 @keyframes bounce-soft {
//                     0%, 100% { transform: translateY(0); }
//                     50% { transform: translateY(-3px); }
//                 }
//                 .animate-bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }

//                 @keyframes tilt {
//                     0%, 100% { transform: rotate(0deg); }
//                     50% { transform: rotate(10deg); }
//                 }
//                 .animate-tilt { animation: tilt 3s ease-in-out infinite; }

//                 @keyframes shake {
//                     0%, 100% { transform: translateX(0); }
//                     25% { transform: translateX(-2px); }
//                     75% { transform: translateX(2px); }
//                 }
//                 .animate-shake { animation: shake 0.5s ease-in-out infinite; }

//                 @keyframes slideDown {
//                     from { opacity: 0; transform: translateY(-15px); }
//                     to { opacity: 1; transform: translateY(0); }
//                 }
//                 .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

//                 @keyframes flush-continuous {
//                     0% {
//                         transform: translate(0, 0) scale(0.5) rotate(0deg);
//                         opacity: 0;
//                     }
//                     20% {
//                         opacity: 1;
//                     }
//                     100% {
//                         transform: translate(var(--target-x), var(--target-y)) scale(1.2) rotate(var(--target-rot));
//                         opacity: 0;
//                     }
//                 }
//                 .animate-flush-continuous {
//                     pointer-events: none;
//                     animation: flush-continuous 1s ease-out forwards;
//                 }

//                 /* Hide scrollbar for quick chips */
//                 .scrollbar-hide::-webkit-scrollbar {
//                     display: none;
//                 }
//                 .scrollbar-hide {
//                     -ms-overflow-style: none;
//                     scrollbar-width: none;
//                 }
//             `}</style>
//         </>
//     );
// };

// export default memo(Navbar);

// try to fix the responsive for small screens 
// import React, { useCallback, memo, useState, useRef, useEffect } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { forceLogout } from '../REDUX_FEATURES/REDUX_SLICES/authSlice';
// import {
//   selectWishlistCount,
//   selectWishlistGuestItems,
// } from '../REDUX_FEATURES/REDUX_SLICES/userWishlistSlice';
// import { selectDisplayCartCount } from '../REDUX_FEATURES/REDUX_SLICES/userCartSlice';
// import CartSidebar from './CartSidebar'
// import {
//     Search, User, Heart, ShoppingCart, Menu, X, Phone, Mail, Clock,
//     ChevronRight, Home, Flame, Package, Tag, Ticket, HeadphonesIcon,
//     Smartphone, ChefHat, Shirt, Dumbbell, Plane, Book, Baby, Car, Box, Gift,
//     MapPin, LogOut, UserCircle, Settings
// } from 'lucide-react';
// import { Link, useNavigate } from 'react-router-dom';
// import logo from "../../assets/logo2.png";
// import homeIcon from "../../assets/home (2).png";
// import justarrivedIcon from "../../assets/just-arrived (1).png";
// import dealIcon from "../../assets/deal.png";
// import saleIcon from "../../assets/sale.png";
// import coupanIcon from "../../assets/coupon.png";
// import customercareIcon from "../../assets/service.png";
// import discountBannerIcon from "../../assets/discount-voucher.png"
// import WishlistSidebar from './WishlistSidebar';

// // --- Sub-Components ---

// const ActionIcon = memo(({ item, onClick, isLoggedIn }) => (
//     <div 
//         onClick={onClick}
//         className="flex flex-col items-center cursor-pointer relative group text-black hover:text-[#F7A221] transition-colors min-w-[50px]"
//     >
//         <div className="p-1 md:p-2 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
//             {item.icon}
//         </div>
//         {item.count !== undefined && (
//             <span className={`absolute top-0 right-1 md:top-1 md:right-2 ${item.badge} text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm group-hover:animate-bounce`}>
//                 {item.count}
//             </span>
//         )}
//         <span className="text-[9px] md:text-[10px] mt-0.5 font-bold uppercase tracking-tighter whitespace-nowrap">
//             {item.label}
//         </span>
//     </div>
// ));

// // User Account Dropdown Component
// const UserAccountDropdown = ({ user, onLogout, onClose }) => {
//     const navigate = useNavigate();
//     const dropdownRef = useRef(null);

//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//                 onClose();
//             }
//         };

//         document.addEventListener('mousedown', handleClickOutside);
//         return () => document.removeEventListener('mousedown', handleClickOutside);
//     }, [onClose]);

//     const menuItems = [
//         { icon: <UserCircle size={16} />, label: 'My Profile', path: '/account' },
//         { icon: <Heart size={16} />, label: 'My Wishlist', path: '/account/userwishlist' },
//         { icon: <ShoppingCart size={16} />, label: 'My Orders', path: '/account/userorders' },
//         // { icon: <Settings size={16} />, label: 'Settings', path: '/settings' },
//     ];

//     return (
//         <div 
//             ref={dropdownRef}
//             className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-slideDown"
//         >
//             {/* User Info Header */}
//             <div className="bg-gradient-to-r from-[#F7A221]/10 to-transparent p-4 border-b">
//                 <p className="text-xs text-gray-500 mb-1">Welcome back,</p>
//                 <p className="font-black text-black text-lg truncate">
//                     {user?.name || user?.email}
//                 </p>
//                 <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
//             </div>

//             {/* Menu Items */}
//             <div className="py-2">
//                 {menuItems.map((item, index) => (
//                     <button
//                         key={index}
//                         onClick={() => {
//                             navigate(item.path);
//                             onClose();
//                         }}
//                         className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50 transition-colors text-left group"
//                     >
//                         <span className="text-gray-500 group-hover:text-[#F7A221] transition-colors">
//                             {item.icon}
//                         </span>
//                         <span className="text-sm font-bold text-gray-700 group-hover:text-black">
//                             {item.label}
//                         </span>
//                     </button>
//                 ))}
//             </div>

//             {/* Logout Button */}
//             <div className="border-t p-2">
//                 <button
//                     onClick={() => {
//                         onLogout();
//                         onClose();
//                     }}
//                     className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors rounded-xl text-left group"
//                 >
//                     <LogOut size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
//                     <span className="text-sm font-bold text-red-600">Logout</span>
//                 </button>
//             </div>
//         </div>
//     );
// };

// const MegaDropdown = ({ isOpen }) => {
//     if (!isOpen) return null;

//     const categories = [
//         { label: "Smart Life Gadgets", icon: <Smartphone size={18} className="text-blue-600" /> },
//         { label: "Home & Kitchen", icon: <ChefHat size={18} className="text-red-600" /> },
//         { label: "Fashion World", icon: <Shirt size={18} className="text-[#F7A221]" /> },
//         { label: "Sports & Fitness", icon: <Dumbbell size={18} className="text-blue-600" /> },
//         { label: "Tours & Travels", icon: <Plane size={18} className="text-[#F7A221]" /> },
//         { label: "Stationary", icon: <Book size={18} className="text-red-600" /> },
//         { label: "Baby Items", icon: <Baby size={18} className="text-blue-600" /> },
//         { label: "Car Accessories", icon: <Car size={18} className="text-[#F7A221]" /> },
//         { label: "Mix Items Daily use", icon: <Box size={18} className="text-red-600" /> },
//         { label: "Gifts", icon: <Gift size={18} className="text-blue-600" /> }
//     ];

//     return (
//         <div className="absolute top-[100%] left-0 w-full bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border-t-2 border-[#F7A221] animate-slideDown z-50 hidden lg:block">
//             <div className="container mx-auto px-4 py-10">
//                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
//                     {categories.map((category, index) => (
//                         <a
//                             key={index}
//                             href="#"
//                             style={{ alignItems: "center" }}
//                             className="flex items-center gap-4 p-4 rounded-2xl hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100 shadow-sm min-w-0"
//                         >
//                             <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 group-hover:shadow-md group-hover:rotate-3 transition-all duration-300">
//                                 {category.icon}
//                             </div>
//                             <span style={{ fontSize: "14px" }} className="font-bold text-black group-hover:text-[#F7A221] transition-colors text-[10px] md:text-[12px] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
//                                 {category.label}
//                             </span>
//                         </a>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// };

// const NavItemWithDropdown = ({ link }) => {
//     const [isOpen, setIsOpen] = useState(false);

//     return (
//         <div
//             className="static"
//             onMouseEnter={() => setIsOpen(true)}
//             onMouseLeave={() => setIsOpen(false)}
//         >
//             <div className="nav-link flex items-center gap-2 group cursor-pointer">
//                 <div className={`transition-all duration-300 ${isOpen ? 'scale-110 rotate-12' : ''}`}>
//                     {link.icon}
//                 </div>
//                 <span className="font-bold text-black group-hover:text-black transition-colors">{link.label}</span>
//                 <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-black' : 'text-white/70'}`} />
//             </div>
//             <MegaDropdown isOpen={isOpen} />
//         </div>
//     );
// };

// // Custom Image Icon Component with animations
// const ImageIcon = ({ src, alt, className = "", animation = "animate-bounce-soft" }) => (
//     <img 
//         src={src} 
//         alt={alt} 
//         className={`w-[30px] h-[30px] object-contain ${animation} ${className}`}
//         style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
//     />
// );

// const Navbar = ({ searchQuery, setSearchQuery, isMenuOpen, setIsMenuOpen, isLoggedIn, user, onOpenAuth }) => {
//     const dispatch = useDispatch();
//     const navigate = useNavigate();
//     const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
//     const [isLogoHovered, setIsLogoHovered] = useState(false);
//     const [burstIcons, setBurstIcons] = useState([]);
//     const wishlistCount  = useSelector(selectWishlistCount);
//     const guestItems     = useSelector(selectWishlistGuestItems);
//     const cartCount     = useSelector(selectDisplayCartCount);
//     const [isCartOpen, setIsCartOpen] = useState(false);
//     const [isWishCartOpen, setIsWishCartOpen] = useState(false);
//     // ✅ show DB count if logged in, localStorage count if guest
//   const displayCount = isLoggedIn ? wishlistCount : guestItems.length;
//     const handleSearchChange = useCallback((e) => {
//         setSearchQuery(e.target.value);
//     }, [setSearchQuery]);

//     const handleLogout = async () => {
//         await dispatch(forceLogout());
//         setIsAccountDropdownOpen(false);
//     };

//     const handleAccountClick = () => {
//         if (isLoggedIn) {
//             setIsAccountDropdownOpen(!isAccountDropdownOpen);
//         } else {
//             onOpenAuth();
//         }
//     };

//     // const HandlWishlist =()=>{
//     //     navigate('/account/userwishlist')
//     // }
//     const HandlWishlist = () => {
//     if (isLoggedIn) {
//         navigate('/account/userwishlist');
//     } else {
//         setIsWishCartOpen(true);  // You'll need to create this state
//     }
// };
    
//     useEffect(() => {
//         let interval;
//         if (isLogoHovered) {
//             interval = setInterval(() => {
//                 const newIcon = {
//                     id: Date.now(),
//                     ...iconPool[Math.floor(Math.random() * iconPool.length)],
//                     x: (Math.random() - 0.5) * 200 + "px",
//                     y: (Math.random() - 0.5) * 200 + "px",
//                     rotation: Math.random() * 360 + "deg"
//                 };
//                 setBurstIcons((prev) => [...prev.slice(-15), newIcon]);
//             }, 150);
//         } else {
//             setBurstIcons([]);
//         }
//         return () => clearInterval(interval);
//     }, [isLogoHovered]);

//     const iconPool = [
//         { icon: <Smartphone size={18} />, color: "text-blue-500" },
//         { icon: <Shirt size={18} />, color: "text-orange-500" },
//         { icon: <Dumbbell size={18} />, color: "text-green-500" },
//         { icon: <Package size={18} />, color: "text-purple-500" },
//         { icon: <Baby size={18} />, color: "text-pink-500" },
//         { icon: <ChefHat size={18} />, color: "text-red-500" },
//         { icon: <Car size={18} />, color: "text-gray-600" },
//         { icon: <HeadphonesIcon size={18} />, color: "text-yellow-500" }
//     ];
    
//     const actionIcons = [
//         { 
//             icon: <User size={22} />, 
//             label: isLoggedIn ? (user?.name || "Account") : "Account",
//             onClick: handleAccountClick
//         },
//         { icon: <Heart size={22} />, label: "Wishlist", count: displayCount, badge: "bg-red-600" ,onClick:HandlWishlist },
//         { icon: <ShoppingCart size={22} />, label: "Cart", count: cartCount, badge: "bg-black",onClick: () => setIsCartOpen(true) }
//     ];

//     // Updated bottomNavLinks with PNG images and individual animations
//     const bottomNavLinks = [
//         {
//             label: "Todays' Deal",
//             path: "/",
//             icon: <ImageIcon src={dealIcon} alt="Deal" animation="animate-swing" />
//         },
//         {
//             label: "Just Arrived",
//             path: "/",
//             icon: <ImageIcon src={justarrivedIcon} alt="Just Arrived" animation="animate-float" />
//         },
//         {
//             label: "Sale",
//             path: "/",
//             icon: <ImageIcon src={saleIcon} alt="Sale" animation="animate-flicker" />
//         },
//         {
//             label: "Coupons",
//             path: "/",
//             icon: <ImageIcon src={coupanIcon} alt="Coupons" animation="animate-bounce-soft" />
//         },
//         {
//             label: "Customer Care",
//             path: "/customer-care",
//             icon: <ImageIcon src={customercareIcon} alt="Customer Care" animation="animate-tilt" />
//         }
//     ];

//     const mobileCategories = [
//         "Smart Life", "Home & Kitchen", "Fashion", "Sports", "Travel", "Stationary", "Baby Items", "Car Accessories"
//     ];

//     return (
//         <>
//             {/* Top Info Bar */}
//             <div className="bg-black text-white py-3 px-4 hidden lg:block border-b border-white/10">
//                 <div className="container mx-auto flex justify-between text-[11px] font-bold uppercase tracking-wider">
//                     <div className="flex items-center gap-8">
//                         <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//                             <Phone size={12} className="text-[#F7A221] group-hover:animate-shake" /> +91 93200 01717
//                         </span>
//                         <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//                             <Mail size={12} className="text-[#F7A221] group-hover:scale-110" /> support@offerwale.com
//                         </span>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <Clock size={12} className="text-[#F7A221] animate-pulse" /> <span className="text-white/90">Pan India Delivery • 24/7 Support</span>
//                     </div>
//                 </div>
//             </div>

//             <header className="bg-white sticky top-0 z-50 text-black shadow-md">
//                 <div className="container mx-auto px-4">
//                     <div className="flex items-center justify-between gap-2 md:gap-8 h-30 md:h-24">

//                         {/* Logo & Mobile Menu Toggle */}
//                         <div className="flex items-center gap-2">
//                             <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-2 text-black bg-gray-50 rounded-lg">
//                                 <Menu size={24} />
//                             </button>

//                             {/* Enhanced Logo Section */}
//                             <Link
//                                 to="/"
//                                 className="relative flex-shrink-0 flex items-center justify-center p-1 group"
//                                 onMouseEnter={() => setIsLogoHovered(true)}
//                                 onMouseLeave={() => setIsLogoHovered(false)}
//                             >
//                                 {burstIcons.map((item) => (
//                                     <div
//                                         key={item.id}
//                                         className={`absolute z-[-1] ${item.color} animate-flush-continuous`}
//                                         style={{
//                                             '--target-x': item.x,
//                                             '--target-y': item.y,
//                                             '--target-rot': item.rotation
//                                         }}
//                                     >
//                                         {item.icon}
//                                     </div>
//                                 ))}

//                                 <img
//                                     style={{margin:"auto" , display:"flex" , justifyContent:"center" , alignItems:"center" , marginTop:"75px"}}
//                                     className="relative z-10 object-contain transition-transform duration-500 w-[180px] h-full flex justify-center items-center"
//                                     src={logo}
//                                     alt="Logo"
//                                 />
//                             </Link>
//                         </div>

//                         {/* Location - Desktop Only */}
//                         <div className="hidden xl:flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-all border border-transparent hover:border-gray-100 group">
//                             <MapPin size={22} className="text-red-600 animate-bounce" />
//                             <div className="flex flex-col">
//                                 <span className="text-[10px] text-gray-500 font-bold uppercase leading-none">Deliver to</span>
//                                 <span className="text-sm text-gray-900 leading-tight">Mumbai 421004</span>
//                             </div>
//                         </div>

//                         {/* Search Bar - Hidden on Mobile */}
//                         <div className="flex-1 max-w-xl relative hidden lg:block">
//                             <input
//                                 type="text"
//                                 placeholder="Search products, brands and more..."
//                                 className="w-full py-3.5 px-14 rounded-2xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-[#F7A221] focus:bg-white transition-all font-bold text-sm"
//                                 value={searchQuery}
//                                 onChange={handleSearchChange}
//                             />
//                             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//                             <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white py-2 px-5 rounded-xl hover:bg-[#F7A221] transition-all shadow-md font-bold text-xs uppercase hover:tracking-widest duration-300">
//                                 Search
//                             </button>
//                         </div>

//                         {/* Action Icons - Labels Always Visible */}
//                         <div className="flex items-center gap-2 md:gap-4 lg:gap-8 relative">
//                             {actionIcons.map((item, idx) => (
//                                 <ActionIcon 
//                                     key={idx} 
//                                     item={item} 
//                                     onClick={item.onClick}
//                                     isLoggedIn={isLoggedIn}
//                                 />
//                             ))}
                            
//                             {/* Account Dropdown */}
//                             {isLoggedIn && isAccountDropdownOpen && (
//                                 <UserAccountDropdown 
//                                     user={user}
//                                     onLogout={handleLogout}
//                                     onClose={() => setIsAccountDropdownOpen(false)}
//                                 />
//                             )}
//                         </div>
//                     </div>

//                     {/* Mobile Search Bar */}
//                     <div className="pb-4 lg:hidden">
//                         <div className="relative">
//                             <input
//                                 type="text"
//                                 placeholder="Search products..."
//                                 className="w-full py-3 px-12 rounded-xl text-black focus:outline-none bg-gray-100 border border-gray-200 font-bold text-xs"
//                                 value={searchQuery}
//                                 onChange={handleSearchChange}
//                             />
//                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
//                         </div>
//                     </div>
//                 </div>
                                
//                 {/* Bottom Desktop Nav */}
//                 <nav style={{ width:"55%" ,margin:"auto"}} className="shadow-inner hidden lg:block relative">
//                     <div className="container mx-auto px-4">
//                         <div className="flex items-center justify-center gap-2 py-2">
//                             <NavItemWithDropdown
//                                 link={{ label: "All Categories", path: "/products", icon: <ImageIcon src={homeIcon} alt="Home" animation="animate-bounce-soft" /> }}
//                             />
//                             <div className="h-6 w-[1px] bg-white/20 mx-2"></div>
//                             {bottomNavLinks.map((link, idx) => (
//                                 <Link
//                                     key={idx}
//                                     to={link.path}
//                                     className="nav-link flex items-center gap-2 hover:bg-white/10 group overflow-hidden"
//                                 >
//                                     <div className="transition-transform duration-300 group-hover:scale-125">
//                                         {link.icon}
//                                     </div>
//                                     <span className="font-bold text-black relative z-10">{link.label}</span>
//                                 </Link>
//                             ))}
//                         </div>
//                     </div>
//                 </nav>
//             </header>

//             {/* Mobile Sidebar Overlay */}
//             {isMenuOpen && (
//                 <div className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}>
//                     <div className="w-[85%] max-w-[320px] h-full bg-white shadow-2xl animate-slideRight" onClick={(e) => e.stopPropagation()}>
//                         <div className="p-6 border-b flex justify-between items-center bg-gray-50">
//                             <span className="text-lg font-black uppercase tracking-tighter text-[#F7A221]">Menu</span>
//                             <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white rounded-full shadow-sm text-black hover:rotate-90 transition-transform">
//                                 <X size={20} />
//                             </button>
//                         </div>
//                         <div className="overflow-y-auto h-[calc(100%-80px)]">
//                             <div className="p-4 space-y-4">
//                                 {/* User Info in Mobile Menu if logged in */}
//                                 {isLoggedIn && user && (
//                                     <div className="bg-gradient-to-r from-[#F7A221]/10 to-transparent p-4 rounded-xl mb-4">
//                                         <p className="text-xs text-gray-500">Welcome back,</p>
//                                         <p className="font-black text-black">{user?.name || "User"}</p>
//                                         <p className="text-xs text-gray-600 mt-1">{user?.email}</p>
//                                     </div>
//                                 )}
                                
//                                 <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Shopping</p>
//                                 {bottomNavLinks.map((link, idx) => (
//                                     <Link key={idx} to={link.path} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-colors font-bold text-sm">
//                                         <span className="p-2 bg-gray-50 rounded-lg">{link.icon}</span>
//                                         {link.label}
//                                     </Link>
//                                 ))}

//                                 <div className="pt-4 border-t">
//                                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Top Categories</p>
//                                     <div className="grid grid-cols-2 gap-2">
//                                         {mobileCategories.map((cat, i) => (
//                                             <div key={i} className="p-3 bg-gray-50 rounded-lg text-[11px] font-bold text-center border border-gray-100 text-gray-800">
//                                                 {cat}
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </div>

//                                 <div className="pt-6">
//                                     <div className="bg-black rounded-2xl p-4 text-white">
//                                         <p className="text-[10px] font-bold opacity-60 uppercase mb-2">Need Help?</p>
//                                         <div className="flex flex-col gap-1">
//                                             <p className="text-sm font-black">+91 93200 01717</p>
//                                             <p className="text-[11px] opacity-80">support@offerwale.com</p>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Sidebar Component */}
//             <CartSidebar 
//                 isOpen={isCartOpen} 
//                 onClose={() => setIsCartOpen(false)} 
//             />
//             {/* Sidebar Component */}
//             <WishlistSidebar 
//                 isOpen={isWishCartOpen} 
//                 onClose={() => setIsWishCartOpen(false)} 
//             />


//             <style jsx>{`
//                 .nav-link {
//                     padding: 10px 18px;
//                     font-size: 12px;
//                     font-weight: 800;
//                     text-transform: uppercase;
//                     border-radius: 12px;
//                     transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//                     letter-spacing: 0.03em;
//                     color: #000000 !important;
//                 }
//                 .nav-link:hover {
//                     background: rgba(247, 162, 33, 0.1);
//                     transform: translateY(-2px);
//                 }

//                 @keyframes slideRight {
//                     from { transform: translateX(-100%); }
//                     to { transform: translateX(0); }
//                 }
//                 .animate-slideRight { animation: slideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

//                 @keyframes swing {
//                     0% { transform: rotate(0deg); }
//                     20% { transform: rotate(15deg); }
//                     40% { transform: rotate(-10deg); }
//                     60% { transform: rotate(5deg); }
//                     80% { transform: rotate(-5deg); }
//                     100% { transform: rotate(0deg); }
//                 }
//                 .animate-swing { animation: swing 2.5s ease-in-out infinite; transform-origin: top center; }

//                 @keyframes flicker {
//                     0%, 100% { transform: scale(1); opacity: 1; }
//                     50% { transform: scale(1.15); opacity: 0.9; }
//                     70% { transform: scale(1.05); opacity: 1; }
//                 }
//                 .animate-flicker { animation: flicker 1s ease-in-out infinite; }

//                 @keyframes float {
//                     0%, 100% { transform: translateY(0); }
//                     50% { transform: translateY(-4px); }
//                 }
//                 .animate-float { animation: float 3s ease-in-out infinite; }

//                 @keyframes bounce-soft {
//                     0%, 100% { transform: translateY(0); }
//                     50% { transform: translateY(-3px); }
//                 }
//                 .animate-bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }

//                 @keyframes tilt {
//                     0%, 100% { transform: rotate(0deg); }
//                     50% { transform: rotate(10deg); }
//                 }
//                 .animate-tilt { animation: tilt 3s ease-in-out infinite; }

//                 @keyframes shake {
//                     0%, 100% { transform: translateX(0); }
//                     25% { transform: translateX(-2px); }
//                     75% { transform: translateX(2px); }
//                 }
//                 .animate-shake { animation: shake 0.5s ease-in-out infinite; }

//                 @keyframes slideDown {
//                     from { opacity: 0; transform: translateY(-15px); }
//                     to { opacity: 1; transform: translateY(0); }
//                 }
//                 .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

//                 @keyframes flush-continuous {
//                     0% {
//                         transform: translate(0, 0) scale(0.5) rotate(0deg);
//                         opacity: 0;
//                     }
//                     20% {
//                         opacity: 1;
//                     }
//                     100% {
//                         transform: translate(var(--target-x), var(--target-y)) scale(1.2) rotate(var(--target-rot));
//                         opacity: 0;
//                     }
//                 }
//                 .animate-flush-continuous {
//                     pointer-events: none;
//                     animation: flush-continuous 1s ease-out forwards;
//                 }
//             `}</style>
//         </>
//     );
// };

// export default memo(Navbar);


// import React, { useCallback, memo, useState, useRef, useEffect } from 'react';
// import { useDispatch } from 'react-redux';
// import { forceLogout } from '../components/REDUX_FEATURES/REDUX_SLICES/authSlice';
// import {
//     Search, User, Heart, ShoppingCart, Menu, X, Phone, Mail, Clock,
//     ChevronRight, Home, Flame, Package, Tag, Ticket, HeadphonesIcon,
//     Smartphone, ChefHat, Shirt, Dumbbell, Plane, Book, Baby, Car, Box, Gift,
//     MapPin, LogOut, UserCircle, Settings, Shield
// } from 'lucide-react';
// import { Link, useNavigate } from 'react-router-dom';
// import logo from "../assets/logo2.png";

// // --- Sub-Components ---

// const ActionIcon = memo(({ item, onClick, isLoggedIn }) => (
//     <div 
//         onClick={onClick}
//         className="flex flex-col items-center cursor-pointer relative group text-black hover:text-[#F7A221] transition-colors min-w-[50px]"
//     >
//         <div className="p-1 md:p-2 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
//             {item.icon}
//         </div>
//         {item.count !== undefined && (
//             <span className={`absolute -top-1 right-1 md:-top-1 md:right-2 ${item.badge} text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm group-hover:animate-bounce`}>
//                 {item.count}
//             </span>
//         )}
//         <span className="text-[9px] md:text-[10px] mt-0.5 font-bold uppercase tracking-tighter whitespace-nowrap">
//             {item.label}
//         </span>
//     </div>
// ));

// // User Account Dropdown Component
// const UserAccountDropdown = ({ user, onLogout, onClose }) => {
//     const navigate = useNavigate();
//     const dropdownRef = useRef(null);

//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//                 onClose();
//             }
//         };

//         document.addEventListener('mousedown', handleClickOutside);
//         return () => document.removeEventListener('mousedown', handleClickOutside);
//     }, [onClose]);

//     const menuItems = [
//         { icon: <UserCircle size={16} />, label: 'My Profile', path: '/profile' },
//         { icon: <Heart size={16} />, label: 'My Wishlist', path: '/wishlist' },
//         { icon: <ShoppingCart size={16} />, label: 'My Orders', path: '/orders' },
//         { icon: <Settings size={16} />, label: 'Settings', path: '/settings' },
//         // { icon: <Shield size={16} />, label: 'Become a Seller', path: '/seller' },
//     ];

//     return (
//         <div 
//             ref={dropdownRef}
//             className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-slideDown"
//         >
//             {/* User Info Header */}
//             <div className="bg-gradient-to-r from-[#F7A221]/10 to-transparent p-4 border-b">
//                 <p className="text-xs text-gray-500 mb-1">Welcome back,</p>
//                 <p className="font-black text-black text-lg truncate">
//                     {user?.name || user?.email} </p>
//                 <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
//             </div>

//             {/* Menu Items */}
//             <div className="py-2">
//                 {menuItems.map((item, index) => (
//                     <button
//                         key={index}
//                         onClick={() => {
//                             navigate(item.path);
//                             onClose();
//                         }}
//                         className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50 transition-colors text-left group"
//                     >
//                         <span className="text-gray-500 group-hover:text-[#F7A221] transition-colors">
//                             {item.icon}
//                         </span>
//                         <span className="text-sm font-bold text-gray-700 group-hover:text-black">
//                             {item.label}
//                         </span>
//                     </button>
//                 ))}
//             </div>

//             {/* Logout Button */}
//             <div className="border-t p-2">
//                 <button
//                     onClick={() => {
//                         onLogout();
//                         onClose();
//                     }}
//                     className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors rounded-xl text-left group"
//                 >
//                     <LogOut size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
//                     <span className="text-sm font-bold text-red-600">Logout</span>
//                 </button>
//             </div>
//         </div>
//     );
// };

// const MegaDropdown = ({ isOpen }) => {
//     if (!isOpen) return null;

//     const categories = [
//         { label: "Smart Life - Gadgets", icon: <Smartphone size={18} className="text-blue-600" /> },
//         { label: "Home & Kitchen", icon: <ChefHat size={18} className="text-red-600" /> },
//         { label: "Fashion World", icon: <Shirt size={18} className="text-[#F7A221]" /> },
//         { label: "Sports & Fitness", icon: <Dumbbell size={18} className="text-blue-600" /> },
//         { label: "Tours & Travels", icon: <Plane size={18} className="text-[#F7A221]" /> },
//         { label: "Stationary", icon: <Book size={18} className="text-red-600" /> },
//         { label: "Baby Items", icon: <Baby size={18} className="text-blue-600" /> },
//         { label: "Car Accessories", icon: <Car size={18} className="text-[#F7A221]" /> },
//         { label: "Mix Items Daily use", icon: <Box size={18} className="text-red-600" /> },
//         { label: "Gifts", icon: <Gift size={18} className="text-blue-600" /> },
//     ];

//     return (
//         <div className="absolute top-[100%] left-0 w-full bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border-t-2 border-[#F7A221] animate-slideDown z-50 hidden lg:block">
//             <div className="container mx-auto px-4 py-10">
//                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
//                     {categories.map((category, index) => (
//                         <a 
//                             key={index} 
//                             href="#" 
//                             className="flex items-center gap-4 p-4 rounded-2xl hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100 shadow-sm"
//                         >
//                             <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 group-hover:shadow-md group-hover:rotate-3 transition-all duration-300">
//                                 {category.icon}
//                             </div>
//                             <span className="font-bold text-black group-hover:text-[#F7A221] transition-colors text-[13px] uppercase tracking-tight">
//                                 {category.label}
//                             </span>
//                         </a>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// };

// const NavItemWithDropdown = ({ link }) => {
//     const [isOpen, setIsOpen] = useState(false);
    
//     return (
//         <div 
//             className="static"
//             onMouseEnter={() => setIsOpen(true)}
//             onMouseLeave={() => setIsOpen(false)}
//         >
//             <div className="nav-link flex items-center gap-2 group cursor-pointer">
//                 <div className={`transition-all duration-300 ${isOpen ? 'scale-110 rotate-12' : ''}`}>
//                     {link.icon}
//                 </div>
//                 <span className="font-black text-black group-hover:text-black transition-colors">{link.label}</span>
//                 <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-black' : 'text-white/70'}`} />
//             </div>
//             <MegaDropdown isOpen={isOpen} />
//         </div>
//     );
// };

// const Navbar = ({ searchQuery, setSearchQuery, isMenuOpen, setIsMenuOpen, isLoggedIn, user, onOpenAuth }) => {
//     const dispatch = useDispatch();
//     const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
//     const [isLogoHovered, setIsLogoHovered] = useState(false);
//     const [burstIcons, setBurstIcons] = useState([]);
    
//     const handleSearchChange = useCallback((e) => {
//         setSearchQuery(e.target.value);
//     }, [setSearchQuery]);

//     const handleLogout = async () => {
//         await dispatch(forceLogout());
//         setIsAccountDropdownOpen(false);
//     };

//     const handleAccountClick = () => {
//         if (isLoggedIn) {
//             setIsAccountDropdownOpen(!isAccountDropdownOpen);
//         } else {
//             onOpenAuth();
//         }
//     };

//     useEffect(() => {
//         let interval;
//         if (isLogoHovered) {
//             interval = setInterval(() => {
//                 const newIcon = {
//                     id: Date.now(),
//                     ...iconPool[Math.floor(Math.random() * iconPool.length)],
//                     x: (Math.random() - 0.5) * 200 + "px", 
//                     y: (Math.random() - 0.5) * 200 + "px",
//                     rotation: Math.random() * 360 + "deg"
//                 };
                
//                 setBurstIcons((prev) => [...prev.slice(-15), newIcon]);
//             }, 150);
//         } else {
//             setBurstIcons([]);
//         }
//         return () => clearInterval(interval);
//     }, [isLogoHovered]);

//     // Define the icons that will "flush" out
//     const iconPool = [
//         { icon: <Smartphone size={18} />, color: "text-blue-500" },
//         { icon: <Shirt size={18} />, color: "text-orange-500" },
//         { icon: <Dumbbell size={18} />, color: "text-green-500" },
//         { icon: <Package size={18} />, color: "text-purple-500" },
//         { icon: <Baby size={18} />, color: "text-pink-500" },
//         { icon: <ChefHat size={18} />, color: "text-red-500" },
//         { icon: <Car size={18} />, color: "text-gray-600" },
//         { icon: <HeadphonesIcon size={18} />, color: "text-yellow-500" }
//     ];

//     const actionIcons = [
//         { 
//             icon: <User size={22} />, 
//             label: isLoggedIn  ? (user?.name || "Account") : "Account",
//             onClick: handleAccountClick
//         },
//         { icon: <Heart size={22} />, label: "Wishlist", count: 0, badge: "bg-red-600" },
//         { icon: <ShoppingCart size={22} />, label: "Cart", count: 0, badge: "bg-black" }
//     ];

//     const bottomNavLinks = [
//         { 
//             label: "Todays' Deal", 
//             path: "/", 
//             icon: <Tag size={20} className="text-[#22C55E] animate-swing drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> 
//         },
//         { 
//             label: "Just Arrived", 
//             path: "/", 
//             icon: <Package size={18} className="text-[#00D2FF] animate-float drop-shadow-[0_0_8px_rgba(0,210,255,0.5)]" /> 
//         },
//         { 
//             label: "Sale", 
//             path: "/", 
//             icon: <Flame size={20} className="text-[#FF4D4D] animate-flicker drop-shadow-[0_0_10px_rgba(255,77,77,0.7)]" />
//         },
//         { 
//             label: "Coupons", 
//             path: "/", 
//             icon: <Ticket size={18} className="text-[#FFD700] animate-bounce-soft drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" /> 
//         },
//         { 
//             label: "Customer Care", 
//             path: "/customer-care", 
//             icon: <HeadphonesIcon size={18} className="text-white animate-tilt drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]" /> 
//         }
//     ];

//     const mobileCategories = [
//         "Smart Life", "Home & Kitchen", "Fashion", "Sports", "Travel", "Stationary", "Baby Items", "Car Accessories"
//     ];

//     return (
//         <>
//             {/* Top Info Bar */}
//             <div className="bg-black text-white py-2 px-4 hidden lg:block border-b border-white/10">
//                 <div className="container mx-auto flex justify-between text-[11px] font-bold uppercase tracking-wider">
//                     <div className="flex items-center gap-8">
//                         <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//                             <Phone size={12} className="text-[#F7A221] group-hover:animate-shake" /> +91 93200 01717
//                         </span>
//                         <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//                             <Mail size={12} className="text-[#F7A221] group-hover:scale-110" /> support@offerwale.com
//                         </span>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <Clock size={12} className="text-[#F7A221] animate-pulse" /> <span className="text-white/90">Pan India Delivery • 24/7 Support</span>
//                     </div>
//                 </div>
//             </div>

//             <header className="bg-white sticky top-0 z-50 text-black shadow-md">
//                 <div className="container mx-auto px-4"> 
//                     <div className="flex items-center justify-between gap-2 md:gap-8 h-20 md:h-24">
                        
//                         {/* Logo & Mobile Menu Toggle */}
//                         <div className="flex items-center gap-2">
//                             <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-2 text-black bg-gray-50 rounded-lg">
//                                 <Menu size={24} />
//                             </button>

//                             {/* Enhanced Logo Section */}
//                             <Link 
//                                 to="/" 
//                                 className="relative flex-shrink-0 flex items-center justify-center p-1 group"
//                                 onMouseEnter={() => setIsLogoHovered(true)}
//                                 onMouseLeave={() => setIsLogoHovered(false)}
//                             >
//                                 {/* The Continuous Burst */}
//                                 {burstIcons.map((item) => (
//                                     <div 
//                                         key={item.id}
//                                         className={`absolute z-[-1] ${item.color} animate-flush-continuous`}
//                                         style={{ 
//                                             '--target-x': item.x, 
//                                             '--target-y': item.y,
//                                             '--target-rot': item.rotation
//                                         }}
//                                     >
//                                         {item.icon}
//                                     </div>
//                                 ))}

//                                 <img 
//                                     className="relative z-10 object-contain transition-transform duration-500 w-[100px] md:w-[160px] max-h-[55px] md:max-h-[85px]" 
//                                     src={logo} alt="Logo" 
//                                 />
//                             </Link>
//                         </div>

//                         {/* Location - Desktop Only */}
//                         <div className="hidden xl:flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-all border border-transparent hover:border-gray-100 group">
//                             <MapPin size={22} className="text-red-600 animate-bounce" />
//                             <div className="flex flex-col">
//                                 <span className="text-[10px] text-gray-500 font-bold uppercase leading-none">Deliver to</span>
//                                 <span className="text-sm font-black text-gray-900 leading-tight">Mumbai 421004</span>
//                             </div>
//                         </div>

//                         {/* Search Bar - Hidden on Mobile */}
//                         <div className="flex-1 max-w-xl relative hidden lg:block">
//                             <input
//                                 type="text"
//                                 placeholder="Search products, brands and more..."
//                                 className="w-full py-3.5 px-14 rounded-2xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-[#F7A221] focus:bg-white transition-all font-bold text-sm"
//                                 value={searchQuery}
//                                 onChange={handleSearchChange}
//                             />
//                             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//                             <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white py-2 px-5 rounded-xl hover:bg-[#F7A221] transition-all shadow-md font-bold text-xs uppercase hover:tracking-widest duration-300">
//                                 Search
//                             </button>
//                         </div>

//                         {/* Action Icons - Labels Always Visible */}
//                         <div className="flex items-center gap-2 md:gap-4 lg:gap-8 relative">
//                             {actionIcons.map((item, idx) => (
//                                 <ActionIcon 
//                                     key={idx} 
//                                     item={item} 
//                                     onClick={item.onClick}
//                                     isLoggedIn={isLoggedIn}
//                                 />
//                             ))}
                            
//                             {/* Account Dropdown */}
//                             {isLoggedIn && isAccountDropdownOpen && (
//                                 <UserAccountDropdown 
//                                     user={user}
//                                     onLogout={handleLogout}
//                                     onClose={() => setIsAccountDropdownOpen(false)}
//                                 />
//                             )}
//                         </div>
//                     </div>

//                     {/* Mobile Search Bar - Visible on Mobile */}
//                     <div className="pb-4 lg:hidden">
//                         <div className="relative">
//                             <input
//                                 type="text"
//                                 placeholder="Search products..."
//                                 className="w-full py-3 px-12 rounded-xl text-black focus:outline-none bg-gray-100 border border-gray-200 font-bold text-xs"
//                                 value={searchQuery}
//                                 onChange={handleSearchChange}
//                             />
//                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
//                         </div>
//                     </div>
//                 </div>

//                 {/* Bottom Desktop Nav */}
//                 <nav className="bg-[linear-gradient(90deg,rgba(247,162,33,0.9),rgba(242,140,0,0.6))] shadow-inner hidden lg:block relative">
//                     <div className="container mx-auto px-4">
//                         <div className="flex items-center justify-center gap-2 py-2">
//                             <NavItemWithDropdown 
//                                 link={{ label: "All Categories", path: "/products", icon: <Home size={18} className="text-white" /> }} 
//                             />
//                             <div className="h-6 w-[1px] bg-white/20 mx-2"></div>
//                             {bottomNavLinks.map((link, idx) => (
//                                 <Link 
//                                     key={idx} 
//                                     to={link.path} 
//                                     className="nav-link flex items-center gap-2 hover:bg-white/10 group overflow-hidden"
//                                 >
//                                     <div className="transition-transform duration-300 group-hover:scale-125">
//                                         {link.icon}
//                                     </div>
//                                     <span className="font-bold text-white relative z-10">{link.label}</span>
//                                 </Link>
//                             ))}
//                         </div>
//                     </div>
//                 </nav>
//             </header>

//             {/* Mobile Sidebar Overlay */}
//             {isMenuOpen && (
//                 <div className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}>
//                     <div className="w-[85%] max-w-[320px] h-full bg-white shadow-2xl animate-slideRight" onClick={(e) => e.stopPropagation()}>
//                         <div className="p-6 border-b flex justify-between items-center bg-gray-50">
//                             <span className="text-lg font-black uppercase tracking-tighter text-[#F7A221]">Menu</span>
//                             <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white rounded-full shadow-sm text-black hover:rotate-90 transition-transform">
//                                 <X size={20} />
//                             </button>
//                         </div>
//                         <div className="overflow-y-auto h-[calc(100%-80px)]">
//                             <div className="p-4 space-y-4">
//                                 {/* User Info in Mobile Menu if logged in */}
//                                 {isLoggedIn && user && (
//                                     <div className="bg-gradient-to-r from-[#F7A221]/10 to-transparent p-4 rounded-xl mb-4">
//                                         <p className="text-xs text-gray-500">Welcome back,</p>
//                                         <p className="font-black text-black">{user.name ? user.name :"x"}</p>
//                                         <p className="text-xs text-gray-600 mt-1">{user.email}</p>
//                                     </div>
//                                 )}

//                                 <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Shopping</p>
//                                 {bottomNavLinks.map((link, idx) => (
//                                     <Link key={idx} to={link.path} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-colors font-bold text-sm">
//                                         <span className="p-2 bg-gray-50 rounded-lg">{link.icon}</span>
//                                         {link.label}
//                                     </Link>
//                                 ))}
                                
//                                 <div className="pt-4 border-t">
//                                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Top Categories</p>
//                                     <div className="grid grid-cols-2 gap-2">
//                                         {mobileCategories.map((cat, i) => (
//                                             <div key={i} className="p-3 bg-gray-50 rounded-lg text-[11px] font-bold text-center border border-gray-100 text-gray-800">
//                                                 {cat}
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </div>
                                
//                                 <div className="pt-6">
//                                     <div className="bg-black rounded-2xl p-4 text-white">
//                                         <p className="text-[10px] font-bold opacity-60 uppercase mb-2">Need Help?</p>
//                                         <div className="flex flex-col gap-1">
//                                             <p className="text-sm font-black">+91 93200 01717</p>
//                                             <p className="text-[11px] opacity-80">support@offerwale.com</p>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             <style jsx>{`
//                 .nav-link {
//                     padding: 10px 18px;
//                     font-size: 12px;
//                     font-weight: 800;
//                     text-transform: uppercase;
//                     border-radius: 12px;
//                     transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//                     letter-spacing: 0.03em;
//                     color: #ffffff !important;
//                 }
//                 .nav-link:hover {
//                     background: rgba(255, 255, 255, 0.15);
//                     transform: translateY(-2px);
//                 }

//                 @keyframes slideRight {
//                     from { transform: translateX(-100%); }
//                     to { transform: translateX(0); }
//                 }
//                 .animate-slideRight { animation: slideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

//                 @keyframes slideDown {
//                     from { opacity: 0; transform: translateY(-10px); }
//                     to { opacity: 1; transform: translateY(0); }
//                 }
//                 .animate-slideDown { animation: slideDown 0.3s ease-out forwards; }

//                 @keyframes swing {
//                     0% { transform: rotate(0deg); }
//                     20% { transform: rotate(15deg); }
//                     40% { transform: rotate(-10deg); }
//                     60% { transform: rotate(5deg); }
//                     80% { transform: rotate(-5deg); }
//                     100% { transform: rotate(0deg); }
//                 }
//                 .animate-swing { animation: swing 2.5s ease-in-out infinite; transform-origin: top center; }

//                 @keyframes flicker {
//                     0%, 100% { transform: scale(1); opacity: 1; }
//                     50% { transform: scale(1.15); opacity: 0.9; }
//                     70% { transform: scale(1.05); opacity: 1; }
//                 }
//                 .animate-flicker { animation: flicker 1s ease-in-out infinite; }

//                 @keyframes float {
//                     0%, 100% { transform: translateY(0); }
//                     50% { transform: translateY(-4px); }
//                 }
//                 .animate-float { animation: float 3s ease-in-out infinite; }

//                 @keyframes bounce-soft {
//                     0%, 100% { transform: translateY(0); }
//                     50% { transform: translateY(-3px); }
//                 }
//                 .animate-bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }

//                 @keyframes tilt {
//                     0%, 100% { transform: rotate(0deg); }
//                     50% { transform: rotate(10deg); }
//                 }
//                 .animate-tilt { animation: tilt 3s ease-in-out infinite; }

//                 @keyframes shake {
//                     0%, 100% { transform: translateX(0); }
//                     25% { transform: translateX(-2px); }
//                     75% { transform: translateX(2px); }
//                 }
//                 .animate-shake { animation: shake 0.5s ease-in-out infinite; }

//                 @keyframes flush-continuous {
//                     0% {
//                         transform: translate(0, 0) scale(0.5) rotate(0deg);
//                         opacity: 0;
//                     }
//                     20% {
//                         opacity: 1;
//                     }
//                     100% {
//                         transform: translate(var(--target-x), var(--target-y)) scale(1.2) rotate(var(--target-rot));
//                         opacity: 0;
//                     }
//                 }

//                 .animate-flush-continuous {
//                     pointer-events: none;
//                     animation: flush-continuous 1s ease-out forwards;
//                 }
//             `}</style>
//         </>
//     );
// };

// export default memo(Navbar);



// ===================================
// ===========================



// import React, { useCallback, memo, useState, useRef, useEffect, } from 'react';
// import {
//     Search, User, Heart, ShoppingCart, Menu, X, Phone, Mail, Clock,
//     ChevronRight, Home, Flame, Package, Tag, Ticket, HeadphonesIcon,
//     Smartphone, ChefHat, Shirt, Dumbbell, Plane, Book, Baby, Car, Box, Gift,
//     MapPin
// } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import logo from "../assets/logo2.png";


// // --- Sub-Components ---

// const ActionIcon = memo(({ item }) => (
//     <div className="flex flex-col items-center cursor-pointer relative group text-black hover:text-[#F7A221] transition-colors min-w-[50px]">
//         <div className="p-1 md:p-2 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
//             {item.icon}
//         </div>
//         {item.count !== undefined && (
//             <span className={`absolute top-0 right-1 md:top-1 md:right-2 ${item.badge} text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm group-hover:animate-bounce`}>
//                 {item.count}
//             </span>
//         )}
//         <span className="text-[9px] md:text-[10px] mt-0.5 font-bold uppercase tracking-tighter whitespace-nowrap">
//             {item.label}
//         </span>
//     </div>
// ));

// const MegaDropdown = ({ isOpen }) => {
//     if (!isOpen) return null;

//     const categories = [
//         { label: "Smart Life - Gadgets", icon: <Smartphone size={18} className="text-blue-600" /> },
//         { label: "Home & Kitchen", icon: <ChefHat size={18} className="text-red-600" /> },
//         { label: "Fashion World", icon: <Shirt size={18} className="text-[#F7A221]" /> },
//         { label: "Sports & Fitness", icon: <Dumbbell size={18} className="text-blue-600" /> },
//         { label: "Tours & Travels", icon: <Plane size={18} className="text-[#F7A221]" /> },
//         { label: "Stationary", icon: <Book size={18} className="text-red-600" /> },
//         { label: "Baby Items", icon: <Baby size={18} className="text-blue-600" /> },
//         { label: "Car Accessories", icon: <Car size={18} className="text-[#F7A221]" /> },
//         { label: "Mix Items Daily use", icon: <Box size={18} className="text-red-600" /> },
//         { label: "Gifts", icon: <Gift size={18} className="text-blue-600" /> }
//     ];

//     return (
//         <div className="absolute top-[100%] left-0 w-full bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border-t-2 border-[#F7A221] animate-slideDown z-50 hidden lg:block">
//             <div className="container mx-auto px-4 py-10">
//                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
//                     {categories.map((category, index) => (
//                         <a 
//                             key={index} 
//                             href="#" 
//                             className="flex items-center gap-4 p-4 rounded-2xl hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100 shadow-sm"
//                         >
//                             <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 group-hover:shadow-md group-hover:rotate-3 transition-all duration-300">
//                                 {category.icon}
//                             </div>
//                             <span className="font-bold text-black group-hover:text-[#F7A221] transition-colors text-[13px] uppercase tracking-tight">
//                                 {category.label}
//                             </span>
//                         </a>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// };

// const NavItemWithDropdown = ({ link }) => {
//     const [isOpen, setIsOpen] = useState(false);
    
//     return (
//         <div 
//             className="static"
//             onMouseEnter={() => setIsOpen(true)}
//             onMouseLeave={() => setIsOpen(false)}
//         >
//             <div className="nav-link flex items-center gap-2 group cursor-pointer">
//                 <div className={`transition-all duration-300 ${isOpen ? 'scale-110 rotate-12' : ''}`}>
//                     {link.icon}
//                 </div>
//                 <span className="font-black text-black group-hover:text-black transition-colors">{link.label}</span>
//                 <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-black' : 'text-white/70'}`} />
//             </div>
//             <MegaDropdown isOpen={isOpen} />
//         </div>
//     );
// };

// const Navbar = ({ searchQuery, setSearchQuery, isMenuOpen, setIsMenuOpen }) => {
    
//     const handleSearchChange = useCallback((e) => {
//         setSearchQuery(e.target.value);
//     }, [setSearchQuery]);
// const [isLogoHovered, setIsLogoHovered] = useState(false);
//     const [burstIcons, setBurstIcons] = useState([]);
//     useEffect(() => {
//         let interval;
//         if (isLogoHovered) {
//             interval = setInterval(() => {
//                 const newIcon = {
//                     id: Date.now(), // unique key for React
//                     ...iconPool[Math.floor(Math.random() * iconPool.length)],
//                     // Randomize direction and distance
//                     x: (Math.random() - 0.5) * 200 + "px", 
//                     y: (Math.random() - 0.5) * 200 + "px",
//                     rotation: Math.random() * 360 + "deg"
//                 };
                
//                 setBurstIcons((prev) => [...prev.slice(-15), newIcon]); // Keep last 15 icons for performance
//             }, 150); // Speed of the flush (150ms)
//         } else {
//             setBurstIcons([]); // Clear icons when mouse leaves
//         }
//         return () => clearInterval(interval);
//     }, [isLogoHovered]);
// // Define the icons that will "flush" out
//   const iconPool = [
//         { icon: <Smartphone size={18} />, color: "text-blue-500" },
//         { icon: <Shirt size={18} />, color: "text-orange-500" },
//         { icon: <Dumbbell size={18} />, color: "text-green-500" },
//         { icon: <Package size={18} />, color: "text-purple-500" },
//         { icon: <Baby size={18} />, color: "text-pink-500" },
//         { icon: <ChefHat size={18} />, color: "text-red-500" },
//         { icon: <Car size={18} />, color: "text-gray-600" },
//         { icon: <HeadphonesIcon size={18} />, color: "text-yellow-500" }
//     ];
//     const actionIcons = [
//         { icon: <User size={22} />, label: "Account" },
//         { icon: <Heart size={22} />, label: "Wishlist", count: 0, badge: "bg-red-600" },
//         { icon: <ShoppingCart size={22} />, label: "Cart", count: 0, badge: "bg-black" }
//     ];

//    const bottomNavLinks = [
//         { 
//             label: "Todays' Deal", 
//             path: "/", 
//             icon: <Tag size={20} className="text-[#22C55E] animate-swing drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> 
//         },
//         { 
//             label: "Just Arrived", 
//             path: "/", 
//             icon: <Package size={18} className="text-[#00D2FF] animate-float drop-shadow-[0_0_8px_rgba(0,210,255,0.5)]" /> 
//         },
//         { 
//             label: "Sale", 
//             path: "/", 
//             icon: <Flame size={20} className="text-[#FF4D4D] animate-flicker drop-shadow-[0_0_10px_rgba(255,77,77,0.7)]" />
//         },
//         { 
//             label: "Coupons", 
//             path: "/", 
//             icon: <Ticket size={18} className="text-[#FFD700] animate-bounce-soft drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" /> 
//         },
//         { 
//             label: "Customer Care", 
//             path: "/customer-care", 
//             icon: <HeadphonesIcon size={18} className="text-white animate-tilt drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]" /> 
//         }
//     ];

//     const mobileCategories = [
//         "Smart Life", "Home & Kitchen", "Fashion", "Sports", "Travel", "Stationary", "Baby Items", "Car Accessories"
//     ];

//     return (
//         <>
//             {/* Top Info Bar */}
//             <div className="bg-black text-white py-2 px-4 hidden lg:block border-b border-white/10">
//                 <div className="container mx-auto flex justify-between text-[11px] font-bold uppercase tracking-wider">
//                     <div className="flex items-center gap-8">
//                         <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//                             <Phone size={12} className="text-[#F7A221] group-hover:animate-shake" /> +91 93200 01717
//                         </span>
//                         <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//                             <Mail size={12} className="text-[#F7A221] group-hover:scale-110" /> support@offerwale.com
//                         </span>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <Clock size={12} className="text-[#F7A221] animate-pulse" /> <span className="text-white/90">Pan India Delivery • 24/7 Support</span>
//                     </div>
//                 </div>
//             </div>

//             <header className="bg-white sticky top-0 z-50 text-black shadow-md">
//                 <div className="container mx-auto px-4"> 
//                     <div className="flex items-center justify-between gap-2 md:gap-8 h-20 md:h-24">
                        
//                         {/* Logo & Mobile Menu Toggle */}
//                         <div className="flex items-center gap-2">
//                             <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-2 text-black bg-gray-50 rounded-lg">
//                                 <Menu size={24} />
//                             </button>
//                             {/* <Link to="/" className="flex-shrink-0 flex items-center justify-center p-1 group">
//                                 <img 
//                                     className="object-contain transition-transform duration-500  w-[100px] md:w-[160px] max-h-[55px] md:max-h-[85px]" 
//                                     style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' }} 
//                                     src={logo} alt="Logo" 
//                                 />
//                             </Link> */}

//                             {/* --- ENHANCED LOGO SECTION --- */}
//                            <Link 
//                 to="/" 
//                 className="relative flex-shrink-0 flex items-center justify-center p-1 group"
//                 onMouseEnter={() => setIsLogoHovered(true)}
//                 onMouseLeave={() => setIsLogoHovered(false)}
//             >
//                 {/* The Continuous Burst */}
//                 {burstIcons.map((item) => (
//                     <div 
//                         key={item.id}
//                         className={`absolute z-[-1] ${item.color} animate-flush-continuous`}
//                         style={{ 
//                             '--target-x': item.x, 
//                             '--target-y': item.y,
//                             '--target-rot': item.rotation
//                         }}
//                     >
//                         {item.icon}
//                     </div>
//                 ))}

//                 <img 
//                     className="relative z-10 object-contain transition-transform duration-500 w-[100px] md:w-[160px] max-h-[55px] md:max-h-[85px]" 
//                     src={logo} alt="Logo" 
//                 />
//             </Link>
//                         </div>

//                         {/* Location - Desktop Only */}
//                         <div className="hidden xl:flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-all border border-transparent hover:border-gray-100 group">
//                             <MapPin size={22} className="text-red-600 animate-bounce" />
//                             <div className="flex flex-col">
//                                 <span className="text-[10px] text-gray-500 font-bold uppercase leading-none">Deliver to</span>
//                                 <span className="text-sm font-black text-gray-900 leading-tight">Mumbai 421004</span>
//                             </div>
//                         </div>

//                         {/* Search Bar - Hidden on Mobile */}
//                         <div className="flex-1 max-w-xl relative hidden lg:block">
//                             <input
//                                 type="text"
//                                 placeholder="Search products, brands and more..."
//                                 className="w-full py-3.5 px-14 rounded-2xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-[#F7A221] focus:bg-white transition-all font-bold text-sm"
//                                 value={searchQuery}
//                                 onChange={handleSearchChange}
//                             />
//                             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//                             <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white py-2 px-5 rounded-xl hover:bg-[#F7A221] transition-all shadow-md font-bold text-xs uppercase hover:tracking-widest duration-300">
//                                 Search
//                             </button>
//                         </div>

//                         {/* Action Icons - Labels Always Visible */}
//                         <div className="flex items-center gap-2 md:gap-4 lg:gap-8">
//                             {actionIcons.map((item, idx) => <ActionIcon key={idx} item={item} />)}
//                         </div>
//                     </div>

//                     {/* Mobile Search Bar - Visible on Mobile */}
//                     <div className="pb-4 lg:hidden">
//                         <div className="relative">
//                             <input
//                                 type="text"
//                                 placeholder="Search products..."
//                                 className="w-full py-3 px-12 rounded-xl text-black focus:outline-none bg-gray-100 border border-gray-200 font-bold text-xs"
//                                 value={searchQuery}
//                                 onChange={handleSearchChange}
//                             />
//                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
//                         </div>
//                     </div>
//                 </div>

//                 {/* Bottom Desktop Nav */}
//                 <nav className="bg-[linear-gradient(90deg,rgba(247,162,33,0.9),rgba(242,140,0,0.6))] shadow-inner hidden lg:block relative">
//                     <div className="container mx-auto px-4">
//                         <div className="flex items-center justify-center gap-2 py-2">
//                             <NavItemWithDropdown 
//                                 link={{ label: "All Categories", path: "/products", icon: <Home size={18} className="text-white" /> }} 
//                             />
//                             <div className="h-6 w-[1px] bg-white/20 mx-2"></div>
//                             {bottomNavLinks.map((link, idx) => (
//                                 <Link 
//                                     key={idx} 
//                                     to={link.path} 
//                                     className="nav-link flex items-center gap-2 hover:bg-white/10 group overflow-hidden"
//                                 >
//                                     <div className="transition-transform duration-300 group-hover:scale-125">
//                                         {link.icon}
//                                     </div>
//                                     <span className="font-bold text-black relative z-10">{link.label}</span>
//                                 </Link>
//                             ))}
//                         </div>
//                     </div>
//                 </nav>
//             </header>

//             {/* Mobile Sidebar Overlay */}
//             {isMenuOpen && (
//                 <div className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}>
//                     <div className="w-[85%] max-w-[320px] h-full bg-white shadow-2xl animate-slideRight" onClick={(e) => e.stopPropagation()}>
//                         <div className="p-6 border-b flex justify-between items-center bg-gray-50">
//                             {/* Logo Removed from sidebar header per request */}
//                             <span className="text-lg font-black uppercase tracking-tighter text-[#F7A221]">Menu</span>
//                             <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white rounded-full shadow-sm text-black hover:rotate-90 transition-transform">
//                                 <X size={20} />
//                             </button>
//                         </div>
//                         <div className="overflow-y-auto h-[calc(100%-80px)]">
//                             <div className="p-4 space-y-4">
//                                 <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Shopping</p>
//                                 {bottomNavLinks.map((link, idx) => (
//                                     <Link key={idx} to={link.path} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-colors font-bold text-sm">
//                                         <span className="p-2 bg-gray-50 rounded-lg">{link.icon}</span>
//                                         {link.label}
//                                     </Link>
//                                 ))}
                                
//                                 <div className="pt-4 border-t">
//                                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Top Categories</p>
//                                     <div className="grid grid-cols-2 gap-2">
//                                         {mobileCategories.map((cat, i) => (
//                                             <div key={i} className="p-3 bg-gray-50 rounded-lg text-[11px] font-bold text-center border border-gray-100 text-gray-800">
//                                                 {cat}
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </div>
                                
//                                 <div className="pt-6">
//                                     <div className="bg-black rounded-2xl p-4 text-white">
//                                         <p className="text-[10px] font-bold opacity-60 uppercase mb-2">Need Help?</p>
//                                         <div className="flex flex-col gap-1">
//                                             <p className="text-sm font-black">+91 93200 01717</p>
//                                             <p className="text-[11px] opacity-80">support@offerwale.com</p>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             <style jsx>{`
//                 .nav-link {
//                     padding: 10px 18px;
//                     font-size: 12px;
//                     font-weight: 800;
//                     text-transform: uppercase;
//                     border-radius: 12px;
//                     transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//                     letter-spacing: 0.03em;
//                     color: #ffffff !important;
//                 }
//                 .nav-link:hover {
//                     background: rgba(255, 255, 255, 0.15);
//                     transform: translateY(-2px);
//                 }

//                 @keyframes slideRight {
//                     from { transform: translateX(-100%); }
//                     to { transform: translateX(0); }
//                 }
//                 .animate-slideRight { animation: slideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

//                 @keyframes swing {
//                     0% { transform: rotate(0deg); }
//                     20% { transform: rotate(15deg); }
//                     40% { transform: rotate(-10deg); }
//                     60% { transform: rotate(5deg); }
//                     80% { transform: rotate(-5deg); }
//                     100% { transform: rotate(0deg); }
//                 }
//                 .animate-swing { animation: swing 2.5s ease-in-out infinite; transform-origin: top center; }

//                 @keyframes flicker {
//                     0%, 100% { transform: scale(1); opacity: 1; }
//                     50% { transform: scale(1.15); opacity: 0.9; }
//                     70% { transform: scale(1.05); opacity: 1; }
//                 }
//                 .animate-flicker { animation: flicker 1s ease-in-out infinite; }

//                 @keyframes float {
//                     0%, 100% { transform: translateY(0); }
//                     50% { transform: translateY(-4px); }
//                 }
//                 .animate-float { animation: float 3s ease-in-out infinite; }

//                 @keyframes bounce-soft {
//                     0%, 100% { transform: translateY(0); }
//                     50% { transform: translateY(-3px); }
//                 }
//                 .animate-bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }

//                 @keyframes tilt {
//                     0%, 100% { transform: rotate(0deg); }
//                     50% { transform: rotate(10deg); }
//                 }
//                 .animate-tilt { animation: tilt 3s ease-in-out infinite; }

//                 @keyframes shake {
//                     0%, 100% { transform: translateX(0); }
//                     25% { transform: translateX(-2px); }
//                     75% { transform: translateX(2px); }
//                 }
//                 .animate-shake { animation: shake 0.5s ease-in-out infinite; }

//                 @keyframes slideDown {
//                     from { opacity: 0; transform: translateY(-15px); }
//                     to { opacity: 1; transform: translateY(0); }
//                 }
//                 .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }



//                @keyframes flush-continuous {
//     0% {
//         transform: translate(0, 0) scale(0.5) rotate(0deg);
//         opacity: 0;
//     }
//     20% {
//         opacity: 1;
//     }
//     100% {
//         transform: translate(var(--target-x), var(--target-y)) scale(1.2) rotate(var(--target-rot));
//         opacity: 0;
//     }
// }

// .animate-flush-continuous {
//     pointer-events: none; /* Icons won't block mouse movements */
//     animation: flush-continuous 1s ease-out forwards;
// }
//             `}</style>
//         </>
//     );
// };

// export default memo(Navbar);

// import React, { useCallback, memo, useState } from 'react';
// import {
//     Search, User, Heart, ShoppingCart, Menu, X, Phone, Mail, Clock,
//     ChevronRight, Home, Flame, Package, Tag, Ticket, HeadphonesIcon,
//     Smartphone, ChefHat, Shirt, Dumbbell, Plane, Book, Baby, Car, Box, Gift,
//     MapPin
// } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import logo from "../assets/logo2.png";


// // --- Sub-Components ---

// const ActionIcon = memo(({ item }) => (
//     <div className="flex flex-col items-center cursor-pointer relative group text-black hover:text-[#F7A221] transition-colors">
//         <div className="p-2 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
//             {item.icon}
//         </div>
//         {item.count !== undefined && (
//             <span className={`absolute top-1 right-2 ${item.badge} text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm group-hover:animate-bounce`}>
//                 {item.count}
//             </span>
//         )}
//         <span className="text-[10px] mt-0.5 font-bold uppercase tracking-tighter">{item.label}</span>
//     </div>
// ));

// const MegaDropdown = ({ isOpen }) => {
//     if (!isOpen) return null;

//     const categories = [
//         { label: "Smart Life - Gadgets", icon: <Smartphone size={18} className="text-blue-600" /> },
//         { label: "Home & Kitchen", icon: <ChefHat size={18} className="text-red-600" /> },
//         { label: "Fashion World", icon: <Shirt size={18} className="text-[#F7A221]" /> },
//         { label: "Sports & Fitness", icon: <Dumbbell size={18} className="text-blue-600" /> },
//         { label: "Tours & Travels", icon: <Plane size={18} className="text-[#F7A221]" /> },
//         { label: "Stationary", icon: <Book size={18} className="text-red-600" /> },
//         { label: "Baby Items", icon: <Baby size={18} className="text-blue-600" /> },
//         { label: "Car Accessories", icon: <Car size={18} className="text-[#F7A221]" /> },
//         { label: "Mix Items Daily use", icon: <Box size={18} className="text-red-600" /> },
//         { label: "Gifts", icon: <Gift size={18} className="text-blue-600" /> }
//     ];

//     return (
//         <div className="absolute top-[100%] left-0 w-full bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border-t-2 border-[#F7A221] animate-slideDown z-50">
//             <div className="container mx-auto px-4 py-10">
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
//                     {categories.map((category, index) => (
//                         <a 
//                             key={index} 
//                             href="#" 
//                             className="flex items-center gap-4 p-4 rounded-2xl hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100 shadow-sm"
//                         >
//                             <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 group-hover:shadow-md group-hover:rotate-3 transition-all duration-300">
//                                 {category.icon}
//                             </div>
//                             <span className="font-bold text-black group-hover:text-[#F7A221] transition-colors text-[13px] uppercase tracking-tight">
//                                 {category.label}
//                             </span>
//                         </a>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// };

// const NavItemWithDropdown = ({ link }) => {
//     const [isOpen, setIsOpen] = useState(false);
    
//     return (
//         <div 
//             className="static"
//             onMouseEnter={() => setIsOpen(true)}
//             onMouseLeave={() => setIsOpen(false)}
//         >
//             <div className="nav-link flex items-center gap-2 group cursor-pointer">
//                 <div className={`transition-all duration-300 ${isOpen ? 'scale-110 rotate-12' : ''}`}>
//                     {link.icon}
//                 </div>
//                 <span className="font-black text-black group-hover:text-black transition-colors">{link.label}</span>
//                 <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-black' : 'text-white/70'}`} />
//             </div>
//             <MegaDropdown isOpen={isOpen} />
//         </div>
//     );
// };

// const Navbar = ({ searchQuery, setSearchQuery, isMenuOpen, setIsMenuOpen }) => {
    
//     const handleSearchChange = useCallback((e) => {
//         setSearchQuery(e.target.value);
//     }, [setSearchQuery]);

//     const actionIcons = [
//         { icon: <User size={24} />, label: "Account" },
//         { icon: <Heart size={24} />, label: "Wishlist", count: 0, badge: "bg-red-600" },
//         { icon: <ShoppingCart size={24} />, label: "Cart", count: 0, badge: "bg-black" }
//     ];

//    const bottomNavLinks = [
//         { 
//             label: "Todays' Deal", 
//             path: "/", 
//             icon: <Tag size={20} className="text-[#22C55E] animate-swing drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> 
//         },
//         { 
//             label: "Just Arrived", 
//             path: "/", 
//             icon: <Package size={18} className="text-[#00D2FF] animate-float drop-shadow-[0_0_8px_rgba(0,210,255,0.5)]" /> 
//         },
//         { 
//             label: "Sale", 
//             path: "/", 
//             icon: <Flame size={20} className="text-[#FF4D4D] animate-flicker drop-shadow-[0_0_10px_rgba(255,77,77,0.7)]" />
//         },
//         { 
//             label: "Coupons", 
//             path: "/", 
//             icon: <Ticket size={18} className="text-[#FFD700] animate-bounce-soft drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" /> 
//         },
//         { 
//             label: "Customer Care", 
//             path: "/customer-care", 
//             icon: <HeadphonesIcon size={18} className="text-white animate-tilt drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]" /> 
//         }
//     ];
//     return (
//         <>
//             <div className="bg-black text-white py-2 px-4 hidden md:block border-b border-white/10">
//                 <div className="container mx-auto flex justify-between text-[11px] font-bold uppercase tracking-wider">
//                     <div className="flex items-center gap-8">
//                         <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//                             <Phone size={12} className="text-[#F7A221] group-hover:animate-shake" /> +91 93200 01717
//                         </span>
//                         <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group">
//                             <Mail size={12} className="text-[#F7A221] group-hover:scale-110" /> support@offerwale.com
//                         </span>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <Clock size={12} className="text-[#F7A221] animate-pulse" /> <span className="text-white/90">Pan India Delivery • 24/7 Support</span>
//                     </div>
//                 </div>
//             </div>

//             <header className="bg-white sticky top-0 z-50 text-black shadow-md">
//                 <div className="container mx-auto px-4"> 
//                     <div className="flex items-center justify-between gap-8 h-24">
                        
//                         <div className="flex items-center gap-4">
//                             <Link to="/" className="flex-shrink-0 flex items-center justify-center p-1 group">
//                                 <img 
//                                     className="object-contain transition-transform duration-500 group-hover:scale-105" 
//                                     style={{ 
//                                         width: '160px',
//                                         height: 'auto', 
//                                         maxHeight: '85px',
//                                         filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' 
//                                     }} 
//                                     src={logo} alt="Logo" 
//                                 />
//                             </Link>

//                             <div className="hidden xl:flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-all border border-transparent hover:border-gray-100 group">
//                                 <MapPin size={22} className="text-red-600 animate-bounce group-hover:animate-bounce" />
//                                 <div className="flex flex-col">
//                                     <span className="text-[10px] text-gray-500 font-bold uppercase leading-none">Deliver to</span>
//                                     <span className="text-sm font-black text-gray-900 leading-tight">Mumbai 421004</span>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="flex-1 max-w-xl relative hidden md:block">
//                             <input
//                                 type="text"
//                                 placeholder="Search products, brands and more..."
//                                 className="w-full py-4 px-14 rounded-2xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-[#F7A221] focus:bg-white transition-all font-bold text-sm"
//                                 value={searchQuery}
//                                 onChange={handleSearchChange}
//                             />
//                             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//                             <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white py-2.5 px-6 rounded-xl hover:bg-[#F7A221] transition-all shadow-md font-bold text-xs uppercase hover:tracking-widest duration-300">
//                                 Search
//                             </button>
//                         </div>

//                         <div className="flex items-center gap-4 lg:gap-8">
//                             {actionIcons.map((item, idx) => <ActionIcon key={idx} item={item} />)}
//                             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-black bg-gray-100 rounded-xl">
//                                 {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
//                             </button>
//                         </div>
//                     </div>
//                 </div>

//                 <nav className="bg-[linear-gradient(90deg,rgba(247,162,33,0.9),rgba(242,140,0,0.6))] shadow-inner hidden md:block relative"
// >
//                     <div className="container mx-auto px-4">
//                         <div className="flex items-center justify-center gap-2 py-2">
//                             <NavItemWithDropdown 
//                                 link={{ label: "All Categories", path: "/products", icon: <Home size={18} className="text-white" /> }} 
//                             />
                            
//                             <div className="h-6 w-[1px] bg-white/20 mx-2"></div>
                            
//                             {bottomNavLinks.map((link, idx) => (
//                                 <Link 
//                                     key={idx} 
//                                     to={link.path} 
//                                     className="nav-link flex items-center gap-2 hover:bg-white/10 group overflow-hidden"
//                                 >
//                                     <div className="transition-transform duration-300 group-hover:scale-125">
//                                         {link.icon}
//                                     </div>
//                                     <span className="font-bold text-black relative z-10">{link.label}</span>
//                                 </Link>
//                             ))}
//                         </div>
//                     </div>
//                 </nav>
//             </header>

//             <style jsx>{`
//                 .nav-link {
//                     padding: 10px 18px;
//                     font-size: 12px;
//                     font-weight: 800;
//                     text-transform: uppercase;
//                     border-radius: 12px;
//                     transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//                     letter-spacing: 0.03em;
//                     color: #ffffff !important;
//                 }
//                 .nav-link:hover {
//                     background: rgba(255, 255, 255, 0.15);
//                     transform: translateY(-2px);
//                 }

//                 /* Today's Deal Swing Animation */
//                 @keyframes swing {
//                     0% { transform: rotate(0deg); }
//                     20% { transform: rotate(15deg); }
//                     40% { transform: rotate(-10deg); }
//                     60% { transform: rotate(5deg); }
//                     80% { transform: rotate(-5deg); }
//                     100% { transform: rotate(0deg); }
//                 }
//                 .animate-swing { 
//                     animation: swing 2.5s ease-in-out infinite; 
//                     transform-origin: top center;
//                 }

//                 /* Sale Flicker Animation */
//                 @keyframes flicker {
//                     0%, 100% { transform: scale(1); opacity: 1; }
//                     50% { transform: scale(1.15); opacity: 0.9; }
//                     70% { transform: scale(1.05); opacity: 1; }
//                 }
//                 .animate-flicker { animation: flicker 1s ease-in-out infinite; }

//                 /* Other Animations */
//                 @keyframes float {
//                     0%, 100% { transform: translateY(0); }
//                     50% { transform: translateY(-4px); }
//                 }
//                 .animate-float { animation: float 3s ease-in-out infinite; }

//                 @keyframes bounce-soft {
//                     0%, 100% { transform: translateY(0); }
//                     50% { transform: translateY(-3px); }
//                 }
//                 .animate-bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }

//                 @keyframes tilt {
//                     0%, 100% { transform: rotate(0deg); }
//                     50% { transform: rotate(10deg); }
//                 }
//                 .animate-tilt { animation: tilt 3s ease-in-out infinite; }

//                 @keyframes shake {
//                     0%, 100% { transform: translateX(0); }
//                     25% { transform: translateX(-2px); }
//                     75% { transform: translateX(2px); }
//                 }
//                 .animate-shake { animation: shake 0.5s ease-in-out infinite; }

//                 @keyframes slideDown {
//                     from { opacity: 0; transform: translateY(-15px); }
//                     to { opacity: 1; transform: translateY(0); }
//                 }
//                 .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
//             `}</style>
//         </>
//     );
// };

// export default memo(Navbar);


// import React, { useCallback, memo, useState } from 'react';
// import {
//     Search, User, Heart, ShoppingCart, Menu, X, Phone, Mail, Clock,
//     ChevronRight, Home, Flame, Package, Tag, Ticket, HeadphonesIcon,
//     Smartphone, ChefHat, Shirt, Dumbbell, Plane, Book, Baby, Car, Box, Gift,
//     MapPin
// } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import logo from "../assets/logo2.png";


// // --- Sub-Components ---

// const ActionIcon = memo(({ item }) => (
//     <div className="flex flex-col items-center cursor-pointer relative group text-black hover:text-[#F7A221] transition-colors">
//         <div className="p-2 rounded-xl group-hover:bg-gray-50 transition-all">
//             {item.icon}
//         </div>
//         {item.count !== undefined && (
//             <span className={`absolute top-1 right-2 ${item.badge} text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm`}>
//                 {item.count}
//             </span>
//         )}
//         <span className="text-[10px] mt-0.5 font-bold uppercase tracking-tighter">{item.label}</span>
//     </div>
// ));

// const MegaDropdown = ({ isOpen }) => {
//     if (!isOpen) return null;

//     const categories = [
//         { label: "Smart Life - Gadgets", icon: <Smartphone size={18} className="text-blue-600" /> },
//         { label: "Home & Kitchen", icon: <ChefHat size={18} className="text-red-600" /> },
//         { label: "Fashion World", icon: <Shirt size={18} className="text-[#F7A221]" /> },
//         { label: "Sports & Fitness", icon: <Dumbbell size={18} className="text-blue-600" /> },
//         { label: "Tours & Travels", icon: <Plane size={18} className="text-[#F7A221]" /> },
//         { label: "Stationary", icon: <Book size={18} className="text-red-600" /> },
//         { label: "Baby Items", icon: <Baby size={18} className="text-blue-600" /> },
//         { label: "Car Accessories", icon: <Car size={18} className="text-[#F7A221]" /> },
//         { label: "Mix Items Daily use", icon: <Box size={18} className="text-red-600" /> },
//         { label: "Gifts", icon: <Gift size={18} className="text-blue-600" /> }
//     ];

//     return (
//         <div className="absolute top-[100%] left-0 w-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-t-2 border-[#F7A221] animate-slideDown z-50">
//             <div className="container mx-auto px-4 py-10">
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
//                     {categories.map((category, index) => (
//                         <a 
//                             key={index} 
//                             href="#" 
//                             className="flex items-center gap-4 p-4 rounded-2xl hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100 shadow-sm"
//                         >
//                             <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all">
//                                 {category.icon}
//                             </div>
//                             <span className="font-bold text-black group-hover:text-[#F7A221] transition-colors text-[13px] uppercase tracking-tight">
//                                 {category.label}
//                             </span>
//                         </a>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// };

// const NavItemWithDropdown = ({ link }) => {
//     const [isOpen, setIsOpen] = useState(false);
    
//     return (
//         <div 
//             className="static"
//             onMouseEnter={() => setIsOpen(true)}
//             onMouseLeave={() => setIsOpen(false)}
//         >
//             <Link to={link.path} className="nav-link flex items-center gap-2 group">
//                 <div className={`transition-all duration-300 ${isOpen ? 'scale-110 rotate-12' : ''}`}>
//                     {link.icon}
//                 </div>
//                 <span className="font-black text-white group-hover:text-black transition-colors">{link.label}</span>
//                 <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-black' : 'text-white/70'}`} />
//             </Link>
//             <MegaDropdown isOpen={isOpen} />
//         </div>
//     );
// };

// const Navbar = ({ searchQuery, setSearchQuery, isMenuOpen, setIsMenuOpen }) => {
    
//     const handleSearchChange = useCallback((e) => {
//         setSearchQuery(e.target.value);
//     }, [setSearchQuery]);

//     const actionIcons = [
//         { icon: <User size={24} />, label: "Account" },
//         { icon: <Heart size={24} />, label: "Wishlist", count: 0, badge: "bg-red-600" },
//         { icon: <ShoppingCart size={24} />, label: "Cart", count: 0, badge: "bg-black" }
//     ];

//     const bottomNavLinks = [
//         { label: "Todays' Deal", path: "/", icon: <Tag size={18} /> },
//         { label: "Just Arrived", path: "/", icon: <Package size={18} className="text-white" /> },
//         { label: "Sale", path: "/", icon:  <Flame size={18} className="text-white" />},
//         { label: "Coupons", path: "/", icon: <Ticket size={18} className="text-white" /> },
//         { label: "Customer Care", path: "/customer-care", icon: <HeadphonesIcon size={18} className="text-white" /> }
//     ];

//     return (
//         <>
//             {/* Top Info Bar - Black Background for Premium Look */}
//             <div className="bg-black text-white py-2 px-4 hidden md:block border-b border-white/10">
//                 <div className="container mx-auto flex justify-between text-[11px] font-bold uppercase tracking-wider">
//                     <div className="flex items-center gap-8">
//                         <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors">
//                             <Phone size={12} className="text-[#F7A221]" /> +91 93200 01717
//                         </span>
//                         <span className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors">
//                             <Mail size={12} className="text-[#F7A221]" /> support@offerwale.com
//                         </span>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <Clock size={12} className="text-[#F7A221]" /> <span className="text-white/90">Pan India Delivery • 24/7 Support</span>
//                     </div>
//                 </div>
//             </div>

//             <header className="bg-white sticky top-0 z-50 text-black shadow-md">
//                 <div className="container mx-auto px-4"> 
//                     <div className="flex items-center justify-between gap-8 h-24">
                        
//                         {/* Logo Section */}
//                         <div className="flex items-center gap-4">
//                             <Link to="/" className="flex-shrink-0 flex items-center justify-center p-1">
//                                 <img 
//                                     className="object-contain" 
//                                     style={{ 
//                                         width: '160px',
//                                         height: 'auto', 
//                                         maxHeight: '85px',
//                                         filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' 
//                                     }} 
//                                     src={logo} alt="Logo" 
//                                 />
//                             </Link>

//                             {/* Location Section */}
//                             <div className="hidden xl:flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-all border border-transparent hover:border-gray-100">
//                                 <MapPin size={22} className="text-red-600" />
//                                 <div className="flex flex-col">
//                                     <span className="text-[10px] text-gray-500 font-bold uppercase leading-none">Deliver to</span>
//                                     <span className="text-sm font-black text-gray-900 leading-tight">Ulhasnagar 421004</span>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Search Bar - Focused Orange Border */}
//                         <div className="flex-1 max-w-xl relative hidden md:block">
//                             <input
//                                 type="text"
//                                 placeholder="Search products, brands and more..."
//                                 className="w-full py-4 px-14 rounded-2xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-[#F7A221] focus:bg-white transition-all font-bold text-sm"
//                                 value={searchQuery}
//                                 onChange={handleSearchChange}
//                             />
//                             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//                             <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white py-2.5 px-6 rounded-xl hover:bg-[#F7A221] transition-all shadow-md font-bold text-xs uppercase">
//                                 Search
//                             </button>
//                         </div>

//                         {/* Action Icons */}
//                         <div className="flex items-center gap-4 lg:gap-8">
//                             {actionIcons.map((item, idx) => <ActionIcon key={idx} item={item} />)}
//                             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-black bg-gray-100 rounded-xl">
//                                 {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
//                             </button>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Bottom Nav Bar - Theme Background */}
//                 <nav className="bg-[#F7A221] shadow-inner hidden md:block relative">
//                     <div className="container mx-auto px-4">
//                         <div className="flex items-center justify-center gap-2 py-2">
//                             <NavItemWithDropdown 
//                                 link={{ label: "All Categories", path: "/products", icon: <Home size={18} className="text-white" /> }} 
//                             />
                            
//                             <div className="h-6 w-[1px] bg-white/20 mx-2"></div>
                            
//                             {bottomNavLinks.map((link, idx) => (
//                                 <Link 
//                                     key={idx} 
//                                     to={link.path} 
//                                     className="nav-link flex items-center gap-2 hover:bg-white/10"
//                                 >
//                                     {link.icon}
//                                     <span className="font-bold text-white">{link.label}</span>
//                                 </Link>
//                             ))}
//                         </div>
//                     </div>
//                 </nav>
//             </header>

//             <style jsx>{`
//                 .nav-link {
//                     padding: 10px 18px;
//                     font-size: 12px;
//                     font-weight: 800;
//                     text-transform: uppercase;
//                     border-radius: 12px;
//                     transition: all 0.2s ease-in-out;
//                     letter-spacing: 0.03em;
//                     color: #ffffff !important;
//                 }
//                 .nav-link:hover {
//                     background: rgba(0, 0, 0, 0.05);
//                     transform: translateY(-1px);
//                 }
//                 @keyframes slideDown {
//                     from { opacity: 0; transform: translateY(-10px); }
//                     to { opacity: 1; transform: translateY(0); }
//                 }
//                 .animate-slideDown { animation: slideDown 0.3s cubic-bezier(0, 0, 0.2, 1) forwards; }
//             `}</style>
//         </>
//     );
// };

// export default memo(Navbar);

// import React, { useCallback, memo, useState } from 'react';
// import {
//     Search, User, Heart, ShoppingCart, Menu, X, Phone, Mail, Clock,
//     ChevronRight, Home, Flame, Package, Tag, Ticket, HeadphonesIcon,
//     Smartphone, ChefHat, Shirt, Dumbbell, Plane, Book, Baby, Car, Box, Gift,
//     MapPin
// } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import logo from "../assets/logo2.png";


// // --- Sub-Components ---

// const ActionIcon = memo(({ item }) => (
//     <div className="flex flex-col items-center cursor-pointer relative group text-black hover:text-blue-600 transition-colors">
//         <div className="p-2 rounded-xl group-hover:bg-gray-100 transition-all">
//             {item.icon}
//         </div>
//         {item.count !== undefined && (
//             <span className={`absolute top-1 right-2 ${item.badge} ${item.badgeText || 'text-white'} text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm`}>
//                 {item.count}
//             </span>
//         )}
//         <span className="text-[10px] mt-0.5 font-bold uppercase tracking-tighter">{item.label}</span>
//     </div>
// ));

// const MegaDropdown = ({ isOpen }) => {
//     if (!isOpen) return null;

//     const categories = [
//         { label: "Smart Life - Gadgets", icon: <Smartphone size={18}  /> },
//         { label: "Home & Kitchen", icon: <ChefHat size={18}  /> },
//         { label: "Fashion World", icon: <Shirt size={18}  /> },
//         { label: "Sports & Fitness", icon: <Dumbbell size={18} /> },
//         { label: "Tours & Travels", icon: <Plane size={18}  /> },
//         { label: "Stationary", icon: <Book size={18}  /> },
//         { label: "Baby Items", icon: <Baby size={18}  /> },
//         { label: "Car Accessories", icon: <Car size={18} /> },
//         { label: "Mix Items Daily use", icon: <Box size={18}  /> },
//         { label: "Gifts", icon: <Gift size={18}  /> }
//     ];

//     return (
//         <div className="absolute top-[100%] left-0 w-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-t border-gray-100 animate-slideDown z-50">
//             <div className="container mx-auto px-4 py-10">
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
//                     {categories.map((category, index) => (
//                         <a 
//                             key={index} 
//                             href="#" 
//                             className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all group border border-transparent hover:border-gray-100 shadow-sm hover:shadow-md"
//                         >
//                             <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
//                                 {category.icon}
//                             </div>
//                             <span className="font-bold text-black group-hover:text-blue-600 transition-colors text-[13px] uppercase tracking-tight">
//                                 {category.label}
//                             </span>
//                         </a>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// };

// const NavItemWithDropdown = ({ link }) => {
//     const [isOpen, setIsOpen] = useState(false);
    
//     return (
//         <div 
//             className="static"
//             onMouseEnter={() => setIsOpen(true)}
//             onMouseLeave={() => setIsOpen(false)}
//         >
//             <Link to={link.path} className="nav-link flex items-center gap-2 group text-black">
//                 <div className={`transition-all duration-300 ${isOpen ? 'scale-110 rotate-12' : ''}`}>
//                     {link.icon}
//                 </div>
//                 <span className="font-black text-black group-hover:text-blue-600 transition-colors">{link.label}</span>
//                 <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-blue-600' : 'text-gray-400'}`} />
//             </Link>
//             <MegaDropdown isOpen={isOpen} />
//         </div>
//     );
// };

// const Navbar = ({ searchQuery, setSearchQuery, isMenuOpen, setIsMenuOpen }) => {
    
//     const handleSearchChange = useCallback((e) => {
//         setSearchQuery(e.target.value);
//     }, [setSearchQuery]);

//     const actionIcons = [
//         { icon: <User size={24} />, label: "Account" },
//         { icon: <Heart size={24} />, label: "Wishlist", count: 0, badge: "bg-red-500" },
//         { icon: <ShoppingCart size={24} />, label: "Cart", count: 0, badge: "bg-blue-600", badgeText: "text-white" }
//     ];

//     const bottomNavLinks = [
//         { label: "Todays' Deal", path: "/", icon: <Flame size={18} className="text-orange-500" />, color: "text-black hover:text-orange-500" },
//         { label: "Just Arrived", path: "/", icon: <Package size={18} className="text-green-600" />, color: "text-black hover:text-green-600" },
//         { label: "Sale", path: "/", icon: <Tag size={18} className="text-red-600" />, color: "text-black hover:text-red-600" },
//         { label: "Coupons", path: "/", icon: <Ticket size={18} className="text-yellow-600" />, color: "text-black hover:text-yellow-600" },
//         { label: "Customer Care", path: "/customer-care", icon: <HeadphonesIcon size={18} className="text-blue-500" />, color: "text-black hover:text-blue-500" }
//     ];

//     return (
//         <>
//             {/* Top Info Bar */}
//             <div className="bg-gray-50 border-b border-gray-100 py-2 px-4 hidden md:block">
//                 <div className="container mx-auto flex justify-between text-[11px] text-gray-600 font-bold uppercase tracking-wider">
//                     <div className="flex items-center gap-8">
//                         <span className="flex items-center gap-2 hover:text-blue-600 cursor-pointer transition-colors">
//                             <Phone size={12} className="text-blue-600" /> +91 93200 01717
//                         </span>
//                         <span className="flex items-center gap-2 hover:text-blue-600 cursor-pointer transition-colors">
//                             <Mail size={12} className="text-blue-600" /> support@offerwale.com
//                         </span>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <Clock size={12} className="text-red-500" /> Pan India Delivery • 24/7 Support
//                     </div>
//                 </div>
//             </div>

//             <header className="bg-white sticky top-0 z-50 text-black shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-b border-gray-100">
//                 <div className="container mx-auto px-4"> 
//                     <div className="flex items-center justify-between gap-8 h-24"> {/* Increased height to h-24 */}
                        
//                         {/* Huge Logo Section */}
//                         <div className="flex items-center gap-4">
//                             <Link to="/" className="flex-shrink-0 flex items-center justify-center p-1">
//                                 <img 
//                                     className="object-contain transition-transform" 
//                                     style={{ 
//                                         width: '160px', // Massive Logo Size
//                                         height: 'auto', 
//                                         maxHeight: '85px', // Uses the container space efficiently
//                                         filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' 
//                                     }} 
//                                     src={logo} alt="Logo" 
//                                 />
//                             </Link>

//                             {/* Location Section */}
//                             <div className="hidden xl:flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-all border border-transparent hover:border-gray-100">
//                                 <MapPin size={22} className="text-red-600" />
//                                 <div className="flex flex-col">
//                                     <span className="text-[10px] text-gray-500 font-bold uppercase leading-none">Deliver to</span>
//                                     <span className="text-sm font-black text-gray-900 leading-tight">Ulhasnagar 421004</span>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Search Bar */}
//                         <div className="flex-1 max-w-xl relative hidden md:block">
//                             <input
//                                 type="text"
//                                 placeholder="Search products, brands and more..."
//                                 className="w-full py-4 px-14 rounded-2xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-blue-600/20 focus:bg-white transition-all font-bold text-sm"
//                                 value={searchQuery}
//                                 onChange={handleSearchChange}
//                             />
//                             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//                             <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white py-2.5 px-6 rounded-xl hover:bg-blue-700 transition-all shadow-md font-bold text-xs uppercase">
//                                 Search
//                             </button>
//                         </div>

//                         {/* Action Icons */}
//                         <div className="flex items-center gap-4 lg:gap-8">
//                             {actionIcons.map((item, idx) => <ActionIcon key={idx} item={item} />)}
//                             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-black bg-gray-100 rounded-xl">
//                                 {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
//                             </button>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Bottom Nav Bar */}
//                 <nav className="bg-[#F7A221] border-t border-gray-50 hidden md:block relative">
//                     <div className="container mx-auto px-4">
//                         <div className="flex items-center justify-center gap-4 py-2">
//                             <NavItemWithDropdown 
//                                 link={{ label: "All Categories", path: "/products", icon: <Home size={18} className="text-blue-600" /> }} 
//                             />
//                             <div className="h-4 w-[1px] bg-gray-200 mx-2"></div>
//                             {bottomNavLinks.map((link, idx) => (
//                                 <Link 
//                                     key={idx} 
//                                     to={link.path} 
//                                     className={`nav-link flex items-center gap-2 ${link.color}`}
//                                 >
//                                     {link.icon}
//                                     <span className="font-bold">{link.label}</span>
//                                 </Link>
//                             ))}
//                         </div>
//                     </div>
//                 </nav>
//             </header>

//             <style jsx>{`
//                 .nav-link {
//                     padding: 8px 16px;
//                     font-size: 12px;
//                     font-weight: 800;
//                     text-transform: uppercase;
//                     border-radius: 12px;
//                     transition: all 0.3s ease;
//                     letter-spacing: 0.025em;
//                     color: #000000 !important;
//                 }
//                 .nav-link:hover {
//                     background: #f8fafc;
//                     transform: translateY(-1px);
//                 }
//                 @keyframes slideDown {
//                     from { opacity: 0; transform: translateY(-10px); }
//                     to { opacity: 1; transform: translateY(0); }
//                 }
//                 .animate-slideDown { animation: slideDown 0.3s cubic-bezier(0, 0, 0.2, 1) forwards; }
//             `}</style>
//         </>
//     );
// };

// export default memo(Navbar);
// import React from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import {
//     Search,
//     User,
//     Heart,
//     ShoppingCart,
//     Menu,
//     X,
//     Phone,
//     Mail,
//     Clock,
//     ChevronRight,
//     Zap
// } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import logo1 from "../assets/logo1.jpg"
// import logo from "../assets/logo.jpg"

// const Navbar = ({ searchQuery, setSearchQuery, isMenuOpen, setIsMenuOpen }) => {
//     return (
//         <>
//             {/* Top Info Bar (Simplified) */}
//             <div className="bg-white border-b border-gray-100 py-1.5 px-4 hidden md:block">
//                 <div className="container mx-auto flex justify-between text-[11px] text-gray-500 font-medium">
//                     <div className="flex items-center gap-6">
//                         <span className="flex items-center gap-1.5 hover:text-secondary cursor-pointer transition-colors">
//                             <Phone size={12} className="text-secondary" /> +91 91730 00000
//                         </span>
//                         <span className="flex items-center gap-1.5 hover:text-secondary cursor-pointer transition-colors">
//                             <Mail size={12} className="text-secondary" /> support@offerwale.com
//                         </span>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <span className="flex items-center gap-1.5 uppercase tracking-tight">
//                             <Clock size={12} className="text-secondary" /> Pan India Delivery • 7 Days Support
//                         </span>
//                     </div>
//                 </div>
//             </div>

//             {/* Primary Header */}
//             <motion.header
//                 initial={{ y: -100, opacity: 0 }}
//                 animate={{ y: 0, opacity: 1 }}
//                 transition={{ duration: 0.8, ease: "circOut" }}
//                 className="bg-primary/95 backdrop-blur-xl sticky top-0 z-50 text-white shadow-2xl border-b border-white/5"
//             >
//                 <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
//                     <div className="flex items-center justify-between gap-8">
//                         {/* Logo */}
//                         <motion.div
//                             whileHover={{ scale: 1.05 }}
//                             whileTap={{ scale: 0.95 }}
//                             className="flex items-center gap-2 cursor-pointer"
//                         >
//                             {/* <div className="bg-secondary p-1.5 rounded-lg shadow-inner">
//                                 <Zap size={24} fill="currentColor" />
//                             </div>
//                             <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
//                                 OFFERWALE <span className="text-accent underline decoration-secondary underline-offset-4">BABA</span>
//                             </h1> */}
//                             <img style={{borderRadius:"50%"}} width="50px" src={logo} alt="" />

//                         </motion.div>

//                         {/* Search Bar */}
//                         <div className="flex-1 max-w-2xl relative hidden md:block">
//                             <div className="flex">
//                                 <input
//                                     type="text"
//                                     placeholder="Search for kitchen, household, toys and more..."
//                                     className="w-full py-3 px-6 rounded-l-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent transition-all pl-12 bg-white/90 backdrop-blur-md shadow-inner font-medium"
//                                     value={searchQuery}
//                                     onChange={(e) => setSearchQuery(e.target.value)}
//                                 />
//                                 <motion.button
//                                     whileHover={{ backgroundColor: '#c2181d', scale: 1.02 }}
//                                     whileTap={{ scale: 0.98 }}
//                                     className="bg-secondary px-8 rounded-r-2xl transition-all flex items-center justify-center shadow-lg"
//                                 >
//                                     <Search size={20} />
//                                 </motion.button>
//                             </div>
//                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//                         </div>

//                         {/* Action Icons */}
//                         <div className="flex items-center gap-5">
//                             {[
//                                 { icon: <User size={24} />, label: "Login" },
//                                 { icon: <Heart size={24} />, label: "Wishlist", count: 0, badge: "bg-secondary" },
//                                 { icon: <ShoppingCart size={24} />, label: "My Cart", count: 0, badge: "bg-accent", badgeText: "text-primary" }
//                             ].map((item, idx) => (
//                                 <motion.div
//                                     key={idx}
//                                     whileHover={{ y: -3, color: '#09cdff' }}
//                                     className="flex flex-col items-center cursor-pointer relative group transition-colors"
//                                 >
//                                     {item.icon}
//                                     {item.count !== undefined && (
//                                         <span className={`absolute -top-1 -right-1 ${item.badge} ${item.badgeText || 'text-white'} text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-primary font-bold`}>
//                                             {item.count}
//                                         </span>
//                                     )}
//                                     <span className="text-[10px] mt-0.5 font-semibold uppercase">{item.label}</span>
//                                 </motion.div>
//                             ))}
//                             <motion.div
//                                 whileTap={{ scale: 0.9 }}
//                                 onClick={() => setIsMenuOpen(!isMenuOpen)}
//                                 className="md:hidden cursor-pointer p-2 bg-white/10 rounded-xl"
//                             >
//                                 {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
//                             </motion.div>
//                         </div>
//                     </div>

//                     {/* Mobile Menu Drawer */}
//                     <AnimatePresence>
//                         {isMenuOpen && (
//                             <motion.div
//                                 initial={{ opacity: 0, height: 0 }}
//                                 animate={{ opacity: 1, height: 'auto' }}
//                                 exit={{ opacity: 0, height: 0 }}
//                                 className="md:hidden bg-primary-light rounded-2xl overflow-hidden mt-2 border border-white/5"
//                             >
//                                 <div className="flex flex-col p-6 space-y-6">
//                                     {/* Reinstated Mobile Search in Drawer */}
//                                     <div className="relative">
//                                         <input
//                                             type="text"
//                                             placeholder="Search for smart gadgets..."
//                                             className="w-full py-4 px-12 rounded-2xl text-gray-800 text-sm focus:outline-none bg-white shadow-xl font-bold"
//                                         />
//                                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
//                                     </div>

//                                     <div className="flex flex-col space-y-4">
//                                         {["Just Arrived", "Best Seller", "Kitchen", "Household", "Toys", "Fitness", "Bulk Inquiry"].map((item, i) => (
//                                             <motion.a
//                                                 initial={{ x: -20, opacity: 0 }}
//                                                 animate={{ x: 0, opacity: 1 }}
//                                                 transition={{ delay: i * 0.1 }}
//                                                 key={item}
//                                                 href="#"
//                                                 className="text-lg font-black text-white hover:text-accent transition-colors flex items-center justify-between"
//                                             >
//                                                 {item} <ChevronRight size={16} className="text-secondary" />
//                                             </motion.a>
//                                         ))}
//                                     </div>
//                                     <button className="bg-secondary text-white font-black py-4 rounded-2xl mt-4 shadow-xl active:scale-95 transition-all">LOGIN / SIGNUP</button>
//                                 </div>
//                             </motion.div>
//                         )}
//                     </AnimatePresence>
//                 </div>

//                 {/* Bottom Nav Bar */}
//                 <nav className="bg-primary-light/50 hidden md:block border-t border-white/5">
//                     <div className="container mx-auto px-4 overflow-x-auto">
//                         <motion.div
//                             initial={{ opacity: 0 }}
//                             animate={{ opacity: 1 }}
//                             transition={{ delay: 0.5 }}
//                             className="flex items-center gap-8 py-3 whitespace-nowrap"
//                         >
//                             {[
//               { label: "All Products", path: "/" },
//               { label: "Todays' Deal", path: "/" },
//               { label: "Just Arrived", path: "/", color: "text-accent border-b-2 border-accent" },
//               { label: "Sale", path: "/" },
//               { label: "Coupons", path: "/" },
//               { label: "Customer Care", path: "/customer-care" },
//             ].map((link, idx) => (
//               <Link 
//                 key={idx} 
//                 to={link.path} 
//                 className={`nav-link ${link.color || ''}`}
//               >
//                 {link.label}
//               </Link>
//                             ))}
//                         </motion.div>
//                     </div>
//                 </nav>
//             </motion.header>
//         </>
//     );
// };

// export default Navbar;
