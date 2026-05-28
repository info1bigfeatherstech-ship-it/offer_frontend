import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { User, Save, X, Mail, Phone, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import axiosInstance from '../../../SERVICES/axiosInstance';
import { fetchMe, clearError } from '../../../components/REDUX_FEATURES/REDUX_SLICES/authSlice';

// ─────────────────────────────────────────────────────────────────────────────
// updateProfile thunk — add this to your authSlice.js instead if preferred,
// but defined here to keep UserProfile fully self-contained
// PUT /api/auth/profile  { name, phone }
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ name, phone }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put('/auth/profile', { name, phone });
      if (!res.data.success)
        throw new Error(res.data.message || 'Failed to update profile');
      return res.data; // { success, user }
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: err.message || 'Failed to update profile' }
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const logError = (context, error, info = {}) => {
  console.group(`🔴 [UserProfile] ERROR in ${context}`);
  console.error('Error:', error);
  console.log('Info:', info);
  console.groupEnd();
  
};
const Avatar = ({ user }) => (
  <div className="relative shrink-0">
    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-100 border-2 border-white shadow flex items-center justify-center overflow-hidden">
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <span className="text-xl sm:text-2xl font-black text-gray-400 uppercase select-none">
          {user?.name?.charAt(0) ?? <User size={32} className="text-gray-300" />}
        </span>
      )}
    </div>
    {user?.role === 'admin' && (
      <span className="absolute -bottom-1 -right-1 bg-amber-400 text-[9px] font-black text-amber-900 px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none">
        Admin
      </span>
    )}
  </div>
);
 
const Field = ({ id, label, icon: Icon, children }) => (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor={id}
      className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1"
    >
      <Icon size={11} aria-hidden="true" />
      {label}
    </label>
    {children}
  </div>
);
 
const Skeleton = () => (
  <div className="w-full max-w-2xl animate-pulse">
    <div className="h-7 w-48 bg-gray-200 rounded mb-2" />
    <div className="h-4 w-72 bg-gray-100 rounded mb-8" />
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-200 shrink-0" />
      <div className="space-y-2 flex-1 min-w-0">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-3 w-44 bg-gray-100 rounded" />
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className={i === 2 ? 'sm:col-span-2' : ''}>
          <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
          <div className="h-12 bg-gray-100 rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);
// ─────────────────────────────────────────────────────────────────────────────
// UserProfile Component
// ─────────────────────────────────────────────────────────────────────────────
const UserProfile = () => {
  const dispatch = useDispatch();
  const { user, loading: authLoading, error: authError } = useSelector((s) => s.auth);
 
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
 
  useEffect(() => {
    if (!user) {
      dispatch(fetchMe())
        .unwrap()
        .catch((e) => logError('fetchMe on mount', e));
    }
  }, [dispatch, user]);
 
  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setPhone(user.phone ?? '');
      setIsDirty(false);
    }
  }, [user]);
 
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
 
  const markDirty = () => { setIsDirty(true); setSaveSuccess(false); setSaveError(null); };
  const handleNameChange  = (v) => { setName(v);  markDirty(); };
  const handlePhoneChange = (v) => { setPhone(v); markDirty(); };
 
  const handleSave = async (e) => {
    e.preventDefault();
    if (!isDirty || saving) return;
    if (!name.trim())            { setSaveError('Name cannot be empty'); return; }
    if (name.trim().length < 2)  { setSaveError('Name must be at least 2 characters'); return; }
 
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const result = await dispatch(updateProfile({ name: name.trim(), phone: phone.trim() })).unwrap();
      if (result.user) { setName(result.user.name ?? name); setPhone(result.user.phone ?? phone); }
      setIsDirty(false); setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      logError('handleSave', err, { name, phone });
      setSaveError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };
 
  const handleReset = () => {
    if (!user) return;
    setName(user.name ?? ''); setPhone(user.phone ?? '');
    setIsDirty(false); setSaveError(null); setSaveSuccess(false);
  };
 
  // ── Loading ────────────────────────────────────────────────────────────────
  if (authLoading && !user) return <Skeleton />;
 
  // ── Error ──────────────────────────────────────────────────────────────────
  if (authError && !user) {
    return (
      <div className="w-full max-w-2xl flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
        <AlertCircle size={32} className="text-red-300" />
        <p className="text-gray-500 font-medium text-sm">{authError || 'Failed to load profile'}</p>
        <button
          onClick={() => { dispatch(clearError()); dispatch(fetchMe()); }}
          className="inline-flex items-center gap-2 bg-[#F7A221] text-white text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-black transition-colors active:scale-95"
        >
          <RefreshCw size={13} /> Try Again
        </button>
      </div>
    );
  }
 
  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="w-full font-['satoshi'] font-semibold max-w-2xl">
 
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">Personal Settings</h1>
        <p className="text-sm text-gray-500 font-medium">
          Update your information to ensure a smooth checkout experience.
        </p>
      </div>
 
      <form onSubmit={handleSave} noValidate className="space-y-6 sm:space-y-8">
 
        {/* Identity card */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <Avatar user={user} />
          <div className="min-w-0">
            <h4 className="font-black text-gray-900 truncate">{user?.name ?? '—'}</h4>
            <p className="text-xs text-gray-400 font-medium truncate mt-0.5">{user?.email ?? '—'}</p>
          </div>
        </div>
 
        {/* Alerts */}
        {saveError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm font-semibold text-red-600 flex-1 leading-snug">{saveError}</p>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="text-red-300 hover:text-red-500 transition-colors p-0.5 -mr-1 -mt-0.5"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}
 
        {saveSuccess && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <CheckCircle2 size={15} className="text-green-500 shrink-0" />
            <p className="text-sm font-semibold text-green-700">Profile updated successfully!</p>
          </div>
        )}
 
        {/* Form fields — stack on mobile, 2-col on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
 
          {/* Full Name */}
          <Field id="profile-name" label="Full Name" icon={User}>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
              className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent focus:border-orange-400 focus:bg-white rounded-xl outline-none font-semibold text-sm transition-all placeholder:font-normal placeholder:text-gray-300"
            />
          </Field>
 
          {/* Phone */}
          <Field id="profile-phone" label="Phone Number" icon={Phone}>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              autoComplete="tel"
              inputMode="tel"
              className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent focus:border-orange-400 focus:bg-white rounded-xl outline-none font-semibold text-sm transition-all placeholder:font-normal placeholder:text-gray-300"
            />
          </Field>
 
          {/* Email — read only, full width */}
          <div className="sm:col-span-2">
            <Field id="profile-email" label="Email Address" icon={Mail}>
              {/* Badge sits to the right of the label */}
              <div className="relative">
                <input
                  id="profile-email"
                  type="email"
                  value={user?.email ?? ''}
                  disabled
                  className="w-full px-4 py-3.5 bg-gray-100 border-2 border-transparent rounded-xl font-semibold text-sm text-gray-400 cursor-not-allowed select-none pr-36"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-gray-200 text-gray-400 px-2 py-1 rounded-full font-bold whitespace-nowrap">
                  Cannot be changed
                </span>
              </div>
            </Field>
          </div>
        </div>
 
        {/* Actions — full-width on mobile, auto on sm+ */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 pt-1">
 
          {isDirty && !saving && (
            <button
              type="button"
              onClick={handleReset}
              className="sm:order-first flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 active:scale-95"
            >
              Cancel
            </button>
          )}
 
          <button
            type="submit"
            disabled={!isDirty || saving}
            className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
              !isDirty || saving
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-[#F7A221] shadow-sm shadow-gray-200'
            }`}
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><Save size={14} /> Save Changes</>
            }
          </button>
        </div>
 
      </form>
    </div>
  );
};
 
export default UserProfile;
// // UserSubPages/UserProfile.jsx
// import React from 'react';
// import { Camera, Mail, Phone, Calendar,User } from 'lucide-react';

// const UserProfile = () => {
//     return (
//         <div className="max-w-2xl">
//             <h1 className="text-3xl font-black text-gray-900 mb-2">Personal Settings</h1>
//             <p className="text-gray-500 font-medium mb-10">Update your information to ensure a smooth checkout experience.</p>

//             <div className="space-y-8">
//                 {/* Avatar Section */}
//                 <div className="flex items-center gap-6">
//                     <div className="relative">
//                         <div className="w-24 h-24 rounded-3xl bg-gray-100 border-4 border-white shadow-md flex items-center justify-center">
//                             <User size={40} className="text-gray-300" />
//                         </div>
//                         <button className="absolute -bottom-2 -right-2 bg-black text-white p-2 rounded-xl border-4 border-white hover:bg-[#F7A221] transition-colors">
//                             <Camera size={16} />
//                         </button>
//                     </div>
//                     <div>
//                         <h4 className="font-black text-gray-900">Profile Photo</h4>
//                         <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">JPG, PNG or GIF • Max 1MB</p>
//                     </div>
//                 </div>

//                 {/* Form Grid */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div className="space-y-2">
//                         <label className="text-[11px] font-black uppercase text-gray-400 ml-1">Full Name</label>
//                         <input type="text" defaultValue="John Doe" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-orange-400 focus:bg-white rounded-2xl outline-none font-bold transition-all" />
//                     </div>
//                     <div className="space-y-2">
//                         <label className="text-[11px] font-black uppercase text-gray-400 ml-1">Phone Number</label>
//                         <input type="text" defaultValue="+91 98765 43210" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-orange-400 focus:bg-white rounded-2xl outline-none font-bold transition-all" />
//                     </div>
//                     <div className="col-span-full space-y-2">
//                         <label className="text-[11px] font-black uppercase text-gray-400 ml-1">Email Address</label>
//                         <input type="email" defaultValue="john.doe@example.com" disabled className="w-full p-4 bg-gray-100 border-2 border-transparent rounded-2xl font-bold text-gray-400 cursor-not-allowed" />
//                     </div>
//                 </div>

//                 <button className="bg-black text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#F7A221] shadow-lg shadow-gray-200 transition-all active:scale-95">
//                     Save Changes
//                 </button>
//             </div>
//         </div>
//     );
// };

// export default UserProfile;