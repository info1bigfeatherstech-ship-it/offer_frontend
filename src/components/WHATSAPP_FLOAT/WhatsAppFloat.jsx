// import React, { useState, useEffect } from 'react';
// import { X, MoreHorizontal, ShoppingBag } from 'lucide-react';

// const WhatsAppFloat = () => {
//     const [status, setStatus] = useState('hidden'); 
//     const [timeLeft, setTimeLeft] = useState(900); // 15 Minutes in seconds
//     const phoneNumber = "919320001717";
//     const message = "Hello! I have a query about a product.";

//     // WhatsApp SVG
//     const WhatsAppIcon = () => (
//         <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
//     );

//     // Format seconds into MM:SS
//     const formatTime = (seconds) => {
//         const mins = Math.floor(seconds / 60);
//         const secs = seconds % 60;
//         return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
//     };

//     useEffect(() => {
//         const hasVisited = sessionStorage.getItem('hasVisitedBABA');
//         if (!hasVisited) {
//             const delay = setTimeout(() => {
//                 setStatus('typing');
//                 setTimeout(() => {
//                     setStatus('visible');
//                     sessionStorage.setItem('hasVisitedBABA', 'true');
//                 }, 4000);
//             }, 10000);
//             return () => clearTimeout(delay);
//         }
//     }, []);

//     // 15 Min Countdown logic
//     useEffect(() => {
//         if (status === 'visible' && timeLeft > 0) {
//             const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
//             return () => clearTimeout(timer);
//         }
//     }, [status, timeLeft]);

//     const scrollToProducts = () => {
//         const element = document.getElementById('products-section');
//         if (element) {
//             element.scrollIntoView({ behavior: 'smooth' });
//         }
//     };

//     return (
//         <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 pointer-events-none">
            
//             {/* The Chat Bubble */}
//             {status !== 'hidden' && (
//                 <div className="relative animate-bounce-in bg-white text-black p-4 rounded-2xl shadow-2xl border border-gray-100 min-w-[140px] max-w-[240px] mb-1 pointer-events-auto">
//                     <button 
//                         onClick={() => setStatus('hidden')} 
//                         className="absolute -top-2 -left-2 bg-gray-100 rounded-full p-1 hover:bg-gray-200 cursor-pointer z-10 shadow-sm"
//                     >
//                         <X size={12} />
//                     </button>

//                     {status === 'typing' ? (
//                         <div className="flex items-center gap-2 text-gray-400 p-2">
//                             <span className="text-[10px] font-bold uppercase tracking-widest">Typing</span>
//                             <MoreHorizontal className="animate-pulse" size={20} />
//                         </div>
//                     ) : (
//                         <div className="animate-fade-in space-y-3">
//                             <p className="text-xs font-bold leading-tight">
//                                 Hey there! 👋 <br /> 
//                                 <span className="text-gray-500 font-medium text-[11px]">
//                                     Our Flash Deals are ending soon! 
//                                     <span className="text-red-500 block mt-1 font-bold">Ends in {formatTime(timeLeft)}</span>
//                                 </span>
//                             </p>
                            
//                             <button 
//                                 onClick={scrollToProducts}
//                                 className="flex items-center justify-center w-full gap-2 bg-black text-white px-4 py-2 rounded-xl shadow-lg cursor-pointer hover:bg-gray-800 transition-all active:scale-95 group"
//                             >
//                                 <ShoppingBag size={16} className="group-hover:animate-bounce" />
//                                 <span className="text-[10px] font-bold uppercase">Flash Deal</span>
//                             </button>
//                         </div>
//                     )}
                    
//                     {/* Speech Bubble Tail */}
//                     <div className="absolute bottom-[-8px] right-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white"></div>
//                 </div>
//             )}

//             {/* WhatsApp Main Button */}
//             <div className="relative group pointer-events-auto">
//                 <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 group-hover:animate-none"></div>
//                 <button
//                     onClick={() => window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank')}
//                     className="relative flex items-center justify-center w-16 h-16 bg-[#25D366] text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
//                 >
//                     <WhatsAppIcon />
//                 </button>
//             </div>

//             <style jsx>{`
//                 @keyframes bounce-in { 0% { opacity: 0; transform: translateY(20px) scale(0.8); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
//                 @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
//                 .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
//                 .animate-fade-in { animation: fade-in 0.3s ease-in forwards; }
//             `}</style>
//         </div>
//     );
// };

// export default WhatsAppFloat;


// import React, { useState, useEffect } from 'react';
// import { X, MoreHorizontal, ShoppingBag } from 'lucide-react';

// const WhatsAppFloat = () => {
//     const [status, setStatus] = useState('hidden'); 
//     const phoneNumber = "919320001717";
//     const message = "Hello! I have a query about a product.";

//     // WhatsApp SVG
//     const WhatsAppIcon = () => (
//         <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
//     );

//     useEffect(() => {
//         const hasVisited = sessionStorage.getItem('hasVisitedBABA');
//         if (!hasVisited) {
//             const delay = setTimeout(() => {
//                 setStatus('typing');
//                 setTimeout(() => {
//                     setStatus('visible');
//                     sessionStorage.setItem('hasVisitedBABA', 'true');
//                 }, 2000);
//             }, 10000);
//             return () => clearTimeout(delay);
//         }
//     }, []);

//     const scrollToProducts = () => {
//         const element = document.getElementById('products-section');
//         if (element) {
//             element.scrollIntoView({ behavior: 'smooth' });
//         }
//     };

//     return (
//         <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 pointer-events-none">
            
//             {/* Shop Now Button (Appears when message is visible) */}
//             {/* {status === 'visible' && (
//                 <button 
//                     onClick={scrollToProducts}
//                     className="animate-bounce-in flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full shadow-xl pointer-events-auto cursor-pointer hover:bg-gray-800 transition-all hover:-translate-y-1 active:scale-95 group"
//                 >
//                     <ShoppingBag size={18} className="group-hover:animate-bounce" />
//                     <span className="text-[11px] font-bold uppercase tracking-widest">Shop Now</span>
//                 </button>
//             )} */}

//             {/* The Chat Bubble */}
//             {status !== 'hidden' && (
//                 <div className="relative animate-bounce-in bg-white text-black p-4 rounded-2xl shadow-2xl border border-gray-100 min-w-[140px] max-w-[220px] mb-1 pointer-events-auto">
//                     <button onClick={() => setStatus('hidden')} className="absolute -top-2 -left-2 bg-gray-100 rounded-full p-1 hover:bg-gray-200 cursor-pointer z-10"><X size={12} /></button>
//                     {status === 'typing' ? (
//                         <div className="flex items-center gap-2 text-gray-400">
//                             <span className="text-[10px] font-bold uppercase tracking-widest">Typing</span>
//                             <MoreHorizontal className="animate-pulse" size={20} />
//                         </div>
//                     ) : (
//                         <p className="text-xs font-bold leading-tight animate-fade-in">
//                             Hey there! 👋 <br /> 
//                             <span className="text-gray-500 font-medium text-[11px]">Check out our latest collection below!</span><br /><br />
//                             <button 
//                     onClick={scrollToProducts}
//                     className="animate-bounce-in flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full shadow-xl pointer-events-auto cursor-pointer hover:bg-gray-800 transition-all active:scale-95 group"
//                 >
//                     <ShoppingBag size={18} className="group-hover:animate-bounce" />
//                     <span className="text-[11px] font-bold uppercase tracking-widest">See What's New</span>
//                 </button>
//                         </p>
//                     )}
//                     <div className="absolute bottom-[-8px] right-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white"></div>
//                 </div>
//             )}

//             {/* WhatsApp Main Button */}
//             <div className="relative group pointer-events-auto">
//                 <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20"></div>
//                 <button
//                     onClick={() => window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank')}
//                     className="relative flex items-center justify-center w-16 h-16 bg-[#25D366] text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
//                 >
//                     <WhatsAppIcon />
//                     {/* <span className="absolute top-1 right-1 flex h-4 w-4">
//                         <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></span>
//                         <span className="relative rounded-full h-4 w-4 bg-red-600 border-2 border-white"></span>
//                     </span> */}
//                 </button>
//             </div>

//             <style jsx>{`
//                 @keyframes bounce-in { 0% { opacity: 0; transform: translateY(20px) scale(0.8); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
//                 @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
//                 .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
//                 .animate-fade-in { animation: fade-in 0.3s ease-in forwards; }
//             `}</style>
//         </div>
//     );
// };

// export default WhatsAppFloat;

import React from 'react';
import { MessageCircle } from 'lucide-react';

const WhatsAppFloat = () => {
    const phoneNumber = "919320001717"; // Your client's number
    const message = "Hello! I have a query about a product."; // Default message

    const handleClick = () => {
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    //  WhatsApp SVG
    const WhatsAppIcon = () => (
        <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    );

    return (
        <div className="fixed bottom-6 right-6 z-[10] group">
            {/* Tooltip */}
            <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-black text-white text-[10px] font-bold py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap uppercase tracking-tighter">
                Chat with us
            </span>

            {/* Pulse Rings */}
            <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 group-hover:animate-none"></div>
            
            {/* Main Button */}
            <button
                onClick={handleClick}
                className="relative flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-[0_10px_25px_-5px_rgba(37,211,102,0.4)] hover:shadow-[0_15px_30px_-5px_rgba(37,211,102,0.6)] hover:scale-110 active:scale-95 transition-all duration-300"
                aria-label="Chat on WhatsApp"
            >
                <WhatsAppIcon size={30} fill="currentColor" />
                
                {/* Notification Dot */}
                {/* <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span> */}
            </button>

            <style>{`
                @keyframes ping {
                    75%, 100% {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default WhatsAppFloat;