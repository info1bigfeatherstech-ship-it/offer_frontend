import React, { Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { SettingTabRegistry } from "./SettingTabregistry";
import { ROLES } from "../../roles";

/** Order managers may only open Delivery (shipping partner switch). Admins see all settings tabs. */
const ORDER_MANAGER_SETTING_TAB_IDS = new Set(["delivery"]);

const SettingsDashboard = ({ onExit }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.adminAuth);
  const role = String(user?.role || "").toLowerCase();
  const isOrderManagerOnly = role === ROLES.ORDER_MANAGER;

  const visibleTabs = useMemo(() => {
    if (!isOrderManagerOnly) return SettingTabRegistry;
    return SettingTabRegistry.filter((t) => ORDER_MANAGER_SETTING_TAB_IDS.has(t.id));
  }, [isOrderManagerOnly]);

  const activeCtab = searchParams.get("ctab");
  const defaultCtab = visibleTabs[0]?.id || null;
  const resolvedCtab =
    activeCtab && visibleTabs.find((t) => t.id === activeCtab) ? activeCtab : defaultCtab;

  const groupedTabs = useMemo(() => {
    const map = new Map();
    visibleTabs.forEach((tab) => {
      const g = tab.group || "General";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(tab);
    });
    return map;
  }, [visibleTabs]);

  const activeTabConfig = visibleTabs.find((t) => t.id === resolvedCtab);
  const TabComponent = activeTabConfig?.component ?? null;

  const handleSubTabClick = (tabId) => {
    setSearchParams({ tab: "settings", ctab: tabId });
  };

  return (
    <div className="flex flex-1 min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen z-20">
        <div className="px-4 py-5 flex items-center gap-4 border-b border-gray-200 bg-white sticky top-0 z-30">
          <button
            type="button"
            onClick={onExit}
            className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-xl font-medium text-gray-900">Settings</h2>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {[...groupedTabs.entries()].map(([groupLabel, tabs], index) => (
            <div
              key={groupLabel}
              className={`py-6 px-4 ${index !== groupedTabs.size - 1 ? "border-b border-gray-200" : ""}`}
            >
              <p className="px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                {groupLabel}
              </p>
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const isActive = resolvedCtab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSubTabClick(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-150 cursor-pointer text-left ${
                        isActive
                          ? "bg-blue-50 text-blue-600 shadow-sm"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <svg
                        className={`w-5 h-5 shrink-0 ${isActive ? "text-blue-600" : "text-gray-500"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={tab.icon} />
                      </svg>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white h-16 border-b border-gray-200 flex items-center px-8 sticky top-0 z-10">
          <h2 className="text-xl font-medium text-gray-900 capitalize">
            {activeTabConfig?.label || "Settings"}
          </h2>
        </header>

        <div className="p-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            {TabComponent ? (
              <TabComponent />
            ) : (
              <div className="text-gray-400">Content coming soon</div>
            )}
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default SettingsDashboard;
