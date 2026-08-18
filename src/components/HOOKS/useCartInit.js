import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCart,
  mergeCart,
  loadGuestCart,
  clearGuestCartItems,
  getGuestCart,
} from "../REDUX_FEATURES/REDUX_SLICES/userCartSlice";
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
const useCartInit = (enabled = true) => {
  const dispatch = useDispatch();
  const { isLoggedIn } = useSelector((state) => state.auth);

  // ── On app boot — load guest cart from localStorage into Redux ─────────────
  useEffect(() => {
    if (!enabled) return; // ← guard: skip on admin routes
    dispatch(loadGuestCart());
  }, [dispatch, enabled]);

  // ── When login state changes ───────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return; // ← guard: skip on admin routes
    if (!isLoggedIn || !hasEcommCustomerSession()) return;

    const init = async () => {
      try {
        const guestItems = getGuestCart();

        if (guestItems.length > 0) {
          await dispatch(mergeCart({ items: guestItems })).unwrap();
          dispatch(clearGuestCartItems());
        }

        await dispatch(fetchCart()).unwrap();
      } catch (error) {
        if (isSilentPortalScopePayload(error)) return;
        console.group("🔴 [useCartInit] ERROR during cart init");
        console.error(error);
        console.groupEnd();
      }
    };

    init();
  }, [isLoggedIn, dispatch, enabled]);
};

export default useCartInit;

