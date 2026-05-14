import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchWishlist,
  mergeWishlist,
  loadGuestWishlist,
  clearGuestItems,
  getGuestWishlist,
} from "../REDUX_FEATURES/REDUX_SLICES/userWishlistSlice";

// ── enabled: false → hook mounts but does NOTHING (no dispatch, no API calls)
// Pass !isAdminRoute from App.jsx to skip entirely on admin routes.
const useWishlistInit = (enabled = true) => {
  const dispatch = useDispatch();
  const { isLoggedIn } = useSelector((state) => state.auth);

  // ── On app boot — load guest wishlist from localStorage into Redux ─────────
  useEffect(() => {
    if (!enabled) return; // ← guard: skip on admin routes
    console.log("💛 [useWishlistInit] Loading guest wishlist from localStorage...");
    dispatch(loadGuestWishlist());
  }, [dispatch, enabled]);

  // ── When login state changes ───────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return; // ← guard: skip on admin routes
    if (!isLoggedIn) return;

    const init = async () => {
      try {
        console.log("💛 [useWishlistInit] User logged in — initializing wishlist...");

        const guestSlugs = getGuestWishlist();

        if (guestSlugs.length > 0) {
          console.log(`💛 [useWishlistInit] Found ${guestSlugs.length} guest items — merging...`);
          await dispatch(mergeWishlist({ slugs: guestSlugs })).unwrap();
          dispatch(clearGuestItems());
          console.log("✅ [useWishlistInit] Guest wishlist merged and cleared");
        }

        await dispatch(fetchWishlist()).unwrap();
        console.log("✅ [useWishlistInit] Wishlist fetched successfully");

      } catch (error) {
        console.group("🔴 [useWishlistInit] ERROR during wishlist init");
        console.error(error);
        console.groupEnd();
      }
    };

    init();
  }, [isLoggedIn, dispatch, enabled]);
};

export default useWishlistInit;

// import { useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   fetchWishlist,
//   mergeWishlist,
//   loadGuestWishlist,
//   clearGuestItems,
//   getGuestWishlist,
// } from "../REDUX_FEATURES/REDUX_SLICES/userWishlistSlice";

// const useWishlistInit = () => {
//   const dispatch = useDispatch();
//   const { isLoggedIn } = useSelector((state) => state.auth);

//   // ── On app boot — always load guest wishlist from localStorage into Redux ──
//   useEffect(() => {
//     console.log("💛 [useWishlistInit] Loading guest wishlist from localStorage...");
//     dispatch(loadGuestWishlist());
//   }, [dispatch]);

//   // ── When login state changes ──────────────────────────────────────────────
//   useEffect(() => {
//     if (!isLoggedIn) return;

//     const init = async () => {
//       try {
//         console.log("💛 [useWishlistInit] User logged in — initializing wishlist...");

//         // Step 1 — check if guest had any items
//         const guestSlugs = getGuestWishlist();

//         // Step 2 — merge guest items into DB if any exist
//         if (guestSlugs.length > 0) {
//           console.log(`💛 [useWishlistInit] Found ${guestSlugs.length} guest items — merging...`);
//           await dispatch(mergeWishlist({ slugs: guestSlugs })).unwrap();
//           dispatch(clearGuestItems()); // clear localStorage + state after merge
//           console.log("✅ [useWishlistInit] Guest wishlist merged and cleared");
//         }

//         // Step 3 — fetch full wishlist from DB
//         await dispatch(fetchWishlist()).unwrap();
//         console.log("✅ [useWishlistInit] Wishlist fetched successfully");

//       } catch (error) {
//         // Non-fatal — log but don't crash app
//         console.group("🔴 [useWishlistInit] ERROR during wishlist init");
//         console.error(error);
//         console.groupEnd();
//       }
//     };

//     init();
//   }, [isLoggedIn, dispatch]);
// };

// export default useWishlistInit;