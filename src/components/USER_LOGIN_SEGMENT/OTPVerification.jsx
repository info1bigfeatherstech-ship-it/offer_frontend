import React, { useState, useEffect, useRef } from "react";
import { Phone, Mail, ChevronLeft, Clock, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { verifyOTP, registerUser, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

/*
  THEME FIX — OtpVerification white theme applied.

  BEFORE (broken):
    - OTP boxes used bg-white/[0.04] border-white/10 text-white
      → designed for dark background, invisible on white card
    - Timer text used text-white/30 → invisible on white
    - Subtitle used text-white/35 → invisible on white
    - Heading used text-white → invisible on white

  AFTER (fixed):
    - OTP boxes now use light theme: #f5f5f5 bg, #e8e8e8 border, #111 text
      — exactly matching ForgotPassword's .fp-otp-box style
    - All text colors switched to #111111 / #aaaaaa / #999999
    - Timer uses #111111 text
    - Scoped <style> tag added (fp-otp-* classes) — no global pollution
    - All Tailwind color classes that assumed dark bg have been replaced
      with inline styles or the new fp-otp-* CSS classes

  Architecture is unchanged — still a plain content panel inside
  LogRegister's card shell. No fixed/backdrop/z-index.
*/

const OTP_TIMER_SECONDS = 5*60;  // Changed from 5 * 60 to 30 seconds

const formatTimer = (totalSec) => {
  const safe = Math.max(0, Number(totalSec) || 0);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const OtpVerification = ({
  identifier,
  phone,
  name,
  email,
  registrationPassword,
  deliveryMessage,
  onClose,
  onVerify,
}) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const verifyId = String(identifier || "").trim();
  const isEmailChannel = verifyId.includes("@");

  const [otp,        setOtp]        = useState(["", "", "", "", "", ""]);
  const [timer,      setTimer]      = useState(OTP_TIMER_SECONDS);
  const [canResend,  setCanResend]  = useState(false);
  const [localError, setLocalError] = useState("");
  const inputRefs = useRef([]);

  useEffect(() => {
    dispatch(clearError());
    setTimeout(() => inputRefs.current[0]?.focus(), 180);
  }, [dispatch]);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error, dispatch]);

  useEffect(() => {
    if (localError) { toast.error(localError); setLocalError(""); }
  }, [localError]);

  useEffect(() => {
    if (timer > 0) {
      const id = setInterval(() => setTimer((s) => s - 1), 1000);
      return () => clearInterval(id);
    } else { setCanResend(true); }
  }, [timer]);

  const handleChange = (idx, val) => {
    const c = val.replace(/\D/g, "");
    if (!c && val) return;
    if (c.length > 1) return;
    const next = [...otp];
    next[idx] = c;
    setOtp(next);
    if (c && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace") {
      if (otp[idx]) {
        const next = [...otp]; next[idx] = ""; setOtp(next);
      } else if (idx > 0) { inputRefs.current[idx - 1]?.focus(); }
    }
    if (e.key === "ArrowLeft"  && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    pasted.split("").forEach((ch, i) => { if (i < 6) next[i] = ch; });
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleResend = async () => {
    if (!canResend) return;
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length !== 10) {
      toast.error("Phone on file is invalid. Go back and register again.");
      return;
    }
    if (!registrationPassword || String(registrationPassword).length < 6) {
      toast.error("Unable to resend code. Go back and use Register again.");
      return;
    }
    setTimer(OTP_TIMER_SECONDS);
    setCanResend(false);
    setOtp(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
    const result = await dispatch(
      registerUser({
        name: name || "User",
        email: String(email || "").trim(),
        password: registrationPassword,
        phone: digits,
      })
    );
    if (registerUser.fulfilled.match(result)) {
      const msg = result.payload?.message;
      toast.success(typeof msg === "string" && msg ? msg : "New OTP sent!");
    }
  };

  const handleVerify = async () => {
    const str = otp.join("");
    if (str.length !== 6) { setLocalError("Please enter all 6 digits"); return; }
    if (!verifyId) {
      setLocalError("Missing verification destination. Go back and try again.");
      return;
    }
    const result = await dispatch(verifyOTP({ identifier: verifyId, otp: str }));
    if (verifyOTP.fulfilled.match(result)) {
      toast.success("Verified! Welcome aboard 🎉");
      onVerify();
    }
  };

  const isComplete = otp.join("").length === 6;

  const maskedDestination = (() => {
    if (!verifyId) return "";
    if (isEmailChannel) {
      const at = verifyId.indexOf("@");
      const local = verifyId.slice(0, at);
      const host = verifyId.slice(at + 1);
      const dot = host.lastIndexOf(".");
      const dom = dot === -1 ? host : host.slice(0, dot);
      const tld = dot === -1 ? "" : host.slice(dot);
      const uShow = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
      return `${uShow}••••@${dom.length ? `${dom[0]}•••` : "•••"}${tld}`;
    }
    return `${"•".repeat(Math.max(0, verifyId.length - 4))}${verifyId.slice(-4)}`;
  })();

  return (
    <div className="w-full px-5 sm:px-8 pt-4 pb-6" style={{ color: "#111111" }}>

      {/* ── White-theme scoped styles — mirrors ForgotPassword ── */}
      <style>{`
        .otp-wt-box {
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
        .otp-wt-box:focus {
          border-color: #f7a221;
          background: #fffdf7;
          box-shadow: 0 0 0 3px rgba(247,162,33,0.18);
        }
        .otp-wt-btn {
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
        .otp-wt-btn:hover:not(:disabled) { background: #e0911c; }
        .otp-wt-btn:active:not(:disabled) { background: #c97e18; transform: scale(0.99); }
        .otp-wt-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {/* Back button */}
      <button
        onClick={onClose}
        className="flex items-center cursor-pointer gap-1 font-black text-[10px] tracking-widest transition-colors mb-4 sm:mb-5 uppercase self-start touch-manipulation"
        style={{ color: "#f7a221" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#111")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#f7a221")}
      >
        <ChevronLeft size={16} /> Back
      </button>

      {/* Delivery message banner */}
      {deliveryMessage ? (
        <div
          className="mb-4 rounded-xl px-3 py-2.5 text-[11px] text-center leading-relaxed font-semibold"
          style={{
            border: "1px solid rgba(247,162,33,0.35)",
            background: "rgba(247,162,33,0.08)",
            color: "#b87a10",
          }}
        >
          {deliveryMessage}
        </div>
      ) : null}

      {/* Icon + heading */}
      <div className="flex flex-col items-center mb-6 sm:mb-8">
        <div
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center mb-4 rotate-3"
          style={{
            background: "rgba(247,162,33,0.1)",
            border: "1px solid rgba(247,162,33,0.25)",
          }}
        >
          {isEmailChannel ? (
            <Mail className="-rotate-3" size={28} style={{ color: "#f7a221" }} />
          ) : (
            <Phone className="-rotate-3" size={28} style={{ color: "#f7a221" }} />
          )}
        </div>

        <h3
          className="text-2xl sm:text-3xl font-black tracking-tighter mb-2"
          style={{ color: "#111111" }}
        >
          VERIFY <span style={{ color: "#f7a221" }}>OTP</span>
        </h3>

        <p
          className="text-[11px] text-center uppercase tracking-widest leading-relaxed max-w-xs"
          style={{ color: "#999999" }}
        >
          6-digit code sent to{" "}
          <span style={{ color: "#111111", fontWeight: 700 }} className="break-all">
            {maskedDestination || "—"}
          </span>
        </p>
      </div>

      {/* OTP digit boxes */}
      <div
        className="flex justify-between gap-1.5 sm:gap-2 mb-6 sm:mb-8"
        onPaste={handlePaste}
      >
        {otp.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => (inputRefs.current[idx] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength="1"
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            className="otp-wt-box touch-manipulation"
            aria-label={`OTP digit ${idx + 1}`}
          />
        ))}
      </div>

      {/* Resend timer */}
      <div
        className="flex items-center justify-center gap-2 mb-6 sm:mb-8"
        style={{ color: "#aaaaaa" }}
      >
        <Clock size={13} className="shrink-0" />
        <span className="text-[11px] font-bold tracking-widest">
          {canResend ? (
            <button
              onClick={handleResend}
              className="uppercase cursor-pointer touch-manipulation underline underline-offset-2"
              style={{ color: "#f7a221" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#c97e18")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#f7a221")}
            >
              RESEND CODE
            </button>
          ) : (
            <span style={{ color: "#111111" }}>
              RESEND IN{" "}
              <span style={{ color: "#f7a221", fontVariantNumeric: "tabular-nums" }}>
                {formatTimer(timer)}
              </span>
            </span>
          )}
        </span>
      </div>

      {/* Verify button */}
      <button
        onClick={handleVerify}
        disabled={!isComplete || loading}
        className="otp-wt-btn"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : "VERIFY & CONTINUE"}
      </button>
    </div>
  );
};

export default OtpVerification;

