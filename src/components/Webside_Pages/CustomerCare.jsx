import React, { useEffect } from 'react';
import { 
  Package, 
  RefreshCw, 
  MapPin, 
  CreditCard, 
  UserCircle, 
  HelpCircle, 
  ArrowUpRight
} from 'lucide-react';

export default function CustomerCare() {
  useEffect(() => {
    // Initialize AOS
    if (window.AOS) {
      window.AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 100,
      });
    }
  }, []);

  const supportCategories = [
    {
      icon: <Package className="text-red-500" size={24} />,
      title: "Order Management",
      desc: "Real-time shipment monitoring",
      detail: "Modify active requests or request cancellation",
      action: "Track & Edit",
      bgColor: "bg-orange-50/40",
      borderColor: "border-orange-100"
    },
    {
      icon: <RefreshCw className="text-blue-500" size={24} />,
      title: "Returns & Exchanges",
      desc: "Initiate product reversals",
      detail: "Generate digital return labels & documentation",
      action: "Start Return",
      bgColor: "bg-blue-50/40",
      borderColor: "border-blue-100"
    },
    {
      icon: <MapPin className="text-green-600" size={24} />,
      title: "Delivery Destinations",
      desc: "Refine your logistics profile",
      detail: "Update residency details & navigation landmarks",
      action: "Manage Locations",
      bgColor: "bg-green-50/40",
      borderColor: "border-green-100"
    },
    {
      icon: <CreditCard className="text-purple-600" size={24} />,
      title: "Transaction Methods",
      desc: "Configure financial preferences",
      detail: "Refresh expired credentials or update payment tools",
      action: "Secure Vault",
      bgColor: "bg-purple-50/40",
      borderColor: "border-purple-100"
    },
    {
      icon: <UserCircle className="text-slate-700" size={24} />,
      title: "Identity & Security",
      desc: "Refine account credentials",
      detail: "Update communication email or primary password",
      action: "Edit Profile",
      bgColor: "bg-slate-50/40",
      borderColor: "border-slate-200"
    }
  ];

  useEffect(()=>{
    window.scrollTo({ top:0, behavior:"smooth"})
  }, []) ;

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-800 font-sans selection:bg-[#f7a221] selection:text-white">
      
      {/* --- AMBIENT HEADER GRADIENT --- */}
      <div className="absolute top-0 left-0 right-0 h-[450px] bg-gradient-to-b from-[#f7a221]/10 via-[#f7a221]/5 to-transparent pointer-events-none"></div>

      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          {/* PREMIUM HEADER */}
          <div className="text-center mb-12 sm:mb-16">
            <div 
              className="inline-flex items-center gap-3 px-4 py-2 sm:px-5 sm:py-2 rounded-full bg-white border border-slate-200 shadow-sm mb-6 sm:mb-8"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f7a221] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f7a221]"></span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">
                Concierge Desk
              </span>
            </div>
            
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl  mb-4 sm:mb-6 uppercase"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              Elite Support & <span className="text-[#f7a221] ">Seamless Solutions</span>
            </h1>
            <p 
              className="text-slate-500 text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed px-4"
              data-aos="fade-up"
              data-aos-delay="300"
            >
              Tailored assistance for the modern Indian lifestyle. Select a department below to manage your <span className='underline animate-bounce text-[#f7a221]'>OFFER WALE BABA</span> experience.
            </p>
          </div>
          
          {/* GRID WITH STAGGERED ANIMATION */}
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 mb-16 sm:mb-20 md:mb-24">
            {supportCategories.map((item, idx) => (
              <div
                key={idx}
                className={`group relative bg-white border ${item.borderColor} ${item.bgColor} p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] transition-all duration-500 hover:shadow-2xl hover:shadow-[#f7a221]/10 cursor-pointer flex flex-col 
                w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)]`}
                data-aos="fade-up"
                data-aos-delay={(idx * 100) + 400}
              >
                {/* Icon Container */}
                <div className="p-3 sm:p-4 bg-white w-fit rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm mb-6 sm:mb-8 group-hover:border-[#f7a221] transition-all duration-500">
                  <div className="group-hover:text-white transition-colors duration-500">
                    {item.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-grow">
                  <h3 className="text-lg sm:text-xl font- mb-2 uppercase group-hover:text-[#f7a221] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-slate-900 font-bold text-xs sm:text-sm mb-2 group-hover:translate-x-1 transition-transform">
                    {item.desc}
                  </p>
                  <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed mb-6 sm:mb-8">
                    {item.detail}
                  </p>
                </div>

                {/* Action Button */}
                <button className="flex items-center justify-between w-full bg-slate-900 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-[0.2em] hover:bg-[#f7a221] transition-all duration-300 shadow-lg shadow-black/5">
                  {item.action}
                  <ArrowUpRight size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            ))}
          </div>
          
          {/* FAQ SECTION */}
          <div 
            className="bg-white border border-slate-200 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-10 lg:p-16 shadow-sm relative overflow-hidden group"
            data-aos="fade-up"
            data-aos-delay="600"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#f7a221]/5 rounded-full blur-3xl group-hover:bg-[#f7a221]/10 transition-colors"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl flex items-center gap-3 sm:gap-4 uppercase ">
                <HelpCircle className="text-[#f7a221] sm:w-8 sm:h-8" size={28}  /> 
                Standard <span className="text-[#f7a221] not-italic">Protocols</span>
              </h2>
              <p className="text-slate-400 text-xs  uppercase ">Knowledge Base 2026</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-x-8 sm:gap-x-16 gap-y-6 sm:gap-y-10">
              {[
                { q: "What is your return window?", a: "Items may be returned within 7 days of receipt, provided they remain in pristine, merchantable condition." },
                { q: "How are logistics handled?", a: "Our premium delivery network ensures transit within 3 to 5 business days for all metropolitan regions." },
                { q: "Are bulk acquisitions supported?", a: "Professional trade accounts and high-volume orders are managed by our specialized B2B division." },
                { q: "Security of financial data?", a: "We employ banking-grade 256-bit encryption protocols to safeguard every transaction." }
              ].map((faq, idx) => (
                <div 
                  key={idx} 
                  className="group/item"
                  data-aos="fade-up"
                  data-aos-delay={(idx * 100) + 1000}
                >
                  <h3 className="text-sm sm:text-base font-bold mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3 group-hover/item:text-[#f7a221] transition-colors">
                    <span className="h-1 w-1 rounded-full bg-[#f7a221]"></span>
                    {faq.q}
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-medium pl-3 sm:pl-4 border-l border-slate-100">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// import React from 'react';
// import { Phone, Mail, MessageCircle, Clock, HelpCircle } from 'lucide-react';

// export default function CustomerCare() {
//   return (
//     <div className="min-h-screen bg-gradient-to-b from-primary/5 via-white to-primary/5 pt-6">
//       <div className="container mx-auto px-4 py-12">
//         <div className="max-w-4xl mx-auto">
//           <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6 text-center">
//             Your Support, Our Priority
//           </h1>
//           <p className="text-gray-600 mb-12 text-center max-w-2xl mx-auto">
//             We're here to help you! Choose your preferred way to get support.
//           </p>
          
//           <div className="grid md:grid-cols-2 gap-6 mb-12">
//             {[
//               {
//                 icon: <Phone className="text-secondary" size={24} />,
//                 title: "Your Orders",
//                 desc: "Available 24/7",
//                 detail: "+91 91730 00000",
//                 action: "Call Now",
//                 color: "bg-blue-50 border-blue-100"
//               },
//               {
//                 icon: <Mail className="text-accent" size={24} />,
//                 title: "Return and Refunds",
//                 desc: "Response within 24 hours",
//                 detail: "support@offerwale.com",
//                 action: "Send Email",
//                 color: "bg-green-50 border-green-100"
//               },
//               {
//                 icon: <MessageCircle className="text-purple-500" size={24} />,
//                 title: "Manage Address",
//                 desc: "Instant help",
//                 detail: "Chat with our team",
//                 action: "Start Chat",
//                 color: "bg-purple-50 border-purple-100"
//               },
//               {
//                 icon: <Clock className="text-orange-500" size={24} />,
//                 title: "Payment Settings",
//                 desc: "Monday - Sunday",
//                 detail: "9:00 AM - 11:00 PM IST",
//                 action: "View Time",
//                 color: "bg-orange-50 border-orange-100"
//               },
//             ].map((item, idx) => (
//               <div
//                 key={idx}
//                 className={`${item.color} p-5 rounded-xl border hover:shadow-md transition-shadow cursor-pointer`}
//               >
//                 <div className="flex items-start gap-3">
//                   <div className="p-2 bg-white rounded-lg">
//                     {item.icon}
//                   </div>
//                   <div>
//                     <h3 className="text-lg font-bold text-gray-800 mb-1">{item.title}</h3>
//                     <p className="text-gray-600 mb-2">{item.desc}</p>
//                     <p className="font-semibold text-primary mb-3">{item.detail}</p>
//                     <button className="bg-secondary text-white px-4 py-1.5 rounded-full font-semibold hover:bg-secondary/90 transition-colors text-sm">
//                       {item.action}
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
          
//           {/* FAQ Section */}
//           <div className="bg-white rounded-xl p-6 border">
//             <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
//               <HelpCircle className="text-secondary" /> Frequently Asked Questions
//             </h2>
//             <div className="space-y-3">
//               {[
//                 { q: "What is your return policy?", a: "We offer 7-day easy returns for all products." },
//                 { q: "How long does shipping take?", a: "Delivery within 5-7 business days across India." },
//                 { q: "Do you offer bulk discounts?", a: "Yes, contact our bulk inquiry team for special rates." }
//               ].map((faq, idx) => (
//                 <div key={idx} className="border-b pb-3">
//                   <h3 className="font-bold text-gray-800 mb-1">{faq.q}</h3>
//                   <p className="text-gray-600">{faq.a}</p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }