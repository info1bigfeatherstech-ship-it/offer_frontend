import React, { Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectAdminUser } from "../../ADMIN_REDUX_MANAGEMENT/adminAuthSlice";
import { isPackingViewerRole } from "../../roles";
import { ORDERS_TAB_REGISTRY } from "./ordersTabRegistry";

function visibleOrdersTabs(isPackingViewer) {
  if (!isPackingViewer) return ORDERS_TAB_REGISTRY;
  return ORDERS_TAB_REGISTRY.filter((t) => !t.hideForPackingViewer);
}

const OrdersDashboard = () => {
  const [searchParams] = useSearchParams();
  const adminUser = useSelector(selectAdminUser);
  const isPackingViewer = isPackingViewerRole(adminUser?.role);
  const tabs = visibleOrdersTabs(isPackingViewer);
  const activeCtab = searchParams.get("ctab") || tabs[0]?.id;
  const activeTabConfig = tabs.find((t) => t.id === activeCtab) || tabs[0];
  const SubTabComponent = activeTabConfig?.component ?? null;

  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        {SubTabComponent ? (
          <SubTabComponent />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            Sub-tab not found
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default OrdersDashboard;
