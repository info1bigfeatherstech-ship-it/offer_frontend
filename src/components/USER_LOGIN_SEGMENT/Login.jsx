import React, { useState, useEffect, useRef } from "react";
import { User, Lock, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { loginUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
import LOGO from "../../assets/logo2.svg";

// ── Shared Google icon (used by Register too) ──────────────────
export const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

// ── Progressive lockout constants ──────────────────────────────
const LOCKOUT_SEQUENCE = [0, 0, 30, 60, 300];
const getLockDuration  = (failCount) =>
  LOCKOUT_SEQUENCE[Math.min(failCount, LOCKOUT_SEQUENCE.length - 1)];

const STORAGE_KEY = "lr_login_lock";
const readLock    = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; } };
const writeLock   = (data) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} };
const clearLock   = () => { try { localStorage.removeItem(STORAGE_KEY); } catch {} };

const Login = ({ onLoginSuccess, onRegisterClick, onForgotPasswordClick }) => {
  const dispatch     = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const googleBtnRef = useRef(null);

  // identifier accepts email address OR phone number
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);

  // ── Lockout state ──────────────────────────────────────────────
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const [failCount,       setFailCount]       = useState(0);
  const lockTimerRef = useRef(null);

  useEffect(() => {
    const saved = readLock();
    if (saved) {
      const remaining = Math.ceil((saved.unlocksAt - Date.now()) / 1000);
      if (remaining > 0) { setFailCount(saved.failCount); setLockSecondsLeft(remaining); }
      else { clearLock(); }
    }
    return () => clearInterval(lockTimerRef.current);
  }, []);

  useEffect(() => {
    clearInterval(lockTimerRef.current);
    if (lockSecondsLeft > 0) {
      lockTimerRef.current = setInterval(() => {
        setLockSecondsLeft((s) => {
          if (s <= 1) { clearInterval(lockTimerRef.current); clearLock(); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(lockTimerRef.current);
  }, [lockSecondsLeft]);

  const startLock = (newFailCount) => {
    const duration = getLockDuration(newFailCount);
    if (duration > 0) {
      const unlocksAt = Date.now() + duration * 1000;
      writeLock({ failCount: newFailCount, unlocksAt });
      setLockSecondsLeft(duration);
    }
  };

  const formatLockTime = (s) => {
    if (s >= 60) return `${Math.ceil(s / 60)}m ${s % 60 > 0 ? `${s % 60}s` : ""}`.trim();
    return `${s}s`;
  };

  useEffect(() => { dispatch(clearError()); }, [dispatch]);
  useEffect(() => { if (error) toast.error(error); }, [error]);

  // ── Google OAuth ───────────────────────────────────────────────
  const handleGoogleClick = () => {
    
    if (googleBtnRef.current) {
      const googleDiv = googleBtnRef.current.querySelector('div[role="button"]');
      if (googleDiv) googleDiv.click();
      else {
        const iframe = googleBtnRef.current.querySelector("iframe");
        if (iframe) iframe.click();
      }
    }
  };

  useEffect(() => {
    const init = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
        use_fedcm_for_prompt: true,
        callback: async (response) => {
          const result = await dispatch(googleLogin({ idToken: response.credential }));
          if (googleLogin.fulfilled.match(result)) {
            clearLock();
            toast.success("Logged in with Google!");
            onLoginSuccess();
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, { theme: "outline", size: "large" });
    };
    if (!window.google) {
      const script = document.createElement("script");
      script.src     = "https://accounts.google.com/gsi/client";
      script.async   = true;
      script.onload  = init;
      document.body.appendChild(script);
    } else { init(); }
  }, [dispatch, onLoginSuccess]);
  // ──────────────────────────────────────────────────────────────

  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockSecondsLeft > 0) return;

    const result = await dispatch(loginUser({ identifier, password }));
    if (loginUser.fulfilled.match(result)) {
      clearLock();
      setFailCount(0);
      setLockSecondsLeft(0);
      toast.success("Welcome back!");
      onLoginSuccess();
    } else {
      const newFail = failCount + 1;
      setFailCount(newFail);
      startLock(newFail);
      const duration = getLockDuration(newFail);
      if (duration > 0) toast.error(`Too many attempts. Locked for ${formatLockTime(duration)}.`);
    }
  };

  const isLocked = lockSecondsLeft > 0;

  // ── White theme input style ────────────────────────────────────
  const inputBase = {
    width: "100%",
    background: "#f5f5f5",
    border: "1.5px solid #e8e8e8",
    borderRadius: "12px",
    padding: "12px 16px 12px 40px",
    color: "#111111",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  };
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* White theme scoped styles */}
      <style>{`
        .login-white input::placeholder { color: #aaaaaa; }
        .login-white input:focus {
          border-color: #f7a221 !important;
          box-shadow: 0 0 0 3px rgba(247,162,33,0.15) !important;
          background: #fffdf7 !important;
        }
        .login-white input:disabled { opacity: 0.4; }
        .login-btn-primary {
          width: 100%;
          background: #f7a221;
          color: #000000;
          font-weight: 900;
          padding: 14px 0;
          border-radius: 12px;
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
          box-shadow: 0 6px 18px rgba(247,162,33,0.25);
        }
        .login-btn-primary:hover:not(:disabled) { background: #e0911c; }
        .login-btn-primary:active:not(:disabled) { background: #c97e18; transform: scale(0.99); }
        .login-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .login-btn-google {
          width: 100%;
          background: #ffffff;
          border: 1.5px solid #e8e8e8;
          border-radius: 12px;
          padding: 12px 16px;
          color: #111111;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: background 0.18s, box-shadow 0.18s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .login-btn-google:hover:not(:disabled) { background: #f9f9f9; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
        .login-btn-google:disabled { opacity: 0.4; cursor: not-allowed; }
        .login-divider-line { border-color: #e8e8e8; }
        .login-divider-text { background: #ffffff; color: #aaaaaa; }
      `}</style>

      <div className="login-white">
        {/* Hidden Google button mount point */}
        <div ref={googleBtnRef} style={{ display: "none" }} />

        {/* Logo — compact on all screens */}
        <div className="flex justify-center mb-3">
          <img
            src={LOGO}
            alt="OfferWale Baba"
            className="h-14 sm:h-[72px] w-auto object-contain rounded"
          />
        </div>

        <h2
          className="text-lg sm:text-xl text-center mb-0.5 tracking-tighter font-black"
          style={{ color: "#111111" }}
        >
          WELCOME <span style={{ color: "#f7a221" }}>BACK</span>
        </h2>
        <p
          className="text-[10px] tracking-widest mb-3 text-center uppercase"
          style={{ color: "#999999" }}
        >
          Access your premium dashboard
        </p>

        {/* Error banner */}
        {error && !isLocked && (
          <div
            className="mb-3 p-2.5 rounded-xl text-[11px] text-center font-medium"
            style={{
              background: "#fff0f0",
              border: "1px solid #ffd0d0",
              color: "#cc3333",
            }}
          >
            {error}
          </div>
        )}

        {/* Lockout banner */}
        {isLocked && (
          <div
            className="mb-3 p-2.5 rounded-xl flex items-center gap-2"
            style={{
              background: "#fff8ee",
              border: "1px solid #fde4b0",
            }}
          >
            <ShieldAlert size={15} style={{ color: "#f7a221", flexShrink: 0 }} />
            <div>
              <p
                className="text-[11px] font-black uppercase tracking-wide"
                style={{ color: "#c97e18" }}
              >
                Account temporarily locked
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "#c97e18", opacity: 0.8 }}>
                Try again in{" "}
                <span className="font-bold" style={{ color: "#c97e18" }}>
                  {formatLockTime(lockSecondsLeft)}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Google Sign-in */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={isLocked}
          className="login-btn-google mb-2.5 touch-manipulation select-none"
        >
          <GoogleIcon />
          <span>Sign in with Google</span>
        </button>

        {/* OR divider */}
        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t login-divider-line" />
          </div>
          <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-bold">
            <span className="px-4 login-divider-text">OR</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-2.5">
          {/* Email / Phone */}
          <div className="relative">
            <User
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              size={16}
              style={{ color: "#aaaaaa" }}
            />
            <input
              type="text"
              placeholder="Email or Phone Number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={isLocked}
              autoComplete="username"
              style={inputBase}
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              size={16}
              style={{ color: "#aaaaaa" }}
            />
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isLocked}
              style={{ ...inputBase, paddingRight: "44px" }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition touch-manipulation"
              style={{ color: "#aaaaaa" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#555")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#aaaaaa")}
              tabIndex={-1}
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onForgotPasswordClick}
              className="text-[10px] uppercase font-bold tracking-tight cursor-pointer transition-colors py-0.5 touch-manipulation"
              style={{ color: "#aaaaaa" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f7a221")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#aaaaaa")}
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || isLocked}
            className="login-btn-primary touch-manipulation select-none"
          >
            {loading ? "PROCESSING..." : isLocked ? `LOCKED — ${formatLockTime(lockSecondsLeft)}` : "LOGIN"}
          </button>
        </form>

        {/* Attempts warning */}
        {failCount > 0 && failCount < 4 && !isLocked && (
          <p className="text-center text-[10px] mt-2 tracking-wide" style={{ color: "#f7a221" }}>
            {4 - failCount} attempt{4 - failCount !== 1 ? "s" : ""} left before longer lockout
          </p>
        )}

        <p className="text-center text-[11px] mt-3 tracking-wide" style={{ color: "#999999" }}>
          No account?{" "}
          <button
            onClick={onRegisterClick}
            className="font-bold cursor-pointer touch-manipulation"
            style={{ color: "#f7a221" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#111")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#f7a221")}
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;

