import React, { useState, useEffect, useRef } from "react";
import { Phone, Mail, User, Lock } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { registerUser, googleLogin, clearError, pickRegisterOtpIdentifier } from "../REDUX_FEATURES/REDUX_SLICES/authSlice";
import { GoogleIcon } from "./Login";
import LOGO from "../../assets/logo2.svg";

const Register = ({ onRegisterSuccess, onLoginClick, onShowOtp }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
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
        const verifyId = pickRegisterOtpIdentifier(result, { email, phone: cleanPhone });
        const msg = typeof result.message === "string" ? result.message : "";
        toast.success(msg || "OTP sent!");
        onShowOtp({
          identifier: verifyId,
          phone: cleanPhone,
          name,
          email,
          password,
          deliveryMessage: msg,
        });
      }
    } catch (_) {
      // Error shown via Redux error state + useEffect toast above
    }
  };

  // ── White theme input style ────────────────────────────────────
  const inputBase = {
    width: "100%",
    background: "#f5f5f5",
    border: "1.5px solid #e8e8e8",
    borderRadius: "12px",
    padding: "11px 16px 11px 40px",
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
        .reg-white input::placeholder { color: #aaaaaa; }
        .reg-white input:focus {
          border-color: #f7a221 !important;
          box-shadow: 0 0 0 3px rgba(247,162,33,0.15) !important;
          background: #fffdf7 !important;
        }
        .reg-btn-primary {
          width: 100%;
          background: #f7a221;
          color: #000000;
          font-weight: 900;
          padding: 13px 0;
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
        .reg-btn-primary:hover:not(:disabled) { background: #e0911c; }
        .reg-btn-primary:active:not(:disabled) { background: #c97e18; transform: scale(0.99); }
        .reg-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .reg-btn-google {
          width: 100%;
          background: #ffffff;
          border: 1.5px solid #e8e8e8;
          border-radius: 12px;
          padding: 11px 16px;
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
        .reg-btn-google:hover { background: #f9f9f9; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
        .reg-divider-line { border-color: #e8e8e8; }
        .reg-divider-text { background: #ffffff; color: #aaaaaa; }
      `}</style>

      <div className="reg-white">
        {/* Hidden Google button mount point */}
        <div ref={googleBtnRef} style={{ display: "none" }} />

        {/* Logo — compact on all screens */}
        <div className="flex justify-center mb-2.5">
          <img
            src={LOGO}
            alt="OfferWale Baba"
            className="h-12 sm:h-16 w-auto object-contain rounded"
          />
        </div>

        <h2
          className="text-lg sm:text-xl text-center mb-0.5 tracking-tighter font-black"
          style={{ color: "#111111" }}
        >
          JOIN THE <span style={{ color: "#f7a221" }}>CLUB</span>
        </h2>
        <p
          className="text-center text-[10px] tracking-widest uppercase mb-2.5"
          style={{ color: "#999999" }}
        >
          Exclusive deals await
        </p>

        {error && (
          <div
            className="mb-2.5 p-2 rounded-xl text-[11px] text-center font-medium"
            style={{
              background: "#fff0f0",
              border: "1px solid #ffd0d0",
              color: "#cc3333",
            }}
          >
            {error}
          </div>
        )}

        {/* Google Sign-up */}
        <button
          onClick={handleGoogleClick}
          className="reg-btn-google mb-2 touch-manipulation select-none"
        >
          <GoogleIcon />
          <span>Sign up with Google</span>
        </button>

        {/* OR divider */}
        <div className="relative my-2.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t reg-divider-line" />
          </div>
          <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em]">
            <span className="px-3 reg-divider-text">OR REGISTER WITH DETAILS</span>
          </div>
        </div>

        {/* <p className="text-[10px] text-gray-500 text-center leading-snug px-1 -mt-1 mb-2">
          A one-time code is sent by the server (commonly to your email; SMS only if enabled). The next step shows exactly where it was sent.
        </p> */}

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Full Name */}
          <div className="relative">
            <User
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              size={16}
              style={{ color: "#aaaaaa" }}
            />
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              style={inputBase}
              required
            />
          </div>

          {/* Email */}
          <div className="relative">
            <Mail
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              size={16}
              style={{ color: "#aaaaaa" }}
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={inputBase}
              required
            />
          </div>

          {/* Phone */}
          <div className="relative">
            <Phone
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              size={16}
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
              style={inputBase}
              required
              minLength={10}
              maxLength={10}
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
              type="password"
              placeholder="Password (min 6 Characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              style={inputBase}
              required
              minLength="6"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="reg-btn-primary touch-manipulation select-none"
          >
            {loading ? "SENDING OTP..." : "REGISTER"}
          </button>
        </form>

        <p className="text-center text-[11px] mt-2.5 tracking-wide" style={{ color: "#999999" }}>
          Already a member?{" "}
          <button
            onClick={onLoginClick}
            className="font-bold cursor-pointer touch-manipulation"
            style={{ color: "#f7a221" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#111")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#f7a221")}
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;

