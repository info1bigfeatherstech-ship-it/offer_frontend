import React, { useCallback, memo, useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { forceLogout } from '../REDUX_FEATURES/REDUX_SLICES/authSlice';
import {
  selectWishlistCount,
  selectWishlistGuestItems,
} from '../REDUX_FEATURES/REDUX_SLICES/userWishlistSlice';
import { fetchAllCategories, selectHierarchicalCategories } from "../REDUX_FEATURES/REDUX_SLICES/userCategoriesSlice";
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

// ── Category Pill Chips — used inside MegaDropdown ────────────────────────────
const CategoryPills = ({ topCategories, bottomCategories }) => {
  const allCategories = [...topCategories, ...bottomCategories];

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Shop by Category
        </p>
        <div className="h-px flex-1 ml-4 bg-gray-200" />
      </div>
      <div className="flex flex-wrap gap-2">
        {allCategories.map((cat, i) => (
          <Link
            key={i}
            to={cat.path}
            className="category-pill inline-flex items-center px-8 py-5 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-[#F7A221] hover:text-white hover:border-[#F7A221] transition-all duration-200 active:scale-[.96] whitespace-nowrap"
          >
            {cat.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

// ── Mega Dropdown — pill chip layout ─────────────────────────────────────────
const MegaDropdown = ({ isOpen, topCategories, bottomCategories }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 w-screen bg-white border-t border-gray-200 shadow-2xl z-50 hidden lg:block animate-slideDown">
      <CategoryPills topCategories={topCategories} bottomCategories={bottomCategories} />
    </div>
  );
};

// ── All Categories nav item ────────────────────────────────────────────────────
const NavItemWithDropdown = ({ link, topCategories, bottomCategories }) => {
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

      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <MegaDropdown
          isOpen={isOpen}
          topCategories={topCategories}
          bottomCategories={bottomCategories}
        />
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
  const accountDropdownMobileRef = useRef(null);
  const accountDropdownDesktopRef = useRef(null);
  const wishlistCount = useSelector(selectWishlistCount);
  const guestItems = useSelector(selectWishlistGuestItems);
  const cartCount = useSelector(selectDisplayCartCount);
  const userAddress = useSelector(selectDefaultAddress);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishCartOpen, setIsWishCartOpen] = useState(false);
  const displayCount = isLoggedIn ? wishlistCount : guestItems.length;
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showSearchTooltip, setShowSearchTooltip] = useState(false);

  // ── Dynamic categories from Redux ──────────────────────────────────────────
  const allCategories = useSelector(selectHierarchicalCategories);

  useEffect(() => {
    if (allCategories.length === 0) {
      dispatch(fetchAllCategories());
    }
  }, [dispatch, allCategories.length]);

  const activeCategories = allCategories.filter(cat => cat.status === 'active');
  const half = Math.ceil(activeCategories.length / 2);

  const topCategories = activeCategories.slice(0, half).map(cat => ({
    label: cat.name,
    path: `/category/${cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}`
  }));
  const bottomCategories = activeCategories.slice(half).map(cat => ({
    label: cat.name,
    path: `/category/${cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}`
  }));
  const mobileCategories = activeCategories.map(cat => ({
    label: cat.name,
    path: `/category/${cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}`
  }));

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
      const inDropdown =
        accountDropdownMobileRef.current?.contains(target) ||
        accountDropdownDesktopRef.current?.contains(target);
      if (!inTrigger && !inDropdown) {
        setIsAccountDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  return (
    <>
      {/* ── Top Info Bar (tablet + desktop) ─────────────────────────────────── */}
      <div className="bg-black text-white py-2 lg:py-3 px-4 hidden md:block border-b border-white/10">
        <div className="container mx-auto flex justify-between items-center text-[10px] lg:text-[11px] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-4 lg:gap-8 z-99">
            <a href="tel:+919370686008" className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition- group">
              <Phone size={12} className="text-[#F7A221] group-hover:animate-" />  +91 93706 86008
            </a>
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

              {/* Logo */}
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

              {/* Inline search bar — tablet only (md → lg) */}
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

              {/* Centered search trigger — phones only */}
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
                    dropdownRef={accountDropdownMobileRef}
                  />
                )}
              </div>
            </div>

            {/* ── Mobile Category Pills Row ────────────────────────────────── */}
            {/* {mobileCategories.length > 0 && (
              <div className="py-2.5 border-b border-gray-100">
                <div
                  className="flex gap-2 overflow-x-auto scrollbar-hide px-1"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {mobileCategories.map((cat, i) => (
                    <Link
                      key={i}
                      to={cat.path}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 hover:bg-[#F7A221] hover:text-white hover:border-[#F7A221] transition-all duration-200 whitespace-nowrap active:scale-[.95]"
                    >
                      {cat.label}
                    </Link>
                  ))}
                </div>
              </div>
            )} */}
          </div>

          {/* ══ DESKTOP LAYOUT (lg:flex) ══════════════════════════════════════ */}
          <div className="hidden lg:flex items-center justify-between lg:gap-3 xl:gap-6 2xl:gap-8 h-24 overflow-visible">

            {/* Logo */}
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
                  dropdownRef={accountDropdownDesktopRef}
                />
              )}
            </div>
          </div>
        </div>

        {/* ══ DESKTOP BOTTOM NAV ════════════════════════════════════════════════ */}
        <nav className="hidden lg:block relative w-full">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between lg:gap-3 xl:gap-6 2xl:gap-8 py-2">

              {/* Logo Spacer */}
              <div className="w-[110px] xl:w-[140px] 2xl:w-[175px] shrink-0" aria-hidden="true" />

              {/* Left Zone: Home + All Categories */}
              <div className="flex items-center gap-1 xl:gap-2 shrink-0 min-w-0">

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

                <div className="h-6 w-[1px] bg-gray-200 mx-0.5 lg:mx-1 shrink-0" />

                <NavItemWithDropdown
                  link={{ label: "All Categories" }}
                  topCategories={topCategories}
                  bottomCategories={bottomCategories}
                />
              </div>

              {/* Center Zone: Deal/Arrived/Sale */}
              <div className="flex-1 lg:max-w-sm xl:max-w-lg 2xl:max-w-xl flex items-center justify-start gap-1 lg:gap-2 xl:gap-4 min-w-0">
                {bottomNavLinks.map((link, idx) => (
                  <Link
                    key={idx}
                    to={link.path}
                    className="shrink-0 text-center justify-center flex items-center px-1 lg:px-1.5 xl:px-3 py-2 lg:py-2.5 gap-1 lg:gap-1.5 xl:gap-2 hover:bg-gray-50 rounded-xl transition-all duration-200 group whitespace-nowrap"
                  >
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

              {/* Right Zone: Contact us */}
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

                {/* Quick links */}
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

                {/* Categories — pill chips in sidebar */}
                <div className="pt-4 border-t">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">🔥 Top Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {mobileCategories.map((cat, i) => (
                      <div
                        key={i}
                        onClick={() => { setIsMenuOpen(false); setTimeout(() => navigate(cat.path), 150); }}
                        className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 hover:bg-[#F7A221] hover:text-white hover:border-[#F7A221] transition-all cursor-pointer whitespace-nowrap active:scale-[.95]"
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
                      <a href="tel:+919370686008" className="text-sm font-black">+91 93706 86008</a>
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
        .home-nav-btn {
          transition: all 0.25s ease;
        }
        .home-nav-btn:hover {
          transform: translateY(-2px);
        }
        .all-cat-btn {
          letter-spacing: 0.03em;
        }
        .all-cat-btn:hover {
          transform: translateY(-1px);
        }
        .category-pill {
          transition: all 0.2s ease;
        }
        .category-pill:hover {
          transform: translateY(-1px);
        }
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
// import navLogoVideo from "../../assets/Video2.mp4";
// import homeIcon from "../../assets/home (2).png";
// import Coupon from "../../assets/Tickets.gif";
// import Contact from "../../assets/Contact.gif";
// import SaleIcon from "../../assets/Shopping bag.gif";
// import audio from "../../assets/headphone.png";
// import deal from "../../assets/Discount.gif";
// import arrivals from "../../assets/Product (5).gif";
// import justarrivedIcon from "../../assets/just-arrived (1).png";
// import dealIcon from "../../assets/deal.png";
// import saleIcon from "../../assets/sale.png";
// import coupanIcon from "../../assets/coupon.png";
// import customercareIcon from "../../assets/service.png";
// import discountBannerIcon from "../../assets/discount-voucher.png";
// import WishlistSidebar from './WishlistSidebar';
// import { selectDefaultAddress, fetchAddresses } from '../REDUX_FEATURES/REDUX_SLICES/Useraddressslice';
// import SearchModal from './Search_Modal/SearchModal';
// import MobileBottomNav from './Mobilebottomnav';

// // ─────────────────────────────────────────────────────────────────────────────
// // Sub-Components
// // ─────────────────────────────────────────────────────────────────────────────

// const ActionIcon = memo(({ item, onClick, isLoggedIn }) => (
//   <div
//     onClick={onClick}
//     className="flex flex-col items-center cursor-pointer relative group text-black hover:text-[#F7A221] transition-colors min-w-[40px] xl:min-w-[50px]"
//   >
//     <div className="p-1 lg:p-1.5 xl:p-2 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
//       {item.icon}
//     </div>
//     {item.count !== undefined && (
//       <span className={`absolute top-0 right-0 lg:right-1 xl:top-1 xl:right-2 ${item.badge} text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm group-hover:animate-bounce`}>
//         {item.count}
//       </span>
//     )}
//     <span className="text-[9px] lg:text-[10px] mt-0.5 font-bold uppercase tracking-tighter whitespace-nowrap">
//       {item.label}
//     </span>
//   </div>
// ));

// // ── User Account Dropdown ─────────────────────────────────────────────────────
// const UserAccountDropdown = ({ user, onLogout, onClose, dropdownRef }) => {
//   const navigate = useNavigate();

//   const menuItems = [
//     { icon: <UserCircle size={16} />, label: 'My Profile',  path: '/account/userprofile' },
//     { icon: <Heart size={16} />,       label: 'My Wishlist', path: '/account/userwishlist' },
//     { icon: <ShoppingCart size={16} />,label: 'My Orders',   path: '/account/userorders' },
//   ];

//   return (
//     <div
//       ref={dropdownRef}
//       className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[500] animate-slideDown"
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

// // ── Location Display ──────────────────────────────────────────────────────────
// const LocationDisplay = ({ isLoggedIn, onOpenAuth, userAddress }) => {
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [isAnimating, setIsAnimating] = useState(false);
//   let navigate = useNavigate();

//   let handleAddress = () => {
//     if (isLoggedIn) { navigate('/account/useraddress'); }
//     else { onOpenAuth(); }
//   };

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
//   let address = getDisplayAddress();

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
//     <div className="hidden xl:flex items-center gap-3 bg-white cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-xl transition-all hover:border-gray-300 group">
//       <MapPin size={20} className="text-red-500 animate-bounce" />
//       <div onClick={handleAddress} className="flex flex-col w-44 overflow-hidden">
//         <span className="text-[10px] text-gray-500 font-semibold uppercase leading-none">Deliver to</span>
//         <div className="flex items-center mt-1">
//           {!isLoggedIn && (
//             <span className="text-sm font-medium text-gray-700 mr-1 whitespace-nowrap">Your</span>
//           )}
//           <div className="relative h-[20px] overflow-hidden flex-1">
//             <span
//               className="absolute left-0 w-full text-sm font-semibold text-gray-900 leading-[20px] transition-transform duration-500 ease-in-out"
//               style={{
//                 top: 0,
//                 transform: isAnimating && !isLoggedIn || isAnimating && (isLoggedIn && address === "SELECT ADDRESS") ? "translateY(-100%)" : "translateY(0)",
//               }}
//             >
//               {isLoggedIn && !(isLoggedIn && address === "SELECT ADDRESS") ? address : destinations[currentIndex]}
//             </span>
//             <span
//               className="absolute left-0 w-full text-sm font-semibold text-gray-900 leading-[20px] transition-transform duration-500 ease-in-out"
//               style={{
//                 top: "100%",
//                 transform: isAnimating && !isLoggedIn ? "translateY(-100%)" : "translateY(0)",
//                 transitionDelay: isAnimating && !isLoggedIn ? "0.25s" : "0s",
//               }}
//             >
//               {isLoggedIn ? address : destinations[(currentIndex + 1) % destinations.length]}
//             </span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ── Mega Dropdown — 6 top + 5 bottom ─────────────────────────────────────────
// const MegaDropdown = ({ isOpen }) => {
//   if (!isOpen) return null;

//   // Row 1 — first 6 categories
//   const topCategories = [
//     { label: "Home & Kitchen",        path: "/category/home-and-kitchen" },
//     { label: "Smart Life Gadgets",   path: "/category/smart-life-gadgets" },
//     { label: "Baby Items",                        path: "/category/baby-items" },
//     { label: "Stationary",            path: "/category/stationary" },
//     { label: "Cleaning & Housekeeping Supplies",  path: "/category/cleaning-and-housekeeping-supplies" },
//     { label: "Sports & Fitness",      path: "/category/sports-and-fitness" },
 
//   ];

//   // Row 2 — remaining 5 categories
//   const bottomCategories = [
//      { label: "Tours & Travels",       path: "/category/tours-and-travels" },
//     { label: "Fashion World",         path: "/category/fashion-world" },
//     { label: "Gifts",                             path: "/category/gifts" },
//     { label: "Mix-items",                               path: "/category/mix-items" },
//     { label: "Car Accessories",                   path: "/category/car-accessories" },
//   ];

//   return (
//     <div className="absolute top-full left-1/2 -translate-x-1/2 w-screen bg-white border-t border-gray-200 shadow-2xl z-50 hidden lg:block animate-slideDown">
//       <div className="max-w-7xl mx-auto px-6 py-8">

//         {/* Header label */}
//         <div className="flex items-center justify-between mb-5">
//           <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
//             Shop by Category
//           </p>
//           <div className="h-px flex-1 ml-4 bg-gray-200" />
//         </div>

//         {/* ── Row 1: 6 categories ── */}
//         <div className="grid grid-cols-6 gap-3 mb-3">
//           {topCategories.map((cat, i) => (
//             <Link
//               key={i}
//               to={cat.path}
//               className="group flex items-center justify-center p-3 rounded-xl bg-gray-50
//                          hover:bg-[#F7A221] hover:shadow-md
//                          border border-transparent hover:border-[#F7A221]
//                          transition-all duration-200 active:scale-[.96]"
//             >
//               <span className="text-sm font-semibold text-gray-800 text-center
//                                group-hover:text-white transition-colors">
//                 {cat.label}
//               </span>
//             </Link>
//           ))}
//         </div>

//         {/* Subtle divider between rows */}
//         <div className="h-px bg-gray-100 my-3" />

//         {/* ── Row 2: 5 categories ── */}
//         <div className="grid grid-cols-5 gap-3">
//           {bottomCategories.map((cat, i) => (
//             <Link
//               key={i}
//               to={cat.path}
//               className="group flex items-center justify-center p-3 rounded-xl bg-white
//                          hover:bg-[#F7A221] hover:shadow-md
//                          border border-gray-100 hover:border-[#F7A221]
//                          transition-all duration-200 active:scale-[.96]"
//             >
//               <span className="text-sm font-semibold text-gray-600 text-center
//                                group-hover:text-white transition-colors">
//                 {cat.label}
//               </span>
//             </Link>
//           ))}
//         </div>

//       </div>
//     </div>
//   );
// };

// // ── All Categories nav item (no icon, orange active bg, chevron stays) ────────
// const NavItemWithDropdown = ({ link }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const timeoutRef = useRef(null);

//   const handleMouseEnter = () => {
//     clearTimeout(timeoutRef.current);
//     setIsOpen(true);
//   };

//   const handleMouseLeave = () => {
//     timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
//   };

//   return (
//     <div
//       className="static"
//       onClick={() => setIsOpen(!isOpen)}
//       onMouseEnter={handleMouseEnter}
//       onMouseLeave={handleMouseLeave}
//     >
//       {/* Button — orange bg always, white text on hover */}
//       <div
//         className={`
//           all-cat-btn flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl
//           font-bold text-xs uppercase tracking-wide transition-all duration-200
//           ${isOpen
//             ? 'bg-[#F7A221] text-white'
//             : 'bg-[#F7A221]/10 text-[#c27c00] hover:bg-[#F7A221] hover:text-white'
//           }
//         `}
//       >
//         <span>{link.label}</span>
//         <ChevronRight
//           size={14}
//           className={`transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
//         />
//       </div>

//       {/* Attach same mouse handlers to dropdown so it doesn't close on entry */}
//       <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
//         <MegaDropdown isOpen={isOpen} />
//       </div>
//     </div>
//   );
// };

// // ── Image icon helper ─────────────────────────────────────────────────────────
// const ImageIcon = ({ src, alt, className = "", animation = "animate-bounce-soft" }) => (
//   <img
//     src={src}
//     alt={alt}
//     className={`w-[40px] h-[40px] object-contain ${animation} ${className}`}
//     style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
//   />
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // Main Navbar
// // ─────────────────────────────────────────────────────────────────────────────
// const Navbar = ({ searchQuery, setSearchQuery, isMenuOpen, setIsMenuOpen, isLoggedIn, user, onOpenAuth }) => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
//   const accountTriggerMobileRef = useRef(null);
//   const accountTriggerDesktopRef = useRef(null);
//   const accountDropdownMobileRef = useRef(null);
//   const accountDropdownDesktopRef = useRef(null);
//   const wishlistCount = useSelector(selectWishlistCount);
//   const guestItems = useSelector(selectWishlistGuestItems);
//   const cartCount = useSelector(selectDisplayCartCount);
//   const userAddress = useSelector(selectDefaultAddress);
//   const [isCartOpen, setIsCartOpen] = useState(false);
//   const [isWishCartOpen, setIsWishCartOpen] = useState(false);
//   const displayCount = isLoggedIn ? wishlistCount : guestItems.length;
//   const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
//   const [showSearchTooltip, setShowSearchTooltip] = useState(false);

//   // Fetch user address when logged in
//   useEffect(() => {
//     if (isLoggedIn) dispatch(fetchAddresses());
//   }, [dispatch, isLoggedIn]);

//   // Show tooltip on first visit
//   useEffect(() => {
//     const hasSeenSearchTooltip = localStorage.getItem('hasSeenSearchTooltip');
//     if (!hasSeenSearchTooltip) {
//       setShowSearchTooltip(true);
//       const timer = setTimeout(() => {
//         setShowSearchTooltip(false);
//         localStorage.setItem('hasSeenSearchTooltip', 'true');
//       }, 3000);
//       return () => clearTimeout(timer);
//     }
//   }, []);

//   useEffect(() => {
//     if (!isAccountDropdownOpen) return;

//     const handleClickOutside = (event) => {
//       const target = event.target;
//       const inTrigger =
//         accountTriggerMobileRef.current?.contains(target) ||
//         accountTriggerDesktopRef.current?.contains(target);
//       const inDropdown =
//         accountDropdownMobileRef.current?.contains(target) ||
//         accountDropdownDesktopRef.current?.contains(target);
//       if (!inTrigger && !inDropdown) {
//         setIsAccountDropdownOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, [isAccountDropdownOpen]);

//   const handleSearchFocus = useCallback(() => setIsSearchModalOpen(true), []);

//   const handleLogout = async () => {
//     await dispatch(forceLogout());
//     setIsAccountDropdownOpen(false);
//   };

//   const handleAccountClick = () => {
//     if (isLoggedIn) setIsAccountDropdownOpen(!isAccountDropdownOpen);
//     else onOpenAuth();
//   };

//   const handleWishlist = () => {
//     if (isLoggedIn) navigate('/account/userwishlist');
//     else setIsWishCartOpen(true);
//   };

//   const actionIcons = [
//     {
//       icon: <User size={20} />,
//       label: isLoggedIn ? (user?.name?.split(' ')[0]?.slice(0, 6) || "Hi") : "Login",
//       onClick: handleAccountClick,
//     },
//     { icon: <Heart size={20} />,       label: "Wishlist", count: displayCount, badge: "bg-red-600", onClick: handleWishlist },
//     { icon: <ShoppingCart size={20} />, label: "Cart",    count: cartCount,    badge: "bg-black",   onClick: () => setIsCartOpen(true) },
//   ];

//   // ── Bottom nav links (used in desktop nav + mobile sidebar) ────────────────
//   // "Just Arrived" uses the same bottom-nav icon scale as Deal/Sale (see [&_img] on the shared wrapper). Sidebar: ImageIcon default 40px unless you pass className.
//   const bottomNavLinks = [
//     {
//       label: "Today's Deal",
//       path: "/today-arrival#tagProducts-top",
//       icon: <ImageIcon src={deal} alt="Deal" animation="animate-swing" />,
//     },
//     {
//       label: "Just Arrived",
//       path: "/#best-sellers",
//       icon: (
//         <ImageIcon
//           src={arrivals}
//           alt="Just Arrived"
//           animation="animate-float"
//           className="object-center"
//         />
//       ),
//     },
//     {
//       label: "Sale",
//       path: "/on-sale#tagProducts-top",
//       icon: <ImageIcon src={SaleIcon} alt="Sale" animation="animate-flicker" />,
//     },
//   ];

//   const mobileCategories = [
//     { label: "Home & Kitchen",                    path: "/category/home-and-kitchen" },
//     { label: "Smart Life Gadgets",                        path: "/category/smart-life-gadgets" },
//     { label: "Baby Items",                        path: "/category/baby-items" },
//     { label: "Stationary",                        path: "/category/stationary" },
//      { label: "Cleaning & Housekeeping Supplies",  path: "/category/cleaning-and-housekeeping-supplies" },
//      { label: "Sports & Fitness",                  path: "/category/sports-and-fitness" },
//      { label: "Tours & Travels",                   path: "/category/tours-and-travels" },
//     { label: "Fashion World",                     path: "/category/fashion-world" },
//     { label: "Gifts",                             path: "/category/gifts" },
//     { label: "Mix-items",  path: "/category/mix-items" },
//     { label: "Car Accessories",                   path: "/category/car-accessories" },
//   ];

//   return (
//     <>
//       {/* ── Top Info Bar (tablet + desktop) ─────────────────────────────────
//           • Shows from md: (768+). On tablets we render a condensed version
//             (phone + short delivery text). On lg+ we render the full content
//             (phone + email + full delivery text). Hidden on phones. ──────── */}
//       <div className="bg-black text-white py-2 lg:py-3 px-4 hidden md:block border-b border-white/10">
//         <div className="container mx-auto flex justify-between items-center text-[10px] lg:text-[11px] font-bold uppercase tracking-wider">
//           <div className="flex items-center gap-4 lg:gap-8 z-99">
//             <a href="tel:+919370686008"  className="flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition- group">
//               <Phone size={12} className="text-[#F7A221] group-hover:animate-" />  +91 93706 86008
//             </a>
//             <a
//               href="mailto:support.offerwalebaba@gmail.com"
//               className="hidden lg:flex items-center gap-2 hover:text-[#F7A221] cursor-pointer transition-colors group"
//             >
//               <Mail size={12} className="text-[#F7A221] group-hover:scale-110" /> support.offerwalebaba@gmail.com
//             </a>
//           </div>
//           <div className="flex items-center gap-2 lg:gap-4">
//             <Clock size={12} className="text-[#F7A221] animate-pulse" />
//             <span className="text-white/90 hidden lg:inline">Pan India Delivery • 24/7 Support</span>
//             <span className="text-white/90 lg:hidden">24/7 Support</span>
//           </div>
//         </div>
//       </div>

//       {/* ── Sticky Header ───────────────────────────────────────────────────── */}
//       <header className="bg-white sticky top-0 z-50 shadow-lg">
//         <div className="container mx-auto px-4">

//           {/* ══ MOBILE LAYOUT (lg:hidden) ════════════════════════════════════ */}
//           <div className="lg:hidden relative">
//             <div className="flex items-center justify-between py-3 md:py-4 border-b border-gray-100">

           
//             {/* Logo — fixed height container, no inline marginTop */}
//             <Link
//               to="/"
//               aria-label="Offer Wale Baba home"
//               className="relative inline-flex shrink-0 items-center justify-center"
//             >
//               <video
//                 className="relative z-10 block h-auto w-auto max-w-[120px] shrink-0 object-contain sm:max-w-[140px] md:max-w-[170px] pointer-events-none"
//                 src={navLogoVideo}
//                 autoPlay
//                 loop
//                 muted
//                 playsInline
//                 preload="auto"
//               />
//             </Link>

//               {/* ══ Inline search bar — tablet only (md → lg) ══════════════════
//                   Replaces the cramped centered-icon trigger on tablet widths
//                   where there's enough room for a real search input. Hidden on
//                   phones (where the centered icon below is used) and on desktop
//                   (where the full-size search bar in the desktop layout is
//                   used). Clicking opens the same SearchModal via handleSearchFocus. */}
//               <div className="hidden md:flex flex-1 items-center relative max-w-md mx-2">
//                 <input
//                   type="text"
//                   placeholder="Search products, brands and more..."
//                   onClick={handleSearchFocus}
//                   readOnly
//                   className="w-full py-2.5 pl-10 pr-20 rounded-xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-[#F7A221] focus:bg-white transition-all font-bold text-xs cursor-pointer"
//                 />
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
//                 <button
//                   onClick={handleSearchFocus}
//                   className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black text-white py-1.5 px-3 rounded-lg hover:bg-[#F7A221] transition-all shadow-md font-bold text-[10px] uppercase tracking-wider"
//                 >
//                   Search
//                 </button>
//               </div>

//               {/* Centered search trigger — phones only (md:hidden).
//                   At md+ we render the inline search bar above instead.
//                   Bug fix: was `-translate-x-1` (4px shift) — now properly
//                   centered with `-translate-x-1/2`. */}
//               <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
//                 {showSearchTooltip && (
//                   <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] md:text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap z-20 backdrop-blur-sm">
//                     🔍 Tap to search
//                     <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/80 rotate-45" />
//                   </div>
//                 )}
//                 <button
//                   onClick={handleSearchFocus}
//                   className="flex flex-col items-center cursor-pointer group hover:scale-105 active:scale-95 transition-transform duration-200 animate-float-slow"
//                 >
//                   <div className="p-1 md:p-1.5 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300 animate-spin-3d">
//                     <Search size={20} className="w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-6 md:h-6 text-gray-700 group-hover:text-[#F7A221] transition-colors" strokeWidth={2} />
//                   </div>
//                   <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold mt-0.5 uppercase tracking-tighter text-gray-600 group-hover:text-[#F7A221] transition-colors">
//                     Search
//                   </span>
//                 </button>
//               </div>

//               {/* Right actions */}
//               <div className="flex items-center gap-3 sm:gap-4 md:gap-5 relative z-[500]">
//                 {/* User */}
//                 <div ref={accountTriggerMobileRef} onClick={handleAccountClick} className="relative flex flex-col items-center cursor-pointer group">
//                   <div className="p-1 md:p-1.5 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
//                     <User size={20} className="w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-6 md:h-6 text-gray-700 group-hover:text-[#F7A221] transition-colors" />
//                   </div>
//                   <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold mt-0.5 uppercase tracking-tighter text-gray-600 group-hover:text-[#F7A221]">
//                     {isLoggedIn ? (user?.name?.split(' ')[0]?.slice(0, 6) || "Hi") : "Login"}
//                   </span>
//                   {isLoggedIn && (
//                     <div className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 rounded-full animate-pulse" />
//                   )}
//                 </div>

//                 {/* Cart */}
//                 <div onClick={() => setIsCartOpen(true)} className="relative flex flex-col items-center cursor-pointer group">
//                   <div className="p-1 md:p-1.5 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
//                     <ShoppingCart size={20} className="w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-6 md:h-6 text-gray-700 group-hover:text-[#F7A221] transition-colors" />
//                   </div>
//                   {cartCount > 0 && (
//                     <span className="absolute -top-0.5 -right-0.5 bg-black text-white text-[9px] md:text-[10px] w-4 h-4 md:w-[18px] md:h-[18px] rounded-full flex items-center justify-center border border-white font-bold shadow-sm">
//                       {cartCount > 99 ? '99+' : cartCount}
//                     </span>
//                   )}
//                   <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold mt-0.5 uppercase tracking-tighter text-gray-600 group-hover:text-[#F7A221]">Cart</span>
//                 </div>

//                 {/* Menu */}
//                 <button
//                   onClick={() => setIsMenuOpen(true)}
//                   className="flex flex-col items-center cursor-pointer group bg-transparent border-0 p-0"
//                 >
//                   <div className="p-1 md:p-1.5 rounded-xl group-hover:bg-gray-50 group-hover:scale-110 transition-all duration-300">
//                     <Menu size={20} className="w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-6 md:h-6 text-gray-700 group-hover:text-[#F7A221] transition-colors" />
//                   </div>
//                   <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold mt-0.5 uppercase tracking-tighter text-gray-600 group-hover:text-[#F7A221]">Menu</span>
//                 </button>

//                 {/* Account dropdown — mobile */}
//                 {isLoggedIn && isAccountDropdownOpen && (
//                   <UserAccountDropdown
//                     user={user}
//                     onLogout={handleLogout}
//                     onClose={() => setIsAccountDropdownOpen(false)}
//                     dropdownRef={accountDropdownMobileRef}
//                   />
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* ══ DESKTOP LAYOUT (lg:flex) ══════════════════════════════════════ */}
//           <div className="hidden lg:flex items-center justify-between lg:gap-3 xl:gap-6 2xl:gap-8 h-24 overflow-visible">

//             {/* Logo — positioned to span both header row + bottom nav row */}
//             <div className="flex items-end gap-2 self-end overflow-visible">
//               <Link
//                 to="/"
//                 aria-label="Offer Wale Baba home"
//                 className="relative inline-flex shrink-0 items-center justify-center p-1 top-9 xl:top-11 2xl:top-12"
//               >
//                 <video
//                   className="relative z-10 block h-auto w-auto max-w-[130px] shrink-0 object-contain xl:max-w-[160px] 2xl:max-w-[175px] pointer-events-none"
//                   src={navLogoVideo}
//                   autoPlay
//                   loop
//                   muted
//                   playsInline
//                   preload="auto"
//                 />
//               </Link>
//             </div>

//             {/* Location */}
//             <LocationDisplay isLoggedIn={isLoggedIn} onOpenAuth={onOpenAuth} userAddress={userAddress} />

//             {/* Search bar */}
//             <div className="flex-1 lg:max-w-sm xl:max-w-lg 2xl:max-w-xl relative">
//               <input
//                 type="text"
//                 placeholder="Search products, brands and more..."
//                 className="w-full lg:py-3 xl:py-3.5 lg:px-10 xl:px-14 rounded-2xl text-black focus:outline-none bg-gray-100 border-2 border-transparent focus:border-[#F7A221] focus:bg-white transition-all font-bold lg:text-xs xl:text-sm"
//                 onClick={handleSearchFocus}
//                 readOnly
//               />
//               <Search className="absolute lg:left-3 xl:left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
//               <button className="absolute right-1.5 lg:right-1 xl:right-2 top-1/2 -translate-y-1/2 bg-black text-white lg:py-1.5 lg:px-3 xl:py-2 xl:px-5 rounded-xl hover:bg-[#F7A221] transition-all shadow-md font-bold text-[10px] xl:text-xs uppercase hover:tracking-widest duration-300">
//                 Search
//               </button>
//             </div>

//             {/* Action icons */}
//             <div className="flex items-center lg:gap-3 xl:gap-5 2xl:gap-8 relative z-[500]">
//               {actionIcons.map((item, idx) => (
//                 <div key={idx} ref={idx === 0 ? accountTriggerDesktopRef : undefined}>
//                   <ActionIcon item={item} onClick={item.onClick} isLoggedIn={isLoggedIn} />
//                 </div>
//               ))}
//               {isLoggedIn && isAccountDropdownOpen && (
//                 <UserAccountDropdown
//                   user={user}
//                   onLogout={handleLogout}
//                   onClose={() => setIsAccountDropdownOpen(false)}
//                   dropdownRef={accountDropdownDesktopRef}
//                 />
//               )}
//             </div>
//           </div>
//         </div>

//         {/* ══ DESKTOP BOTTOM NAV ════════════════════════════════════════════════
//             Mirrors the TOP header's flex layout 1:1 so each bottom zone aligns
//             vertically beneath its corresponding top element:

//             TOP   : [Logo 175px] [gap-8] [Address]         [gap-8] [Search flex-1 max-w-xl] [gap-8] [Office|Wishlist|Cart]
//             BOTTOM: [Spacer 175px] [gap-8] [Home+Categories] [gap-8] [Deal/Arrived/Sale flex-1 max-w-xl] [gap-8] [Contact us]

//             • Same container (`container mx-auto px-4`), same gaps, same flex-1 max-w-xl
//               on the center → guarantees vertical alignment across every viewport.
//             • Spacer width = logo width (175px) so the LEFT zone starts exactly
//               under the address/location component.
//             • Responsive variants shrink padding/icons/text at narrow lg (1024px+)
//               and scale back up at xl/2xl — no overflow, no overlap, ever.
//         ════════════════════════════════════════════════════════════════════════ */}
//         <nav className="hidden lg:block relative w-full">
//           <div className="container mx-auto px-4">
//             <div className="flex items-center justify-between lg:gap-3 xl:gap-6 2xl:gap-8 py-2">

//               {/* ══ LOGO SPACER (aligns the row with top header) ══════════════ */}
//               <div className="w-[110px] xl:w-[140px] 2xl:w-[175px] shrink-0" aria-hidden="true" />

//               {/* ══ LEFT ZONE: Home + All Categories (under address box) ═════ */}
//               <div className="flex items-center gap-1 xl:gap-2 shrink-0 min-w-0">

//                 {/* ── 1. HOME button — homeIcon + "Home" label ── */}
//                 <Link
//                   to="/"
//                   className="home-nav-btn flex items-center gap-1.5 lg:gap-2 px-2 lg:px-2.5 xl:px-3 py-2 rounded-xl
//                              font-bold text-[11px] lg:text-xs uppercase tracking-wide transition-all duration-200
//                              hover:bg-[#F7A221]/10 text-gray-700 hover:text-[#F7A221] group whitespace-nowrap"
//                 >
//                   <img
//                     src={homeIcon}
//                     alt="Home"
//                     className="w-4 h-4 lg:w-5 lg:h-5 object-cover animate-bounce-soft group-hover:scale-110 transition-transform shrink-0"
//                   />
//                   <span>Home</span>
//                 </Link>

//                 {/* Divider */}
//                 <div className="h-6 w-[1px] bg-gray-200 mx-0.5 lg:mx-1 shrink-0" />

//                 {/* ── 2. ALL CATEGORIES — no icon, orange active bg, chevron kept ── */}
//                 <NavItemWithDropdown
//                   link={{ label: "All Categories" }}
//                 />
//               </div>

//               {/* ══ CENTER ZONE: Deal/Arrived/Sale (starts at search-bar left edge) ══
//                   • `shrink-0` on every Link → `.nav-link`'s `overflow-hidden` can
//                     never clip labels (items always keep natural width).
//                   • `[&_img]:!w-X` overrides ImageIcon's hardcoded 40px down to
//                     28px at lg / 36px at xl / 40px at 2xl — so the 3 items + gaps
//                     always fit inside the center zone at every viewport. The
//                     override is scoped to this render only; the same ImageIcon
//                     used in the mobile sidebar keeps its original 40px size. ══ */}
//               <div className="flex-1 lg:max-w-sm xl:max-w-lg 2xl:max-w-xl flex items-center justify-start gap-1 lg:gap-2 xl:gap-4 min-w-0">
//                 {bottomNavLinks.map((link, idx) => (
//                   <Link
//                     key={idx}
//                     to={link.path}
//                     className="shrink-0 text-center justify-center flex items-center px-1 lg:px-1.5 xl:px-3 py-2 lg:py-2.5 gap-1 lg:gap-1.5 xl:gap-2 hover:bg-gray-50 rounded-xl transition-all duration-200 group whitespace-nowrap"
//                   >
//                     {/* Just Arrived GIF: desktop bottom-nav img sizes — edit the [&_img] classes in the ternary below (other links use the smaller [&_img] scale). */}
//                     <div
//                      className={
//                       link.label === "Just Arrived"
//                         ? "transition-transform duration-300 group-hover:scale-125 shrink-0 [&_img]:!w-10 [&_img]:!h-10 lg:[&_img]:!w-[44px] lg:[&_img]:!h-[44px] xl:[&_img]:!w-14 xl:[&_img]:!h-14"
//                         : "transition-transform duration-300 group-hover:scale-125 shrink-0 [&_img]:w-6! [&_img]:h-6! lg:[&_img]:w-7! lg:[&_img]:h-7! xl:[&_img]:w-9! xl:[&_img]:h-9! 2xl:[&_img]:w-10! 2xl:[&_img]:h-10!"
//                     }
//                     >
//                       {link.icon}
//                     </div>
//                     <span className="font-bold text-black text-[11px] lg:text-xs xl:text-[0.85rem] relative z-10">
//                       {link.label}
//                     </span>
//                   </Link>
//                 ))}
//               </div>

//               {/* ══ RIGHT ZONE: Contact us (under Office/Wishlist/Cart) ═══════ */}
//               <div className="flex items-center shrink-0 min-w-0">
//                 <Link
//                   to="/contact"
//                   className="group relative flex items-center gap-2 lg:gap-2.5 xl:gap-3 px-2.5 lg:px-3 xl:px-4 py-2 lg:py-2.5 xl:py-3 rounded-2xl overflow-hidden transition-all duration-300 hover:bg-white/10 whitespace-nowrap"
//                 >
//                   <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-white/5 to-white/10 blur-sm" />
//                   <div className="relative z-10 flex-shrink-0 w-8 h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-white/10 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6">
//                     <ImageIcon
//                       className="w-4 h-4 lg:w-8 lg:h-8 object-cover text-zinc-300 group-hover:text-white transition-colors duration-300"
//                       src={audio}
//                       alt="Contact"
//                     />
//                   </div>
//                   <span className="relative z-10 font-semibold text-zinc-900 group-hover:text-yellow-500 text-[11px] lg:text-xs xl:text-sm tracking-wide transition-colors duration-300 whitespace-nowrap">
//                     Contact us
//                   </span>
//                   <svg
//                     className="relative z-10 w-3 h-3 lg:w-3.5 lg:h-3.5 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-1 transition-all duration-300 ml-1 shrink-0"
//                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
//                   >
//                     <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
//                   </svg>
//                 </Link>
//               </div>

//             </div>
//           </div>
//         </nav>
//       </header>

//       {/* ── Mobile Sidebar Overlay ───────────────────────────────────────────── */}
//       {isMenuOpen && (
//         <div
//           className="fixed inset-0 z-[200] flex justify-end bg-black/60 lg:hidden backdrop-blur-sm transition-opacity"
//           onClick={() => setIsMenuOpen(false)}
//         >
//           <div
//             className="h-full w-[85%] max-w-[320px] bg-white shadow-2xl animate-slideRight"
//             onClick={(e) => e.stopPropagation()}
//           >
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

//                 {/* Logged-in user card */}
//                 {isLoggedIn && user && (
//                   <div
//                     className="bg-gradient-to-r from-[#F7A221]/15 to-transparent p-4 rounded-2xl mb-4 border border-[#F7A221]/20 cursor-pointer"
//                     onClick={() => { navigate('/account/userprofile'); setIsMenuOpen(false); }}
//                   >
//                     <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Welcome back,</p>
//                     <p className="font-black text-black text-lg">{user?.name || "User"}</p>
//                     <p className="text-xs text-gray-600 mt-1">{user?.email}</p>
//                   </div>
//                 )}

//                 {/* Quick links — Home added first */}
//                 <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">✨ Quick Links</p>

//                 {/* Home link in sidebar */}
//                 <Link
//                   to="/"
//                   onClick={() => setIsMenuOpen(false)}
//                   className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-all font-bold text-sm group"
//                 >
//                   <span className="p-2 bg-gray-50 rounded-lg group-hover:scale-110 transition-transform">
//                     <img src={homeIcon} alt="Home" className="w-[40px] h-[40px] object-contain animate-bounce-soft" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
//                   </span>
//                   <span className="group-hover:text-[#F7A221]">Home</span>
//                 </Link>

//                 {/* Remaining quick links */}
//                 {bottomNavLinks.map((link, idx) => (
//                   <Link
//                     key={idx}
//                     to={link.path}
//                     onClick={() => setIsMenuOpen(false)}
//                     className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-all font-bold text-sm group"
//                   >
//                     <span
//                       className={`p-2 bg-gray-50 rounded-lg group-hover:scale-110 transition-transform ${
//                         link.label === "Just Arrived" ? "[&_img]:!h-14 [&_img]:!w-14" : ""
//                       }`}
//                     >
//                       {link.icon}
//                     </span>
//                     <span className="group-hover:text-[#F7A221]">{link.label}</span>
//                   </Link>
//                 ))}

//                 {/* Categories grid */}
//                 <div className="pt-4 border-t">
//                   <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">🔥 Top Categories</p>
//                   <div className="grid grid-cols-2 gap-2">
//                     {mobileCategories.map((cat, i) => (
//                       <div
//                         key={i}
//                         onClick={() => { setIsMenuOpen(false); setTimeout(() => navigate(cat.path), 150); }}
//                         className="p-3 bg-gray-50 rounded-xl text-[11px] font-bold text-center border border-gray-100 text-gray-800 hover:border-[#F7A221] hover:bg-orange-50 transition-all cursor-pointer"
//                       >
//                         {cat.label}
//                       </div>
//                     ))}
//                   </div>
//                 </div>

//                 {/* Contact / help block */}
//                 <div className="pt-6">
//                   <div className="bg-gradient-to-r from-black to-gray-900 rounded-2xl p-4 text-white">
//                     <p className="text-[10px] font-bold opacity-60 uppercase mb-2 flex items-center gap-1">
//                       <HeadphonesIcon size={10} /> Need Help?
//                     </p>
//                     <div className="flex flex-col gap-1">
//                       <a  href="tel:+919370686008" className="text-sm font-black">+91 93706 86008</a>
//                       <a href="mailto:support.offerwalebaba@gmail.com" className="text-[11px] opacity-80">
//                         support.offerwalebaba@gmail.com
//                       </a>
//                     </div>
//                   </div>
//                 </div>

//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── Cart Sidebar ─────────────────────────────────────────────────────── */}
//       <CartSidebar
//         isOpen={isCartOpen}
//         isLoggedIn={isLoggedIn}
//         onOpenAuth={onOpenAuth}
//         user={user}
//         onClose={() => setIsCartOpen(false)}
//       />

//       {/* ── Wishlist Sidebar ──────────────────────────────────────────────────── */}
//       <WishlistSidebar
//         isOpen={isWishCartOpen}
//         onOpenAuth={onOpenAuth}
//         onClose={() => setIsWishCartOpen(false)}
//       />

//       {/* ── Search Modal ──────────────────────────────────────────────────────── */}
//       <SearchModal
//         isOpen={isSearchModalOpen}
//         onClose={() => setIsSearchModalOpen(false)}
//         initialQuery={searchQuery}
//       />

//       {/* ── Global styles ─────────────────────────────────────────────────────── */}
//       <style>{`
//         /* ── Nav link base ── */
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

//         /* ── Home nav button ── */
//         .home-nav-btn {
//           transition: all 0.25s ease;
//         }
//         .home-nav-btn:hover {
//           transform: translateY(-2px);
//         }

//         /* ── All Categories button ── */
//         .all-cat-btn {
//           letter-spacing: 0.03em;
//         }
//         .all-cat-btn:hover {
//           transform: translateY(-1px);
//         }

//         /* ── Animations ── */
//         @keyframes slideRight {
//           from { transform: translateX(100%); }
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
//           50%       { transform: scale(1.15); opacity: 0.9; }
//           70%       { transform: scale(1.05); opacity: 1; }
//         }
//         .animate-flicker { animation: flicker 1s ease-in-out infinite; }

//         @keyframes float {
//           0%, 100% { transform: translateY(0); }
//           50%       { transform: translateY(-4px); }
//         }
//         .animate-float { animation: float 3s ease-in-out infinite; }

//         @keyframes bounce-soft {
//           0%, 100% { transform: translateY(0); }
//           50%       { transform: translateY(-3px); }
//         }
//         .animate-bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }

//         @keyframes shake {
//           0%, 100% { transform: translateX(0); }
//           25%       { transform: translateX(-2px); }
//           75%       { transform: translateX(2px); }
//         }
//         .animate-shake { animation: shake 0.5s ease-in-out infinite; }

//         @keyframes slideDown {
//           from { opacity: 0; transform: translateY(-15px); }
//           to   { opacity: 1; transform: translateY(0); }
//         }
//         .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

//         @keyframes flush-continuous {
//           0%   { transform: translate(0,0) scale(0.5) rotate(0deg); opacity: 0; }
//           20%  { opacity: 1; }
//           100% { transform: translate(var(--target-x), var(--target-y)) scale(1.2) rotate(var(--target-rot)); opacity: 0; }
//         }
//         .animate-flush-continuous {
//           pointer-events: none;
//           animation: flush-continuous 1s ease-out forwards;
//         }

//         .scrollbar-hide::-webkit-scrollbar { display: none; }
//         .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

//         @keyframes spin3d {
//           from { transform: rotateY(0deg); }
//           to   { transform: rotateY(360deg); }
//         }
//         .animate-float-slow { animation: float 4s ease-in-out infinite; }
//         .animate-spin-3d {
//           animation: spin3d 4s linear infinite;
//           transform-style: preserve-3d;
//           display: inline-block;
//         }
//       `}</style>
//     </>
//   );
// };

// export default memo(Navbar);

