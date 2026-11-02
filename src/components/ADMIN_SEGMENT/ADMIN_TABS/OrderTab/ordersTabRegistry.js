import { lazy } from "react";

const OrderTab = lazy(() => import("./OrderTab"));
const SameDayOrdersPanel = lazy(() => import("./SameDayOrdersPanel"));

export const ORDERS_TAB_REGISTRY = [
  {
    id: "standard",
    label: "Standard",
    icon: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18M16 10a4 4 0 01-8 0",
    component: OrderTab,
  },
  {
    id: "same_day",
    label: "Same Day",
    icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    component: SameDayOrdersPanel,
    hideForPackingViewer: true,
  },
];
