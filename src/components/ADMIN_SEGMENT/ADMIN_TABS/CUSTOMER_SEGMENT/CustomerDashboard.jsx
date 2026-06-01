// ADMIN_TABS/CUSTOMER_SEGMENT/CustomerDashboard.jsx
//
// This component is a pure renderer — it reads ctab from the URL
// and mounts the matching sub-tab component from USER_TAB_REGISTRY.
//
// The sidebar navigation for switching sub-tabs now lives in AdminDashboard.
// Nothing in this file needs to change when you add a new sub-tab —
// just add it to userTabRegistry.js.

import React, { Suspense }   from "react";
import { useSearchParams }   from "react-router-dom";
import { USER_TAB_REGISTRY } from "./userTabRegistry";

const CustomerDashboard = () => {
  const [searchParams] = useSearchParams();

  // Default to first sub-tab if ctab is missing from URL
  const activeCtab = searchParams.get("ctab") || USER_TAB_REGISTRY[0]?.id;

  const activeTabConfig = USER_TAB_REGISTRY.find((t) => t.id === activeCtab);
  const SubTabComponent = activeTabConfig?.component ?? null;

  return (
    <div className="w-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        {SubTabComponent
          ? <SubTabComponent />
          : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Sub-tab not found
            </div>
          )
        }
      </Suspense>
    </div>
  );
};

export default CustomerDashboard;

