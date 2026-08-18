import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchWishlist,
  mergeWishlist,
  loadGuestWishlist,
  clearGuestItems,
  getGuestWishlist,
} from "../REDUX_FEATURES/REDUX_SLICES/userWishlistSlice";
import { USER_ACCESS_TOKEN_KEY } from "../../SERVICES/axiosInstance";
import {
  isCustomerTokenCompatible,
  isSilentPortalScopePayload,
} from "../../SERVICES/authPortalSession";

const hasEcommCustomerSession = () => {
  try {
    const token = localStorage.getItem(USER_ACCESS_TOKEN_KEY);
    return Boolean(token) && isCustomerTokenCompatible(token, "ecomm");
  } catch {
    return false;
  }
};

// ── enabled: false → hook mounts but does NOTHING (no dispatch, no API calls)
// Pass !isAdminRoute from App.jsx to skip entirely on admin routes.
const useWishlistInit = (enabled = true) => {
  const dispatch = useDispatch();
  const { isLoggedIn } = useSelector((state) => state.auth);

  // ── On app boot — load guest wishlist from localStorage into Redux ─────────
  useEffect(() => {
    if (!enabled) return; // ← guard: skip on admin routes
    dispatch(loadGuestWishlist());
  }, [dispatch, enabled]);

  // ── When login state changes ───────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return; // ← guard: skip on admin routes
    if (!isLoggedIn || !hasEcommCustomerSession()) return;

    const init = async () => {
      try {
        const guestSlugs = getGuestWishlist();

        if (guestSlugs.length > 0) {
          await dispatch(mergeWishlist({ slugs: guestSlugs })).unwrap();
          dispatch(clearGuestItems());
        }

        await dispatch(fetchWishlist()).unwrap();
      } catch (error) {
        if (isSilentPortalScopePayload(error)) return;
        console.group("🔴 [useWishlistInit] ERROR during wishlist init");
        console.error(error);
        console.groupEnd();
      }
    };

    init();
  }, [isLoggedIn, dispatch, enabled]);
};

export default useWishlistInit;

