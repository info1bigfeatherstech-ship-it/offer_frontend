import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import ToastConfig from "./components/Common/ToastConfig";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Common/Navbar";
import Footer from "./components/Common/Footer";
import WhatsAppFloat from "./components/WHATSAPP_FLOAT/WhatsAppFloat";
import LogRegister from "./components/USER_LOGIN_SEGMENT/LogRegister";

import Homepage from "./components/Webside_Pages/Homepage";
import CustomerCare from "./components/Webside_Pages/CustomerCare";
import CatProducts from "./User_Side_Web_Interface/Product_segment/CatPro_segment/CatProducts";
import ProductDetail from "./User_Side_Web_Interface/Product_segment/Productdetail";
import UserDashboard from "./User_Side_Web_Interface/User_Dash_Segment/UserDashboard";
import AdminDashboard from "./components/ADMIN_SEGMENT/Admin_dashboard";
import ShopByPrice from "./User_Side_Web_Interface/ShopByPriceSegment/ShopByPrice";

// ── New admin auth imports ────────────────────────────────────────────────────
import AdminLogin        from "./components/ADMIN_SEGMENT/ADMIN_LOGIN_SEGMENT/AdminLogin";
import AdminUnauthorized from "./components/ADMIN_SEGMENT/ADMIN_LOGIN_SEGMENT/AdminUnauthorized";
import AdminPrivateRoute from "./components/ADMIN_SEGMENT/ADMIN_LOGIN_SEGMENT/AdminPrivateRoute";
import { adminForceLogout } from "./components/ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminAuthSlice";

// ─────────────────────────────────────────────────────────────────────────────

import { logoutUser, fetchMe, forceLogout } from "./components/REDUX_FEATURES/REDUX_SLICES/authSlice";
import { USER_ACCESS_TOKEN_KEY } from "./SERVICES/axiosInstance";

// ── These two are fine at app-level — they power Navbar badges ───────────────
import useWishlistInit from "./components/HOOKS/useWishlistInit";
import useCartInit from "./components/HOOKS/useCartInit";
import UserTab from "./components/ADMIN_SEGMENT/ADMIN_TABS/USER/UserTab";
import Checkout from "./User_Side_Web_Interface/CHECKOUT/Checkout";
import ContactUs from "./components/Common/Contact";
import TagProducts from "./User_Side_Web_Interface/User_Dash_Segment/UserSubPages/TagProducts";
import AboutUs from "./components/Common/AboutUs";
import Policy from "./components/Common/Policy";
import InfluencerFormPage from "./components/ADMIN_SEGMENT/Influencer/Influencer";
import ScrollRestoration from "./components/ScrollRestoration";
// import ScrollToTop from "./components/ScrollToTop";
// import SideVideo from "./components/Common/SideVideo/SideVideo";  //remove this line if you want to remove the side video
// ─────────────────────────────────────────────────────────────────────────────

// ── Optional: protect /account routes ────────────────────────────────────────
const PrivateRoute = ({ children }) => {
    const { isLoggedIn } = useSelector((state) => state.auth);
    // Redirect to home if not logged in, preserving intended destination
    return isLoggedIn ? children : <Navigate to="/" replace />;
};

const AppContent = () => {
    const dispatch = useDispatch();
    const { isLoggedIn, user } = useSelector((state) => state.auth);
    const location = useLocation();

    const [searchQuery, setSearchQuery]   = useState("");
    const [isMenuOpen,  setIsMenuOpen]    = useState(false);
    const [isAuthOpen,  setIsAuthOpen]    = useState(false);

    // ── isAdminRoute now also covers /admin/login and /admin/unauthorized ─────
    const isAdminRoute = location.pathname.startsWith('/babapanel') ||
                         location.pathname.startsWith('/babadash') ||
                         location.pathname.startsWith('/admin/login') ||
                         location.pathname.startsWith('/admin/unauthorized')||
                         location.pathname.startsWith('/no-access');

    // ── Cart & wishlist — fine here, they drive Navbar badges ────────────────
    // DO NOT call these again inside any tab component
    // useWishlistInit();
    // useCartInit();
    // In App.jsx — also skip wishlist/cart on admin routes
        useWishlistInit(!isAdminRoute);  // pass enabled flag
        useCartInit(!isAdminRoute);

    // ── On app load: restore user session silently if token exists ────────────
    // This populates auth.user — UserDashboard sidebar reads from here directly
    // No separate profile fetch needed in UserDashboard
   // App.jsx — AppContent component
            useEffect(() => {
                const token = localStorage.getItem(USER_ACCESS_TOKEN_KEY);
                // ✅ Don't run user fetchMe on admin routes — admin has its own auth system
                if (token && !isAdminRoute) {
                    dispatch(fetchMe());
                }
            }, [dispatch, isAdminRoute]);

    // ── Listen for forced logout (token refresh failure) — user auth ──────────
    // adminForceLogout is also dispatched here so both slices stay in sync
    // when the shared axios interceptor fires the auth:logout event
    // useEffect(() => {
    //     const handleForceLogout = () => {
    //         dispatch(forceLogout());
    //         dispatch(adminForceLogout());
    //     };
    //     window.addEventListener("auth:logout", handleForceLogout);
    //     return () => window.removeEventListener("auth:logout", handleForceLogout);
    // }, [dispatch]);

    useEffect(() => {
        const handleUserForceLogout = () => {
            dispatch(forceLogout());
        };

        const handleAdminForceLogout = () => {
            dispatch(adminForceLogout());
        };

        window.addEventListener("auth:logout:user", handleUserForceLogout);
        window.addEventListener("auth:logout:admin", handleAdminForceLogout);

        return () => {
            window.removeEventListener("auth:logout:user", handleUserForceLogout);
            window.removeEventListener("auth:logout:admin", handleAdminForceLogout);
        };
    }, [dispatch]);

    // ── Show auth popup once per session (not on admin routes) ───────────────
    useEffect(() => {
        const hasVisited = sessionStorage.getItem("hasVisitedBABA");
        if (!hasVisited && !isLoggedIn && !isAdminRoute) {
            const timer = setTimeout(() => {
                setIsAuthOpen(true);
                sessionStorage.setItem("hasVisitedBABA", "true");
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isLoggedIn, isAdminRoute]);

    const handleLoginSuccess = () => setIsAuthOpen(false);
    const handleLogout       = () => dispatch(logoutUser());
    const openAuthModal      = () => setIsAuthOpen(true);

    return (
        <div className="min-h-screen">
            <ScrollRestoration />
            {/* <ScrollToTop /> */}

            {!isAdminRoute && (
                <Navbar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isMenuOpen={isMenuOpen}
                    setIsMenuOpen={setIsMenuOpen}
                    isLoggedIn={isLoggedIn}
                    user={user}
                    onOpenAuth={openAuthModal}
                    onLogout={handleLogout}
                />
            )}

            {!isAdminRoute && <WhatsAppFloat />}

            <Routes>
                {/* ── Public routes ──────────────────────────────────────── */}
                <Route path="/"                element={<Homepage onOpenAuth={openAuthModal} />} />
                <Route path="/customer-care"   element={<CustomerCare onOpenAuth={openAuthModal} />} />
                <Route path="/category/:slug"  element={<CatProducts />} />
                <Route path="/contact"  element={<ContactUs />} />
                <Route path="/products/:slug"  element={<ProductDetail openAuthModal={openAuthModal} isLoggedIn={isLoggedIn} />} />
                  <Route path="/shopbyprice/:slug" element={<ShopByPrice />} />

                {/* ── Admin auth routes (public — no AdminPrivateRoute) ───── */}
                <Route path="/admin/login"        element={<AdminLogin />} />
                <Route path="/admin/unauthorized" element={<AdminUnauthorized />} />


                      {/*
                 * ── /no-access — shown to regular users who hit admin URLs ──
                 * Public route — no auth needed to VIEW this page.
                 * The UserTab component handles its own "Take Me Home" button.
                 */}
                <Route path="/no-access" element={<UserTab />} />
                {/* ── Admin protected routes ─────────────────────────────── */}
                {/*
                 *  /admin          → AdminPrivateRoute checks adminAuth slice
                 *  /admindash/*    → same guard, AdminDashboard handles tabs internally
                 *
                 *  AdminPrivateRoute behaviour:
                 *    - status idle/loading  → spinner (never premature redirect)
                 *    - not logged in        → /admin/login
                 *    - wrong role           → /admin/unauthorized
                 *    - valid admin role     → renders AdminDashboard
                 */}
                <Route
                    path="/babapanel"
                    element={
                         <AdminPrivateRoute>
                             <AdminDashboard />
                         </AdminPrivateRoute>
                      
                    }
                />
                <Route
                    path="/babadash/*"
                    element={
                          <AdminPrivateRoute>
                            <AdminDashboard />
                          </AdminPrivateRoute>
                     
                    }
                />

                {/* ── Customer segment ───────────────────────────── */}
                {/* <Route path="/admindash/customers/*" element={<CustomerDashboard />} /> */}

                {/* ── User account routes ────────────────────────────────── */}
                {/*
                 *  /account            → redirects to /account/userprofile
                 *  /account/:activeTab → UserDashboard handles the switch internally
                 *
                 *  Wrapped in PrivateRoute — remove it if you want public access
                 *  and handle the "not logged in" state inside UserDashboard itself.
                 */}
                <Route
                    path="/account"
                    element={<Navigate to="/account/userprofile" replace />}
                />
                <Route path="/about" element={<AboutUs/>}/>
                <Route path="/policies/:slug" element={<Policy/>}/>
                <Route
                    path="/account/:activeTab"
                    element={
                        <PrivateRoute>
                            <UserDashboard />
                        </PrivateRoute>
                    }
                />
                <Route path="/on-sale"       element={<TagProducts tag="on-sale" />} />
                <Route path="/today-arrival" element={<TagProducts tag="today-arrival" />} />
                <Route path="/Influencer" element={<InfluencerFormPage/>} />

                    <Route path="/checkout" element={<Checkout />} />

                {/* ── 404 fallback ───────────────────────────────────────── */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {!isAdminRoute && <Footer />}

            {!isAdminRoute && (
                <LogRegister
                    isOpen={isAuthOpen}
                    onClose={() => setIsAuthOpen(false)}
                    onLoginSuccess={handleLoginSuccess}
                />
            )}
            {/* <SideVideo /> */}
            {/* <WhatsAppFloat /> */}
        </div>
    );
};

const App = () => {
    return (
        <Router>
               <ToastConfig />  {/* Clean! */}
            <AppContent />
        </Router>
    );
};

export default App;

