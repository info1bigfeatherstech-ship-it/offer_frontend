import React, { useState, useRef, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import OtpVerification from "./OTPVerification";
import { useDispatch } from "react-redux";
import { clearError, clearSuccess } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

/*
  ARCHITECTURE FIX — Three-layer modal shell:

  Layer 1 — Backdrop:  fixed inset-0, z-[100], bg-black/95, NO overflow property
                        click-to-close lives here
  Layer 2 — Shell:     relative wrapper, handles dvh height + safe-area padding
                        desktop close button lives HERE (never clipped)
  Layer 3 — Card:      overflow-hidden, rounded corners, bg colour
                        strictly for clipping the tab slider animation

  OTP FIX — OtpVerification is NO LONGER a separate fixed modal.
  It renders as a slide-up panel inside the card shell, identical to
  how ForgotPassword renders. Single backdrop. No double scroll-lock.

  SWIPE FIX — threshold 65px, ratio 2.0x, dy < 30 guard, touchCancel handler.
*/

const INTERACTIVE_TAGS = ["INPUT", "TEXTAREA", "BUTTON", "SELECT", "A", "LABEL"];

const isInteractive = (el) => {
  let node = el;
  while (node && node !== document.body) {
    if (INTERACTIVE_TAGS.includes(node.tagName)) return true;
    node = node.parentElement;
  }
  return false;
};

const LogRegister = ({ isOpen, onClose, onLoginSuccess }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab]           = useState("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showOtpPanel, setShowOtpPanel]     = useState(false);
  const [otpPhone, setOtpPhone]             = useState("");
  const [otpName, setOtpName]               = useState("");

  // ── Swipe tracking ─────────────────────────────────────────────
  const touchStartX   = useRef(null);
  const touchStartY   = useRef(null);
  const swipeEnabled  = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (showForgotPassword || showOtpPanel) { swipeEnabled.current = false; return; }
    if (isInteractive(e.target))            { swipeEnabled.current = false; return; }
    swipeEnabled.current  = true;
    touchStartX.current   = e.touches[0].clientX;
    touchStartY.current   = e.touches[0].clientY;
  }, [showForgotPassword, showOtpPanel]);

  const handleTouchEnd = useCallback((e) => {
    if (!swipeEnabled.current || touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // FIX: raised to 65px + 2.0x ratio + dy < 30 guard — prevents accidental
    // tab switches during diagonal form scrolls on budget Android devices
    if (
      Math.abs(dx) >= 65 &&
      Math.abs(dx) > Math.abs(dy) * 2.0 &&
      Math.abs(dy) < 30
    ) {
      if (dx < 0 && activeTab === "login")     handleTabChange("register");
      if (dx > 0 && activeTab === "register")  handleTabChange("login");
    }
    swipeEnabled.current  = false;
    touchStartX.current   = null;
    touchStartY.current   = null;
  }, [activeTab]);

  // FIX: touchCancel resets all refs — prevents false swipe after
  // phone call / notification interrupts a mid-swipe gesture
  const handleTouchCancel = useCallback(() => {
    swipeEnabled.current  = false;
    touchStartX.current   = null;
    touchStartY.current   = null;
  }, []);
  // ───────────────────────────────────────────────────────────────

  // Lock body scroll when modal is open — prevents background page scroll
  // on iOS Safari which ignores overflow:hidden on body in some versions
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const scrollY          = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top      = `-${scrollY}px`;
    document.body.style.width    = "100%";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top      = "";
      document.body.style.width    = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowForgotPassword(false);
    setShowOtpPanel(false);
    dispatch(clearError());
    dispatch(clearSuccess());
  };

  const handleClose = () => {
    dispatch(clearError());
    dispatch(clearSuccess());
    onClose();
  };

  const handleForgotPasswordClick = () => {
    dispatch(clearError());
    dispatch(clearSuccess());
    setShowForgotPassword(true);
  };

  const handleBackFromForgot = () => {
    dispatch(clearError());
    dispatch(clearSuccess());
    setShowForgotPassword(false);
  };

  // OTP panel — receives (phone, name) from Register
  const handleShowOtp = (phone, name) => {
    setOtpPhone(phone);
    setOtpName(name);
    setShowOtpPanel(true);
  };

  const handleOtpClose = () => {
    setShowOtpPanel(false);
    setOtpPhone("");
    setOtpName("");
  };

  const handleOtpVerify = () => {
    setShowOtpPanel(false);
    onLoginSuccess();
  };

  // Determines which "view" the card is showing — drives the
  // conditional render below and keeps a single overflow-hidden card
  const currentView = showOtpPanel
    ? "otp"
    : showForgotPassword
    ? "forgot"
    : "tabs";

  return (
    <>
      {/* ── Global animation keyframes ── */}
      <style>{`
        @keyframes lr-slideInRight {
          from { opacity: 0; transform: translateX(36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes lr-slideInLeft {
          from { opacity: 0; transform: translateX(-36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes lr-slideInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lr-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .lr-slide-right { animation: lr-slideInRight 0.32s cubic-bezier(0.32,0.72,0,1) both; }
        .lr-slide-left  { animation: lr-slideInLeft  0.32s cubic-bezier(0.32,0.72,0,1) both; }
        .lr-slide-up    { animation: lr-slideInUp    0.30s cubic-bezier(0.32,0.72,0,1) both; }
        .lr-fade        { animation: lr-fadeIn        0.25s ease both; }
      `}</style>

      {/*
        ══════════════════════════════════════════════════════════════
        LAYER 1 — BACKDROP
        fixed inset-0, z-[100], bg overlay, NO overflow property here.
        overflow-y-auto is REMOVED from backdrop — it caused the entire
        backdrop to scroll with content on iOS Safari ("leaky modal").
        Click on backdrop closes modal.
        ══════════════════════════════════════════════════════════════
      */}
      <div
        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md lr-fade"
        onClick={handleClose}
        aria-modal="true"
        role="dialog"
        aria-label="Authentication"
      >
        {/*
          ══════════════════════════════════════════════════════════════
          LAYER 2 — SHELL
          flex container that centres the card.
          Items-end on mobile = card slides up from bottom (native sheet feel).
          Items-center on sm+ = centred modal.
          This layer also handles the dvh height and safe-area padding.
          The desktop close button lives HERE — outside overflow-hidden,
          so it is never clipped.
          ══════════════════════════════════════════════════════════════
        */}
        <div
          className="flex items-end sm:items-center justify-center w-full min-h-[var(--vh,100dvh)] p-0 sm:p-4"
          onClick={handleClose}
        >
          {/*
            ══════════════════════════════════════════════════════════════
            POSITIONING WRAPPER — relative, no overflow.
            Close button is positioned relative to this element.
            This wrapper does NOT have overflow-hidden.
            ══════════════════════════════════════════════════════════════
          */}
          <div
            className="relative w-full sm:max-w-md"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            style={{ touchAction: "pan-y" }}
          >
            {/*
              FIX: Desktop close button — lives in the positioning wrapper
              ABOVE the overflow-hidden card. Never clipped.
            */}
            <button
              onClick={handleClose}
              className="absolute -top-3 -right-3 z-10 bg-[#f7a221] text-black p-2 rounded-full shadow-2xl active:scale-95 transition-transform border-2 border-[#0d0d0d] cursor-pointer hidden sm:flex items-center justify-center"
              aria-label="Close"
            >
              <X size={18} strokeWidth={3} />
            </button>

            {/*
              ══════════════════════════════════════════════════════════════
              LAYER 3 — CARD
              overflow-hidden lives here and ONLY here.
              Solely responsible for clipping the tab slider animation
              and providing the card's visual border-radius + background.
              Height is content-driven — no min-h-screen here.
              FIX: pb-[env(safe-area-inset-bottom)] pads bottom content
              above iOS home indicator and Android gesture bar.
              ══════════════════════════════════════════════════════════════
            */}
            <div
              className="
                bg-[#0d0d0d]
                border-0 sm:border border-white/10
                rounded-t-[2rem] sm:rounded-[2.5rem]
                shadow-[0_20px_50px_rgba(0,0,0,0.5)]
                overflow-hidden
                pb-[env(safe-area-inset-bottom)]
              "
            >

              {/* ── Mobile top bar (drag pill + close btn) ── */}
              <div className="flex items-center px-5 pt-4 pb-0 sm:hidden">
                <div className="flex-1 flex justify-center pl-8">
                  <div className="w-8 h-1 bg-white/15 rounded-full" />
                </div>
                <button
                  onClick={handleClose}
                  className="bg-white/10 text-white p-1.5 rounded-full active:scale-90 transition-transform cursor-pointer touch-manipulation"
                  aria-label="Close"
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </div>

              {/* ── VIEW ROUTER ── */}

              {currentView === "otp" && (
                <div key="otp-view" className="lr-slide-up">
                  <OtpVerification
                    phone={otpPhone}
                    name={otpName}
                    onClose={handleOtpClose}
                    onVerify={handleOtpVerify}
                  />
                </div>
              )}

              {currentView === "forgot" && (
                <div key="forgot-view" className="p-5 sm:p-8 lr-slide-right">
                  <ForgotPassword
                    onBack={handleBackFromForgot}
                    onLoginClick={() => {
                      handleBackFromForgot();
                      handleTabChange("login");
                    }}
                  />
                </div>
              )}

              {currentView === "tabs" && (
                <>
                  {/* ── Tab bar ── */}
                  <div className="flex border-b border-white/5 relative mt-2 sm:mt-0">
                    <button
                      onClick={() => handleTabChange("login")}
                      className={`flex-1 py-4 sm:py-5 text-center cursor-pointer font-black text-[11px] tracking-[0.2em] transition-colors duration-300 z-10 touch-manipulation ${
                        activeTab === "login" ? "text-[#f7a221]" : "text-white/40"
                      }`}
                    >
                      LOGIN
                    </button>
                    <button
                      onClick={() => handleTabChange("register")}
                      className={`flex-1 py-4 sm:py-5 text-center font-black cursor-pointer text-[11px] tracking-[0.2em] transition-colors duration-300 z-10 touch-manipulation ${
                        activeTab === "register" ? "text-[#f7a221]" : "text-white/40"
                      }`}
                    >
                      REGISTER
                    </button>
                    {/* Sliding underline indicator */}
                    <div
                      className="absolute bottom-0 h-[3px] bg-[#f7a221] rounded-full transition-all duration-500 ease-in-out"
                      style={{ width: "50%", left: activeTab === "login" ? "0%" : "50%" }}
                    />
                  </div>

                  {/* Swipe indicator dots — mobile only */}
                  <div className="flex justify-center gap-2 pt-2.5 pb-0 sm:hidden" aria-hidden="true">
                    <div className={`rounded-full transition-all duration-400 ${activeTab === "login"    ? "w-5 h-1 bg-[#f7a221]" : "w-1 h-1 bg-white/20"}`} />
                    <div className={`rounded-full transition-all duration-400 ${activeTab === "register" ? "w-5 h-1 bg-[#f7a221]" : "w-1 h-1 bg-white/20"}`} />
                  </div>

                  {/*
                    ── Tab slider ──
                    FIX: overflow-hidden is on the PARENT card (Layer 3),
                    not on this div — so this div can be overflow-visible
                    without fighting its parent. The parent clips it.
                    FIX: Using overflow-y-auto here (on the inner scroll
                    container) — NOT on the backdrop — so only the form
                    content scrolls, backdrop stays fixed.
                  */}
                  <div className="relative">
                    <div
                      className="flex transition-transform duration-500 ease-in-out"
                      style={{ transform: activeTab === "login" ? "translateX(0%)" : "translateX(-100%)" }}
                    >
                      {/* Login panel */}
                      <div className="w-full shrink-0 p-5 sm:p-8 overflow-y-auto max-h-[calc(var(--vh,100dvh)-140px)] sm:max-h-none">
                        <Login
                          onLoginSuccess={onLoginSuccess}
                          onRegisterClick={() => handleTabChange("register")}
                          onForgotPasswordClick={handleForgotPasswordClick}
                        />
                      </div>
                      {/* Register panel */}
                      <div className="w-full shrink-0 p-5 sm:p-8 overflow-y-auto max-h-[calc(var(--vh,100dvh)-140px)] sm:max-h-none">
                        <Register
                          onRegisterSuccess={onLoginSuccess}
                          onLoginClick={() => handleTabChange("login")}
                          onShowOtp={handleShowOtp}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>
            {/* end Layer 3 — Card */}
          </div>
          {/* end Positioning Wrapper */}
        </div>
        {/* end Layer 2 — Shell */}
      </div>
      {/* end Layer 1 — Backdrop */}
    </>
  );
};

export default LogRegister;
// try to make it more responsive
// import React, { useState, useRef, useCallback } from "react";
// import { X } from "lucide-react";
// import Login from "./Login";
// import Register from "./Register";
// import ForgotPassword from "./ForgotPassword";
// import OtpVerification from "./OTPVerification";
// import { useDispatch } from "react-redux";
// import { clearError, clearSuccess } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// /*
//   CHANGED: OTP flow is now phone-based.

//   handleShowOtp previously received (email, name):
//     onShowOtp={handleShowOtp} called with (pendingEmail || email, name)

//   Now receives (phone, name):
//     onShowOtp={handleShowOtp} called with (pendingPhone || phone, name)

//   OtpVerification receives `phone` prop instead of `email` prop.
//   The component sends { phone, otp } to backend to verify.
// */

// const INTERACTIVE_TAGS = ["INPUT", "TEXTAREA", "BUTTON", "SELECT", "A", "LABEL"];

// const isInteractive = (el) => {
//   let node = el;
//   while (node && node !== document.body) {
//     if (INTERACTIVE_TAGS.includes(node.tagName)) return true;
//     node = node.parentElement;
//   }
//   return false;
// };

// const LogRegister = ({ isOpen, onClose, onLoginSuccess }) => {
//   const dispatch = useDispatch();
//   const [activeTab, setActiveTab] = useState("login");
//   const [showForgotPassword, setShowForgotPassword] = useState(false);
//   const [showOtpModal, setShowOtpModal] = useState(false);

//   // CHANGED: otpEmail → otpPhone (OTP is now phone-based)
//   const [otpPhone, setOtpPhone] = useState("");
//   const [otpName, setOtpName] = useState("");

//   // ── Swipe tracking ───────────────────────────────────────────
//   const touchStartX = useRef(null);
//   const touchStartY = useRef(null);
//   const swipeEnabled = useRef(false);

//   const handleTouchStart = useCallback((e) => {
//     if (showForgotPassword) { swipeEnabled.current = false; return; }
//     if (isInteractive(e.target)) { swipeEnabled.current = false; return; }
//     swipeEnabled.current = true;
//     touchStartX.current = e.touches[0].clientX;
//     touchStartY.current = e.touches[0].clientY;
//   }, [showForgotPassword]);

//   const handleTouchEnd = useCallback((e) => {
//     if (!swipeEnabled.current || touchStartX.current === null) return;
//     const dx = e.changedTouches[0].clientX - touchStartX.current;
//     const dy = e.changedTouches[0].clientY - touchStartY.current;
//     if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
//       if (dx < 0 && activeTab === "login") handleTabChange("register");
//       if (dx > 0 && activeTab === "register") handleTabChange("login");
//     }
//     swipeEnabled.current = false;
//     touchStartX.current = null;
//   }, [activeTab]);
//   // ─────────────────────────────────────────────────────────────

//   if (!isOpen) return null;

//   const handleTabChange = (tab) => {
//     setActiveTab(tab);
//     setShowForgotPassword(false);
//     dispatch(clearError());
//     dispatch(clearSuccess());
//   };

//   const handleClose = () => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     onClose();
//   };

//   const handleForgotPasswordClick = () => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     setShowForgotPassword(true);
//   };

//   const handleBackFromForgot = () => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     setShowForgotPassword(false);
//   };

//   // CHANGED: now receives (phone, name) — not (email, name)
//   // Register.jsx calls onShowOtp(pendingPhone || cleanPhone, name)
//   const handleShowOtp = (phone, name) => {
//     setOtpPhone(phone);
//     setOtpName(name);
//     setShowOtpModal(true);
//   };

//   const handleOtpClose = () => {
//     setShowOtpModal(false);
//     setOtpPhone("");
//     setOtpName("");
//   };

//   const handleOtpVerify = () => {
//     setShowOtpModal(false);
//     onLoginSuccess();
//   };

//   return (
//     <>
//       {/* ── Global slide/fade keyframes ── */}
//       <style>{`
//         @keyframes lr-slideInRight {
//           from { opacity: 0; transform: translateX(36px); }
//           to   { opacity: 1; transform: translateX(0); }
//         }
//         @keyframes lr-slideInLeft {
//           from { opacity: 0; transform: translateX(-36px); }
//           to   { opacity: 1; transform: translateX(0); }
//         }
//         @keyframes lr-slideInUp {
//           from { opacity: 0; transform: translateY(18px); }
//           to   { opacity: 1; transform: translateY(0); }
//         }
//         @keyframes lr-fadeIn {
//           from { opacity: 0; }
//           to   { opacity: 1; }
//         }
//         .lr-slide-right { animation: lr-slideInRight 0.32s cubic-bezier(0.32,0.72,0,1) both; }
//         .lr-slide-left  { animation: lr-slideInLeft  0.32s cubic-bezier(0.32,0.72,0,1) both; }
//         .lr-slide-up    { animation: lr-slideInUp    0.30s cubic-bezier(0.32,0.72,0,1) both; }
//         .lr-fade        { animation: lr-fadeIn        0.25s ease both; }
//       `}</style>

//       {/* ── Backdrop ── */}
//       <div
//         className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md overflow-y-auto lr-fade"
//         onClick={handleClose}
//       >
//         <div
//           className="relative w-full sm:max-w-md my-0 sm:my-4"
//           onClick={(e) => e.stopPropagation()}
//           onTouchStart={handleTouchStart}
//           onTouchEnd={handleTouchEnd}
//           style={{ touchAction: "pan-y" }}
//         >
//           {/* Desktop close */}
//           <button
//             onClick={handleClose}
//             className="absolute -top-3 -right-3 z-[110] bg-[#f7a221] text-black p-2 rounded-full shadow-2xl active:scale-95 transition-transform border-2 border-[#0d0d0d] cursor-pointer hidden sm:flex items-center justify-center"
//             aria-label="Close"
//           >
//             <X size={18} strokeWidth={3} />
//           </button>

//           <div className="bg-[#0d0d0d] border-0 sm:border border-white/10 rounded-none sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden min-h-screen sm:min-h-0">

//             {/* Mobile top bar */}
//             <div className="flex items-center px-5 pt-4 pb-0 sm:hidden">
//               <div className="flex-1 flex justify-center pl-8">
//                 <div className="w-8 h-1 bg-white/15 rounded-full" />
//               </div>
//               <button
//                 onClick={handleClose}
//                 className="bg-white/10 text-white p-1.5 rounded-full active:scale-90 transition-transform cursor-pointer touch-manipulation"
//                 aria-label="Close"
//               >
//                 <X size={15} strokeWidth={2.5} />
//               </button>
//             </div>

//             {!showForgotPassword ? (
//               <>
//                 {/* ── Tab bar ── */}
//                 <div className="flex border-b border-white/5 relative mt-2 sm:mt-0">
//                   <button
//                     onClick={() => handleTabChange("login")}
//                     className={`flex-1 py-4 sm:py-5 text-center cursor-pointer font-black text-[11px] tracking-[0.2em] transition-colors duration-300 z-10 touch-manipulation ${
//                       activeTab === "login" ? "text-[#f7a221]" : "text-white/40"
//                     }`}
//                   >
//                     LOGIN
//                   </button>
//                   <button
//                     onClick={() => handleTabChange("register")}
//                     className={`flex-1 py-4 sm:py-5 text-center font-black cursor-pointer text-[11px] tracking-[0.2em] transition-colors duration-300 z-10 touch-manipulation ${
//                       activeTab === "register" ? "text-[#f7a221]" : "text-white/40"
//                     }`}
//                   >
//                     REGISTER
//                   </button>
//                   <div
//                     className="absolute bottom-0 h-[3px] bg-[#f7a221] rounded-full transition-all duration-500 ease-in-out"
//                     style={{ width: "50%", left: activeTab === "login" ? "0%" : "50%" }}
//                   />
//                 </div>

//                 {/* Swipe indicator dots — mobile only */}
//                 <div className="flex justify-center gap-2 pt-2.5 pb-0 sm:hidden" aria-hidden>
//                   <div className={`rounded-full transition-all duration-400 ${activeTab === "login" ? "w-5 h-1 bg-[#f7a221]" : "w-1 h-1 bg-white/20"}`} />
//                   <div className={`rounded-full transition-all duration-400 ${activeTab === "register" ? "w-5 h-1 bg-[#f7a221]" : "w-1 h-1 bg-white/20"}`} />
//                 </div>

//                 {/* ── Tab slider — Login ↔ Register ── */}
//                 <div className="relative overflow-hidden">
//                   <div
//                     className="flex transition-transform duration-500 ease-in-out"
//                     style={{ transform: activeTab === "login" ? "translateX(0%)" : "translateX(-100%)" }}
//                   >
//                     <div className="w-full shrink-0 p-5 sm:p-8">
//                       <Login
//                         onLoginSuccess={onLoginSuccess}
//                         onRegisterClick={() => handleTabChange("register")}
//                         onForgotPasswordClick={handleForgotPasswordClick}
//                       />
//                     </div>
//                     <div className="w-full shrink-0 p-5 sm:p-8">
//                       <Register
//                         onRegisterSuccess={onLoginSuccess}
//                         onLoginClick={() => handleTabChange("login")}
//                         onShowOtp={handleShowOtp}
//                       />
//                     </div>
//                   </div>
//                 </div>
//               </>
//             ) : (
//               <div key="forgot-view" className="p-5 sm:p-8 lr-slide-right">
//                 <ForgotPassword
//                   onBack={handleBackFromForgot}
//                   onLoginClick={() => {
//                     handleBackFromForgot();
//                     handleTabChange("login");
//                   }}
//                 />
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* OTP modal — rendered at root level, always above slider */}
//       {showOtpModal && (
//         <OtpVerification
//           phone={otpPhone}   // CHANGED: was email={otpEmail}
//           name={otpName}
//           onClose={handleOtpClose}
//           onVerify={handleOtpVerify}
//         />
//       )}
//     </>
//   );
// };

// export default LogRegister;

// import React, { useState } from "react";
// import { X } from "lucide-react";
// import Login from "./Login";
// import Register from "./Register";
// import ForgotPassword from "./ForgotPassword";
// import OtpVerification from "./OTPVerification";
// import { useDispatch } from "react-redux";
// import { clearError, clearSuccess } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// const LogRegister = ({ isOpen, onClose, onLoginSuccess }) => {
//   const dispatch = useDispatch();
//   const [activeTab, setActiveTab] = useState("login");
//   const [showForgotPassword, setShowForgotPassword] = useState(false);

//   // ✅ FIX 1: OTP state lifted to TOP-LEVEL so it renders above the slider
//   const [showOtpModal, setShowOtpModal] = useState(false);
//   const [otpEmail, setOtpEmail] = useState("");
//   const [otpName, setOtpName] = useState("");

//   if (!isOpen) return null;

//   const handleTabChange = (tab) => {
//     setActiveTab(tab);
//     setShowForgotPassword(false);
//     dispatch(clearError());
//     dispatch(clearSuccess());
//   };

//   const handleClose = () => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     onClose();
//   };

//   const handleForgotPasswordClick = () => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     setShowForgotPassword(true);
//   };

//   const handleBackFromForgot = () => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     setShowForgotPassword(false);
//   };

//   // ✅ FIX 1: Called by Register when OTP needs to show
//   const handleShowOtp = (email, name) => {
//     setOtpEmail(email);
//     setOtpName(name);
//     setShowOtpModal(true);
//   };

//   const handleOtpClose = () => {
//     setShowOtpModal(false);
//     setOtpEmail("");
//     setOtpName("");
//   };

//   const handleOtpVerify = () => {
//     setShowOtpModal(false);
//     onLoginSuccess();
//   };

//   return (
//     <>
//       {/* Main Modal */}
//       <div
//         className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto"
//         onClick={handleClose}
//       >
//         <div
//           className="relative w-full sm:max-w-md my-0 sm:my-4"
//           onClick={(e) => e.stopPropagation()}
//         >
//           {/* Floating Close Button */}
//           <button
//             onClick={handleClose}
//             className="absolute -top-3 -right-3 z-[110] bg-[#f7a221] text-black p-2 rounded-full shadow-2xl active:scale-95 transition-all border-2 border-[#0d0d0d] cursor-pointer hidden sm:flex"
//             aria-label="Close"
//           >
//             <X size={18} strokeWidth={3} />
//           </button>

//           <div className="bg-[#0d0d0d] border-0 sm:border border-white/10 rounded-none sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden min-h-screen sm:min-h-0">
            
//             {/* Mobile close bar */}
//             <div className="flex items-center justify-between px-6 pt-5 pb-0 sm:hidden">
//               <div className="w-10 h-1 bg-white/10 rounded-full mx-auto" />
//               <button
//                 onClick={handleClose}
//                 className="ml-auto bg-white/10 text-white p-2 rounded-full active:scale-95 transition-all cursor-pointer"
//                 aria-label="Close"
//               >
//                 <X size={16} strokeWidth={2.5} />
//               </button>
//             </div>

//             {!showForgotPassword ? (
//               <>
//                 {/* Tabs */}
//                 <div className="flex border-b border-white/5 relative mt-2 sm:mt-0">
//                   <button
//                     onClick={() => handleTabChange("login")}
//                     className={`flex-1 py-4 sm:py-5 text-center cursor-pointer font-black text-xs tracking-[0.2em] transition-colors z-10 ${
//                       activeTab === "login" ? "text-[#f7a221]" : "text-white/60"
//                     }`}
//                   >
//                     LOGIN
//                   </button>
//                   <button
//                     onClick={() => handleTabChange("register")}
//                     className={`flex-1 py-4 sm:py-5 text-center font-black cursor-pointer text-xs tracking-[0.2em] transition-colors z-10 ${
//                       activeTab === "register" ? "text-[#f7a221]" : "text-white/60"
//                     }`}
//                   >
//                     REGISTER
//                   </button>
//                   {/* Animated Underline */}
//                   <div
//                     className="absolute bottom-0 h-[3px] bg-[#f7a221] transition-all duration-500"
//                     style={{ width: "50%", left: activeTab === "login" ? "0%" : "50%" }}
//                   />
//                 </div>

//                 {/* Slide Container */}
//                 <div className="relative overflow-hidden">
//                   <div
//                     className="flex transition-transform duration-500 ease-in-out"
//                     style={{ transform: activeTab === "login" ? "translateX(0%)" : "translateX(-100%)" }}
//                   >
//                     {/* Login Slide */}
//                     <div className="w-full shrink-0 p-5 sm:p-8">
//                       <Login
//                         onLoginSuccess={onLoginSuccess}
//                         onRegisterClick={() => handleTabChange("register")}
//                         onForgotPasswordClick={handleForgotPasswordClick}
//                       />
//                     </div>
//                     {/* Register Slide — no longer passes showOtp state, uses callback */}
//                     <div className="w-full shrink-0 p-5 sm:p-8">
//                       <Register
//                         onRegisterSuccess={onLoginSuccess}
//                         onLoginClick={() => handleTabChange("login")}
//                         onShowOtp={handleShowOtp}
//                       />
//                     </div>
//                   </div>
//                 </div>
//               </>
//             ) : (
//               <div className="p-5 sm:p-8 animate-in slide-in-from-bottom-4 duration-500">
//                 <ForgotPassword
//                   onBack={handleBackFromForgot}
//                   onLoginClick={() => {
//                     handleBackFromForgot();
//                     handleTabChange("login");
//                   }}
//                 />
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ✅ FIX 1: OTP modal rendered at TOP LEVEL — always visible regardless of active tab */}
//       {showOtpModal && (
//         <OtpVerification
//           email={otpEmail}
//           name={otpName}
//           onClose={handleOtpClose}
//           onVerify={handleOtpVerify}
//         />
//       )}
//     </>
//   );
// };

// export default LogRegister;

// import React, { useState } from "react";
// import { X } from "lucide-react";
// import Login from "./Login";
// import Register from "./Register";
// import ForgotPassword from "./ForgotPassword";
// import { useDispatch } from "react-redux";
// import { clearError, clearSuccess } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// const LogRegister = ({ isOpen, onClose, onLoginSuccess }) => {
//   const dispatch = useDispatch();
//   const [activeTab, setActiveTab] = useState("login");
//   const [showForgotPassword, setShowForgotPassword] = useState(false);

//   if (!isOpen) return null;

//   const handleTabChange = (tab) => {
//     setActiveTab(tab);
//     setShowForgotPassword(false);
//     dispatch(clearError());
//     dispatch(clearSuccess());
//   };

//   const handleClose = () => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     onClose();
//   };

//   const handleForgotPasswordClick = () => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     setShowForgotPassword(true);
//   };

//   const handleBackFromForgot = () => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     setShowForgotPassword(false);
//   };

//   return (
//     /* 1. Added onClick to this overlay div to close the modal */
//     <div 
//       className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300"
//       onClick={handleClose} 
//     >
//       {/* 2. Added e.stopPropagation() so clicking the actual modal doesn't close it */}
//       <div 
//         className="relative w-full max-w-md"
//         onClick={(e) => e.stopPropagation()} 
//       >
        
//         {/* Floating Cross Icon */}
//         <button
//           onClick={handleClose}
//           className="absolute -top-3 -right-3 z-[110] bg-[#f7a221] text-black p-2 rounded-full shadow-2xl active:scale-95 transition-all border-2 border-[#0d0d0d] cursor-pointer"
//         >
//           <X size={18} strokeWidth={3} />
//         </button>

//         <div className="bg-[#0d0d0d] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
//           {!showForgotPassword ? (
//             <>
//               {/* Tabs with Slider Underline */}
//               <div className="flex border-b border-white/5 relative">
//                 <button
//                   onClick={() => handleTabChange("login")}
//                   className={`flex-1 py-5 text-center cursor-pointer font-black text-xs tracking-[0.2em] transition-colors z-10 ${
//                     activeTab === "login" ? "text-[#f7a221]" : "text-white"
//                   }`}
//                 >
//                   LOGIN
//                 </button>
//                 <button
//                   onClick={() => handleTabChange("register")}
//                   className={`flex-1 py-5 text-center font-black cursor-pointer text-xs tracking-[0.2em] transition-colors z-10 ${
//                     activeTab === "register" ?  "text-[#f7a221]" : "text-white"
//                   }`}
//                 >
//                   REGISTER
//                 </button>
//                 {/* Animated Underline */}
//                 <div 
//                   className="absolute bottom-0 h-[3px] bg-[#f7a221] transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
//                   style={{ width: '50%', left: activeTab === 'login' ? '0%' : '50%' }}
//                 />
//               </div>

//               {/* Smooth Slide Transition Container */}
//               <div className="relative overflow-hidden">
//                 <div 
//                   className="flex transition-transform duration-500 ease-in-out"
//                   style={{ transform: activeTab === 'login' ? 'translateX(0%)' : 'translateX(-100%)' }}
//                 >
//                   {/* Login Slide */}
//                   <div className="w-full shrink-0 p-8">
//                     <Login
//                       onLoginSuccess={onLoginSuccess}
//                       onRegisterClick={() => handleTabChange("register")}
//                       onForgotPasswordClick={handleForgotPasswordClick}
//                     />
//                   </div>
//                   {/* Register Slide */}
//                   <div className="w-full shrink-0 p-8">
//                     <Register
//                       onRegisterSuccess={onLoginSuccess}
//                       onLoginClick={() => handleTabChange("login")}
//                     />
//                   </div>
//                 </div>
//               </div>
//             </>
//           ) : (
//             <div className="p-8 animate-in slide-in-from-bottom-4 duration-500">
//               <ForgotPassword
//                 onBack={handleBackFromForgot}
//                 onLoginClick={() => {
//                   handleBackFromForgot();
//                   handleTabChange("login");
//                 }}
//               />
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LogRegister;

// // components/USER_LOGIN_SEGMENT/LogRegister.jsx
// import React, { useState } from "react";
// import { X } from "lucide-react";
// import Login from "./Login";
// import Register from "./Register";
// import ForgotPassword from "./ForgotPassword";
// import { useDispatch } from "react-redux";
// import { clearError, clearSuccess } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// const LogRegister = ({ isOpen, onClose, onLoginSuccess }) => {
//   const dispatch = useDispatch();
//   const [activeTab, setActiveTab] = useState("login");
//   const [showForgotPassword, setShowForgotPassword] = useState(false);

//   if (!isOpen) return null;

//   const handleTabChange = (tab) => {
//     setActiveTab(tab);
//     setShowForgotPassword(false);
//     dispatch(clearError());
//     dispatch(clearSuccess());
//   };

//   const handleClose = () => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     onClose();
//   };

//   const handleForgotPasswordClick = () => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     setShowForgotPassword(true);
//   };

//   const handleBackFromForgot = () => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     setShowForgotPassword(false);
//   };

//   return (
//     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
//       <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden">

//         {/* Close Button */}
//         <button
//           onClick={handleClose}
//           className="absolute right-4 top-4 z-10 p-2 text-gray-500 hover:text-white transition-colors"
//         >
//           <X size={20} />
//         </button>

//         {!showForgotPassword ? (
//           <>
//             {/* Tabs */}
//             <div className="flex border-b border-white/10">
//               <button
//                 onClick={() => handleTabChange("login")}
//                 className={`flex-1 py-4 text-center font-medium transition-colors ${
//                   activeTab === "login"
//                     ? "text-[#f7a221] border-b-2 border-[#f7a221]"
//                     : "text-gray-500 hover:text-white"
//                 }`}
//               >
//                 LOGIN
//               </button>
//               <button
//                 onClick={() => handleTabChange("register")}
//                 className={`flex-1 py-4 text-center font-medium transition-colors ${
//                   activeTab === "register"
//                     ? "text-[#f7a221] border-b-2 border-[#f7a221]"
//                     : "text-gray-500 hover:text-white"
//                 }`}
//               >
//                 REGISTER
//               </button>
//             </div>

//             {/* Content */}
//             <div className="p-8">
//               {activeTab === "login" ? (
//                 <Login
//                   onLoginSuccess={onLoginSuccess}
//                   onRegisterClick={() => handleTabChange("register")}
//                   onForgotPasswordClick={handleForgotPasswordClick}
//                 />
//               ) : (
//                 <Register
//                   onRegisterSuccess={onLoginSuccess}
//                   onLoginClick={() => handleTabChange("login")}
//                 />
//               )}
//             </div>
//           </>
//         ) : (
//           <div className="p-8">
//             <ForgotPassword
//               onBack={handleBackFromForgot}
//               onLoginClick={() => {
//                 handleBackFromForgot();
//                 handleTabChange("login");
//               }}
//             />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default LogRegister;


// // components/USER_LOGIN_SEGMENT/LogRegister.jsx
// import React, { useState } from 'react';
// import { X } from 'lucide-react';
// import Login from './Login';
// import Register from './Register';
// import ForgotPassword from './ForgotPassword';

// const LogRegister = ({ isOpen, onClose }) => {
//     const [activeTab, setActiveTab] = useState('login');
//     const [showForgotPassword, setShowForgotPassword] = useState(false);

//     if (!isOpen) return null;

//     const handleLoginSuccess = () => {
//         alert('Login successful! (Demo)');
//         onClose();
//     };

//     const handleForgotPasswordClick = () => {
//         setShowForgotPassword(true);
//     };

//     const handleBackFromForgot = () => {
//         setShowForgotPassword(false);
//     };

//     return (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
//             <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden">
                
//                 {/* Close Button */}
//                 <button 
//                     onClick={onClose}
//                     className="absolute right-4 top-4 z-10 p-2 text-gray-500 hover:text-white transition-colors"
//                 >
//                     <X size={20} />
//                 </button>

//                 {!showForgotPassword ? (
//                     <>
//                         {/* Tabs */}
//                         <div className="flex border-b border-white/10">
//                             <button
//                                 onClick={() => setActiveTab('login')}
//                                 className={`flex-1 py-4 text-center font-medium transition-colors ${
//                                     activeTab === 'login' 
//                                         ? 'text-[#f7a221] border-b-2 border-[#f7a221]' 
//                                         : 'text-gray-500 hover:text-white'
//                                 }`}
//                             >
//                                 LOGIN
//                             </button>
//                             <button
//                                 onClick={() => setActiveTab('register')}
//                                 className={`flex-1 py-4 text-center font-medium transition-colors ${
//                                     activeTab === 'register' 
//                                         ? 'text-[#f7a221] border-b-2 border-[#f7a221]' 
//                                         : 'text-gray-500 hover:text-white'
//                                 }`}
//                             >
//                                 REGISTER
//                             </button>
//                         </div>

//                         {/* Content */}
//                         <div className="p-8">
//                             {activeTab === 'login' ? (
//                                 <Login 
//                                     onLoginSuccess={handleLoginSuccess}
//                                     onRegisterClick={() => setActiveTab('register')}
//                                     onForgotPasswordClick={handleForgotPasswordClick}
//                                 />
//                             ) : (
//                                 <Register 
//                                     onRegisterSuccess={handleLoginSuccess}
//                                     onLoginClick={() => setActiveTab('login')}
//                                 />
//                             )}
//                         </div>
//                     </>
//                 ) : (
//                     <div className="p-8">
//                         <ForgotPassword 
//                             onBack={handleBackFromForgot}
//                             onLoginClick={() => {
//                                 setShowForgotPassword(false);
//                                 setActiveTab('login');
//                             }}
//                         />
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default LogRegister;