/**
 * EditStaffForm.jsx
 * Fully independent modal — handles:
 *   1. Edit staff details (name, email, phone, role, status)
 *   2. Password reset via OTP (collapsible section at the bottom)
 *
 * Props: staff (object), onClose()
 * All API calls go through Redux — zero prop drilling.
 */

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateStaff, clearStaffMessages } from "../../ADMIN_REDUX_MANAGEMENT/staffSlice";
import {
  initiatePasswordReset,
  verifyOTPAndReset,
  clearPasswordState,
} from "../../ADMIN_REDUX_MANAGEMENT/staffPasswordSlice";
import {
  X, User, Mail, Phone, Briefcase, Lock,
  Eye, EyeOff, Loader2, KeyRound, ChevronDown, ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { ROLES, ROLE_LABELS } from "../../roles";

const STAFF_ROLES = Object.values(ROLES).filter((r) => r !== ROLES.ADMIN);

const EditStaffForm = ({ staff, onClose }) => {
  const dispatch = useDispatch();

  const { loading: staffLoading, error: staffError, successMessage: staffSuccess } =
    useSelector((state) => state.staff);
  const {
    loading: pwLoading, error: pwError, successMessage: pwSuccess,
    otpSent, resetSuccess,
  } = useSelector((state) => state.staffPassword);

  // ── edit form state ──
  const [form, setForm] = useState({
    name: staff.name,
    email: staff.email,
    phone: staff.phone || "",
    role: staff.role,
    status: staff.status,
  });

  // ── password reset state ──
  const [pwOpen, setPwOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);

  // close edit modal after successful update
  useEffect(() => {
    if (staffSuccess?.includes("updated")) {
      const t = setTimeout(() => {
        dispatch(clearStaffMessages());
        onClose();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [staffSuccess, dispatch, onClose]);

  // after reset success — collapse the section and clear
  useEffect(() => {
    if (resetSuccess) {
      const t = setTimeout(() => {
        setPwOpen(false);
        setOtp("");
        setNewPassword("");
        dispatch(clearPasswordState());
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [resetSuccess, dispatch]);

  // clean up password slice when modal closes
  useEffect(() => {
    return () => dispatch(clearPasswordState());
  }, [dispatch]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleUpdate = (e) => {
    e.preventDefault();
    dispatch(updateStaff({ id: staff._id, ...form }));
  };

  const handleInitiateReset = () => {
    dispatch(initiatePasswordReset(staff._id));
  };

  const handleVerifyReset = (e) => {
    e.preventDefault();
    dispatch(verifyOTPAndReset({ staffId: staff._id, otp, newPassword }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Edit Staff Member</h3>
            <p className="text-sm text-slate-500 mt-0.5">Update details for {staff.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Edit form banner ── */}
        {(staffError || staffSuccess) && (
          <div
            className={`mx-6 mt-4 px-4 py-3 rounded-xl text-sm font-semibold border ${staffError
                ? "bg-rose-50 text-rose-600 border-rose-100"
                : "bg-emerald-50 text-emerald-600 border-emerald-100"
              }`}
          >
            {staffError || staffSuccess}
          </div>
        )}

        {/* ── Edit Form ── */}
        <form onSubmit={handleUpdate} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={form.name}
                onChange={set("name")}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                pattern="[0-9]{10}"
                title="10-digit phone number"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Position / Role</label>
            <div className="relative">
              <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={form.role}
                onChange={set("role")}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white text-sm"
              >
                {STAFF_ROLES.map((roleValue) => (
                  <option key={roleValue} value={roleValue}>
                    {ROLE_LABELS[roleValue]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
            <select
              value={form.status}
              onChange={set("status")}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Update button */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={staffLoading.update}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {staffLoading.update && <Loader2 size={16} className="animate-spin" />}
              {staffLoading.update ? "Saving…" : "Update Staff"}
            </button>
          </div>
        </form>

        {/* ── Password Reset Section (collapsible) ── */}
        <div className="border-t border-slate-100 mx-6 mb-6">
          <button
            type="button"
            onClick={() => {
              setPwOpen((v) => !v);
              if (pwOpen) dispatch(clearPasswordState());
            }}
            className="w-full flex items-center justify-between py-4 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors group"
          >
            <span className="flex items-center gap-2">
              <KeyRound size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              Reset Staff Password
            </span>
            {pwOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {pwOpen && (
            <div className="space-y-4 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* password section banner */}
              {(pwError || pwSuccess) && (
                <div
                  className={`px-4 py-3 rounded-xl text-sm font-semibold border ${pwError
                      ? "bg-rose-50 text-rose-600 border-rose-100"
                      : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    }`}
                >
                  {pwError || pwSuccess}
                </div>
              )}

              {resetSuccess ? (
                <div className="flex flex-col items-center gap-2 py-4 text-emerald-600">
                  <ShieldCheck size={32} />
                  <p className="text-sm font-semibold">Password reset successfully!</p>
                </div>
              ) : !otpSent ? (
                /* Step 1 — request OTP */
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    An OTP will be sent to <strong>your admin email</strong>. Use it to
                    confirm and set a new password for <strong>{staff.name}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={handleInitiateReset}
                    disabled={pwLoading.initiate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {pwLoading.initiate && <Loader2 size={15} className="animate-spin" />}
                    {pwLoading.initiate ? "Sending OTP…" : "Send OTP to My Email"}
                  </button>
                </div>
              ) : (
                /* Step 2 — enter OTP + new password */
                <form onSubmit={handleVerifyReset} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Check your admin email for the 6-digit OTP. It expires in 10 minutes.
                  </p>

                  {/* OTP input */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      OTP Code
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit OTP"
                      maxLength={6}
                      required
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm tracking-[0.3em] font-mono text-center"
                    />
                  </div>

                  {/* New password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showNewPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        minLength={6}
                        required
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        dispatch(clearPasswordState());
                        setOtp("");
                        setNewPassword("");
                      }}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Resend OTP
                    </button>
                    <button
                      type="submit"
                      disabled={pwLoading.verify || otp.length < 6}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {pwLoading.verify && <Loader2 size={16} className="animate-spin" />}
                      {pwLoading.verify ? "Verifying…" : "Confirm Reset"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditStaffForm;
