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
// bottom  code is working but upper code have white theme 
// import React, { useState, useEffect, useRef } from "react";
// import { User, Lock, ShieldAlert, Eye, EyeOff } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { loginUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
// import LOGO from "../../assets/logo2.svg";

// // ── Shared Google icon (used by Register too) ──────────────────
// export const GoogleIcon = () => (
//   <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
//     <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
//     <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
//     <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
//     <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
//   </svg>
// );

// // ── Progressive lockout constants ──────────────────────────────
// const LOCKOUT_SEQUENCE = [0, 0, 30, 60, 300];
// const getLockDuration  = (failCount) =>
//   LOCKOUT_SEQUENCE[Math.min(failCount, LOCKOUT_SEQUENCE.length - 1)];

// const STORAGE_KEY = "lr_login_lock";
// const readLock    = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; } };
// const writeLock   = (data) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} };
// const clearLock   = () => { try { localStorage.removeItem(STORAGE_KEY); } catch {} };

// const Login = ({ onLoginSuccess, onRegisterClick, onForgotPasswordClick }) => {
//   const dispatch     = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);
//   const googleBtnRef = useRef(null);

//   // identifier accepts email address OR phone number
//   const [identifier, setIdentifier] = useState("");
//   const [password,   setPassword]   = useState("");
//   const [showPass,   setShowPass]   = useState(false);

//   // ── Lockout state ──────────────────────────────────────────────
//   const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
//   const [failCount,       setFailCount]       = useState(0);
//   const lockTimerRef = useRef(null);

//   useEffect(() => {
//     const saved = readLock();
//     if (saved) {
//       const remaining = Math.ceil((saved.unlocksAt - Date.now()) / 1000);
//       if (remaining > 0) { setFailCount(saved.failCount); setLockSecondsLeft(remaining); }
//       else { clearLock(); }
//     }
//     return () => clearInterval(lockTimerRef.current);
//   }, []);

//   useEffect(() => {
//     clearInterval(lockTimerRef.current);
//     if (lockSecondsLeft > 0) {
//       lockTimerRef.current = setInterval(() => {
//         setLockSecondsLeft((s) => {
//           if (s <= 1) { clearInterval(lockTimerRef.current); clearLock(); return 0; }
//           return s - 1;
//         });
//       }, 1000);
//     }
//     return () => clearInterval(lockTimerRef.current);
//   }, [lockSecondsLeft]);

//   const startLock = (newFailCount) => {
//     const duration = getLockDuration(newFailCount);
//     if (duration > 0) {
//       const unlocksAt = Date.now() + duration * 1000;
//       writeLock({ failCount: newFailCount, unlocksAt });
//       setLockSecondsLeft(duration);
//     }
//   };

//   const formatLockTime = (s) => {
//     if (s >= 60) return `${Math.ceil(s / 60)}m ${s % 60 > 0 ? `${s % 60}s` : ""}`.trim();
//     return `${s}s`;
//   };

//   useEffect(() => { dispatch(clearError()); }, [dispatch]);
//   useEffect(() => { if (error) toast.error(error); }, [error]);

//   // ── Google OAuth ───────────────────────────────────────────────
//   const handleGoogleClick = () => {
//     if (googleBtnRef.current) {
//       const googleDiv = googleBtnRef.current.querySelector('div[role="button"]');
//       if (googleDiv) googleDiv.click();
//       else {
//         const iframe = googleBtnRef.current.querySelector("iframe");
//         if (iframe) iframe.click();
//       }
//     }
//   };

//   useEffect(() => {
//     const init = () => {
//       if (!window.google) return;
//       window.google.accounts.id.initialize({
//         client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
//         use_fedcm_for_prompt: true,
//         callback: async (response) => {
//           const result = await dispatch(googleLogin({ idToken: response.credential }));
//           if (googleLogin.fulfilled.match(result)) {
//             clearLock();
//             toast.success("Logged in with Google!");
//             onLoginSuccess();
//           }
//         },
//       });
//       window.google.accounts.id.renderButton(googleBtnRef.current, { theme: "outline", size: "large" });
//     };
//     if (!window.google) {
//       const script = document.createElement("script");
//       script.src     = "https://accounts.google.com/gsi/client";
//       script.async   = true;
//       script.onload  = init;
//       document.body.appendChild(script);
//     } else { init(); }
//   }, [dispatch, onLoginSuccess]);
//   // ──────────────────────────────────────────────────────────────

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     if (lockSecondsLeft > 0) return;

//     const result = await dispatch(loginUser({ identifier, password }));
//     if (loginUser.fulfilled.match(result)) {
//       clearLock();
//       setFailCount(0);
//       setLockSecondsLeft(0);
//       toast.success("Welcome back!");
//       onLoginSuccess();
//     } else {
//       const newFail = failCount + 1;
//       setFailCount(newFail);
//       startLock(newFail);
//       const duration = getLockDuration(newFail);
//       if (duration > 0) toast.error(`Too many attempts. Locked for ${formatLockTime(duration)}.`);
//     }
//   };

//   const isLocked = lockSecondsLeft > 0;

//   return (
//     <div className="w-full">
//       {/* Hidden Google button mount point */}
//       <div ref={googleBtnRef} style={{ display: "none" }} />

//       {/* Logo — compact on all screens */}
//       <div className="flex justify-center mb-3">
//         <img
//           src={LOGO}
//           alt="OfferWale Baba"
//           className="h-14 sm:h-[72px] w-auto object-contain rounded"
//         />
//       </div>

//       <h2 className="text-lg sm:text-xl text-center text-white mb-0.5 tracking-tighter font-black">
//         WELCOME <span className="text-[#f7a221]">BACK</span>
//       </h2>
//       <p className="text-gray-400 text-[10px] tracking-widest mb-3 text-center uppercase">
//         Access your premium dashboard
//       </p>

//       {/* Error banner */}
//       {error && !isLocked && (
//         <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] text-center font-medium">
//           {error}
//         </div>
//       )}

//       {/* Lockout banner */}
//       {isLocked && (
//         <div className="mb-3 p-2.5 bg-orange-500/10 border border-orange-500/25 rounded-xl flex items-center gap-2">
//           <ShieldAlert size={15} className="text-orange-400 shrink-0" />
//           <div>
//             <p className="text-orange-400 text-[11px] font-black uppercase tracking-wide">Account temporarily locked</p>
//             <p className="text-orange-400/70 text-[10px] mt-0.5">
//               Try again in <span className="font-bold text-orange-300">{formatLockTime(lockSecondsLeft)}</span>
//             </p>
//           </div>
//         </div>
//       )}

//       {/* Google Sign-in */}
//       <button
//         type="button"
//         onClick={handleGoogleClick}
//         disabled={isLocked}
//         className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 text-black cursor-pointer font-bold py-3 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 mb-2.5 shadow-md active:scale-[0.98] touch-manipulation select-none"
//       >
//         <GoogleIcon />
//         <span className="text-sm">Sign in with Google</span>
//       </button>

//       {/* OR divider */}
//       <div className="relative my-3">
//         <div className="absolute inset-0 flex items-center">
//           <div className="w-full border-t border-white/20" />
//         </div>
//         <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-bold">
//           <span className="px-4 bg-[#0d0d0d] text-gray-400">OR</span>
//         </div>
//       </div>

//       <form onSubmit={handleLogin} className="space-y-2.5">
//         {/* Email / Phone */}
//         <div className="relative">
//           <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={16} />
//           <input
//             type="text"
//             placeholder="Email or Phone Number"
//             value={identifier}
//             onChange={(e) => setIdentifier(e.target.value)}
//             disabled={isLocked}
//             autoComplete="username"
//             className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-base placeholder:text-white/30 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 disabled:opacity-40 transition-all"
//             required
//           />
//         </div>

//         {/* Password */}
//         <div className="relative">
//           <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={16} />
//           <input
//             type={showPass ? "text" : "password"}
//             placeholder="Password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             autoComplete="current-password"
//             disabled={isLocked}
//             className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 pl-10 pr-11 text-white text-base placeholder:text-white/30 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 disabled:opacity-40 transition-all"
//             required
//           />
//           <button
//             type="button"
//             onClick={() => setShowPass((v) => !v)}
//             className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-white/35 hover:text-white transition touch-manipulation"
//             tabIndex={-1}
//             aria-label={showPass ? "Hide password" : "Show password"}
//           >
//             {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
//           </button>
//         </div>

//         {/* Forgot password */}
//         <div className="flex justify-end">
//           <button
//             type="button"
//             onClick={onForgotPasswordClick}
//             className="text-[10px] text-white/35 hover:text-[#f7a221] uppercase font-bold tracking-tight cursor-pointer transition-colors py-0.5 touch-manipulation"
//           >
//             Forgot Password?
//           </button>
//         </div>

//         {/* Submit */}
//         <button
//           type="submit"
//           disabled={loading || isLocked}
//           className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-50 text-black font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_6px_18px_rgba(247,162,33,0.3)] cursor-pointer touch-manipulation select-none"
//         >
//           {loading ? "PROCESSING..." : isLocked ? `LOCKED — ${formatLockTime(lockSecondsLeft)}` : "LOGIN"}
//         </button>
//       </form>

//       {/* Attempts warning */}
//       {failCount > 0 && failCount < 4 && !isLocked && (
//         <p className="text-center text-orange-400/60 text-[10px] mt-2 tracking-wide">
//           {4 - failCount} attempt{4 - failCount !== 1 ? "s" : ""} left before longer lockout
//         </p>
//       )}

//       <p className="text-center text-gray-400 text-[11px] mt-3 tracking-wide">
//         No account?{" "}
//         <button
//           onClick={onRegisterClick}
//           className="text-[#f7a221] font-bold hover:underline cursor-pointer touch-manipulation"
//         >
//           Register here
//         </button>
//       </p>
//     </div>
//   );
// };

// export default Login;

// try to make it more responsive 
// import React, { useState, useEffect, useRef } from "react";
// import { User, Lock, ShieldAlert, Eye, EyeOff } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { loginUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
// import LOGO from "../../assets/logo2.svg"

// // ── Shared Google icon (imported by Register too) ──────────────
// export const GoogleIcon = () => (
//   <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
//     <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
//     <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
//     <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
//     <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
//   </svg>
// );

// // ── Progressive lockout constants ─────────────────────────────
// const LOCKOUT_SEQUENCE = [0, 0, 30, 60, 300];
// const getLockDuration = (failCount) =>
//   LOCKOUT_SEQUENCE[Math.min(failCount, LOCKOUT_SEQUENCE.length - 1)];

// const STORAGE_KEY = "lr_login_lock";

// const readLock = () => {
//   try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
//   catch { return null; }
// };
// const writeLock = (data) => {
//   try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
// };
// const clearLock = () => {
//   try { localStorage.removeItem(STORAGE_KEY); } catch {}
// };

// const Login = ({ onLoginSuccess, onRegisterClick, onForgotPasswordClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);
//   const googleBtnRef = useRef(null);

//   // CHANGED: renamed from `email` → `identifier` to match backend field name
//   // Accepts both email address and phone number
//   const [identifier, setIdentifier] = useState("");
//   const [password, setPassword] = useState("");
//   const [isOpen, setisOpen] = useState(false)

//   // ── Lockout state ─────────────────────────────────────────────
//   const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
//   const [failCount, setFailCount] = useState(0);
//   const lockTimerRef = useRef(null);

//   useEffect(() => {
//     const saved = readLock();
//     if (saved) {
//       const remaining = Math.ceil((saved.unlocksAt - Date.now()) / 1000);
//       if (remaining > 0) {
//         setFailCount(saved.failCount);
//         setLockSecondsLeft(remaining);
//       } else {
//         clearLock();
//       }
//     }
//     return () => clearInterval(lockTimerRef.current);
//   }, []);

//   useEffect(() => {
//     clearInterval(lockTimerRef.current);
//     if (lockSecondsLeft > 0) {
//       lockTimerRef.current = setInterval(() => {
//         setLockSecondsLeft((s) => {
//           if (s <= 1) { clearInterval(lockTimerRef.current); clearLock(); return 0; }
//           return s - 1;
//         });
//       });
//     }
//     return () => clearInterval(lockTimerRef.current);
//   }, [lockSecondsLeft]);

//   const startLock = (newFailCount) => {
//     const duration = getLockDuration(newFailCount);
//     if (duration > 0) {
//       const unlocksAt = Date.now() + duration * 1000;
//       writeLock({ failCount: newFailCount, unlocksAt });
//       setLockSecondsLeft(duration);
//     }
//   };

//   const formatLockTime = (s) => {
//     if (s >= 60) return `${Math.ceil(s / 60)}m ${s % 60 > 0 ? `${s % 60}s` : ""}`.trim();
//     return `${s}s`;
//   };

//   useEffect(() => { dispatch(clearError()); }, [dispatch]);

//   useEffect(() => {
//     if (error) toast.error(error);
//   }, [error]);

//   const handleGoogleClick = () => {
//     if (googleBtnRef.current) {
//       const googleDiv = googleBtnRef.current.querySelector('div[role="button"]');
//       if (googleDiv) googleDiv.click();
//       else {
//         const iframe = googleBtnRef.current.querySelector("iframe");
//         if (iframe) iframe.click();
//       }
//     }
//   };

//   useEffect(() => {
//     const init = () => {
//       if (!window.google) return;
//       window.google.accounts.id.initialize({
//         client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
//         use_fedcm_for_prompt: true,
//         callback: async (response) => {
//           const result = await dispatch(googleLogin({ idToken: response.credential }));
//           if (googleLogin.fulfilled.match(result)) {
//             clearLock();
//             toast.success("Logged in with Google!");
//             onLoginSuccess();
//           }
//         },
//       });
//       window.google.accounts.id.renderButton(googleBtnRef.current, {
//         theme: "outline", size: "large",
//       });
//     };
//     if (!window.google) {
//       const script = document.createElement("script");
//       script.src = "https://accounts.google.com/gsi/client";
//       script.async = true;
//       script.onload = init;
//       document.body.appendChild(script);
//     } else { init(); }
//   }, [dispatch, onLoginSuccess]);

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     if (lockSecondsLeft > 0) return;

//     // CHANGED: now sends { identifier, password } instead of { email, password }
//     // identifier can be an email address or a phone number — backend handles both
//     const result = await dispatch(loginUser({ identifier, password }));

//     if (loginUser.fulfilled.match(result)) {
//       clearLock();
//       setFailCount(0);
//       setLockSecondsLeft(0);
//       toast.success("Welcome back!");
//       onLoginSuccess();
//     } else {
//       const newFail = failCount + 1;
//       setFailCount(newFail);
//       startLock(newFail);
//       const duration = getLockDuration(newFail);
//       if (duration > 0) {
//         toast.error(`Too many attempts. Locked for ${formatLockTime(duration)}.`);
//       }
//     }
//   };

//   const isLocked = lockSecondsLeft > 0;

//   return (
//     <div className="w-full">
//       <div ref={googleBtnRef} style={{ display: "none" }} />

//       {/* ── Logo Container (Top Center) ── */}
//       <div className="flex justify-center mb-6">
//         <img src={LOGO} alt="Logo" className="h-25 md:h-32 w-auto object-contain rounded" />
//       </div>

//       <h2 className="text-2xl sm:text-2xl text-center font- text-white mb-1 tracking-tighter">
//         WELCOME <span className="text-[#f7a221]">BACK</span>
//       </h2>
//       <p className="text-gray-200 text-[10px] tracking-widest mb-5 sm:mb-6 text-center uppercase">
//         Access your premium dashboard
//       </p>

//       {error && !isLocked && (
//         <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] text-center font-medium">
//           {error}
//         </div>
//       )}

//       {isLocked && (
//         <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/25 rounded-xl flex items-center gap-2.5">
//           <ShieldAlert size={16} className="text-orange-400 shrink-0" />
//           <div>
//             <p className="text-orange-400 text-[11px] font-black uppercase tracking-wide">
//               Account temporarily locked
//             </p>
//             <p className="text-orange-400/70 text-[10px] mt-0.5">
//               Try again in <span className="font-bold text-orange-300">{formatLockTime(lockSecondsLeft)}</span>
//             </p>
//           </div>
//         </div>
//       )}

//       <button
//         type="button"
//         onClick={handleGoogleClick}
//         disabled={isLocked}
//         className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 text-black cursor-pointer font-bold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 mb-3 shadow-md active:scale-[0.98] touch-manipulation select-none"
//       >
//         <GoogleIcon />
//         <span className="text-sm">Sign in with Google</span>
//       </button>

//       <div className="relative my-5">
//         <div className="absolute inset-0 flex items-center">
//           <div className="w-full border-t border-white/25" />
//         </div>
//         <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-bold">
//           <span className="px-4 bg-[#0d0d0d] text-gray-200">OR</span>
//         </div>
//       </div>

//       <form onSubmit={handleLogin} className="space-y-3">
//         <div className="relative">
//           <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//           {/*
//             CHANGED: input type="text" (was "text"), placeholder updated to clarify
//             email OR phone. Value bound to `identifier` state (was `email`).
//             Backend field name is "identifier" — this maps directly.
//           */}
//           <input
//             type="text"
//             placeholder="Email or Phone Number"
//             value={identifier}
//             onChange={(e) => setIdentifier(e.target.value)}
//             disabled={isLocked}
//             className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 disabled:opacity-40 transition-all text-sm"
//             style={{ fontSize: "16px" }}
//             required
//           />
//         </div>

//        <div className="relative">
//   <Lock
//     className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
//     size={17}
//   />

//   <input
//     type={isOpen ? "text" : "password"} // ✅ fixed (removed extra space)
//     placeholder="Password"
//     value={password}
//     onChange={(e) => setPassword(e.target.value)}
//     autoComplete="current-password"
//     disabled={isLocked}
//     className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 transition-all duration-300 pl-11 pr-10 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 disabled:opacity-40 transition-all text-sm"
//     style={{ fontSize: "16px" }}
//     required
//   />

//   {/* 👁️ Eye Toggle */}
//   <span
//     onClick={() => setisOpen(!isOpen)}
//     className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-white/40 hover:text-white transition"
//   >
//     {isOpen ? <EyeOff size={20} /> : <Eye size={20} />}
//   </span>
// </div>

//         <div className="flex justify-end pt-0.5">
//           <button
//             type="button"
//             onClick={onForgotPasswordClick}
//             className="text-[11px] text-white/40 hover:text-[#f7a221] uppercase font-bold tracking-tight cursor-pointer transition-colors py-1 touch-manipulation"
//           >
//             Forgot Password?
//           </button>
//         </div>

//         <button
//           type="submit"
//           disabled={loading || isLocked}
//           className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-50 text-black font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_8px_20px_rgba(247,162,33,0.25)] cursor-pointer touch-manipulation select-none"
//         >
//           {loading ? "PROCESSING..." : isLocked ? `LOCKED — ${formatLockTime(lockSecondsLeft)}` : "LOGIN"}
//         </button>
//       </form>

//       {failCount > 0 && failCount < 4 && !isLocked && (
//         <p className="text-center text-orange-400/60 text-[10px] mt-3 tracking-wide">
//           {4 - failCount} attempt{4 - failCount !== 1 ? "s" : ""} left before longer lockout
//         </p>
//       )}

//       <p className="text-center text-gray-200 text-[11px] mt-5 tracking-wide">
//         No account?{" "}
//         <button
//           onClick={onRegisterClick}
//           className="text-[#f7a221] text-[15px] hover:underline cursor-pointer touch-manipulation"
//         >
//           Register here
//         </button>
//       </p>
//     </div>
//   );
// };

// export default Login;
// import React, { useState, useEffect, useRef } from "react";
// import { User, Lock, ShieldAlert, Eye, EyeOff } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { loginUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
// import LOGO from "../../assets/logo2.png"

// // ── Shared Google icon (imported by Register too) ──────────────
// export const GoogleIcon = () => (
//   <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
//     <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
//     <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
//     <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
//     <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
//   </svg>
// );

// // ── Progressive lockout constants ─────────────────────────────
// const LOCKOUT_SEQUENCE = [0, 0, 30, 60, 300];
// const getLockDuration = (failCount) =>
//   LOCKOUT_SEQUENCE[Math.min(failCount, LOCKOUT_SEQUENCE.length - 1)];

// const STORAGE_KEY = "lr_login_lock";

// const readLock = () => {
//   try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
//   catch { return null; }
// };
// const writeLock = (data) => {
//   try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
// };
// const clearLock = () => {
//   try { localStorage.removeItem(STORAGE_KEY); } catch {}
// };

// const Login = ({ onLoginSuccess, onRegisterClick, onForgotPasswordClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);
//   const googleBtnRef = useRef(null);

//   // CHANGED: renamed from `email` → `identifier` to match backend field name
//   // Accepts both email address and phone number
//   const [identifier, setIdentifier] = useState("");
//   const [password, setPassword] = useState("");
//   const [isOpen, setisOpen] = useState(false)

//   // ── Lockout state ─────────────────────────────────────────────
//   const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
//   const [failCount, setFailCount] = useState(0);
//   const lockTimerRef = useRef(null);

//   useEffect(() => {
//     const saved = readLock();
//     if (saved) {
//       const remaining = Math.ceil((saved.unlocksAt - Date.now()) / 1000);
//       if (remaining > 0) {
//         setFailCount(saved.failCount);
//         setLockSecondsLeft(remaining);
//       } else {
//         clearLock();
//       }
//     }
//     return () => clearInterval(lockTimerRef.current);
//   }, []);

//   useEffect(() => {
//     clearInterval(lockTimerRef.current);
//     if (lockSecondsLeft > 0) {
//       lockTimerRef.current = setInterval(() => {
//         setLockSecondsLeft((s) => {
//           if (s <= 1) { clearInterval(lockTimerRef.current); clearLock(); return 0; }
//           return s - 1;
//         });
//       }, 1000);
//     }
//     return () => clearInterval(lockTimerRef.current);
//   }, [lockSecondsLeft]);

//   const startLock = (newFailCount) => {
//     const duration = getLockDuration(newFailCount);
//     if (duration > 0) {
//       const unlocksAt = Date.now() + duration * 1000;
//       writeLock({ failCount: newFailCount, unlocksAt });
//       setLockSecondsLeft(duration);
//     }
//   };

//   const formatLockTime = (s) => {
//     if (s >= 60) return `${Math.ceil(s / 60)}m ${s % 60 > 0 ? `${s % 60}s` : ""}`.trim();
//     return `${s}s`;
//   };

//   useEffect(() => { dispatch(clearError()); }, [dispatch]);

//   useEffect(() => {
//     if (error) toast.error(error);
//   }, [error]);

//   const handleGoogleClick = () => {
//     if (googleBtnRef.current) {
//       const googleDiv = googleBtnRef.current.querySelector('div[role="button"]');
//       if (googleDiv) googleDiv.click();
//       else {
//         const iframe = googleBtnRef.current.querySelector("iframe");
//         if (iframe) iframe.click();
//       }
//     }
//   };

//   useEffect(() => {
//     const init = () => {
//       if (!window.google) return;
//       window.google.accounts.id.initialize({
//         client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
//         use_fedcm_for_prompt: true,
//         callback: async (response) => {
//           const result = await dispatch(googleLogin({ idToken: response.credential }));
//           if (googleLogin.fulfilled.match(result)) {
//             clearLock();
//             toast.success("Logged in with Google!");
//             onLoginSuccess();
//           }
//         },
//       });
//       window.google.accounts.id.renderButton(googleBtnRef.current, {
//         theme: "outline", size: "large",
//       });
//     };
//     if (!window.google) {
//       const script = document.createElement("script");
//       script.src = "https://accounts.google.com/gsi/client";
//       script.async = true;
//       script.onload = init;
//       document.body.appendChild(script);
//     } else { init(); }
//   }, [dispatch, onLoginSuccess]);

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     if (lockSecondsLeft > 0) return;

//     // CHANGED: now sends { identifier, password } instead of { email, password }
//     // identifier can be an email address or a phone number — backend handles both
//     const result = await dispatch(loginUser({ identifier, password }));

//     if (loginUser.fulfilled.match(result)) {
//       clearLock();
//       setFailCount(0);
//       setLockSecondsLeft(0);
//       toast.success("Welcome back!");
//       onLoginSuccess();
//     } else {
//       const newFail = failCount + 1;
//       setFailCount(newFail);
//       startLock(newFail);
//       const duration = getLockDuration(newFail);
//       if (duration > 0) {
//         toast.error(`Too many attempts. Locked for ${formatLockTime(duration)}.`);
//       }
//     }
//   };

//   const isLocked = lockSecondsLeft > 0;

//   return (
//     <div className="w-full">
//       <div ref={googleBtnRef} style={{ display: "none" }} />

//       <h2 className="text-3xl sm:text-4xl text-center font- text-white mb-1 tracking-tighter">
//         WELCOME <span className="text-[#f7a221]">BACK</span>
//       </h2>
//       <p className="text-gray-200 text-[10px] tracking-widest mb-5 sm:mb-6 text-center uppercase">
//         Access your premium dashboard
//       </p>

//       {error && !isLocked && (
//         <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] text-center font-medium">
//           {error}
//         </div>
//       )}

//       {isLocked && (
//         <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/25 rounded-xl flex items-center gap-2.5">
//           <ShieldAlert size={16} className="text-orange-400 shrink-0" />
//           <div>
//             <p className="text-orange-400 text-[11px] font-black uppercase tracking-wide">
//               Account temporarily locked
//             </p>
//             <p className="text-orange-400/70 text-[10px] mt-0.5">
//               Try again in <span className="font-bold text-orange-300">{formatLockTime(lockSecondsLeft)}</span>
//             </p>
//           </div>
//         </div>
//       )}

//       <button
//         type="button"
//         onClick={handleGoogleClick}
//         disabled={isLocked}
//         className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 text-black cursor-pointer font-bold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 mb-3 shadow-md active:scale-[0.98] touch-manipulation select-none"
//       >
//         <GoogleIcon />
//         <span className="text-sm">Sign in with Google</span>
//       </button>

//       <div className="relative my-5">
//         <div className="absolute inset-0 flex items-center">
//           <div className="w-full border-t border-white/25" />
//         </div>
//         <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-bold">
//           <span className="px-4 bg-[#0d0d0d] text-gray-200">OR</span>
//         </div>
//       </div>

//       <form onSubmit={handleLogin} className="space-y-3">
//         <div className="relative">
//           <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//           {/*
//             CHANGED: input type="text" (was "text"), placeholder updated to clarify
//             email OR phone. Value bound to `identifier` state (was `email`).
//             Backend field name is "identifier" — this maps directly.
//           */}
//           <input
//             type="text"
//             placeholder="Email or Phone Number"
//             value={identifier}
//             onChange={(e) => setIdentifier(e.target.value)}
//             disabled={isLocked}
//             className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 disabled:opacity-40 transition-all text-sm"
//             style={{ fontSize: "16px" }}
//             required
//           />
//         </div>

//        <div className="relative">
//   <Lock
//     className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
//     size={17}
//   />

//   <input
//     type={isOpen ? "text" : "password"} // ✅ fixed (removed extra space)
//     placeholder="Password"
//     value={password}
//     onChange={(e) => setPassword(e.target.value)}
//     autoComplete="current-password"
//     disabled={isLocked}
//     className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 transition-all duration-300 pl-11 pr-10 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 disabled:opacity-40 transition-all text-sm"
//     style={{ fontSize: "16px" }}
//     required
//   />

//   {/* 👁️ Eye Toggle */}
//   <span
//     onClick={() => setisOpen(!isOpen)}
//     className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-white/40 hover:text-white transition"
//   >
//     {isOpen ? <EyeOff size={20} /> : <Eye size={20} />}
//   </span>
// </div>

//         <div className="flex justify-end pt-0.5">
//           <button
//             type="button"
//             onClick={onForgotPasswordClick}
//             className="text-[11px] text-white/40 hover:text-[#f7a221] uppercase font-bold tracking-tight cursor-pointer transition-colors py-1 touch-manipulation"
//           >
//             Forgot Password?
//           </button>
//         </div>

//         <button
//           type="submit"
//           disabled={loading || isLocked}
//           className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-50 text-black font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_8px_20px_rgba(247,162,33,0.25)] cursor-pointer touch-manipulation select-none"
//         >
//           {loading ? "PROCESSING..." : isLocked ? `LOCKED — ${formatLockTime(lockSecondsLeft)}` : "LOGIN"}
//         </button>
//       </form>

//       {failCount > 0 && failCount < 4 && !isLocked && (
//         <p className="text-center text-orange-400/60 text-[10px] mt-3 tracking-wide">
//           {4 - failCount} attempt{4 - failCount !== 1 ? "s" : ""} left before longer lockout
//         </p>
//       )}

//       <p className="text-center text-gray-200 text-[11px] mt-5 tracking-wide">
//         No account?{" "}
//         <button
//           onClick={onRegisterClick}
//           className="text-[#f7a221] text-[15px] hover:underline cursor-pointer touch-manipulation"
//         >
//           Register here
//         </button>
//       </p>
//     </div>
//   );
// };

// export default Login;
// updated code give user to login with phone number or email in same input 
// import React, { useState, useEffect, useRef } from "react";
// import { Mail, Lock, Phone, ShieldAlert } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { loginUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// // ── Shared Google icon (imported by Register too) ──────────────
// export const GoogleIcon = () => (
//   <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
//     <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
//     <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
//     <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
//     <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
//   </svg>
// );

// // ── Progressive lockout constants ─────────────────────────────
// // Attempt count → lockout duration in seconds
// // 1st fail: no lock  |  2nd fail: 30s  |  3rd fail: 60s  |  4th+ fail: 300s
// const LOCKOUT_SEQUENCE = [0, 0, 30, 60, 300];
// const getLockDuration = (failCount) =>
//   LOCKOUT_SEQUENCE[Math.min(failCount, LOCKOUT_SEQUENCE.length - 1)];

// const STORAGE_KEY = "lr_login_lock";

// const readLock = () => {
//   try {
//     return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
//   } catch { return null; }
// };
// const writeLock = (data) => {
//   try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
// };
// const clearLock = () => {
//   try { localStorage.removeItem(STORAGE_KEY); } catch {}
// };

// const Login = ({ onLoginSuccess, onRegisterClick, onForgotPasswordClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);
//   const googleBtnRef = useRef(null);

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   // ── Lockout state ─────────────────────────────────────────────
//   const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
//   const [failCount, setFailCount] = useState(0);
//   const lockTimerRef = useRef(null);

//   // Restore lockout from localStorage on mount
//   useEffect(() => {
//     const saved = readLock();
//     if (saved) {
//       const remaining = Math.ceil((saved.unlocksAt - Date.now()) / 1000);
//       if (remaining > 0) {
//         setFailCount(saved.failCount);
//         setLockSecondsLeft(remaining);
//       } else {
//         clearLock();
//       }
//     }
//     return () => clearInterval(lockTimerRef.current);
//   }, []);

//   // Countdown ticker
//   useEffect(() => {
//     clearInterval(lockTimerRef.current);
//     if (lockSecondsLeft > 0) {
//       lockTimerRef.current = setInterval(() => {
//         setLockSecondsLeft((s) => {
//           if (s <= 1) {
//             clearInterval(lockTimerRef.current);
//             clearLock();
//             return 0;
//           }
//           return s - 1;
//         });
//       }, 1000);
//     }
//     return () => clearInterval(lockTimerRef.current);
//   }, [lockSecondsLeft]);

//   const startLock = (newFailCount) => {
//     const duration = getLockDuration(newFailCount);
//     if (duration > 0) {
//       const unlocksAt = Date.now() + duration * 1000;
//       writeLock({ failCount: newFailCount, unlocksAt });
//       setLockSecondsLeft(duration);
//     }
//   };

//   const formatLockTime = (s) => {
//     if (s >= 60) return `${Math.ceil(s / 60)}m ${s % 60 > 0 ? `${s % 60}s` : ""}`.trim();
//     return `${s}s`;
//   };
//   // ─────────────────────────────────────────────────────────────

//   useEffect(() => { dispatch(clearError()); }, [dispatch]);

//   useEffect(() => {
//     if (error) toast.error(error);
//   }, [error]);

//   // Google init
//   const handleGoogleClick = () => {
//     if (googleBtnRef.current) {
//       const googleDiv = googleBtnRef.current.querySelector('div[role="button"]');
//       if (googleDiv) googleDiv.click();
//       else {
//         const iframe = googleBtnRef.current.querySelector("iframe");
//         if (iframe) iframe.click();
//       }
//     }
//   };

//   useEffect(() => {
//     const init = () => {
//       if (!window.google) return;
//       window.google.accounts.id.initialize({
//         client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
//         use_fedcm_for_prompt: true,
//         callback: async (response) => {
//           const result = await dispatch(googleLogin({ idToken: response.credential }));
//           if (googleLogin.fulfilled.match(result)) {
//             clearLock();
//             toast.success("Logged in with Google!");
//             onLoginSuccess();
//           }
//         },
//       });
//       window.google.accounts.id.renderButton(googleBtnRef.current, {
//         theme: "outline", size: "large",
//       });
//     };
//     if (!window.google) {
//       const script = document.createElement("script");
//       script.src = "https://accounts.google.com/gsi/client";
//       script.async = true;
//       script.onload = init;
//       document.body.appendChild(script);
//     } else { init(); }
//   }, [dispatch, onLoginSuccess]);

//   const handleEmailLogin = async (e) => {
//     e.preventDefault();
//     if (lockSecondsLeft > 0) return;

//     const result = await dispatch(loginUser({ email, password }));

//     if (loginUser.fulfilled.match(result)) {
//       clearLock();
//       setFailCount(0);
//       setLockSecondsLeft(0);
//       toast.success("Welcome back!");
//       onLoginSuccess();
//     } else {
//       // Failed login — increment and lock
//       const newFail = failCount + 1;
//       setFailCount(newFail);
//       startLock(newFail);
//       const duration = getLockDuration(newFail);
//       if (duration > 0) {
//         toast.error(`Too many attempts. Locked for ${formatLockTime(duration)}.`);
//       }
//     }
//   };

//   const isLocked = lockSecondsLeft > 0;

//   return (
//     <div className="w-full">
//       <div ref={googleBtnRef} style={{ display: "none" }} />

//       <h2 className="text-3xl sm:text-4xl text-center font-black text-white mb-1 tracking-tighter">
//         WELCOME <span className="text-[#f7a221]">BACK</span>
//       </h2>
//       <p className="text-white/40 text-[10px] tracking-widest mb-5 sm:mb-6 text-center uppercase">
//         Access your premium dashboard
//       </p>

//       {error && !isLocked && (
//         <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] text-center font-medium">
//           {error}
//         </div>
//       )}

//       {/* Lockout banner */}
//       {isLocked && (
//         <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/25 rounded-xl flex items-center gap-2.5">
//           <ShieldAlert size={16} className="text-orange-400 shrink-0" />
//           <div>
//             <p className="text-orange-400 text-[11px] font-black uppercase tracking-wide">
//               Account temporarily locked
//             </p>
//             <p className="text-orange-400/70 text-[10px] mt-0.5">
//               Try again in <span className="font-bold text-orange-300">{formatLockTime(lockSecondsLeft)}</span>
//             </p>
//           </div>
//         </div>
//       )}

//       {/* Google */}
//       <button
//         type="button"
//         onClick={handleGoogleClick}
//         disabled={isLocked}
//         className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 text-black cursor-pointer font-bold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 mb-3 shadow-md active:scale-[0.98] touch-manipulation select-none"
//       >
//         <GoogleIcon />
//         <span className="text-sm">Sign in with Google</span>
//       </button>

//       {/* Phone */}
//       <button
//         onClick={() => toast.info("Phone login coming soon!")}
//         disabled={isLocked}
//         className="w-full bg-white/5 hover:bg-white/10 active:bg-white/15 disabled:opacity-40 border border-white/10 text-white cursor-pointer font-medium py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 mb-4 touch-manipulation select-none text-sm"
//       >
//         <Phone size={16} className="text-[#f7a221] shrink-0" />
//         Login with Phone Number
//       </button>

//       <div className="relative my-5">
//         <div className="absolute inset-0 flex items-center">
//           <div className="w-full border-t border-white/5" />
//         </div>
//         <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-bold">
//           <span className="px-4 bg-[#0d0d0d] text-white/25">OR</span>
//         </div>
//       </div>

//       <form onSubmit={handleEmailLogin} className="space-y-3">
//         <div className="relative">
//           <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//           <input
//             type="email"
//             placeholder="Email address"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             autoComplete="email"
//             disabled={isLocked}
//             className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 disabled:opacity-40 transition-all text-sm"
//             style={{ fontSize: "16px" }}
//             required
//           />
//         </div>

//         <div className="relative">
//           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//           <input
//             type="password"
//             placeholder="Password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             autoComplete="current-password"
//             disabled={isLocked}
//             className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 disabled:opacity-40 transition-all text-sm"
//             style={{ fontSize: "16px" }}
//             required
//           />
//         </div>

//         <div className="flex justify-end pt-0.5">
//           <button
//             type="button"
//             onClick={onForgotPasswordClick}
//             className="text-[11px] text-white/40 hover:text-[#f7a221] uppercase font-bold tracking-tight cursor-pointer transition-colors py-1 touch-manipulation"
//           >
//             Forgot Password?
//           </button>
//         </div>

//         <button
//           type="submit"
//           disabled={loading || isLocked}
//           className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-50 text-black font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_8px_20px_rgba(247,162,33,0.25)] cursor-pointer touch-manipulation select-none"
//         >
//           {loading ? "PROCESSING..." : isLocked ? `LOCKED — ${formatLockTime(lockSecondsLeft)}` : "LOGIN"}
//         </button>
//       </form>

//       {/* Fail counter hint */}
//       {failCount > 0 && failCount < 4 && !isLocked && (
//         <p className="text-center text-orange-400/60 text-[10px] mt-3 tracking-wide">
//           {4 - failCount} attempt{4 - failCount !== 1 ? "s" : ""} left before longer lockout
//         </p>
//       )}

//       <p className="text-center text-white/25 text-[11px] mt-5 tracking-wide">
//         No account?{" "}
//         <button
//           onClick={onRegisterClick}
//           className="text-[#f7a221] font-bold hover:underline cursor-pointer touch-manipulation"
//         >
//           Register here
//         </button>
//       </p>
//     </div>
//   );
// };

// export default Login;


// import React, { useState, useEffect, useRef } from "react";
// import { Mail, Lock, Phone } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { loginUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// // ✅ FIX 2: Shared Google SVG icon — used by both Login & Register for visual consistency
// export const GoogleIcon = () => (
//   <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
//     <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
//     <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
//     <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
//     <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
//   </svg>
// );

// const Login = ({ onLoginSuccess, onRegisterClick, onForgotPasswordClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);
//   const googleBtnRef = useRef(null);

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   useEffect(() => {
//     dispatch(clearError());
//   }, [dispatch]);

//   useEffect(() => {
//     if (error) toast.error(error);
//   }, [error]);

//   const handleGoogleClick = () => {
//     if (googleBtnRef.current) {
//       const googleDiv = googleBtnRef.current.querySelector('div[role="button"]');
//       if (googleDiv) {
//         googleDiv.click();
//       } else {
//         const iframe = googleBtnRef.current.querySelector("iframe");
//         if (iframe) iframe.click();
//       }
//     }
//   };

//   useEffect(() => {
//     const initializeGoogle = () => {
//       if (window.google) {
//         window.google.accounts.id.initialize({
//           client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
//           use_fedcm_for_prompt: true,
//           callback: async (response) => {
//             const result = await dispatch(googleLogin({ idToken: response.credential }));
//             if (googleLogin.fulfilled.match(result)) {
//               toast.success("Logged in with Google!");
//               onLoginSuccess();
//             }
//           },
//         });
//         window.google.accounts.id.renderButton(googleBtnRef.current, {
//           theme: "outline",
//           size: "large",
//         });
//       }
//     };

//     if (!window.google) {
//       const script = document.createElement("script");
//       script.src = "https://accounts.google.com/gsi/client";
//       script.async = true;
//       script.onload = initializeGoogle;
//       document.body.appendChild(script);
//     } else {
//       initializeGoogle();
//     }
//   }, [dispatch, onLoginSuccess]);

//   const handleEmailLogin = async (e) => {
//     e.preventDefault();
//     const result = await dispatch(loginUser({ email, password }));
//     if (loginUser.fulfilled.match(result)) {
//       toast.success("Welcome back!");
//       onLoginSuccess();
//     }
//   };

//   return (
//     <div className="w-full">
//       {/* Hidden Google button container */}
//       <div ref={googleBtnRef} style={{ display: "none" }} />

//       <h2 className="text-3xl sm:text-4xl text-center font-black text-white mb-1 tracking-tighter">
//         WELCOME <span className="text-[#f7a221]">BACK</span>
//       </h2>
//       <p className="text-gray-400 text-[10px] tracking-widest mb-5 sm:mb-6 text-center uppercase">
//         Access your premium dashboard
//       </p>

//       {error && (
//         <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] text-center font-medium">
//           {error}
//         </div>
//       )}

//       {/* ✅ FIX 2: Unified Google button style (matches Register) */}
//       <button
//         type="button"
//         onClick={handleGoogleClick}
//         className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-black cursor-pointer font-semibold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 mb-3 shadow-md active:scale-[0.98] touch-manipulation select-none"
//       >
//         <GoogleIcon />
//         <span className="text-sm font-bold">Sign in with Google</span>
//       </button>

//       {/* ✅ FIX 2: Unified phone button style (matches Register) */}
//       <button
//         onClick={() => toast.info("Phone login coming soon!")}
//         className="w-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white cursor-pointer font-medium py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 mb-4 touch-manipulation select-none"
//       >
//         <Phone size={16} className="text-[#f7a221] shrink-0" />
//         <span className="text-sm">Login with Phone Number</span>
//       </button>

//       <div className="relative my-5">
//         <div className="absolute inset-0 flex items-center">
//           <div className="w-full border-t border-white/5" />
//         </div>
//         <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-bold">
//           <span className="px-4 bg-[#0d0d0d] text-gray-600">OR</span>
//         </div>
//       </div>

//       <form onSubmit={handleEmailLogin} className="space-y-3">
//         <div className="relative">
//           <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={17} />
//           <input
//             type="email"
//             placeholder="Email address"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             autoComplete="email"
//             className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 transition-all text-sm"
//             required
//           />
//         </div>

//         <div className="relative">
//           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={17} />
//           <input
//             type="password"
//             placeholder="Password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             autoComplete="current-password"
//             className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 transition-all text-sm"
//             required
//           />
//         </div>

//         <div className="flex justify-end pt-0.5">
//           <button
//             type="button"
//             onClick={onForgotPasswordClick}
//             className="text-[11px] text-gray-400 hover:text-[#f7a221] uppercase font-bold tracking-tight cursor-pointer transition-colors py-1 touch-manipulation"
//           >
//             Forgot Password?
//           </button>
//         </div>

//         <button
//           type="submit"
//           disabled={loading}
//           className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-50 text-black font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_8px_20px_rgba(247,162,33,0.25)] cursor-pointer touch-manipulation select-none"
//         >
//           {loading ? "PROCESSING..." : "LOGIN"}
//         </button>
//       </form>

//       <p className="text-center text-gray-600 text-[11px] mt-5 tracking-wide">
//         No account?{" "}
//         <button
//           onClick={onRegisterClick}
//           className="text-[#f7a221] font-bold hover:underline cursor-pointer touch-manipulation"
//         >
//           Register here
//         </button>
//       </p>
//     </div>
//   );
// };

// export default Login;

// import React, { useState, useEffect, useRef } from "react";
// import { Mail, Lock, LogIn, Phone } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { loginUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// const Login = ({ onLoginSuccess, onRegisterClick, onForgotPasswordClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);
//   const googleBtnRef = useRef(null); // Reference for the hidden official button

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   useEffect(() => {
//     dispatch(clearError());
//   }, [dispatch]);

//   useEffect(() => {
//     if (error) {
//       toast.error(error);
//     }
//   }, [error]);

//   // ✅ LOGIC: Trigger the hidden official Google button click
//   const handleGoogleClick = () => {
//     if (googleBtnRef.current) {
//       // Find the actual <iframe> or <div> inside the hidden container and click it
//       const googleDiv = googleBtnRef.current.querySelector('div[role="button"]');
//       if (googleDiv) {
//         googleDiv.click();
//       } else {
//         // Fallback for some browser versions
//         const iframe = googleBtnRef.current.querySelector('iframe');
//         if(iframe) iframe.click();
//       }
//     }
//   };

//   useEffect(() => {
//     const initializeGoogle = () => {
//       if (window.google) {
//         window.google.accounts.id.initialize({
//           client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
//           use_fedcm_for_prompt: true, // ✅ Fixes the warning you received
//           callback: async (response) => {
//             const result = await dispatch(googleLogin({ idToken: response.credential }));
//             if (googleLogin.fulfilled.match(result)) {
//               toast.success("Logged in with Google!");
//               onLoginSuccess();
//             }
//           },
//         });

//         // ✅ IMPORTANT: Render the real button into a hidden div
//         // This forces Google to prepare a "Centered Popup" context
//         window.google.accounts.id.renderButton(googleBtnRef.current, {
//           theme: "outline",
//           size: "large",
//         });
//       }
//     };

//     if (!window.google) {
//       const script = document.createElement("script");
//       script.src = "https://accounts.google.com/gsi/client";
//       script.async = true;
//       script.onload = initializeGoogle;
//       document.body.appendChild(script);
//     } else {
//       initializeGoogle();
//     }
//   }, [dispatch, onLoginSuccess]);

//   const handleEmailLogin = async (e) => {
//     e.preventDefault();
//     const result = await dispatch(loginUser({ email, password }));
//     if (loginUser.fulfilled.match(result)) {
//       toast.success("Welcome back!");
//       onLoginSuccess();
//     }
//   };

//   return (
//     <div className="w-full">
//       {/* HIDDEN GOOGLE BUTTON CONTAINER */}
//       <div ref={googleBtnRef} style={{ display: 'none' }}></div>

//       <h2 className="text-4xl text-center font-black text-white mb-1 tracking-tighter">
//         WELCOME <span className="text-[#f7a221]">BACK</span>
//       </h2>
//       <p className="text-gray-400 text-[10px] tracking-widest mb-6 text-center uppercase">
//         Access your premium dashboard
//       </p>

//       {error && (
//         <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[11px] text-center font-medium animate-pulse">
//           {error}
//         </div>
//       )}

//       {/* CUSTOM UI BUTTON - Triggers the hidden real button */}
//       <button
//         type="button"
//         onClick={handleGoogleClick}
//         className="w-full bg-white hover:bg-gray-100 text-black cursor-pointer font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 mb-4 shadow-lg active:scale-95"
//       >
//         <svg className="w-5 h-5" viewBox="0 0 48 48">
//           <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
//           <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
//           <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
//           <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
//         </svg>
//         <span className="text-sm">Sign in with Google</span>
//       </button>

//       {/* REST OF YOUR UI REMAINS EXACTLY THE SAME */}
//       <button
//         onClick={() => toast.info("Phone login coming soon!")}
//         className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer font-medium py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 mb-4 text-sm"
//       >
//         <Phone size={16} />
//         Login with Phone Number
//       </button>

//       <div className="relative my-6">
//         <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
//         <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-bold">
//           <span className="px-4 bg-[#0d0d0d] text-gray-600">OR</span>
//         </div>
//       </div>

//       <form onSubmit={handleEmailLogin} className="space-y-3.5">
//         <div className="relative">
//           <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-800" size={18} />
//           <input
//             type="email" placeholder="Email address" value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-800 focus:outline-none focus:border-[#f7a221] transition-all text-sm"
//             required
//           />
//         </div>

//         <div className="relative">
//           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-800" size={18} />
//           <input
//             type="password" placeholder="Password" value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-800 focus:outline-none focus:border-[#f7a221] transition-all text-sm"
//             required
//           />
//         </div>

//         <div className="flex justify-end">
//           <button type="button" onClick={onForgotPasswordClick} className="text-[11px] text-gray-400 hover:text-[#f7a221] uppercase font-bold tracking-tighter cursor-pointer">Forgot Password?</button>
//         </div>

//         <button
//           type="submit" disabled={loading}
//           className="w-full bg-[#f7a221] hover:bg-[#e0911c] disabled:opacity-50 text-black font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-md shadow-[0_10px_20px_rgba(247,162,33,0.2)] cursor-pointer"
//         >
//           {loading ? "PROCESSING..." : <> LOGIN</>}
//         </button>
//       </form>
//     </div>
//   );
// };

// export default Login;

// WORKING BUT THE POP COME IN TOP RIGHT NOT IN THE CENTER..*****************************************

// import React, { useState, useEffect } from "react";
// import { Mail, Lock, LogIn, Phone } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { loginUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// const Login = ({ onLoginSuccess, onRegisterClick, onForgotPasswordClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   useEffect(() => {
//     dispatch(clearError());
//   }, [dispatch]);

//   useEffect(() => {
//     if (error) {
//       toast.error(error);
//       // We don't clear error here so the inline message can stay visible if needed
//     }
//   }, [error]);

//   const handleGoogleClick = () => {
//     if (window.google) {
//       window.google.accounts.id.prompt();
//     }
//   };

//   useEffect(() => {
//     const initializeGoogle = () => {
//       if (window.google) {
//         window.google.accounts.id.initialize({
//           client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
//           callback: async (response) => {
//             const result = await dispatch(googleLogin({ idToken: response.credential }));
//             if (googleLogin.fulfilled.match(result)) {
//               toast.success("Logged in with Google!");
//               onLoginSuccess();
//             }
//           },
//         });
//       }
//     };

//     if (!window.google) {
//       const script = document.createElement("script");
//       script.src = "https://accounts.google.com/gsi/client";
//       script.async = true;
//       script.onload = initializeGoogle;
//       document.body.appendChild(script);
//     } else {
//       initializeGoogle();
//     }
//   }, [dispatch, onLoginSuccess]);

//   const handleEmailLogin = async (e) => {
//     e.preventDefault();
//     const result = await dispatch(loginUser({ email, password }));
//     if (loginUser.fulfilled.match(result)) {
//       toast.success("Welcome back!");
//       onLoginSuccess();
//     }
//   };

//   return (
//     <div className="w-full">
//       <h2 className="text-4xl text-center font-black text-white mb-1 tracking-tighter">
//         WELCOME <span className="text-[#f7a221]">BACK</span>
//       </h2>
//       <p className="text-gray-400 text-[10px] tracking-widest mb-6 text-center uppercase">
//         Access your premium dashboard
//       </p>

//       {/* Inline Small Error Display */}
//       {error && (
//         <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[11px] text-center font-medium animate-pulse">
//           {error}
//         </div>
//       )}

//       {/* Real G Google Button */}
//       <button
//         onClick={handleGoogleClick}
//         className="w-full bg-white hover:bg-gray-100 text-black cursor-pointer font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 mb-4 shadow-lg"
//       >
//         <svg className="w-5 h-5" viewBox="0 0 48 48">
//           <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
//           <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
//           <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
//           <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
//         </svg>
//         <span className="text-sm">Sign in with Google</span>
//       </button>

//       <button
//         onClick={() => toast.info("Phone login coming soon!")}
//         className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer font-medium py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 mb-4 text-sm"
//       >
//         <Phone size={16} />
//         Login with Phone Number
//       </button>

//       <div className="relative my-6">
//         <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
//         <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-bold">
//           <span className="px-4 bg-[#0d0d0d] text-gray-600">OR</span>
//         </div>
//       </div>

//       <form onSubmit={handleEmailLogin} className="space-y-3.5">
//         <div className="relative">
//           <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//           <input
//             type="email" placeholder="Email address" value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#f7a221] transition-all text-sm"
//             required
//           />
//         </div>

//         <div className="relative">
//           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//           <input
//             type="password" placeholder="Password" value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#f7a221] transition-all text-sm"
//             required
//           />
//         </div>

//         <div className="flex justify-end">
//           <button type="button" onClick={onForgotPasswordClick} className="text-[11px] text-gray-00 hover:text-[#f7a221] uppercase font-bold tracking-tighter cursor-pointer">Forgot Password?</button>
//         </div>

//         <button
//           type="submit" disabled={loading}
//           className="w-full bg-[#f7a221] hover:bg-[#e0911c] disabled:opacity-50 text-black font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-md shadow-[0_10px_20px_rgba(247,162,33,0.2)] cursor-pointer"
//         >
//           {loading ? "PROCESSING..." : <><LogIn size={20} /> LOGIN</>}
//         </button>
//       </form>
//     </div>
//   );
// };

// export default Login;


// // components/USER_LOGIN_SEGMENT/Login.jsx
// import React, { useState, useEffect } from "react";
// import { Mail, Lock, LogIn, Phone } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify"; // ✅ Added Toastify import
// import { loginUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// const Login = ({ onLoginSuccess, onRegisterClick, onForgotPasswordClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPhoneMessage, setShowPhoneMessage] = useState(false);

//   // Clear any previous errors when component mounts
//   useEffect(() => {
//     dispatch(clearError());
//   }, [dispatch]);

//   // ✅ Trigger Toast on Error changes
//   useEffect(() => {
//     if (error) {
//       toast.error(error);
//       dispatch(clearError());
//     }
//   }, [error, dispatch]);

//   // ✅ Initialize Google Sign-In button
//   useEffect(() => {
//     const initializeGoogle = () => {
//       if (window.google) {
//         window.google.accounts.id.initialize({
//           client_id:
//             import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
//           callback: handleGoogleResponse,
//           ux_mode: "popup",
//         });

//         const btnContainer = document.getElementById("google-login-btn");
//         if (btnContainer) {
//           window.google.accounts.id.renderButton(btnContainer, {
//             theme: "filled_black",
//             size: "large",
//             width: btnContainer.offsetWidth,
//             shape: "pill",
//             text: "signin_with",
//           });
//         }
//       }
//     };

//     if (!window.google) {
//       const script = document.createElement("script");
//       script.src = "https://accounts.google.com/gsi/client";
//       script.async = true;
//       script.defer = true;
//       script.onload = initializeGoogle;
//       document.body.appendChild(script);
//     } else {
//       initializeGoogle();
//     }
//   }, []);

//   // ✅ Handle Google response — dispatch googleLogin thunk
//   const handleGoogleResponse = async (response) => {
//     const result = await dispatch(googleLogin({ idToken: response.credential }));
//     if (googleLogin.fulfilled.match(result)) {
//       toast.success("Logged in with Google!"); // ✅ Added Toast
//       onLoginSuccess();
//     }
//   };

//   // ✅ Handle email/password login — dispatch loginUser thunk
//   const handleEmailLogin = async (e) => {
//     e.preventDefault();
//     dispatch(clearError());

//     const result = await dispatch(loginUser({ email, password }));
//     if (loginUser.fulfilled.match(result)) {
//       toast.success("Welcome back!"); // ✅ Added Toast
//       onLoginSuccess();
//     }
//   };

//   const handlePhoneLogin = () => {
//     // setShowPhoneMessage(true); // Logic kept but replaced by toast below
//     toast.info("Phone login is coming soon!"); // ✅ Added Toast
//     setTimeout(() => setShowPhoneMessage(false), 3000);
//   };

//   return (
//     <div className="w-full">
//       <h2 className="text-4xl text-center font-black text-white mb-2 tracking-tighter">
//         WELCOME <span className="text-[#f7a221]">BACK</span>
//       </h2>
//       <p className="text-gray-500 text-sm mb-8 text-center">
//         Login to access your VIP deals
//       </p>

//       {/* ✅ API Error from Redux — COMMENTED OUT HARDCORE UI
//       {error && (
//         <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
//           {error}
//         </div>
//       )} 
//       */}

//       {/* Phone Coming Soon — COMMENTED OUT HARDCORE UI
//       {showPhoneMessage && (
//         <div className="mb-4 p-3 bg-[#f7a221]/10 border border-[#f7a221]/20 rounded-xl text-[#f7a221] text-sm">
//           Phone login is coming soon! Please use email or Google.
//         </div>
//       )} 
//       */}

//       {/* Google Sign In */}
//       <div className="mb-4 overflow-hidden flex justify-center">
//         <div id="google-login-btn" className="w-full min-h-[50px]"></div>
//       </div>

//       {/* Phone Login Button */}
//       <button
//         onClick={handlePhoneLogin}
//         className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 mb-4"
//       >
//         <Phone size={18} />
//         Login with Phone Number
//       </button>

//       <div className="relative my-6">
//         <div className="absolute inset-0 flex items-center">
//           <div className="w-full border-t border-white/10"></div>
//         </div>
//         <div className="relative flex justify-center text-xs">
//           <span className="px-4 bg-[#0d0d0d] text-gray-500">
//             OR LOGIN WITH EMAIL
//           </span>
//         </div>
//       </div>

//       {/* Email Login Form */}
//       <form onSubmit={handleEmailLogin} className="space-y-4">
//         <div className="relative">
//           <Mail
//             className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//             size={18}
//           />
//           <input
//             type="email"
//             placeholder="Email address"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//             required
//           />
//         </div>

//         <div className="relative">
//           <Lock
//             className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//             size={18}
//           />
//           <input
//             type="password"
//             placeholder="Password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//             required
//           />
//         </div>

//         <div className="flex justify-end">
//           <button
//             type="button"
//             onClick={onForgotPasswordClick}
//             className="text-sm text-gray-500 hover:text-[#f7a221] transition-colors"
//           >
//             Forgot Password?
//           </button>
//         </div>

//         {/* ✅ Shows loading spinner while API call is in progress */}
//         <button
//           type="submit"
//           disabled={loading}
//           className="w-full bg-[#f7a221] hover:bg-[#e0911c] disabled:opacity-60 disabled:cursor-not-allowed text-black font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-lg tracking-tight"
//         >
//           {loading ? (
//             <span className="flex items-center gap-2">
//               <svg
//                 className="animate-spin h-5 w-5"
//                 viewBox="0 0 24 24"
//                 fill="none"
//               >
//                 <circle
//                   className="opacity-25"
//                   cx="12"
//                   cy="12"
//                   r="10"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                 />
//                 <path
//                   className="opacity-75"
//                   fill="currentColor"
//                   d="M4 12a8 8 0 018-8v8z"
//                 />
//               </svg>
//               Logging in...
//             </span>
//           ) : (
//             <>
//               <LogIn size={20} />
//               LOGIN
//             </>
//           )}
//         </button>
//       </form>

//       {/* Register Link */}
//       <div className="mt-6 text-center">
//         <span className="text-gray-500 text-sm">Don't have an account? </span>
//         <button
//           onClick={onRegisterClick}
//           className="text-[#f7a221] hover:underline text-sm font-medium"
//         >
//           Register here
//         </button>
//       </div>
//     </div>
//   );
// };

// export default Login;

// // components/USER_LOGIN_SEGMENT/Login.jsx
// import React, { useState, useEffect } from "react";
// import { Mail, Lock, LogIn, Phone } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { loginUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// const Login = ({ onLoginSuccess, onRegisterClick, onForgotPasswordClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPhoneMessage, setShowPhoneMessage] = useState(false);

//   // Clear any previous errors when component mounts
//   useEffect(() => {
//     dispatch(clearError());
//   }, [dispatch]);

//   // ✅ Initialize Google Sign-In button
//   useEffect(() => {
//     const initializeGoogle = () => {
//       if (window.google) {
//         window.google.accounts.id.initialize({
//           client_id:
//             import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
//           callback: handleGoogleResponse,
//           ux_mode: "popup",
//         });

//         const btnContainer = document.getElementById("google-login-btn");
//         if (btnContainer) {
//           window.google.accounts.id.renderButton(btnContainer, {
//             theme: "filled_black",
//             size: "large",
//             width: btnContainer.offsetWidth,
//             shape: "pill",
//             text: "signin_with",
//           });
//         }
//       }
//     };

//     if (!window.google) {
//       const script = document.createElement("script");
//       script.src = "https://accounts.google.com/gsi/client";
//       script.async = true;
//       script.defer = true;
//       script.onload = initializeGoogle;
//       document.body.appendChild(script);
//     } else {
//       initializeGoogle();
//     }
//   }, []);

//   // ✅ Handle Google response — dispatch googleLogin thunk
//   const handleGoogleResponse = async (response) => {
//     const result = await dispatch(googleLogin({ idToken: response.credential }));
//     if (googleLogin.fulfilled.match(result)) {
//       onLoginSuccess();
//     }
//   };

//   // ✅ Handle email/password login — dispatch loginUser thunk
//   const handleEmailLogin = async (e) => {
//     e.preventDefault();
//     dispatch(clearError());

//     const result = await dispatch(loginUser({ email, password }));
//     if (loginUser.fulfilled.match(result)) {
//       onLoginSuccess();
//     }
//   };

//   const handlePhoneLogin = () => {
//     setShowPhoneMessage(true);
//     setTimeout(() => setShowPhoneMessage(false), 3000);
//   };

//   return (
//     <div className="w-full">
//       <h2 className="text-4xl text-center font-black text-white mb-2 tracking-tighter">
//         WELCOME <span className="text-[#f7a221]">BACK</span>
//       </h2>
//       <p className="text-gray-500 text-sm mb-8 text-center">Login to access your VIP deals</p>

//       {/* ✅ API Error from Redux */}
//       {error && (
//         <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
//           {error}
//         </div>
//       )}

//       {/* Phone Coming Soon */}
//       {showPhoneMessage && (
//         <div className="mb-4 p-3 bg-[#f7a221]/10 border border-[#f7a221]/20 rounded-xl text-[#f7a221] text-sm">
//           Phone login is coming soon! Please use email or Google.
//         </div>
//       )}

//       {/* Google Sign In */}
//       <div className="mb-4 overflow-hidden flex justify-center">
//         <div id="google-login-btn" className="w-full min-h-[50px]"></div>
//       </div>

//       {/* Phone Login Button */}
//       <button
//         onClick={handlePhoneLogin}
//         className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 mb-4"
//       >
//         <Phone size={18} />
//         Login with Phone Number
//       </button>

//       <div className="relative my-6">
//         <div className="absolute inset-0 flex items-center">
//           <div className="w-full border-t border-white/10"></div>
//         </div>
//         <div className="relative flex justify-center text-xs">
//           <span className="px-4 bg-[#0d0d0d] text-gray-500">
//             OR LOGIN WITH EMAIL
//           </span>
//         </div>
//       </div>

//       {/* Email Login Form */}
//       <form onSubmit={handleEmailLogin} className="space-y-4">
//         <div className="relative">
//           <Mail
//             className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//             size={18}
//           />
//           <input
//             type="email"
//             placeholder="Email address"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//             required
//           />
//         </div>

//         <div className="relative">
//           <Lock
//             className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//             size={18}
//           />
//           <input
//             type="password"
//             placeholder="Password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//             required
//           />
//         </div>

//         <div className="flex justify-end">
//           <button
//             type="button"
//             onClick={onForgotPasswordClick}
//             className="text-sm text-gray-500 hover:text-[#f7a221] transition-colors"
//           >
//             Forgot Password?
//           </button>
//         </div>

//         {/* ✅ Shows loading spinner while API call is in progress */}
//         <button
//           type="submit"
//           disabled={loading}
//           className="w-full bg-[#f7a221] hover:bg-[#e0911c] disabled:opacity-60 disabled:cursor-not-allowed text-black font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-lg tracking-tight"
//         >
//           {loading ? (
//             <span className="flex items-center gap-2">
//               <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
//                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
//               </svg>
//               Logging in...
//             </span>
//           ) : (
//             <>
//               <LogIn size={20} />
//               LOGIN
//             </>
//           )}
//         </button>
//       </form>

//       {/* Register Link */}
//       <div className="mt-6 text-center">
//         <span className="text-gray-500 text-sm">Don't have an account? </span>
//         <button
//           onClick={onRegisterClick}
//           className="text-[#f7a221] hover:underline text-sm font-medium"
//         >
//           Register here
//         </button>
//       </div>
//     </div>
//   );
// };

// export default Login;


// // components/USER_LOGIN_SEGMENT/Login.jsx
// import React, { useState, useEffect } from 'react';
// import { Mail, Lock, LogIn, Phone } from 'lucide-react';

// const Login = ({ onLoginSuccess, onRegisterClick, onForgotPasswordClick }) => {
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
//     const [showPhoneMessage, setShowPhoneMessage] = useState(false);
//     const [localError, setLocalError] = useState('');

//     // Load Google Script and initialize
//     useEffect(() => {
//         const initializeGoogle = () => {
//             if (window.google) {
//                 window.google.accounts.id.initialize({
//                     client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'demo-client-id',
//                     callback: handleGoogleResponse,
//                     ux_mode: "popup",
//                 });

//                 const btnContainer = document.getElementById('google-login-btn');
//                 if (btnContainer) {
//                     window.google.accounts.id.renderButton(btnContainer, {
//                         theme: 'filled_black',
//                         size: 'large',
//                         width: btnContainer.offsetWidth,
//                         shape: 'pill',
//                         text: 'signin_with',
//                     });
//                 }
//             }
//         };

//         if (!window.google) {
//             const script = document.createElement('script');
//             script.src = 'https://accounts.google.com/gsi/client';
//             script.async = true;
//             script.defer = true;
//             script.onload = initializeGoogle;
//             document.body.appendChild(script);
//         } else {
//             initializeGoogle();
//         }
//     }, []);

//     const handleGoogleResponse = (response) => {
//         console.log('Google login demo:', response);
//         alert('Google login successful! (Demo)');
//         onLoginSuccess();
//     };

//     const handleEmailLogin = (e) => {
//         e.preventDefault();
//         setLocalError('');
        
//         if (!email || !password) {
//             setLocalError('Please fill in all fields');
//             return;
//         }

//         // Demo login - just show success
//         alert('Login successful! (Demo)');
//         onLoginSuccess();
//     };

//     const handlePhoneLogin = () => {
//         setShowPhoneMessage(true);
//         setTimeout(() => setShowPhoneMessage(false), 3000);
//     };

//     return (
//         <div className="w-full">
//             <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">
//                 WELCOME <span className="text-[#f7a221]">BACK</span>
//             </h2>
//             <p className="text-gray-500 text-sm mb-8">Login to access your VIP deals</p>

//             {/* Error Message */}
//             {localError && (
//                 <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
//                     {localError}
//                 </div>
//             )}

//             {/* Phone Coming Soon Message */}
//             {showPhoneMessage && (
//                 <div className="mb-4 p-3 bg-[#f7a221]/10 border border-[#f7a221]/20 rounded-xl text-[#f7a221] text-sm">
//                     Phone login is coming soon! Please use email or Google.
//                 </div>
//             )}

//             {/* Google Sign In Container */}
//             <div className="mb-4 overflow-hidden flex justify-center">
//                 <div 
//                     id="google-login-btn" 
//                     className="w-full min-h-[50px]"
//                 ></div>
//             </div>

//             {/* Phone Login Button */}
//             <button 
//                 onClick={handlePhoneLogin}
//                 className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 mb-4"
//             >
//                 <Phone size={18} />
//                 Login with Phone Number
//             </button>

//             <div className="relative my-6">
//                 <div className="absolute inset-0 flex items-center">
//                     <div className="w-full border-t border-white/10"></div>
//                 </div>
//                 <div className="relative flex justify-center text-xs">
//                     <span className="px-4 bg-[#0d0d0d] text-gray-500">OR LOGIN WITH EMAIL</span>
//                 </div>
//             </div>

//             {/* Email Login Form */}
//             <form onSubmit={handleEmailLogin} className="space-y-4">
//                 <div className="relative">
//                     <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
//                     <input
//                         type="email"
//                         placeholder="Email address"
//                         value={email}
//                         onChange={(e) => setEmail(e.target.value)}
//                         className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                         required
//                     />
//                 </div>

//                 <div className="relative">
//                     <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
//                     <input
//                         type="password"
//                         placeholder="Password"
//                         value={password}
//                         onChange={(e) => setPassword(e.target.value)}
//                         className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                         required
//                     />
//                 </div>

//                 <div className="flex justify-end">
//                     <button 
//                         type="button"
//                         onClick={onForgotPasswordClick}
//                         className="text-sm text-gray-500 hover:text-[#f7a221] transition-colors"
//                     >
//                         Forgot Password?
//                     </button>
//                 </div>

//                 <button
//                     type="submit"
//                     className="w-full bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-lg tracking-tight"
//                 >
//                     <LogIn size={20} />
//                     LOGIN
//                 </button>
//             </form>

//             {/* Register Link */}
//             <div className="mt-6 text-center">
//                 <span className="text-gray-500 text-sm">Don't have an account? </span>
//                 <button 
//                     onClick={onRegisterClick}
//                     className="text-[#f7a221] hover:underline text-sm font-medium"
//                 >
//                     Register here
//                 </button>
//             </div>
//         </div>
//     );
// };

// export default Login;