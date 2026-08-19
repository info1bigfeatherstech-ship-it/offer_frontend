import React, { useState } from 'react';
import { ChevronRight, X, FileCheck, Undo2, Ban, Truck, ShieldAlert, FileText, Lock } from 'lucide-react';

const StorePolicyTab = () => {
  const [activeModal, setActiveModal] = useState(null);

  const closeModal = () => setActiveModal(null);

  const sections = [
    {
      title: "Order policies",
      items: [
        {
          id: "return-policy",
          title: "Return & refund policy",
          description: "Set a policy for order returns & refunds",
          icon: <Undo2 size={20} className="text-blue-500" />,
          content: "Define the timeframe and conditions under which customers can request returns or refunds."
        },
        {
          id: "cancellation-policy",
          title: "Order cancellation & rejection policy",
          description: "Set a policy for order cancellations & rejections",
          icon: <Ban size={20} className="text-blue-500" />,
          content: "Specify the rules for canceling orders before shipment and your rights to reject specific orders."
        },
        {
          id: "shipping-payment-policy",
          title: "Shipping & payment policy",
          description: "Set a policy for order shipping & payment",
          icon: <Truck size={20} className="text-blue-500" />,
          content: "Detail your shipping timelines, carrier partners, and accepted payment methods/terms."
        },
        {
          id: "invoice-disclaimer",
          title: "Invoice Disclaimer Policy",
          description: "Set your own customized disclaimer for your GST invoice",
          icon: <ShieldAlert size={20} className="text-blue-500" />,
          content: "Add legal disclaimers that will appear at the bottom of every generated GST invoice."
        }
      ]
    },
    {
      title: "General policies",
      items: [
        {
          id: "terms-conditions",
          title: "Terms & conditions",
          description: "Set your store's terms and conditions",
          icon: <FileText size={20} className="text-blue-500" />,
          content: "The master legal agreement between you and your customers regarding the use of your store."
        },
        {
          id: "privacy-policy",
          title: "Privacy policy",
          description: "Set your store's privacy policy",
          icon: <Lock size={20} className="text-blue-500" />,
          content: "Explain how you collect, use, and protect customer data in compliance with privacy laws."
        }
      ]
    }
  ];

  return (
    <div className="w-full p-8 font-sans">
      <h1 className="text-2xl  text-gray-900 mb-8">Store policies</h1>

      <div className="space-y-6">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Section Header */}
            <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-200">
              <span className="text-xs  text-gray-500 uppercase tracking-widest">
                {section.title}
              </span>
            </div>

            {/* Section Items */}
            <div className="divide-y divide-gray-100">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveModal(item)}
                  className="w-full flex items-center cursor-pointer justify-between px-6 py-5 hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block p-2 bg-blue-50 rounded-lg">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-sm  text-gray-800 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* --- Policy Modal System --- */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
              <div className="mb-6">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2">Policy Description</label>
                <p className="text-sm text-gray-600 ">
                  "{activeModal.content}"
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs  text-gray-700">Policy Content</label>
                  <textarea 
                    rows={6}
                    placeholder={`Write your ${activeModal.title.toLowerCase()} here...`}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button onClick={closeModal} className="px-5 py-2 text-sm  text-gray-500">Cancel</button>
              <button 
                onClick={closeModal}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm  rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <FileCheck size={16} />
                Publish Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePolicyTab;