// ADMIN_TABS/CUSTOMER_SEGMENT/userTabRegistry.js
import { lazy } from "react";

const CustomersTab  = lazy(() => import("./CustomersTab"));
const CartsTab      = lazy(() => import("./CartsTab"));
const WishlistsTab  = lazy(() => import("./WishlistsTab"));

export const USER_TAB_REGISTRY = [
  {
    id:        "customers",
    label:     "Customers",
    icon:      "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm7-3a3 3 0 010 6M21 21v-2a4 4 0 00-3-3.87",
    component: CustomersTab,
  },
  {
    id:        "carts",
    label:     "Carts",
    icon:      "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6M12 15v6",
    component: CartsTab,
  },
  {
    id:        "wishlists",
    label:     "Wishlists",
    icon:      "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    component: WishlistsTab,
  },
];
