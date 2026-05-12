import React, { useState, useEffect, useRef } from "react";
import { Phone, ChevronLeft, Clock, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { verifyOTP, registerUser, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

/*
  ARCHITECTURE FIX — OtpVerification is NO LONGER a self-contained modal.

  BEFORE (broken):
    - Had its own  fixed inset-0 z-[200] bg-black/95 backdrop-blur-md overflow-y-auto
    - When open: TWO full-screen fixed backdrops competed for scroll ownership
    - iOS Safari double scroll-lock: user could not scroll OTP boxes on iPhone SE
    - mt-auto on verify button pushed it behind home indicator with keyboard open

  AFTER (fixed):
    - Renders as a plain content panel inside LogRegister's existing card shell
    - No fixed positioning, no backdrop, no z-index, no overflow-y-auto
    - LogRegister's single backdrop handles everything
    - Full height determined by content, not viewport — keyboard-safe by default
    - Padding at bottom is handled by parent card's pb-[env(safe-area-inset-bottom)]

  Props: { phone, name, onClose, onVerify }
  Backend: POST /auth/otp-verify-login { phone, otp }
*/

const OtpVerification = ({ phone, name, onClose, onVerify }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [otp,        setOtp]        = useState(["", "", "", "", "", ""]);
  const [timer,      setTimer]      = useState(60);
  const [canResend,  setCanResend]  = useState(false);
  const [localError, setLocalError] = useState("");
  const inputRefs = useRef([]);

  useEffect(() => {
    dispatch(clearError());
    // Small delay so the slide-up animation completes before keyboard opens
    setTimeout(() => inputRefs.current[0]?.focus(), 180);
  }, [dispatch]);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error, dispatch]);

  useEffect(() => {
    if (localError) { toast.error(localError); setLocalError(""); }
  }, [localError]);

  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const id = setInterval(() => setTimer((s) => s - 1), 1000);
      return () => clearInterval(id);
    } else { setCanResend(true); }
  }, [timer]);

  // ── OTP input handlers ─────────────────────────────────────────
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
  // ──────────────────────────────────────────────────────────────

  const handleResend = async () => {
    if (!canResend) return;
    setTimer(60);
    setCanResend(false);
    setOtp(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
    // Re-call register with same phone to trigger new OTP SMS
    // Backend handles existing unverified user by phone
    const result = await dispatch(
      registerUser({
        name:     name || "User",
        email:    `resend_${Date.now()}@placeholder.com`,
        password: "__resend__",
        phone,
      })
    );
    if (registerUser.fulfilled.match(result)) toast.success("New OTP sent to your phone!");
  };

  const handleVerify = async () => {
    const str = otp.join("");
    if (str.length !== 6) { setLocalError("Please enter all 6 digits"); return; }
    const result = await dispatch(verifyOTP({ phone, otp: str }));
    if (verifyOTP.fulfilled.match(result)) {
      toast.success("Verified! Welcome aboard 🎉");
      onVerify();
    }
  };

  const isComplete = otp.join("").length === 6;

  // Mask phone: show last 4 digits only — e.g. ******6789
  const maskedPhone = phone
    ? `${"*".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`
    : "";

  return (
    /*
      FIX: This is now a plain div — NO fixed, NO inset-0, NO z-index, NO overflow.
      It is rendered as a sibling to Login/Register content inside LogRegister's card.
      The lr-slide-up animation is applied by LogRegister's wrapper div on this panel.
      Padding px-6 sm:px-8 matches the tab panels' p-5 sm:p-8.
      pt-4 gives breathing room below the mobile top bar.
      pb-6 bottom padding — safe-area is handled by parent card's
      pb-[env(safe-area-inset-bottom)].
    */
    <div className="w-full px-5 sm:px-8 pt-4 pb-6">

      {/* Back / change phone button */}
      <button
        onClick={onClose}
        className="flex items-center cursor-pointer gap-1 text-[#f7a221] hover:text-white font-black text-[10px] tracking-widest transition-colors mb-6 sm:mb-8 uppercase self-start touch-manipulation"
      >
        <ChevronLeft size={16} /> Change Phone
      </button>

      {/* Phone icon + heading */}
      <div className="flex flex-col items-center mb-6 sm:mb-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#f7a221]/10 flex items-center justify-center mb-4 border border-[#f7a221]/20 rotate-3">
          <Phone className="text-[#f7a221] -rotate-3" size={28} />
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter mb-2">
          VERIFY <span className="text-[#f7a221]">OTP</span>
        </h3>
        <p className="text-white/35 text-[11px] text-center uppercase tracking-widest leading-relaxed max-w-xs">
          6-digit code sent to{" "}
          <span className="text-white lowercase tracking-normal font-bold break-all">
            {maskedPhone}
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
            /*
              FIX: text-[20px] as Tailwind arbitrary value — single source of truth.
              No inline style needed. 20px > 16px so iOS won't zoom.
            */
            className="flex-1 min-w-0 aspect-square bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl text-center text-white text-[20px] font-black focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/40 transition-all caret-transparent touch-manipulation"
            aria-label={`OTP digit ${idx + 1}`}
          />
        ))}
      </div>

      {/* Resend timer */}
      <div className="flex items-center justify-center gap-2 text-white/30 mb-6 sm:mb-8">
        <Clock size={13} className="shrink-0" />
        <span className="text-[11px] font-bold tracking-widest">
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-[#f7a221] hover:underline uppercase cursor-pointer touch-manipulation"
            >
              RESEND CODE
            </button>
          ) : (
            `RESEND IN ${timer}S`
          )}
        </span>
      </div>

      {/*
        FIX: Removed mt-auto — it pushed the button to the absolute bottom of a
        flex min-h-screen container, placing it behind keyboard/home indicator.
        Now it sits naturally in flow, always visible above keyboard.
      */}
      <button
        onClick={handleVerify}
        disabled={!isComplete || loading}
        className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-30 text-black font-black py-4 rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 text-sm shadow-[0_8px_20px_rgba(247,162,33,0.25)] touch-manipulation select-none"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : "VERIFY & CONTINUE"}
      </button>
    </div>
  );
};

export default OtpVerification;
// try to make it responsive 
// import React, { useState, useEffect, useRef } from "react";
// import { Phone, ChevronLeft, Clock, Loader2 } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { verifyOTP, registerUser, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// /*
//   CHANGED: This component now works with phone-based OTP.
  
//   Props changed:
//     BEFORE: { email, name, onClose, onVerify }
//     AFTER:  { phone, name, onClose, onVerify }
  
//   Backend endpoint: POST /auth/otp-verify-login
//     BEFORE: { email, otp }
//     AFTER:  { phone, otp }
  
//   Resend OTP: still calls registerUser but phone is now required,
//   so we pass the phone from props to re-trigger SMS OTP.
// */

// const OtpVerification = ({ phone, name, onClose, onVerify }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);

//   const [otp, setOtp] = useState(["", "", "", "", "", ""]);
//   const [timer, setTimer] = useState(60);
//   const [canResend, setCanResend] = useState(false);
//   const [localError, setLocalError] = useState("");
//   const inputRefs = useRef([]);

//   useEffect(() => {
//     dispatch(clearError());
//     setTimeout(() => inputRefs.current[0]?.focus(), 120);
//   }, [dispatch]);

//   useEffect(() => {
//     if (error) { toast.error(error); dispatch(clearError()); }
//   }, [error, dispatch]);

//   useEffect(() => {
//     if (localError) { toast.error(localError); setLocalError(""); }
//   }, [localError]);

//   useEffect(() => {
//     if (timer > 0) {
//       const id = setInterval(() => setTimer((s) => s - 1), 1000);
//       return () => clearInterval(id);
//     } else { setCanResend(true); }
//   }, [timer]);

//   const handleChange = (idx, val) => {
//     const c = val.replace(/\D/g, "");
//     if (!c && val) return;
//     if (c.length > 1) return;
//     const next = [...otp];
//     next[idx] = c;
//     setOtp(next);
//     if (c && idx < 5) inputRefs.current[idx + 1]?.focus();
//   };

//   const handleKeyDown = (idx, e) => {
//     if (e.key === "Backspace") {
//       if (otp[idx]) {
//         const next = [...otp]; next[idx] = ""; setOtp(next);
//       } else if (idx > 0) { inputRefs.current[idx - 1]?.focus(); }
//     }
//     if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus();
//     if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus();
//   };

//   const handlePaste = (e) => {
//     e.preventDefault();
//     const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
//     if (!pasted) return;
//     const next = [...otp];
//     pasted.split("").forEach((ch, i) => { if (i < 6) next[i] = ch; });
//     setOtp(next);
//     inputRefs.current[Math.min(pasted.length, 5)]?.focus();
//   };

//   const handleResend = async () => {
//     if (!canResend) return;
//     setTimer(60);
//     setCanResend(false);
//     setOtp(["", "", "", "", "", ""]);
//     inputRefs.current[0]?.focus();

//     // CHANGED: resend needs phone (not email) — backend requires phone for register
//     // We re-call register with the same phone to trigger a new OTP SMS
//     // The backend handles the "already pending unverified user" case gracefully
//     const result = await dispatch(
//       registerUser({
//         name: name || "User",
//         // email is not available here — backend will find user by phone
//         // Pass a placeholder; backend finds existing unverified user by phone
//         email: `resend_${Date.now()}@placeholder.com`,
//         password: "__resend__",
//         phone,
//       })
//     );
//     if (registerUser.fulfilled.match(result)) toast.success("New OTP sent to your phone!");
//   };

//   const handleVerify = async () => {
//     const str = otp.join("");
//     if (str.length !== 6) { setLocalError("Please enter all 6 digits"); return; }

//     // CHANGED: send { phone, otp } instead of { email, otp }
//     const result = await dispatch(verifyOTP({ phone, otp: str }));
//     if (verifyOTP.fulfilled.match(result)) {
//       toast.success("Verified! Welcome aboard 🎉");
//       onVerify();
//     }
//   };

//   const isComplete = otp.join("").length === 6;

//   // Mask phone for display: show last 4 digits only e.g. ******6789
//   const maskedPhone = phone
//     ? `${"*".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`
//     : "";

//   return (
//     <>
//       <style>{`
//         @keyframes lr-slideInUp {
//           from { opacity: 0; transform: translateY(20px); }
//           to   { opacity: 1; transform: translateY(0); }
//         }
//       `}</style>

//       <div
//         className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md overflow-y-auto"
//         style={{ animation: "lr-slideInUp 0.3s cubic-bezier(0.32,0.72,0,1) both" }}
//       >
//         <div className="w-full sm:max-w-md my-0 sm:my-4 bg-[#0d0d0d] border-0 sm:border border-white/10 rounded-none sm:rounded-[2.5rem] shadow-2xl overflow-hidden p-6 sm:p-8 min-h-screen sm:min-h-0 flex flex-col">

//           <button
//             onClick={onClose}
//             className="flex items-center cursor-pointer gap-1 text-[#f7a221] hover:text-white font-bold text-[10px] tracking-widest transition-colors mb-6 sm:mb-8 uppercase self-start touch-manipulation"
//           >
//             <ChevronLeft size={16} /> Change Phone
//           </button>

//           {/* Icon + heading */}
//           <div className="flex flex-col items-center mb-6 sm:mb-8">
//             {/* CHANGED: Mail icon → Phone icon (OTP goes to phone now) */}
//             <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#f7a221]/10 flex items-center justify-center mb-4 border border-[#f7a221]/20 rotate-3">
//               <Phone className="text-[#f7a221] -rotate-3" size={28} />
//             </div>
//             <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter mb-2">
//               VERIFY <span className="text-[#f7a221]">OTP</span>
//             </h3>
//             {/* CHANGED: shows masked phone number, not email */}
//             <p className="text-white/35 text-[11px] text-center uppercase tracking-widest leading-relaxed max-w-xs">
//               6-digit code sent to{" "}
//               <span className="text-white lowercase tracking-normal font-bold break-all">
//                 {maskedPhone}
//               </span>
//             </p>
//           </div>

//           {/* OTP boxes */}
//           <div className="flex justify-between gap-1.5 sm:gap-2 mb-6 sm:mb-8" onPaste={handlePaste}>
//             {otp.map((digit, idx) => (
//               <input
//                 key={idx}
//                 ref={(el) => (inputRefs.current[idx] = el)}
//                 type="text"
//                 inputMode="numeric"
//                 pattern="[0-9]*"
//                 maxLength="1"
//                 value={digit}
//                 onChange={(e) => handleChange(idx, e.target.value)}
//                 onKeyDown={(e) => handleKeyDown(idx, e)}
//                 style={{ fontSize: "20px" }}
//                 className="flex-1 min-w-0 aspect-square bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl text-center text-white font-black focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/40 transition-all caret-transparent touch-manipulation"
//                 aria-label={`OTP digit ${idx + 1}`}
//               />
//             ))}
//           </div>

//           {/* Timer */}
//           <div className="flex items-center justify-center gap-2 text-white/30 mb-6 sm:mb-8">
//             <Clock size={13} className="shrink-0" />
//             <span className="text-[11px] font-bold tracking-widest">
//               {canResend ? (
//                 <button
//                   onClick={handleResend}
//                   className="text-[#f7a221] hover:underline uppercase cursor-pointer touch-manipulation"
//                 >
//                   RESEND CODE
//                 </button>
//               ) : (
//                 `RESEND IN ${timer}S`
//               )}
//             </span>
//           </div>

//           <button
//             onClick={handleVerify}
//             disabled={!isComplete || loading}
//             className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-30 text-black font-black py-4 rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 text-sm shadow-[0_8px_20px_rgba(247,162,33,0.25)] touch-manipulation select-none mt-auto sm:mt-0"
//           >
//             {loading ? <Loader2 className="animate-spin" size={20} /> : "VERIFY & CONTINUE"}
//           </button>
//         </div>
//       </div>
//     </>
//   );
// };

// export default OtpVerification;

// import React, { useState, useEffect, useRef } from "react";
// import { Mail, ChevronLeft, Clock, Loader2 } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { verifyOTP, registerUser, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// const OtpVerification = ({ email, name, onClose, onVerify }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);

//   const [otp, setOtp] = useState(["", "", "", "", "", ""]);
//   const [timer, setTimer] = useState(60);
//   const [canResend, setCanResend] = useState(false);
//   const [localError, setLocalError] = useState("");
//   const inputRefs = useRef([]);

//   useEffect(() => {
//     dispatch(clearError());
//     // Auto-focus first input on mount
//     setTimeout(() => inputRefs.current[0]?.focus(), 100);
//   }, [dispatch]);

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
//     if (timer > 0) {
//       const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
//       return () => clearInterval(interval);
//     } else {
//       setCanResend(true);
//     }
//   }, [timer]);

//   const handleOtpChange = (index, value) => {
//     // Allow only digits
//     const cleaned = value.replace(/\D/g, "");
//     if (!cleaned && value) return; // blocked non-digit
//     if (cleaned.length > 1) return;
//     const newOtp = [...otp];
//     newOtp[index] = cleaned;
//     setOtp(newOtp);
//     if (cleaned && index < 5) inputRefs.current[index + 1]?.focus();
//   };

//   const handleKeyDown = (index, e) => {
//     if (e.key === "Backspace") {
//       if (otp[index]) {
//         // Clear current
//         const newOtp = [...otp];
//         newOtp[index] = "";
//         setOtp(newOtp);
//       } else if (index > 0) {
//         inputRefs.current[index - 1]?.focus();
//       }
//     }
//     if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
//     if (e.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
//   };

//   const handleResend = async () => {
//     if (!canResend) return;
//     setTimer(60);
//     setCanResend(false);
//     setOtp(["", "", "", "", "", ""]);
//     inputRefs.current[0]?.focus();
//     const result = await dispatch(registerUser({ name: name || "User", email, password: "__resend__" }));
//     if (registerUser.fulfilled.match(result)) toast.success("New OTP sent!");
//   };

//   const handleVerify = async () => {
//     const otpString = otp.join("");
//     if (otpString.length !== 6) {
//       setLocalError("Please enter all 6 digits");
//       return;
//     }
//     const result = await dispatch(verifyOTP({ email, otp: otpString }));
//     if (verifyOTP.fulfilled.match(result)) {
//       toast.success("Verified! Welcome aboard 🎉");
//       onVerify();
//     }
//   };

//   const handlePaste = (e) => {
//     e.preventDefault();
//     const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
//     if (pasted.length > 0) {
//       const newOtp = [...otp];
//       pasted.split("").forEach((char, i) => {
//         if (i < 6) newOtp[i] = char;
//       });
//       setOtp(newOtp);
//       const nextIndex = Math.min(pasted.length, 5);
//       inputRefs.current[nextIndex]?.focus();
//     }
//   };

//   const isComplete = otp.join("").length === 6;

//   return (
//     // ✅ FIX 1: Rendered at top level from LogRegister — z-[200] ensures it's always on top
//     <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
//       <div className="w-full sm:max-w-md my-0 sm:my-4 bg-[#0d0d0d] border-0 sm:border border-white/10 rounded-none sm:rounded-[2.5rem] shadow-2xl overflow-hidden p-6 sm:p-8 min-h-screen sm:min-h-0 flex flex-col">

//         <button
//           onClick={onClose}
//           className="flex items-center cursor-pointer gap-1 text-[#f7a221] hover:text-white font-bold text-[10px] tracking-widest transition-all mb-6 sm:mb-8 uppercase self-start touch-manipulation"
//         >
//           <ChevronLeft size={16} /> Change Email
//         </button>

//         {/* Icon + Header */}
//         <div className="flex flex-col items-center mb-7 sm:mb-8">
//           <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#f7a221]/10 flex items-center justify-center mb-4 border border-[#f7a221]/20 rotate-3">
//             <Mail className="text-[#f7a221] -rotate-3" size={28} />
//           </div>
//           <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter mb-2">
//             VERIFY <span className="text-[#f7a221]">OTP</span>
//           </h3>
//           <p className="text-gray-500 text-[11px] text-center uppercase tracking-widest leading-relaxed max-w-xs">
//             6-digit code sent to{" "}
//             <span className="text-white lowercase tracking-normal font-bold break-all">{email}</span>
//           </p>
//         </div>

//         {/* Error */}
//         {(localError || error) && (
//           <div className="mb-5 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] text-center font-medium">
//             {localError || error}
//           </div>
//         )}

//         {/* OTP Inputs */}
//         <div
//           className="flex justify-between gap-1.5 sm:gap-2 mb-6 sm:mb-8"
//           onPaste={handlePaste}
//         >
//           {otp.map((digit, index) => (
//             <input
//               key={index}
//               ref={(el) => (inputRefs.current[index] = el)}
//               type="text"
//               inputMode="numeric"
//               pattern="[0-9]*"
//               maxLength="1"
//               value={digit}
//               onChange={(e) => handleOtpChange(index, e.target.value)}
//               onKeyDown={(e) => handleKeyDown(index, e)}
//               // ✅ Mobile: prevent zoom on focus (font-size >= 16px)
//               style={{ fontSize: "20px" }}
//               className="flex-1 min-w-0 aspect-square bg-white/[0.03] border border-white/10 rounded-xl sm:rounded-2xl text-center text-white font-black focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/40 transition-all caret-transparent touch-manipulation"
//               aria-label={`OTP digit ${index + 1}`}
//             />
//           ))}
//         </div>

//         {/* Timer / Resend */}
//         <div className="flex items-center justify-center gap-2 text-gray-500 mb-6 sm:mb-8">
//           <Clock size={14} className="shrink-0" />
//           <span className="text-[11px] font-bold tracking-widest">
//             {canResend ? (
//               <button
//                 onClick={handleResend}
//                 className="text-[#f7a221] hover:underline uppercase cursor-pointer touch-manipulation"
//               >
//                 RESEND CODE
//               </button>
//             ) : (
//               `RESEND IN ${timer}S`
//             )}
//           </span>
//         </div>

//         {/* Verify Button */}
//         <button
//           onClick={handleVerify}
//           disabled={!isComplete || loading}
//           className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-30 text-black font-black py-4 rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 text-sm shadow-[0_8px_20px_rgba(247,162,33,0.25)] touch-manipulation select-none mt-auto sm:mt-0"
//         >
//           {loading ? (
//             <Loader2 className="animate-spin" size={20} />
//           ) : (
//             "VERIFY & CONTINUE"
//           )}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default OtpVerification;

// import React, { useState, useEffect, useRef } from "react";
// import { Mail, ChevronLeft, Clock, Loader2 } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { verifyOTP, registerUser, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// const OtpVerification = ({ email, name, onClose, onVerify }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);

//   const [otp, setOtp] = useState(["", "", "", "", "", ""]);
//   const [timer, setTimer] = useState(60);
//   const [canResend, setCanResend] = useState(false);
//   const [localError, setLocalError] = useState("");
//   const inputRefs = useRef([]);

//   useEffect(() => { dispatch(clearError()); }, [dispatch]);

//   useEffect(() => {
//     if (error) { toast.error(error); dispatch(clearError()); }
//   }, [error, dispatch]);

//   useEffect(() => {
//     if (localError) { toast.error(localError); setLocalError(""); }
//   }, [localError]);

//   useEffect(() => {
//     if (timer > 0) {
//       const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
//       return () => clearInterval(interval);
//     } else { setCanResend(true); }
//   }, [timer]);

//   const handleOtpChange = (index, value) => {
//     if (value.length > 1) return;
//     const newOtp = [...otp];
//     newOtp[index] = value;
//     setOtp(newOtp);
//     if (value && index < 5) inputRefs.current[index + 1]?.focus();
//   };

//   const handleKeyDown = (index, e) => {
//     if (e.key === "Backspace" && !otp[index] && index > 0) {
//       inputRefs.current[index - 1]?.focus();
//     }
//   };

//   const handleResend = async () => {
//     if (!canResend) return;
//     setTimer(60);
//     setCanResend(false);
//     setOtp(["", "", "", "", "", ""]);
//     const result = await dispatch(registerUser({ name: name || "User", email, password: "__resend__" }));
//     if (registerUser.fulfilled.match(result)) toast.success("New OTP sent!");
//   };

//   const handleVerify = async () => {
//     const otpString = otp.join("");
//     if (otpString.length !== 6) {
//       setLocalError("Please enter 6 digits");
//       return;
//     }
//     const result = await dispatch(verifyOTP({ email, otp: otpString }));
//     if (verifyOTP.fulfilled.match(result)) {
//       toast.success("Verified!");
//       onVerify();
//     }
//   };

//   const handlePaste = (e) => {
//     const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
//     if (pasted.length === 6) {
//       setOtp(pasted.split(""));
//       inputRefs.current[5]?.focus();
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
//       <div className="w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
        
//         <button onClick={onClose} className="flex items-center cursor-pointer gap-1 text-[#f7a221] hover:text-white font-bold text-[10px] tracking-widest transition-all mb-8 uppercase">
//           <ChevronLeft size={16} /> Change Email
//         </button>

//         <div className="flex flex-col items-center mb-8">
//           <div className="w-20 h-20 rounded-3xl bg-[#f7a221]/10 flex items-center justify-center mb-4 border border-[#f7a221]/20 rotate-3">
//             <Mail className="text-[#f7a221] -rotate-3" size={32} />
//           </div>
//           <h3 className="text-3xl font-black text-white tracking-tighter mb-2">VERIFY <span className="text-[#f7a221]">OTP</span></h3>
//           <p className="text-gray-500 text-[11px] text-center uppercase tracking-widest leading-relaxed">
//             Sent to <span className="text-white lowercase tracking-normal font-bold">{email}</span>
//           </p>
//         </div>

//         {/* Small Error UI */}
//         {(localError || error) && (
//           <div className="mb-6 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[11px] text-center font-medium animate-pulse">
//             {localError || error}
//           </div>
//         )}

//         <div className="flex justify-between gap-2 mb-8" onPaste={handlePaste}>
//           {otp.map((digit, index) => (
//             <input
//               key={index}
//               ref={(el) => (inputRefs.current[index] = el)}
//               type="text" inputMode="numeric" maxLength="1" value={digit}
//               onChange={(e) => handleOtpChange(index, e.target.value)}
//               onKeyDown={(e) => handleKeyDown(index, e)}
//               className="w-[14%] aspect-square bg-white/[0.03] border border-white/10 rounded-2xl text-center text-white text-xl font-black focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//             />
//           ))}
//         </div>

//         <div className="flex items-center justify-center gap-2 text-gray-500 mb-8">
//           <Clock size={14} />
//           <span className="text-[11px] font-bold tracking-widest">
//             {canResend ? (
//               <button onClick={handleResend} className="text-[#f7a221] hover:underline uppercase">RESEND CODE</button>
//             ) : (
//               `WAIT ${timer}S`
//             )}
//           </span>
//         </div>

//         <button
//           onClick={handleVerify}
//           disabled={otp.join("").length !== 6 || loading}
//           className="w-full bg-[#f7a221] hover:bg-[#e0911c] disabled:opacity-30 text-black font-black py-4 rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 text-sm shadow-[0_10px_20px_rgba(247,162,33,0.2)]"
//         >
//           {loading ? <Loader2 className="animate-spin" size={20} /> : "VERIFY & CONTINUE"}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default OtpVerification;


// // components/USER_LOGIN_SEGMENT/OTPVerification.jsx
// import React, { useState, useEffect, useRef } from "react";
// import { Mail, ArrowLeft, Clock } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   verifyOTP,
//   registerUser,
//   clearError,
// } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";

// const OtpVerification = ({ email, name, onClose, onVerify }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);

//   const [otp, setOtp] = useState(["", "", "", "", "", ""]);
//   const [timer, setTimer] = useState(60);
//   const [canResend, setCanResend] = useState(false);
//   const [localError, setLocalError] = useState("");
//   const [resendSuccess, setResendSuccess] = useState(false);
//   const inputRefs = useRef([]);

//   // Clear redux errors on mount
//   useEffect(() => {
//     dispatch(clearError());
//   }, [dispatch]);

//   // Countdown timer
//   useEffect(() => {
//     if (timer > 0) {
//       const interval = setInterval(() => {
//         setTimer((prev) => prev - 1);
//       }, 1000);
//       return () => clearInterval(interval);
//     } else {
//       setCanResend(true);
//     }
//   }, [timer]);

//   const handleOtpChange = (index, value) => {
//     if (value.length > 1) return;
//     const newOtp = [...otp];
//     newOtp[index] = value;
//     setOtp(newOtp);
//     setLocalError("");
//     dispatch(clearError());

//     // Auto-focus next input
//     if (value && index < 5) {
//       inputRefs.current[index + 1]?.focus();
//     }
//   };

//   const handleKeyDown = (index, e) => {
//     if (e.key === "Backspace" && !otp[index] && index > 0) {
//       inputRefs.current[index - 1]?.focus();
//     }
//   };

//   // ✅ Resend OTP — re-triggers register API which resends OTP
//   const handleResend = async () => {
//     if (!canResend) return;

//     setTimer(60);
//     setCanResend(false);
//     setOtp(["", "", "", "", "", ""]);
//     setLocalError("");
//     dispatch(clearError());

//     // Re-call register with email to resend OTP (backend handles resend)
//     const result = await dispatch(
//       registerUser({ name: name || "User", email, password: "__resend__" })
//     );

//     if (registerUser.fulfilled.match(result)) {
//       setResendSuccess(true);
//       setTimeout(() => setResendSuccess(false), 3000);
//     }
//   };

//   // ✅ Verify OTP — dispatch verifyOTP thunk
//   const handleVerify = async () => {
//     const otpString = otp.join("");
//     if (otpString.length !== 6) {
//       setLocalError("Please enter the 6-digit OTP");
//       return;
//     }

//     setLocalError("");
//     const result = await dispatch(verifyOTP({ email, otp: otpString }));

//     if (verifyOTP.fulfilled.match(result)) {
//       onVerify(); // ✅ Success — close modal + proceed
//     }
//   };

//   // Handle paste
//   const handlePaste = (e) => {
//     e.preventDefault();
//     const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
//     if (pasted.length === 6) {
//       setOtp(pasted.split(""));
//       inputRefs.current[5]?.focus();
//     }
//   };

//   const displayError = localError || error;

//   return (
//     <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
//       <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden">
        
//         {/* Header */}
//         <div className="relative p-6 border-b border-white/10">
//           <button
//             onClick={onClose}
//             className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-white transition-colors"
//           >
//             <ArrowLeft size={20} />
//           </button>
//           <h3 className="text-xl font-black text-white text-center tracking-tighter">
//             VERIFY <span className="text-[#f7a221]">OTP</span>
//           </h3>
//         </div>

//         <div className="p-8">
//           {/* Email display */}
//           <div className="flex flex-col items-center mb-8">
//             <div className="w-16 h-16 rounded-full bg-[#f7a221]/10 flex items-center justify-center mb-4 border border-[#f7a221]/20">
//               <Mail className="text-[#f7a221]" size={28} />
//             </div>
//             <p className="text-gray-300 text-center mb-1">
//               {name && (
//                 <span className="text-white font-bold">Hi {name}, </span>
//               )}
//               We've sent a 6-digit code to
//             </p>
//             <p className="text-[#f7a221] font-bold text-lg break-all">{email}</p>
//           </div>

//           {/* Error */}
//           {displayError && (
//             <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
//               {displayError}
//             </div>
//           )}

//           {/* Resend success */}
//           {resendSuccess && (
//             <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm text-center">
//               OTP resent successfully!
//             </div>
//           )}

//           {/* OTP inputs */}
//           <div
//             className="flex justify-center gap-2 mb-6"
//             onPaste={handlePaste}
//           >
//             {otp.map((digit, index) => (
//               <input
//                 key={index}
//                 ref={(el) => (inputRefs.current[index] = el)}
//                 type="text"
//                 inputMode="numeric"
//                 maxLength="1"
//                 value={digit}
//                 onChange={(e) => handleOtpChange(index, e.target.value)}
//                 onKeyDown={(e) => handleKeyDown(index, e)}
//                 className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl text-center text-white text-xl font-bold focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                 autoFocus={index === 0}
//               />
//             ))}
//           </div>

//           {/* Timer / Resend */}
//           <div className="flex items-center justify-center gap-2 text-gray-500 mb-8">
//             <Clock size={16} />
//             <span className="text-sm">
//               {canResend ? (
//                 <button
//                   onClick={handleResend}
//                   className="text-[#f7a221] hover:underline font-medium"
//                 >
//                   Resend Code
//                 </button>
//               ) : (
//                 `Resend in 00:${timer.toString().padStart(2, "0")}`
//               )}
//             </span>
//           </div>

//           {/* Verify Button */}
//           <button
//             onClick={handleVerify}
//             disabled={otp.join("").length !== 6 || loading}
//             className={`w-full py-4 px-6 rounded-2xl font-black tracking-tight text-lg transition-all flex items-center justify-center gap-2 ${
//               otp.join("").length === 6 && !loading
//                 ? "bg-[#f7a221] hover:bg-[#e0911c] text-black"
//                 : "bg-white/5 text-gray-500 cursor-not-allowed"
//             }`}
//           >
//             {loading ? (
//               <span className="flex items-center gap-2">
//                 <svg
//                   className="animate-spin h-5 w-5"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                 >
//                   <circle
//                     className="opacity-25"
//                     cx="12"
//                     cy="12"
//                     r="10"
//                     stroke="currentColor"
//                     strokeWidth="4"
//                   />
//                   <path
//                     className="opacity-75"
//                     fill="currentColor"
//                     d="M4 12a8 8 0 018-8v8z"
//                   />
//                 </svg>
//                 Verifying...
//               </span>
//             ) : (
//               "VERIFY & CONTINUE"
//             )}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OtpVerification;

// // components/USER_LOGIN_SEGMENT/OtpVerification.jsx
// import React, { useState, useEffect, useRef } from 'react';
// import { Mail, ArrowLeft, Clock } from 'lucide-react';

// const OtpVerification = ({ email, name, onClose, onVerify }) => {
//     const [otp, setOtp] = useState(['', '', '', '', '', '']);
//     const [timer, setTimer] = useState(60);
//     const [canResend, setCanResend] = useState(false);
//     const [localError, setLocalError] = useState('');
//     const inputRefs = useRef([]);

//     useEffect(() => {
//         if (timer > 0) {
//             const interval = setInterval(() => {
//                 setTimer((prev) => prev - 1);
//             }, 1000);
//             return () => clearInterval(interval);
//         } else {
//             setCanResend(true);
//         }
//     }, [timer]);

//     const handleOtpChange = (index, value) => {
//         if (value.length > 1) return;
        
//         const newOtp = [...otp];
//         newOtp[index] = value;
//         setOtp(newOtp);

//         if (value && index < 5) {
//             inputRefs.current[index + 1]?.focus();
//         }
//     };

//     const handleKeyDown = (index, e) => {
//         if (e.key === 'Backspace' && !otp[index] && index > 0) {
//             inputRefs.current[index - 1]?.focus();
//         }
//     };

//     const handleResend = () => {
//         if (!canResend) return;
        
//         setTimer(60);
//         setCanResend(false);
//         setOtp(['', '', '', '', '', '']);
//         alert('OTP resent! (Demo)');
//     };

//     const handleVerify = () => {
//         const otpString = otp.join('');
//         if (otpString.length !== 6) {
//             setLocalError('Please enter 6-digit OTP');
//             return;
//         }

//         setLocalError('');
//         alert('OTP verified successfully! (Demo)');
//         onVerify();
//     };

//     return (
//         <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
//             <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden">
                
//                 <div className="relative p-6 border-b border-white/10">
//                     <button 
//                         onClick={onClose}
//                         className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-white transition-colors"
//                     >
//                         <ArrowLeft size={20} />
//                     </button>
//                     <h3 className="text-xl font-black text-white text-center tracking-tighter">
//                         VERIFY <span className="text-[#f7a221]">OTP</span>
//                     </h3>
//                 </div>

//                 <div className="p-8">
//                     <div className="flex flex-col items-center mb-8">
//                         <div className="w-16 h-16 rounded-full bg-[#f7a221]/10 flex items-center justify-center mb-4 border border-[#f7a221]/20">
//                             <Mail className="text-[#f7a221]" size={28} />
//                         </div>
                        
//                         <p className="text-gray-300 text-center mb-1">
//                             {name && <span className="text-white font-bold">Hi {name}, </span>}
//                             We've sent a 6-digit code to
//                         </p>
//                         <p className="text-[#f7a221] font-bold text-lg break-all">
//                             {email}
//                         </p>
//                     </div>

//                     {localError && (
//                         <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
//                             {localError}
//                         </div>
//                     )}

//                     <div className="flex justify-center gap-2 mb-6">
//                         {otp.map((digit, index) => (
//                             <input
//                                 key={index}
//                                 ref={(el) => (inputRefs.current[index] = el)}
//                                 type="text"
//                                 maxLength="1"
//                                 value={digit}
//                                 onChange={(e) => handleOtpChange(index, e.target.value)}
//                                 onKeyDown={(e) => handleKeyDown(index, e)}
//                                 className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl text-center text-white text-xl font-bold focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                                 autoFocus={index === 0}
//                             />
//                         ))}
//                     </div>

//                     <div className="flex items-center justify-center gap-2 text-gray-500 mb-8">
//                         <Clock size={16} />
//                         <span className="text-sm">
//                             {canResend ? (
//                                 <button 
//                                     onClick={handleResend}
//                                     className="text-[#f7a221] hover:underline font-medium"
//                                 >
//                                     Resend Code
//                                 </button>
//                             ) : (
//                                 `Resend in 00:${timer.toString().padStart(2, '0')}`
//                             )}
//                         </span>
//                     </div>

//                     <button
//                         onClick={handleVerify}
//                         disabled={otp.join('').length !== 6}
//                         className={`w-full py-4 px-6 rounded-2xl font-black tracking-tight text-lg transition-all ${
//                             otp.join('').length === 6
//                                 ? 'bg-[#f7a221] hover:bg-[#e0911c] text-black'
//                                 : 'bg-white/5 text-gray-500 cursor-not-allowed'
//                         }`}
//                     >
//                         VERIFY & CONTINUE
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default OtpVerification;