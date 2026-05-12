import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllCategories,
  selectHierarchicalCategories,
} from "../REDUX_FEATURES/REDUX_SLICES/userCategoriesSlice";
import { useEffect } from "react";
import { useState } from "react";

const Categories = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [endIndex, setendIndex] = useState(10);
  const handleCategories = (category)=>{

    setcategories1([...categories1, slicedCategories])
    setendIndex( prev => prev + 5);
    
    const slug =
      category.slug || category.name?.toLowerCase().replace(/\s+/g, "-");
    navigate(`/category/${slug}`);
  }
  const categories = useSelector(selectHierarchicalCategories);
const visibleCategories = categories.slice(0, endIndex);
  // console.log("categories", categories.slice(0,endIndex+1));
  // console.log("categories", categories);
  
  const { loading, error } = useSelector((state) => state.userCategories);

  // useEffect(() => {
  //   dispatch(fetchAllCategories()).catch((err) => {
  //     console.error("❌ Categories fetch failed:", err);
  //   });
  // }, [dispatch]);

 useEffect(() => {
  if (categories.length === 0) {
    dispatch(fetchAllCategories()).catch((err) => {
      console.error("❌ Categories fetch failed:", err);
    });
  }
}, [dispatch]);

const CATEGORY_THUMBNAILS = {
  "home-and-kitchen": "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572784/sve/frere/Home_Kitchen.jpg",
  "smart-life-gadgets": "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572772/sve/frere/Smart_Life_Gadget.jpg",
  "fashion-world": "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572775/sve/frere/Fashion.jpg",
  "sports-and-fitness": "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572776/sve/frere/sports_Fitness.jpg",
  "tours-and-travels": "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572778/sve/frere/tours_travels.jpg",
  "stationary": "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572785/sve/frere/Stationary.jpg",
  "baby-items": "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572780/sve/frere/Baby_Items.jpg",
  "cleaning-&housekeeping-supplies": "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572769/sve/frere/Cleaning_housekeeping_supplies.jpg",
  "gifts": "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572782/sve/frere/Gift.jpg",
  "mix-items": "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572771/sve/frere/mix_items.jpg",
  "car-accessories": "https://res.cloudinary.com/dmjxnhbsi/image/upload/v1778572774/sve/frere/Car_Accessories.jpg",
};

  const handleCategoryClick = (category) => {
    const slug =
      category.slug || category.name?.toLowerCase().replace(/\s+/g, "-");
    navigate(`/category/${slug}`);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading.categories) {
    return (
      <div className="w-full bg-white py-8 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-center mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-full aspect-square rounded-2xl bg-gray-200 animate-pulse" />
                <div className="h-3 w-20 bg-gray-200 rounded mt-3 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
if (error.categories) {
  return (
    <div className="w-full py-8 flex flex-col items-center gap-3">
      <p className="text-sm text-gray-500">Failed to load categories</p>
      <button
        onClick={() => dispatch(fetchAllCategories())}
        className="px-5 py-2 bg-black text-white cursor-pointer text-sm font-semibold rounded-xl hover:bg-[#F7A221] transition"
      >
        Retry
      </button>
    </div>
  );
}
  // ── Empty ────────────────────────────────────────────────────────────────
  if (!categories || categories.length === 0) return null;

  // ── Main Render ──────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-white py-8 md:py-1 overflow-hidden">
      <section className="container mx-auto px-4">

        {/* Header */}
        <div className="flex flex-row items-center justify-center mb-8 md:mb-12">
          <h3 className="text-xl sm:text-2xl md:text-4xl font-lato flex items-center gap-2 md:gap-4 text-gray-900">
            <span className="w-2 h-8 md:w-3 md:h-12 bg-[#f7a221] rounded-full shadow-[0_0_15px_rgba(247,162,33,0.3)]" />
            Top Categories
          </h3>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6 lg:gap-8 max-w-7xl mx-auto">
          {visibleCategories.map((cat, idx) => (
            <div
              key={cat._id || idx}
              onClick={() => handleCategoryClick(cat)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleCategoryClick(cat)}
              className="flex flex-col items-center group cursor-pointer transition-all duration-300 w-full max-w-[180px] mx-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7a221] rounded-2xl"
            >
              <div className="w-full aspect-square rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] flex items-center justify-center transition-all shadow-sm group-hover:shadow-md group-hover:-translate-y-1 overflow-hidden relative border border-gray-100">
                <img
                  // src={cat.image?.url || cat.img || "/placeholder-category.jpg"}
                                      src={
                      CATEGORY_THUMBNAILS[cat.slug] ||
                      cat.image?.url ||
                      "/placeholder-category.jpg"
                    }
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-[#f7a221]/0 group-hover:bg-[#f7a221]/5 transition-colors duration-300" />
              </div>
              <span className="text-[9px] md:text-[11px] font-bold mt-3 group-hover:text-[#f7a221] text-gray-600 text-center uppercase tracking-tight md:tracking-wider transition-colors duration-300 leading-tight line-clamp-2 px-1">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
        {endIndex < categories.length && (
  <div className="flex justify-center mt-8">
    <button
      onClick={() => setendIndex((prev) => prev + 5)}
      className="px-6 py-2 cursor-pointer rounded-xl bg-black text-white text-sm font-semibold hover:bg-[#F7A221] transition"
    >
      View More
    </button>
  </div>
)}

      </section>
    </div>
  );
};

export default Categories;
// API INTEGRATETION 


// import React, { useState, useEffect, useRef } from 'react';
// import { ArrowRight } from 'lucide-react';
// import { categories } from '../../data';

// const Categories = () => {
//     const [isInView, setIsInView] = useState(false);
//     const sectionRef = useRef(null);
//     const [pathIndex, setPathIndex] = useState(0);

//     const paths = [
//         "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
//         "M0,60 C400,0 800,120 1200,60 L1200,120 L0,120 Z",
//         "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z"
//     ];

//     // Intersection Observer for fade-in animation
//     useEffect(() => {
//         const observer = new IntersectionObserver(
//             ([entry]) => {
//                 if (entry.isIntersecting) {
//                     setIsInView(true);
//                     observer.disconnect();
//                 }
//             },
//             { threshold: 0.1 }
//         );

//         if (sectionRef.current) {
//             observer.observe(sectionRef.current);
//         }

//         return () => observer.disconnect();
//     }, []);

//     // SVG path animation
//     useEffect(() => {
//         const interval = setInterval(() => {
//             setPathIndex((prev) => (prev + 1) % paths.length);
//         }, 3333); 

//         return () => clearInterval(interval);
//     }, [paths.length]);

//     return (
//         <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//             <section
//                 ref={sectionRef}
//                 className={`container mx-auto px-4 transition-all duration-700 ease-out ${
//                     isInView 
//                         ? 'opacity-100 translate-y-0' 
//                         : 'opacity-0 translate-y-10'
//                 }`}
//             >
//                 {/* Header Section - Responsive Flex */}
//                 <div className="flex flex-row items-center justify-center mb-8 md:mb-12 gap-2">
//                     <h3 className="text-xl sm:text-2xl md:text-4xl font-lato flex items-center gap-2 md:gap-4 text-gray-900">
//                         <span className="w-2 h-8 md:w-3 md:h-12 bg-[#f7a221] rounded-full shadow-[0_0_15px_rgba(247,162,33,0.3)]"></span>
//                         Top Categories
//                     </h3>
//                     {/* <button className="text-[#f7a221] font-black flex items-center gap-1 md:gap-2 group text-[10px] md:text-sm uppercase tracking-wider transition-all whitespace-nowrap">
//                         Explore All <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
//                     </button> */}
//                 </div>

//                 {/* Categories Grid - Responsive with consistent item sizes */}
//                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6 lg:gap-8 max-w-7xl mx-auto">
//                     {categories.map((cat, idx) => (
//                         <div
//                             key={idx}
//                             className="flex flex-col items-center group cursor-pointer transition-all duration-300 w-full max-w-[180px] mx-auto"
//                         >
//                             <div className={`w-full aspect-square ${cat.color} rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] flex items-center justify-center transition-all shadow-sm group-hover:shadow-md group-hover:-translate-y-1 overflow-hidden relative border border-gray-100`}>
//                                 <img 
//                                     src={cat.img} 
//                                     alt={cat.name} 
//                                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
//                                 />
//                                 <div className="absolute inset-0 bg-[#f7a221]/0 group-hover:bg-[#f7a221]/5 transition-colors duration-300"></div>
//                             </div>
                            
//                             <span className="text-[9px] md:text-[11px] font-bold mt-3 group-hover:text-[#f7a221] text-gray-600 text-center uppercase tracking-tight md:tracking-wider transition-colors duration-300 leading-tight line-clamp-2 px-1">
//                                 {cat.name}
//                             </span>
//                         </div>
//                     ))}
//                 </div>
//             </section>

//             {/* Visual Divider */}
//             <div className="relative h-12 md:h-20 overflow-hidden mt-10">
//                 <svg 
//                     viewBox="0 0 1200 120" 
//                     preserveAspectRatio="none" 
//                     className="absolute bottom-0 w-full h-full text-gray-50"
//                 >
//                     <path
//                         d={paths[pathIndex]}
//                         fill="currentColor"
//                         style={{ transition: 'd 3333ms ease-in-out' }}
//                     />
//                 </svg>
//             </div>
//         </div>
//     );
// };

// export default Categories;






// import React, { useState, useEffect, useRef } from 'react';
// import { ArrowRight } from 'lucide-react';
// import { categories } from '../../data';

// const Categories = () => {
//     const [isInView, setIsInView] = useState(false);
//     const sectionRef = useRef(null);
//     const [pathIndex, setPathIndex] = useState(0);

//     const paths = [
//         "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
//         "M0,60 C400,0 800,120 1200,60 L1200,120 L0,120 Z",
//         "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z"
//     ];

//     // Intersection Observer for fade-in animation
//     useEffect(() => {
//         const observer = new IntersectionObserver(
//             ([entry]) => {
//                 if (entry.isIntersecting) {
//                     setIsInView(true);
//                     observer.disconnect();
//                 }
//             },
//             { threshold: 0.1 }
//         );

//         if (sectionRef.current) {
//             observer.observe(sectionRef.current);
//         }

//         return () => observer.disconnect();
//     }, []);

//     // SVG path animation
//     useEffect(() => {
//         const interval = setInterval(() => {
//             setPathIndex((prev) => (prev + 1) % paths.length);
//         }, 3333); 

//         return () => clearInterval(interval);
//     }, [paths.length]);

//     return (
//         <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//             <section
//                 ref={sectionRef}
//                 className={`container mx-auto px-4 transition-all duration-700 ease-out ${
//                     isInView 
//                         ? 'opacity-100 translate-y-0' 
//                         : 'opacity-0 translate-y-10'
//                 }`}
//             >
//                 {/* Header Section - Responsive Flex */}
//                 <div className="flex flex-row items-center justify-between mb-8 md:mb-12 gap-2">
//                     <h3 className="text-xl sm:text-2xl md:text-4xl font- flex items-center gap-2 md:gap-4 text-gray-900">
//                         <span className="w-2 h-8 md:w-3 md:h-12 bg-[#f7a221] rounded-full shadow-[0_0_15px_rgba(247,162,33,0.3)]"></span>
//                         Top Categories
//                     </h3>
//                     <button className="text-[#f7a221] font-black flex items-center gap-1 md:gap-2 group text-[10px] md:text-sm uppercase tracking-wider transition-all whitespace-nowrap">
//                         Explore All <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
//                     </button>
//                 </div>

//                 {/* Categories Grid - Fully Responsive Breakpoints */}
//                 {/* Mobile: 3 columns | Tablet: 4-5 columns | Desktop: 8 columns */}
//                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-6 md:gap-8 lg:gap-10">
//                     {categories.map((cat, idx) => (
//                         <div
//                             key={idx}
//                             className="flex flex-col items-center group cursor-pointer transition-all duration-300"
//                         >
//                             <div className={`w-full aspect-square ${cat.color} rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] flex items-center justify-center transition-all shadow-sm group-hover:shadow-md group-hover:-translate-y-1 overflow-hidden relative border border-gray-100`}>
//                                 <img 
//                                     src={cat.img} 
//                                     alt={cat.name} 
//                                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
//                                 />
//                                 <div className="absolute inset-0 bg-[#f7a221]/0 group-hover:bg-[#f7a221]/5 transition-colors duration-300"></div>
//                             </div>
                            
//                             <span className="text-[9px] md:text-[11px] font-bold mt-3 group-hover:text-[#f7a221] text-gray-600 text-center uppercase tracking-tight md:tracking-wider transition-colors duration-300 leading-tight line-clamp-2 px-1">
//                                 {cat.name}
//                             </span>
//                         </div>
//                     ))}
//                 </div>
//             </section>

//             {/* Visual Divider */}
//             <div className="relative h-12 md:h-20 overflow-hidden mt-10">
//                 <svg 
//                     viewBox="0 0 1200 120" 
//                     preserveAspectRatio="none" 
//                     className="absolute bottom-0 w-full h-full text-gray-50"
//                 >
//                     <path
//                         d={paths[pathIndex]}
//                         fill="currentColor"
//                         style={{ transition: 'd 3333ms ease-in-out' }}
//                     />
//                 </svg>
//             </div>
//         </div>
//     );
// };

// export default Categories;
