import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { ShieldAlert, Lock, User } from "lucide-react";
import { useAdminLoginMutation } from "../ADMIN_REDUX_MANAGEMENT/adminAuthApi";
import { selectAdminStatus, selectIsAdminAuth } from "../ADMIN_REDUX_MANAGEMENT/adminAuthSlice";
import { useSelector } from "react-redux";
import LOGO from "../../../assets/logo2.png";

const LOCKOUT_SEQUENCE = [0, 0, 0, 30, 60, 300];
const getLockDuration  = (n) => LOCKOUT_SEQUENCE[Math.min(n, LOCKOUT_SEQUENCE.length - 1)];
const STORAGE_KEY      = "lr_admin_lock";

const readLock  = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; } };
const writeLock = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };
const clearLock = ()  => { try { localStorage.removeItem(STORAGE_KEY); } catch {} };

const formatLockTime = (s) => {
    if (s >= 60) { const m = Math.floor(s / 60), r = s % 60; return r > 0 ? `${m}m ${r}s` : `${m}m`; }
    return `${s}s`;
};

const Spinner = ({ onRetry }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-4">
        <div className="w-9 h-9 border-[3px] border-[#1f1f1f] border-t-[#f7a221] rounded-full animate-spin" />
        {onRetry && (
            <button
                onClick={onRetry}
                className="bg-white text-black font-bold py-2 px-4 rounded-md hover:bg-[#e5941d] focus:outline-none focus:ring-2 focus:ring-[#f7a221] transition-colors"
            >
                Try Again
            </button>
        )}
    </div>
);

const AdminLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isAlreadyAuth = useSelector(selectIsAdminAuth);
    const adminStatus   = useSelector(selectAdminStatus);

    const [adminLogin, { isLoading }] = useAdminLoginMutation();

    const [identifier,      setIdentifier]      = useState("");
    const [password,        setPassword]        = useState("");
    const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
    const [failCount,       setFailCount]       = useState(0);

    const lockTimerRef   = useRef(null);
    const hasRedirected  = useRef(false);
    // Capture destination ONCE on mount — never put location.state in useEffect deps
    const destinationRef = useRef(location.state?.from || "/babapanel");

    // ── Redirect if already authenticated ─────────────────────────────────
    // location.state is NOT in deps — it's captured in destinationRef above
    useEffect(() => {
        if (isAlreadyAuth && !hasRedirected.current) {
            hasRedirected.current = true;
            navigate(destinationRef.current, { replace: true });
        }
    }, [isAlreadyAuth, navigate]);

    // ── Rehydrate lockout on mount only ───────────────────────────────────
    useEffect(() => {
        const saved = readLock();
        if (saved) {
            const remaining = Math.ceil((saved.unlocksAt - Date.now()) / 1000);
            if (remaining > 0) {
                setFailCount(saved.failCount);
                setLockSecondsLeft(remaining);
            } else {
                clearLock();
            }
        }
        return () => { if (lockTimerRef.current) clearInterval(lockTimerRef.current); };
    }, []);

    // ── Countdown ticker ──────────────────────────────────────────────────
    useEffect(() => {
        if (lockTimerRef.current) clearInterval(lockTimerRef.current);
        if (lockSecondsLeft > 0) {
            lockTimerRef.current = setInterval(() => {
                setLockSecondsLeft((s) => {
                    if (s <= 1) { clearInterval(lockTimerRef.current); clearLock(); return 0; }
                    return s - 1;
                });
            }, 1000);
        }
        return () => { if (lockTimerRef.current) clearInterval(lockTimerRef.current); };
    }, [lockSecondsLeft]);

    const startLock = (newFailCount) => {
        const duration = getLockDuration(newFailCount);
        if (duration > 0) {
            writeLock({ failCount: newFailCount, unlocksAt: Date.now() + duration * 1000 });
            setLockSecondsLeft(duration);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (lockSecondsLeft > 0 || isLoading) return;
        try {
            await adminLogin({ identifier, password }).unwrap();
            clearLock();
            setFailCount(0);
            setLockSecondsLeft(0);
            toast.success(`Welcome back ${identifier}!`);
            navigate(destinationRef.current, { replace: true });
        } catch (err) {
            const newFail   = failCount + 1;
            const duration  = getLockDuration(newFail);
            const serverMsg = err?.data?.message || err?.message || "Invalid credentials.";
            setFailCount(newFail);
            startLock(newFail);
            toast.error(duration > 0 ? `Too many attempts. Locked for ${formatLockTime(duration)}.` : serverMsg);
        }
    };

    // ── "loading" = actively calling /auth/me or login API ───────────────
    // Show spinner WITH Try Again so user is never stuck
    if (adminStatus === "loading") {
        return <Spinner onRetry={() => window.location.reload()} />;
    }

    // ── "idle" = token exists but undecodable, /auth/me is about to fire ─
    // Show spinner WITH Try Again — this state resolves in <1s normally
    if (adminStatus === "idle") {
        return <Spinner onRetry={() => window.location.reload()} />;
    }

    // ── Already authenticated — spinner while navigate() takes effect ─────
    if (isAlreadyAuth) {
        return <Spinner />;
    }

    // ── "unauthenticated" → show the login form ───────────────────────────
    const isLocked     = lockSecondsLeft > 0;
    const attemptsLeft = 3 - failCount;
    const showWarning  = failCount > 0 && failCount < 3 && !isLocked;

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-6">
            <div className="bg-[#0d0d0d] rounded-3xl border border-[#1f1f1f] p-12 w-full max-w-[420px] shadow-2xl">

                {/* <img src={LOGO} alt="logo" className="h-7 block mx-auto mb-7" /> */}

                <h2 className="text-center text-white text-[28px] font-extrabold tracking-tight mb-1">
                    ADMIN <span className="text-[#f7a221]">ACCESS</span>
                </h2>
                <p className="text-center text-[#555] text-[10px] font-bold tracking-[0.25em] uppercase mb-7">
                    Restricted area — authorised personnel only
                </p>

                {isLocked && (
                    <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
                        <ShieldAlert size={16} color="#ef4444" className="mt-px flex-shrink-0" />
                        <div>
                            <p className="text-red-500 text-[11px] font-extrabold tracking-[0.15em] uppercase mb-0.5">
                                Account temporarily locked
                            </p>
                            <p className="text-red-500/60 text-[11px] m-0">
                                Try again in{" "}
                                <span className="font-extrabold text-red-500">{formatLockTime(lockSecondsLeft)}</span>
                            </p>
                        </div>
                    </div>
                )}

                {showWarning && (
                    <div className="mb-4 p-2.5 bg-[#f7a221]/10 border border-[#f7a221]/20 rounded-xl text-center">
                        <p className="text-[#f7a221]/80 text-[11px] font-bold tracking-[0.05em] m-0">
                            {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} left before lockout
                        </p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-3">
                    <div className="relative">
                        <User size={16} color="rgba(255,255,255,0.2)"
                            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Email or Phone Number"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            disabled={isLocked}
                            required
                            className={`w-full box-border bg-white/5 border border-white/10 rounded-xl py-4 px-4 pl-11 text-white text-sm outline-none transition-colors focus:border-[#f7a221] ${isLocked ? "opacity-40" : ""}`}
                        />
                    </div>

                    <div className="relative">
                        <Lock size={16} color="rgba(255,255,255,0.2)"
                            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            disabled={isLocked}
                            required
                            className={`w-full box-border bg-white/5 border border-white/10 rounded-xl py-4 px-4 pl-11 text-white text-sm outline-none transition-colors focus:border-[#f7a221] ${isLocked ? "opacity-40" : ""}`}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || isLocked}
                        className={`mt-1 w-full rounded-xl py-[17px] font-extrabold text-[13px] tracking-[0.12em] uppercase transition-all ${
                            isLocked
                                ? "bg-[#1f1f1f] text-[#555] cursor-not-allowed"
                                : "bg-[#f7a221] text-black hover:bg-[#f7a221]/90 cursor-pointer shadow-lg shadow-[#f7a221]/20"
                        } ${isLoading ? "opacity-70" : ""}`}
                    >
                        {isLoading ? "Verifying…" : isLocked ? `Locked — ${formatLockTime(lockSecondsLeft)}` : "Sign in to Dashboard"}
                    </button>
                </form>

                <p className="text-center text-[#2a2a2a] text-[10px] font-semibold tracking-[0.1em] uppercase mt-6 mb-0">
                    All access attempts are logged
                </p>
            </div>
        </div>
    );
};

export default AdminLogin;
// // components/ADMIN_SEGMENT/ADMIN_LOGIN_SEGMENT/AdminLogin.jsx
// // ─────────────────────────────────────────────────────────────────────────────
// // Admin-only login page.
// //
// // LOCKOUT SEQUENCE (matches user Login component pattern):
// //   Attempt 1 wrong → show warning, 2 attempts left
// //   Attempt 2 wrong → show warning, 1 attempt left
// //   Attempt 3 wrong → LOCK 30s
// //   Attempt 4 wrong (after lockout expires) → LOCK 60s
// //   Attempt 5+ wrong → LOCK 300s (5 min), stays at 300s permanently
// //
// // Lockout is persisted to localStorage under "lr_admin_lock" so a page
// // refresh does NOT reset the countdown.
// //
// // REDIRECT AFTER LOGIN:
// //   If the user was bounced here from a protected route (e.g. direct URL hit),
// //   we send them back to where they tried to go (location.state.from).
// //   Default destination is /babapanel.
// // ─────────────────────────────────────────────────────────────────────────────

// import { useState, useEffect, useRef } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { ShieldAlert, Lock, User } from "lucide-react";
// import { useAdminLoginMutation } from "../ADMIN_REDUX_MANAGEMENT/adminAuthApi";
// import {
//   selectAdminStatus,
//   selectIsAdminAuth,
// } from "../ADMIN_REDUX_MANAGEMENT/adminAuthSlice";
// import LOGO from "../../../assets/logo2.png";

// // ── Progressive lockout constants ────────────────────────────────────────────
// const LOCKOUT_SEQUENCE = [0, 0, 0, 30, 60, 300];

// const getLockDuration = (failCount) =>
//   LOCKOUT_SEQUENCE[Math.min(failCount, LOCKOUT_SEQUENCE.length - 1)];

// const STORAGE_KEY = "lr_admin_lock";

// const readLock = () => {
//   try {
//     return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
//   } catch {
//     return null;
//   }
// };

// const writeLock = (data) => {
//   try {
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
//   } catch {}
// };

// const clearLock = () => {
//   try {
//     localStorage.removeItem(STORAGE_KEY);
//   } catch {}
// };

// const formatLockTime = (s) => {
//   if (s >= 60) {
//     const m = Math.floor(s / 60);
//     const r = s % 60;
//     return r > 0 ? `${m}m ${r}s` : `${m}m`;
//   }
//   return `${s}s`;
// };

// // ─────────────────────────────────────────────────────────────────────────────

// const AdminLogin = () => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const dispatch = useDispatch();

//   const isAlreadyAuth = useSelector(selectIsAdminAuth);
//   const adminStatus = useSelector(selectAdminStatus);

//   const [adminLogin, { isLoading }] = useAdminLoginMutation();

//   // Form state
//   const [identifier, setIdentifier] = useState("");
//   const [password, setPassword] = useState("");

//   // Lockout state
//   const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
//   const [failCount, setFailCount] = useState(0);
//   const lockTimerRef = useRef(null);
//   const hasRedirected = useRef(false);

//   // ── If already authenticated, skip login and go to dashboard ────────────
//   useEffect(() => {
//     if (isAlreadyAuth && !hasRedirected.current) {
//       hasRedirected.current = true;
//       const destination = location.state?.from || "/babapanel";
//       navigate(destination, { replace: true });
//     }
//   }, [isAlreadyAuth, navigate, location.state]);

//   // ── Rehydrate lockout from localStorage on mount ─────────────────────────
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

//     return () => {
//       if (lockTimerRef.current) {
//         clearInterval(lockTimerRef.current);
//       }
//     };
//   }, []);

//   // ── Countdown ticker ─────────────────────────────────────────────────────
//   useEffect(() => {
//     if (lockTimerRef.current) {
//       clearInterval(lockTimerRef.current);
//     }

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

//     return () => {
//       if (lockTimerRef.current) {
//         clearInterval(lockTimerRef.current);
//       }
//     };
//   }, [lockSecondsLeft]);

//   const startLock = (newFailCount) => {
//     const duration = getLockDuration(newFailCount);
//     if (duration > 0) {
//       const unlocksAt = Date.now() + duration * 1000;
//       writeLock({ failCount: newFailCount, unlocksAt });
//       setLockSecondsLeft(duration);
//     }
//   };

//   // ── Submit ────────────────────────────────────────────────────────────────
//   const handleLogin = async (e) => {
//     e.preventDefault();
//     if (lockSecondsLeft > 0 || isLoading) return;

//     try {
//       await adminLogin({ identifier, password }).unwrap();

//       clearLock();
//       setFailCount(0);
//       setLockSecondsLeft(0);
//       toast.success(`Welcome back ${identifier}!`);

//       const destination = location.state?.from || "/babapanel";
//       navigate(destination, { replace: true });
//     } catch (err) {
//       const newFail = failCount + 1;
//       setFailCount(newFail);
//       startLock(newFail);

//       const duration = getLockDuration(newFail);
//       const serverMsg = err?.data?.message || err?.message || "Invalid credentials.";

//       if (duration > 0) {
//         toast.error(`Too many attempts. Locked for ${formatLockTime(duration)}.`);
//       } else {
//         toast.error(serverMsg);
//       }
//     }
//   };

//   const isLocked = lockSecondsLeft > 0;
//   const attemptsBeforeLock = 3;
//   const attemptsLeft = attemptsBeforeLock - failCount;
//   const showWarning = failCount > 0 && failCount < attemptsBeforeLock && !isLocked;

//   // ── Don't flash the form while checking an existing session ─────────────
//   if (adminStatus === "loading") {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-black">
//         <div className="w-9 h-9 border-3 border-[#1f1f1f] border-t-[#f7a221] rounded-full animate-spin" />
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────────────────────────────────
//   return (
//     <div className="min-h-screen flex items-center justify-center bg-black p-6">
//       {/* Card */}
//       <div className="bg-[#0d0d0d] rounded-3xl border border-[#1f1f1f] p-12 w-full max-w-[420px] shadow-2xl">
//         {/* Logo */}
//         <img
//           src={LOGO}
//           alt="logo"
//           className="h-7 block mx-auto mb-7"
//         />

//         {/* Heading */}
//         <h2 className="text-center text-white text-[28px] font-extrabold tracking-tight mb-1">
//           ADMIN <span className="text-[#f7a221]">ACCESS</span>
//         </h2>
//         <p className="text-center text-[#555] text-[10px] font-bold tracking-[0.25em] uppercase mb-7">
//           Restricted area — authorised personnel only
//         </p>

//         {/* ── Lockout banner ───────────────────────────────────────────── */}
//         {isLocked && (
//           <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
//             <ShieldAlert size={16} color="#ef4444" className="mt-px flex-shrink-0" />
//             <div>
//               <p className="text-red-500 text-[11px] font-extrabold tracking-[0.15em] uppercase mb-0.5">
//                 Account temporarily locked
//               </p>
//               <p className="text-red-500/60 text-[11px] m-0">
//                 Try again in{" "}
//                 <span className="font-extrabold text-red-500">
//                   {formatLockTime(lockSecondsLeft)}
//                 </span>
//               </p>
//             </div>
//           </div>
//         )}

//         {/* ── Attempts warning (before first lockout) ──────────────────── */}
//         {showWarning && (
//           <div className="mb-4 p-2.5 bg-[#f7a221]/10 border border-[#f7a221]/20 rounded-xl text-center">
//             <p className="text-[#f7a221]/80 text-[11px] font-bold tracking-[0.05em] m-0">
//               {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} left before lockout
//             </p>
//           </div>
//         )}

//         {/* ── Form ─────────────────────────────────────────────────────── */}
//         <form onSubmit={handleLogin} className="flex flex-col gap-3">
//           {/* Identifier input */}
//           <div className="relative">
//             <User
//               size={16}
//               color="rgba(255,255,255,0.2)"
//               className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
//             />
//             <input
//               type="text"
//               placeholder="Email or Phone Number"
//               value={identifier}
//               onChange={(e) => setIdentifier(e.target.value)}
//               disabled={isLocked}
//               required
//               className={`w-full box-border bg-white/5 border border-white/10 rounded-xl py-4 px-4 pl-11 text-white text-sm outline-none transition-colors focus:border-[#f7a221] ${
//                 isLocked ? "opacity-40" : ""
//               }`}
//             />
//           </div>

//           {/* Password input */}
//           <div className="relative">
//             <Lock
//               size={16}
//               color="rgba(255,255,255,0.2)"
//               className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
//             />
//             <input
//               type="password"
//               placeholder="Password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               autoComplete="current-password"
//               disabled={isLocked}
//               required
//               className={`w-full box-border bg-white/5 border border-white/10 rounded-xl py-4 px-4 pl-11 text-white text-sm outline-none transition-colors focus:border-[#f7a221] ${
//                 isLocked ? "opacity-40" : ""
//               }`}
//             />
//           </div>

//           {/* Submit */}
//           <button
//             type="submit"
//             disabled={isLoading || isLocked}
//             className={`mt-1 w-full rounded-xl py-[17px] font-extrabold text-[13px] tracking-[0.12em] uppercase transition-all ${
//               isLocked
//                 ? "bg-[#1f1f1f] text-[#555] cursor-not-allowed"
//                 : "bg-[#f7a221] text-black hover:bg-[#f7a221]/90 cursor-pointer shadow-lg shadow-[#f7a221]/20"
//             } ${isLoading ? "opacity-70" : ""}`}
//           >
//             {isLoading
//               ? "Verifying…"
//               : isLocked
//               ? `Locked — ${formatLockTime(lockSecondsLeft)}`
//               : "Sign in to Dashboard"}
//           </button>
//         </form>

//         {/* Security note */}
//         <p className="text-center text-[#2a2a2a] text-[10px] font-semibold tracking-[0.1em] uppercase mt-6 mb-0">
//           All access attempts are logged
//         </p>
//       </div>
//     </div>
//   );
// };

// export default AdminLogin;

// // components/ADMIN_SEGMENT/AdminLogin.jsx
// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { useSelector } from "react-redux";
// import { useAdminLoginMutation } from "../ADMIN_REDUX_MANAGEMENT/adminAuthApi";
// import LOGO from "../../../assets/logo2.png";

// const AdminLogin = () => {
//     const navigate = useNavigate();
//     const isLoggedIn = !!localStorage.getItem("accessToken");
//     const [adminLogin, { isLoading: isPending, error, reset }] = useAdminLoginMutation();

//     const [email, setEmail] = useState("");
//     const [password, setPassword] = useState("");
//     const [showPass, setShowPass] = useState(false);
//     const [fieldErrors, setFieldErrors] = useState({});

//     // Already authenticated — skip login screen
//     useEffect(() => {
//         if (isLoggedIn) navigate("/admindash", { replace: true });
//     }, [isLoggedIn]);

//     // Clear React Query error when user starts retyping
//     useEffect(() => { if (error) reset(); }, [email, password]);

//     const validate = () => {
//         const errs = {};
//         if (!email.trim()) errs.email = "Email is required";
//         if (!password.trim()) errs.password = "Password is required";
//         return errs;
//     };

//     const handleSubmit = (e) => {
//         e.preventDefault();
//         const errs = validate();
//         if (Object.keys(errs).length) { setFieldErrors(errs); return; }
//         setFieldErrors({});

//         adminLogin(
//             { email: email.trim(), password },
//             { onSuccess: () => navigate("/admindash", { replace: true }) }
//         );
//     };

//     // Extract error message from React Query error
//     const errorMsg = error?.response?.data?.message || error?.message || null;

//     return (
//         <>
//             <style>{`
//         @keyframes al-fadeUp {
//           from { opacity: 0; transform: translateY(20px); }
//           to   { opacity: 1; transform: translateY(0); }
//         }
//         @keyframes al-fadeIn  { from { opacity:0; } to { opacity:1; } }
//         @keyframes al-spin    { to   { transform: rotate(360deg); } }
//         .al-card  { animation: al-fadeUp 0.38s cubic-bezier(0.32,0.72,0,1) both; }
//         .al-fade  { animation: al-fadeIn 0.25s ease both; }
//         .al-input {
//           width: 100%; background: #1a1a1a; border: 1px solid #2a2a2a;
//           border-radius: 12px; padding: 14px 16px; color: #fff;
//           font-size: 14px; outline: none; transition: border-color 0.2s;
//           box-sizing: border-box;
//         }
//         .al-input:focus       { border-color: #f7a221; }
//         .al-input.err         { border-color: #ef4444; }
//         .al-input::placeholder{ color: #555; }
//         .al-btn {
//           width: 100%; background: #f7a221; color: #000;
//           font-weight: 800; font-size: 13px; letter-spacing: 0.12em;
//           border: none; border-radius: 12px; padding: 15px;
//           cursor: pointer; transition: opacity 0.2s, transform 0.15s;
//         }
//         .al-btn:hover:not(:disabled)  { opacity: 0.9; }
//         .al-btn:active:not(:disabled) { transform: scale(0.98); }
//         .al-btn:disabled { opacity: 0.5; cursor: not-allowed; }
//         .al-spinner {
//           width: 14px; height: 14px; border: 2px solid #00000055;
//           border-top-color: #000; border-radius: 50%;
//           display: inline-block; animation: al-spin 0.7s linear infinite;
//         }
//       `}</style>

//             <div className="al-fade" style={{
//                 minHeight: "100vh", display: "flex", alignItems: "center",
//                 justifyContent: "center", background: "#000", padding: "24px 16px",
//             }}>
//                 <div className="al-card" style={{ width: "100%", maxWidth: "420px" }}>

//                     {/* ── Card ──────────────────────────────────────────────────────── */}
//                     <div style={{
//                         background: "#0d0d0d", borderRadius: "2.5rem",
//                         border: "1px solid #1f1f1f", padding: "40px 36px",
//                         boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
//                     }}>

//                         {/* Logo + heading */}
//                         <div style={{ textAlign: "center", marginBottom: "32px" }}>
//                             <img src={LOGO} alt="logo"
//                                 style={{ height: "36px", margin: "0 auto 20px", display: "block" }} />
//                             <p style={{
//                                 fontSize: "11px", fontWeight: 800, letterSpacing: "0.2em",
//                                 color: "#f7a221", marginBottom: "6px", margin: "0 0 6px",
//                             }}>
//                                 ADMIN PORTAL
//                             </p>
//                             <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
//                                 Sign in to continue
//                             </h1>
//                             <p style={{ fontSize: "13px", color: "#555", margin: 0 }}>
//                                 Restricted access — authorized personnel only
//                             </p>
//                         </div>

//                         {/* Error banner — React Query error */}
//                         {errorMsg && (
//                             <div className="al-fade" style={{
//                                 background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
//                                 borderRadius: "10px", padding: "12px 14px", marginBottom: "20px",
//                                 display: "flex", alignItems: "center", gap: "10px",
//                             }}>
//                                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
//                                     stroke="#ef4444" strokeWidth="2" strokeLinecap="round"
//                                     strokeLinejoin="round" style={{ flexShrink: 0 }}>
//                                     <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
//                                     <line x1="12" y1="9" x2="12" y2="13" />
//                                     <line x1="12" y1="17" x2="12.01" y2="17" />
//                                 </svg>
//                                 <p style={{ fontSize: "13px", color: "#ef4444", margin: 0 }}>{errorMsg}</p>
//                             </div>
//                         )}

//                         {/* ── Form ──────────────────────────────────────────────────── */}
//                         <form onSubmit={handleSubmit} noValidate>

//                             {/* Email */}
//                             <div style={{ marginBottom: "16px" }}>
//                                 <label style={{
//                                     display: "block", fontSize: "11px", fontWeight: 700,
//                                     letterSpacing: "0.15em", color: "#888", marginBottom: "8px",
//                                 }}>
//                                     EMAIL
//                                 </label>
//                                 <input
//                                     type="email"
//                                     className={`al-input${fieldErrors.email ? " err" : ""}`}
//                                     placeholder="admin@example.com"
//                                     value={email}
//                                     autoComplete="email"
//                                     onChange={(e) => {
//                                         setEmail(e.target.value);
//                                         if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: null }));
//                                     }}
//                                 />
//                                 {fieldErrors.email && (
//                                     <p style={{ fontSize: "12px", color: "#ef4444", margin: "5px 0 0" }}>
//                                         {fieldErrors.email}
//                                     </p>
//                                 )}
//                             </div>

//                             {/* Password */}
//                             <div style={{ marginBottom: "24px" }}>
//                                 <label style={{
//                                     display: "block", fontSize: "11px", fontWeight: 700,
//                                     letterSpacing: "0.15em", color: "#888", marginBottom: "8px",
//                                 }}>
//                                     PASSWORD
//                                 </label>
//                                 <div style={{ position: "relative" }}>
//                                     <input
//                                         type={showPass ? "text" : "password"}
//                                         className={`al-input${fieldErrors.password ? " err" : ""}`}
//                                         placeholder="••••••••••"
//                                         value={password}
//                                         autoComplete="current-password"
//                                         style={{ paddingRight: "48px" }}
//                                         onChange={(e) => {
//                                             setPassword(e.target.value);
//                                             if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: null }));
//                                         }}
//                                     />
//                                     {/* Show / hide toggle */}
//                                     <button
//                                         type="button"
//                                         onClick={() => setShowPass((p) => !p)}
//                                         aria-label={showPass ? "Hide password" : "Show password"}
//                                         style={{
//                                             position: "absolute", right: "14px", top: "50%",
//                                             transform: "translateY(-50%)", background: "none",
//                                             border: "none", cursor: "pointer", padding: "4px", color: "#555",
//                                         }}
//                                     >
//                                         {showPass ? (
//                                             /* Eye-off */
//                                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
//                                                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                                                 <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
//                                                 <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
//                                                 <line x1="1" y1="1" x2="23" y2="23" />
//                                             </svg>
//                                         ) : (
//                                             /* Eye */
//                                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
//                                                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                                                 <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
//                                                 <circle cx="12" cy="12" r="3" />
//                                             </svg>
//                                         )}
//                                     </button>
//                                 </div>
//                                 {fieldErrors.password && (
//                                     <p style={{ fontSize: "12px", color: "#ef4444", margin: "5px 0 0" }}>
//                                         {fieldErrors.password}
//                                     </p>
//                                 )}
//                             </div>

//                             {/* Submit */}
//                             <button type="submit" className="al-btn" disabled={isPending}>
//                                 {isPending ? (
//                                     <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
//                                         <span className="al-spinner" />
//                                         SIGNING IN...
//                                     </span>
//                                 ) : "SIGN IN"}
//                             </button>
//                         </form>

//                         {/* Footer note */}
//                         <p style={{
//                             fontSize: "11px", color: "#333", textAlign: "center",
//                             marginTop: "24px", lineHeight: 1.6,
//                         }}>
//                             Not an admin?{" "}
//                             <a href="/" style={{ color: "#f7a221", textDecoration: "none", fontWeight: 700 }}>
//                                 Go to storefront
//                             </a>
//                         </p>
//                     </div>

//                     {/* Version stamp */}
//                     <p style={{
//                         textAlign: "center", fontSize: "10px", color: "#333",
//                         marginTop: "16px", letterSpacing: "0.15em", fontWeight: 700,
//                     }}>
//                         SYSTEM v1.0.4
//                     </p>
//                 </div>
//             </div>
//         </>
//     );
// };

// export default AdminLogin;