import React, { useState } from 'react';
import { ChevronRight, X, ShoppingCart, MapPinned, CheckCircle2, Info } from 'lucide-react';

const OrderSettingTab = () => {
  const [activeModal, setActiveModal] = useState(null);

  const closeModal = () => setActiveModal(null);

  const orderSettings = [
    {
      id: "order-type",
      title: "Order type",
      description: "Prepaid Orders",
      actionType: "text", // "Change" link style
      actionLabel: "Change",
      icon: <ShoppingCart size={20} className="text-blue-500" />,
      modalContent: "Select whether you want to accept Prepaid orders only, Cash on Delivery, or both."
    },
    {
      id: "address-fields",
      title: "Customer address fields",
      description: "Select the information you want to collect from customers when they place an order",
      actionType: "icon", // Chevron style
      icon: <MapPinned size={20} className="text-blue-500" />,
      modalContent: "Toggle fields like Landmark, Pincode, or Alternate Phone Number for your checkout page."
    }
  ];

  return (
    <div className="w-full p-8 font-sans">
      <h1 className="text-2xl text-gray-900 mb-8">Order settings</h1>

      {/* Main Settings Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="divide-y divide-gray-100">
          {orderSettings.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-6 py-5 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="hidden sm:block p-2 bg-blue-50 rounded-lg">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-sm text-gray-800">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Action Side */}
              <button 
                onClick={() => setActiveModal(item)}
                className="flex items-center cursor-pointer group"
              >
                {item.actionType === "text" ? (
                  <span className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
                    {item.actionLabel}
                  </span>
                ) : (
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* --- Order Specific Modal --- */}
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
              <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100 mb-6">
                <Info className="text-blue-600 shrink-0" size={18} />
                <p className="text-xs text-blue-800 leading-relaxed">
                  {activeModal.modalContent}
                </p>
              </div>
              
              <div className="space-y-4">
                {activeModal.id === "order-type" ? (
                  <div className="space-y-3">
                    {["Prepaid Orders", "Cash on Delivery", "Any"].map((type) => (
                      <label key={type} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer">
                        <span className="text-sm font-medium text-gray-700">{type}</span>
                        <input type="radio" name="orderType" defaultChecked={type === "Prepaid Orders"} className="w-4 h-4 text-blue-600" />
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {["Landmark", "Pincode", "GST Number", "Alt Phone"].map((field) => (
                      <div key={field} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <input type="checkbox" className="rounded text-blue-600" />
                        <span className="text-xs font-medium text-gray-600">{field}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button onClick={closeModal} className="px-5 py-2 text-sm text-gray-500">Cancel</button>
              <button 
                onClick={closeModal}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSettingTab;