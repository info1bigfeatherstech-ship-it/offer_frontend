import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Package,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Upload,
  CheckCircle2,
  ArrowLeft,
  X,
  FileCheck2,
  RefreshCw,
  Send,
  ChevronDown,
  Check,
  Search,
} from "lucide-react";

// ── Complete Indian States & Union Territories (28 States + 8 UTs) ─────────────
const INDIAN_STATES_AND_UTS = [
  // 28 States
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // 8 Union Territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi (NCT)",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
].sort((a, b) => a.localeCompare(b));

export default function BulkOrderPage() {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [formData, setFormData] = useState({
    contactPerson: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    businessType: "",
    gstin: "",
    orderVolume: "",
    requirement: "",
  });

  const [isCustomBusiness, setIsCustomBusiness] = useState(false);
  const [customBusiness, setCustomBusiness] = useState("");

  // Searchable State Dropdown State
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const stateDropdownRef = useRef(null);

  const [attachedFile, setAttachedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Math Captcha
  const [captcha, setCaptcha] = useState({ q: "", ans: 0 });
  const [userAnswer, setUserAnswer] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    setCaptcha({ q: `${a} + ${b} = ?`, ans: a + b });
    setUserAnswer("");
    setIsVerified(false);
  };

  const handleCaptchaChange = (e) => {
    const val = e.target.value.trim();
    setUserAnswer(val);
    setIsVerified(parseInt(val, 10) === captcha.ans);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    generateCaptcha();
  }, []);

  // Handle click outside to close state dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        stateDropdownRef.current &&
        !stateDropdownRef.current.contains(event.target)
      ) {
        setIsStateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setFormData((prev) => ({ ...prev, phone: String(value).replace(/\D/g, "").slice(0, 10) }));
      return;
    }
    if (name === "orderVolume") {
      setFormData((prev) => ({ ...prev, orderVolume: String(value).replace(/\D/g, "").slice(0, 6) }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBusinessTypeChange = (e) => {
    const val = e.target.value;
    if (val === "Other") {
      setIsCustomBusiness(true);
      setFormData((prev) => ({ ...prev, businessType: "Other" }));
    } else {
      setIsCustomBusiness(false);
      setCustomBusiness("");
      setFormData((prev) => ({ ...prev, businessType: val }));
    }
  };

  const handleSelectState = (st) => {
    setFormData((prev) => ({ ...prev, state: st }));
    setIsStateOpen(false);
    setStateSearch("");
  };

  // Filtered Indian states based on search query
  const filteredStates = useMemo(() => {
    const q = stateSearch.trim().toLowerCase();
    if (!q) return INDIAN_STATES_AND_UTS;
    return INDIAN_STATES_AND_UTS.filter((st) => st.toLowerCase().includes(q));
  }, [stateSearch]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    setAttachedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Contact Person validation (Required)
    if (!formData.contactPerson.trim()) {
      toast.error("Please enter the contact person name");
      return;
    }

    // 2. Phone validation (Required - 10-digit Indian number)
    const cleanPhone = formData.phone.replace(/\D/g, "");
    let normalizedPhone = cleanPhone;
    if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) {
      normalizedPhone = cleanPhone.slice(2);
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
      normalizedPhone = cleanPhone.slice(1);
    }
    if (normalizedPhone.length !== 10 || !/^[6-9]\d{9}$/.test(normalizedPhone)) {
      toast.error("Please enter a valid 10-digit Indian phone / WhatsApp number");
      return;
    }

    if (formData.orderVolume.trim()) {
      const volume = parseInt(formData.orderVolume.trim(), 10);
      if (!/^\d+$/.test(formData.orderVolume.trim()) || volume < 1 || volume > 100000) {
        toast.error("Order volume must be a number between 1 and 100000");
        return;
      }
    }

    // 3. Email validation (Optional, only validate format if provided)
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    // 4. City validation (Required)
    if (!formData.city.trim()) {
      toast.error("Please enter your city / district");
      return;
    }

    // 5. State validation (Required)
    if (!formData.state.trim()) {
      toast.error("Please select your state from the dropdown");
      return;
    }

    // 6. Business Type validation (Required, with custom input when 'Other')
    const finalBusinessType =
      formData.businessType === "Other" || isCustomBusiness
        ? customBusiness.trim()
        : formData.businessType;

    if (!finalBusinessType) {
      toast.error("Please select or enter your business type");
      return;
    }

    // 7. Business Card file check (optional, max 5MB)
    if (attachedFile && attachedFile.size > 5 * 1024 * 1024) {
      toast.error("Business card file must be 5 MB or smaller");
      return;
    }

    // 8. Math Captcha Anti-spam
    if (!isVerified) {
      toast.error("Please solve the verification math challenge");
      return;
    }

    setStatus("loading");

    try {
      const fd = new FormData();
      fd.append("enquiryType", "bulk");
      fd.append("name", formData.contactPerson.trim());
      fd.append("phone", normalizedPhone);
      fd.append("businessType", finalBusinessType);
      if (formData.email.trim()) {
        fd.append("email", formData.email.trim().toLowerCase());
      }
      if (formData.orderVolume.trim()) {
        fd.append("volumeOrder", formData.orderVolume.trim());
      }
      if (formData.requirement.trim()) {
        fd.append("message", formData.requirement.trim());
      }
      if (formData.city.trim()) {
        fd.append("city", formData.city.trim());
      }
      if (formData.state.trim()) {
        fd.append("state", formData.state.trim());
      }
      if (formData.gstin.trim()) {
        fd.append("organizationName", formData.gstin.trim());
      }
      if (attachedFile) {
        fd.append("businessCard", attachedFile);
      }

      const rawBase = String(import.meta.env.VITE_BACKEND_BASE_URL || "/api").trim();
      const API_BASE = rawBase.replace(/\/api\/?$/, "");
      const endpoint = `${API_BASE}/api/gift-enquiries`;

      const response = await fetch(endpoint, {
        method: "POST",
        body: fd,
        headers: {
          "x-storefront": "ecomm",
        },
      });
      const data = await response.json();

      if (response.status === 201) {
        setStatus("success");
        setIsDuplicate(false);
        toast.success(data.message || "Bulk order inquiry submitted successfully!");
      } else if (response.status === 200 && data.alreadyRegistered) {
        setStatus("success");
        setIsDuplicate(true);
        toast.info(data.message || "We already have your enquiry. Our team will contact you shortly.");
      } else {
        setStatus("idle");
        toast.error(data.message || "Could not submit inquiry. Please try again.");
      }
    } catch (err) {
      console.error("Bulk form submission error:", err);
      setStatus("idle");
      toast.error(err?.message || "Inquiry submission failed. Please check your connection.");
    }
  };

  const handleReset = () => {
    setFormData({
      contactPerson: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      businessType: "",
      gstin: "",
      orderVolume: "",
      requirement: "",
    });
    setCustomBusiness("");
    setIsCustomBusiness(false);
    setIsStateOpen(false);
    setStateSearch("");
    removeFile();
    generateCaptcha();
    setStatus("idle");
    setIsDuplicate(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 text-gray-900 font-sans pb-16">
      {/* ── Top Header / Breadcrumbs ────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200/80 sticky top-[68px] z-20 backdrop-blur-md bg-white/95">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between text-xs sm:text-sm">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-bold text-gray-600 hover:text-[#F7A221] transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2 text-gray-500 font-medium">
            <span>Home</span>
            <span>/</span>
            <span className="text-[#F7A221] font-bold">Bulk Orders</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-6 sm:pt-8 max-w-3xl">
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-lg border border-gray-100">
              {status === "success" ? (
                /* ── SUCCESS STATE ── */
                <div className="py-12 px-4 text-center animate-fadeIn">
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${
                      isDuplicate
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    <CheckCircle2 size={44} />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
                    {isDuplicate
                      ? "Enquiry Already Received!"
                      : "Bulk Inquiry Received!"}
                  </h2>
                  <p className="text-gray-600 max-w-lg mx-auto text-sm sm:text-base mb-3 leading-relaxed">
                    {isDuplicate
                      ? `We already have an active enquiry for ${formData.email || formData.phone || "this contact"}. Our wholesale procurement team is reviewing your requirement and will contact you shortly.`
                      : `Thank you, ${formData.contactPerson || "Partner"}! Our wholesale procurement manager will review your requirement and connect with you on WhatsApp / Phone within 24 hours.`}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-black transition-all shadow-md cursor-pointer"
                    >
                      <RefreshCw size={16} />
                      <span>Submit Another Inquiry</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ── FORM STATE ── */
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="border-b border-gray-100 pb-4 mb-6">
                    <h2 className="text-2xl font-medium text-gray-900">
                      Submit Your Bulk Inquiry
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 capitalize">
                      Fill out the wholesale procurement form below. Fields marked with{" "}
                      <span className="text-red-500 font-bold">*</span> are required.
                    </p>
                  </div>

                  {/* Row 1: Contact Person & Phone / WhatsApp (Both Required) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                        Contact Person Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="contactPerson"
                          required
                          value={formData.contactPerson}
                          onChange={handleInputChange}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#F7A221] focus:ring-4 focus:ring-[#F7A221]/15 transition-all outline-none"
                        />
                        <Building2
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                        Phone / WhatsApp Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          name="phone"
                          required
                          inputMode="numeric"
                          maxLength={10}
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="9876543210"
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#F7A221] focus:ring-4 focus:ring-[#F7A221]/15 transition-all outline-none"
                        />
                        <Phone
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Email (Optional) & Expected Order Volume */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                        Email Address{" "}
                        <span className="text-gray-400 font-normal lowercase">
                          (optional)
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="rahul@company.com"
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#F7A221] focus:ring-4 focus:ring-[#F7A221]/15 transition-all outline-none"
                        />
                        <Mail
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                        Expected Order Volume{" "}
                        <span className="text-gray-400 font-normal lowercase">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="number"
                        name="orderVolume"
                        min={1}
                        max={100000}
                        inputMode="numeric"
                        value={formData.orderVolume}
                        onChange={handleInputChange}
                        placeholder="e.g. 100"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#F7A221] focus:ring-4 focus:ring-[#F7A221]/15 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: City / District & State Dropdown with Search */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                        City / District <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="city"
                          required
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="e.g. Mumbai, Pune, Surat"
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#F7A221] focus:ring-4 focus:ring-[#F7A221]/15 transition-all outline-none"
                        />
                        <MapPin
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>

                    {/* Searchable State Dropdown */}
                    <div className="relative" ref={stateDropdownRef}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                        State / Union Territory <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsStateOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:border-[#F7A221] focus:ring-4 focus:ring-[#F7A221]/15 transition-all outline-none cursor-pointer text-left"
                      >
                        <span
                          className={
                            formData.state
                              ? "text-gray-900 font-medium"
                              : "text-gray-400"
                          }
                        >
                          {formData.state || "Select State / Union Territory"}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`text-gray-400 transition-transform duration-200 ${
                            isStateOpen ? "rotate-180 text-[#F7A221]" : ""
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu with Search */}
                      {isStateOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                          {/* Search bar inside dropdown */}
                          <div className="p-2.5 border-b border-gray-100 bg-gray-50/80 sticky top-0">
                            <div className="relative">
                              <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                              />
                              <input
                                type="text"
                                autoFocus
                                value={stateSearch}
                                onChange={(e) => setStateSearch(e.target.value)}
                                placeholder="Search all states & UTs..."
                                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-[#F7A221] outline-none"
                              />
                              {stateSearch && (
                                <button
                                  type="button"
                                  onClick={() => setStateSearch("")}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* State options list */}
                          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 text-xs sm:text-sm">
                            {filteredStates.length > 0 ? (
                              filteredStates.map((st) => {
                                const isSelected = formData.state === st;
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleSelectState(st)}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors cursor-pointer ${
                                      isSelected
                                        ? "bg-amber-50 text-[#D97706] font-bold"
                                        : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                  >
                                    <span>{st}</span>
                                    {isSelected && (
                                      <Check
                                        size={16}
                                        className="text-[#D97706]"
                                      />
                                    )}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="p-4 text-center text-xs text-gray-400">
                                No state found matching "{stateSearch}"
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Business Type (dropdown or direct text input if "Other") */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Business Type <span className="text-red-500">*</span>
                    </label>

                    {formData.businessType === "Other" || isCustomBusiness ? (
                      <div className="relative animate-fadeIn">
                        <input
                          type="text"
                          required
                          value={customBusiness}
                          onChange={(e) => setCustomBusiness(e.target.value)}
                          placeholder="Type your business type (e.g. Boutique, Agency, Hotel, Exporter...)"
                          autoFocus
                          className="w-full pl-4 pr-32 py-3 bg-white border-2 border-[#F7A221] rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:ring-4 focus:ring-[#F7A221]/15 transition-all outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomBusiness(false);
                            setCustomBusiness("");
                            setFormData((prev) => ({ ...prev, businessType: "" }));
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="Back to dropdown options"
                        >
                          <span>Select list</span>
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    ) : (
                      <select
                        name="businessType"
                        required
                        value={formData.businessType}
                        onChange={handleBusinessTypeChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:border-[#F7A221] focus:ring-4 focus:ring-[#F7A221]/15 transition-all outline-none cursor-pointer"
                      >
                        <option value="">Select Business Type</option>
                        <option value="Retail Store / Shop Owner">
                          Retail Store / Shop Owner
                        </option>
                        <option value="Wholesaler / Distributor">
                          Wholesaler / Distributor
                        </option>
                        <option value="Corporate / Company Buyer">
                          Corporate / Company Buyer
                        </option>
                        <option value="Online Seller / E-commerce">
                          Online Seller / E-commerce
                        </option>
                        <option value="Reseller / Dropshipper">
                          Reseller / Dropshipper
                        </option>
                        <option value="Event Organizer / Wedding Planner">
                          Event Organizer / Wedding Planner
                        </option>
                        <option value="Institutional / Educational">
                          Institutional / Educational
                        </option>
                        <option value="Other">Other (Type your own...)</option>
                      </select>
                    )}
                  </div>

                  {/* Row 5: Your Requirement / Message (Optional) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Your Requirement / Message{" "}
                      <span className="text-gray-400 font-normal lowercase">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      name="requirement"
                      rows={4}
                      value={formData.requirement}
                      onChange={handleInputChange}
                      placeholder="Please mention the product categories, specific items or SKUs, expected delivery date, custom branding requirements, or any specific wholesale pricing query (Optional)..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#F7A221] focus:ring-4 focus:ring-[#F7A221]/15 transition-all outline-none resize-y"
                    />
                  </div>

                  {/* Row 6: Attach Business Card / Shop Photo */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Attach Business Card / Shop Photo{" "}
                      <span className="text-gray-400 font-normal lowercase">
                        (optional)
                      </span>
                    </label>
                    <div className="mt-1">
                      {attachedFile ? (
                        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <div className="flex items-center gap-3 min-w-0">
                            {filePreview ? (
                              <img
                                src={filePreview}
                                alt="Preview"
                                className="w-12 h-12 rounded-lg object-cover border border-emerald-300 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                <FileCheck2
                                  size={24}
                                  className="text-emerald-700"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {attachedFile.name}
                              </p>
                              <p className="text-[11px] text-gray-500">
                                {(attachedFile.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeFile}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="bulk-file-upload"
                          className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-[#F7A221] bg-gray-50/70 hover:bg-orange-50/30 rounded-2xl p-6 cursor-pointer transition-all text-center group"
                        >
                          <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Upload
                              size={20}
                              className="text-gray-500 group-hover:text-[#F7A221]"
                            />
                          </div>
                          <p className="text-xs font-bold text-gray-700 group-hover:text-gray-900">
                            Click to upload or drag &amp; drop
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            Business Card, Visiting Card, GST Certificate or Shop Front Photo (PNG, JPG, PDF up to 10MB)
                          </p>
                          <input
                            id="bulk-file-upload"
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Math Verification Anti-Spam */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Anti-Spam Verification <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 border border-gray-200 px-4 py-2.5 rounded-xl font-mono font-bold text-gray-800 text-sm select-none tracking-widest">
                        {captcha.q}
                      </div>
                      <input
                        type="number"
                        required
                        value={userAnswer}
                        onChange={handleCaptchaChange}
                        placeholder="Answer"
                        className="w-28 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-[#F7A221] outline-none"
                      />
                      <button
                        type="button"
                        onClick={generateCaptcha}
                        className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        title="New question"
                      >
                        <RefreshCw size={16} />
                      </button>
                      {isVerified && (
                        <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 size={16} /> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-900 text-white font-extrabold text-sm sm:text-base tracking-wide uppercase transition-all duration-300 shadow-xl hover:shadow-2xl active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
                    >
                      {status === "loading" ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting Inquiry...</span>
                        </>
                      ) : (
                        <>
                          <Send size={18} className="text-[#F7A221]" />
                          <span>Submit Bulk Order Inquiry</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
      </div>
    </div>
  );
}
