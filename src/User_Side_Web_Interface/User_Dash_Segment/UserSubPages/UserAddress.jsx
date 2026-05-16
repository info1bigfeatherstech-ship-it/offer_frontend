// ============================================
// UserAddress.js - 100% ROBUST VERSION
// ============================================
import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  MapPin, Plus, Home, Briefcase, Star,
  Pencil, Trash2, X, RefreshCw, AlertCircle,
  ChevronRight, ChevronLeft, Loader2, ChevronDown,
  PlusCircle,
} from "lucide-react";

import {
  fetchAddresses, addAddress, updateAddress, deleteAddress,
  clearAddressErrors, selectDefaultAddress, selectOtherAddresses,
  selectAddressLoading, selectAddressError,
} from "../../../components/REDUX_FEATURES/REDUX_SLICES/Useraddressslice";
import {
  validateAddressFormStep2,
  ADDRESS_LINE1_MIN_LEN,
  ADDRESS_LINE_MAX_LEN
} from "../../../utils/addressValidation";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const ADDRESS_TYPE_ICON = {
  home: <Home size={15} className="text-[#F7A221]" />,
  work: <Briefcase size={15} className="text-blue-500" />,
  other: <MapPin size={15} className="text-gray-400" />,
};

const EMPTY_FORM = {
  fullName: "", phone: "", houseNumber: "", area: "",
  landmark: "", addressLine1: "", addressLine2: "",
  city: "", state: "", postalCode: "", country: "India",
  addressType: "home", isDefault: false,
  isGift: false, deliveryInstructions: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Custom Area Modal
// ─────────────────────────────────────────────────────────────────────────────
const CustomAreaModal = ({ isOpen, onClose, onSave }) => {
  const [areaName, setAreaName] = useState("");

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl">
        <div className="p-6">
          <h3 className="text-xl font-black text-gray-900 mb-2">Add Custom Area</h3>
          <p className="text-xs text-gray-500 mb-5">Enter area/locality name not listed in dropdown</p>
          
          <input
            type="text"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="e.g., Green Park Extension"
            className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-2xl px-5 py-3.5 text-sm font-bold outline-none mb-5"
            autoFocus
          />
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-black text-[10px] uppercase tracking-widest hover:border-black transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (areaName.trim()) {
                  onSave(areaName.trim());
                  setAreaName("");
                  onClose();
                }
              }}
              className="flex-1 py-3 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all"
            >
              Save Area
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Field — simple input
// ─────────────────────────────────────────────────────────────────────────────
const Field = ({
  label, name, value, onChange, required,
  type = "text", placeholder, maxLength,
  readOnly = false, loading = false,
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
      {label}{required && <span className="text-red-400 ml-1">*</span>}
      {readOnly && <span className="text-gray-300 ml-2 normal-case tracking-normal font-medium">(auto-filled)</span>}
    </label>
    <div className="relative">
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        readOnly={readOnly}
        className={`border-2 border-transparent rounded-2xl px-5 py-3.5 text-sm font-bold outline-none transition-all w-full
          ${readOnly
            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
            : "bg-gray-50 focus:border-black focus:bg-white"
          }
          ${loading ? "pr-10" : ""}
        `}
      />
      {loading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Loader2 size={14} className="animate-spin text-gray-400" />
        </div>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// AreaDropdown — with "+ Add Custom" button that opens modal
// ─────────────────────────────────────────────────────────────────────────────
const AreaDropdown = ({ value, onChange, options = [], required, onAddCustom, savedCustomAreas = [] }) => {
  const [open, setOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const ref = useRef(null);

  // Merge API options with saved custom areas (deduplicate)
  const allOptions = [...new Set([...options, ...savedCustomAreas])];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAddCustom = (customArea) => {
    onAddCustom?.(customArea);
    onChange({ target: { name: "area", value: customArea } });
  };

  return (
    <>
      <div className="flex flex-col gap-1.5 w-full relative" ref={ref}>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
          Area / Locality {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`bg-gray-50 border-2 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none transition-all w-full text-left flex items-center justify-between
            ${open ? "border-black bg-white" : "border-transparent"}
            ${!value ? "text-gray-400" : "text-gray-900"}
          `}
        >
          <span className="truncate">{value || "Select or add area / locality"}</span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
            {allOptions.map((opt, i) => (
              <li
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange({ target: { name: "area", value: opt } });
                  setOpen(false);
                }}
                className={`px-4 py-3 text-sm cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center gap-2
                  ${value === opt ? "bg-amber-50 font-black text-gray-900" : "text-gray-700 hover:bg-gray-50 font-bold"}
                `}
              >
                <MapPin size={11} className="text-[#F7A221] flex-shrink-0" />
                {opt}
                {savedCustomAreas.includes(opt) && !options.includes(opt) && (
                  <span className="text-[8px] font-black text-[#F7A221] bg-amber-50 px-2 py-0.5 rounded-full ml-auto">Custom</span>
                )}
              </li>
            ))}
            {/* Add Custom Option */}
            <li
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                setShowCustomModal(true);
              }}
              className="px-4 py-3 text-sm cursor-pointer border-t border-gray-200 bg-gray-50 hover:bg-amber-50 flex items-center gap-2 font-bold text-[#F7A221]"
            >
              <PlusCircle size={14} />
              + Add custom area (if not listed)
            </li>
          </ul>
        )}
      </div>

      <CustomAreaModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onSave={handleAddCustom}
      />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Address Card
// ─────────────────────────────────────────────────────────────────────────────
const AddressCard = ({ address, isDefault, onEdit, onDelete, onSetDefault, isDeleting }) => {
  const typeLabel = address.addressType
    ? address.addressType.charAt(0).toUpperCase() + address.addressType.slice(1).toLowerCase()
    : "Other";
  const addressLine = [
    address.fullName,
    address.phone,
    address.houseNumber,
    address.area,
    address.landmark,
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state].filter(Boolean).join(", ") +
      (address.postalCode ? ` — ${address.postalCode}` : ""),
  ].filter(Boolean).join(", ");

  return (
  <div className="py-3.5 border-b border-gray-100 last:border-b-0">
    <div className="flex items-start md:items-center gap-3">
      <div className="flex items-center justify-center shrink-0 w-9 h-9 rounded-lg bg-gray-100">
        {ADDRESS_TYPE_ICON[address.addressType] || ADDRESS_TYPE_ICON.other}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">
          <span className="font-semibold text-gray-900">{typeLabel}</span>
          {" "}
          <span className="text-gray-500 font-normal">{addressLine}</span>
        </p>
        {isDefault && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-gray-500">
            <Star size={10} className="fill-[#F7A221] text-[#F7A221]" />
            Default
          </span>
        )}
      </div>
      <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2">
      {!isDefault && (
        <button onClick={(e) => { e.stopPropagation(); onSetDefault(address); }}
          className="text-[10px] font-black uppercase tracking-widest text-[#F7A221] hover:underline cursor-pointer whitespace-nowrap">
          Set Default
        </button>
      )}
      <button onClick={(e) => { e.stopPropagation(); onEdit(address); }}
        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black cursor-pointer transition-colors">
        <Pencil size={12} /> Edit
      </button>
      <button onClick={(e) => { e.stopPropagation(); onDelete(address._id); }}
        disabled={isDeleting}
        className="ml-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 disabled:opacity-30 cursor-pointer transition-colors">
        {isDeleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      </div>
    </div>
  </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AddressFormModal - COMPLETE VERSION WITH EDIT MODE FIX
// ─────────────────────────────────────────────────────────────────────────────
const AddressFormModal = ({ initial, onSubmit, onClose, isSaving, error }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [areaOptions, setAreaOptions] = useState([]);
  const [savedCustomAreas, setSavedCustomAreas] = useState([]);
  const [isPincodeFetched, setIsPincodeFetched] = useState(false);

  // On edit mode: if address has pincode, fetch its areas on mount
  useEffect(() => {
    if (initial?.postalCode && initial.postalCode.length === 6 && !isPincodeFetched) {
      fetchPincodeDetails(initial.postalCode, true);
    }
  }, [initial?.postalCode]);

  // Lock body scroll
  useEffect(() => {
    const sw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${sw}px`;
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "0px";
    };
  }, []);

  const fetchPincodeDetails = async (pincode, isEditMode = false) => {
    if (pincode.length !== 6) return;

    setPincodeLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();

      if (data[0]?.Status === "Success") {
        const postOffices = data[0].PostOffice || [];
        const firstPO = postOffices[0];

        // Get unique area names
        const uniqueAreas = [...new Set(postOffices.map((po) => po.Name))];
        setAreaOptions(uniqueAreas);

        // In edit mode: preserve existing area if it's not in the new options
        // but still update city/state
        setForm((p) => {
          const updatedForm = {
            ...p,
            postalCode: pincode,
            city: firstPO.District || p.city,
            state: firstPO.State || p.state,
          };
          
          // Only auto-select area if:
          // 1. Not in edit mode, OR
          // 2. In edit mode but current area is empty
          // 3. In edit mode but current area is NOT in the new area options (preserve custom)
          if (!isEditMode) {
            updatedForm.area = p.area || uniqueAreas[0] || "";
          } else if (!p.area) {
            updatedForm.area = uniqueAreas[0] || "";
          }
          // If p.area exists and is custom (not in new options), keep it
          
          return updatedForm;
        });

        setIsPincodeFetched(true);
        
        if (!isEditMode) {
          toast.success(`📍 ${firstPO.District}, ${firstPO.State}`, { autoClose: 2000 });
        }
      } else {
        setAreaOptions([]);
        if (!isEditMode) toast.error("Invalid pincode — please check");
      }
    } catch (err) {
      console.error("[Pincode]", err);
      setAreaOptions([]);
      if (!isEditMode) toast.error("Could not fetch pincode details");
    } finally {
      setPincodeLoading(false);
    }
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const v = value.replace(/\D/g, "");
      if (v.length <= 10) setForm((p) => ({ ...p, phone: v }));
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  }, []);

  const handlePincodeChange = async (value) => {
    if (!/^\d*$/.test(value)) return;
    setForm((p) => ({ ...p, postalCode: value }));
    setIsPincodeFetched(false);
    
    if (value.length === 6) {
      await fetchPincodeDetails(value, false);
    } else {
      setAreaOptions([]);
    }
  };

  const handleAddCustomArea = (customArea) => {
    // Save to state
    setSavedCustomAreas(prev => {
      if (!prev.includes(customArea)) {
        return [...prev, customArea];
      }
      return prev;
    });
    
    // Also add to options temporarily
    setAreaOptions(prev => {
      if (!prev.includes(customArea)) {
        return [...prev, customArea];
      }
      return prev;
    });
  };

  const toggleBoolean = (key) => setForm((p) => ({ ...p, [key]: !p[key] }));
  const setType = (type) => setForm((p) => ({ ...p, addressType: type }));

  // Validation (pure — callers set formError / step)
  const validateStep = (s) => {
    if (s === 1) {
      if (!form.fullName.trim()) return "Full Name is required";
      const digits = String(form.phone || "").replace(/\D/g, "");
      if (digits.length !== 10) return "Phone must be exactly 10 digits";
      if (!/^\d{6}$/.test(form.postalCode)) return "Pincode must be 6 digits";
      if (!form.city) return "Invalid pincode — city not found";
    }
    if (s === 2) {
      const r = validateAddressFormStep2(form);
      if (!r.ok) return r.message;
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setStep((prev) => prev + 1);
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    const err1 = validateStep(1);
    if (err1) {
      setFormError(err1);
      setStep(1);
      return;
    }
    const err2 = validateStep(2);
    if (err2) {
      setFormError(err2);
      setStep(2);
      return;
    }
    setFormError(null);

    const payload = { ...form };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") payload[k] = null;
    });
    onSubmit(payload);
  };

  const handleClose = () => {
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-[40px] w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Step indicator */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= s ? "bg-black" : "bg-gray-100"}`} />
            ))}
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <h2 className="text-2xl font-black text-gray-900 mb-6">
            {step === 1 && "Who's receiving this?"}
            {step === 2 && "Where should we deliver?"}
            {step === 3 && "Final preferences"}
          </h2>

          {(formError || error) && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-6">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-xs font-bold text-red-700">
                {formError || error?.message || "Something went wrong"}
              </p>
            </div>
          )}

          <div className="space-y-5">

            {/* ── Step 1: Personal Info + Pincode ── */}
            {step === 1 && (
              <>
                <Field
                  label="Full Name" name="fullName" value={form.fullName}
                  onChange={handleChange} required placeholder="Ravi Kumar"
                />
                <Field
                  label="Phone Number" name="phone" value={form.phone}
                  onChange={handleChange} required type="tel"
                  placeholder="10-digit mobile number"
                />

                {/* Pincode */}
                <Field
                  label="Pincode" name="postalCode" value={form.postalCode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  required placeholder="6-digit pincode" maxLength={6}
                  loading={pincodeLoading}
                />

                {/* Preview of detected location */}
                {form.city && form.state && !pincodeLoading && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
                    <MapPin size={14} className="text-green-500 flex-shrink-0" />
                    <p className="text-xs text-green-700 font-bold">
                      {form.city}, {form.state}
                      {areaOptions.length > 0 && (
                        <span className="text-green-500 font-medium ml-2">
                          · {areaOptions.length} area{areaOptions.length > 1 ? "s" : ""} available
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ── Step 2: Address Details ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="House / Flat No." name="houseNumber"
                    value={form.houseNumber} onChange={handleChange}
                    required placeholder="42B, Tower 5"
                  />
                  
                  {/* Area Dropdown with + Add Custom Modal */}
                  <AreaDropdown
                    value={form.area}
                    onChange={handleChange}
                    options={areaOptions}
                    required
                    onAddCustom={handleAddCustomArea}
                    savedCustomAreas={savedCustomAreas}
                  />
                </div>

                <Field
                  label="Landmark" name="landmark"
                  value={form.landmark} onChange={handleChange}
                  placeholder="Near City Mall"
                />

                {/* Address Line 1 - Simple text input */}
                <Field
                  label={`Address line 1 (min. ${ADDRESS_LINE1_MIN_LEN} characters)`}
                  name="addressLine1"
                  value={form.addressLine1}
                  onChange={handleChange}
                  required
                  maxLength={ADDRESS_LINE_MAX_LEN}
                  placeholder="Street, building, road"
                />
                <p className="text-[10px] font-bold text-gray-400 -mt-3 ml-1">
                  Couriers need a full street line (at least {ADDRESS_LINE1_MIN_LEN} characters).
                </p>

                <Field
                  label="Address line 2 (optional)"
                  name="addressLine2"
                  value={form.addressLine2}
                  onChange={handleChange}
                  maxLength={ADDRESS_LINE_MAX_LEN}
                  placeholder="Floor, wing, apartment details"
                />

                <div className="grid grid-cols-2 gap-4">
                  {/* City - editable but pre-filled */}
                  <Field
                    label="City" name="city"
                    value={form.city} onChange={handleChange}
                    required placeholder="Mumbai"
                  />
                  
                  {/* Pincode - editable, re-triggers auto-fill */}
                  <Field
                    label="Pincode" name="postalCode"
                    value={form.postalCode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    required placeholder="400001" maxLength={6}
                    loading={pincodeLoading}
                  />
                </div>

                {/* State - READ ONLY */}
                <Field
                  label="State" name="state"
                  value={form.state} onChange={handleChange}
                  required placeholder="Maharashtra"
                  readOnly={true}
                />
              </div>
            )}

            {/* ── Step 3: Preferences ── */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Address Type
                  </label>
                  <div className="flex gap-2">
                    {["home", "work", "other"].map((t) => (
                      <button
                        key={t} type="button" onClick={() => setType(t)}
                        className={`flex-1 py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
                          form.addressType === t
                            ? "bg-black text-white border-black"
                            : "bg-gray-50 text-gray-400 border-transparent hover:border-gray-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <Field
                  label="Delivery Instructions" name="deliveryInstructions"
                  value={form.deliveryInstructions} onChange={handleChange}
                  placeholder="Ring bell / Leave at door / Call on arrival (optional)"
                />

                <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                  {[
                    { key: "isDefault", label: "Set as Default Address", color: "bg-black" },
                    { key: "isGift", label: "Is this a gift? 🎁", color: "bg-[#F7A221]" },
                  ].map(({ key, label, color }) => (
                    <div key={key} className="flex items-center justify-between cursor-pointer" onClick={() => toggleBoolean(key)}>
                      <span className="text-xs font-black text-gray-600 uppercase tracking-widest">{label}</span>
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${form[key] ? color : "bg-gray-200"}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form[key] ? "translate-x-5" : "translate-x-1"}`} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Address summary before save */}
                <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-3">Delivery Summary</p>
                  <p className="text-sm font-black text-gray-900">{form.fullName}</p>
                  <p className="text-xs text-gray-500 font-medium">
                    {[form.houseNumber, form.area, form.landmark, form.addressLine1, form.addressLine2]
                      .filter(Boolean).join(", ")}
                  </p>
                  <p className="text-xs font-bold text-gray-700">
                    {form.city}{form.state ? `, ${form.state}` : ""} — {form.postalCode}
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex gap-3 flex-shrink-0">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-6 py-4 rounded-2xl border-2 border-gray-200 font-black text-[10px] uppercase tracking-widest hover:border-black transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinalSubmit}
              disabled={isSaving}
              className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : initial ? "Update Address" : "Save Address"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// UserAddress — Main Component
// ─────────────────────────────────────────────────────────────────────────────
const UserAddress = () => {
  const dispatch = useDispatch();
  const defaultAddress = useSelector(selectDefaultAddress);
  const otherAddresses = useSelector(selectOtherAddresses);
  const loading = useSelector(selectAddressLoading);
  const error = useSelector(selectAddressError);

  const [modalOpen, setModalOpen] = useState(false);
  const [editAddress, setEditAddress] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    dispatch(fetchAddresses());
    return () => dispatch(clearAddressErrors());
  }, [dispatch]);

  const openAdd = () => { setEditAddress(null); setModalOpen(true); dispatch(clearAddressErrors()); };
  const openEdit = (a) => { setEditAddress(a); setModalOpen(true); dispatch(clearAddressErrors()); };
  const closeModal = () => { setModalOpen(false); setEditAddress(null); };

  const handleSubmit = async (formData) => {
    try {
      if (editAddress) {
        await dispatch(updateAddress({ id: editAddress._id, ...formData })).unwrap();
        toast.success("Address updated!", { theme: "dark" });
      } else {
        await dispatch(addAddress(formData)).unwrap();
        toast.success("Address added!", { theme: "dark" });
      }
      closeModal();
    } catch (e) {
      const detail =
        Array.isArray(e?.errors) && e.errors.length
          ? e.errors.map((x) => x.message).filter(Boolean).join(" ")
          : "";
      toast.error(detail || e?.message || "Failed to save address", { theme: "dark" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    setDeletingId(id);
    try {
      await dispatch(deleteAddress(id)).unwrap();
      toast.success("Address removed", { theme: "dark" });
    } catch (e) {
      toast.error(e?.message || "Failed to delete", { theme: "dark" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (addr) => {
    try {
      await dispatch(updateAddress({ id: addr._id, isDefault: true })).unwrap();
      toast.success("Default address updated", { theme: "dark" });
    } catch (e) {
      toast.error(e?.message || "Failed to set default", { theme: "dark" });
    }
  };

  const allCount = (defaultAddress ? 1 : 0) + otherAddresses.length;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">My addresses</h1>
        <button
          type="button"
          onClick={openAdd}
          className="mt-2 text-sm font-normal text-[#4CAF50] hover:underline cursor-pointer"
        >
          + Add new address
        </button>
      </div>

      {error.fetch && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-xs font-bold text-red-700 flex-1">{error.fetch.message || "Failed to load"}</p>
          <button onClick={() => dispatch(fetchAddresses())} className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 cursor-pointer">Retry</button>
        </div>
      )}

      {loading.fetch ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}
        </div>
      ) : allCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center">
            <MapPin size={40} className="text-gray-300" />
          </div>
          <h3 className="font-black text-gray-900 text-xl">No addresses yet</h3>
          <button onClick={openAdd} className="bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer">
            <Plus size={16} className="inline mr-2" /> Add Address
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          {defaultAddress && (
            <AddressCard address={defaultAddress} isDefault onEdit={openEdit} onDelete={handleDelete} onSetDefault={handleSetDefault} isDeleting={deletingId === defaultAddress._id} />
          )}
          {otherAddresses.map((addr) => (
            <AddressCard key={addr._id} address={addr} isDefault={false} onEdit={openEdit} onDelete={handleDelete} onSetDefault={handleSetDefault} isDeleting={deletingId === addr._id} />
          ))}
        </div>
      )}

      {modalOpen && (
        <AddressFormModal
          initial={editAddress}
          onSubmit={handleSubmit}
          onClose={closeModal}
          isSaving={loading.add || loading.update}
          error={error.add || error.update}
        />
      )}
    </div>
  );
};

export { AddressFormModal };
export default UserAddress;

// import React, { useEffect, useState, useCallback, useRef } from "react";
// import { createPortal } from "react-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import {
//   MapPin, Plus, Home, Briefcase, Star,
//   Pencil, Trash2, X, RefreshCw, AlertCircle,
//   ChevronRight, ChevronLeft, Loader2, ChevronDown,
// } from "lucide-react";

// import {
//   fetchAddresses, addAddress, updateAddress, deleteAddress,
//   clearAddressErrors, selectDefaultAddress, selectOtherAddresses,
//   selectAddressLoading, selectAddressError,
// } from "../../../components/REDUX_FEATURES/REDUX_SLICES/Useraddressslice";
// import useAutoComplete from "../../../components/HOOKS/useAutoComplete";

// // ─────────────────────────────────────────────────────────────────────────────
// // Constants
// // ─────────────────────────────────────────────────────────────────────────────
// const ADDRESS_TYPE_ICON = {
//   home: <Home size={15} className="text-[#F7A221]" />,
//   work: <Briefcase size={15} className="text-blue-500" />,
//   other: <MapPin size={15} className="text-gray-400" />,
// };

// const EMPTY_FORM = {
//   fullName: "", phone: "", houseNumber: "", area: "",
//   landmark: "", addressLine1: "", addressLine2: "",
//   city: "", state: "", postalCode: "", country: "India",
//   addressType: "home", isDefault: false,
//   isGift: false, deliveryInstructions: "",
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Field — generic input
// // ─────────────────────────────────────────────────────────────────────────────
// const Field = ({
//   label, name, value, onChange, required,
//   type = "text", placeholder, maxLength,
//   readOnly = false,
//   loading = false,
//   suffix = null,
// }) => (
//   <div className="flex flex-col gap-1.5 w-full">
//     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
//       {label}{required && <span className="text-red-400 ml-1">*</span>}
//       {readOnly && <span className="text-gray-300 ml-2 normal-case tracking-normal font-medium">(auto-filled)</span>}
//     </label>
//     <div className="relative">
//       <input
//         type={type}
//         name={name}
//         value={value}
//         onChange={onChange}
//         placeholder={placeholder}
//         maxLength={maxLength}
//         readOnly={readOnly}
//         className={`border-2 border-transparent rounded-2xl px-5 py-3.5 text-sm font-bold outline-none transition-all w-full
//           ${readOnly
//             ? "bg-gray-100 text-gray-500 cursor-not-allowed select-none"
//             : "bg-gray-50 focus:border-black focus:bg-white cursor-pointer focus:cursor-text"
//           }
//           ${loading ? "pr-10" : ""}
//         `}
//       />
//       {loading && (
//         <div className="absolute right-4 top-1/2 -translate-y-1/2">
//           <Loader2 size={14} className="animate-spin text-gray-400" />
//         </div>
//       )}
//       {suffix && !loading && (
//         <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
//           {suffix}
//         </div>
//       )}
//     </div>
//   </div>
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // AutocompleteField — input with LocationIQ dropdown
// // ─────────────────────────────────────────────────────────────────────────────
// const AutocompleteField = ({
//   label, name, value, onChange, required,
//   placeholder, suggestions = [], onSuggestionSelect,
//   loading = false, showNoResults = false,
// }) => (
//   <div className="flex flex-col gap-1.5 w-full relative">
//     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
//       {label}{required && <span className="text-red-400 ml-1">*</span>}
//     </label>

//     <div className="relative">
//       <input
//         type="text"
//         name={name}
//         value={value}
//         onChange={onChange}
//         placeholder={placeholder}
//         className="bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-2xl px-5 py-3.5 text-sm font-bold outline-none transition-all w-full cursor-pointer focus:cursor-text pr-10"
//       />
//       {loading ? (
//         <div className="absolute right-4 top-1/2 -translate-y-1/2">
//           <Loader2 size={14} className="animate-spin text-gray-400" />
//         </div>
//       ) : value?.length >= 4 && (
//         <div className="absolute right-4 top-1/2 -translate-y-1/2">
//           <MapPin size={14} className="text-gray-300" />
//         </div>
//       )}
//     </div>

//     {/* Dropdown */}
//     {suggestions.length > 0 && (
//       <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
//         {suggestions.map((item, i) => (
//           <li
//             key={i}
//             onMouseDown={(e) => { e.preventDefault(); onSuggestionSelect?.(item); }}
//             className="px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center gap-2.5"
//           >
//             <MapPin size={12} className="text-[#F7A221] flex-shrink-0" />
//             <span className="truncate">{item.display_name}</span>
//           </li>
//         ))}
//       </ul>
//     )}

//     {/* No results hint */}
//     {showNoResults && !loading && suggestions.length === 0 && (
//       <p className="text-[10px] text-gray-400 ml-2 mt-0.5">No localities found — try typing more</p>
//     )}
//   </div>
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // AreaDropdown — select from all post offices of the pincode
// // ─────────────────────────────────────────────────────────────────────────────
// const AreaDropdown = ({ label, value, onChange, options = [], required }) => {
//   const [open, setOpen] = useState(false);
//   const ref = useRef(null);

//   useEffect(() => {
//     const handler = (e) => {
//       if (ref.current && !ref.current.contains(e.target)) setOpen(false);
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   if (options.length === 0) {
//     // Fallback to plain input if no pincode lookup yet
//     return (
//       <Field
//         label={label} name="area" value={value}
//         onChange={onChange} required={required}
//         placeholder="Colony / Sector / Village"
//       />
//     );
//   }

//   return (
//     <div className="flex flex-col gap-1.5 w-full relative" ref={ref}>
//       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
//         {label}{required && <span className="text-red-400 ml-1">*</span>}
//       </label>
//       <button
//         type="button"
//         onClick={() => setOpen((o) => !o)}
//         className={`bg-gray-50 border-2 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none transition-all w-full text-left flex items-center justify-between
//           ${open ? "border-black bg-white" : "border-transparent"}
//           ${!value ? "text-gray-400" : "text-gray-900"}
//         `}
//       >
//         <span className="truncate">{value || "Select area / post office"}</span>
//         <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
//       </button>

//       {open && (
//         <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
//           {options.map((opt, i) => (
//             <li
//               key={i}
//               onMouseDown={(e) => {
//                 e.preventDefault();
//                 onChange({ target: { name: "area", value: opt } });
//                 setOpen(false);
//               }}
//               className={`px-4 py-3 text-sm cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center gap-2
//                 ${value === opt ? "bg-amber-50 font-black text-gray-900" : "text-gray-700 hover:bg-gray-50 font-bold"}
//               `}
//             >
//               <MapPin size={11} className="text-[#F7A221] flex-shrink-0" />
//               {opt}
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Address Card
// // ─────────────────────────────────────────────────────────────────────────────
// const AddressCard = ({ address, isDefault, onEdit, onDelete, onSetDefault, isDeleting }) => (
//   <div className={`p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] relative overflow-hidden transition-all duration-300 border-2 cursor-pointer hover:shadow-xl ${isDefault ? "border-black shadow-xl ring-4 ring-black/5" : "border-gray-100 hover:border-black"}`}>
//     {isDefault && (
//       <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
//         <Star size={10} className="fill-[#F7A221] text-[#F7A221]" />
//         <span>Default</span>
//       </div>
//     )}
//     <div className="flex items-center gap-2 mb-4">
//       <div className="p-2 bg-gray-50 rounded-xl">
//         {ADDRESS_TYPE_ICON[address.addressType] || ADDRESS_TYPE_ICON.other}
//       </div>
//       <span className="font-black uppercase text-[10px] tracking-widest text-gray-400">{address.addressType}</span>
//     </div>
//     <h4 className="font-black text-gray-900 text-base leading-tight pr-20">{address.fullName}</h4>
//     <p className="text-xs text-gray-400 font-bold mt-0.5 mb-4">{address.phone}</p>
//     <p className="text-sm font-medium text-gray-600 leading-relaxed">
//       {[address.houseNumber, address.area, address.landmark, address.addressLine1, address.addressLine2]
//         .filter(Boolean).join(", ")}
//       <br />
//       <span className="text-gray-900 font-bold">
//         {address.city}, {address.state} — {address.postalCode}
//       </span>
//     </p>
//     <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-3">
//       {!isDefault && (
//         <button onClick={(e) => { e.stopPropagation(); onSetDefault(address); }}
//           className="text-[10px] font-black uppercase tracking-widest text-[#F7A221] hover:underline cursor-pointer whitespace-nowrap">
//           Set Default
//         </button>
//       )}
//       <button onClick={(e) => { e.stopPropagation(); onEdit(address); }}
//         className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black cursor-pointer transition-colors">
//         <Pencil size={12} /> Edit
//       </button>
//       <button onClick={(e) => { e.stopPropagation(); onDelete(address._id); }}
//         disabled={isDeleting}
//         className="ml-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 disabled:opacity-30 cursor-pointer transition-colors">
//         {isDeleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
//         {isDeleting ? "Deleting..." : "Delete"}
//       </button>
//     </div>
//   </div>
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // AddressFormModal
// // ─────────────────────────────────────────────────────────────────────────────
// const AddressFormModal = ({ initial, onSubmit, onClose, isSaving, error }) => {
//   const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
//   const [step, setStep] = useState(1);
//   const [formError, setFormError] = useState(null);
//   const [pincodeLoading, setPincodeLoading] = useState(false);

//   // Area options from pincode API (all post offices for that pincode)
//   const [areaOptions, setAreaOptions] = useState([]);

//   // Autocomplete state for addressLine1 and addressLine2
//   const [isTyping1, setIsTyping1] = useState(false);
//   const [isSelected1, setIsSelected1] = useState(false);
//   const [isTyping2, setIsTyping2] = useState(false);
//   const [isSelected2, setIsSelected2] = useState(false);

//   const dropdownRef = useRef(null);

//   // ── Fixed hook calls — correct signature: (query, city, delay) ──
//   // Only fire when user is actively typing AND hasn't selected yet AND 4+ chars
//   const searchQuery1 = (isTyping1 && !isSelected1 && form.addressLine1?.length >= 4)
//     ? form.addressLine1
//     : "";
//   const searchQuery2 = (isTyping2 && !isSelected2 && form.addressLine2?.length >= 4)
//     ? form.addressLine2
//     : "";

//   const { result: suggestions1, setResult: setRaw1, loading: loading1 } =
//     useAutoComplete(searchQuery1, form.city, 500);

//   const { result: suggestions2, setResult: setRaw2, loading: loading2 } =
//     useAutoComplete(searchQuery2, form.city, 500);

//   // Lock body scroll
//   useEffect(() => {
//     const sw = window.innerWidth - document.documentElement.clientWidth;
//     document.body.style.overflow = "hidden";
//     document.body.style.paddingRight = `${sw}px`;
//     return () => {
//       document.body.style.overflow = "unset";
//       document.body.style.paddingRight = "0px";
//     };
//   }, []);

//   // Close dropdowns on outside click
//   useEffect(() => {
//     const handler = (e) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
//         setIsTyping1(false);
//         setIsTyping2(false);
//       }
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   // ── handleChange — only addressLine fields trigger autocomplete ──
//   const handleChange = useCallback((e) => {
//     const { name, value } = e.target;

//     if (name === "phone") {
//       const v = value.replace(/\D/g, "");
//       if (v.length <= 10) setForm((p) => ({ ...p, phone: v }));
//       return;
//     }

//     if (name === "addressLine1") {
//       setIsSelected1(false);
//       setIsTyping1(true);
//       setForm((p) => ({ ...p, addressLine1: value }));
//       return;
//     }

//     if (name === "addressLine2") {
//       setIsSelected2(false);
//       setIsTyping2(true);
//       setForm((p) => ({ ...p, addressLine2: value }));
//       return;
//     }

//     setForm((p) => ({ ...p, [name]: value }));
//   }, []);

//   // ── handlePincodeChange — fetches city/state/area options ──
//   const handlePincodeChange = async (value) => {
//     if (!/^\d*$/.test(value)) return;
//     setForm((p) => ({ ...p, postalCode: value }));
//     if (value.length !== 6) return;

//     setPincodeLoading(true);
//     try {
//       const res = await fetch(`https://api.postalpincode.in/pincode/${value}`);
//       const data = await res.json();

//       if (data[0]?.Status === "Success") {
//         const postOffices = data[0].PostOffice || [];
//         const firstPO = postOffices[0];

//         // Collect all unique post office names for area dropdown
//         const allAreaNames = [...new Set(postOffices.map((po) => po.Name))];
//         setAreaOptions(allAreaNames);

//         setForm((p) => ({
//           ...p,
//           postalCode: value,
//           city: firstPO.District || p.city,
//           state: firstPO.State || p.state,
//           // Pre-select first area; user can change via dropdown
//           area: p.area || firstPO.Name || p.area,
//         }));

//         toast.success(`📍 ${firstPO.District}, ${firstPO.State}`, { autoClose: 2000 });
//       } else {
//         setAreaOptions([]);
//         toast.error("Invalid pincode — please check and retry");
//       }
//     } catch (err) {
//       console.error("[Pincode]", err);
//       setAreaOptions([]);
//       toast.error("Could not fetch pincode details");
//     } finally {
//       setPincodeLoading(false);
//     }
//   };

//   // Suggestion select for addressLine1
//   const handleSuggestionSelect1 = useCallback((place) => {
//     // Use only the meaningful part — strip city/state/country suffix
//     const localPart = extractLocalPart(place.display_name, form.city);
//     setForm((p) => ({ ...p, addressLine1: localPart }));
//     setIsSelected1(true);
//     setIsTyping1(false);
//     setRaw1([]);
//   }, [form.city, setRaw1]);

//   // Suggestion select for addressLine2
//   const handleSuggestionSelect2 = useCallback((place) => {
//     const localPart = extractLocalPart(place.display_name, form.city);
//     setForm((p) => ({ ...p, addressLine2: localPart }));
//     setIsSelected2(true);
//     setIsTyping2(false);
//     setRaw2([]);
//   }, [form.city, setRaw2]);

//   const handleClose = () => {
//     setRaw1([]);
//     setRaw2([]);
//     onClose();
//   };

//   const toggleBoolean = (key) => setForm((p) => ({ ...p, [key]: !p[key] }));
//   const setType = (type) => setForm((p) => ({ ...p, addressType: type }));

//   // ── Validation ──
//   const validateStep = (s) => {
//     setFormError(null);
//     if (s === 1) {
//       if (!form.fullName.trim()) return "Full Name is required";
//       if (form.phone.length !== 10) return "Phone must be exactly 10 digits";
//       if (!/^\d{6}$/.test(form.postalCode)) return "Postal code must be 6 digits";
//       if (!form.city) return "City is required — please enter a valid pincode";
//     }
//     if (s === 2) {
//       if (!form.houseNumber?.trim()) return "House number is required";
//       if (!form.area?.trim()) return "Area is required";
//       if (!form.city?.trim()) return "City is required";
//       if (!form.state?.trim()) return "State is required";
//       if (!/^\d{6}$/.test(form.postalCode)) return "Postal code must be 6 digits";
//     }
//     return null;
//   };

//   const handleNext = () => {
//     const err = validateStep(step);
//     if (err) { setFormError(err); return; }
//     setFormError(null);
//     setStep((s) => s + 1);
//   };

//   const handleFinalSubmit = (e) => {
//     e.preventDefault();
//     const err = validateStep(step);
//     if (err) { setFormError(err); return; }

//     const payload = { ...form };
//     Object.keys(payload).forEach((k) => {
//       if (payload[k] === "") payload[k] = null;
//     });
//     onSubmit(payload);
//   };

//   return createPortal(
//     <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
//       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

//       <div className="relative bg-white rounded-[40px] w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

//         {/* Step indicator */}
//         <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-gray-50 flex-shrink-0">
//           <div className="flex items-center gap-3">
//             {[1, 2, 3].map((s) => (
//               <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= s ? "bg-black" : "bg-gray-100"}`} />
//             ))}
//           </div>
//           <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
//             <X size={20} />
//           </button>
//         </div>

//         {/* Body */}
//         <div className="flex-1 overflow-y-auto px-8 py-6">
//           <h2 className="text-2xl font-black text-gray-900 mb-6">
//             {step === 1 && "Who's receiving this?"}
//             {step === 2 && "Where should we deliver?"}
//             {step === 3 && "Final preferences"}
//           </h2>

//           {(formError || error) && (
//             <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-6">
//               <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
//               <p className="text-xs font-bold text-red-700">
//                 {formError || error?.message || "Something went wrong"}
//               </p>
//             </div>
//           )}

//           <div className="space-y-5">

//             {/* ── Step 1: Personal Info + Pincode ── */}
//             {step === 1 && (
//               <>
//                 <Field
//                   label="Full Name" name="fullName" value={form.fullName}
//                   onChange={handleChange} required placeholder="Ravi Kumar"
//                 />
//                 <Field
//                   label="Phone Number" name="phone" value={form.phone}
//                   onChange={handleChange} required type="tel"
//                   placeholder="10-digit mobile number"
//                 />

//                 {/* Pincode — triggers city/state/area auto-fill */}
//                 <Field
//                   label="Pincode" name="postalCode" value={form.postalCode}
//                   onChange={(e) => handlePincodeChange(e.target.value)}
//                   required placeholder="6-digit pincode" maxLength={6}
//                   loading={pincodeLoading}
//                 />

//                 {/* Preview of what was detected */}
//                 {form.city && form.state && !pincodeLoading && (
//                   <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
//                     <MapPin size={14} className="text-green-500 flex-shrink-0" />
//                     <p className="text-xs text-green-700 font-bold">
//                       {form.city}, {form.state}
//                       {areaOptions.length > 0 && (
//                         <span className="text-green-500 font-medium ml-2">
//                           · {areaOptions.length} area{areaOptions.length > 1 ? "s" : ""} found
//                         </span>
//                       )}
//                     </p>
//                   </div>
//                 )}
//               </>
//             )}

//             {/* ── Step 2: Address Details ── */}
//             {step === 2 && (
//               <div ref={dropdownRef} className="space-y-5">
//                 <div className="grid grid-cols-2 gap-4">
//                   <Field
//                     label="House / Flat No." name="houseNumber"
//                     value={form.houseNumber} onChange={handleChange}
//                     required placeholder="42B"
//                   />
//                   {/* Area — dropdown if pincode was entered, plain input otherwise */}
//                   <AreaDropdown
//                     label="Area / Locality"
//                     value={form.area}
//                     onChange={handleChange}
//                     options={areaOptions}
//                     required
//                   />
//                 </div>

//                 <Field
//                   label="Landmark" name="landmark"
//                   value={form.landmark} onChange={handleChange}
//                   placeholder="Near City Mall, Opposite Metro Station"
//                 />

//                 {/* Address Line 1 — LocationIQ autocomplete, city-scoped */}
//                 <AutocompleteField
//                   label="Street / Building Name"
//                   name="addressLine1"
//                   value={form.addressLine1}
//                   onChange={handleChange}
//                   placeholder={`Street name in ${form.city || "your city"}…`}
//                   suggestions={suggestions1}
//                   loading={loading1}
//                   onSuggestionSelect={handleSuggestionSelect1}
//                   showNoResults={isTyping1 && !isSelected1 && form.addressLine1?.length >= 4}
//                 />

//                 {/* Address Line 2 — optional, also LocationIQ autocomplete */}
//                 <AutocompleteField
//                   label="Address Line 2 (optional)"
//                   name="addressLine2"
//                   value={form.addressLine2}
//                   onChange={handleChange}
//                   placeholder="Floor, Wing, Additional details"
//                   suggestions={suggestions2}
//                   loading={loading2}
//                   onSuggestionSelect={handleSuggestionSelect2}
//                   showNoResults={isTyping2 && !isSelected2 && form.addressLine2?.length >= 4}
//                 />

//                 <div className="grid grid-cols-2 gap-4">
//                   {/* City — auto-filled, editable */}
//                   <Field
//                     label="City" name="city"
//                     value={form.city} onChange={handleChange}
//                     required placeholder="Mumbai"
//                   />
//                   {/* Pincode — editable, re-triggers auto-fill */}
//                   <Field
//                     label="Pincode" name="postalCode"
//                     value={form.postalCode}
//                     onChange={(e) => handlePincodeChange(e.target.value)}
//                     required placeholder="400001" maxLength={6}
//                     loading={pincodeLoading}
//                   />
//                 </div>

//                 {/* State — READ ONLY, auto-filled from pincode */}
//                 <Field
//                   label="State" name="state"
//                   value={form.state} onChange={handleChange}
//                   required placeholder="Maharashtra"
//                   readOnly={true}
//                 />
//               </div>
//             )}

//             {/* ── Step 3: Preferences ── */}
//             {step === 3 && (
//               <div className="space-y-6">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
//                     Address Type
//                   </label>
//                   <div className="flex gap-2">
//                     {["home", "work", "other"].map((t) => (
//                       <button
//                         key={t} type="button" onClick={() => setType(t)}
//                         className={`flex-1 py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
//                           form.addressType === t
//                             ? "bg-black text-white border-black"
//                             : "bg-gray-50 text-gray-400 border-transparent hover:border-gray-200"
//                         }`}
//                       >
//                         {t}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 <Field
//                   label="Delivery Instructions" name="deliveryInstructions"
//                   value={form.deliveryInstructions} onChange={handleChange}
//                   placeholder="Ring bell / Leave at door / Call on arrival"
//                 />

//                 <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
//                   {[
//                     { key: "isDefault", label: "Default Address", color: "bg-black" },
//                     { key: "isGift", label: "Is this a gift? 🎁", color: "bg-[#F7A221]" },
//                   ].map(({ key, label, color }) => (
//                     <div key={key} className="flex items-center justify-between cursor-pointer" onClick={() => toggleBoolean(key)}>
//                       <span className="text-xs font-black text-gray-600 uppercase tracking-widest">{label}</span>
//                       <div className={`w-10 h-6 rounded-full relative transition-colors ${form[key] ? color : "bg-gray-200"}`}>
//                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form[key] ? "translate-x-5" : "translate-x-1"}`} />
//                       </div>
//                     </div>
//                   ))}
//                 </div>

//                 {/* Address summary before save */}
//                 <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 space-y-1">
//                   <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-3">Delivery Summary</p>
//                   <p className="text-sm font-black text-gray-900">{form.fullName}</p>
//                   <p className="text-xs text-gray-500 font-medium">
//                     {[form.houseNumber, form.area, form.landmark, form.addressLine1, form.addressLine2]
//                       .filter(Boolean).join(", ")}
//                   </p>
//                   <p className="text-xs font-bold text-gray-700">
//                     {form.city}{form.state ? `, ${form.state}` : ""} {form.postalCode ? `— ${form.postalCode}` : ""}
//                   </p>
//                 </div>
//               </div>
//             )}

//           </div>
//         </div>

//         {/* Footer */}
//         <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex gap-3 flex-shrink-0">
//           {step > 1 && (
//             <button
//               onClick={() => setStep((s) => s - 1)}
//               className="px-6 py-4 rounded-2xl border-2 border-gray-200 font-black text-[10px] uppercase tracking-widest hover:border-black transition-all cursor-pointer"
//             >
//               <ChevronLeft size={16} />
//             </button>
//           )}
//           {step < 3 ? (
//             <button
//               onClick={handleNext}
//               className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer"
//             >
//               Continue <ChevronRight size={16} />
//             </button>
//           ) : (
//             <button
//               onClick={handleFinalSubmit}
//               disabled={isSaving}
//               className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer disabled:cursor-not-allowed"
//             >
//               {isSaving ? "Saving..." : initial ? "Update Address" : "Save Address"}
//             </button>
//           )}
//         </div>
//       </div>
//     </div>,
//     document.body
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Helper — extract the meaningful local part from a LocationIQ display_name
// // e.g. "Rohini Sector 3, North West Delhi, Delhi, India" → "Rohini Sector 3"
// // ─────────────────────────────────────────────────────────────────────────────
// function extractLocalPart(displayName, city) {
//   if (!displayName) return "";

//   const parts = displayName
//     .split(",")
//     .map((p) => p.trim())
//     .filter((p) => {
//       if (p === "India") return false;
//       if (/^\d{6}$/.test(p)) return false;
//       return true;
//     });

//   // Return up to 2 parts (building/street + locality) — not the full chain
//   // This keeps it short and usable in the address line input
//   const cityLower = city?.toLowerCase() || "";
//   const cityIdx = parts.findIndex((p) => p.toLowerCase().includes(cityLower));
//   const cutoff = cityIdx > 1 ? cityIdx : Math.min(2, parts.length);

//   return parts.slice(0, cutoff).join(", ");
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // UserAddress — Main Component (unchanged)
// // ─────────────────────────────────────────────────────────────────────────────
// const UserAddress = () => {
//   const dispatch = useDispatch();
//   const defaultAddress = useSelector(selectDefaultAddress);
//   const otherAddresses = useSelector(selectOtherAddresses);
//   const loading = useSelector(selectAddressLoading);
//   const error = useSelector(selectAddressError);

//   const [modalOpen, setModalOpen] = useState(false);
//   const [editAddress, setEditAddress] = useState(null);
//   const [deletingId, setDeletingId] = useState(null);

//   useEffect(() => {
//     dispatch(fetchAddresses());
//     return () => dispatch(clearAddressErrors());
//   }, [dispatch]);

//   const openAdd = () => { setEditAddress(null); setModalOpen(true); dispatch(clearAddressErrors()); };
//   const openEdit = (a) => { setEditAddress(a); setModalOpen(true); dispatch(clearAddressErrors()); };
//   const closeModal = () => { setModalOpen(false); setEditAddress(null); };

//   const handleSubmit = async (formData) => {
//     try {
//       if (editAddress) {
//         await dispatch(updateAddress({ id: editAddress._id, ...formData })).unwrap();
//         toast.success("Address updated!", { theme: "dark" });
//       } else {
//         await dispatch(addAddress(formData)).unwrap();
//         toast.success("Address added!", { theme: "dark" });
//       }
//       closeModal();
//     } catch (e) {
//       toast.error(e?.message || "Failed to save address", { theme: "dark" });
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm("Delete this address?")) return;
//     setDeletingId(id);
//     try {
//       await dispatch(deleteAddress(id)).unwrap();
//       toast.success("Address removed", { theme: "dark" });
//     } catch (e) {
//       toast.error(e?.message || "Failed to delete", { theme: "dark" });
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   const handleSetDefault = async (addr) => {
//     try {
//       await dispatch(updateAddress({ id: addr._id, isDefault: true })).unwrap();
//       toast.success("Default address updated", { theme: "dark" });
//     } catch (e) {
//       toast.error(e?.message || "Failed to set default", { theme: "dark" });
//     }
//   };

//   const allCount = (defaultAddress ? 1 : 0) + otherAddresses.length;

//   return (
//     <div className="max-w-6xl mx-auto py-10 px-4">
//       <div className="flex justify-between items-center mb-10 pb-8 border-b border-gray-100">
//         <div>
//           <h1 className="text-xl font-black text-gray-900 tracking-tight">Saved Addresses</h1>
//           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{allCount} Total</p>
//         </div>
//         <button
//           onClick={openAdd}
//           className="bg-black text-white px-4 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all cursor-pointer hover:bg-[#F7A221] hover:text-black"
//         >
//           <Plus size={16} /> Add
//         </button>
//       </div>

//       {error.fetch && (
//         <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
//           <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
//           <p className="text-xs font-bold text-red-700 flex-1">{error.fetch.message || "Failed to load"}</p>
//           <button onClick={() => dispatch(fetchAddresses())} className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 cursor-pointer">Retry</button>
//         </div>
//       )}

//       {loading.fetch ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-gray-50 rounded-[40px] animate-pulse" />)}
//         </div>
//       ) : allCount === 0 ? (
//         <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
//           <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center">
//             <MapPin size={40} className="text-gray-300" />
//           </div>
//           <h3 className="font-black text-gray-900 text-xl">No addresses yet</h3>
//           <button onClick={openAdd} className="bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer">
//             <Plus size={16} className="inline mr-2" /> Add Address
//           </button>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {defaultAddress && (
//             <AddressCard address={defaultAddress} isDefault onEdit={openEdit} onDelete={handleDelete} onSetDefault={handleSetDefault} isDeleting={deletingId === defaultAddress._id} />
//           )}
//           {otherAddresses.map((addr) => (
//             <AddressCard key={addr._id} address={addr} isDefault={false} onEdit={openEdit} onDelete={handleDelete} onSetDefault={handleSetDefault} isDeleting={deletingId === addr._id} />
//           ))}
//         </div>
//       )}

//       {modalOpen && (
//         <AddressFormModal
//           initial={editAddress}
//           onSubmit={handleSubmit}
//           onClose={closeModal}
//           isSaving={loading.add || loading.update}
//           error={error.add || error.update}
//         />
//       )}
//     </div>
//   );
// };

// export default UserAddress;