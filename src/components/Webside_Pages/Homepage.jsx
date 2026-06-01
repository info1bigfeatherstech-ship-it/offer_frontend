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
          : location.hash === '#hero-section'
            ? 'hero-section'
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
      <div id="hero-section" className="px-4 md:px-8 pt-6">
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

