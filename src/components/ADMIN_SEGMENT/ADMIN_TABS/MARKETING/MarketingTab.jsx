
// ADMIN_TABS/MARKETING/MarketingTab.jsx (modified version)
import React, { useState } from 'react';
import { 
  Share2, Copy, Check, MousePointerClick, 
  Ticket, ShoppingBag, MessageSquare, 
  Search, MessageCircle, Users, QrCode,
  Facebook, BarChart3, Tag
} from 'lucide-react';
import CouponTab from './CouponTab/CouponTab';

const MarketingTab = () => {
  const [copied, setCopied] = useState(false);
  const [activeModule, setActiveModule] = useState(null);

  const handleCopy = () => {
    navigator.clipboard.writeText("https://offerwalebaba.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If coupon module is active, show coupon management
  if (activeModule === 'coupons') {
    return <CouponTab onBack={() => setActiveModule(null)} />;
  }

  const customerCards = [
    { title: "Stop your leaving customers", desc: "Reduce website exits", btn: "MANAGE", color: "bg-[#4B56D2]", icon: MousePointerClick, isNew: true, module: null },
    { title: "Create Coupons & Vouchers", desc: "Customers love discounts & offers.", btn: "CREATE NOW", color: "bg-[#FF5F5F]", icon: Ticket, module: 'coupons' },
    { title: "Manage your Google Shop", desc: "Start selling on Google", btn: "MANAGE", color: "bg-[#2EB069]", icon: ShoppingBag, module: null },
    { title: "SMS Marketing", desc: "Start your own sms campaign", btn: "CREATE NOW", color: "bg-[#F3921F]", icon: MessageSquare, module: null },
    { title: "Get found on Google Search with SEO tools", desc: "Boost your search ranking", btn: "GET STARTED", color: "bg-[#8D6BD4]", icon: Search, module: null },
    { title: "Grow your business by Whatsapp Marketing", desc: "Connect via WhatsApp", btn: "GET STARTED", color: "bg-[#245D51]", icon: MessageCircle, module: null },
    { title: "Get customer leads", desc: "Get leads with subscribe now popup", btn: "GET STARTED", color: "bg-[#7D214A]", icon: Users, module: null },
  ];

  return (
    <div className="bg-[#F8FAFC] min-h-screen p-6 font-sans">
      <div className="max-w-[1000px] mx-auto">
        
        {/* Share Link Header */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-900">
              <Share2 size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Share shop link with your customers</p>
              <p className="text-xs text-slate-500 font-medium">Your customers can view your shop & place their orders.</p>
              
              {/* Social Icons (SVGs) */}
              <div className="flex gap-3 mt-3 ">
                {/* WhatsApp */}
                <button className="text-[#25D366] cursor-pointer hover:scale-110 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.628 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                </button>
                {/* Facebook */}
                <button className="text-[#1877F2] cursor-pointer hover:scale-110 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </button>
                {/* Twitter / X */}
                <button className="text-slate-900 cursor-pointer hover:scale-110 transition-transform">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div className="text-right">
            <button 
              onClick={handleCopy}
              className={`min-w-[150px] transition-all cursor-pointer duration-300 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 mb-2 ml-auto shadow-sm ${
                copied ? "bg-emerald-500 text-white" : "bg-slate-900 text-white hover:bg-black"
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "COPIED" : "COPY STORE LINK"}
            </button>
            <a href='https://offerwalebaba.com' target='_blank' className="text-[15px] text-gray-600 font-medium ">https://offerwalebaba.com</a>
          </div>
        </div>

        {/* Section: Get More Customers */}
        <h2 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Get More Customers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          {customerCards.map((card, idx) => (
            <div 
              key={idx} 
              onClick={() => card.module && setActiveModule(card.module)}
              className={`${card.color} rounded-2xl cursor-pointer p-6 relative overflow-hidden flex flex-col justify-between min-h-[170px] shadow-sm hover:shadow-md transition-shadow group ${card.module ? 'cursor-pointer' : ''}`}
            >
              {card.isNew && (
                <span className="absolute top-4 left-4 bg-white text-slate-900 text-[9px] px-2 py-0.5 rounded-full font-black">NEW</span>
              )}
              <div className="flex justify-between items-start">
                <div className="max-w-[200px]">
                  <h3 className="text-white text-[15px] font-bold leading-tight mb-1 group-hover:translate-x-1 transition-transform">{card.title}</h3>
                  <p className="text-white/80 text-[11px] font-medium leading-relaxed">{card.desc}</p>
                </div>
                <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <card.icon size={28} strokeWidth={1.5} />
                </div>
              </div>
              <button className="bg-white text-slate-900 w-fit px-5 py-2 rounded-xl text-[11px] font-bold shadow-sm hover:scale-105 transition-all">
                {card.btn}
              </button>
            </div>
          ))}
        </div>

        {/* Section: Marketing Assets */}
        <h2 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Marketing Assets</h2>
        <div className="flex gap-4 mb-12">
          <div className="bg-[#48A9A6] w-28 h-28 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:brightness-95 transition-all shadow-sm group">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 text-white group-hover:rotate-12 transition-transform">
              <QrCode size={24} />
            </div>
            <p className="text-[11px] text-white font-bold leading-tight">Get Store QR</p>
          </div>
        </div>

        {/* Section: Marketing Integrations */}
        <h2 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Marketing Integrations</h2>
        <div className="flex flex-wrap gap-5">
          {[
            { label: "Facebook Business", color: "bg-[#7199B9]", icon: Facebook },
            { label: "Google Analytics", color: "bg-[#F3921F]", icon: BarChart3 },
            { label: "Tag Manager", color: "bg-[#4B8BF5]", icon: Tag },
          ].map((item, idx) => (
            <div key={idx} className={`${item.color} w-28 h-28 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:scale-95 transition-all shadow-sm`}>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-2 text-white">
                <item.icon size={22} />
              </div>
              <p className="text-[10px] text-white font-bold leading-tight px-1">{item.label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default MarketingTab;

// down code is just for ui showcase upper code handle coupon code tab
// import React, { useState } from 'react';
// import { 
//   Share2, Copy, Check, MousePointerClick, 
//   Ticket, ShoppingBag, MessageSquare, 
//   Search, MessageCircle, Users, QrCode,
//   Facebook, BarChart3, Tag
// } from 'lucide-react';

// const MarketingTab = () => {
//   const [copied, setCopied] = useState(false);

//   const handleCopy = () => {
//     navigator.clipboard.writeText("https://offerwalebaba.com");
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   };

//   const customerCards = [
//     { title: "Stop your leaving customers", desc: "Reduce website exits", btn: "MANAGE", color: "bg-[#4B56D2]", icon: MousePointerClick, isNew: true },
//     { title: "Create Coupons & Vouchers", desc: "Customers love discounts & offers.", btn: "CREATE NOW", color: "bg-[#FF5F5F]", icon: Ticket },
//     { title: "Manage your Google Shop", desc: "Start selling on Google", btn: "MANAGE", color: "bg-[#2EB069]", icon: ShoppingBag },
//     { title: "SMS Marketing", desc: "Start your own sms campaign", btn: "CREATE NOW", color: "bg-[#F3921F]", icon: MessageSquare },
//     { title: "Get found on Google Search with SEO tools", desc: "Boost your search ranking", btn: "GET STARTED", color: "bg-[#8D6BD4]", icon: Search },
//     { title: "Grow your business by Whatsapp Marketing", desc: "Connect via WhatsApp", btn: "GET STARTED", color: "bg-[#245D51]", icon: MessageCircle },
//     { title: "Get customer leads", desc: "Get leads with subscribe now popup", btn: "GET STARTED", color: "bg-[#7D214A]", icon: Users },
//   ];

//   return (
//     <div className="bg-[#F8FAFC] min-h-screen p-6 font-sans">
//       <div className="max-w-[1000px] mx-auto">
        
//         {/* Share Link Header */}
//         <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm mb-10 flex items-center justify-between">
//           <div className="flex items-center gap-4">
//             <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-900">
//               <Share2 size={24} strokeWidth={2.5} />
//             </div>
//             <div>
//               <p className="text-sm font-semibold text-slate-900">Share shop link with your customers</p>
//               <p className="text-xs text-slate-500 font-medium">Your customers can view your shop & place their orders.</p>
              
//               {/* Social Icons (SVGs) */}
//               <div className="flex gap-3 mt-3 ">
//                 {/* WhatsApp */}
//                 <button className="text-[#25D366] cursor-pointer hover:scale-110 transition-transform">
//                   <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.628 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
//                 </button>
//                 {/* Facebook */}
//                 <button className="text-[#1877F2] cursor-pointer hover:scale-110 transition-transform">
//                   <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
//                 </button>
//                 {/* Twitter / X */}
//                 <button className="text-slate-900 cursor-pointer hover:scale-110 transition-transform">
//                   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
//                 </button>
//               </div>
//             </div>
//           </div>

//           <div className="text-right">
//             <button 
//               onClick={handleCopy}
//               className={`min-w-[150px] transition-all cursor-pointer duration-300 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 mb-2 ml-auto shadow-sm ${
//                 copied ? "bg-emerald-500 text-white" : "bg-slate-900 text-white hover:bg-black"
//               }`}
//             >
//               {copied ? <Check size={16} /> : <Copy size={16} />}
//               {copied ? "COPIED" : "COPY STORE LINK"}
//             </button>
//             <a href='https://offerwalebaba.com' target='_blank' className="text-[15px] text-gray-600 font-medium ">https://offerwalebaba.com</a>
//           </div>
//         </div>

//         {/* Section: Get More Customers */}
//         <h2 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Get More Customers</h2>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
//           {customerCards.map((card, idx) => (
//             <div key={idx} className={`${card.color} rounded-2xl cursor-pointer p-6 relative overflow-hidden flex flex-col justify-between min-h-[170px] shadow-sm hover:shadow-md transition-shadow group`}>
//               {card.isNew && (
//                 <span className="absolute top-4 left-4 bg-white text-slate-900 text-[9px] px-2 py-0.5 rounded-full font-black">NEW</span>
//               )}
//               <div className="flex justify-between items-start">
//                 <div className="max-w-[200px]">
//                   <h3 className="text-white text-[15px] font-bold leading-tight mb-1 group-hover:translate-x-1 transition-transform">{card.title}</h3>
//                   <p className="text-white/80 text-[11px] font-medium leading-relaxed">{card.desc}</p>
//                 </div>
//                 <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 transition-transform">
//                   <card.icon size={28} strokeWidth={1.5} />
//                 </div>
//               </div>
//               <button className="bg-white cursor-pointer text-slate-900 w-fit px-5 py-2 rounded-xl text-[11px] font-bold shadow-sm hover:scale-105 transition-all">
//                 {card.btn}
//               </button>
//             </div>
//           ))}
//         </div>

//         {/* Section: Marketing Assets */}
//         <h2 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Marketing Assets</h2>
//         <div className="flex gap-4 mb-12">
//           <div className="bg-[#48A9A6] w-28 h-28 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:brightness-95 transition-all shadow-sm group">
//             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 text-white group-hover:rotate-12 transition-transform">
//               <QrCode size={24} />
//             </div>
//             <p className="text-[11px] text-white font-bold leading-tight">Get Store QR</p>
//           </div>
//         </div>

//         {/* Section: Marketing Integrations */}
//         <h2 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Marketing Integrations</h2>
//         <div className="flex flex-wrap gap-5">
//           {[
//             { label: "Facebook Business", color: "bg-[#7199B9]", icon: Facebook },
//             { label: "Google Analytics", color: "bg-[#F3921F]", icon: BarChart3 },
//             { label: "Tag Manager", color: "bg-[#4B8BF5]", icon: Tag },
//           ].map((item, idx) => (
//             <div key={idx} className={`${item.color} w-28 h-28 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:scale-95 transition-all shadow-sm`}>
//               <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-2 text-white">
//                 <item.icon size={22} />
//               </div>
//               <p className="text-[10px] text-white font-bold leading-tight px-1">{item.label}</p>
//             </div>
//           ))}
//         </div>

//       </div>
//     </div>
//   );
// };

// export default MarketingTab;

