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
// import SideVideo from "./components/Common/SideVideo/SideVideo";
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
            <WhatsAppFloat />
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
// code is working but add role based access in admin dashboard and also add role based access in admin routes in app.jsx and also add role based access in admin dashboard routes and also add role based access in admin dashboard sidebar and also add role based access in admin dashboard main content area and also add role based access in admin dashboard analytics page and also add role based access in admin dashboard products page and also add role based access in admin dashboard archived page and also add role based access in admin dashboard customers page and also add role based access in admin dashboard orders page and also add role based access in admin dashboard demo page
// import React, { useState, useEffect } from "react";
// import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import ToastConfig from "./components/Common/ToastConfig";
// import "react-toastify/dist/ReactToastify.css";

// import Navbar from "./components/Common/Navbar";
// import Footer from "./components/Common/Footer";
// import WhatsAppFloat from "./components/WHATSAPP_FLOAT/WhatsAppFloat";
// import LogRegister from "./components/USER_LOGIN_SEGMENT/LogRegister";

// import Homepage from "./components/Webside_Pages/Homepage";
// import CustomerCare from "./components/Webside_Pages/CustomerCare";
// import CatProducts from "./User_Side_Web_Interface/Product_segment/CatPro_segment/CatProducts";
// import ProductDetail from "./User_Side_Web_Interface/Product_segment/Productdetail";
// import UserDashboard from "./User_Side_Web_Interface/User_Dash_Segment/UserDashboard";
// import AdminDashboard from "./components/ADMIN_SEGMENT/Admin_dashboard";

// import { logoutUser, fetchMe, forceLogout } from "./components/REDUX_FEATURES/REDUX_SLICES/authSlice";

// // ── These two are fine at app-level — they power Navbar badges ───────────────
// import useWishlistInit from "./components/HOOKS/useWishlistInit";
// import useCartInit from "./components/HOOKS/useCartInit";
// import CustomerDashboard from "./components/ADMIN_SEGMENT/ADMIN_TABS/CUSTOMER_SEGMENT/CustomerDashboard";
// // ─────────────────────────────────────────────────────────────────────────────

// // ── Optional: protect /account routes ────────────────────────────────────────
// const PrivateRoute = ({ children }) => {
//     const { isLoggedIn } = useSelector((state) => state.auth);
//     // Redirect to home if not logged in, preserving intended destination
//     return isLoggedIn ? children : <Navigate to="/" replace />;
// };

// const AppContent = () => {
//     const dispatch = useDispatch();
//     const { isLoggedIn, user } = useSelector((state) => state.auth);
//     const location = useLocation();

//     const [searchQuery, setSearchQuery]   = useState("");
//     const [isMenuOpen,  setIsMenuOpen]    = useState(false);
//     const [isAuthOpen,  setIsAuthOpen]    = useState(false);

//     const isAdminRoute = location.pathname.startsWith('/admin') ||
//                          location.pathname.startsWith('/admindash');

//     // ── Cart & wishlist — fine here, they drive Navbar badges ────────────────
//     // DO NOT call these again inside any tab component
//     useWishlistInit();
//     useCartInit();

//     // ── On app load: restore session silently if token exists ─────────────────
//     // This populates auth.user — UserDashboard sidebar reads from here directly
//     // No separate profile fetch needed in UserDashboard
//     useEffect(() => {
//         const token = localStorage.getItem("accessToken");
//         if (token) dispatch(fetchMe());
//     }, [dispatch]);

//     // ── Listen for forced logout (token refresh failure) ──────────────────────
//     useEffect(() => {
//         const handleForceLogout = () => dispatch(forceLogout());
//         window.addEventListener("auth:logout", handleForceLogout);
//         return () => window.removeEventListener("auth:logout", handleForceLogout);
//     }, [dispatch]);

//     // ── Show auth popup once per session (not on admin routes) ───────────────
//     useEffect(() => {
//         const hasVisited = sessionStorage.getItem("hasVisitedBABA");
//         if (!hasVisited && !isLoggedIn && !isAdminRoute) {
//             const timer = setTimeout(() => {
//                 setIsAuthOpen(true);
//                 sessionStorage.setItem("hasVisitedBABA", "true");
//             }, 2000);
//             return () => clearTimeout(timer);
//         }
//     }, [isLoggedIn, isAdminRoute]);

//     const handleLoginSuccess = () => setIsAuthOpen(false);
//     const handleLogout       = () => dispatch(logoutUser());
//     const openAuthModal      = () => setIsAuthOpen(true);

//     return (
//         <div className="min-h-screen">

//             {!isAdminRoute && (
//                 <Navbar
//                     searchQuery={searchQuery}
//                     setSearchQuery={setSearchQuery}
//                     isMenuOpen={isMenuOpen}
//                     setIsMenuOpen={setIsMenuOpen}
//                     isLoggedIn={isLoggedIn}
//                     user={user}
//                     onOpenAuth={openAuthModal}
//                     onLogout={handleLogout}
//                 />
//             )}

//             <Routes>
//                 {/* ── Public routes ──────────────────────────────────────── */}
//                 <Route path="/"                element={<Homepage onOpenAuth={openAuthModal} />} />
//                 <Route path="/customer-care"   element={<CustomerCare onOpenAuth={openAuthModal} />} />
//                 <Route path="/category/:slug"  element={<CatProducts />} />
//                 <Route path="/products/:slug"  element={<ProductDetail />} />

//                 {/* ── Admin routes ───────────────────────────────────────── */}
//                 <Route path="/admin"           element={<AdminDashboard />} />
//                 <Route path="/admindash/*"     element={<AdminDashboard />} />

//                 {/* ── Customer segment ───────────────────────────── */}
//                 {/* <Route path="/admindash/customers/*" element={<CustomerDashboard />} /> */}

//                 {/* ── User account routes ────────────────────────────────── */}
//                 {/*
//                  *  /account            → redirects to /account/userprofile
//                  *  /account/:activeTab → UserDashboard handles the switch internally
//                  *
//                  *  Wrapped in PrivateRoute — remove it if you want public access
//                  *  and handle the "not logged in" state inside UserDashboard itself.
//                  */}
//                 <Route
//                     path="/account"
//                     element={<Navigate to="/account/userprofile" replace />}
//                 />
//                 <Route
//                     path="/account/:activeTab"
//                     element={
//                         <PrivateRoute>
//                             <UserDashboard />
//                         </PrivateRoute>
//                     }
//                 />

//                 {/* ── 404 fallback ───────────────────────────────────────── */}
//                 <Route path="*" element={<Navigate to="/" replace />} />
//             </Routes>

//             {!isAdminRoute && <Footer />}

//             {!isAdminRoute && (
//                 <LogRegister
//                     isOpen={isAuthOpen}
//                     onClose={() => setIsAuthOpen(false)}
//                     onLoginSuccess={handleLoginSuccess}
//                 />
//             )}

//             <WhatsAppFloat />
//         </div>
//     );
// };

// const App = () => {
//     return (
//         <Router>
//                <ToastConfig />  {/* Clean! */}
//             <AppContent />
//         </Router>
//     );
// };

// export default App;

// import React, { useState, useEffect } from "react";
// import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// import Navbar from "./components/Common/Navbar";
// import Footer from "./components/Common/Footer";
// import WhatsAppFloat from "./components/WHATSAPP_FLOAT/WhatsAppFloat";
// import LogRegister from "./components/USER_LOGIN_SEGMENT/LogRegister";

// import Homepage from "./components/Webside_Pages/Homepage";
// import CustomerCare from "./components/Webside_Pages/CustomerCare";
// import CatProducts from "./User_Side_Web_Interface/Product_segment/CatPro_segment/CatProducts";
// import ProductDetail from "./User_Side_Web_Interface/Product_segment/Productdetail";
// import UserDashboard from "./User_Side_Web_Interface/User_Dash_Segment/UserDashboard";
// import AdminDashboard from "./components/ADMIN_SEGMENT/Admin_dashboard";

// import { logoutUser, fetchMe, forceLogout } from "./components/REDUX_FEATURES/REDUX_SLICES/authSlice";

// // ── These two are fine at app-level — they power Navbar badges ───────────────
// import useWishlistInit from "./components/HOOKS/useWishlistInit";
// import useCartInit from "./components/HOOKS/useCartInit";
// // ─────────────────────────────────────────────────────────────────────────────

// // ── Optional: protect /account routes ────────────────────────────────────────
// const PrivateRoute = ({ children }) => {
//     const { isLoggedIn } = useSelector((state) => state.auth);
//     // Redirect to home if not logged in, preserving intended destination
//     return isLoggedIn ? children : <Navigate to="/" replace />;
// };

// const AppContent = () => {
//     const dispatch = useDispatch();
//     const { isLoggedIn, user } = useSelector((state) => state.auth);
//     const location = useLocation();

//     const [searchQuery, setSearchQuery]   = useState("");
//     const [isMenuOpen,  setIsMenuOpen]    = useState(false);
//     const [isAuthOpen,  setIsAuthOpen]    = useState(false);

//     const isAdminRoute = location.pathname.startsWith('/admin') ||
//                          location.pathname.startsWith('/admindash');

//     // ── Cart & wishlist — fine here, they drive Navbar badges ────────────────
//     // DO NOT call these again inside any tab component
//     useWishlistInit();
//     useCartInit();

//     // ── On app load: restore session silently if token exists ─────────────────
//     // This populates auth.user — UserDashboard sidebar reads from here directly
//     // No separate profile fetch needed in UserDashboard
//     useEffect(() => {
//         const token = localStorage.getItem("accessToken");
//         if (token) dispatch(fetchMe());
//     }, [dispatch]);

//     // ── Listen for forced logout (token refresh failure) ──────────────────────
//     useEffect(() => {
//         const handleForceLogout = () => dispatch(forceLogout());
//         window.addEventListener("auth:logout", handleForceLogout);
//         return () => window.removeEventListener("auth:logout", handleForceLogout);
//     }, [dispatch]);

//     // ── Show auth popup once per session (not on admin routes) ───────────────
//     useEffect(() => {
//         const hasVisited = sessionStorage.getItem("hasVisitedBABA");
//         if (!hasVisited && !isLoggedIn && !isAdminRoute) {
//             const timer = setTimeout(() => {
//                 setIsAuthOpen(true);
//                 sessionStorage.setItem("hasVisitedBABA", "true");
//             }, 2000);
//             return () => clearTimeout(timer);
//         }
//     }, [isLoggedIn, isAdminRoute]);

//     const handleLoginSuccess = () => setIsAuthOpen(false);
//     const handleLogout       = () => dispatch(logoutUser());
//     const openAuthModal      = () => setIsAuthOpen(true);

//     return (
//         <div className="min-h-screen">

//             {!isAdminRoute && (
//                 <Navbar
//                     searchQuery={searchQuery}
//                     setSearchQuery={setSearchQuery}
//                     isMenuOpen={isMenuOpen}
//                     setIsMenuOpen={setIsMenuOpen}
//                     isLoggedIn={isLoggedIn}
//                     user={user}
//                     onOpenAuth={openAuthModal}
//                     onLogout={handleLogout}
//                 />
//             )}

//             <Routes>
//                 {/* ── Public routes ──────────────────────────────────────── */}
//                 <Route path="/"                element={<Homepage onOpenAuth={openAuthModal} />} />
//                 <Route path="/customer-care"   element={<CustomerCare onOpenAuth={openAuthModal} />} />
//                 <Route path="/category/:slug"  element={<CatProducts />} />
//                 <Route path="/products/:slug"  element={<ProductDetail />} />

//                 {/* ── Admin routes ───────────────────────────────────────── */}
//                 <Route path="/admin"           element={<AdminDashboard />} />
//                 <Route path="/admindash/*"     element={<AdminDashboard />} />

//                 {/* ── User account routes ────────────────────────────────── */}
//                 {/*
//                  *  /account            → redirects to /account/userprofile
//                  *  /account/:activeTab → UserDashboard handles the switch internally
//                  *
//                  *  Wrapped in PrivateRoute — remove it if you want public access
//                  *  and handle the "not logged in" state inside UserDashboard itself.
//                  */}
//                 <Route
//                     path="/account"
//                     element={<Navigate to="/account/userprofile" replace />}
//                 />
//                 <Route
//                     path="/account/:activeTab"
//                     element={
//                         <PrivateRoute>
//                             <UserDashboard />
//                         </PrivateRoute>
//                     }
//                 />

//                 {/* ── 404 fallback ───────────────────────────────────────── */}
//                 <Route path="*" element={<Navigate to="/" replace />} />
//             </Routes>

//             {!isAdminRoute && <Footer />}

//             {!isAdminRoute && (
//                 <LogRegister
//                     isOpen={isAuthOpen}
//                     onClose={() => setIsAuthOpen(false)}
//                     onLoginSuccess={handleLoginSuccess}
//                 />
//             )}

//             <WhatsAppFloat />
//         </div>
//     );
// };

// const App = () => {
//     return (
//         <Router>
//             <ToastContainer
//                 position="top-right"
//                 autoClose={3000}
//                 hideProgressBar={false}
//                 newestOnTop={true}
//                 closeOnClick
//                 pauseOnHover
//                 theme="dark"
//                 toastClassName={() =>
//                     "relative flex p-1 min-h-10 rounded-xl justify-between overflow-hidden cursor-pointer bg-[#0d0d0d] border border-white/10 mb-2 shadow-2xl"
//                 }
//                 bodyClassName={() => "text-sm font-medium text-white block p-3"}
//                 progressClassName="bg-[#f7a221]"
//             />
//             <AppContent />
//         </Router>
//     );
// };

// export default App;

// import React, { useState, useEffect } from "react";
// import Navbar from "./components/Common/Navbar";
// import Footer from "./components/Common/Footer";
// import Homepage from "./components/Webside_Pages/Homepage";
// import CustomerCare from "./components/Webside_Pages/CustomerCare";
// import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
// import WhatsAppFloat from "./components/WHATSAPP_FLOAT/WhatsAppFloat";
// import LogRegister from "./components/USER_LOGIN_SEGMENT/LogRegister";
// import { useDispatch, useSelector } from "react-redux";
// import { logoutUser, fetchMe, forceLogout } from "./components/REDUX_FEATURES/REDUX_SLICES/authSlice";
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import AdminDashboard from "./components/ADMIN_SEGMENT/Admin_dashboard";
// import CatProducts from "./User_Side_Web_Interface/Product_segment/CatPro_segment/CatProducts";
// // import CatProducts from "./pages/Product_segment/CatPro_segment/CatProducts";
// import ProductDetail from "./User_Side_Web_Interface/Product_segment/Productdetail";
// // import ProductDetail from "./pages/Product_segment/Productdetail";
// import useWishlistInit from "./components/HOOKS/useWishlistInit";
// import useCartInit from "./components/HOOKS/useCartInit";
// import UserDashboard from "./User_Side_Web_Interface/User_Dash_Segment/UserDashboard";

// // Wrapper component to conditionally render Navbar based on route
// const AppContent = () => {
//   const dispatch = useDispatch();
//   const { isLoggedIn, user } = useSelector((state) => state.auth);
//   const location = useLocation();
//   const [searchQuery, setSearchQuery] = useState("");
//   const [isMenuOpen, setIsMenuOpen] = useState(false);
//   const [isAuthOpen, setIsAuthOpen] = useState(false);
  
//   // Check if current route is admin dashboard
//   const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/admindash');
  
//   useWishlistInit();//for whishlist
//   useCartInit();//for cart

//   // ✅ On app load — if token exists in localStorage, fetch user profile silently
//   useEffect(() => {
//     const token = localStorage.getItem("accessToken");
//     if (token) {
//       dispatch(fetchMe());
//     }
//   }, [dispatch]);

//   // ✅ Listen for forced logout event (triggered by axiosInstance on refresh failure)
//   useEffect(() => {
//     const handleForceLogout = () => {
//       dispatch(forceLogout());
//     };
//     window.addEventListener("auth:logout", handleForceLogout);
//     return () => window.removeEventListener("auth:logout", handleForceLogout);
//   }, [dispatch]);

//   // ✅ Show auth popup after 2 seconds (only once per session)
//   useEffect(() => {
//     const hasVisited = sessionStorage.getItem("hasVisitedBABA");
//     if (!hasVisited && !isLoggedIn && !isAdminRoute) {
//       const timer = setTimeout(() => {
//         setIsAuthOpen(true);
//         sessionStorage.setItem("hasVisitedBABA", "true");
//       }, 2000);
//       return () => clearTimeout(timer);
//     }
//   }, [isLoggedIn, isAdminRoute]);

//   // ✅ Called after successful login/register — close the modal
//   const handleLoginSuccess = () => {
//     setIsAuthOpen(false);
//   };

//   // ✅ Logout — calls API + clears Redux state + localStorage
//   const handleLogout = () => {
//     dispatch(logoutUser());
//   };

//   const openAuthModal = () => {
//     setIsAuthOpen(true);
//   };

//   return (
//     <div className="min-h-screen">
//       {/* Conditionally render Navbar - hide on admin routes */}
//       {!isAdminRoute && (
//         <Navbar
//           searchQuery={searchQuery}
//           setSearchQuery={setSearchQuery}
//           isMenuOpen={isMenuOpen}
//           setIsMenuOpen={setIsMenuOpen}
//           isLoggedIn={isLoggedIn}
//           user={user}
//           onOpenAuth={openAuthModal}
//           onLogout={handleLogout}
//         />
//       )}

//       <Routes>
//         <Route path="/" element={<Homepage onOpenAuth={openAuthModal} />} />
//         <Route
//           path="/customer-care"
//           element={<CustomerCare onOpenAuth={openAuthModal} />}
//         />
//         <Route path="/category/:slug"  element={<CatProducts />} />
//         <Route path="/products/:slug"  element={<ProductDetail />} />

//         {/* ADMIN_ROUTES */}
//         <Route path="/admin" element={<AdminDashboard />} />
//         <Route path="/admindash/*" element={<AdminDashboard />} /> {/* Catch all */}
//       {/* --- USER ACCOUNT ROUTES --- */}
//         {/* We use /* to allow the UserDashboard to handle sub-routing internally */}
//         <Route path="/account/:activeTab" element={<UserDashboard />} />
//         <Route path="/account" element={<UserDashboard />} />
//       </Routes>


//       {/* Conditionally render Footer - hide on admin routes */}
//       {!isAdminRoute && <Footer />}

//       {/* Auth Popup - only show on non-admin routes */}
//       {!isAdminRoute && (
//         <LogRegister
//           isOpen={isAuthOpen}
//           onClose={() => setIsAuthOpen(false)}
//           onLoginSuccess={handleLoginSuccess}
//         />
//       )}

//       <WhatsAppFloat />
//     </div>
//   );
// };

// const App = () => {
//   return (
//     <Router>
//       {/* Place ToastContainer here - outside the main layout flow */}
//       <ToastContainer
//         position="top-right"
//         autoClose={3000}
//         hideProgressBar={false}
//         newestOnTop={true}
//         closeOnClick
//         pauseOnHover
//         theme="dark"
//         toastClassName={() => 
//           "relative flex p-1 min-h-10 rounded-xl justify-between overflow-hidden cursor-pointer bg-[#0d0d0d] border border-white/10 mb-2 shadow-2xl"
//         }
//         bodyClassName={() => "text-sm font-medium text-white block p-3"}
//         progressClassName="bg-[#f7a221]"
//       />
//       <AppContent />
//     </Router>
//   );
// };

// export default App;




// import React, { useState, useEffect } from "react";
// import Navbar from "./components/Navbar";
// import Footer from "./components/Footer";
// import Homepage from "./pages/Homepage";
// import CustomerCare from "./pages/CustomerCare";
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import WhatsAppFloat from "./components/WHATSAPP_FLOAT/WhatsAppFloat";
// import LogRegister from "./components/USER_LOGIN_SEGMENT/LogRegister";
// import { useDispatch, useSelector } from "react-redux";
// import { logoutUser, fetchMe, forceLogout } from "./components/REDUX_FEATURES/REDUX_SLICES/authSlice";
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import AdminDashboard from "./components/ADMIN_SEGMENT/Admin_dashboard";

// const App = () => {
//   const dispatch = useDispatch();
//   const { isLoggedIn, user } = useSelector((state) => state.auth);

//   const [searchQuery, setSearchQuery] = useState("");
//   const [isMenuOpen, setIsMenuOpen] = useState(false);
//   const [isAuthOpen, setIsAuthOpen] = useState(false);

//   // ✅ On app load — if token exists in localStorage, fetch user profile silently
//   useEffect(() => {
//     const token = localStorage.getItem("accessToken");
//     if (token) {
//       dispatch(fetchMe());
//     }
//   }, [dispatch]);

//   // ✅ Listen for forced logout event (triggered by axiosInstance on refresh failure)
//   useEffect(() => {
//     const handleForceLogout = () => {
//       dispatch(forceLogout());
//     };
//     window.addEventListener("auth:logout", handleForceLogout);
//     return () => window.removeEventListener("auth:logout", handleForceLogout);
//   }, [dispatch]);

//   // ✅ Show auth popup after 2 seconds (only once per session)
//   useEffect(() => {
//     const hasVisited = sessionStorage.getItem("hasVisitedBABA");
//     if (!hasVisited && !isLoggedIn) {
//       const timer = setTimeout(() => {
//         setIsAuthOpen(true);
//         sessionStorage.setItem("hasVisitedBABA", "true");
//       }, 2000);
//       return () => clearTimeout(timer);
//     }
//   }, [isLoggedIn]);

//   // ✅ Called after successful login/register — close the modal
//   const handleLoginSuccess = () => {
//     setIsAuthOpen(false);
//   };

//   // ✅ Logout — calls API + clears Redux state + localStorage
//   const handleLogout = () => {
//     dispatch(logoutUser());
//   };

//   const openAuthModal = () => {
//     setIsAuthOpen(true);
//   };

//   return (
//     <Router>
//       {/* Place ToastContainer here - outside the main layout flow */}
//      <ToastContainer
//       position="top-right"
//       autoClose={3000}
//       hideProgressBar={false}
//       newestOnTop={true}
//       closeOnClick
//       pauseOnHover
//       theme="dark"
//       toastClassName={() => 
//         "relative flex p-1 min-h-10 rounded-xl justify-between overflow-hidden cursor-pointer bg-[#0d0d0d] border border-white/10 mb-2 shadow-2xl"
//       }
//       bodyClassName={() => "text-sm font-medium text-white block p-3"}
//       progressClassName="bg-[#f7a221]"
//     />
//       <div className="min-h-screen">
//         <Navbar
//           searchQuery={searchQuery}
//           setSearchQuery={setSearchQuery}
//           isMenuOpen={isMenuOpen}
//           setIsMenuOpen={setIsMenuOpen}
//           isLoggedIn={isLoggedIn}
//           user={user}
//           onOpenAuth={openAuthModal}
//           onLogout={handleLogout}
//         />

//         <Routes>
//           <Route path="/" element={<Homepage onOpenAuth={openAuthModal} />} />
//           <Route
//             path="/customer-care"
//             element={<CustomerCare onOpenAuth={openAuthModal} />}
//           />




//           {/* ADMIN_ROUTES */}
//           <Route path="/admin" element={<AdminDashboard />} />
//            <Route path="/admindash/*" element={<AdminDashboard />} /> {/* Catch all */}
//         </Routes>

//         <Footer />

//         {/* Auth Popup */}
//         <LogRegister
//           isOpen={isAuthOpen}
//           onClose={() => setIsAuthOpen(false)}
//           onLoginSuccess={handleLoginSuccess}
//         />

//         <WhatsAppFloat />
//       </div>
//     </Router>
//   );
// };

// export default App;

// // App.jsx
// import React, { useState, useEffect } from 'react';
// import Navbar from './components/Navbar';
// import Footer from './components/Footer';
// import Homepage from './pages/Homepage';
// import CustomerCare from './pages/CustomerCare';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import WhatsAppFloat from './components/WHATSAPP_FLOAT/WhatsAppFloat';
// import LogRegister from './components/USER_LOGIN_SEGMENT/LogRegister';

// const App = () => {
//   const [searchQuery, setSearchQuery] = useState('');
//   const [isMenuOpen, setIsMenuOpen] = useState(false);
//   const [isAuthOpen, setIsAuthOpen] = useState(false);
  
//   // Demo user state - always false for static UI
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [user, setUser] = useState(null);

//   // Show popup after 2 seconds (only once per session)
//   useEffect(() => {
//     const hasVisited = sessionStorage.getItem('hasVisitedBABA');
    
//     if (!hasVisited) {
//       const timer = setTimeout(() => {
//         setIsAuthOpen(true);
//         sessionStorage.setItem('hasVisitedBABA', 'true');
//       }, 2000);

//       return () => clearTimeout(timer);
//     }
//   }, []);

//   // Handle successful login/registration
//   const handleLoginSuccess = () => {
//     setIsLoggedIn(true);
//     setUser({ name: 'Demo User', email: 'demo@example.com' });
//     setIsAuthOpen(false);
//     alert('Logged in successfully! (Demo)');
//   };

//   // Handle logout
//   const handleLogout = () => {
//     setIsLoggedIn(false);
//     setUser(null);
//     alert('Logged out successfully! (Demo)');
//   };

//   // Function to open auth modal
//   const openAuthModal = () => {
//     setIsAuthOpen(true);
//   };

//   return (
//     <Router>
//       <div className="min-h-screen">
//         <Navbar
//           searchQuery={searchQuery}
//           setSearchQuery={setSearchQuery}
//           isMenuOpen={isMenuOpen}
//           setIsMenuOpen={setIsMenuOpen}
//           isLoggedIn={isLoggedIn}
//           user={user}
//           onOpenAuth={openAuthModal}
//           onLogout={handleLogout}
//         />
        
//         <Routes>
//           <Route path="/" element={<Homepage onOpenAuth={openAuthModal} />} />
//           <Route path="/customer-care" element={<CustomerCare onOpenAuth={openAuthModal} />} />
//         </Routes>
        
//         <Footer />

//         {/* Auth Popup */}
//         <LogRegister 
//           isOpen={isAuthOpen} 
//           onClose={() => setIsAuthOpen(false)}
//           onLoginSuccess={handleLoginSuccess}
//         />
        
//         <WhatsAppFloat />
//       </div>
//     </Router>
//   );
// };

// export default App;

// import React, { useState, useEffect } from 'react';
// import Navbar from './components/Navbar';
// import Footer from './components/Footer';
// import Homepage from './pages/Homepage';
// import CustomerCare from './pages/CustomerCare';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import WhatsAppFloat from './components/WHATSAPP_FLOAT/WhatsAppFloat';
// import LogRegister from './components/USER_LOGIN_SEGMENT/LogRegister';

// const App = () => {
//   const [searchQuery, setSearchQuery] = useState('');
//   const [isMenuOpen, setIsMenuOpen] = useState(false);
  
//   // Check sessionStorage for login status
//   const [isLoggedIn, setIsLoggedIn] = useState(() => {
//     return sessionStorage.getItem('isUserLoggedIn') === 'true';
//   });

//   // State to control the Login/Register Popup
//   const [isAuthOpen, setIsAuthOpen] = useState(false);

//   useEffect(() => {
//     const hasVisited = sessionStorage.getItem('hasVisitedBABA');

//     // Show popup only if user hasn't visited AND is not logged in
//     if (!hasVisited && !isLoggedIn) {
//       const timer = setTimeout(() => {
//         setIsAuthOpen(true);
//         sessionStorage.setItem('hasVisitedBABA', 'true');
//       }, 2000);

//       return () => clearTimeout(timer);
//     }
//   }, [isLoggedIn]);

//   // Simple login function - sets sessionStorage
//   const handleLogin = () => {
//     sessionStorage.setItem('isUserLoggedIn', 'true');
//     setIsLoggedIn(true);
//     setIsAuthOpen(false);
//   };

//   // Simple logout function
//   const handleLogout = () => {
//     sessionStorage.removeItem('isUserLoggedIn');
//     setIsLoggedIn(false);
//   };

//   return (
//     <Router>
//       <div className="min-h-screen">
//         <Navbar
//           searchQuery={searchQuery}
//           setSearchQuery={setSearchQuery}
//           isMenuOpen={isMenuOpen}
//           setIsMenuOpen={setIsMenuOpen}
//           isLoggedIn={isLoggedIn}
//           onLogout={handleLogout}
//         />
        
//         <Routes>
//           <Route path="/" element={<Homepage />} />
//           <Route path="/customer-care" element={<CustomerCare />} />
//         </Routes>
        
//         <Footer />

//         {/* Auth Popup */}
//         <LogRegister 
//           isOpen={isAuthOpen} 
//           onClose={() => setIsAuthOpen(false)}
//           onLoginSuccess={handleLogin}
//         />
        
//         <WhatsAppFloat />
//       </div>
//     </Router>
//   );
// };

// export default App;


// import React, { useState, useEffect } from 'react';
// import Navbar from './components/Navbar';
// import Footer from './components/Footer';
// import Homepage from './pages/Homepage';
// import CustomerCare from './pages/CustomerCare';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import WhatsAppFloat from './components/WHATSAPP_FLOAT/WhatsAppFloat';
// import LogRegister from './components/USER_LOGIN_SEGMENT/LogRegister';

// const App = () => {
//   const [searchQuery, setSearchQuery] = useState('');
//   const [isMenuOpen, setIsMenuOpen] = useState(false);
//   const [isLoginOpen, setIsLoginOpen] = useState(false);
//   // In the future, this 'false' will come from your Auth API/Context
//   const [isLoggedIn, setIsLoggedIn] = useState(false); 

//   // State to control the Login/Register Popup
//   const [isAuthOpen, setIsAuthOpen] = useState(false);

//   useEffect(() => {
//     const hasVisited = sessionStorage.getItem('hasVisitedBABA');

//     // PRACTICAL CHECK: Only trigger if NO session exists AND user is NOT logged in
//     if (!hasVisited && !isLoggedIn) {
//       const timer = setTimeout(() => {
//         setIsLoginOpen(true);
//         sessionStorage.setItem('hasVisitedBABA', 'true');
//       }, 2000);

//       return () => clearTimeout(timer);
//     }
//   }, [isLoggedIn]); // Added isLoggedIn here so if it changes, the effect re-evaluates

//   return (
//     <Router>
//       <div className="min-h-screen">
//         <Navbar
//           searchQuery={searchQuery}
//           setSearchQuery={setSearchQuery}
//           isMenuOpen={isMenuOpen}
//           setIsMenuOpen={setIsMenuOpen}
//         />
        
//         <Routes>
//           <Route path="/" element={<Homepage />} />
//           <Route path="/customer-care" element={<CustomerCare />} />
//         </Routes>
        
//         <Footer />

        
//         {/* 3. THE AUTH POPUP */}
//       {/* We pass the state and the closer function as props */}
//       <LogRegister 
//         isOpen={isAuthOpen} 
//         onClose={() => setIsAuthOpen(false)} 
//       />
//         <WhatsAppFloat />
//       </div>
//     </Router>
//   );
// };

// export default App;

// import React, { useState,useEffect } from 'react';
// import Navbar from './components/Navbar';
// import Footer from './components/Footer';
// import Homepage from './pages/Homepage';
// import CustomerCare from './pages/CustomerCare';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import WhatsAppFloat from './components/WHATSAPP_FLOAT/WhatsAppFloat';
// import loginPopup from './components/LOGIN_POPUP/loginPopup';
// const App = () => {
//   const [searchQuery, setSearchQuery] = useState('');
//   const [isMenuOpen, setIsMenuOpen] = useState(false);
//   const [isLoginOpen, setIsLoginOpen] = useState(false);
//   // In the future, this 'false' will come from your Auth API/Context
//   const [isLoggedIn, setIsLoggedIn] = useState(false); 

//   useEffect(() => {
//     const hasVisited = sessionStorage.getItem('hasVisitedBABA');

//     // PRACTICAL CHECK: Only trigger if NO session exists AND user is NOT logged in
//     if (!hasVisited && !isLoggedIn) {
//       const timer = setTimeout(() => {
//         setIsLoginOpen(true);
//         sessionStorage.setItem('hasVisitedBABA', 'true');
//       }, 2000);

//       return () => clearTimeout(timer);
//     }
//   }, [isLoggedIn]); // Added isLoggedIn here so if it changes, the effect re-evaluates

//   return (
//     <Router>
//       <div className="min-h-screen">
//         <Navbar
//           searchQuery={searchQuery}
//           setSearchQuery={setSearchQuery}
//           isMenuOpen={isMenuOpen}
//           setIsMenuOpen={setIsMenuOpen}
//         />
        
//         <Routes>
//           <Route path="/" element={<Homepage />} />
//           <Route path="/customer-care" element={<CustomerCare />} />
//         </Routes>
        
//         <Footer />

    
//         <loginPopup isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
//       <WhatsAppFloat />
//       </div>
//     </Router>
//   );
// };

// export default App;
