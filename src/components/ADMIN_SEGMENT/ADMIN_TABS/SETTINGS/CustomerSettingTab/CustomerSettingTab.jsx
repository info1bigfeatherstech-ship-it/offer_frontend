import React, { useState } from 'react';
import { ChevronRight, X, UserCircle, Lock, UserPlus, Zap, CheckCircle2 } from 'lucide-react';

const CustomerSettingTab = () => {
  const [activeModal, setActiveModal] = useState(null);

  const closeModal = () => setActiveModal(null);

  const settings = [
    {
      id: "store-login",
      title: "Store login",
      description: "Manage how your customers can login to the store",
      icon: <UserCircle size={20} className="text-blue-500" />,
      isLocked: false,
    },
    {
      id: "invite-only",
      title: "Invite only",
      description: "Limit the access to your website to limited customers",
      icon: <UserPlus size={20} className="text-blue-500" />,
      isLocked: true, // This triggers the "Unlock now" button
    },
    {
      id: "lead-generation",
      title: "Lead generation",
      description: "Get customer leads by activating subscribe now popup",
      icon: <Zap size={20} className="text-blue-500" />,
      isLocked: false,
    }
  ];

  return (
    <div className="w-full p-8 font-sans">
      <h1 className="text-2xl  text-gray-900 mb-8">Customer settings</h1>

      {/* Main Container */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="divide-y divide-gray-100">
          {settings.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-6 py-6 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="hidden sm:block p-2.5 bg-blue-50 rounded-lg">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-sm  text-gray-800">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Action Side */}
              {item.isLocked ? (
                <button 
                  onClick={() => setActiveModal({...item, modalType: 'unlock'})}
                  className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg transition-all active:scale-95"
                >
                  <Lock size={14} />
                  <span className="text-xs ">Unlock now</span>
                </button>
              ) : (
                <button 
                  onClick={() => setActiveModal(item)}
                  className="p-2 text-gray-300 hover:text-blue-500 transition-colors cursor-pointer"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          ))}
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
                <h2 className="text-lg  text-gray-900">{activeModal.title}</h2>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              {activeModal.modalType === 'unlock' ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock size={32} />
                  </div>
                  <h3 className="text-xl  text-gray-900">Premium Feature</h3>
                  <p className="text-sm text-gray-500">
                    Invite-only access is a premium feature. Upgrade your plan to limit website access to specific customers.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-gray-500">
                    Configure your preferences for <span className=" text-gray-700">{activeModal.title}</span> below.
                  </p>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Enable feature</span>
                    <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 bg-white w-3 h-3 rounded-full shadow-sm" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button onClick={closeModal} className="px-5 py-2 text-sm  text-gray-500">
                {activeModal.modalType === 'unlock' ? "Maybe later" : "Cancel"}
              </button>
              <button 
                onClick={closeModal}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm  rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                {activeModal.modalType === 'unlock' ? "Upgrade Plan" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSettingTab;