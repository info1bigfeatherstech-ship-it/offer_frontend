// ADMIN_TABS/SETTINGS_TAB/SettingTabRegistry.js
//
// ════════════════════════════════════════════════════════════════
//  HOW TO ADD A NEW TOP-LEVEL TAB WITH SUB-TABS — FULL TEMPLATE
// ════════════════════════════════════════════════════════════════
//
// Step 1 — Create this registry file (you are here)
// Step 2 — Create SettingsDashboard.jsx (copy CustomerDashboard.jsx, point to this registry)
// Step 3 — Create each sub-tab component (OverviewTab, StatsTab, etc.)
// Step 4 — Register in TabRegistry.js:
//             import { SettingTabRegistry } from "./ADMIN_TABS/SETTINGS_TAB/SettingTabRegistry";
//             { id: "settings", component: SettingsDashboard, subItems: SettingTabRegistry }
//
// That's it. The sidebar dropdown appears automatically. Nothing else changes.
// ════════════════════════════════════════════════════════════════
//
// ── GROUP FIELD ───────────────────────────────────────────────────────────────
// Each entry has a `group` field. SettingsDashboard reads this to render
// grouped sections in the settings sidebar (like the Dukaan/Shopify style).
// To add a new group: just set a new `group` string on any entry — it auto-appears.
// ─────────────────────────────────────────────────────────────────────────────

import { lazy } from "react";

// const OverviewTab = lazy(() => import("./OverviewTab"));
const StaffTab = lazy(() => import("../STAFF_TAB/StaffTab"));
const ProfileTab = lazy(() => import("./ProfileTab/ProfileTab"));
const ControlTab = lazy(() => import("./ControlTab/ControlTab"));
const ProductDisplayTab = lazy(() => import("./ProductDisplayTab/ProductDisplayTab"));
const DeliveryTab = lazy(() => import("./DeliveryTab/DeliveryTab"));
const LabelSettingsTab = lazy(() => import("./LabelSettingsTab/LabelSettingsTab"));
const PaymentTab = lazy(() => import("./PaymentTab/PaymentTab"));
const OrdersSettingTab = lazy(() => import("./OrderSettingTab/OrderSettingTab"));
const CustomerSettingTab = lazy(() => import("./CustomerSettingTab/CustomerSettingTab"));
const StorePoliciesTab = lazy(() => import("./StorePoliciesTab/StorePoliciesTab"));
const HelpCenterTab = lazy(() => import("./HelpCenterTab/HelpCenterTab"));
const SuggestIdeasTab = lazy(() => import("./SuggestIdeasTab/SuggestIdeasTab"));
const OthersTab = lazy(() => import("./OthersTab/OthersTab"));
// const PaymentTab  = lazy(() => import("./PaymentTab"));

// ── Add more sub-tab imports here ────────────────────────────────────────────
// const DeliveryTab    = lazy(() => import("./DeliveryTab"));
// const ProfileTab     = lazy(() => import("./ProfileTab"));
// const StorePolicyTab = lazy(() => import("./StorePolicyTab"));
// ─────────────────────────────────────────────────────────────────────────────

export const SettingTabRegistry = [

  // ── STORE group ──────────────────────────────────────────────────────────
  {
    id: "profile",
    label: "Profile",
    group: "Store",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    component: ProfileTab,
  },
  {
    id: "control",
    label: "Controls",
    group: "Store",
    icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m-6-8a2 2 0 100 4m0-4a2 2 0 110 4",
    component: ControlTab,
  },


  // ── WEBSITE group ─────────────────────────────────────────────────────────
  {
    id: "productdisplay",
    label: "Product display",
    group: "Website",
    icon: "M4 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm0 6h16",
    component: ProductDisplayTab,
  },

  // ── E-COMMERCE group ──────────────────────────────────────────────────────
  {
    id: "delivery",
    label: "Delivery",
    group: "E-Commerce",
    icon: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0",
    component: DeliveryTab,
  },
  {
    id: "shipmozo-label",
    label: "Label settings",
    group: "E-Commerce",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    component: LabelSettingsTab,
  },
  {
    id: "payments",
    label: "Payments",
    group: "E-Commerce",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    component: PaymentTab,
  },
  {
    id: "orders-settings",
    label: "Orders",
    group: "E-Commerce",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    component: OrdersSettingTab,
  },

  // ── GENERAL group ─────────────────────────────────────────────────────────
  {
    id: "customer-settings",
    label: "Customer",
    group: "General",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8z",
    component: CustomerSettingTab,
  },
  {
    id: "staff",
    label: "Staff",
    group: "General",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    component: StaffTab,
  },
  {
    id: "store-policies",
    label: "Store policies",
    group: "General",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    component: StorePoliciesTab,
  },
  // group:     "Help & Support",
  {
    id: "helpcenter",
    label: "Help center",
    group: "Help & Support",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    component: HelpCenterTab,
  },
  {
    id: "Suggestideas",
    label: "Suggest ideas",
    group: "Help & Support",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    component: SuggestIdeasTab,
  },
  {
    id: "others",
    label: "Other",
    group: "Help & Support",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    component: OthersTab,
  },

  // ── Add more sub-tabs here ────────────────────────────────────────────────
  // {
  //   id:        "logs",
  //   label:     "Logs",
  //   group:     "General",
  //   icon:      "...svg path...",
  //   component: lazy(() => import("./LogsTab")),
  // },
];