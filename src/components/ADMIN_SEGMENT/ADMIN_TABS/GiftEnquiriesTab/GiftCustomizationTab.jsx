import React, { useState, useEffect, useCallback, useMemo } from "react";
import axiosInstance from "../../../../SERVICES/axiosInstance";
import { toast } from "react-toastify";
import {
  Gift,
  Search,
  RefreshCw,
  Eye,
  X,
  Check,
  Calendar,
  Phone,
  Mail,
  Building2,
  MapPin,
  Download,
  ExternalLink,
  FileText,
  MessageSquare,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Copy,
  Layers,
  Sparkles,
  Send,
  UserCheck,
  Image as ImageIcon,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function fmtDateOnly(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  contacted: {
    label: "Contacted",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  quoted: {
    label: "Quote Sent",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    dotClass: "bg-purple-500",
  },
  converted: {
    label: "Converted",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  closed: {
    label: "Closed / Lost",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    dotClass: "bg-slate-400",
  },
};

const STATUS_TABS = [
  { id: "all", label: "All Enquiries" },
  { id: "pending", label: "Pending" },
  { id: "contacted", label: "Contacted" },
  { id: "quoted", label: "Quoted" },
  { id: "converted", label: "Converted" },
  { id: "closed", label: "Closed" },
];

export default function GiftCustomizationTab() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const limit = 20;
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Detail Modal
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState("pending");
  const [modalAdminNote, setModalAdminNote] = useState("");
  const [modalConvertedOrderId, setModalConvertedOrderId] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // ── Fetch Custom Gift Enquiries List ───────────────────────────────────────
  const fetchEnquiries = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params = {
          page,
          limit,
          enquiryType: "custom", // Dedicated to custom gifts
        };
        if (statusFilter !== "all") params.status = statusFilter;
        if (appliedSearch.trim()) params.search = appliedSearch.trim();

        const res = await axiosInstance.get("/admin/gift-enquiries", {
          params,
          authContext: "admin",
        });

        if (res.data?.success) {
          setEnquiries(res.data.data || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        } else {
          setEnquiries([]);
        }
      } catch (err) {
        console.error("Error loading gift customization enquiries:", err);
        toast.error(
          err?.response?.data?.message ||
            err.message ||
            "Could not load gift customization enquiries."
        );
        setEnquiries([]);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, limit, statusFilter, appliedSearch]
  );

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  // ── Search Handler ─────────────────────────────────────────────────────────
  const handleSearchSubmit = (e) => {
    e?.preventDefault?.();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  };

  // ── Open Detail Modal ──────────────────────────────────────────────────────
  const handleOpenDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await axiosInstance.get(`/admin/gift-enquiries/${id}`, {
        authContext: "admin",
      });
      if (res.data?.success) {
        const doc = res.data.data;
        setSelectedEnquiry(doc);
        setModalStatus(doc.status || "pending");
        setModalAdminNote(doc.adminNote || "");
        setModalConvertedOrderId(doc.convertedOrderId || "");
      } else {
        toast.error(res.data?.message || "Failed to load details");
      }
    } catch (err) {
      console.error("Error loading enquiry details:", err);
      toast.error(
        err?.response?.data?.message || "Failed to fetch enquiry details"
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Save Status & Admin Note ───────────────────────────────────────────────
  const handleSaveStatus = async () => {
    if (!selectedEnquiry?.id) return;
    setIsSavingStatus(true);
    try {
      const payload = {
        status: modalStatus,
        adminNote: modalAdminNote,
        ...(modalStatus === "converted" && modalConvertedOrderId.trim()
          ? { convertedOrderId: modalConvertedOrderId.trim() }
          : {}),
      };

      const res = await axiosInstance.patch(
        `/admin/gift-enquiries/${selectedEnquiry.id}/status`,
        payload,
        { authContext: "admin" }
      );

      if (res.data?.success) {
        toast.success("Enquiry status updated successfully!");
        const updatedDoc = res.data.data;
        setSelectedEnquiry(updatedDoc);

        // Update in table list state immediately
        setEnquiries((prev) =>
          prev.map((item) =>
            item.id === updatedDoc.id
              ? {
                  ...item,
                  status: updatedDoc.status,
                  adminNote: updatedDoc.adminNote,
                  updatedAt: updatedDoc.updatedAt,
                }
              : item
          )
        );
      } else {
        toast.error(res.data?.message || "Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error(
        err?.response?.data?.message || "Could not update enquiry status"
      );
    } finally {
      setIsSavingStatus(false);
    }
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Pagination buttons
  const totalPages = Math.max(1, Number(pagination.totalPages) || 1);
  const pageButtons = useMemo(() => {
    const maxButtons = 5;
    const start = Math.max(1, Math.min(page - 2, totalPages - maxButtons + 1));
    const end = Math.min(totalPages, start + maxButtons - 1);
    const list = [];
    for (let i = Math.max(1, start); i <= end; i += 1) list.push(i);
    return list;
  }, [page, totalPages]);

  return (
    <div className="bg-[#F8FAFC] min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#D97706] flex items-center justify-center shadow-sm">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Gift Customization Inquiries
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Review and track customer requests for personalized corporate gifts, welcome kits, and custom merchandise.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchEnquiries(true)}
          disabled={isRefreshing || loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:text-black hover:bg-gray-50 rounded-xl text-xs font-bold transition-all shadow-2xs self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={isRefreshing ? "animate-spin text-[#F7A221]" : ""}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Status Tabs Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200/80">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white bg-transparent"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Filters & Search ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200/80">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by customer name, email, phone, city, occasion, or gift category..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#F7A221] focus:ring-2 focus:ring-[#F7A221]/15 outline-none transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* ── Enquiries Table ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3 px-4">Customer &amp; Contact</th>
                <th className="py-3 px-4">Occasion &amp; Category</th>
                <th className="py-3 px-4">Quantity &amp; Date</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Uploaded Assets</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Received</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={22} className="animate-spin text-[#F7A221]" />
                      <span className="text-xs font-semibold">Loading custom gift enquiries...</span>
                    </div>
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Gift size={28} className="text-gray-300" />
                      <p className="text-xs sm:text-sm font-semibold text-gray-600">
                        No custom gift enquiries found
                      </p>
                      <p className="text-[11px] text-gray-400 max-w-sm">
                        {appliedSearch
                          ? `No enquiries matched "${appliedSearch}". Try clearing your search.`
                          : "Custom gift customization requests submitted through the storefront will appear here."}
                      </p>
                      {appliedSearch && (
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="mt-1 text-xs text-[#D97706] font-bold hover:underline cursor-pointer"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                enquiries.map((row) => {
                  const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.pending;
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-amber-50/20 transition-colors group"
                    >
                      {/* Customer & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-gray-900 group-hover:text-black">
                            {row.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                            CUSTOM
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-[11px]">
                          {row.phone && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Phone size={11} className="text-gray-400" />
                              {row.phone}
                            </span>
                          )}
                          {row.email && (
                            <span
                              className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                              title={row.email}
                              onClick={() => copyToClipboard(row.email, `email-${row.id}`)}
                            >
                              <Mail size={11} />
                              {copiedKey === `email-${row.id}` && (
                                <span className="text-[10px] text-emerald-600 font-bold">
                                  Copied
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        {row.organizationName && (
                          <div className="text-[11px] text-gray-400 truncate max-w-[180px] mt-0.5">
                            {row.organizationName}
                          </div>
                        )}
                      </td>

                      {/* Occasion & Purpose */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-gray-800">
                          {row.occasion || "—"}
                        </p>
                        {row.giftCategory && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/60 rounded-full">
                            {row.giftCategory}
                          </span>
                        )}
                      </td>

                      {/* Quantity & Date */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">
                          {row.quantity ? `${row.quantity} pcs` : "—"}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {row.targetDeliveryDate
                            ? fmtDateOnly(row.targetDeliveryDate)
                            : "Flexible Date"}
                        </p>
                      </td>

                      {/* City */}
                      <td className="py-3.5 px-4 text-gray-600">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <MapPin size={12} className="text-gray-400" />
                          <span>{row.city}</span>
                        </span>
                      </td>

                      {/* Uploaded Assets */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 text-[11px]">
                          {row.logoCount > 0 ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-bold flex items-center gap-1">
                              <Sparkles size={11} className="text-[#D97706]" />
                              <span>{row.logoCount} logo{row.logoCount > 1 ? "s" : ""}</span>
                            </span>
                          ) : null}

                          {row.referencePhotoCount > 0 ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold flex items-center gap-1">
                              <ImageIcon size={11} className="text-blue-500" />
                              <span>{row.referencePhotoCount} ref photo{row.referencePhotoCount > 1 ? "s" : ""}</span>
                            </span>
                          ) : null}

                          {row.logoCount === 0 && row.referencePhotoCount === 0 && (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Received */}
                      <td className="py-3.5 px-4 text-gray-500 text-[11px] whitespace-nowrap">
                        {fmtDate(row.createdAt)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(row.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ────────────────────────────────────── */}
        {!loading && enquiries.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50 gap-3 text-xs text-gray-600">
            <div>
              Showing{" "}
              <span className="font-bold text-gray-900">
                {(page - 1) * limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-gray-900">
                {Math.min(page * limit, pagination.total || enquiries.length)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-gray-900">
                {pagination.total || enquiries.length}
              </span>{" "}
              custom enquiries
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {pageButtons.map((btnPage) => (
                <button
                  key={btnPage}
                  type="button"
                  onClick={() => setPage(btnPage)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                    page === btnPage
                      ? "bg-gray-900 text-white"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {btnPage}
                </button>
              ))}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ────────────────────────────────────────────────────── */}
      {selectedEnquiry && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
          onClick={() => setSelectedEnquiry(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-gray-200 overflow-hidden my-6 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/60 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#D97706] flex items-center justify-center">
                  <Gift size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-gray-900">
                      Gift Customization Request
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      CUSTOM
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono">
                    ID: #{selectedEnquiry.id} &bull; Received {fmtDate(selectedEnquiry.createdAt)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
              {/* Row 1: Contact & Gifting Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Card */}
                <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <UserCheck size={14} className="text-gray-400" />
                    <span>Customer Information</span>
                  </h4>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="font-bold text-gray-900">{selectedEnquiry.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Phone:</span>
                      <div className="flex items-center gap-2 font-mono font-bold text-gray-900">
                        <span>{selectedEnquiry.phone}</span>
                        <a
                          href={`https://wa.me/91${selectedEnquiry.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Chat on WhatsApp"
                        >
                          <Send size={12} />
                        </a>
                      </div>
                    </div>
                    {selectedEnquiry.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-mono text-gray-900">{selectedEnquiry.email}</span>
                      </div>
                    )}
                    {selectedEnquiry.organizationName && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Company:</span>
                        <span className="font-medium text-gray-900">{selectedEnquiry.organizationName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span className="font-medium text-gray-900">{selectedEnquiry.city}</span>
                    </div>
                  </div>
                </div>

                {/* Gifting Details Card */}
                <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Gift size={14} className="text-[#D97706]" />
                    <span>Gifting Scope</span>
                  </h4>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Occasion:</span>
                      <span className="font-bold text-gray-900">{selectedEnquiry.occasion || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category:</span>
                      <span className="font-medium text-gray-900">{selectedEnquiry.giftCategory || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="font-bold text-gray-900">{selectedEnquiry.quantity || "—"} pcs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delivery Date:</span>
                      <span className="font-medium text-gray-900">
                        {selectedEnquiry.targetDeliveryDate
                          ? fmtDateOnly(selectedEnquiry.targetDeliveryDate)
                          : "Flexible Date"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Customer Message / Special Instructions */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-gray-400" />
                  <span>Customization Notes &amp; Special Instructions</span>
                </h4>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedEnquiry.message || "No instructions provided."}
                </div>
              </div>

              {/* Row 3: Brand Logos (0–3) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2.5 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#F7A221]" />
                  <span>Brand Logos Attached ({selectedEnquiry.logos?.length || 0}/3)</span>
                </h4>
                {selectedEnquiry.logos && selectedEnquiry.logos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {selectedEnquiry.logos.map((file, idx) => {
                      const isImg = file.mimeType?.startsWith("image/");
                      return (
                        <div
                          key={idx}
                          className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-[#F7A221] transition-colors"
                        >
                          <div
                            className="w-full aspect-video bg-gray-50 rounded-lg flex items-center justify-center mb-2 overflow-hidden border border-gray-100 cursor-pointer"
                            onClick={() => file.url && setLightboxUrl(file.url)}
                          >
                            {isImg && file.url ? (
                              <img
                                src={file.url}
                                alt={file.originalName || "Logo"}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-2 text-center">
                                <FileText size={24} className="text-[#D97706] mb-1" />
                                <span className="text-[10px] text-gray-500 font-bold uppercase">PDF Document</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 mb-2">
                            <p className="text-xs font-bold text-gray-900 truncate" title={file.originalName}>
                              {file.originalName || `Logo #${idx + 1}`}
                            </p>
                            <p className="text-[10px] text-gray-400">{formatBytes(file.sizeBytes)}</p>
                          </div>
                          {file.url && (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Download size={12} />
                              <span>Download</span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No brand logo files attached.</p>
                )}
              </div>

              {/* Row 4: Reference Photos (0–6) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2.5 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-blue-500" />
                  <span>Product Reference Photos ({selectedEnquiry.referencePhotos?.length || 0}/6)</span>
                </h4>
                {selectedEnquiry.referencePhotos && selectedEnquiry.referencePhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedEnquiry.referencePhotos.map((file, idx) => {
                      const isImg = file.mimeType?.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|tiff|heic|heif|avif|svg|jfif)$/i.test(file.url || file.originalName || "");
                      return (
                      <div
                        key={idx}
                        className="bg-white border border-gray-200 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs hover:border-blue-400 transition-colors"
                      >
                        <div
                          className="w-full aspect-square bg-gray-50 rounded-lg flex items-center justify-center mb-2 overflow-hidden border border-gray-100 cursor-pointer"
                          onClick={() => {
                            if (!file.url) return;
                            if (isImg) setLightboxUrl(file.url);
                            else window.open(file.url, "_blank");
                          }}
                        >
                          {isImg && file.url ? (
                            <img
                              src={file.url}
                              alt={file.originalName || "Reference"}
                              className="w-full h-full object-cover"
                            />
                          ) : file.url ? (
                            <div className="flex flex-col items-center justify-center p-2 text-center">
                              <FileText size={24} className="text-[#D97706] mb-1" />
                              <span className="text-[10px] text-gray-500 font-bold uppercase">PDF Document</span>
                            </div>
                          ) : (
                            <ImageIcon size={24} className="text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0 mb-2">
                          <p className="text-xs font-bold text-gray-900 truncate" title={file.originalName}>
                            {file.originalName || `Photo #${idx + 1}`}
                          </p>
                          <p className="text-[10px] text-gray-400">{formatBytes(file.sizeBytes)}</p>
                        </div>
                        {file.url && (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Download size={12} />
                            <span>Download</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No reference photos attached.</p>
                )}
              </div>

              {/* Row 5: Admin Status & Notes */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Update Enquiry Status &amp; Internal Notes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">
                      Current Status
                    </label>
                    <select
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:border-[#F7A221] outline-none cursor-pointer"
                    >
                      <option value="pending">Pending Review</option>
                      <option value="contacted">Contacted Customer</option>
                      <option value="quoted">Quotation Provided</option>
                      <option value="converted">Converted to Order</option>
                      <option value="closed">Closed / Not Interested</option>
                    </select>
                  </div>

                  {modalStatus === "converted" && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">
                        Converted Order ID (optional)
                      </label>
                      <input
                        type="text"
                        value={modalConvertedOrderId}
                        onChange={(e) => setModalConvertedOrderId(e.target.value)}
                        placeholder="e.g. ORD-98214"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-medium text-gray-800 focus:border-[#F7A221] outline-none"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    Internal Admin Notes (Private)
                  </label>
                  <textarea
                    rows={2}
                    value={modalAdminNote}
                    onChange={(e) => setModalAdminNote(e.target.value)}
                    placeholder="Log quotation amount, follow-up calls, sample tracking numbers, or customer preferences..."
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:border-[#F7A221] outline-none resize-y"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveStatus}
                    disabled={isSavingStatus}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSavingStatus ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-[#F7A221]" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Lightbox Modal ────────────────────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-transparent flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-amber-400 transition-colors p-1"
            >
              <X size={24} />
            </button>
            <img
              src={lightboxUrl}
              alt="Asset Enlarge"
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain bg-black/40"
            />
          </div>
        </div>
      )}
    </div>
  );
}

