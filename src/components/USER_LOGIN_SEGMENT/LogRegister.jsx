import React, { useState, useRef, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import OtpVerification from "./OTPVerification";
import { useDispatch } from "react-redux";
import { clearError, clearSuccess } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

/* ─────────────────────────────────────────────────────────────────────────────
   LogRegister — 100% Responsive Auth Modal
   
   ARCHITECTURE:
   • Backdrop (fixed inset-0) — click-to-close, no overflow
   • Shell (flex centering) — items-end mobile (bottom-sheet), items-center sm+
   • Card (flex column, max-height enforced, overflow-y: auto) — THE scroll root
     ├─ TopBar / TabBar (flex-shrink: 0 — never scrolls away)
     └─ PanelContainer (flex-1 overflow-y: auto — scrolls independently)
   
   CRITICAL FIX vs previous version:
   • Old approach: translateX dual-panel slider → card height = MAX(login, register)
     This made the card always as tall as the taller Register form, overflowing 
     768px laptop screens.
   • New approach: single-panel conditional render + CSS opacity fade.
     Card height = CURRENT panel's content only. Never more, never less.
   
   SWIPE: threshold 65px, 2.0x ratio, dy < 30 guard, touchCancel handler.
─────────────────────────────────────────────────────────────────────────────*/

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
  const [activeTab, setActiveTab] = useState("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showOtpPanel, setShowOtpPanel] = useState(false);
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpRegistrationPassword, setOtpRegistrationPassword] = useState("");
  const [otpDeliveryMessage, setOtpDeliveryMessage] = useState("");
  const [otpName, setOtpName] = useState("");
  const [otpEmail, setOtpEmail] = useState("");

  // ── Swipe tracking ────────────────────────────────────────────────────────
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const swipeEnabled = useRef(false);
  const backdropRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (showForgotPassword || showOtpPanel) { swipeEnabled.current = false; return; }
    if (isInteractive(e.target)) { swipeEnabled.current = false; return; }
    swipeEnabled.current = true;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, [showForgotPassword, showOtpPanel]);

  const handleTouchEnd = useCallback((e) => {
    if (!swipeEnabled.current || touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) >= 65 && Math.abs(dx) > Math.abs(dy) * 2.0 && Math.abs(dy) < 30) {
      if (dx < 0 && activeTab === "login") handleTabChange("register");
      if (dx > 0 && activeTab === "register") handleTabChange("login");
    }
    swipeEnabled.current = false;
    touchStartX.current = null;
    touchStartY.current = null;
  }, [activeTab]);

  const handleTouchCancel = useCallback(() => {
    swipeEnabled.current = false;
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  // ── No body scroll lock: window / page stays scrollable (native scrollbar).
  //    Wheel on dimmed overlay scrolls the document; wheel on .lr-modal-card stays inside the form.

  useEffect(() => {
    if (!isOpen) return;
    const el = backdropRef.current;
    if (!el) return;
    const onWheel = (e) => {
      const t = e.target;
      if (t instanceof Element && t.closest(".lr-modal-card")) return;
      window.scrollBy({ top: e.deltaY, left: e.deltaX, behavior: "auto" });
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isOpen]);

  // ── Real viewport height (defeats mobile browser address-bar 100vh bug) ───
  useEffect(() => {
    if (!isOpen) return;
    const setVh = () => {
      const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty("--lr-vh", `${h}px`);
    };
    setVh();
    window.addEventListener("resize", setVh);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", setVh);
    };
  }, [isOpen]);

  // ── Browser back button handler ───────────────────────────────────────────
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ modalOpen: true }, "", window.location.href);
    const handlePopState = () => {
      onCloseRef.current?.();
      window.history.pushState({ modalOpen: true }, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.modalOpen) window.history.back();
    };
  }, [isOpen]);
  // ─────────────────────────────────────────────────────────────────────────

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

  const handleShowOtp = ({
    identifier,
    phone,
    name,
    email = "",
    password = "",
    deliveryMessage = "",
  }) => {
    setOtpIdentifier(String(identifier || "").trim());
    setOtpPhone(String(phone || "").replace(/\D/g, "").slice(0, 10));
    setOtpRegistrationPassword(password);
    setOtpDeliveryMessage(typeof deliveryMessage === "string" ? deliveryMessage : "");
    setOtpName(name);
    setOtpEmail(email);
    setShowOtpPanel(true);
  };

  const handleOtpClose = () => {
    setShowOtpPanel(false);
    setOtpIdentifier("");
    setOtpPhone("");
    setOtpRegistrationPassword("");
    setOtpDeliveryMessage("");
    setOtpName("");
    setOtpEmail("");
  };

  const handleOtpVerify = () => {
    setShowOtpPanel(false);
    onLoginSuccess();
  };

  const currentView = showOtpPanel ? "otp" : showForgotPassword ? "forgot" : "tabs";

  return (
    <>
      {/* ── Global CSS ── */}
      <style>{`
        @keyframes lr-fadeIn      { from { opacity: 0; }                         to { opacity: 1; } }
        @keyframes lr-slideInUp   { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lr-slideInRight{ from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes lr-sheetUp     { from { opacity: 0; transform: translateY(56px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lr-panelFade   { from { opacity: 0; transform: translateY(8px); }  to { opacity: 1; transform: translateY(0); } }

        .lr-fade        { animation: lr-fadeIn       0.22s ease both; }
        .lr-slide-up    { animation: lr-slideInUp    0.28s cubic-bezier(0.32,0.72,0,1) both; }
        .lr-slide-right { animation: lr-slideInRight 0.28s cubic-bezier(0.32,0.72,0,1) both; }
        .lr-sheet-up    { animation: lr-sheetUp      0.32s cubic-bezier(0.32,0.72,0,1) both; }
        .lr-panel-fade  { animation: lr-panelFade    0.22s ease both; }

        /* ── Modal card: flex column so tab bar sticks and content scrolls ── */
        .lr-modal-card {
          display: flex;
          flex-direction: column;
          background: #0d0d0d;
          min-height: 0; /* lets flex children shrink so overflow-y can scroll */
          min-width: 0;
          /* Mobile: bottom-sheet, max 88% viewport height */
          max-height: 88dvh;
          max-height: calc(var(--lr-vh, 100vh) * 0.88);
          border-radius: 2rem 2rem 0 0;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
          overflow: hidden; /* clip rounded corners */
        }

        /* Tablet / Laptop / Desktop: centred modal card */
        @media (min-width: 640px) {
          .lr-modal-card {
            max-height: min(92vh, 720px);
            max-height: min(calc(var(--lr-vh, 100vh) * 0.92), 720px);
            border-radius: 2rem;
            box-shadow: 0 24px 64px rgba(0,0,0,0.6);
            border: 1px solid rgba(255,255,255,0.08);
          }
        }

        /* Short screens (landscape phone / small laptop) — allow more height */
        @media (max-height: 720px) and (min-width: 640px) {
          .lr-modal-card {
            max-height: 96vh;
            max-height: calc(var(--lr-vh, 100vh) * 0.96);
          }
        }

        /* ── Scrollable panel body (login / register / forgot / OTP) ── */
        .lr-panel-body {
          flex: 1 1 0%;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scrollbar-gutter: stable;
          scrollbar-width: auto;
          scrollbar-color: #f7a221 #2a2a2a;
        }
        .lr-panel-body::-webkit-scrollbar { width: 8px; }
        .lr-panel-body::-webkit-scrollbar-track {
          background: #2a2a2a;
          border-radius: 99px;
          margin: 4px 0;
        }
        .lr-panel-body::-webkit-scrollbar-thumb {
          background: #f7a221;
          border-radius: 99px;
          border: 2px solid #2a2a2a;
          background-clip: padding-box;
          min-height: 48px;
        }
        .lr-panel-body::-webkit-scrollbar-thumb:hover {
          background: #ffb03d;
        }
      `}</style>

      {/* ── BACKDROP ── */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-sm lr-fade min-h-0 p-0 sm:p-4"
        onClick={handleClose}
        aria-modal="true"
        role="dialog"
        aria-label="Authentication"
      >
        {/* ── POSITIONING WRAPPER — caps height so inner card can scroll on short viewports ── */}
        <div
          className="relative w-full min-h-0 min-w-0 sm:max-w-[420px] sm:mx-4 lr-sheet-up"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          style={{ touchAction: "pan-y" }}
        >
          {/* Desktop close button — outside card so it's never clipped */}
          <button
            onClick={handleClose}
            className="absolute -top-3 -right-3 z-20 hidden sm:flex items-center justify-center bg-[#f7a221] text-black p-2 rounded-full shadow-xl border-2 border-[#0d0d0d] cursor-pointer active:scale-95 transition-transform"
            aria-label="Close"
          >
            <X size={16} strokeWidth={3} />
          </button>

          {/* ── MODAL CARD ── */}
          <div className="lr-modal-card w-full min-h-0">

            {/* Mobile drag pill + close — flex-shrink:0, never scrolls */}
            <div className="flex-shrink-0 flex items-center px-4 pt-3 pb-0 sm:hidden bg-[#0d0d0d]">
              <div className="flex-1 flex justify-center pl-6">
                <div className="w-8 h-1 bg-white/15 rounded-full" />
              </div>
              <button
                onClick={handleClose}
                className="bg-white/10 text-white p-1.5 rounded-full active:scale-90 transition-transform cursor-pointer touch-manipulation"
                aria-label="Close"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* ── OTP view ── */}
            {currentView === "otp" && (
              <div className="lr-panel-body lr-slide-up">
                <OtpVerification
                  identifier={otpIdentifier}
                  phone={otpPhone}
                  name={otpName}
                  email={otpEmail}
                  registrationPassword={otpRegistrationPassword}
                  deliveryMessage={otpDeliveryMessage}
                  onClose={handleOtpClose}
                  onVerify={handleOtpVerify}
                />
              </div>
            )}

            {/* ── Forgot Password view ── */}
            {currentView === "forgot" && (
              <div className="lr-panel-body">
                <div className="px-5 py-4 sm:px-8 sm:py-6 lr-slide-right">
                  <ForgotPassword
                    onBack={handleBackFromForgot}
                    onLoginClick={() => { handleBackFromForgot(); handleTabChange("login"); }}
                  />
                </div>
              </div>
            )}

            {/* ── Tab view ── */}
            {currentView === "tabs" && (
              <>
                {/* Tab bar — flex-shrink:0 so it sticks at top */}
                <div className="flex-shrink-0 flex border-b border-white/5 relative mt-1 sm:mt-0 bg-[#0d0d0d]">
                  <button
                    onClick={() => handleTabChange("login")}
                    className={`flex-1 py-3 sm:py-4 text-center cursor-pointer font-black text-[11px] tracking-[0.2em] transition-colors duration-200 z-10 touch-manipulation ${activeTab === "login" ? "text-[#f7a221]" : "text-white/35 hover:text-white/60"
                      }`}
                  >
                    LOGIN
                  </button>
                  <button
                    onClick={() => handleTabChange("register")}
                    className={`flex-1 py-3 sm:py-4 text-center font-black cursor-pointer text-[11px] tracking-[0.2em] transition-colors duration-200 z-10 touch-manipulation ${activeTab === "register" ? "text-[#f7a221]" : "text-white/35 hover:text-white/60"
                      }`}
                  >
                    REGISTER
                  </button>
                  {/* Animated underline */}
                  <div
                    className="absolute bottom-0 h-[2.5px] bg-[#f7a221] rounded-full transition-all duration-400 ease-in-out"
                    style={{ width: "50%", left: activeTab === "login" ? "0%" : "50%" }}
                  />
                </div>

                {/*
                  ── PANEL BODY ──
                  flex-1 + overflow-y: auto = this scrolls, nothing above does.
                  Single-panel conditional render (not translateX dual-panel) means
                  card height = THIS panel's content. No overflow from Register
                  panel bleeding into Login panel height.
                */}
                <div className="lr-panel-body">
                  {activeTab === "login" && (
                    <div key="login-panel" className="px-4 py-4 sm:px-8 sm:py-6 lr-panel-fade">
                      <Login
                        onLoginSuccess={onLoginSuccess}
                        onRegisterClick={() => handleTabChange("register")}
                        onForgotPasswordClick={handleForgotPasswordClick}
                      />
                    </div>
                  )}
                  {activeTab === "register" && (
                    <div key="register-panel" className="px-4 py-4 sm:px-8 sm:py-6 lr-panel-fade">
                      <Register
                        onRegisterSuccess={onLoginSuccess}
                        onLoginClick={() => handleTabChange("login")}
                        onShowOtp={handleShowOtp}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
          {/* end .lr-modal-card */}
        </div>
        {/* end positioning wrapper */}
      </div>
      {/* end backdrop */}
    </>
  );
};

export default LogRegister;
