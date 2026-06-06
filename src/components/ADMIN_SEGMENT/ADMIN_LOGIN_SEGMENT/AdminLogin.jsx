import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { ShieldAlert, Lock, User, Eye, EyeOff } from "lucide-react";
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-9 h-9 border-[3px] border-[#e8e8e8] border-t-[#f7a221] rounded-full animate-spin" />
        {onRetry && (
            <button
                onClick={onRetry}
                className="bg-[#f7a221] text-black font-bold py-2 px-4 rounded-md hover:bg-[#e0911c] focus:outline-none focus:ring-2 focus:ring-[#f7a221] transition-colors"
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
    const [showPassword,    setShowPassword]    = useState(false);
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
        <div className="min-h-screen flex items-center justify-center bg-white p-6">
            <div className="bg-white rounded-3xl border border-[#e8e8e8] p-12 w-full max-w-[420px] shadow-lg">

                {/* <img src={LOGO} alt="logo" className="h-7 block mx-auto mb-7" /> */}

                <h2 className="text-center text-[#111111] text-[28px] font-extrabold tracking-tight mb-1">
                    BABA PANEL <span className="text-[#f7a221]">ACCESS</span>
                </h2>
                <p className="text-center text-[#999999] text-[10px] font-bold tracking-[0.25em] uppercase mb-7">
                    Restricted area — authorised personnel only
                </p>

                {isLocked && (
                    <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
                        <ShieldAlert size={16} color="#ef4444" className="mt-px flex-shrink-0" />
                        <div>
                            <p className="text-red-600 text-[11px] font-extrabold tracking-[0.15em] uppercase mb-0.5">
                                Account temporarily locked
                            </p>
                            <p className="text-red-500/80 text-[11px] m-0">
                                Try again in{" "}
                                <span className="font-extrabold text-red-600">{formatLockTime(lockSecondsLeft)}</span>
                            </p>
                        </div>
                    </div>
                )}

                {showWarning && (
                    <div className="mb-4 p-2.5 bg-[#f7a221]/10 border border-[#f7a221]/30 rounded-xl text-center">
                        <p className="text-[#f7a221] text-[11px] font-bold tracking-[0.05em] m-0">
                            {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} left before lockout
                        </p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-3">
                    <div className="relative">
                        <User size={16} color="#aaaaaa"
                            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Email or Phone Number"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            disabled={isLocked}
                            required
                            className={`w-full box-border bg-[#f5f5f5] border border-[#e8e8e8] rounded-xl py-4 px-4 pl-11 text-[#111111] text-sm outline-none transition-colors focus:border-[#f7a221] focus:bg-[#fffdf7] ${isLocked ? "opacity-40" : ""}`}
                        />
                    </div>

                    <div className="relative">
                        <Lock size={16} color="#aaaaaa"
                            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            disabled={isLocked}
                            required
                            className={`w-full box-border bg-[#f5f5f5] border border-[#e8e8e8] rounded-xl py-4 px-4 pl-11 pr-11 text-[#111111] text-sm outline-none transition-colors focus:border-[#f7a221] focus:bg-[#fffdf7] ${isLocked ? "opacity-40" : ""}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLocked}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#aaaaaa] hover:text-[#f7a221] transition-colors disabled:opacity-40"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || isLocked}
                        className={`mt-1 w-full rounded-xl py-[17px] font-extrabold text-[13px] tracking-[0.12em] uppercase transition-all ${
                            isLocked
                                ? "bg-[#f0f0f0] text-[#999999] cursor-not-allowed"
                                : "bg-[#f7a221] text-black hover:bg-[#e0911c] cursor-pointer shadow-lg shadow-[#f7a221]/20"
                        } ${isLoading ? "opacity-70" : ""}`}
                    >
                        {isLoading ? "Verifying…" : isLocked ? `Locked — ${formatLockTime(lockSecondsLeft)}` : "Sign in to Dashboard"}
                    </button>
                </form>

                <p className="text-center text-[#cccccc] text-[10px] font-semibold tracking-[0.1em] uppercase mt-6 mb-0">
                    All access attempts are logged
                </p>
            </div>
        </div>
    );
};

export default AdminLogin;


