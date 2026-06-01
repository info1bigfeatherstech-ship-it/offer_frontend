/**
 * StaffTable.jsx
 * Fully independent — fetches staff list, owns search/pagination,
 * dispatches delete. Opens CreateStaffForm and EditStaffForm modals.
 * Zero props needed from parent.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllStaff,
  deleteStaff,
  clearStaffMessages,
} from "../../ADMIN_REDUX_MANAGEMENT/staffSlice";
import {
  Eye, EyeOff, Edit2, Trash2, Mail, Briefcase,
  Calendar, Phone, Plus, Download, Search, ChevronLeft, ChevronRight,
} from "lucide-react";
import CreateStaffForm from "./CreateStaffForm";
import EditStaffForm from "./EditStaffForm";
import { ROLES, ROLE_LABELS } from "../../roles";

const STAFF_ROLES = Object.values(ROLES).filter((r) => r !== ROLES.ADMIN);

const STATUS_META = {
  active: { label: "Active", classes: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-500" },
  inactive: { label: "Inactive", classes: "bg-rose-50 text-rose-600 border-rose-100", dot: "bg-rose-500" },
};

const StaffTable = () => {
  const dispatch = useDispatch();
  const { list, pagination, loading, error, successMessage } = useSelector(
    (state) => state.staff
  );

  // ── local UI state ──
  const [showPasswordId, setShowPasswordId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);

  // ── fetch on mount and whenever filters change ──
  useEffect(() => {
    dispatch(fetchAllStaff({ page, search, role: roleFilter }));
  }, [dispatch, page, search, roleFilter]);

  // ── auto-clear messages ──
  useEffect(() => {
    if (successMessage || error) {
      const t = setTimeout(() => dispatch(clearStaffMessages()), 3500);
      return () => clearTimeout(t);
    }
  }, [successMessage, error, dispatch]);

  // ── handlers ──
  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("Delete this staff member? This cannot be undone.")) return;
      setDeletingId(id);
      await dispatch(deleteStaff(id));
      setDeletingId(null);
    },
    [dispatch]
  );

  const handleEdit = useCallback((staff) => {
    setSelectedStaff(staff);
    setShowEditModal(true);
  }, []);

  const downloadCSV = () => {
    const header = "Name,Email,Phone,Role,Status,Joined\n";
    const rows = list
      .map((s) =>
        [
          s.name,
          s.email,
          s.phone || "",
          s.role,
          s.status,
          new Date(s.createdAt).toLocaleDateString("en-IN"),
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* ── Toast ── */}
      {(successMessage || error) && (
        <div
          className={`px-4 py-3 rounded-xl text-sm font-semibold border animate-in fade-in slide-in-from-top-2 duration-300 ${error
              ? "bg-rose-50 text-rose-600 border-rose-100"
              : "bg-emerald-50 text-emerald-600 border-emerald-100"
            }`}
        >
          {error || successMessage}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Staff Directory
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Manage internal team members and access levels.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <Download size={16} />
            Download CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center cursor-pointer gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            <Plus size={18} />
            Add Staff
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
        >
          <option value="">All Roles</option>
          {STAFF_ROLES.map((roleValue) => (
            <option key={roleValue} value={roleValue}>
              {ROLE_LABELS[roleValue]}
            </option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Member", "Position", "Contact & Security", "Status", "Manage"].map(
                  (col, i) => (
                    <th
                      key={col}
                      className={`px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${i === 4 ? "text-right" : ""
                        }`}
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading.fetch ? (
                // skeleton rows
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-6 py-5">
                        <div className="h-4 bg-slate-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                list.map((staff) => {
                  const statusMeta = STATUS_META[staff.status] || STATUS_META.inactive;
                  const initials = staff.name?.split(" ").map((n) => n[0]).join("").toUpperCase();
                  const joined = new Date(staff.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  });

                  return (
                    <tr
                      key={staff._id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      {/* Member */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-900">
                              {staff.name}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={10} /> Joined {joined}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Position */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                          <Briefcase size={14} className="text-slate-300" />
                          {ROLE_LABELS[staff.role] || staff.role}
                        </div>
                      </td>

                      {/* Contact & Security */}
                      <td className="px-6 py-5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-[13px] text-slate-600">
                            <Mail size={13} className="text-slate-300" />
                            {staff.email}
                          </div>
                          {staff.phone && (
                            <div className="flex items-center gap-2 text-[13px] text-slate-500">
                              <Phone size={13} className="text-slate-300" />
                              {staff.phone}
                            </div>
                          )}
                          {/* password is never returned from backend — intentionally omitted */}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.classes}`}
                        >
                          <span className={`w-1 h-1 rounded-full mr-1.5 ${statusMeta.dot}`} />
                          {statusMeta.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <button
                            onClick={() => handleEdit(staff)}
                            className="p-2 cursor-pointer text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edit staff"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(staff._id)}
                            disabled={deletingId === staff._id}
                            className="p-2 cursor-pointer text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                            title="Delete staff"
                          >
                            {deletingId === staff._id ? (
                              <span className="w-[15px] h-[15px] border-2 border-rose-400 border-t-transparent rounded-full animate-spin inline-block" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-medium text-slate-500">
            Showing{" "}
            <span className="text-slate-900 font-semibold">
              {list.length}
            </span>{" "}
            of{" "}
            <span className="text-slate-900 font-semibold">
              {pagination?.total ?? list.length}
            </span>{" "}
            staff members
          </p>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-all ${p === page
                      ? "text-indigo-600 bg-white border border-indigo-100 shadow-sm"
                      : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                    }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showCreateModal && (
        <CreateStaffForm onClose={() => setShowCreateModal(false)} />
      )}
      {showEditModal && selectedStaff && (
        <EditStaffForm
          staff={selectedStaff}
          onClose={() => {
            setShowEditModal(false);
            setSelectedStaff(null);
          }}
        />
      )}
    </div>
  );
};

export default StaffTable;
