// import React, { useState, useEffect, useRef } from 'react';
// import { ArrowRight, Flame } from 'lucide-react';

// const PromoSection = () => {
//     const [isInView, setIsInView] = useState(false);
//     const sectionRef = useRef(null);

//     useEffect(() => {
//         const observer = new IntersectionObserver(
//             ([entry]) => {
//                 if (entry.isIntersecting) {
//                     setIsInView(true);
//                 }
//             },
//             { threshold: 0.1 }
//         );

//         if (sectionRef.current) {
//             observer.observe(sectionRef.current);
//         }

//         return () => observer.disconnect();
//     }, []);

//     const promoItems = [
//         { title: "Smart Toys", subtitle: "Trending Now", img: "https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=600&auto=format&fit=crop" },
//         { title: "Tech Gadgets", subtitle: "Starting ₹99", img: "https://images.unsplash.com/photo-1593642702749-b7d2a5482bb3?q=80&w=600&auto=format&fit=crop" },
//         { title: "Home Decor", subtitle: "Flat 50% Off", img: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=600&auto=format&fit=crop" },
//         { title: "Premium Style", subtitle: "New Arrivals", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop" }
//     ];

//     return (
//         <section className="space-y-6 md:space-y-12 px-4 py-8 overflow-hidden">
//             {/* Main Promo Banner */}
//             <div
//                 ref={sectionRef}
//                 className={`relative h-[500px] md:h-[650px] rounded-[2rem] md:rounded-[4rem] overflow-hidden transition-all duration-1000 ease-out border border-white/5 bg-black ${
//                     isInView 
//                         ? 'opacity-100 scale-100 translate-y-0' 
//                         : 'opacity-0 scale-[0.98] translate-y-10'
//                 }`}
//             >
//                 <img
//                     src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1200&auto=format&fit=crop"
//                     alt="Promotion"
//                     className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale"
//                     loading="lazy"
//                 />
                
//                 <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/70 to-transparent"></div>
                
//                 <div className={`absolute inset-0 flex flex-col justify-end md:justify-center p-6 sm:p-10 md:p-20 space-y-4 transition-all duration-1000 delay-300 ${
//                     isInView 
//                         ? 'opacity-100 translate-x-0' 
//                         : 'opacity-0 -translate-x-10'
//                 }`}>
//                     <div className="flex items-center gap-2 text-[#f7a221] font-black text-[10px] md:text-xs uppercase tracking-[0.3em] mb-2">
//                         <Flame size={14} fill="currentColor" /> UPGRADE YOUR LIFE
//                     </div>
                    
//                     <h2 className="text-white text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black leading-[0.8] tracking-tighter uppercase">
//                         OFFERWALE <br />
//                         <span 
//                             className="text-transparent flicker-text" 
//                             style={{ WebkitTextStroke: '1.5px #f7a221' }}
//                         >
//                            BABA
//                         </span>
//                     </h2>

//                     <div className="pt-4 md:pt-8 space-y-6">
//                         <p className="text-gray-400 max-w-sm md:max-w-md text-sm md:text-xl font-medium leading-tight">
//                             India's trusted electronics hub. <br className="hidden md:block" />
//                             <span className="text-white font-bold">Unbeatable deals. Curated quality.</span>
//                         </p>

//                         <button className="bg-[#f7a221] hover:bg-white text-black font-black px-8 py-4 md:px-10 md:py-5 rounded-full w-fit transition-all duration-500 flex items-center gap-3 text-[10px] md:text-xs tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(247,162,33,0.4)] group">
//                             EXPLORE THE DROP 
//                             <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             {/* Promo Grid Cards - Responsive 4-Column Logic */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
//                 {promoItems.map((promo, idx) => (
//                     <div
//                         key={idx}
//                         className={`group relative h-64 md:h-80 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/5 transition-all duration-700 ${
//                             isInView 
//                                 ? 'opacity-100 translate-y-0' 
//                                 : 'opacity-0 translate-y-10'
//                         }`}
//                         style={{ transitionDelay: `${(idx + 1) * 150}ms` }}
//                     >
//                         <img 
//                             src={promo.img} 
//                             className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[30%] group-hover:grayscale-0" 
//                             alt={promo.title}
//                             loading="lazy"
//                         />
//                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"></div>
//                         <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
//                             <h5 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none group-hover:text-[#f7a221] transition-colors mb-1">
//                                 {promo.title}
//                             </h5>
//                             <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f7a221] opacity-90">
//                                 {promo.subtitle}
//                             </p>
//                         </div>
//                     </div>
//                 ))}
//             </div>

//             <style jsx>{`
//                 .flicker-text {
//                     animation: flicker 3s linear infinite;
//                 }
//                 @keyframes flicker {
//                     0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% {
//                         opacity: 1;
//                         filter: drop-shadow(0 0 8px rgba(247, 162, 33, 0.6));
//                     }
//                     20%, 21.999%, 63%, 63.999%, 65%, 69.999% {
//                         opacity: 0.3;
//                         filter: none;
//                     }
//                 }
//             `}</style>
//         </section>
//     );
// };

// export default PromoSection;

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Flame } from 'lucide-react';

const PromoSection = () => {
    const [isInView, setIsInView] = useState(false);
    const sectionRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                }
            },
            { threshold: 0.1 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const promoItems = [
        { title: "Smart      Toys", subtitle: "Trending Now", img: "https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=600&auto=format&fit=crop" },
        { title: "Tech       Gadgets", subtitle: "Starting ₹99", img: "https://images.unsplash.com/photo-1593642702749-b7d2a5482bb3?q=80&w=600&auto=format&fit=crop" },
        { title: "Home       Decor", subtitle: "Flat 50% Off", img: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=600&auto=format&fit=crop" },
        { title: "Premium    Style", subtitle: "New Arrivals", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop" }
    ];

    return (
        <section className="space-y-6 md:space-y-12 px-4 py-8 overflow-hidden">
            {/* Main Promo Banner */}
            <div
                ref={sectionRef}
                className={`relative h-[500px] md:h-[650px] rounded-[2rem] md:rounded-[4rem] overflow-hidden transition-all duration-1000 ease-out border border-white/5 bg-black ${
                    isInView 
                        ? 'opacity-100 scale-100 translate-y-0' 
                        : 'opacity-0 scale-[0.98] translate-y-10'
                }`}
            >
                <img
                    src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1200&auto=format&fit=crop"
                    alt="Promotion"
                    className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale"
                    loading="lazy"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/70 to-transparent"></div>
                
                <div className={`absolute inset-0 flex flex-col justify-end md:justify-center p-6 sm:p-10 md:p-20 space-y-4 transition-all duration-1000 delay-300 ${
                    isInView 
                        ? 'opacity-100 translate-x-0' 
                        : 'opacity-0 -translate-x-10'
                }`}>
                    <div className="flex items-center gap-2 text-[#f7a221] font-black text-[10px] md:text-xs uppercase tracking-[0.3em] mb-2">
                        <Flame size={14} fill="currentColor" /> UPGRADE YOUR LIFE WITH
                    </div>
                    
                    <h2 className="text-white text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black leading-[0.8] tracking-tighter uppercase">
                        OFFER WALE   <br />
                        <span 
                            className="text-transparent flicker-text" 
                            style={{ WebkitTextStroke: '1.5px #f7a221' }}
                        >
                           BABA
                        </span>
                    </h2>

                    <div className="pt-4 md:pt-8 space-y-6">
                        <p className="text-gray-400 max-w-sm md:max-w-md text-sm md:text-xl font-medium leading-tight">
                            India's trusted electronics hub. <br className="hidden md:block" />
                            <span className="text-white font-bold">Unbeatable deals. Curated quality.</span>
                        </p>

                        <button className="bg-[#f7a221] hover:bg-white text-black font-black px-8 py-4 md:px-10 md:py-5 rounded-full w-fit transition-all duration-500 flex items-center gap-3 text-[10px] md:text-xs tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(247,162,33,0.4)] group">
                            EXPLORE THE DROP 
                            <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Promo Grid Cards - Responsive 4-Column Logic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {promoItems.map((promo, idx) => (
                    <div
                        key={idx}
                        className={`group relative h-64 md:h-80 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/5 transition-all duration-700 ${
                            isInView 
                                ? 'opacity-100 translate-y-0' 
                                : 'opacity-0 translate-y-10'
                        }`}
                        style={{ transitionDelay: `${(idx + 1) * 150}ms` }}
                    >
                        <img 
                            src={promo.img} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[30%] group-hover:grayscale-0" 
                            alt={promo.title}
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"></div>
                        <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                            <h5 style={{textAlign:"center"}} className="text-2xl md:text-3xl  font-black   group-hover:text-[#f7a221] transition-colors mb-1">
                                {promo.title}
                            </h5>
                            <p style={{textAlign:"center"}} className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f7a221] opacity-90">
                                {promo.subtitle}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .flicker-text {
                    animation: flicker 3s linear infinite;
                }
                @keyframes flicker {
                    0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% {
                        opacity: 1;
                        filter: drop-shadow(0 0 8px rgba(247, 162, 33, 0.6));
                    }
                    20%, 21.999%, 63%, 63.999%, 65%, 69.999% {
                        opacity: 0.3;
                        filter: none;
                    }
                }
            `}</style>
        </section>
    );
};

export default PromoSection;

