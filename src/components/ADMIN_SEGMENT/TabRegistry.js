// ADMIN_SEGMENT/TabRegistry.js
import { lazy } from "react";
import { USER_TAB_REGISTRY } from "./ADMIN_TABS/CUSTOMER_SEGMENT/userTabRegistry";
import { WebPageRegistry } from "./ADMIN_TABS//WEBSITE_TAB/WebPageRegistry";
import { DEMO_TAB_REGISTRY } from "./ADMIN_TABS/DEMO/demoTabRegistry";


const OrderTab = lazy(() => import("./ADMIN_TABS/OrderTab/OrderTab"));
const ProductsTab = lazy(() => import("./ADMIN_TABS/ProductsTab"));
const AnalyticsTab = lazy(() => import("./ADMIN_TABS/AnalyticsTab"));
const outOfStockTab = lazy(() => import("./ADMIN_TABS/OutOfStockTab/OutOfStockTab"));
const ArchivedTab = lazy(() => import("./ADMIN_TABS/ArchivedTab"));
const CustomerDashboard = lazy(() => import("./ADMIN_TABS/CUSTOMER_SEGMENT/CustomerDashboard"));
const UtilitiesTab = lazy(() => import("./ADMIN_TABS/Utilities/UtilitiesTab"));
const WebsiteDashboard = lazy(() => import("./ADMIN_TABS/WEBSITE_TAB/WebsiteDashboard"));
const EcomTab = lazy(() => import("./ADMIN_TABS/ECOMMERCE/EcomTab"));
const MarketingTab = lazy(() => import("./ADMIN_TABS/MARKETING/MarketingTab"));
const SupportTab = lazy(() => import("./ADMIN_TABS/SUPPORT/SupportTab"));
const SettingsDashboard = lazy(() => import("./ADMIN_TABS/SETTINGS/SettingsDashboard"));
const CustomerReviewTab = lazy(() => import("./ADMIN_TABS/CUSTOMER_REVIEW/CustomerReviewTab"));
const StaffTab = lazy(() => import("./ADMIN_TABS/STAFF_TAB/StaffTab"));
const DemoDashboard = lazy(() => import("./ADMIN_TABS/DEMO/DemoDashboard"));
// const WholesalerDashboard = lazy(() => import("./ADMIN_TABS/WHOLESALER_TAB/WholesalerDashboard"));

// const getProductsBadge = (state) => state.adminGetProducts?.products?.length || 0;
// const getArchivedBadge = (state) => state.adminArchived?.products?.length || 0;

export const TAB_REGISTRY = [
  {
    id: "orders",
    label: "Orders",
    icon: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18M16 10a4 4 0 01-8 0",
    component: OrderTab,
    badge: null,
  },
  {
    id: "products",
    label: "Products",
    icon: "M4 6h16M4 10h16M4 14h16M4 18h16",
    component: ProductsTab,
    badge: null,
  },
  {
    id: "analytics",
    label: "Store Analytics",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    component: AnalyticsTab,
    badge: null,
  },
  {
    id: "archived",
    label: "Archived",
    icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
    component: ArchivedTab,
    badge: null,
  },
  {
    id: "outofstock",
    label: "Out of Stock Query",
    icon: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01",
    component: outOfStockTab,
    badge: null,
  },

  {
    id: "customers",
    label: "Leads",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm7-3a3 3 0 010 6M21 21v-2a4 4 0 00-3-3.87",
    component: CustomerDashboard,
    badge: null,
    // ── subItems drives the sidebar dropdown AND CustomerDashboard's renderer ──
    // To add a new sub-tab: add an entry to userTabRegistry.js — nothing else changes.
    subItems: USER_TAB_REGISTRY,
  },
  {
    id: "utilities",
    label: "Utilities",
    // icon: "M4 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm0 6h16m-9 6l-1 4m5-4l1 4m-4 0h4",
    icon: "M2 17l10 5 10-5M2 12l10 5 10-5M12 2L2 7l10 5 10-5-10-5z",
    component: UtilitiesTab,
    badge: null,
  },
  {
    id: "website",
    label: "Website",
    icon: "M4 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm0 6h16m-9 6l-1 4m5-4l1 4m-4 0h4",
    component: WebsiteDashboard,
    badge: null,
    subItems: WebPageRegistry,
  },
  {
    id: "ecommerce",
    label: "E-Commerce",
    // icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6",
    component: EcomTab,
    badge: null,
  },
  {
    id: "marketing",
    label: "Marketing",
    // icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    icon: "M11 5L6 9H2v6h4l5 4V5zm8 4a5 5 0 010 6m-3-3a2 2 0 010 2",
    component: MarketingTab,
    badge: null,
  },

  {
    id: "customerreview",
    label: "Customer Reviews",
    icon: "M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3",
    component: CustomerReviewTab,
    badge: null,
  },
  {
    id: "staff",
    label: "Staff",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    component: StaffTab,
    badge: null,
  },
  {
    id: "support",
    label: "Support",
    // This is a refined version of your path for a cleaner look
    // icon: "M18.364 5.636l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10zm0-4v2m0 14v2m9-9h-2M5 12H3",
    icon: "M3 18v-6a9 9 0 0118 0v6M4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zm10 0a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z",
    component: SupportTab,
    badge: null,
  },
  {
    id: "settings",
    label: "Settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    component: SettingsDashboard,   // ← now points to the dashboard component
    badge: null,
    // NOTE: no subItems here — settings sidebar is internal to SettingsDashboard
    //       so AdminDashboard won't render a dropdown for it
  },
  // {
  //   id: "wholesaler",
  //   label: "Wholesalers",
  //   icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6",
  //   component: WholesalerDashboard,
  //   badge: null,
  //   subItems: null,  // No dropdown, uses internal tabs
  // },

  // ── HOW TO ADD A NEW TOP-LEVEL TAB WITH SUB-TABS ────────────────────────
  // 1. Create  ADMIN_TABS/DEMO_SEGMENT/demoTabRegistry.js   (list sub-tabs)
  // 2. Create  ADMIN_TABS/DEMO_SEGMENT/DemoDashboard.jsx    (reads ctab, renders)
  // 3. Create  ADMIN_TABS/DEMO_SEGMENT/OverviewTab.jsx  etc (actual content)
  // 4. Add the entry below — that's it. Sidebar dropdown appears automatically.
  {
    id: "demo",
    label: "Demo Tab",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3M6.343 6.343l-.707-.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
    component: DemoDashboard,
    badge: null,
    subItems: DEMO_TAB_REGISTRY,
  },

  // ── Drop new tabs here only ──────────────────────────────────────────────
  // {
  //   id:        "orders",
  //   label:     "Orders",
  //   icon:      "...svg path...",
  //   component: lazy(() => import("./ADMIN_TABS/OrdersTab")),
  //   badge:     (state) => state.orders?.total || 0,
  //   // no subItems → renders as a plain sidebar button, no dropdown
  // },
  //
  // {
  //   id:        "reports",
  //   label:     "Reports",
  //   icon:      "...svg path...",
  //   component: ReportsDashboard,
  //   subItems:  REPORTS_TAB_REGISTRY,   // ← add subItems to get dropdown for free
  // },
];
// code is working but upper code handle subtabs in better way
// // ADMIN_SEGMENT/tabRegistry.js
// import { lazy } from "react";

// const ProductsTab  = lazy(() => import("./ADMIN_TABS/ProductsTab"));
// const AnalyticsTab = lazy(() => import("./ADMIN_TABS/AnalyticsTab"));
// const ArchivedTab  = lazy(() => import("./ADMIN_TABS/ArchivedTab"));
// const CustomerDashboard = lazy(() => import("./ADMIN_TABS/CUSTOMER_SEGMENT/CustomerDashboard")); // ← was CustomerDashboard

// // Badge selectors — read from Redux, return number or null
// const getProductsBadge = (state) => state.adminGetProducts?.products?.length || 0;

// export const TAB_REGISTRY = [
//   {
//     id:        "products",
//     label:     "Products",
//     icon:      "M4 6h16M4 10h16M4 14h16M4 18h16",
//     component: ProductsTab,
//     badge:     getProductsBadge,
//   },
//   {
//     id:        "analytics",
//     label:     "Analytics",
//     icon:      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
//     component: AnalyticsTab,
//     badge:     null,
//   },
//   {
//     id:        "archived",
//     label:     "Archived",
//     icon:      "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
//     component: ArchivedTab,
//     badge:     null,
//   },

//    {
//     id:        "customers",
//     label:     "Customers",
//     // Clean Users Icon
//     icon:      "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm7-3a3 3 0 010 6M21 21v-2a4 4 0 00-3-3.87",
//     component: CustomerDashboard,
//     badge:     null,
//   },
//   // ── Drop new tabs here only ───────────────────────────────────────────────
//   // {
//   //   id:        "orders",
//   //   label:     "Orders",
//   //   icon:      "...svg path...",
//   //   component: lazy(() => import("./ADMIN_TABS/OrdersTab")),
//   //   badge:     (state) => state.orders?.total || 0,
//   // },
// ];

// import { lazy } from 'react';

// // Lazy load tabs for better performance
// const ProductsTab = lazy(() => import('./ADMIN_TABS/ProductsTab'));
// const AnalyticsTab = lazy(() => import('./ADMIN_TABS/AnalyticsTab'));
// const ArchivedTab = lazy(() => import('./ADMIN_TABS/ArchivedTab'));
// const Tabname = lazy(() => import('right path')); // for new tabs

// // Badge selectors for tab counts
// export const getProductsBadge = (state) => state.adminGetProducts?.products?.length || 0;
// export const getArchivedBadge = (state) => state.adminArchived?.products?.length || 0;
// export const getAnalysticsTab = (state) => state.getAnalysticsTab?.products?.length || 2;

// // Registry - add new tabs here, that's it
// export const TAB_REGISTRY = [
//   {
//     id: 'products',
//     label: 'Products',
//     icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
//     component: ProductsTab,
//     badge: getProductsBadge
//   },
//   {
//     id: 'analytics',
//     label: 'Analytics',
//     icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
//     component: AnalyticsTab,
//     badge: getAnalysticsTab
//   },
//   {
//     id: 'archived',
//     label: 'Archived',
//     icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
//     component: ArchivedTab,
//     badge: getArchivedBadge
//   },
//   {
//     id: 'Tabname',
//     label: 'name',
//     icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
//     component: tabname,
//     badge: null
//   },
// ];