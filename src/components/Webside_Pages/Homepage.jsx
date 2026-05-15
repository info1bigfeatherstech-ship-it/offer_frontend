import React, { useLayoutEffect, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigationType } from 'react-router-dom';
import {
  fetchAllCategories,
  selectAllCategories,
  selectCategoriesLoading,
  selectCategoriesError,
} from '../REDUX_FEATURES/REDUX_SLICES/userCategoriesSlice';
import CategorySection from '../Homecompo/CategorySection';
import Categories from '../Homecompo/Categories';
import PriceBanners from '../Homecompo/PriceBanners';
import BestSellers from '../Homecompo/BestSellers';
import HeroSlider from '../Homecompo/HeroSlider';

const Homepage = ({ onOpenAuth }) => {
  const dispatch = useDispatch();
  const categories = useSelector(selectAllCategories);
  const loading = useSelector(selectCategoriesLoading);
  const error = useSelector(selectCategoriesError);
  const location = useLocation();
  const navigationType = useNavigationType();

  // ── Single source of truth — only Homepage fetches the list ──
  useLayoutEffect(() => {
    if (categories.length === 0) {
      dispatch(fetchAllCategories()).catch(() => {});
    }
  }, [dispatch]);

  // ── Deep-link scroll: #best-sellers (Just Arrived), #top-categories (Start Shopping) — heading below sticky header.
  useEffect(() => {
    if (navigationType === 'POP') return;
    const anchorId =
      location.hash === '#best-sellers'
        ? 'best-sellers'
        : location.hash === '#top-categories'
          ? 'top-categories'
          : null;
    if (!anchorId) return;

    const scrollHeadingBelowHeader = () => {
      const target = document.getElementById(anchorId);
      if (!target) return false;
      const header =
        document.querySelector('header.bg-white.sticky') ||
        document.querySelector('header.sticky.top-0');
      const headerH =
        header instanceof HTMLElement
          ? Math.ceil(header.getBoundingClientRect().height)
          : 140;
      const gap = 16;
      const y = target.getBoundingClientRect().top + window.scrollY - headerH - gap;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      return true;
    };

    scrollHeadingBelowHeader();
    const t1 = window.setTimeout(scrollHeadingBelowHeader, 60);
    const t2 = window.setTimeout(scrollHeadingBelowHeader, 220);
    const t3 = window.setTimeout(scrollHeadingBelowHeader, 500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [location.pathname, location.hash, navigationType]);

  return (
    <>
      <div className="px-4 md:px-8 pt-6">
        <HeroSlider />
      </div>

      <main className="container mx-auto px-4 pb-20">

        {/* Top Categories strip — has its own loading/error/retry UI */}
        <Categories />

        <PriceBanners />

        {/* Just Arrived / Best Sellers — independent, always renders */}
        <section>
          <BestSellers />
        </section>

        {/* Category product rows — only when list is ready */}
        {!error.categories && !loading.categories && categories.length > 0 && (
          categories.map((cat) => (
            <CategorySection
              key={cat.slug}
              slug={cat.slug}
              title={cat.name}
            />
          ))
        )}

      </main>
    </>
  );
};

export default Homepage;

// import React, { useEffect } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { useLocation } from 'react-router-dom';
// import {
//   fetchAllCategories,
//   selectAllCategories,
//   selectCategoriesLoading,
//   selectCategoriesError,
// } from '../REDUX_FEATURES/REDUX_SLICES/userCategoriesSlice';
// import CategorySection from '../Homecompo/CategorySection';
// import Categories from '../Homecompo/Categories';
// import PriceBanners from '../Homecompo/PriceBanners';
// import BestSellers from '../Homecompo/BestSellers';
// import HeroSlider from '../Homecompo/HeroSlider';

// const Homepage = () => {
//   const dispatch = useDispatch();

//   const categories = useSelector(selectAllCategories);
//   // console.log(categories);

//   const loading = useSelector(selectCategoriesLoading);
//   const error = useSelector(selectCategoriesError);
//   const location = useLocation();

//   useEffect(() => {
//     // console.log('🏠 [Homepage] Fetching all categories...');
//     dispatch(fetchAllCategories());
//   }, [dispatch]);
// // ✅ Added location hook

// // ✅ Scroll effect on hash change
// useEffect(() => {
//   if (location.hash === '#best-sellers') {
//     document.getElementById('best-sellers')?.scrollIntoView({ 
//       behavior: 'smooth' 
//     });
//   }
// }, [location]);

// // ✅ Wrapped BestSellers with ID
// <section id="best-sellers">
//   <BestSellers />
// </section>

//   return (
//     <>
//       <div className="px-4 md:px-8 pt-6">
//         <HeroSlider />
//       </div>

//       <main className="container mx-auto px-4 pt- pb-20">
//         <Categories />
//         <PriceBanners />
//         {/* <BestSellers /> */}
//         <section id="best-sellers">
//           <BestSellers />
//         </section>

//         {/* ✅ Dynamic — driven by DB, zero hardcoding */}
//         {/* {loading.categories && (
//           <div className="text-center py-10 text-gray-400">
//             Loading categories...
//           </div>
//         )} */}

//         {/* {error.categories && (
//           <div className="text-center py-10 text-red-400">
//             Failed to load categories: {error.categories.message}
//           </div>
//         )} */}

//         {categories.map((cat) => (
//           <CategorySection
//             key={cat.slug}
//             slug={cat.slug}
//             title={cat.name}
//           />
//         ))}
//       </main>
//     </>
//   );
// };

// export default Homepage;

// import React from 'react';
// // import HeroSection from '../components/Homecompo/HeroSection';
// import Categories from '../components/Homecompo/Categories';
// import PriceBanners from '../components/Homecompo/PriceBanners';
// // import TrustIndicators from '../components/Homecompo/TrustIndicators';
// import BestSellers from '../components/Homecompo/BestSellers';
// // import PromoSection from '../components/Homecompo/PromoSection';
// // import GiftPopup from '../components/USER_LOGIN_SEGMENT/GiftPopup';
// import HeroSlider from '../components/Homecompo/HeroSlider';
// import SmartlifeCategories from '../components/Homecompo/SmartlifeCategories';
// import HomeCategories from '../components/Homecompo/HomeCategories';
// import ToursCategories from '../components/Homecompo/ToursCategories';
// import BabyCategories from '../components/Homecompo/BabyCategories';



// const Homepage = () => {
//     return (
//         <>
//             <div className="px-4 md:px-8 pt-6">
//                 {/* <HeroSection /> */}
//                 <HeroSlider />
//             </div>

//             <main className="container mx-auto px-4 pt-12 pb-20 space-y-12">

//                 <Categories />
//                 <PriceBanners />
//                 {/* <TrustIndicators /> */}
//                 <BestSellers />

//                 {/*  AS WE DISCUS WE CREATE ONE COMPONENT AND THEN USE IT  */}
//                 <SmartlifeCategories />
//                 <HomeCategories />
//                 <ToursCategories />
//                 <BabyCategories />

//                 {/* <PromoSection /> */}
//             </main>
//         </>
//     );
// };

// export default Homepage;


// import React from 'react';
// import HeroSection from '../components/Homecompo/HeroSection';
// import Categories from '../components/Homecompo/Categories';
// import PriceBanners from '../components/Homecompo/PriceBanners';
// import TrustIndicators from '../components/Homecompo/TrustIndicators';
// import BestSellers from '../components/Homecompo/BestSellers';
// import PromoSection from '../components/Homecompo/PromoSection';

// const Homepage = () => {
//     return (
//         <>
//             <div className="px-4 md:px-8 pt-6">
//                 <HeroSection />
//             </div>

//             <main className="container mx-auto px-4 pt-12 pb-20 space-y-12">
//                 <Categories />
//                 <PriceBanners />
//                 <TrustIndicators />
//                 <BestSellers />
//                 <PromoSection />
//             </main>
//         </>
//     );
// };

// export default Homepage;
