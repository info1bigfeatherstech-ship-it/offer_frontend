/**
 * StaffTab.jsx
 * Pure container — owns no logic, just composes independent components.
 * All state lives in Redux. Nothing is passed as props from here
 * except what each child explicitly needs.
 */

import React from "react";
import StaffTable from "./StaffTable";
import AdminProfileCard from "./AdminProfileCard";

const StaffTab = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6 font-sans max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Admin's own read-only profile card */}
      <AdminProfileCard />

      {/* Full staff directory with all CRUD built-in */}
      <StaffTable />
    </div>
  );
};

export default StaffTab;

