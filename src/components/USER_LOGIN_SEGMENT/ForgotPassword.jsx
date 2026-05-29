import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mail, Phone, Key, ChevronLeft, Loader2, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  forgotPasswordRequestOTP,
  forgotPasswordVerifyOTP,
  forgotPasswordReset,
  loginUser,
  clearError,
  clearSuccess,
  clearForgotPasswordState,
} from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
import LOGO from "../../assets/logo2.svg";
/*
  CHANGED: Forgot password is now a true 3-step flow with backend calls at each step.

  OLD flow:
    Step 1 → POST /auth/forgot-password { email }
    Step 2 → local state only (no backend call to verify OTP)
    Step 3 → POST /auth/reset-password { email, otp, newPassword }

  NEW flow:
    Step 1 → POST /auth/forgot-password/request-otp { identifier }
             identifier = email OR phone number
    Step 2 → POST /auth/forgot-password/verify-otp { identifier, otp }
             REAL backend verification — invalid OTP caught here
    Step 3 → POST /auth/forgot-password/reset { identifier, otp, newPassword }

  The `identifier` entered in Step 1 is stored in Redux (forgotPasswordIdentifier)
  and reused automatically in Steps 2 and 3 — user doesn't re-type it.

  The `otp` entered in Step 2 is kept in local state and passed to Step 3.

  ADDITIONAL CHANGES (white theme update):
  - Theme changed from dark (#0d0d0d bg) to white/light
  - Step 2: added resend OTP countdown (RESEND_COOLDOWN seconds) + resend button
    that re-dispatches forgotPasswordRequestOTP with the same identifier
  - Step 3: after successful reset, dispatches onLoginClick automatically
    so the user is navigated back to login immediately (caller handles auto-login)
*/

const STEPS = ["identifier", "otp", "password"];

// Resend cooldown in seconds — change here to adjust the timer
const RESEND_COOLDOWN = 5*60;

const ForgotPassword = ({ onBack, onLoginClick }) => {
  const dispatch = useDispatch();
  const { loading, error, successMessage, forgotPasswordIdentifier } = useSelector(
    (state) => state.auth
  );

  const [identifier, setIdentifier] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [verifiedOtp, setVerifiedOtp] = useState(""); // stored after step 2 succeeds
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState("");
  const [step, setStep] = useState("identifier");

  // ── Resend OTP countdown state ─────────────────────────────────
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const resendTimerRef = useRef(null);
  // ─────────────────────────────────────────────────────────────

  const otpRefs = useRef([]);

  useEffect(() => {
    dispatch(clearError());
    dispatch(clearSuccess());
    // Don't wipe forgotPasswordIdentifier here — may be resuming a flow
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
      dispatch(clearSuccess());
    }
  }, [successMessage, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (localError) {
      toast.error(localError);
      setLocalError("");
    }
  }, [localError]);

  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    }
  }, [step]);

  // Clean up Redux forgot password state when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearForgotPasswordState());
    };
  }, [dispatch]);

  // ── Resend countdown tick ──────────────────────────────────────
  useEffect(() => {
    clearInterval(resendTimerRef.current);
    if (resendSecondsLeft > 0) {
      resendTimerRef.current = setInterval(() => {
        setResendSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(resendTimerRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(resendTimerRef.current);
  }, [resendSecondsLeft]);

  // Start the countdown whenever we enter the OTP step
  useEffect(() => {
    if (step === "otp") {
      setResendSecondsLeft(RESEND_COOLDOWN);
    }
  }, [step]);
  // ─────────────────────────────────────────────────────────────

  // Format seconds as MM:SS
  const formatCountdown = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ── OTP box handlers ──────────────────────────────────────────
  const handleOtpChange = (idx, val) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned && val) return;
    if (cleaned.length > 1) return;
    const next = [...otpDigits];
    next[idx] = cleaned;
    setOtpDigits(next);
    if (cleaned && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace") {
      if (otpDigits[idx]) {
        const next = [...otpDigits];
        next[idx] = "";
        setOtpDigits(next);
      } else if (idx > 0) {
        otpRefs.current[idx - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otpDigits];
    pasted.split("").forEach((ch, i) => { if (i < 6) next[i] = ch; });
    setOtpDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const otpString = otpDigits.join("");
  // ─────────────────────────────────────────────────────────────

  // Determine display label for the identifier (email vs phone)
  const isEmailIdentifier = identifier.includes("@");
  const identifierLabel = isEmailIdentifier ? "email" : "phone";

  // ── STEP 1: Request OTP ───────────────────────────────────────
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) { setLocalError("Please enter your email or phone number"); return; }

    const result = await dispatch(forgotPasswordRequestOTP({ identifier: trimmed }));

    if (forgotPasswordRequestOTP.fulfilled.match(result)) {
      // identifier is now stored in Redux as forgotPasswordIdentifier
      setStep("otp");
    }
    // Errors shown via toast through the error useEffect
  };

  // ── RESEND OTP: re-dispatches Step 1 action with stored identifier ──
  // Only available after countdown reaches zero
  const handleResendOTP = useCallback(async () => {
    if (resendSecondsLeft > 0 || resendLoading) return;
    const activeIdentifier = forgotPasswordIdentifier || identifier.trim();
    if (!activeIdentifier) return;

    setResendLoading(true);
    const result = await dispatch(forgotPasswordRequestOTP({ identifier: activeIdentifier }));
    setResendLoading(false);

    if (forgotPasswordRequestOTP.fulfilled.match(result)) {
      // Reset OTP boxes and restart countdown
      setOtpDigits(["", "", "", "", "", ""]);
      setResendSecondsLeft(RESEND_COOLDOWN);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
      toast.success("OTP resent successfully!");
    }
    // Errors shown via toast through the error useEffect
  }, [resendSecondsLeft, resendLoading, forgotPasswordIdentifier, identifier, dispatch]);

  // ── STEP 2: Verify OTP with backend ──────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otpString.length !== 6) { setLocalError("Enter all 6 digits"); return; }

    // Use identifier from Redux (set in step 1) — single source of truth
    const activeIdentifier = forgotPasswordIdentifier || identifier.trim();

    // CHANGED: Now makes a real backend call to verify OTP
    // Old code just did setStep("password") with no server check
    const result = await dispatch(
      forgotPasswordVerifyOTP({ identifier: activeIdentifier, otp: otpString })
    );

    if (forgotPasswordVerifyOTP.fulfilled.match(result)) {
      // Store OTP locally — needed for step 3 reset call
      setVerifiedOtp(otpString);
      setStep("password");
    }
    // Invalid OTP / expired → backend returns 400, error shown via toast
  };

  // ── STEP 3: Reset Password ────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setLocalError("Passwords do not match"); return; }
    if (newPassword.length < 6) { setLocalError("Min 6 characters required"); return; }

    const activeIdentifier = forgotPasswordIdentifier || identifier.trim();

    const result = await dispatch(
      forgotPasswordReset({
        identifier: activeIdentifier,
        otp: verifiedOtp,
        newPassword,
      })
    );

    if (forgotPasswordReset.fulfilled.match(result)) {
  toast.success("Password reset! Logging you in...");
  // Auto-login with the same identifier + new password
  const loginResult = await dispatch(
    loginUser({ identifier: activeIdentifier, password: newPassword })
  );
  if (loginUser.fulfilled.match(loginResult)) {
    onLoginClick(); // triggers onLoginSuccess in parent → closes modal
  } else {
    // Auto-login failed (rare) — fall back to manual login
    setTimeout(() => onLoginClick(), 1200);
  }
}
  };

  const stepIndex = STEPS.indexOf(step);

  const handleGoBackToIdentifier = () => {
    setOtpDigits(["", "", "", "", "", ""]);
    setVerifiedOtp("");
    clearInterval(resendTimerRef.current);
    setResendSecondsLeft(0);
    dispatch(clearForgotPasswordState());
    setStep("identifier");
  };

  // ── WHITE THEME TOKENS (scoped, don't affect other components) ──
  const card = {
    background: "#ffffff",
    color: "#111111",
  };
  const inputStyle = {
    width: "100%",
    background: "#f5f5f5",
    border: "1.5px solid #e8e8e8",
    borderRadius: "16px",
    padding: "15px 16px 15px 44px",
    color: "#111111",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  };
  const inputFocusStyle = {
    borderColor: "#f7a221",
    boxShadow: "0 0 0 3px rgba(247,162,33,0.15)",
  };
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="w-full" style={{ color: "#111111" }}>
      {/* ── White-theme scoped styles ── */}
      <style>{`
        .fp-white-wrap { background: #ffffff; color: #111111; }
        .fp-input-wrap input::placeholder { color: #aaaaaa; }
        .fp-input-wrap input:focus {
          border-color: #f7a221 !important;
          box-shadow: 0 0 0 3px rgba(247,162,33,0.15) !important;
          background: #fffdf7 !important;
        }
        .fp-otp-box {
          flex: 1;
          min-width: 0;
          aspect-ratio: 1;
          background: #f5f5f5;
          border: 1.5px solid #e8e8e8;
          border-radius: 12px;
          text-align: center;
          color: #111111;
          font-weight: 800;
          font-size: 20px;
          outline: none;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
          caret-color: transparent;
          -webkit-tap-highlight-color: transparent;
        }
        .fp-otp-box:focus {
          border-color: #f7a221;
          background: #fffdf7;
          box-shadow: 0 0 0 3px rgba(247,162,33,0.18);
        }
        .fp-btn-primary {
          width: 100%;
          background: #f7a221;
          color: #000000;
          font-weight: 900;
          padding: 15px 0;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transition: background 0.18s, opacity 0.18s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 20px rgba(247,162,33,0.25);
        }
        .fp-btn-primary:hover:not(:disabled) { background: #e0911c; }
        .fp-btn-primary:active:not(:disabled) { background: #c97e18; transform: scale(0.99); }
        .fp-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .fp-resend-active {
          color: #f7a221;
          font-weight: 800;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.15s;
        }
        .fp-resend-active:hover { color: #c97e18; }
        .fp-resend-disabled {
          color: #aaaaaa;
          cursor: default;
        }
        .fp-step-bar-done { background: #f7a221; box-shadow: 0 0 6px rgba(247,162,33,0.35); }
        .fp-step-bar-todo { background: #e5e5e5; }
        .fp-match-ok  { color: #16a34a; }
        .fp-match-err { color: #dc2626; }
      `}</style>

      <div className="fp-white-wrap">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1 font-bold text-[10px] tracking-widest transition-colors mb-5 uppercase cursor-pointer touch-manipulation"
          style={{ color: "#f7a221" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#111")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#f7a221")}
        >
          <ChevronLeft size={16} /> Back
        </button>

        {/* Responsive Logo */}
        <div className="flex justify-center mb-6 sm:mb-7 md:mb-8">
          <img
            src={LOGO}
            autoPlay
            loop
            muted
            className="w-20 h-20 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-28 object-cover  shado transition-transform duration-300 "
            style={{
              maxWidth: "100%",
              height: "auto",
              aspectRatio: "1",
            }}
          />
        </div>

        {/* Title */}
        <h2
          className="text-3xl sm:text-4xl font-black tracking-tighter mb-1 text-center"
          style={{ color: "#111111" }}
        >
          RESET <span style={{ color: "#f7a221" }}>PASSWORD</span>
        </h2>
        <p
          className="text-[10px] text-center uppercase tracking-widest mb-6"
          style={{ color: "#111111" }}
        >
          Follow steps to recover account
        </p>

        {/* Step progress bar */}
        <div className="flex gap-2 mb-7">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                stepIndex >= i ? "fp-step-bar-done" : "fp-step-bar-todo"
              }`}
            />
          ))}
        </div>

        {/* Step label */}
        <p
          className="text-center text-[10px] font-black tracking-[0.25em] uppercase mb-6"
          style={{ color: "#111111" }}
        >
          Step {stepIndex + 1} of 3 —{" "}
          <span style={{ color: "#f7a221" }}>
            {step === "identifier"
              ? "Enter Email or Phone"
              : step === "otp"
              ? "Verify OTP"
              : "New Password"}
          </span>
        </p>

        {/* ── Step 1: Enter identifier (email OR phone) ── */}
        {step === "identifier" && (
          <form key="fp-identifier" onSubmit={handleRequestOTP} className="space-y-4 lr-slide-right">
            <div className="relative fp-input-wrap">
              {/* Show email or phone icon based on what user types */}
              {isEmailIdentifier ? (
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  size={17}
                  style={{ color: "#aaaaaa" }}
                />
              ) : (
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  size={17}
                  style={{ color: "#aaaaaa" }}
                />
              )}
              {/*
                CHANGED: was type="email", now type="text"
                Because backend accepts EITHER email or phone number as identifier.
                Backend determines which it received server-side.
              */}
              <input
                type="text"
                placeholder="Email address or Phone number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="email"
                style={{
                  ...inputStyle,
                  paddingRight: "16px",
                }}
                required
              />
            </div>
            <p className="text-[10px] tracking-wide pl-1" style={{ color: "#111111" }}>
              We'll send a reset OTP to your{" "}
              {identifier.includes("@") ? "email inbox" : "phone via SMS"}
            </p>
            <button type="submit" disabled={loading} className="fp-btn-primary">
              {loading ? <Loader2 className="animate-spin" size={18} /> : "SEND OTP"}
            </button>
          </form>
        )}

        {/* ── Step 2: Enter and VERIFY OTP (real backend call) ── */}
        {step === "otp" && (
          <form key="fp-otp" onSubmit={handleVerifyOTP} className="lr-slide-right">
            <p className="text-center text-[11px] mb-5" style={{ color: "#111111" }}>
              OTP sent to{" "}
              <span className="font-bold break-all" style={{ color: "#111111" }}>
                {forgotPasswordIdentifier || identifier}
              </span>
            </p>

            {/* OTP boxes */}
            <div className="flex justify-between gap-1.5 sm:gap-2 mb-5" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="fp-otp-box"
                  aria-label={`OTP digit ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={otpString.length !== 6 || loading}
              className="fp-btn-primary"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "VERIFY OTP"}
            </button>

            {/* ── Resend OTP section ── */}
            <div
              className="mt-4 rounded-2xl flex flex-col items-center gap-1 py-3 px-4"
              style={{ background: "#f9f9f9", border: "1px solid #eeeeee" }}
            >
              {resendSecondsLeft > 0 ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#111111" }}>
                    Resend OTP in{" "}
                    <span style={{ color: "#f7a221", fontVariantNumeric: "tabular-nums" }}>
                      {formatCountdown(resendSecondsLeft)}
                    </span>
                  </p>
                  <span className="text-[10px] fp-resend-disabled">Resend now</span>
                </>
              ) : (
                <>
                  <p className="text-[10px]" style={{ color: "#111111" }}>
                    Didn't receive it?
                  </p>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendLoading}
                    className="text-[10px] font-black tracking-widest uppercase flex items-center gap-1 fp-resend-active"
                    style={resendLoading ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                  >
                    {resendLoading ? (
                      <Loader2 className="animate-spin" size={12} />
                    ) : (
                      <RotateCcw size={11} />
                    )}
                    Resend OTP
                  </button>
                </>
              )}
            </div>
            {/* ── End resend section ── */}

            <button
              type="button"
              onClick={handleGoBackToIdentifier}
              className="w-full text-[10px] font-black tracking-widest uppercase transition-colors mt-3 py-2 touch-manipulation cursor-pointer"
              style={{ color: "#111111" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#111")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#111111")}
            >
              Change {identifierLabel}
            </button>
          </form>
        )}

        {/* ── Step 3: Set New Password ── */}
        {step === "password" && (
          <form
            key="fp-password"
            onSubmit={handleResetPassword}
            className="space-y-3.5 lr-slide-right"
          >
            {/* New password */}
            <div className="relative fp-input-wrap">
              <Key
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                size={17}
                style={{ color: "#aaaaaa" }}
              />
              <input
                type={showNew ? "text" : "password"}
                placeholder="New password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: "44px" }}
                required
                minLength="6"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors touch-manipulation"
                style={{ color: "#aaaaaa" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#555")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#aaaaaa")}
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Confirm password */}
            <div className="relative fp-input-wrap">
              <Key
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                size={17}
                style={{ color: "#aaaaaa" }}
              />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: "44px" }}
                required
                minLength="6"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors touch-manipulation"
                style={{ color: "#aaaaaa" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#555")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#aaaaaa")}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password match indicator */}
            {confirmPassword.length > 0 && (
              <p
                className={`text-[10px] font-bold tracking-wide pl-1 ${
                  newPassword === confirmPassword ? "fp-match-ok" : "fp-match-err"
                }`}
              >
                {newPassword === confirmPassword
                  ? "✓ Passwords match"
                  : "✗ Passwords do not match"}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading || newPassword !== confirmPassword || newPassword.length < 6
              }
              className="fp-btn-primary"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                "RESET & LOGIN"
              )}
            </button>

            {/* Hint: user will be logged in automatically */}
            <p className="text-center text-[10px] tracking-wide" style={{ color: "#aaaaaa" }}>
              You'll be redirected to login after reset
            </p>
          </form>
        )}

        {/* Bottom login link */}
        <div
          className="mt-7 text-center pt-5"
          style={{ borderTop: "1px solid #f0f0f0" }}
        >
          <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: "#aaaaaa" }}>
            Remembered it?{" "}
          </span>
          <button
            onClick={onLoginClick}
            className="text-[11px] font-black tracking-widest uppercase underline underline-offset-4 transition-colors cursor-pointer touch-manipulation"
            style={{ color: "#f7a221" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#111")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#f7a221")}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

// down code is working butt upper code have resend otp plus white theme plus auto login after reset 
// import React, { useState, useEffect, useRef } from "react";
// import { Mail, Phone, Key, ChevronLeft, Loader2, Eye, EyeOff } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import {
//   forgotPasswordRequestOTP,
//   forgotPasswordVerifyOTP,
//   forgotPasswordReset,
//   clearError,
//   clearSuccess,
//   clearForgotPasswordState,
// } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// /*
//   CHANGED: Forgot password is now a true 3-step flow with backend calls at each step.

//   OLD flow:
//     Step 1 → POST /auth/forgot-password { email }
//     Step 2 → local state only (no backend call to verify OTP)
//     Step 3 → POST /auth/reset-password { email, otp, newPassword }

//   NEW flow:
//     Step 1 → POST /auth/forgot-password/request-otp { identifier }
//              identifier = email OR phone number
//     Step 2 → POST /auth/forgot-password/verify-otp { identifier, otp }
//              REAL backend verification — invalid OTP caught here
//     Step 3 → POST /auth/forgot-password/reset { identifier, otp, newPassword }

//   The `identifier` entered in Step 1 is stored in Redux (forgotPasswordIdentifier)
//   and reused automatically in Steps 2 and 3 — user doesn't re-type it.

//   The `otp` entered in Step 2 is kept in local state and passed to Step 3.
// */

// const STEPS = ["identifier", "otp", "password"];

// const ForgotPassword = ({ onBack, onLoginClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error, successMessage, forgotPasswordIdentifier } = useSelector(
//     (state) => state.auth
//   );

//   const [identifier, setIdentifier] = useState("");
//   const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
//   const [verifiedOtp, setVerifiedOtp] = useState(""); // stored after step 2 succeeds
//   const [newPassword, setNewPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [showNew, setShowNew] = useState(false);
//   const [showConfirm, setShowConfirm] = useState(false);
//   const [localError, setLocalError] = useState("");
//   const [step, setStep] = useState("identifier");
//   const otpRefs = useRef([]);

//   useEffect(() => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//     // Don't wipe forgotPasswordIdentifier here — may be resuming a flow
//   }, [dispatch]);

//   useEffect(() => {
//     if (successMessage) {
//       toast.success(successMessage);
//       dispatch(clearSuccess());
//     }
//   }, [successMessage, dispatch]);

//   useEffect(() => {
//     if (error) {
//       toast.error(error);
//       dispatch(clearError());
//     }
//   }, [error, dispatch]);

//   useEffect(() => {
//     if (localError) {
//       toast.error(localError);
//       setLocalError("");
//     }
//   }, [localError]);

//   useEffect(() => {
//     if (step === "otp") {
//       setTimeout(() => otpRefs.current[0]?.focus(), 150);
//     }
//   }, [step]);

//   // Clean up Redux forgot password state when component unmounts
//   useEffect(() => {
//     return () => {
//       dispatch(clearForgotPasswordState());
//     };
//   }, [dispatch]);

//   // ── OTP box handlers ──────────────────────────────────────────
//   const handleOtpChange = (idx, val) => {
//     const cleaned = val.replace(/\D/g, "");
//     if (!cleaned && val) return;
//     if (cleaned.length > 1) return;
//     const next = [...otpDigits];
//     next[idx] = cleaned;
//     setOtpDigits(next);
//     if (cleaned && idx < 5) otpRefs.current[idx + 1]?.focus();
//   };

//   const handleOtpKeyDown = (idx, e) => {
//     if (e.key === "Backspace") {
//       if (otpDigits[idx]) {
//         const next = [...otpDigits];
//         next[idx] = "";
//         setOtpDigits(next);
//       } else if (idx > 0) {
//         otpRefs.current[idx - 1]?.focus();
//       }
//     }
//     if (e.key === "ArrowLeft" && idx > 0) otpRefs.current[idx - 1]?.focus();
//     if (e.key === "ArrowRight" && idx < 5) otpRefs.current[idx + 1]?.focus();
//   };

//   const handleOtpPaste = (e) => {
//     e.preventDefault();
//     const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
//     if (!pasted) return;
//     const next = [...otpDigits];
//     pasted.split("").forEach((ch, i) => { if (i < 6) next[i] = ch; });
//     setOtpDigits(next);
//     otpRefs.current[Math.min(pasted.length, 5)]?.focus();
//   };

//   const otpString = otpDigits.join("");
//   // ─────────────────────────────────────────────────────────────

//   // Determine display label for the identifier (email vs phone)
//   const isEmailIdentifier = identifier.includes("@");
//   const identifierLabel = isEmailIdentifier ? "email" : "phone";

//   // ── STEP 1: Request OTP ───────────────────────────────────────
//   const handleRequestOTP = async (e) => {
//     e.preventDefault();
//     const trimmed = identifier.trim();
//     if (!trimmed) { setLocalError("Please enter your email or phone number"); return; }

//     const result = await dispatch(forgotPasswordRequestOTP({ identifier: trimmed }));

//     if (forgotPasswordRequestOTP.fulfilled.match(result)) {
//       // identifier is now stored in Redux as forgotPasswordIdentifier
//       setStep("otp");
//     }
//     // Errors shown via toast through the error useEffect
//   };

//   // ── STEP 2: Verify OTP with backend ──────────────────────────
//   const handleVerifyOTP = async (e) => {
//     e.preventDefault();
//     if (otpString.length !== 6) { setLocalError("Enter all 6 digits"); return; }

//     // Use identifier from Redux (set in step 1) — single source of truth
//     const activeIdentifier = forgotPasswordIdentifier || identifier.trim();

//     // CHANGED: Now makes a real backend call to verify OTP
//     // Old code just did setStep("password") with no server check
//     const result = await dispatch(
//       forgotPasswordVerifyOTP({ identifier: activeIdentifier, otp: otpString })
//     );

//     if (forgotPasswordVerifyOTP.fulfilled.match(result)) {
//       // Store OTP locally — needed for step 3 reset call
//       setVerifiedOtp(otpString);
//       setStep("password");
//     }
//     // Invalid OTP / expired → backend returns 400, error shown via toast
//   };

//   // ── STEP 3: Reset Password ────────────────────────────────────
//   const handleResetPassword = async (e) => {
//     e.preventDefault();
//     if (newPassword !== confirmPassword) { setLocalError("Passwords do not match"); return; }
//     if (newPassword.length < 6) { setLocalError("Min 6 characters required"); return; }

//     const activeIdentifier = forgotPasswordIdentifier || identifier.trim();

//     const result = await dispatch(
//       forgotPasswordReset({
//         identifier: activeIdentifier,
//         otp: verifiedOtp,
//         newPassword,
//       })
//     );

//     if (forgotPasswordReset.fulfilled.match(result)) {
//       toast.success("Password reset! You can now login.");
//       setTimeout(() => onLoginClick(), 1800);
//     }
//   };

//   const stepIndex = STEPS.indexOf(step);

//   const handleGoBackToIdentifier = () => {
//     setOtpDigits(["", "", "", "", "", ""]);
//     setVerifiedOtp("");
//     dispatch(clearForgotPasswordState());
//     setStep("identifier");
//   };

//   return (
//     <div className="w-full">
//       <button
//         onClick={onBack}
//         className="flex items-center gap-1 text-[#f7a221] hover:text-white font-bold text-[10px] tracking-widest transition-colors mb-5 uppercase cursor-pointer touch-manipulation"
//       >
//         <ChevronLeft size={16} /> Back
//       </button>

//       <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-1 text-center">
//         RESET <span className="text-[#f7a221]">PASSWORD</span>
//       </h2>
//       <p className="text-white/35 text-[10px] text-center uppercase tracking-widest mb-6">
//         Follow steps to recover account
//       </p>

//       {/* Step progress bar */}
//       <div className="flex gap-2 mb-7">
//         {STEPS.map((s, i) => (
//           <div
//             key={s}
//             className="flex-1 h-1 rounded-full transition-all duration-500"
//             style={{
//               background: stepIndex >= i ? "#f7a221" : "rgba(255,255,255,0.08)",
//               boxShadow: stepIndex >= i ? "0 0 8px rgba(247,162,33,0.4)" : "none",
//             }}
//           />
//         ))}
//       </div>

//       {/* Step label */}
//       <p className="text-center text-[10px] font-black tracking-[0.25em] text-white/30 uppercase mb-6">
//         Step {stepIndex + 1} of 3 —{" "}
//         <span className="text-[#f7a221]">
//           {step === "identifier"
//             ? "Enter Email or Phone"
//             : step === "otp"
//             ? "Verify OTP"
//             : "New Password"}
//         </span>
//       </p>

//       {/* ── Step 1: Enter identifier (email OR phone) ── */}
//       {step === "identifier" && (
//         <form key="fp-identifier" onSubmit={handleRequestOTP} className="space-y-4 lr-slide-right">
//           <div className="relative">
//             {/* Show email or phone icon based on what user types */}
//             {isEmailIdentifier ? (
//               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             ) : (
//               <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             )}
//             {/*
//               CHANGED: was type="email", now type="text"
//               Because backend accepts EITHER email or phone number as identifier.
//               Backend determines which it received server-side.
//             */}
//             <input
//               type="text"
//               placeholder="Email address or Phone number"
//               value={identifier}
//               onChange={(e) => setIdentifier(e.target.value)}
//               autoComplete="email"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 transition-all text-sm"
//               style={{ fontSize: "16px" }}
//               required
//             />
//           </div>
//           <p className="text-white/25 text-[10px] tracking-wide pl-1">
//             We'll send a reset OTP to your {identifier.includes("@") ? "email inbox" : "phone via SMS"}
//           </p>
//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-50 text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase shadow-[0_8px_20px_rgba(247,162,33,0.25)] cursor-pointer touch-manipulation"
//           >
//             {loading ? <Loader2 className="animate-spin" size={18} /> : "SEND OTP"}
//           </button>
//         </form>
//       )}

//       {/* ── Step 2: Enter and VERIFY OTP (real backend call) ── */}
//       {step === "otp" && (
//         <form key="fp-otp" onSubmit={handleVerifyOTP} className="lr-slide-right">
//           <p className="text-center text-white/40 text-[11px] mb-5">
//             OTP sent to{" "}
//             <span className="text-white font-bold break-all">
//               {forgotPasswordIdentifier || identifier}
//             </span>
//           </p>

//           <div className="flex justify-between gap-1.5 sm:gap-2 mb-5" onPaste={handleOtpPaste}>
//             {otpDigits.map((digit, idx) => (
//               <input
//                 key={idx}
//                 ref={(el) => (otpRefs.current[idx] = el)}
//                 type="text"
//                 inputMode="numeric"
//                 pattern="[0-9]*"
//                 maxLength="1"
//                 value={digit}
//                 onChange={(e) => handleOtpChange(idx, e.target.value)}
//                 onKeyDown={(e) => handleOtpKeyDown(idx, e)}
//                 style={{ fontSize: "20px" }}
//                 className="flex-1 min-w-0 aspect-square bg-white/[0.04] border border-white/10 rounded-xl text-center text-white font-black focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/40 transition-all caret-transparent touch-manipulation"
//                 aria-label={`OTP digit ${idx + 1}`}
//               />
//             ))}
//           </div>

//           <button
//             type="submit"
//             disabled={otpString.length !== 6 || loading}
//             className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-40 text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase shadow-[0_8px_20px_rgba(247,162,33,0.25)] cursor-pointer touch-manipulation"
//           >
//             {loading ? <Loader2 className="animate-spin" size={18} /> : "VERIFY OTP"}
//           </button>

//           <button
//             type="button"
//             onClick={handleGoBackToIdentifier}
//             className="w-full text-white/30 hover:text-white text-[10px] font-black tracking-widest uppercase transition-colors mt-3 py-2 touch-manipulation cursor-pointer"
//           >
//             Change {identifierLabel}
//           </button>
//         </form>
//       )}

//       {/* ── Step 3: Set New Password ── */}
//       {step === "password" && (
//         <form key="fp-password" onSubmit={handleResetPassword} className="space-y-3.5 lr-slide-right">
//           <div className="relative">
//             <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type={showNew ? "text" : "password"}
//               placeholder="New password (min 6 chars)"
//               value={newPassword}
//               onChange={(e) => setNewPassword(e.target.value)}
//               autoComplete="new-password"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-4 pl-11 pr-11 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 transition-all text-sm"
//               style={{ fontSize: "16px" }}
//               required
//               minLength="6"
//             />
//             <button
//               type="button"
//               onClick={() => setShowNew((v) => !v)}
//               className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors touch-manipulation"
//               tabIndex={-1}
//             >
//               {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
//             </button>
//           </div>

//           <div className="relative">
//             <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type={showConfirm ? "text" : "password"}
//               placeholder="Confirm new password"
//               value={confirmPassword}
//               onChange={(e) => setConfirmPassword(e.target.value)}
//               autoComplete="new-password"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-4 pl-11 pr-11 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 transition-all text-sm"
//               style={{ fontSize: "16px" }}
//               required
//               minLength="6"
//             />
//             <button
//               type="button"
//               onClick={() => setShowConfirm((v) => !v)}
//               className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors touch-manipulation"
//               tabIndex={-1}
//             >
//               {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
//             </button>
//           </div>

//           {confirmPassword.length > 0 && (
//             <p className={`text-[10px] font-bold tracking-wide pl-1 ${newPassword === confirmPassword ? "text-green-400" : "text-red-400"}`}>
//               {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
//             </p>
//           )}

//           <button
//             type="submit"
//             disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
//             className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-40 text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase shadow-[0_8px_20px_rgba(247,162,33,0.25)] cursor-pointer touch-manipulation"
//           >
//             {loading ? <Loader2 className="animate-spin" size={18} /> : "RESET PASSWORD"}
//           </button>
//         </form>
//       )}

//       <div className="mt-7 text-center border-t border-white/5 pt-5">
//         <span className="text-white/25 text-[11px] font-bold tracking-widest uppercase">Remembered it? </span>
//         <button
//           onClick={onLoginClick}
//           className="text-[#f7a221] hover:text-white text-[11px] font-black tracking-widest uppercase underline underline-offset-4 transition-colors cursor-pointer touch-manipulation"
//         >
//           Login
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ForgotPassword;

// import React, { useState, useEffect } from "react";
// import { Mail, Key, ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { forgotPassword, resetPassword, clearError, clearSuccess } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// const ForgotPassword = ({ onBack, onLoginClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error, successMessage } = useSelector((state) => state.auth);

//   const [email, setEmail] = useState("");
//   const [otp, setOtp] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [localError, setLocalError] = useState("");
//   const [step, setStep] = useState("email");

//   useEffect(() => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//   }, [dispatch]);

//   useEffect(() => {
//     if (successMessage) { toast.success(successMessage); dispatch(clearSuccess()); }
//   }, [successMessage, dispatch]);

//   useEffect(() => {
//     if (error) { toast.error(error); dispatch(clearError()); }
//   }, [error, dispatch]);

//   useEffect(() => {
//     if (localError) { toast.error(localError); setLocalError(""); }
//   }, [localError]);

//   const handleSendOTP = async (e) => {
//     e.preventDefault();
//     const result = await dispatch(forgotPassword({ email }));
//     if (forgotPassword.fulfilled.match(result)) setStep("otp");
//   };

//   const handleVerifyOTP = (e) => {
//     e.preventDefault();
//     if (otp.length !== 6) { setLocalError("Enter 6-digit OTP"); return; }
//     setStep("password");
//   };

//   const handleResetPassword = async (e) => {
//     e.preventDefault();
//     if (newPassword !== confirmPassword) { setLocalError("Passwords do not match"); return; }
//     if (newPassword.length < 6) { setLocalError("Min 6 characters required"); return; }

//     const result = await dispatch(resetPassword({ email, otp, newPassword }));
//     if (resetPassword.fulfilled.match(result)) {
//       setTimeout(() => { onLoginClick(); }, 2000);
//     }
//   };

//   return (
//     <div className="w-full animate-in fade-in slide-in-from-right-4 duration-500">
//       <button onClick={onBack} className="flex items-center gap-1 text-[#f7a221] hover:text-white font-bold text-[10px] tracking-widest transition-all mb-6 uppercase">
//         <ChevronLeft size={16} /> Back
//       </button>

//       <h2 className="text-4xl font-black text-white tracking-tighter mb-2 text-center">
//         RESET <span className="text-[#f7a221]">PASSWORD</span>
//       </h2>
//       <p className="text-gray-500 text-[10px] text-center uppercase tracking-widest mb-8">Follow steps to recover account</p>

//       {/* Modern Step Indicator */}
//       <div className="flex items-center gap-3 mb-10 px-4">
//         {["email", "otp", "password"].map((s, i) => (
//           <div key={s} className="flex-1 flex items-center gap-2">
//             <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
//               ["email", "otp", "password"].indexOf(step) >= i ? "bg-[#f7a221] shadow-[0_0_10px_rgba(247,162,33,0.5)]" : "bg-white/10"
//             }`} />
//           </div>
//         ))}
//       </div>

//       {/* Small Error UI */}
//       {(localError || error) && (
//         <div className="mb-6 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[11px] text-center font-medium animate-pulse">
//           {localError || error}
//         </div>
//       )}

//       {step === "email" && (
//         <form onSubmit={handleSendOTP} className="space-y-4">
//           <div className="relative">
//             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)}
//               className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#f7a221] transition-all text-sm" required />
//           </div>
//           <button type="submit" disabled={loading} className="w-full bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-tighter shadow-lg">
//             {loading ? <Loader2 className="animate-spin" size={20} /> : "SEND OTP"}
//           </button>
//         </form>
//       )}

//       {step === "otp" && (
//         <form onSubmit={handleVerifyOTP} className="space-y-4">
//           <div className="relative">
//             <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="text" placeholder="6-Digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
//               className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-center tracking-[0.5em] font-black focus:outline-none focus:border-[#f7a221] transition-all text-lg" required maxLength="6" />
//           </div>
//           <button type="submit" className="w-full bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 rounded-2xl transition-all text-sm uppercase">VERIFY OTP</button>
//           <button type="button" onClick={() => setStep("email")} className="w-full text-gray-600 hover:text-white text-[10px] font-black tracking-widest uppercase transition-colors">Change email</button>
//         </form>
//       )}

//       {step === "password" && (
//         <form onSubmit={handleResetPassword} className="space-y-4">
//           <div className="relative">
//             <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
//               className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#f7a221] transition-all text-sm" required minLength="6" />
//           </div>
//           <div className="relative">
//             <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
//               className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#f7a221] transition-all text-sm" required minLength="6" />
//           </div>
//           <button type="submit" disabled={loading} className="w-full bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase shadow-lg">
//             {loading ? <Loader2 className="animate-spin" size={20} /> : "RESET PASSWORD"}
//           </button>
//         </form>
//       )}

//       <div className="mt-8 text-center border-t border-white/5 pt-6">
//         <span className="text-gray-600 text-[11px] font-bold tracking-widest uppercase">Remembered it? </span>
//         <button onClick={onLoginClick} className="text-[#f7a221] hover:text-white text-[11px] font-black tracking-widest uppercase underline underline-offset-4">Login</button>
//       </div>
//     </div>
//   );
// };

// export default ForgotPassword;


// // components/USER_LOGIN_SEGMENT/ForgotPassword.jsx
// import React, { useState, useEffect } from "react";
// import { Mail, Key, ArrowLeft } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   forgotPassword,
//   resetPassword,
//   clearError,
//   clearSuccess,
// } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// const ForgotPassword = ({ onBack, onLoginClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error, successMessage } = useSelector((state) => state.auth);

//   const [email, setEmail] = useState("");
//   const [otp, setOtp] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [localError, setLocalError] = useState("");
//   const [step, setStep] = useState("email"); // email | otp | password

//   // Clear redux state on mount
//   useEffect(() => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//   }, [dispatch]);

//   // ✅ Step 1: Send OTP to email
//   const handleSendOTP = async (e) => {
//     e.preventDefault();
//     setLocalError("");
//     dispatch(clearError());

//     const result = await dispatch(forgotPassword({ email }));
//     if (forgotPassword.fulfilled.match(result)) {
//       setStep("otp"); // ✅ Move to OTP step
//     }
//   };

//   // ✅ Step 2: Verify OTP (client-side only, actual verify happens at reset)
//   const handleVerifyOTP = (e) => {
//     e.preventDefault();
//     setLocalError("");
//     if (otp.length !== 6) {
//       setLocalError("Please enter 6-digit OTP");
//       return;
//     }
//     setStep("password"); // ✅ Move to password reset step
//   };

//   // ✅ Step 3: Reset password with OTP
//   const handleResetPassword = async (e) => {
//     e.preventDefault();
//     setLocalError("");
//     dispatch(clearError());

//     if (newPassword !== confirmPassword) {
//       setLocalError("Passwords do not match");
//       return;
//     }
//     if (newPassword.length < 6) {
//       setLocalError("Password must be at least 6 characters");
//       return;
//     }

//     const result = await dispatch(
//       resetPassword({ email, otp, newPassword })
//     );

//     if (resetPassword.fulfilled.match(result)) {
//       // ✅ Password reset — redirect to login after 2s
//       setTimeout(() => {
//         dispatch(clearSuccess());
//         onLoginClick();
//       }, 2000);
//     }
//   };

//   const displayError = localError || error;

//   return (
//     <div className="w-full">
//       <div className="flex items-center gap-4 mb-6">
//         <button onClick={onBack} className="text-gray-500 hover:text-white">
//           <ArrowLeft size={20} />
//         </button>
//         <h2 className="text-3xl font-black text-white tracking-tighter">
//           RESET <span className="text-[#f7a221]">PASSWORD</span>
//         </h2>
//       </div>

//       {/* Steps indicator */}
//       <div className="flex items-center gap-2 mb-6">
//         {["email", "otp", "password"].map((s, i) => (
//           <React.Fragment key={s}>
//             <div
//               className={`h-1 flex-1 rounded-full transition-all ${
//                 ["email", "otp", "password"].indexOf(step) >= i
//                   ? "bg-[#f7a221]"
//                   : "bg-white/10"
//               }`}
//             />
//           </React.Fragment>
//         ))}
//       </div>

//       {/* ✅ Success message */}
//       {successMessage && (
//         <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm">
//           {successMessage}
//         </div>
//       )}

//       {/* ✅ Error message */}
//       {displayError && (
//         <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
//           {displayError}
//         </div>
//       )}

//       {/* ── Step 1: Email ─────────────────────────────────────── */}
//       {step === "email" && (
//         <form onSubmit={handleSendOTP} className="space-y-4">
//           <p className="text-gray-400 text-sm mb-4">
//             Enter your registered email to receive a password reset OTP.
//           </p>
//           <div className="relative">
//             <Mail
//               className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//               size={18}
//             />
//             <input
//               type="email"
//               placeholder="Email Address"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//               required
//             />
//           </div>
//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-[#f7a221] hover:bg-[#e0911c] disabled:opacity-60 disabled:cursor-not-allowed text-black font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
//           >
//             {loading ? (
//               <span className="flex items-center gap-2">
//                 <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
//                 </svg>
//                 Sending...
//               </span>
//             ) : (
//               "SEND OTP"
//             )}
//           </button>
//         </form>
//       )}

//       {/* ── Step 2: OTP ───────────────────────────────────────── */}
//       {step === "otp" && (
//         <form onSubmit={handleVerifyOTP} className="space-y-4">
//           <p className="text-gray-400 text-sm mb-4">
//             Enter the 6-digit OTP sent to{" "}
//             <span className="text-[#f7a221]">{email}</span>
//           </p>
//           <div className="relative">
//             <Mail
//               className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//               size={18}
//             />
//             <input
//               type="text"
//               placeholder="Enter 6-digit OTP"
//               value={otp}
//               onChange={(e) =>
//                 setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
//               }
//               className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all tracking-[0.5em] text-center text-lg"
//               required
//               maxLength="6"
//               inputMode="numeric"
//             />
//           </div>
//           <button
//             type="submit"
//             className="w-full bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 px-6 rounded-2xl transition-all"
//           >
//             VERIFY OTP
//           </button>
//           <button
//             type="button"
//             onClick={() => setStep("email")}
//             className="w-full text-gray-500 hover:text-white text-sm transition-colors"
//           >
//             ← Change email
//           </button>
//         </form>
//       )}

//       {/* ── Step 3: New Password ──────────────────────────────── */}
//       {step === "password" && (
//         <form onSubmit={handleResetPassword} className="space-y-4">
//           <p className="text-gray-400 text-sm mb-4">
//             Enter your new password below.
//           </p>
//           <div className="relative">
//             <Key
//               className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//               size={18}
//             />
//             <input
//               type="password"
//               placeholder="New Password"
//               value={newPassword}
//               onChange={(e) => setNewPassword(e.target.value)}
//               className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//               required
//               minLength="6"
//             />
//           </div>
//           <div className="relative">
//             <Key
//               className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//               size={18}
//             />
//             <input
//               type="password"
//               placeholder="Confirm Password"
//               value={confirmPassword}
//               onChange={(e) => setConfirmPassword(e.target.value)}
//               className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//               required
//               minLength="6"
//             />
//           </div>
//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-[#f7a221] hover:bg-[#e0911c] disabled:opacity-60 disabled:cursor-not-allowed text-black font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
//           >
//             {loading ? (
//               <span className="flex items-center gap-2">
//                 <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
//                 </svg>
//                 Resetting...
//               </span>
//             ) : (
//               "RESET PASSWORD"
//             )}
//           </button>
//         </form>
//       )}

//       <div className="mt-6 text-center">
//         <span className="text-gray-500 text-sm">Remember your password? </span>
//         <button
//           onClick={onLoginClick}
//           className="text-[#f7a221] hover:underline text-sm font-medium"
//         >
//           Login here
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ForgotPassword;

// // components/USER_LOGIN_SEGMENT/ForgotPassword.jsx
// import React, { useState } from 'react';
// import { Mail, Key, ArrowLeft } from 'lucide-react';

// const ForgotPassword = ({ onBack, onLoginClick }) => {
//     const [email, setEmail] = useState('');
//     const [otp, setOtp] = useState('');
//     const [newPassword, setNewPassword] = useState('');
//     const [confirmPassword, setConfirmPassword] = useState('');
//     const [localError, setLocalError] = useState('');
//     const [success, setSuccess] = useState('');
//     const [step, setStep] = useState('email'); // email, otp, password

//     const handleSendOTP = (e) => {
//         e.preventDefault();
//         setLocalError('');
        
//         if (!email) {
//             setLocalError('Please enter your email');
//             return;
//         }

//         setStep('otp');
//         alert('OTP sent to your email! (Demo)');
//     };

//     const handleVerifyOTP = (e) => {
//         e.preventDefault();
//         if (otp.length !== 6) {
//             setLocalError('Please enter 6-digit OTP');
//             return;
//         }
//         setStep('password');
//         setLocalError('');
//     };

//     const handleResetPassword = (e) => {
//         e.preventDefault();
//         setLocalError('');

//         if (newPassword !== confirmPassword) {
//             setLocalError('Passwords do not match');
//             return;
//         }

//         if (newPassword.length < 6) {
//             setLocalError('Password must be at least 6 characters');
//             return;
//         }

//         setSuccess('Password reset successful! Please login.');
//         setTimeout(() => {
//             onLoginClick();
//         }, 2000);
//     };

//     return (
//         <div className="w-full">
//             <div className="flex items-center gap-4 mb-6">
//                 <button 
//                     onClick={onBack}
//                     className="text-gray-500 hover:text-white"
//                 >
//                     <ArrowLeft size={20} />
//                 </button>
//                 <h2 className="text-3xl font-black text-white tracking-tighter">
//                     RESET <span className="text-[#f7a221]">PASSWORD</span>
//                 </h2>
//             </div>

//             {success && (
//                 <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm">
//                     {success}
//                 </div>
//             )}

//             {localError && (
//                 <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
//                     {localError}
//                 </div>
//             )}

//             {step === 'email' && (
//                 <form onSubmit={handleSendOTP} className="space-y-4">
//                     <div className="relative">
//                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
//                         <input
//                             type="email"
//                             placeholder="Email Address"
//                             value={email}
//                             onChange={(e) => setEmail(e.target.value)}
//                             className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                             required
//                         />
//                     </div>

//                     <button
//                         type="submit"
//                         className="w-full bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 px-6 rounded-2xl transition-all"
//                     >
//                         SEND OTP
//                     </button>
//                 </form>
//             )}

//             {step === 'otp' && (
//                 <form onSubmit={handleVerifyOTP} className="space-y-4">
//                     <div className="relative">
//                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
//                         <input
//                             type="text"
//                             placeholder="Enter 6-digit OTP"
//                             value={otp}
//                             onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
//                             className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                             required
//                             maxLength="6"
//                         />
//                     </div>

//                     <button
//                         type="submit"
//                         className="w-full bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 px-6 rounded-2xl transition-all"
//                     >
//                         VERIFY OTP
//                     </button>
//                 </form>
//             )}

//             {step === 'password' && (
//                 <form onSubmit={handleResetPassword} className="space-y-4">
//                     <div className="relative">
//                         <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
//                         <input
//                             type="password"
//                             placeholder="New Password"
//                             value={newPassword}
//                             onChange={(e) => setNewPassword(e.target.value)}
//                             className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                             required
//                             minLength="6"
//                         />
//                     </div>

//                     <div className="relative">
//                         <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
//                         <input
//                             type="password"
//                             placeholder="Confirm Password"
//                             value={confirmPassword}
//                             onChange={(e) => setConfirmPassword(e.target.value)}
//                             className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                             required
//                             minLength="6"
//                         />
//                     </div>

//                     <button
//                         type="submit"
//                         className="w-full bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 px-6 rounded-2xl transition-all"
//                     >
//                         RESET PASSWORD
//                     </button>
//                 </form>
//             )}

//             <div className="mt-6 text-center">
//                 <span className="text-gray-500 text-sm">Remember your password? </span>
//                 <button 
//                     onClick={onLoginClick}
//                     className="text-[#f7a221] hover:underline text-sm font-medium"
//                 >
//                     Login here
//                 </button>
//             </div>
//         </div>
//     );
// };

// export default ForgotPassword;