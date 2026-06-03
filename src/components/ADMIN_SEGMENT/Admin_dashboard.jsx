

// // ADMIN_SEGMENT/Admin_dashboard.jsx

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { TAB_REGISTRY } from "./TabRegistry";
import { ROLE_PERMISSIONS, ROLE_LABELS, ROLES } from "./roles";
import { useNavigate } from "react-router-dom";
import { useAdminLogoutMutation } from "./ADMIN_REDUX_MANAGEMENT/adminAuthApi";
import LOGO from "../../assets/logo2.png";
// ── Settings dashboard import (used when activeTab === "settings") ─────────
import SettingsDashboard from "./ADMIN_TABS/SETTINGS/SettingsDashboard";


// ── HARDCODED ROLE ────────────────────────────────────────────────────────────
// const HARDCODED_ROLE = "admin";
// swap to: user?.role || ROLES.ADMIN  when backend is ready
// ─────────────────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // const { user } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.adminAuth);
  const HARDCODED_ROLE = user?.role || ROLES.ORDER_MANAGER;
  // ── Role & permissions ────────────────────────────────────────────────────
  const activeRole = HARDCODED_ROLE;
  const allowedTabIds = ROLE_PERMISSIONS[activeRole] || [];
  const allowedTabs = TAB_REGISTRY.filter((tab) => allowedTabIds.includes(tab.id));
  const defaultTab = allowedTabs[0]?.id || "products";

  // ── Derive activeTab synchronously from URL + permissions ─────────────────
  const tabFromUrl = searchParams.get("tab");
  const activeTab = tabFromUrl && allowedTabIds.includes(tabFromUrl)
    ? tabFromUrl
    : defaultTab;

  const activeCtab = searchParams.get("ctab") || null;

  // ── Dropdown state — pure UI, not in URL ──────────────────────────────────
  // Auto-expand the parent whose tab is currently active in the URL on mount.
  // After that, the user controls it via click (toggle).
  const [expandedTab, setExpandedTab] = useState(() => {
    const urlTab = new URLSearchParams(window.location.search).get("tab");
    const entry = allowedTabs.find((t) => t.id === urlTab && t.subItems?.length);
    return entry ? entry.id : null;
  });

  const navigate = useNavigate();
  const [adminLogout, { isLoading: loggingOut }] = useAdminLogoutMutation();

  const handleLogout = async () => {
    try {
      await adminLogout().unwrap();
    } catch {
      // even if API fails, adminAuthApi.transformResponse already clears the token
      // and adminAuthSlice extraReducer (matchRejected) clears the state
    } finally {
      navigate("/admin/login", { replace: true });
    }
  };

  // ── Single-responsibility effect: keep URL honest ─────────────────────────
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    const urlIsWrong = !urlTab || !allowedTabIds.includes(urlTab);

    if (urlIsWrong) {
      // Wipe ctab too when correcting the tab
      setSearchParams({ tab: defaultTab }, { replace: true });
    }
  }, [activeRole, searchParams]);

  // ── When activeTab changes (URL driven), auto-expand its parent if needed ─
  // This handles browser back/forward and direct URL navigation.
  useEffect(() => {
    const entry = allowedTabs.find((t) => t.id === activeTab && t.subItems?.length);
    if (entry) {
      // Only auto-expand — never auto-collapse. User collapse is intentional.
      setExpandedTab((prev) => (prev === entry.id ? prev : entry.id));
    }
  }, [activeTab]);

  // ── Badges ────────────────────────────────────────────────────────────────
  const productsBadge = useSelector((s) => s.adminGetProducts?.products?.length || 0);
  const archivedBadge = useSelector((s) => s.adminArchived?.products?.length || 0);
  const BADGE_MAP = { products: productsBadge, archived: archivedBadge };

  // ── Parent tab click ──────────────────────────────────────────────────────
  const handleTabClick = (tab) => {
    if (!allowedTabIds.includes(tab.id)) return;

    if (tab.subItems?.length) {
      if (expandedTab === tab.id) {
        // Same parent clicked → collapse dropdown only, don't change URL/tab
        setExpandedTab(null);
      } else {
        // Different parent with subItems → expand + navigate to first sub-item
        setExpandedTab(tab.id);
        const firstSub = tab.subItems[0];
        setSearchParams({ tab: tab.id, ctab: firstSub.id });
      }
    } else {
      // Plain tab → close any open dropdown, navigate
      setExpandedTab(null);
      setSearchParams({ tab: tab.id });
    }
  };

  // ── Sub-item click ────────────────────────────────────────────────────────
  const handleSubItemClick = (parentId, subId) => {
    if (!allowedTabIds.includes(parentId)) return;
    setSearchParams({ tab: parentId, ctab: subId });
  };

  // ── onSwitchTab (called from inside tab components) ───────────────────────
  const handleSwitchTab = (tabId) => {
    const tab = allowedTabs.find((t) => t.id === tabId);
    if (tab) handleTabClick(tab);
  };

  // ── Settings exit handler ─────────────────────────────────────────────────
  // Called when the back arrow inside SettingsDashboard is clicked.
  // Navigates to the first allowed tab (defaultTab), wiping ctab from URL.
  const handleSettingsExit = () => {
    setSearchParams({ tab: defaultTab }, { replace: true });
  };
  // ─────────────────────────────────────────────────────────────────────────

  const activeTabConfig = allowedTabs.find((t) => t.id === activeTab);
  const TabComponent = activeTabConfig?.component ?? null;

  // ── Settings full-screen swap ─────────────────────────────────────────────
  // When activeTab === "settings":
  //   • Main sidebar is hidden
  //   • SettingsDashboard renders its own two-panel layout (settings sidebar + content)
  // When any other tab is active, behavior is 100% unchanged.
  const isSettingsActive = activeTab === "settings";
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Sidebar — hidden when Settings is active ────────────────────── */}
      {!isSettingsActive && (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen z-20">

          {/* Logo / user
          <div className="p-6 flex items-center space-x-3">
            <div className="w-20 h-10 flex items-center justify-center flex-shrink-1">
              <img src={LOGO} alt="logo" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-xl font- text-gray-900 truncate">
                {user?.name || "Admin"}
              </h1>
              <span className="text-xs font-semibold text-blue-500 tracking-wide">
                {ROLE_LABELS[activeRole] || activeRole}
              </span>
            </div>
          </div> */}

          {/* Logo / user */}
          <div className="p-4 flex flex-col items-center border-b border-slate-50">
            {/* Logo at Top */}
            {/* E-COM Context Tag - Top Right Floating */}
            <div className="absolute top-3 right-3">
              <span className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 hover:bg-green-100 border border-green-100 rounded-md transition-all duration-300 group shadow-sm">
                {/* Small Dot Indicator for 'Live' feel */}
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />

                <span className="text-[10px] font-black text-green-700 tracking-widest uppercase leading-none">
                  E-COM
                </span>
              </span>
            </div>
            <div className="w-25 h-22 flex items-center justify-center flex-shrink-0">
              <img src={LOGO} alt="logo" className="max-h-full object-contain" />
            </div>

            {/* User Info Downward */}
            <div className="mt-2 text-center overflow-hidden w-full">
              <h1 className="text-sm font- text-slate-800 truncate">
                {user?.name || "Admin"}
              </h1>
              <p className="text-[10px] font- text-blue-600 tracking-wider uppercase leading-none mt-1">
                {ROLE_LABELS[activeRole] || activeRole}
              </p>
            </div>
          </div>

          {/* Nav — only allowed tabs rendered */}
          <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
            {allowedTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const hasSubItems = tab.subItems?.length > 0;
              const isExpanded = expandedTab === tab.id;

              return (
                <div key={tab.id}>

                  {/* Parent button */}
                  <button
                    onClick={() => handleTabClick(tab)}
                    className={`w-full flex items-center cursor-pointer justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                        ? "bg-blue-50 text-blue-600 shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg
                        className={`w-5 h-5 shrink-0 ${isActive ? "text-blue-600" : "text-gray-400"}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                      </svg>
                      <span>{tab.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Badge */}
                      {BADGE_MAP[tab.id] != null && BADGE_MAP[tab.id] > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? "bg-blue-200 text-blue-700" : "bg-gray-200 text-gray-600"
                          }`}>
                          {BADGE_MAP[tab.id]}
                        </span>
                      )}

                      {/* Chevron — only for tabs with sub-items */}
                      {hasSubItems && (
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""} ${isActive ? "text-blue-500" : "text-gray-400"
                            }`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* ── Dropdown sub-items ─────────────────────────────────────
                      Driven entirely by tab.subItems from TabRegistry.
                      To add a sub-tab: edit the registry only. Nothing here changes.
                  ─────────────────────────────────────────────────────────────── */}
                  {hasSubItems && isExpanded && (
                    <div className="mt-1 ml-4 pl-4 border-l-2 border-blue-100 space-y-0.5">
                      {tab.subItems.map((sub) => {
                        const isSubActive = isActive && activeCtab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleSubItemClick(tab.id, sub.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer text-left ${isSubActive
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                              }`}
                          >
                            <svg
                              className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? "text-blue-600" : "text-gray-400"}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sub.icon} />
                            </svg>
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase mb-2 tracking-widest font-bold">
              System v1.0.4
            </p>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="
        w-full flex items-center justify-center gap-2
        py-2.5 px-4 rounded-xl
        text-[11px] font-bold uppercase tracking-widest
        text-red-400 border border-red-100
        hover:bg-red-50 hover:text-red-500 hover:border-red-200
        active:scale-[0.98]
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-all duration-200 cursor-pointer
      "
            >
              {/* Logout icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>
      )}

      {/* ── Settings full-screen takeover ────────────────────────────────── */}
      {/* When Settings is active: hide main sidebar, render SettingsDashboard  */}
      {/* which has its OWN sidebar (grouped) + content panel.                  */}
      {/* onExit navigates back to defaultTab and restores main sidebar.         */}
      {isSettingsActive ? (
        <SettingsDashboard onExit={handleSettingsExit} />
      ) : (
        /* ── Main content (all non-settings tabs) ───────────────────────── */
        <main className="flex-1 overflow-y-auto">
          <header className="bg-white h-16 border-b border-gray-200 flex items-center px-8 sticky top-0 z-10">
            <h2 className="text-lg font-semibold text-gray-800 capitalize">
              {activeTabConfig?.label || "Dashboard"}
            </h2>
          </header>

          <div className="p-8">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              {TabComponent ? (
                <TabComponent onSwitchTab={handleSwitchTab} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <p className="text-sm font-medium">This section is coming soon</p>
                </div>
              )}
            </Suspense>
          </div>
        </main>
      )}

    </div>
  );
};

export default AdminDashboard;
