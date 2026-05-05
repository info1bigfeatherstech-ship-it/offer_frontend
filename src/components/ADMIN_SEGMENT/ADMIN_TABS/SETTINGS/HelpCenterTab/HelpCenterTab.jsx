import React, { useEffect, useState } from 'react';
import { X, Mail, MessageCircle, ArrowLeft, LifeBuoy, Lightbulb, Phone, MoreHorizontal } from 'lucide-react';

const HelpCenterTab = ({ onBack }) => {
  const [showContactModal, setShowContactModal] = useState(false);


  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // Adds smooth animation
    });
  }, []);
  const contactOptions = [
    {
      id: 'email',
      label: 'Email',
      icon: <Mail size={18} className="text-white" />,
      action: () => window.location.href = "mailto:support.offerwalebaba@gmail.com",
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: <MessageCircle size={18} className="text-white" />,
      action: () => window.open("https://wa.me/9370686008", "_blank"),
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header Area */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-800" />
        </button>
        <h1 className="text-xl  text-gray-900">For Your Assistance</h1>
      </header>

      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h2 className="text-lg  text-gray-900">Need Help?</h2>
          <p className="text-sm text-gray-400 mt-1">For any issue, support or grievances.</p>
        </div>

        {/* Contact Button Trigger */}
        <button
          onClick={() => setShowContactModal(true)}
          className="bg-black text-white cursor-pointer px-8 py-2.5 rounded-full text-sm  hover:bg-gray-800 transition-all active:scale-95 shadow-lg"
        >
          Contact Us
        </button>

        {/* Informational Grid (Optional, based on sidebar items) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
          {[
            { title: "Help center", icon: <LifeBuoy className="text-blue-500" />, desc: "Browse our documentation" },
            { title: "Suggest ideas", icon: <Lightbulb className="text-yellow-500" />, desc: "Help us improve the product" },
            { title: "Other", icon: <MoreHorizontal className="text-gray-500" />, desc: "Frequently asked questions" }
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-colors cursor-pointer">
              <div className="p-3 bg-gray-50 rounded-xl">{item.icon}</div>
              <div>
                <h3 className=" text-gray-800 text-sm">{item.title}</h3>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Contact Modal (Directly matching your screenshot) --- */}
      {showContactModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowContactModal(false)}
              className="absolute cursor-pointer top-4 right-4 bg-black text-white rounded-full p-1 hover:scale-110 transition-transform"
            >
              <X size={16} />
            </button>

            <div className="p-10">
              <h3 className="text-center  text-gray-900 mb-8">How Do You Want To Contact Us ?</h3>
              
              <div className="space-y-4">
                {contactOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={opt.action}
                    className="w-full bg-black cursor-pointer text-white py-3 rounded-full flex items-center justify-center gap-3 hover:bg-gray-800 transition-colors group"
                  >
                    <div className="group-hover:scale-110 transition-transform">
                      {opt.icon}
                    </div>
                    <span className="text-sm font-medium tracking-wide">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpCenterTab;