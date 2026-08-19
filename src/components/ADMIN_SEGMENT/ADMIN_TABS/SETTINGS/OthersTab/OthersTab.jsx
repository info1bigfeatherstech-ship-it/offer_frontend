import React, { useState } from 'react';
import { ChevronRight, X, Info, ShieldCheck, FileText, LogOut, Store } from 'lucide-react';

const OthersTab = () => {
  const [activeModal, setActiveModal] = useState(null);

  const closeModal = () => setActiveModal(null);

  const menuItems = [
    {
      id: "about-us",
      title: "About us",
      icon: <Info size={20} className="text-blue-500" />,
      content: "Learn more about our platform, mission, and the team building your commerce experience."
    },
    {
      id: "privacy-policy-others",
      title: "Privacy policy",
      icon: <ShieldCheck size={20} className="text-blue-500" />,
      content: "Detailed information on how we handle your administrative data and account security."
    },
    {
      id: "terms-conditions-others",
      title: "Terms & conditions",
      icon: <FileText size={20} className="text-blue-500" />,
      content: "The legal framework governing your use of the merchant dashboard and services."
    }
  ];

  return (
    <div className="w-full p-8 font-sans">
      <h1 className="text-2xl text-gray-900 mb-8">Other settings</h1>

      <div className="space-y-6">
        {/* Main Links Group */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveModal(item)}
                className="w-full flex cursor-pointer items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-sm text-gray-800">{item.title}</span>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Separated Log Out Group */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <button 
            className="w-full flex cursor-pointer items-center justify-between px-6 py-5 hover:bg-red-50 transition-colors group"
            onClick={() => alert("Logging out...")}
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                <LogOut size={20} className="text-red-500" />
              </div>
              <span className="text-sm text-gray-800 group-hover:text-red-600">Log out</span>
            </div>
          </button>
        </div>

        {/* Store ID Footer */}
        <div className="pt-4 px-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-gray-400">
            <Store size={14} />
            <span className="text-xs font-medium uppercase tracking-widest">Store ID - 5656117</span>
          </div>
        </div>
      </div>

      {/* --- Dynamic Modal --- */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  {activeModal.icon}
                </div>
                <h2 className="text-lg text-gray-900">{activeModal.title}</h2>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              <div className="prose prose-sm text-gray-600">
                <p className="leading-relaxed">
                  {activeModal.content}
                </p>
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-400 uppercase tracking-tight">
                  Last updated: April 2026
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <button 
                onClick={closeModal}
                className="px-8 py-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl shadow-md transition-all active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OthersTab;