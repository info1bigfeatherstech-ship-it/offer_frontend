import React, { useState, useEffect } from "react";
import { Phone, Key, ChevronLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  forgotPasswordFindUser,
  forgotPasswordResetDirect,
  loginUser,
  clearError,
  clearSuccess,
  clearForgotPasswordState,
} from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
import LOGO from "../../assets/logo2.svg";

/*
  Option D forgot-password flow (ecomm):

  Step 1 → POST /auth/forgot-password/find-user { phone }
           - Generic success message whether account exists or not
           - If resetToken is returned → go to password step
           - If no resetToken → stay on phone step (anti-enumeration)

  Step 2 → POST /auth/forgot-password/reset-direct
           { resetToken, newPassword, confirmPassword }
           - Then auto-login with phone + new password

  Legacy 3-step OTP UI (identifier → OTP → password) was intentionally
  removed from live wiring. Wholesale still uses the old OTP endpoints.
*/

const STEPS = ["phone", "password"];

const ForgotPassword = ({ onBack, onLoginClick, onLoginSuccess }) => {
  const dispatch = useDispatch();
  const { loading, error, successMessage, resetToken, forgotPasswordPhone } = useSelector(
    (state) => state.auth
  );

  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState("phone");

  const showLocalError = (message) => {
    toast.error(message);
  };

  useEffect(() => {
    dispatch(clearError());
    dispatch(clearSuccess());
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
    return () => {
      dispatch(clearForgotPasswordState());
    };
  }, [dispatch]);

  // ── STEP 1: Find user by phone ────────────────────────────────
  const handleFindUser = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      showLocalError("Phone number must be exactly 10 digits");
      return;
    }

    const result = await dispatch(forgotPasswordFindUser({ phone: cleanPhone }));

    if (forgotPasswordFindUser.fulfilled.match(result)) {
      if (result.payload?.resetToken) {
        setStep("password");
      }
      // No resetToken → stay on phone step. Backend returns the same generic
      // success message either way (anti-enumeration).
    }
  };

  // ── STEP 2: Reset password with short-lived token ─────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showLocalError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      showLocalError("Min 6 characters required");
      return;
    }
    if (!resetToken) {
      showLocalError("Reset session expired. Please start again.");
      setStep("phone");
      return;
    }

    const activePhone = forgotPasswordPhone || phone.trim();

    const result = await dispatch(
      forgotPasswordResetDirect({
        resetToken,
        newPassword,
        confirmPassword,
      })
    );

    if (forgotPasswordResetDirect.fulfilled.match(result)) {
      toast.success("Password reset! Logging you in...");
      const loginResult = await dispatch(
        loginUser({ identifier: activePhone, password: newPassword })
      );
      if (loginUser.fulfilled.match(loginResult)) {
        onLoginSuccess();
      } else {
        setTimeout(() => onLoginClick(), 1200);
      }
    }
  };

  const stepIndex = STEPS.indexOf(step);

  const handleGoBackToPhone = () => {
    dispatch(clearForgotPasswordState());
    setNewPassword("");
    setConfirmPassword("");
    setStep("phone");
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

  return (
    <div className="w-full" style={{ color: "#111111" }}>
      <style>{`
        .fp-white-wrap { background: #ffffff; color: #111111; }
        .fp-input-wrap input::placeholder { color: #aaaaaa; }
        .fp-input-wrap input:focus {
          border-color: #f7a221 !important;
          box-shadow: 0 0 0 3px rgba(247,162,33,0.15) !important;
          background: #fffdf7 !important;
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
        .fp-step-bar-done { background: #f7a221; box-shadow: 0 0 6px rgba(247,162,33,0.35); }
        .fp-step-bar-todo { background: #e5e5e5; }
        .fp-match-ok  { color: #16a34a; }
        .fp-match-err { color: #dc2626; }
      `}</style>

      <div className="fp-white-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1 font-bold text-[10px] tracking-widest transition-colors mb-5 uppercase cursor-pointer touch-manipulation"
          style={{ color: "#f7a221" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#111")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#f7a221")}
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="flex justify-center mb-6 sm:mb-7 md:mb-8">
          <img
            src={LOGO}
            alt="OfferWale Baba"
            className="w-20 h-20 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-28 object-cover transition-transform duration-300"
            style={{
              maxWidth: "100%",
              height: "auto",
              aspectRatio: "1",
            }}
          />
        </div>

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

        <p
          className="text-center text-[10px] font-black tracking-[0.25em] uppercase mb-6"
          style={{ color: "#111111" }}
        >
          Step {stepIndex + 1} of 2 —{" "}
          <span style={{ color: "#f7a221" }}>
            {step === "phone" ? "Enter Phone" : "New Password"}
          </span>
        </p>

        {step === "phone" && (
          <form key="fp-phone" onSubmit={handleFindUser} className="space-y-4 lr-slide-right">
            <div className="relative fp-input-wrap">
              <Phone
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                size={17}
                style={{ color: "#aaaaaa" }}
              />
              <input
                type="tel"
                placeholder="Phone Number (10 digits)"
                value={phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(digits);
                }}
                autoComplete="tel"
                inputMode="numeric"
                style={{
                  ...inputStyle,
                  paddingRight: "16px",
                }}
                required
                minLength={10}
                maxLength={10}
              />
            </div>
            <p className="text-[10px] tracking-wide pl-1" style={{ color: "#111111" }}>
              Enter the phone number linked to your account
            </p>
            <button type="submit" disabled={loading} className="fp-btn-primary">
              {loading ? <Loader2 className="animate-spin" size={18} /> : "CONTINUE"}
            </button>
          </form>
        )}

        {step === "password" && (
          <form
            key="fp-password"
            onSubmit={handleResetPassword}
            className="space-y-3.5 lr-slide-right"
          >
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

            <button
              type="button"
              onClick={handleGoBackToPhone}
              className="w-full text-[10px] font-black tracking-widest uppercase transition-colors mt-1 py-2 touch-manipulation cursor-pointer"
              style={{ color: "#111111" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#111")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#111111")}
            >
              Change phone number
            </button>

            <p className="text-center text-[10px] tracking-wide" style={{ color: "#aaaaaa" }}>
              You'll be logged in automatically after reset
            </p>
          </form>
        )}

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
