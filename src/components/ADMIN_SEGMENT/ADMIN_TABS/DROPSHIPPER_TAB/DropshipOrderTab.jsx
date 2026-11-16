import React, { useLayoutEffect } from "react";
import { useDispatch } from "react-redux";
import OrderTab from "../OrderTab/OrderTab";
import { AdminOrderStorefrontProvider } from "../../../../utils/adminOrderStorefront";
import { resetAdminOrdersUi } from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersSlice";
import { adminOrdersApi } from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersApi";

/**
 * Full admin order ops for storefront=dropship (confirm, ship, labels, sync).
 * Isolation from ecomm Orders:
 * - x-storefront: dropship via AdminOrderStorefrontProvider
 * - reset RTK adminOrdersApi cache on enter/leave so ecomm/dropship data never mix
 * Self-pickup is blocked server-side for dropship; that bucket stays empty.
 */
export default function DropshipOrderTab() {
  const dispatch = useDispatch();

  useLayoutEffect(() => {
    dispatch(resetAdminOrdersUi());
    dispatch(adminOrdersApi.util.resetApiState());
    return () => {
      dispatch(adminOrdersApi.util.resetApiState());
      dispatch(resetAdminOrdersUi());
    };
  }, [dispatch]);

  return (
    <AdminOrderStorefrontProvider storefront="dropship">
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3">
          <p className="text-sm font-medium text-amber-950">
            Dropshipper orders only
          </p>
          <p className="mt-0.5 text-xs text-amber-800/90">
            Scoped with <span className="font-mono">x-storefront: dropship</span>.
            Ecomm and wholesale orders stay on the main Orders tab. Paid dropship
            orders stay Pending until you confirm — same as the approval queue.
          </p>
        </div>
        <OrderTab key="dropship-orders" />
      </div>
    </AdminOrderStorefrontProvider>
  );
}
