
/**
 * CreateStaffForm.jsx
 * Fully independent modal — dispatches createStaff thunk directly.
 * Closes itself on success via useEffect watching successMessage.
 * Props: onClose() only.
 */

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createStaff, clearStaffMessages } from "../../ADMIN_REDUX_MANAGEMENT/staffSlice";
import { X, User, Mail, Phone, Briefcase, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { ROLES, ROLE_LABELS } from "../../roles";
// Staff-assignable roles = everything except ADMIN
const STAFF_ROLES = Object.values(ROLES).filter((r) => r !== ROLES.ADMIN);

const CreateStaffForm = ({ onClose }) => {
  const dispatch = useDispatch();
  const { loading, error, successMessage } = useSelector((state) => state.staff);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", role: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  // close on success
  useEffect(() => {
    if (successMessage?.includes("created")) {
      const t = setTimeout(() => {
        dispatch(clearStaffMessages());
        onClose();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [successMessage, dispatch, onClose]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(createStaff(form));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Add New Staff</h3>
            <p className="text-sm text-slate-500 mt-0.5">Create a new staff account</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error / Success banner */}
        {(error || successMessage) && (
          <div
            className={`mx-6 mt-4 px-4 py-3 rounded-xl text-sm font-semibold border ${error
                ? "bg-rose-50 text-rose-600 border-rose-100"
                : "bg-emerald-50 text-emerald-600 border-emerald-100"
              }`}
          >
            {error || successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={form.name}
                onChange={set("name")}
                placeholder="Priya Sharma"
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="priya@company.com"
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="9876543210"
                pattern="[0-9]{10}"
                title="10-digit phone number"
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="Min. 6 characters"
                minLength={6}
                required
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Position / Role
            </label>
            <div className="relative">
              <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={form.role}
                onChange={set("role")}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white text-sm"
              >
                <option value="">Select position</option>
                {STAFF_ROLES.map((roleValue) => (
                  <option key={roleValue} value={roleValue}>
                    {ROLE_LABELS[roleValue]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
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
              disabled={loading.create}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading.create && <Loader2 size={16} className="animate-spin" />}
              {loading.create ? "Creating…" : "Create Staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStaffForm;
