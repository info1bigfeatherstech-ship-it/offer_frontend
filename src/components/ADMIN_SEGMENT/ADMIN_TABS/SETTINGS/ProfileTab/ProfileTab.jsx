import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import LOGO from "../../../../../assets/logo2.svg";
import {
  initiateAdminSelfPasswordReset,
  verifyAdminSelfPasswordReset,
  clearAdminSelfPasswordState,
} from "../../../ADMIN_REDUX_MANAGEMENT/adminSelfPasswordSlice";
import { ROLES } from "../../../roles";

const ProfileTab = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.adminAuth);
  const {
    loading,
    error,
    successMessage,
    otpSent,
    resetSuccess,
    maskedEmail,
  } = useSelector((state) => state.adminSelfPassword) || {};

  const isAdmin = String(user?.role || "").toLowerCase() === ROLES.ADMIN;

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return () => {
      dispatch(clearAdminSelfPasswordState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!resetSuccess) return undefined;
    const t = setTimeout(() => {
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setLocalError("");
      dispatch(clearAdminSelfPasswordState());
    }, 2500);
    return () => clearTimeout(t);
  }, [resetSuccess, dispatch]);

  const handleSendOtp = () => {
    setLocalError("");
    dispatch(initiateAdminSelfPasswordReset());
  };

  const handleVerify = (e) => {
    e.preventDefault();
    setLocalError("");
    if (newPassword.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("New password and confirmation do not match.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setLocalError("Enter the 6-digit OTP from your email.");
      return;
    }
    dispatch(
      verifyAdminSelfPasswordReset({
        otp,
        newPassword,
        confirmPassword,
      })
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-xl font-bold mb-6 text-gray-900">Profile settings</h1>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-400">Profile</h2>
          </div>

          <div className="divide-y divide-gray-100">
            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-xl border border-gray-200 overflow-hidden bg-white flex items-center justify-center p-2 shadow-sm">
                    <img
                      src={LOGO}
                      alt="Store Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#3b82f6] text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Change logo
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 uppercase">
                    Offer Wale Baba
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">9370686008</p>
                  <p className="text-xs text-gray-400 mt-1">Store ID - 5656117</p>
                  {user?.email ? (
                    <p className="text-xs text-gray-500 mt-2">
                      Signed in as <span className="font-medium">{user.email}</span>
                    </p>
                  ) : null}
                </div>
              </div>
              <button type="button" className="text-blue-600 text-sm hover:text-blue-800">
                Edit
              </button>
            </div>

            <ProfileRow label="Display number" value="9320001717" />

            <div className="p-6 flex items-start justify-between group">
              <div>
                <p className="text-[11px] font- text-gray-400 uppercase tracking-wider mb-1">
                  Email
                </p>
                <div className="flex items-center gap-2">
                  <img
                    src="https://www.google.com/favicon.ico"
                    className="w-4 h-4 opacity-70"
                    alt="G"
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    {user?.email || "support.offerwalebaba@gmail.com"}
                  </span>
                  <span className="bg-green-50 text-green-600 text-[10px] px-2 py-0.5 rounded border border-green-100 font-bold uppercase tracking-tighter">
                    Verified
                  </span>
                </div>
              </div>
              <button type="button" className="text-blue-600 text-sm font-bold hover:text-blue-800">
                Edit
              </button>
            </div>

            <div className="p-6 flex items-start justify-between group">
              <div className="max-w-2xl">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                  Store description
                </p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Email: support.offerwalebaba@gmail.com Welcome to OWB OfferWaleBaba! The World
                  of Offers. We invite you to avail all the best offers displayed by us with the
                  safest Payment Gateways. We started in the year 2015...
                </p>
              </div>
              <button type="button" className="text-blue-600 text-sm font-bold hover:text-blue-800">
                Edit
              </button>
            </div>

            <ProfileRow
              label="Store address"
              value="OfferWaleBaba OWB, ULHASNAGAR, Maharashtra - 421004"
            />
            <ProfileRow
              label="Business type"
              value="Mobile & Electronics, Clothing & Fashion, Others"
            />
            <ProfileRow
              label="Social media"
              value="Facebook, Instagram, YouTube, Telegram, WhatsApp"
            />
          </div>
        </section>

        {isAdmin ? (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-400">Security</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 rounded-lg bg-amber-50 text-amber-600">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Reset admin password</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xl">
                    We will email a one-time code to your admin account email
                    {maskedEmail ? ` (${maskedEmail})` : ""}. Use the <strong>latest</strong> OTP
                    only (each new request replaces the previous one). Choose a password different
                    from your current one. Delivery must reach a real inbox — invalid addresses
                    bounce and you will not receive the OTP.
                  </p>
                </div>
              </div>

              {(error || localError || successMessage) && (
                <div
                  className={`px-4 py-3 rounded-xl text-sm font-semibold border ${
                    error || localError
                      ? "bg-rose-50 text-rose-600 border-rose-100"
                      : "bg-emerald-50 text-emerald-600 border-emerald-100"
                  }`}
                >
                  {error || localError || successMessage}
                </div>
              )}

              {resetSuccess ? (
                <div className="flex flex-col items-center gap-2 py-6 text-emerald-600">
                  <ShieldCheck size={32} />
                  <p className="text-sm font-semibold">Password updated successfully</p>
                </div>
              ) : !otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading?.initiate}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading?.initiate ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <KeyRound size={16} />
                  )}
                  {loading?.initiate ? "Sending OTP…" : "Send OTP to my email"}
                </button>
              ) : (
                <form onSubmit={handleVerify} className="space-y-4 max-w-md">
                  <p className="text-xs text-gray-500">
                    Check your email for the 6-digit OTP. It expires in 10 minutes.
                  </p>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      OTP Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="6-digit OTP"
                      maxLength={6}
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm tracking-[0.3em] font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type={showNewPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        minLength={6}
                        required
                        autoComplete="new-password"
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={showNewPw ? "Hide password" : "Show password"}
                      >
                        {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type={showConfirmPw ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        minLength={6}
                        required
                        autoComplete="new-password"
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={
                          showConfirmPw ? "Hide password" : "Show password"
                        }
                      >
                        {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={loading?.verify}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading?.verify && <Loader2 size={16} className="animate-spin" />}
                      {loading?.verify ? "Updating…" : "Set new password"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading?.initiate}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-60"
                    >
                      {loading?.initiate ? "Resending…" : "Resend OTP"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtp("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setLocalError("");
                        dispatch(clearAdminSelfPasswordState());
                      }}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        ) : null}

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-200">
            <h2 className="text-sm text-gray-400">Billing & verification</h2>
          </div>

          <div className="divide-y divide-gray-100">
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">KYC</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-800 tracking-tight">
                    GSTIN: *********
                  </span>
                  <CheckCircle2 size={16} className="text-green-500" />
                </div>
              </div>
              <span className="bg-green-50 text-green-600 text-[10px] px-2 py-1 rounded border border-green-100 font-bold uppercase tracking-wider">
                KYC Verified
              </span>
            </div>

            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                  Bank account
                </p>
                <p className="text-sm text-gray-700 font-medium">OfferWaleBaba OWB</p>
                <p className="text-sm text-gray-400 font-mono tracking-widest uppercase">
                  XXXXXXXX399
                </p>
              </div>
              <button type="button" className="text-blue-600 text-sm font-bold hover:text-blue-800">
                Edit
              </button>
            </div>

            <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all group">
              <div>
                <p className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                  My invoices
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Manage invoices for your subscriptions
                </p>
              </div>
              <ChevronRight
                size={20}
                className="text-blue-500 transform group-hover:translate-x-1 transition-transform"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const ProfileRow = ({ label, value }) => (
  <div className="p-6 flex items-start justify-between group">
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-700 font-medium">{value}</p>
    </div>
    <button
      type="button"
      className="text-blue-600 text-sm font-bold hover:text-blue-800 transition-colors"
    >
      Edit
    </button>
  </div>
);

export default ProfileTab;
