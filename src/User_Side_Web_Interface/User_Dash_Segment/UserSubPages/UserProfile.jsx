import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { User, Mail, Phone, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
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

// ─────────────────────────────────────────────────────────────────────────────
// UserProfile Component
// ─────────────────────────────────────────────────────────────────────────────
const UserProfile = () => {
  const dispatch = useDispatch();

  // ── Redux state ───────────────────────────────────────────────────────────
  const { user, loading: authLoading, error: authError } = useSelector((s) => s.auth);

  // ── Local form state ──────────────────────────────────────────────────────
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');

  // ── Local UI state ────────────────────────────────────────────────────────
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState(null);
  const [saveSuccess,   setSaveSuccess]   = useState(false);
  const [isDirty,       setIsDirty]       = useState(false);

  // ── Fetch user on mount if not already in Redux ───────────────────────────
  useEffect(() => {
    if (!user) {
      console.log('👤 [UserProfile] no user in state — fetching /auth/me');
      dispatch(fetchMe())
        .unwrap()
        .then((d) => console.log(`✅ [UserProfile] user loaded: "${d.user?.name}"`))
        .catch((e) => logError('fetchMe on mount', e));
    }
  }, [dispatch, user]);

  // ── Populate form when user loads ─────────────────────────────────────────
  useEffect(() => {
    if (user) {
      setName(user.name  ?? '');
      setPhone(user.phone ?? '');
      setIsDirty(false);
      console.log(`✅ [UserProfile] form populated for "${user.name}"`);
    }
  }, [user]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }, []);

  // ── Track dirty state ─────────────────────────────────────────────────────
  const handleNameChange  = (v) => { setName(v);  setIsDirty(true); setSaveSuccess(false); setSaveError(null); };
  const handlePhoneChange = (v) => { setPhone(v); setIsDirty(true); setSaveSuccess(false); setSaveError(null); };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!isDirty || saving) return;

    // Basic validation
    if (!name.trim()) { setSaveError('Name cannot be empty'); return; }
    if (name.trim().length < 2) { setSaveError('Name must be at least 2 characters'); return; }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const result = await dispatch(updateProfile({
        name:  name.trim(),
        phone: phone.trim(),
      })).unwrap();

      console.log(`✅ [UserProfile] profile updated: "${result.user?.name}"`);

      // Update auth state with fresh user data
      if (result.user) {
        setName(result.user.name   ?? name);
        setPhone(result.user.phone ?? phone);
      }

      setIsDirty(false);
      setSaveSuccess(true);

      // Auto-hide success after 3s
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      logError('handleSave', err, { name, phone });
      setSaveError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Reset form to current user data ──────────────────────────────────────
  const handleReset = () => {
    if (!user) return;
    setName(user.name  ?? '');
    setPhone(user.phone ?? '');
    setIsDirty(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state — user not fetched yet
  // ─────────────────────────────────────────────────────────────────────────
  if (authLoading && !user) {
    return (
      <div className="max-w-2xl">
        <div className="h-8 w-56 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-80 bg-gray-100 rounded animate-pulse mb-10" />
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={i === 2 ? 'col-span-full' : ''}>
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch error with no user
  // ─────────────────────────────────────────────────────────────────────────
  if (authError && !user) {
    return (
      <div className="max-w-2xl flex flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertCircle size={36} className="text-red-300" />
        <p className="text-gray-500 font-medium">{authError || 'Failed to load profile'}</p>
        <button
          onClick={() => { dispatch(clearError()); dispatch(fetchMe()); }}
          className="flex items-center gap-2 bg-[#F7A221] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-2xl hover:bg-black transition-colors active:scale-95"
        >
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Personal Settings</h1>
      <p className="text-gray-500 font-medium mb-10">
        Update your information to ensure a smooth checkout experience.
      </p>

      <form onSubmit={handleSave} noValidate>
        <div className="space-y-8">

          {/* ── Avatar section (display only — upload not yet supported) ── */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gray-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  // Initials avatar
                  <span className="text-2xl font-black text-gray-400 uppercase select-none">
                    {user?.name?.charAt(0) ?? <User size={40} className="text-gray-300" />}
                  </span>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-black text-gray-900">{user?.name ?? '—'}</h4>
              <p className="text-xs text-gray-400 font-bold mt-0.5">{user?.email ?? '—'}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                {user?.role === 'admin' ? '🔑 Admin' : ''}
              </p>
            </div>
          </div>

          {/* ── Save error ── */}
          {saveError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-semibold text-red-600 flex-1">{saveError}</p>
              <button
                type="button"
                onClick={() => setSaveError(null)}
                className="text-red-300 hover:text-red-500 transition-colors"
              >
                ×
              </button>
            </div>
          )}

          {/* ── Save success ── */}
          {saveSuccess && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
              <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-green-700">Profile updated successfully!</p>
            </div>
          )}

          {/* ── Form fields ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="profile-name" className="text-[11px] font-black uppercase text-gray-400 ml-1 flex items-center gap-1.5">
                <User size={11} /> Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter your full name"
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-orange-400 focus:bg-white rounded-2xl outline-none font-bold transition-all placeholder:font-normal placeholder:text-gray-300"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="profile-phone" className="text-[11px] font-black uppercase text-gray-400 ml-1 flex items-center gap-1.5">
                <Phone size={11} /> Phone Number
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-orange-400 focus:bg-white rounded-2xl outline-none font-bold transition-all placeholder:font-normal placeholder:text-gray-300"
              />
            </div>

            {/* Email — read only, cannot be changed */}
            <div className="col-span-full space-y-2">
              <label className="text-[11px] font-black uppercase text-gray-400 ml-1 flex items-center gap-1.5">
                <Mail size={11} /> Email Address
                <span className="text-[9px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full ml-1 normal-case tracking-normal font-bold">
                  Cannot be changed
                </span>
              </label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full p-4 bg-gray-100 border-2 border-transparent rounded-2xl font-bold text-gray-400 cursor-not-allowed select-none"
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="submit"
              disabled={!isDirty || saving}
              className={`flex items-center gap-2 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                !isDirty || saving
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-black text-white hover:bg-[#F7A221] shadow-gray-200'
              }`}
            >
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
                : 'Save Changes'
              }
            </button>

            {isDirty && !saving && (
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
            )}
          </div>

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