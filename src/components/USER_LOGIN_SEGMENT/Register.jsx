
import React, { useState, useEffect, useRef } from "react";
import { Phone, Mail, User, Lock } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { registerUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
import { GoogleIcon } from "./Login";
import LOGO from "../../assets/logo2.svg";

const Register = ({ onRegisterSuccess, onLoginClick, onShowOtp }) => {
  const dispatch = useDispatch();
  const { loading, error, pendingPhone } = useSelector((state) => state.auth);
  const googleBtnRef = useRef(null);

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [password, setPassword] = useState("");

  // Show error toast — then immediately clear so the same error doesn't
  // re-trigger on the next mount (e.g. user closes & reopens the modal).
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // ── Google OAuth ───────────────────────────────────────────────
  const handleGoogleClick = () => {
    if (googleBtnRef.current) {
      const el = googleBtnRef.current.querySelector('div[role="button"]');
      if (el) el.click();
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
            toast.success("Welcome to the Club!");
            onRegisterSuccess();
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, { theme: "outline", size: "large" });
    };
    if (!window.google) {
      const s    = document.createElement("script");
      s.src      = "https://accounts.google.com/gsi/client";
      s.async    = true;
      s.onload   = init;
      document.body.appendChild(s);
    } else { init(); }
  }, [dispatch, onRegisterSuccess]);
  // ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side phone validation — matches backend /^[0-9]{10}$/
    const cleanPhone = phone.trim();
    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    try {
      const result = await dispatch(
        registerUser({ name, email, password, phone: cleanPhone })
      ).unwrap();

      if (result) {
        // Backend message reflects the configured OTP_DELIVERY_MODE
        // (e.g. "OTP sent to your email" / "phone" / "phone and email").
        toast.success(result.message || "OTP sent!");
        // pendingPhone from Redux is source of truth; fall back to local state.
        // Email is forwarded so the OTP screen's "resend" can deliver to the
        // real address when OTP_DELIVERY_MODE=email.
        onShowOtp(pendingPhone || cleanPhone, name, email);
      }
    } catch (_) {
      // Error shown via Redux error state + useEffect toast above
    }
  };

  return (
    <div className="w-full">
      {/* Hidden Google button mount point */}
      <div ref={googleBtnRef} style={{ display: "none" }} />

      {/*
        FIX: h-24 md:h-32 — valid Tailwind classes.
        h-25 does not exist in Tailwind's scale and generated no CSS.
      */}
      <div className="flex justify-center mb-3 sm:mb-5">
        <img
          src={LOGO}
          alt="OfferWale Baba"
          className="h-14 sm:h-24 md:h-28 w-auto object-contain rounded"
        />
      </div>

      <h2 className="text-xl sm:text-2xl text-center text-white mb-1 tracking-tighter font-black">
        JOIN THE <span className="text-[#f7a221]">CLUB</span>
      </h2>
      <p className="text-gray-200 text-center text-[10px] tracking-widest uppercase mb-3 sm:mb-5">
        Exclusive deals await
      </p>

      {error && (
        <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] text-center font-medium">
          {error}
        </div>
      )}

      <div className="lr-slide-up">
        {/* Google Sign-up */}
        <button
          onClick={handleGoogleClick}
          className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-black cursor-pointer font-bold py-2.5 sm:py-3 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 mb-2 sm:mb-3 shadow-md active:scale-[0.98] touch-manipulation select-none"
        >
          <GoogleIcon />
          <span className="text-sm">Sign up with Google</span>
        </button>

        {/* OR divider */}
        <div className="relative my-2 sm:my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/25" />
          </div>
          <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em]">
            <span className="px-4 bg-[#0d0d0d] text-gray-200">OR REGISTER WITH DETAILS</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
          {/* Full Name */}
          <div className="relative">
            <User
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
              size={17}
            />
            {/*
              FIX: text-base (16px) everywhere on inputs.
              Single source of truth — no text-sm competing with inline fontSize.
            */}
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 sm:py-3 pl-11 pr-4 text-white text-base placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 transition-all"
              required
            />
          </div>

          {/* Email */}
          <div className="relative">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
              size={17}
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 sm:py-3 pl-11 pr-4 text-white text-base placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 transition-all"
              required
            />
          </div>

          {/*
            Phone — REQUIRED.
            Backend validates /^[0-9]{10}$/ — exactly 10 digits.
            OTP is sent to this number via SMS.
            Input strips non-digits and caps at 10 characters client-side.
          */}
          <div className="relative">
            <Phone
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
              size={17}
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
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 sm:py-3 pl-11 pr-4 text-white text-base placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 transition-all"
              required
              minLength={10}
              maxLength={10}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
              size={17}
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 sm:py-3 pl-11 pr-4 text-white text-base placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 transition-all"
              required
              minLength="6"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-50 text-black font-black py-3 sm:py-3.5 rounded-xl cursor-pointer transition-all shadow-[0_8px_20px_rgba(247,162,33,0.25)] text-sm uppercase touch-manipulation select-none"
          >
            {loading ? "SENDING OTP..." : "REGISTER"}
          </button>
        </form>

        <p className="text-center text-gray-200 text-[11px] mt-3 sm:mt-4 tracking-wide">
          Already a member?{" "}
          <button
            onClick={onLoginClick}
            className="text-[#f7a221] text-[15px] hover:underline cursor-pointer touch-manipulation"
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
// try to make it responsive 

// import React, { useState, useEffect, useRef } from "react";
// import { Phone, Mail, User, Lock } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { registerUser, googleLogin } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
// import { GoogleIcon } from "./Login";
// import LOGO from "../../assets/logo2.svg";

// const Register = ({ onRegisterSuccess, onLoginClick, onShowOtp }) => {
//   const dispatch = useDispatch();
//   const { loading, error, pendingPhone } = useSelector((state) => state.auth);
//   // CHANGED: pendingEmail → pendingPhone (OTP is now sent to phone)
//   const googleBtnRef = useRef(null);

//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   // CHANGED: phone is now REQUIRED by backend (10-digit validation server-side)
//   const [phone, setPhone] = useState("");
//   const [password, setPassword] = useState("");

//   useEffect(() => {
//     if (error) toast.error(error);
//   }, [error]);

//   const handleGoogleClick = () => {
//     if (googleBtnRef.current) {
//       const el = googleBtnRef.current.querySelector('div[role="button"]');
//       if (el) el.click();
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
//             toast.success("Welcome to the Club!");
//             onRegisterSuccess();
//           }
//         },
//       });
//       window.google.accounts.id.renderButton(googleBtnRef.current, {
//         theme: "outline",
//         size: "large",
//       });
//     };
//     if (!window.google) {
//       const s = document.createElement("script");
//       s.src = "https://accounts.google.com/gsi/client";
//       s.async = true;
//       s.onload = init;
//       document.body.appendChild(s);
//     } else {
//       init();
//     }
//   }, [dispatch, onRegisterSuccess]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     // Client-side phone validation to match backend's /^[0-9]{10}$/ rule
//     // Give a clear error before even hitting the server
//     const cleanPhone = phone.trim();
//     if (!/^[0-9]{10}$/.test(cleanPhone)) {
//       toast.error("Phone number must be exactly 10 digits");
//       return;
//     }

//     try {
//       const result = await dispatch(
//         registerUser({ name, email, password, phone: cleanPhone })
//       ).unwrap();

//       if (result) {
//         toast.success("OTP sent to your phone!");
//         // CHANGED: pass phone (not email) to OTP modal
//         // Backend sends OTP to phone, so OtpVerification needs phone
//         // pendingPhone from Redux is the source of truth; fall back to local state
//         onShowOtp(pendingPhone || cleanPhone, name);
//       }
//     } catch (_) {
//       // Error handled by the useEffect above via Redux state
//     }
//   };

//   return (
//     <div className="w-full">
//       <div ref={googleBtnRef} style={{ display: "none" }} />

//       {/* ── Logo Container (Top Center) ── */}
//      <div className="flex justify-center mb-5">
//   <img src={LOGO} alt="Logo" className="h-25 md:h-32 w-auto object-contain rounded" />
// </div>

//       <h2 className="text-2xl sm:text-2xl text-center font- text-white mb-1 tracking-tighter">
//         JOIN THE <span className="text-[#f7a221]">CLUB</span>
//       </h2>
//       <p className="text-gray-200 text-center text-[10px] tracking-widest uppercase mb-5">
//         Exclusive deals await
//       </p>

//       {error && (
//         <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] text-center font-medium">
//           {error}
//         </div>
//       )}

//       <div className="lr-slide-up">
//         <button
//           onClick={handleGoogleClick}
//           className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-black cursor-pointer font-bold py-3 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 mb-3 shadow-md active:scale-[0.98] touch-manipulation select-none"
//         >
//           <GoogleIcon />
//           <span className="text-sm">Sign up with Google</span>
//         </button>

//         <div className="relative my-4">
//           <div className="absolute inset-0 flex items-center">
//             <div className="w-full border-t border-white/25" />
//           </div>
//           <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-">
//             <span className="px-4 bg-[#0d0d0d] text-gray-200">OR REGISTER WITH DETAILS</span>
//           </div>
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-3">
//           <div className="relative">
//             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="text"
//               placeholder="Full Name"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               autoComplete="name"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//             />
//           </div>

//           <div className="relative">
//             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="email"
//               placeholder="Email Address"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               autoComplete="email"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//             />
//           </div>

//           {/*
//             CHANGED: phone is now REQUIRED (was optional before).
//             Backend validates: /^[0-9]{10}$/ — exactly 10 digits, no spaces or dashes.
//             OTP will be sent to this phone number via SMS.
//           */}
//           <div className="relative">
//             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="tel"
//               placeholder="Phone Number (10 digits)"
//               value={phone}
//               onChange={(e) => {
//                 // Only allow digits, max 10
//                 const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
//                 setPhone(digits);
//               }}
//               autoComplete="tel"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//               minLength={10}
//               maxLength={10}
//             />
//           </div>

//           <div className="relative">
//             <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="password"
//               placeholder="Password (min 6 chars)"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               autoComplete="new-password"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//               minLength="6"
//             />
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-50 text-black font-black py-3.5 rounded-xl cursor-pointer transition-all shadow-[0_8px_20px_rgba(247,162,33,0.25)] text-sm uppercase touch-manipulation select-none"
//           >
//             {loading ? "SENDING OTP..." : "REGISTER"}
//           </button>
//         </form>

//         <p className="text-center text-gray-200 text-[11px] mt-4 tracking-wide">
//           Already a member?{" "}
//           <button
//             onClick={onLoginClick}
//             className="text-[#f7a221] text-[15px] font- hover:underline cursor-pointer touch-manipulation"
//           >
//             Login here
//           </button>
//         </p>
//       </div>
//     </div>
//   );
// };

// export default Register;
// upper code have logo

// import React, { useState, useEffect, useRef } from "react";
// import { Phone, Mail, User, Lock } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { registerUser, googleLogin } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
// import { GoogleIcon } from "./Login";

// const Register = ({ onRegisterSuccess, onLoginClick, onShowOtp }) => {
//   const dispatch = useDispatch();
//   const { loading, error, pendingPhone } = useSelector((state) => state.auth);
//   // CHANGED: pendingEmail → pendingPhone (OTP is now sent to phone)
//   const googleBtnRef = useRef(null);

//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   // CHANGED: phone is now REQUIRED by backend (10-digit validation server-side)
//   const [phone, setPhone] = useState("");
//   const [password, setPassword] = useState("");

//   useEffect(() => {
//     if (error) toast.error(error);
//   }, [error]);

//   const handleGoogleClick = () => {
//     if (googleBtnRef.current) {
//       const el = googleBtnRef.current.querySelector('div[role="button"]');
//       if (el) el.click();
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
//             toast.success("Welcome to the Club!");
//             onRegisterSuccess();
//           }
//         },
//       });
//       window.google.accounts.id.renderButton(googleBtnRef.current, {
//         theme: "outline",
//         size: "large",
//       });
//     };
//     if (!window.google) {
//       const s = document.createElement("script");
//       s.src = "https://accounts.google.com/gsi/client";
//       s.async = true;
//       s.onload = init;
//       document.body.appendChild(s);
//     } else {
//       init();
//     }
//   }, [dispatch, onRegisterSuccess]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     // Client-side phone validation to match backend's /^[0-9]{10}$/ rule
//     // Give a clear error before even hitting the server
//     const cleanPhone = phone.trim();
//     if (!/^[0-9]{10}$/.test(cleanPhone)) {
//       toast.error("Phone number must be exactly 10 digits");
//       return;
//     }

//     try {
//       const result = await dispatch(
//         registerUser({ name, email, password, phone: cleanPhone })
//       ).unwrap();

//       if (result) {
//         toast.success("OTP sent to your phone!");
//         // CHANGED: pass phone (not email) to OTP modal
//         // Backend sends OTP to phone, so OtpVerification needs phone
//         // pendingPhone from Redux is the source of truth; fall back to local state
//         onShowOtp(pendingPhone || cleanPhone, name);
//       }
//     } catch (_) {
//       // Error handled by the useEffect above via Redux state
//     }
//   };

//   return (
//     <div className="w-full">
//       <div ref={googleBtnRef} style={{ display: "none" }} />

//       <h2 className="text-3xl sm:text-4xl text-center font- text-white mb-1 tracking-tighter">
//         JOIN THE <span className="text-[#f7a221]">CLUB</span>
//       </h2>
//       <p className="text-gray-200 text-center text-[10px] tracking-widest uppercase mb-5">
//         Exclusive deals await
//       </p>

//       {error && (
//         <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] text-center font-medium">
//           {error}
//         </div>
//       )}

//       <div className="lr-slide-up">
//         <button
//           onClick={handleGoogleClick}
//           className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-black cursor-pointer font-bold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 mb-3 shadow-md active:scale-[0.98] touch-manipulation select-none"
//         >
//           <GoogleIcon />
//           <span className="text-sm">Sign up with Google</span>
//         </button>

//         <div className="relative my-5">
//           <div className="absolute inset-0 flex items-center">
//             <div className="w-full border-t border-white/25" />
//           </div>
//           <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-">
//             <span className="px-4 bg-[#0d0d0d] text-gray-200">OR REGISTER WITH DETAILS</span>
//           </div>
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-3.5">
//           <div className="relative">
//             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="text"
//               placeholder="Full Name"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               autoComplete="name"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//             />
//           </div>

//           <div className="relative">
//             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="email"
//               placeholder="Email Address"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               autoComplete="email"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//             />
//           </div>

//           {/*
//             CHANGED: phone is now REQUIRED (was optional before).
//             Backend validates: /^[0-9]{10}$/ — exactly 10 digits, no spaces or dashes.
//             OTP will be sent to this phone number via SMS.
//           */}
//           <div className="relative">
//             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="tel"
//               placeholder="Phone Number (10 digits)"
//               value={phone}
//               onChange={(e) => {
//                 // Only allow digits, max 10
//                 const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
//                 setPhone(digits);
//               }}
//               autoComplete="tel"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//               minLength={10}
//               maxLength={10}
//             />
//           </div>

//           <div className="relative">
//             <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="password"
//               placeholder="Password (min 6 chars)"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               autoComplete="new-password"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//               minLength="6"
//             />
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-50 text-black font-black py-4 rounded-xl cursor-pointer transition-all shadow-[0_8px_20px_rgba(247,162,33,0.25)] text-sm uppercase touch-manipulation select-none"
//           >
//             {loading ? "SENDING OTP..." : "REGISTER"}
//           </button>
//         </form>

//         <p className="text-center text-gray-200 text-[11px] mt-5 tracking-wide">
//           Already a member?{" "}
//           <button
//             onClick={onLoginClick}
//             className="text-[#f7a221] text-[15px] font- hover:underline cursor-pointer touch-manipulation"
//           >
//             Login here
//           </button>
//         </p>
//       </div>
//     </div>
//   );
// };

// export default Register;
// need to change the ui name email phone pass 
// import React, { useState, useEffect, useRef } from "react";
// import { Phone, Mail, User, ArrowRight, Lock, ChevronLeft } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { registerUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
// import { GoogleIcon } from "./Login";

// /*
//   SUB-VIEW SLIDE ANIMATION
//   ─────────────────────────
//   Each sub-view (default → email form → phone form) gets a unique `key`.
//   When the key changes React unmounts the old element and mounts the new
//   one, triggering the CSS animation class fresh every time.
//   No Tailwind plugin needed — we rely on the @keyframes injected in LogRegister.
// */

// const Register = ({ onRegisterSuccess, onLoginClick, onShowOtp }) => {
//   const dispatch = useDispatch();
//   const { loading, error, pendingEmail } = useSelector((state) => state.auth);
//   const googleBtnRef = useRef(null);

//   // "default" | "email" | "phone"
//   const [view, setView] = useState("default");

//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   useEffect(() => {
//     if (error) toast.error(error);
//   }, [error]);

//   const handleGoogleClick = () => {
//     if (googleBtnRef.current) {
//       const el = googleBtnRef.current.querySelector('div[role="button"]');
//       if (el) el.click();
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
//             toast.success("Welcome to the Club!");
//             onRegisterSuccess();
//           }
//         },
//       });
//       window.google.accounts.id.renderButton(googleBtnRef.current, {
//         theme: "outline", size: "large",
//       });
//     };
//     if (!window.google) {
//       const s = document.createElement("script");
//       s.src = "https://accounts.google.com/gsi/client";
//       s.async = true;
//       s.onload = init;
//       document.body.appendChild(s);
//     } else { init(); }
//   }, [dispatch, onRegisterSuccess]);

//   const handleEmailSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const result = await dispatch(
//         registerUser({ name, email, password, phone: phone || undefined })
//       ).unwrap();
//       if (result) {
//         toast.success("OTP Dispatched!");
//         onShowOtp(pendingEmail || email, name);
//       }
//     } catch (_) {}
//   };

//   const goBack = () => {
//     setView("default");
//     dispatch(clearError());
//   };

//   const goEmail = () => setView("email");
//   const goPhone = () => setView("phone");

//   // Header is always the same — only the body animates
//   return (
//     <div className="w-full">
//       <div ref={googleBtnRef} style={{ display: "none" }} />

//       {/* Back button — only when in sub-view */}
//       {view !== "default" && (
//         <button
//           onClick={goBack}
//           className="flex items-center gap-1 text-[#f7a221] hover:text-white font-bold text-[11px] tracking-widest transition-colors mb-4 cursor-pointer touch-manipulation lr-slide-left"
//         >
//           <ChevronLeft size={16} /> BACK
//         </button>
//       )}

//       <h2 className="text-3xl sm:text-4xl text-center font-black text-white mb-1 tracking-tighter">
//         JOIN THE <span className="text-[#f7a221]">CLUB</span>
//       </h2>
//       <p className="text-white/40 text-center text-[10px] tracking-widest uppercase mb-5">
//         Exclusive deals await
//       </p>

//       {error && (
//         <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] text-center font-medium">
//           {error}
//         </div>
//       )}

//       {/* ── Default view — slide in from left when returning ── */}
//       {view === "default" && (
//         <div key="reg-default" className="lr-slide-up">
//           <button
//             onClick={handleGoogleClick}
//             className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-black cursor-pointer font-bold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 mb-3 shadow-md active:scale-[0.98] touch-manipulation select-none"
//           >
//             <GoogleIcon />
//             <span className="text-sm">Sign up with Google</span>
//           </button>

//           <div className="relative my-5">
//             <div className="absolute inset-0 flex items-center">
//               <div className="w-full border-t border-white/5" />
//             </div>
//             <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-bold">
//               <span className="px-4 bg-[#0d0d0d] text-white/25">OR REGISTER WITH</span>
//             </div>
//           </div>

//           <button
//             onClick={goEmail}
//             className="w-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white cursor-pointer font-medium py-4 px-4 rounded-2xl flex items-center gap-3 mb-3 text-sm transition-all group active:scale-[0.98] touch-manipulation select-none"
//           >
//             <Mail size={17} className="text-[#f7a221] shrink-0" />
//             <span>Email Address</span>
//             <ArrowRight size={16} className="ml-auto text-white/20 group-hover:translate-x-1 group-hover:text-[#f7a221] transition-all" />
//           </button>

//           <button
//             onClick={goPhone}
//             className="w-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white cursor-pointer font-medium py-4 px-4 rounded-2xl flex items-center gap-3 text-sm transition-all group active:scale-[0.98] touch-manipulation select-none"
//           >
//             <Phone size={17} className="text-[#f7a221] shrink-0" />
//             <span>Phone Number</span>
//             <ArrowRight size={16} className="ml-auto text-white/20 group-hover:translate-x-1 group-hover:text-[#f7a221] transition-all" />
//           </button>

//           <p className="text-center text-white/25 text-[11px] mt-5 tracking-wide">
//             Already a member?{" "}
//             <button
//               onClick={onLoginClick}
//               className="text-[#f7a221] font-bold hover:underline cursor-pointer touch-manipulation"
//             >
//               Login here
//             </button>
//           </p>
//         </div>
//       )}

//       {/* ── Email form — slides in from right ── */}
//       {view === "email" && (
//         <form
//           key="reg-email"
//           onSubmit={handleEmailSubmit}
//           className="space-y-3.5 lr-slide-right"
//         >
//           <div className="relative">
//             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="text"
//               placeholder="Full Name"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               autoComplete="name"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//             />
//           </div>
//           <div className="relative">
//             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="email"
//               placeholder="Email Address"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               autoComplete="email"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//             />
//           </div>
//           <div className="relative">
//             <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="password"
//               placeholder="Password (min 6 chars)"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               autoComplete="new-password"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//               minLength="6"
//             />
//           </div>
//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-50 text-black font-black py-4 rounded-xl cursor-pointer transition-all shadow-[0_8px_20px_rgba(247,162,33,0.25)] text-sm uppercase touch-manipulation select-none"
//           >
//             {loading ? "SENDING OTP..." : "GET STARTED"}
//           </button>
//         </form>
//       )}

//       {/* ── Phone form — slides in from right ── */}
//       {view === "phone" && (
//         <form
//           key="reg-phone"
//           onSubmit={(e) => { e.preventDefault(); toast.info("Phone registration coming soon!"); }}
//           className="space-y-3.5 lr-slide-right"
//         >
//           <div className="relative">
//             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="text"
//               placeholder="Full Name"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               autoComplete="name"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//             />
//           </div>
//           <div className="relative">
//             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={17} />
//             <input
//               type="tel"
//               placeholder="Phone Number"
//               value={phone}
//               onChange={(e) => setPhone(e.target.value)}
//               autoComplete="tel"
//               className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               style={{ fontSize: "16px" }}
//               required
//             />
//           </div>
//           <button
//             type="submit"
//             className="w-full cursor-pointer bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] text-black font-black py-4 rounded-xl transition-all shadow-[0_8px_20px_rgba(247,162,33,0.25)] text-sm uppercase touch-manipulation"
//           >
//             SEND OTP
//           </button>
//         </form>
//       )}
//     </div>
//   );
// };

// export default Register;

// import React, { useState, useEffect, useRef } from "react";
// import { Phone, Mail, User, ArrowRight, Lock, ChevronLeft } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { registerUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
// import { GoogleIcon } from "./Login"; // ✅ FIX 2: Shared icon for visual consistency

// const Register = ({ onRegisterSuccess, onLoginClick, onShowOtp }) => {
//   const dispatch = useDispatch();
//   const { loading, error, pendingEmail } = useSelector((state) => state.auth);
//   const googleBtnRef = useRef(null);

//   const [showEmailForm, setShowEmailForm] = useState(false);
//   const [showPhoneForm, setShowPhoneForm] = useState(false);

//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

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
//               toast.success("Welcome to the Club!");
//               onRegisterSuccess();
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
//   }, [dispatch, onRegisterSuccess]);

//   const handleEmailSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const result = await dispatch(
//         registerUser({ name, email, password, phone: phone || undefined })
//       ).unwrap();
//       if (result) {
//         toast.success("OTP Dispatched!");
//         // ✅ FIX 1: Notify parent (LogRegister) to show OTP — no local modal
//         onShowOtp(pendingEmail || email, name);
//       }
//     } catch (err) {}
//   };

//   const handleGoBack = () => {
//     setShowEmailForm(false);
//     setShowPhoneForm(false);
//     dispatch(clearError());
//   };

//   return (
//     <div className="w-full">
//       {/* Hidden Google button */}
//       <div ref={googleBtnRef} style={{ display: "none" }} />

//       <div className="relative mb-5 sm:mb-6">
//         {(showEmailForm || showPhoneForm) && (
//           <button
//             onClick={handleGoBack}
//             className="flex items-center gap-1 text-[#f7a221] hover:text-white font-bold text-[11px] tracking-widest transition-all mb-4 cursor-pointer touch-manipulation"
//           >
//             <ChevronLeft size={16} /> BACK
//           </button>
//         )}

//         <h2 className="text-3xl sm:text-4xl text-center font-black text-white mb-1 tracking-tighter">
//           JOIN THE <span className="text-[#f7a221]">CLUB</span>
//         </h2>
//         <p className="text-gray-400 text-center text-[10px] tracking-widest uppercase">
//           Exclusive deals await
//         </p>
//       </div>

//       {error && (
//         <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] text-center font-medium">
//           {error}
//         </div>
//       )}

//       {!showEmailForm && !showPhoneForm ? (
//         <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
//           {/* ✅ FIX 2: Exact same Google button as Login */}
//           <button
//             onClick={handleGoogleClick}
//             className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-black cursor-pointer font-semibold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 mb-3 shadow-md active:scale-[0.98] touch-manipulation select-none"
//           >
//             <GoogleIcon />
//             <span className="text-sm font-bold">Sign up with Google</span>
//           </button>

//           <div className="relative my-5 sm:my-6">
//             <div className="absolute inset-0 flex items-center">
//               <div className="w-full border-t border-white/5" />
//             </div>
//             <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-bold">
//               <span className="px-4 bg-[#0d0d0d] text-gray-600">OR REGISTER WITH</span>
//             </div>
//           </div>

//           <button
//             onClick={() => setShowEmailForm(true)}
//             className="w-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white cursor-pointer font-medium py-4 px-4 rounded-2xl flex items-center gap-3 mb-3 text-sm transition-all group active:scale-[0.98] touch-manipulation select-none"
//           >
//             <Mail size={17} className="text-[#f7a221] shrink-0" />
//             <span>Email Address</span>
//             <ArrowRight size={16} className="ml-auto text-gray-500 group-hover:translate-x-1 group-hover:text-[#f7a221] transition-all" />
//           </button>

//           <button
//             onClick={() => setShowPhoneForm(true)}
//             className="w-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white cursor-pointer font-medium py-4 px-4 rounded-2xl flex items-center gap-3 text-sm transition-all group active:scale-[0.98] touch-manipulation select-none"
//           >
//             <Phone size={17} className="text-[#f7a221] shrink-0" />
//             <span>Phone Number</span>
//             <ArrowRight size={16} className="ml-auto text-gray-500 group-hover:translate-x-1 group-hover:text-[#f7a221] transition-all" />
//           </button>

//           <p className="text-center text-gray-600 text-[11px] mt-5 tracking-wide">
//             Already a member?{" "}
//             <button
//               onClick={onLoginClick}
//               className="text-[#f7a221] font-bold hover:underline cursor-pointer touch-manipulation"
//             >
//               Login here
//             </button>
//           </p>
//         </div>
//       ) : showPhoneForm ? (
//         <form
//           onSubmit={(e) => {
//             e.preventDefault();
//             toast.info("Phone registration coming soon!");
//           }}
//           className="space-y-3.5 animate-in fade-in slide-in-from-right-4 duration-500"
//         >
//           <div className="relative">
//             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={17} />
//             <input
//               type="text"
//               placeholder="Full Name"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               autoComplete="name"
//               className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               required
//             />
//           </div>
//           <div className="relative">
//             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={17} />
//             <input
//               type="tel"
//               placeholder="Phone Number"
//               value={phone}
//               onChange={(e) => setPhone(e.target.value)}
//               autoComplete="tel"
//               className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               required
//             />
//           </div>
//           <button
//             type="submit"
//             className="w-full cursor-pointer bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] text-black font-black py-4 rounded-xl transition-all shadow-[0_8px_20px_rgba(247,162,33,0.25)] text-sm uppercase touch-manipulation"
//           >
//             SEND OTP
//           </button>
//         </form>
//       ) : (
//         <form
//           onSubmit={handleEmailSubmit}
//           className="space-y-3.5 animate-in fade-in slide-in-from-right-4 duration-500"
//         >
//           <div className="relative">
//             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={17} />
//             <input
//               type="text"
//               placeholder="Full Name"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               autoComplete="name"
//               className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               required
//             />
//           </div>
//           <div className="relative">
//             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={17} />
//             <input
//               type="email"
//               placeholder="Email Address"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               autoComplete="email"
//               className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               required
//             />
//           </div>
//           <div className="relative">
//             <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={17} />
//             <input
//               type="password"
//               placeholder="Password (min 6 chars)"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               autoComplete="new-password"
//               className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221]/30 text-sm transition-all"
//               required
//               minLength="6"
//             />
//           </div>
//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-[#f7a221] hover:bg-[#e0911c] active:bg-[#c97e18] disabled:opacity-50 text-black font-black py-4 rounded-xl cursor-pointer transition-all shadow-[0_8px_20px_rgba(247,162,33,0.25)] text-sm uppercase touch-manipulation select-none"
//           >
//             {loading ? "SENDING OTP..." : "GET STARTED"}
//           </button>
//         </form>
//       )}
//     </div>
//   );
// };

// export default Register;

// import React, { useState, useEffect, useRef } from "react";
// import { Phone, Mail, User, ArrowRight, Lock, ChevronLeft } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { registerUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
// import OtpVerification from "./OTPVerification";

// const Register = ({ onRegisterSuccess, onLoginClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error, pendingEmail } = useSelector((state) => state.auth);
//   const googleBtnRef = useRef(null); // ✅ Reference for the hidden official button

//   const [showEmailForm, setShowEmailForm] = useState(false);
//   const [showPhoneForm, setShowPhoneForm] = useState(false);
//   const [showOtpModal, setShowOtpModal] = useState(false);

//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   useEffect(() => {
//     if (error) {
//       toast.error(error);
//     }
//   }, [error]);

//   // ✅ FIXED: Logic to trigger the hidden official button for centered popup
//   const handleGoogleClick = () => {
//     if (googleBtnRef.current) {
//       const googleDiv = googleBtnRef.current.querySelector('div[role="button"]');
//       if (googleDiv) {
//         googleDiv.click();
//       } else {
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
//           use_fedcm_for_prompt: true, // ✅ Fixes the FedCM warning
//           callback: async (response) => {
//             const result = await dispatch(googleLogin({ idToken: response.credential }));
//             if (googleLogin.fulfilled.match(result)) {
//               toast.success("Welcome to the Club!");
//               onRegisterSuccess();
//             }
//           },
//         });

//         // ✅ Render real button into hidden container to prepare popup context
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
//     } else { initializeGoogle(); }
//   }, [dispatch, onRegisterSuccess]);

//   const handleEmailSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const result = await dispatch(registerUser({ name, email, password, phone: phone || undefined })).unwrap();
//       if (result) {
//         toast.success("OTP Dispatched!");
//         setShowOtpModal(true);
//       }
//     } catch (err) {}
//   };

//   const handleGoBack = () => {
//     setShowEmailForm(false);
//     setShowPhoneForm(false);
//     dispatch(clearError());
//   };

//   return (
//     <div className="w-full">
//       {/* HIDDEN GOOGLE BUTTON CONTAINER */}
//       <div ref={googleBtnRef} style={{ display: 'none' }}></div>

//       <div className="relative mb-6">
//         {(showEmailForm || showPhoneForm) && (
//           <button 
//             onClick={handleGoBack}
//             className="flex items-center gap-1 text-[#f7a221] hover:text-white font-bold text-[11px] tracking-widest transition-all mb-4 cursor-pointer"
//           >
//             <ChevronLeft size={16} /> BACK
//           </button>
//         )}

//         <h2 className="text-4xl text-center font-black text-white mb-1 tracking-tighter">
//           JOIN THE <span className="text-[#f7a221]">CLUB</span>
//         </h2>
//         <p className="text-gray-400 text-center text-[10px] tracking-widest uppercase">
//           Exclusive deals await
//         </p>
//       </div>

//       {error && (
//         <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[11px] text-center font-medium animate-in fade-in zoom-in duration-300">
//           {error}
//         </div>
//       )}

//       {!showEmailForm && !showPhoneForm ? (
//         <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
//           {/* CUSTOM UI GOOGLE BUTTON */}
//           <button
//             onClick={handleGoogleClick}
//             className="w-full bg-white hover:bg-gray-100 text-black cursor-pointer font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 mb-6 shadow-lg active:scale-95"
//           >
//             <svg className="w-5 h-5" viewBox="0 0 48 48">
//               <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
//               <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
//               <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
//               <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
//             </svg>
//             <span className="text-sm">Sign up with Google</span>
//           </button>

//           <div className="relative my-8">
//             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
//             <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-bold">
//               <span className="px-4 bg-[#0d0d0d] text-gray-600">OR REGISTER WITH</span>
//             </div>
//           </div>

//           <button 
//             onClick={() => setShowEmailForm(true)} 
//             className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer font-medium py-4 px-6 rounded-2xl flex items-center gap-2 mb-4 text-sm transition-all group active:scale-[0.98]"
//           >
//             <Mail size={18} className="text-[#f7a221]" /> Email Address <ArrowRight size={18} className="ml-auto group-hover:translate-x-1 transition-transform" />
//           </button>
//           <button 
//             onClick={() => setShowPhoneForm(true)} 
//             className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer font-medium py-4 px-6 rounded-2xl flex items-center gap-2 text-sm transition-all group active:scale-[0.98]"
//           >
//             <Phone size={18} className="text-[#f7a221]" /> Phone Number <ArrowRight size={18} className="ml-auto group-hover:translate-x-1 transition-transform" />
//           </button>

          
//         </div>
//       ) : showPhoneForm ? (
//         <form onSubmit={(e) => { e.preventDefault(); toast.info("Phone registration coming soon!"); }} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
//           <div className="relative">
//             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#f7a221] text-sm" required />
//           </div>
//           <div className="relative">
//             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#f7a221] text-sm" required />
//           </div>
//           <button type="submit" className="w-full cursor-pointer bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 rounded-xl transition-all shadow-lg text-sm uppercase">
//             SEND OTP
//           </button>
//         </form>
//       ) : (
//         <form onSubmit={handleEmailSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
//           <div className="relative">
//             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#f7a221] text-sm" required />
//           </div>
//           <div className="relative">
//             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#f7a221] text-sm" required />
//           </div>
//           <div className="relative">
//             <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#f7a221] text-sm" required minLength="6" />
//           </div>
//           <button type="submit" disabled={loading} className="w-full bg-[#f7a221] hover:bg-[#e0911c] disabled:opacity-50 text-black font-black py-4 rounded-xl cursor-pointer transition-all shadow-lg text-sm uppercase">
//             {loading ? "SENDING OTP..." : "GET STARTED"}
//           </button>
//         </form>
//       )}

//       {showOtpModal && (
//         <OtpVerification email={pendingEmail || email} name={name} onClose={() => setShowOtpModal(false)} onVerify={onRegisterSuccess} />
//       )}
//     </div>
//   );
// };

// export default Register;

// CODE IS WORKING BUT THE POP NOT COMES IN CENTER *****************************************

// import React, { useState, useEffect } from "react";
// import { Phone, Mail, User, ArrowRight, Lock, ChevronLeft } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { registerUser, googleLogin, clearError } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
// import OtpVerification from "./OTPVerification";

// const Register = ({ onRegisterSuccess, onLoginClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error, pendingEmail } = useSelector((state) => state.auth);

//   const [showEmailForm, setShowEmailForm] = useState(false);
//   const [showPhoneForm, setShowPhoneForm] = useState(false);
//   const [showOtpModal, setShowOtpModal] = useState(false);

//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   useEffect(() => {
//     if (error) {
//       toast.error(error);
//     }
//   }, [error]);

//   const handleGoogleClick = () => {
//     if (window.google) window.google.accounts.id.prompt();
//   };

//   useEffect(() => {
//     const initializeGoogle = () => {
//       if (window.google) {
//         window.google.accounts.id.initialize({
//           client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
//           callback: async (response) => {
//             const result = await dispatch(googleLogin({ idToken: response.credential }));
//             if (googleLogin.fulfilled.match(result)) {
//               toast.success("Welcome to the Club!");
//               onRegisterSuccess();
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
//     } else { initializeGoogle(); }
//   }, [dispatch, onRegisterSuccess]);

//   const handleEmailSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const result = await dispatch(registerUser({ name, email, password, phone: phone || undefined })).unwrap();
//       if (result) {
//         toast.success("OTP Dispatched!");
//         setShowOtpModal(true);
//       }
//     } catch (err) {}
//   };

//   // Shared back button handler to reset all states
//   const handleGoBack = () => {
//     setShowEmailForm(false);
//     setShowPhoneForm(false);
//     dispatch(clearError());
//   };

//   return (
//     <div className="w-full">
//       {/* Header Section with Integrated Back Button */}
//       <div className="relative mb-6">
//         {(showEmailForm || showPhoneForm) && (
//           <button 
//             onClick={handleGoBack}
//             className="flex items-center gap-1 text-[#f7a221] hover:text-white font-bold text-[11px] tracking-widest transition-all mb-4 cursor-pointer"
//           >
//             <ChevronLeft size={16} /> BACK
//           </button>
//         )}

//         <h2 className="text-4xl text-center font-black text-white mb-1 tracking-tighter">
//           JOIN THE <span className="text-[#f7a221]">CLUB</span>
//         </h2>
//         <p className="text-gray-400 text-center text-[10px] tracking-widest uppercase">
//           Exclusive deals await
//         </p>
//       </div>

//       {/* Inline Small Error Display */}
//       {error && (
//         <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[11px] text-center font-medium animate-in fade-in zoom-in duration-300">
//           {error}
//         </div>
//       )}

//       {!showEmailForm && !showPhoneForm ? (
//         <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
//           {/* Real G Google Button */}
//           <button
//             onClick={handleGoogleClick}
//             className="w-full bg-white hover:bg-gray-100 text-black cursor-pointer font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 mb-6 shadow-lg active:scale-95"
//           >
//             <svg className="w-5 h-5" viewBox="0 0 48 48">
//               <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
//               <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
//               <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
//               <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
//             </svg>
//             <span className="text-sm">Sign up with Google</span>
//           </button>

//           <div className="relative my-8">
//             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
//             <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-bold">
//               <span className="px-4 bg-[#0d0d0d] text-gray-600">OR REGISTER WITH</span>
//             </div>
//           </div>

//           <button 
//             onClick={() => setShowPhoneForm(true)} 
//             className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer font-medium py-4 px-6 rounded-2xl flex items-center gap-2 mb-4 text-sm transition-all group active:scale-[0.98]"
//           >
//             <Phone size={18} className="text-[#f7a221]" /> Phone Number <ArrowRight size={18} className="ml-auto group-hover:translate-x-1 transition-transform" />
//           </button>

//           <button 
//             onClick={() => setShowEmailForm(true)} 
//             className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer font-medium py-4 px-6 rounded-2xl flex items-center gap-2 text-sm transition-all group active:scale-[0.98]"
//           >
//             <Mail size={18} className="text-[#f7a221]" /> Email Address <ArrowRight size={18} className="ml-auto group-hover:translate-x-1 transition-transform" />
//           </button>
//         </div>
//       ) : showPhoneForm ? (
//         /* Phone Number Panel with Back Logic */
//         <form onSubmit={(e) => { e.preventDefault(); toast.info("Phone registration coming soon!"); }} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
//           <div className="relative">
//             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#f7a221] text-sm" required />
//           </div>
//           <div className="relative">
//             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#f7a221] text-sm" required />
//           </div>
//           <button type="submit" className="w-full cursor-pointer bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 rounded-xl transition-all shadow-lg text-sm uppercase">
//             SEND OTP
//           </button>
//         </form>
//       ) : (
//         /* Email Form with Back Logic */
//         <form onSubmit={handleEmailSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
//           <div className="relative">
//             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#f7a221] text-sm" required />
//           </div>
//           <div className="relative">
//             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#f7a221] text-sm" required />
//           </div>
//           <div className="relative">
//             <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
//             <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#f7a221] text-sm" required minLength="6" />
//           </div>
//           <button type="submit" disabled={loading} className="w-full bg-[#f7a221] hover:bg-[#e0911c] disabled:opacity-50 text-black font-black py-4 rounded-xl cursor-pointer transition-all shadow-lg text-sm uppercase">
//             {loading ? "SENDING OTP..." : "GET STARTED"}
//           </button>
//         </form>
//       )}

//       {showOtpModal && (
//         <OtpVerification email={pendingEmail || email} name={name} onClose={() => setShowOtpModal(false)} onVerify={onRegisterSuccess} />
//       )}
//     </div>
//   );
// };

// export default Register;


// // components/USER_LOGIN_SEGMENT/Register.jsx
// import React, { useState, useEffect } from "react";
// import { Phone, Mail, User, ArrowRight, Lock } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import {
//   registerUser,
//   googleLogin,
//   clearError,
// } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
// import OtpVerification from "./OTPVerification";

// const Register = ({ onRegisterSuccess, onLoginClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error, pendingEmail } = useSelector((state) => state.auth);

//   const [showEmailForm, setShowEmailForm] = useState(false);
//   const [showPhoneForm, setShowPhoneForm] = useState(false);
//   const [showOtpModal, setShowOtpModal] = useState(false);

//   // Form fields
//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   // Toast configuration
//   const toastConfig = {
//     position: "top-right",
//     autoClose: 3000,
//     hideProgressBar: false,
//     closeOnClick: true,
//     pauseOnHover: true,
//     draggable: true,
//     progress: undefined,
//     theme: "dark",
//   };

//   // Show error toast when error changes
//   useEffect(() => {
//     if (error) {
//       toast.error(error, toastConfig);
//       dispatch(clearError());
//     }
//   }, [error, dispatch]);

//   // ✅ Initialize Google
//   useEffect(() => {
//     const initializeGoogle = () => {
//       if (window.google) {
//         window.google.accounts.id.initialize({
//           client_id:
//             import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
//           callback: handleGoogleResponse,
//           ux_mode: "popup",
//         });
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

//   // ✅ Google register
//   const handleGoogleResponse = async (response) => {
//     try {
//       const result = await dispatch(
//         googleLogin({ idToken: response.credential })
//       );
//       if (googleLogin.fulfilled.match(result)) {
//         toast.success("Successfully registered with Google!", toastConfig);
//         onRegisterSuccess();
//       }
//     } catch (err) {
//       toast.error("Google registration failed. Please try again.", toastConfig);
//     }
//   };

//   const handleGoogleRegister = () => {
//     if (window.google) {
//       window.google.accounts.id.prompt();
//     }
//   };

//   const handlePhoneButtonClick = () => {
//     setShowPhoneForm(true);
//     setShowEmailForm(false);
//   };

//   const handleEmailButtonClick = () => {
//     setShowEmailForm(true);
//     setShowPhoneForm(false);
//   };

//   const handlePhoneSubmit = (e) => {
//     e.preventDefault();
//     toast.info("Phone registration is coming soon! Please use email or Google.", {
//       ...toastConfig,
//       autoClose: 4000,
//     });
//   };

//   // ✅ Email register — dispatch registerUser thunk, then show OTP modal
//   const handleEmailSubmit = async (e) => {
//     e.preventDefault();
    
//     try {
//       const result = await dispatch(
//         registerUser({ name, email, password, phone: phone || undefined })
//       ).unwrap();

//       if (result) {
//         toast.success("OTP sent successfully! Please check your email.", toastConfig);
//         setShowOtpModal(true);
//       }
//     } catch (err) {
//       // Error is already handled by the error useEffect
//       console.error("Registration failed:", err);
//     }
//   };

//   const handleBackToMain = () => {
//     setShowEmailForm(false);
//     setShowPhoneForm(false);
//     setName("");
//     setPhone("");
//     setEmail("");
//     setPassword("");
//   };

//   // ✅ Called after OTP verified successfully (from OtpVerification component)
//   const handleOtpVerify = () => {
//     setShowOtpModal(false);
//     toast.success("Email verified successfully! Registration complete.", toastConfig);
//     onRegisterSuccess();
//   };

//   return (
//     <>
//       {/* <ToastContainer /> */}
//       <div className="w-full">
//         <div className="flex items-center justify-between mb-2">
//           <h2 className="text-center text-4xl font-black text-white tracking-tighter flex-1">
//             JOIN THE <span className="text-[#f7a221]">CLUB</span>
//           </h2>
//           {(showEmailForm || showPhoneForm) && (
//             <button
//               onClick={handleBackToMain}
//               className="text-gray-500 hover:text-white text-sm"
//             >
//               ← Back
//             </button>
//           )}
//         </div>

//         <p className="text-gray-500 text-center text-sm mb-8">
//           Get VIP access to exclusive deals
//         </p>

//         {!showEmailForm && !showPhoneForm ? (
//           // ── Main Menu ──────────────────────────────────────────
//           <>
//             <button
//               onClick={handleGoogleRegister}
//               className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 mb-6"
//             >
//               <svg className="w-5 h-5" viewBox="0 0 24 24">
//                 <path
//                   fill="currentColor"
//                   d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
//                 />
//                 <path
//                   fill="currentColor"
//                   d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
//                 />
//                 <path
//                   fill="currentColor"
//                   d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
//                 />
//                 <path
//                   fill="currentColor"
//                   d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
//                 />
//               </svg>
//               Sign up with Google
//             </button>

//             <div className="relative my-8">
//               <div className="absolute inset-0 flex items-center">
//                 <div className="w-full border-t border-white/10"></div>
//               </div>
//               <div className="relative flex justify-center text-xs">
//                 <span className="px-4 bg-[#0d0d0d] text-gray-500">
//                   OR REGISTER WITH
//                 </span>
//               </div>
//             </div>

//             <button
//               onClick={handlePhoneButtonClick}
//               className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 mb-4"
//             >
//               <Phone size={18} />
//               Register with Phone Number
//               <ArrowRight size={18} className="ml-auto" />
//             </button>

//             <button
//               onClick={handleEmailButtonClick}
//               className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
//             >
//               <Mail size={18} />
//               Register with Email Address
//               <ArrowRight size={18} className="ml-auto" />
//             </button>

//             <div className="mt-6 text-center">
//               <span className="text-gray-500 text-sm">
//                 Already have an account?{" "}
//               </span>
//               <button
//                 onClick={onLoginClick}
//                 className="text-[#f7a221] hover:underline text-sm font-medium"
//               >
//                 Login here
//               </button>
//             </div>
//           </>
//         ) : showPhoneForm ? (
//           // ── Phone Form ─────────────────────────────────────────
//           <form onSubmit={handlePhoneSubmit} className="space-y-4">
//             <div className="relative">
//               <User
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//                 size={18}
//               />
//               <input
//                 type="text"
//                 placeholder="Full Name"
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                 required
//               />
//             </div>
//             <div className="relative">
//               <Phone
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//                 size={18}
//               />
//               <input
//                 type="tel"
//                 placeholder="Phone Number"
//                 value={phone}
//                 onChange={(e) => setPhone(e.target.value)}
//                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                 required
//               />
//             </div>
//             <button
//               type="submit"
//               className="w-full bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 px-6 rounded-2xl transition-all"
//             >
//               SEND OTP
//             </button>
//           </form>
//         ) : (
//           // ── Email Form ─────────────────────────────────────────
//           <form onSubmit={handleEmailSubmit} className="space-y-4">
//             <div className="relative">
//               <User
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//                 size={18}
//               />
//               <input
//                 type="text"
//                 placeholder="Full Name"
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                 required
//               />
//             </div>

//             <div className="relative">
//               <Mail
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//                 size={18}
//               />
//               <input
//                 type="email"
//                 placeholder="Email Address"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                 required
//               />
//             </div>

//             <div className="relative">
//               <Lock
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//                 size={18}
//               />
//               <input
//                 type="password"
//                 placeholder="Password (min. 6 characters)"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                 required
//                 minLength="6"
//               />
//             </div>

//             <div className="relative">
//               <Phone
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//                 size={18}
//               />
//               <input
//                 type="tel"
//                 placeholder="Phone Number (Optional)"
//                 value={phone}
//                 onChange={(e) => setPhone(e.target.value)}
//                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//               />
//             </div>

//             {/* ✅ Loading state on button */}
//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full bg-[#f7a221] hover:bg-[#e0911c] disabled:opacity-60 disabled:cursor-not-allowed text-black font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
//             >
//               {loading ? (
//                 <span className="flex items-center gap-2">
//                   <svg
//                     className="animate-spin h-5 w-5"
//                     viewBox="0 0 24 24"
//                     fill="none"
//                   >
//                     <circle
//                       className="opacity-25"
//                       cx="12"
//                       cy="12"
//                       r="10"
//                       stroke="currentColor"
//                       strokeWidth="4"
//                     />
//                     <path
//                       className="opacity-75"
//                       fill="currentColor"
//                       d="M4 12a8 8 0 018-8v8z"
//                     />
//                   </svg>
//                   Sending OTP...
//                 </span>
//               ) : (
//                 "REGISTER & SEND OTP"
//               )}
//             </button>
//           </form>
//         )}
//       </div>

//       {/* ✅ OTP Verification Modal — email comes from Redux pendingEmail */}
//       {showOtpModal && (
//         <OtpVerification
//           email={pendingEmail || email}
//           name={name}
//           onClose={() => setShowOtpModal(false)}
//           onVerify={handleOtpVerify}
//         />
//       )}
//     </>
//   );
// };

// export default Register;


// // components/USER_LOGIN_SEGMENT/Register.jsx
// import React, { useState, useEffect } from "react";
// import { Phone, Mail, User, ArrowRight, Lock } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   registerUser,
//   googleLogin,
//   clearError,
// } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
// import OtpVerification from "./OTPVerification";

// const Register = ({ onRegisterSuccess, onLoginClick }) => {
//   const dispatch = useDispatch();
//   const { loading, error, pendingEmail } = useSelector((state) => state.auth);

//   const [showEmailForm, setShowEmailForm] = useState(false);
//   const [showPhoneForm, setShowPhoneForm] = useState(false);
//   const [showPhoneMessage, setShowPhoneMessage] = useState(false);
//   const [showOtpModal, setShowOtpModal] = useState(false);

//   // Form fields
//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   // Clear errors on mount
//   useEffect(() => {
//     dispatch(clearError());
//   }, [dispatch]);

//   // ✅ Initialize Google
//   useEffect(() => {
//     const initializeGoogle = () => {
//       if (window.google) {
//         window.google.accounts.id.initialize({
//           client_id:
//             import.meta.env.VITE_GOOGLE_CLIENT_ID || "demo-client-id",
//           callback: handleGoogleResponse,
//           ux_mode: "popup",
//         });
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

//   // ✅ Google register
//   const handleGoogleResponse = async (response) => {
//     const result = await dispatch(
//       googleLogin({ idToken: response.credential })
//     );
//     if (googleLogin.fulfilled.match(result)) {
//       onRegisterSuccess();
//     }
//   };

//   const handleGoogleRegister = () => {
//     if (window.google) {
//       window.google.accounts.id.prompt();
//     }
//   };

//   const handlePhoneButtonClick = () => {
//     setShowPhoneForm(true);
//     setShowEmailForm(false);
//     dispatch(clearError());
//   };

//   const handleEmailButtonClick = () => {
//     setShowEmailForm(true);
//     setShowPhoneForm(false);
//     dispatch(clearError());
//   };

//   const handlePhoneSubmit = (e) => {
//     e.preventDefault();
//     setShowPhoneMessage(true);
//     setTimeout(() => setShowPhoneMessage(false), 3000);
//   };

//   // ✅ Email register — dispatch registerUser thunk, then show OTP modal
//   const handleEmailSubmit = async (e) => {
//     e.preventDefault();
//     dispatch(clearError());

//     const result = await dispatch(
//       registerUser({ name, email, password, phone: phone || undefined })
//     );

//     if (registerUser.fulfilled.match(result)) {
//       setShowOtpModal(true); // ✅ OTP sent successfully, show modal
//     }
//   };

//   const handleBackToMain = () => {
//     setShowEmailForm(false);
//     setShowPhoneForm(false);
//     setName("");
//     setPhone("");
//     setEmail("");
//     setPassword("");
//     dispatch(clearError());
//   };

//   // ✅ Called after OTP verified successfully (from OtpVerification component)
//   const handleOtpVerify = () => {
//     setShowOtpModal(false);
//     onRegisterSuccess();
//   };

//   return (
//     <>
//       <div className="w-full">
//         <div className="flex items-center justify-center mb-2">
//           <h2 className="text-center text-4xl font-black  text-white tracking-tighter">
//             JOIN THE <span className="text-[#f7a221]">CLUB</span>
//           </h2>
//           {(showEmailForm || showPhoneForm) && (
//             <button
//               onClick={handleBackToMain}
//               className="text-gray-500 hover:text-white text-sm"
//             >
//               ← Back
//             </button>
//           )}
//         </div>

//         <p className="text-gray-500 text-center text-sm mb-8">
//           Get VIP access to exclusive deals
//         </p>

//         {/* ✅ API Error from Redux */}
//         {error && (
//           <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
//             {error}
//           </div>
//         )}

//         {/* Phone Coming Soon */}
//         {showPhoneMessage && (
//           <div className="mb-4 p-3 bg-[#f7a221]/10 border border-[#f7a221]/20 rounded-xl text-[#f7a221] text-sm">
//             Phone registration is coming soon! Please use email or Google.
//           </div>
//         )}

//         {!showEmailForm && !showPhoneForm ? (
//           // ── Main Menu ──────────────────────────────────────────
//           <>
//             <button
//               onClick={handleGoogleRegister}
//               className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 mb-6"
//             >
//               <svg className="w-5 h-5" viewBox="0 0 24 24">
//                 <path
//                   fill="currentColor"
//                   d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
//                 />
//                 <path
//                   fill="currentColor"
//                   d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
//                 />
//                 <path
//                   fill="currentColor"
//                   d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
//                 />
//                 <path
//                   fill="currentColor"
//                   d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
//                 />
//               </svg>
//               Sign up with Google
//             </button>

//             <div className="relative my-8">
//               <div className="absolute inset-0 flex items-center">
//                 <div className="w-full border-t border-white/10"></div>
//               </div>
//               <div className="relative flex justify-center text-xs">
//                 <span className="px-4 bg-[#0d0d0d] text-gray-500">
//                   OR REGISTER WITH
//                 </span>
//               </div>
//             </div>

//             <button
//               onClick={handlePhoneButtonClick}
//               className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 mb-4"
//             >
//               <Phone size={18} />
//               Register with Phone Number
//               <ArrowRight size={18} className="ml-auto" />
//             </button>

//             <button
//               onClick={handleEmailButtonClick}
//               className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
//             >
//               <Mail size={18} />
//               Register with Email Address
//               <ArrowRight size={18} className="ml-auto" />
//             </button>

//             <div className="mt-6 text-center">
//               <span className="text-gray-500 text-sm">
//                 Already have an account?{" "}
//               </span>
//               <button
//                 onClick={onLoginClick}
//                 className="text-[#f7a221] hover:underline text-sm font-medium"
//               >
//                 Login here
//               </button>
//             </div>
//           </>
//         ) : showPhoneForm ? (
//           // ── Phone Form ─────────────────────────────────────────
//           <form onSubmit={handlePhoneSubmit} className="space-y-4">
//             <div className="relative">
//               <User
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//                 size={18}
//               />
//               <input
//                 type="text"
//                 placeholder="Full Name"
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                 required
//               />
//             </div>
//             <div className="relative">
//               <Phone
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//                 size={18}
//               />
//               <input
//                 type="tel"
//                 placeholder="Phone Number"
//                 value={phone}
//                 onChange={(e) => setPhone(e.target.value)}
//                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                 required
//               />
//             </div>
//             <button
//               type="submit"
//               className="w-full bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 px-6 rounded-2xl transition-all"
//             >
//               SEND OTP
//             </button>
//             <p className="text-xs text-center text-gray-500 mt-2">
//               Note: Phone verification is coming soon
//             </p>
//           </form>
//         ) : (
//           // ── Email Form ─────────────────────────────────────────
//           <form onSubmit={handleEmailSubmit} className="space-y-4">
//             <div className="relative">
//               <User
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//                 size={18}
//               />
//               <input
//                 type="text"
//                 placeholder="Full Name"
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                 required
//               />
//             </div>

//             <div className="relative">
//               <Mail
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//                 size={18}
//               />
//               <input
//                 type="email"
//                 placeholder="Email Address"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                 required
//               />
//             </div>

//             <div className="relative">
//               <Lock
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//                 size={18}
//               />
//               <input
//                 type="password"
//                 placeholder="Password (min. 6 characters)"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                 required
//                 minLength="6"
//               />
//             </div>

//             <div className="relative">
//               <Phone
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
//                 size={18}
//               />
//               <input
//                 type="tel"
//                 placeholder="Phone Number"
//                 value={phone}
//                 onChange={(e) => setPhone(e.target.value)}
//                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//               />
//             </div>

//             {/* ✅ Loading state on button */}
//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full bg-[#f7a221] hover:bg-[#e0911c] disabled:opacity-60 disabled:cursor-not-allowed text-black font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
//             >
//               {loading ? (
//                 <span className="flex items-center gap-2">
//                   <svg
//                     className="animate-spin h-5 w-5"
//                     viewBox="0 0 24 24"
//                     fill="none"
//                   >
//                     <circle
//                       className="opacity-25"
//                       cx="12"
//                       cy="12"
//                       r="10"
//                       stroke="currentColor"
//                       strokeWidth="4"
//                     />
//                     <path
//                       className="opacity-75"
//                       fill="currentColor"
//                       d="M4 12a8 8 0 018-8v8z"
//                     />
//                   </svg>
//                   Sending OTP...
//                 </span>
//               ) : (
//                 "REGISTER & SEND OTP"
//               )}
//             </button>
//           </form>
//         )}
//       </div>

//       {/* ✅ OTP Verification Modal — email comes from Redux pendingEmail */}
//       {showOtpModal && (
//         <OtpVerification
//           email={pendingEmail || email}
//           name={name}
//           onClose={() => setShowOtpModal(false)}
//           onVerify={handleOtpVerify}
//         />
//       )}
//     </>
//   );
// };

// export default Register;


// // components/USER_LOGIN_SEGMENT/Register.jsx
// import React, { useState, useEffect } from 'react';
// import { Phone, Mail, User, ArrowRight, Lock } from 'lucide-react';
// import OtpVerification from './OTPVerification';

// const Register = ({ onRegisterSuccess, onLoginClick }) => {
//     // Form states
//     const [showEmailForm, setShowEmailForm] = useState(false);
//     const [showPhoneForm, setShowPhoneForm] = useState(false);
    
//     // Form data
//     const [name, setName] = useState('');
//     const [phone, setPhone] = useState('');
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
    
//     const [localError, setLocalError] = useState('');
//     const [showPhoneMessage, setShowPhoneMessage] = useState(false);
//     const [showOtpModal, setShowOtpModal] = useState(false);

//     // Load Google Script
//     useEffect(() => {
//         const initializeGoogle = () => {
//             if (window.google) {
//                 window.google.accounts.id.initialize({
//                     client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'demo-client-id',
//                     callback: handleGoogleResponse,
//                     ux_mode: "popup",
//                 });
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
//         console.log('Google register demo:', response);
//         alert('Google registration successful! (Demo)');
//         onRegisterSuccess();
//     };

//     const handleGoogleRegister = () => {
//         if (window.google) {
//             window.google.accounts.id.prompt();
//         } else {
//             setLocalError('Google sign-in is loading. Please try again.');
//         }
//     };

//     const handlePhoneButtonClick = () => {
//         setShowPhoneForm(true);
//         setShowEmailForm(false);
//     };

//     const handleEmailButtonClick = () => {
//         setShowEmailForm(true);
//         setShowPhoneForm(false);
//     };

//     const handlePhoneSubmit = (e) => {
//         e.preventDefault();
//         setLocalError('');
        
//         if (!name || !phone) {
//             setLocalError('Please fill in all fields');
//             return;
//         }

//         setShowPhoneMessage(true);
//         setTimeout(() => setShowPhoneMessage(false), 3000);
//     };

//     const handleEmailSubmit = (e) => {
//         e.preventDefault();
//         setLocalError('');
        
//         if (!name || !email || !password) {
//             setLocalError('Please fill in all required fields');
//             return;
//         }

//         if (password.length < 6) {
//             setLocalError('Password must be at least 6 characters');
//             return;
//         }

//         setShowOtpModal(true);
//     };

//     const handleBackToMain = () => {
//         setShowEmailForm(false);
//         setShowPhoneForm(false);
//         setName('');
//         setPhone('');
//         setEmail('');
//         setPassword('');
//     };

//     const handleOtpVerify = () => {
//         setShowOtpModal(false);
//         onRegisterSuccess();
//     };

//     return (
//         <>
//             <div className="w-full">
//                 <div className="flex items-center justify-between mb-2">
//                     <h2 className="text-4xl font-black text-white tracking-tighter">
//                         JOIN THE <span className="text-[#f7a221]">CLUB</span>
//                     </h2>
//                     {(showEmailForm || showPhoneForm) && (
//                         <button 
//                             onClick={handleBackToMain}
//                             className="text-gray-500 hover:text-white text-sm"
//                         >
//                             ← Back
//                         </button>
//                     )}
//                 </div>
                
//                 <p className="text-gray-500 text-sm mb-8">Get VIP access to exclusive deals</p>

//                 {/* Error Message */}
//                 {localError && (
//                     <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
//                         {localError}
//                     </div>
//                 )}

//                 {/* Phone Coming Soon Message */}
//                 {showPhoneMessage && (
//                     <div className="mb-4 p-3 bg-[#f7a221]/10 border border-[#f7a221]/20 rounded-xl text-[#f7a221] text-sm">
//                         Phone registration is coming soon! Please use email or Google.
//                     </div>
//                 )}

//                 {!showEmailForm && !showPhoneForm ? (
//                     // Main Menu
//                     <>
//                         {/* Google Sign Up */}
//                         <button 
//                             onClick={handleGoogleRegister}
//                             className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 mb-6"
//                         >
//                             <svg className="w-5 h-5" viewBox="0 0 24 24">
//                                 <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
//                                 <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
//                                 <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
//                                 <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
//                             </svg>
//                             Sign up with Google
//                         </button>

//                         <div className="relative my-8">
//                             <div className="absolute inset-0 flex items-center">
//                                 <div className="w-full border-t border-white/10"></div>
//                             </div>
//                             <div className="relative flex justify-center text-xs">
//                                 <span className="px-4 bg-[#0d0d0d] text-gray-500">OR REGISTER WITH</span>
//                             </div>
//                         </div>

//                         {/* Phone Registration Button */}
//                         <button 
//                             onClick={handlePhoneButtonClick}
//                             className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 mb-4"
//                         >
//                             <Phone size={18} />
//                             Register with Phone Number
//                             <ArrowRight size={18} className="ml-auto" />
//                         </button>

//                         {/* Email Registration Button */}
//                         <button 
//                             onClick={handleEmailButtonClick}
//                             className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
//                         >
//                             <Mail size={18} />
//                             Register with Email Address
//                             <ArrowRight size={18} className="ml-auto" />
//                         </button>

//                         {/* Login Link */}
//                         <div className="mt-6 text-center">
//                             <span className="text-gray-500 text-sm">Already have an account? </span>
//                             <button 
//                                 onClick={onLoginClick}
//                                 className="text-[#f7a221] hover:underline text-sm font-medium"
//                             >
//                                 Login here
//                             </button>
//                         </div>
//                     </>
//                 ) : showPhoneForm ? (
//                     // Phone Registration Form
//                     <form onSubmit={handlePhoneSubmit} className="space-y-4">
//                         <div className="relative">
//                             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
//                             <input
//                                 type="text"
//                                 placeholder="Full Name"
//                                 value={name}
//                                 onChange={(e) => setName(e.target.value)}
//                                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                                 required
//                             />
//                         </div>

//                         <div className="relative">
//                             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
//                             <input
//                                 type="tel"
//                                 placeholder="Phone Number"
//                                 value={phone}
//                                 onChange={(e) => setPhone(e.target.value)}
//                                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                                 required
//                             />
//                         </div>

//                         <button
//                             type="submit"
//                             className="w-full bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 px-6 rounded-2xl transition-all"
//                         >
//                             SEND OTP
//                         </button>
                        
//                         <p className="text-xs text-center text-gray-500 mt-2">
//                             Note: Phone verification is coming soon
//                         </p>
//                     </form>
//                 ) : (
//                     // Email Registration Form
//                     <form onSubmit={handleEmailSubmit} className="space-y-4">
//                         <div className="relative">
//                             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
//                             <input
//                                 type="text"
//                                 placeholder="Full Name"
//                                 value={name}
//                                 onChange={(e) => setName(e.target.value)}
//                                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                                 required
//                             />
//                         </div>

//                         <div className="relative">
//                             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
//                             <input
//                                 type="email"
//                                 placeholder="Email Address"
//                                 value={email}
//                                 onChange={(e) => setEmail(e.target.value)}
//                                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                                 required
//                             />
//                         </div>

//                         <div className="relative">
//                             <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
//                             <input
//                                 type="password"
//                                 placeholder="Password (min. 6 characters)"
//                                 value={password}
//                                 onChange={(e) => setPassword(e.target.value)}
//                                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                                 required
//                                 minLength="6"
//                             />
//                         </div>

//                         <div className="relative">
//                             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
//                             <input
//                                 type="tel"
//                                 placeholder="Phone Number (Optional)"
//                                 value={phone}
//                                 onChange={(e) => setPhone(e.target.value)}
//                                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f7a221] focus:ring-1 focus:ring-[#f7a221] transition-all"
//                             />
//                         </div>

//                         <button
//                             type="submit"
//                             className="w-full bg-[#f7a221] hover:bg-[#e0911c] text-black font-black py-4 px-6 rounded-2xl transition-all"
//                         >
//                             REGISTER & SEND OTP
//                         </button>
//                     </form>
//                 )}
//             </div>

//             {/* OTP Verification Modal */}
//             {showOtpModal && (
//                 <OtpVerification
//                     email={email}
//                     name={name}
//                     onClose={() => setShowOtpModal(false)}
//                     onVerify={handleOtpVerify}
//                 />
//             )}
//         </>
//     );
// };

// export default Register;