import React, { useEffect } from 'react';
import { Edit2, ChevronRight, CheckCircle2 } from 'lucide-react';
import LOGO from "../../../../../assets/logo2.png"; // Your user/store logo

const ProfileTab = () => {
  
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // Adds smooth animation
    });
  }, []);
  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Page Title */}
        <h1 className="text-xl font-bold mb-6 text-gray-900">Profile settings</h1>

        {/* ─── Profile Section ─────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-400">Profile</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Main Header Row with Logo */}
            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-xl border border-gray-200 overflow-hidden bg-white flex items-center justify-center p-2 shadow-sm">
                    <img src={LOGO} alt="Store Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                  <button className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#3b82f6] text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-md hover:bg-blue-700 transition-colors whitespace-nowrap">
                    Change logo
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 uppercase">Offer Wale Baba</h3>
                  <p className="text-sm text-gray-500 font-medium">9370686008</p>
                  <p className="text-xs text-gray-400 mt-1">Store ID - 5656117</p>
                </div>
              </div>
              <button className="text-blue-600 text-sm font- hover:text-blue-800">Edit</button>
            </div>

            {/* Simple Rows */}
            <ProfileRow label="Display number" value="9320001717" />

            {/* Email Row with Verified Badge */}
            <div className="p-6 flex items-start justify-between group">
              <div>
                <p className="text-[11px] font- text-gray-400 uppercase tracking-wider mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4 opacity-70" alt="G" />
                  <span className="text-sm text-gray-700 font-medium">support.offerwalebaba@gmail.com</span>
                  <span className="bg-green-50 text-green-600 text-[10px] px-2 py-0.5 rounded border border-green-100 font-bold uppercase tracking-tighter">Verified</span>
                </div>
              </div>
              <button className="text-blue-600 text-sm font-bold hover:text-blue-800">Edit</button>
            </div>

            {/* Store Description Row */}
            <div className="p-6 flex items-start justify-between group">
              <div className="max-w-2xl">
                <p className="text-[11px]  text-gray-400 uppercase tracking-wider mb-1">Store description</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Email: support.offerwalebaba@gmail.com Welcome to OWB OfferWaleBaba! The World of Offers. 
                  We invite you to avail all the best offers displayed by us with the safest Payment Gateways. 
                  We started in the year 2015...
                </p>
              </div>
              <button className="text-blue-600 text-sm font-bold hover:text-blue-800">Edit</button>
            </div>

            <ProfileRow label="Store address" value="OfferWaleBaba OWB, ULHASNAGAR, Maharashtra - 421004" />
            <ProfileRow label="Business type" value="Mobile & Electronics, Clothing & Fashion, Others" />
            <ProfileRow label="Social media" value="Facebook, Instagram, YouTube, Telegram, WhatsApp" />
          </div>
        </section>

        {/* ─── Billing & Verification Section ─────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-200">
            <h2 className="text-sm  text-gray-400">Billing & verification</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {/* KYC Row */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">KYC</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm  text-gray-800 tracking-tight">GSTIN: *********</span>
                  <CheckCircle2 size={16} className="text-green-500" />
                </div>
              </div>
              <span className="bg-green-50 text-green-600 text-[10px] px-2 py-1 rounded border border-green-100 font-bold uppercase tracking-wider">KYC Verified</span>
            </div>

            {/* Bank Row */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px text-gray-400 uppercase tracking-wider mb-1">Bank account</p>
                <p className="text-sm text-gray-700 font-medium">OfferWaleBaba OWB</p>
                <p className="text-sm text-gray-400 font-mono tracking-widest uppercase">XXXXXXXX399</p>
              </div>
              <button className="text-blue-600 text-sm font-bold hover:text-blue-800">Edit</button>
            </div>

            {/* Invoice Link */}
            <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all group">
              <div>
                <p className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">My invoices</p>
                <p className="text-xs text-gray-400 mt-0.5">Manage invoices for your subscriptions</p>
              </div>
              <ChevronRight size={20} className="text-blue-500 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

// Sub-component for repetitive text rows
const ProfileRow = ({ label, value }) => (
  <div className="p-6 flex items-start justify-between group">
    <div>
      <p className="text-[11px] font text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-700 font-medium">{value}</p>
    </div>
    <button className="text-blue-600 text-sm font-bold hover:text-blue-800 transition-colors">Edit</button>
  </div>
);

export default ProfileTab;