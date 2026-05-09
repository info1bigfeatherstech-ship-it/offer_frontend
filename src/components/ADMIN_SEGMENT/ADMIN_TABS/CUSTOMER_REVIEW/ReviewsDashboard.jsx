import React, { Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { REVIEW_TAB_REGISTRY } from "./reviewTabRegistry";

const ReviewsDashboard = () => {
  const [searchParams] = useSearchParams();

  const activeCtab = searchParams.get("ctab") || REVIEW_TAB_REGISTRY[0]?.id;

  const activeTabConfig = REVIEW_TAB_REGISTRY.find((t) => t.id === activeCtab);
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

export default ReviewsDashboard;
