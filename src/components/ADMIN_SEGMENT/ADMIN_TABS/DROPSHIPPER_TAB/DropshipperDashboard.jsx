import React, { Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { DROPSHIPPER_TAB_REGISTRY } from "./dropshipperTabRegistry";

const DropshipperDashboard = () => {
  const [searchParams] = useSearchParams();
  const activeCtab = searchParams.get("ctab") || DROPSHIPPER_TAB_REGISTRY[0]?.id;
  const activeTabConfig = DROPSHIPPER_TAB_REGISTRY.find((tab) => tab.id === activeCtab);
  const SubTabComponent = activeTabConfig?.component ?? null;

  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        }
      >
        {SubTabComponent ? (
          <SubTabComponent />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            Sub-tab not found
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default DropshipperDashboard;
