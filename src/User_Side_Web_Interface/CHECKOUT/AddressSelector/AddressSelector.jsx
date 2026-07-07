import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAddresses,
  selectDefaultAddress,
  selectOtherAddresses,
  selectAddressLoading,
} from "../../../components/REDUX_FEATURES/REDUX_SLICES/Useraddressslice";
import {
  setSelectedAddress,
  selectSelectedAddressId,
} from "../../../components/REDUX_FEATURES/REDUX_SLICES/checkoutSlice/checkoutSlice";
import {
  MapPin, Home, Briefcase, Star, Plus,
  CheckCircle2, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";

// Inline icon map — no import needed in parent
const TYPE_ICON = {
  home: <Home size={14} className="text-[#F7A221]" />,
  work: <Briefcase size={14} className="text-blue-500" />,
  other: <MapPin size={14} className="text-gray-400" />,
};

/**
 * AddressSelector
 *
 * Props:
 *   onAddAddress  — called when user clicks "+ Add New Address"
 *                   (parent should open the existing AddressFormModal)
 */
const AddressSelector = ({ onAddAddress }) => {
  const dispatch = useDispatch();
  const defaultAddr = useSelector(selectDefaultAddress);
  const otherAddrs = useSelector(selectOtherAddresses);
  const loading = useSelector(selectAddressLoading);
  const selectedId = useSelector(selectSelectedAddressId);

  const [showAll, setShowAll] = useState(false);

  // Fetch addresses on mount
  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  // Auto-select default address when addresses load
  useEffect(() => {
    if (defaultAddr && !selectedId) {
      dispatch(setSelectedAddress(defaultAddr._id));
    }
  }, [defaultAddr, selectedId, dispatch]);

  const allAddresses = [
    ...(defaultAddr ? [defaultAddr] : []),
    ...otherAddrs,
  ];

  const visibleAddresses = showAll ? allAddresses : allAddresses.slice(0, 2);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading.fetch) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-xs font-bold">Loading addresses…</span>
      </div>
    );
  }

  // ── No addresses ─────────────────────────────────────────────────────────
  if (allAddresses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
          <MapPin size={28} className="text-gray-300" />
        </div>
        <div>
          <p className="font-black text-gray-900 text-sm">No saved addresses</p>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Add a delivery address to continue
          </p>
        </div>
        <button
          onClick={onAddAddress}
          className="flex items-center gap-2 bg-black text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer"
        >
          <Plus size={14} /> Add Address
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Address cards */}
      {visibleAddresses.map((addr) => {
        const isSelected = selectedId === addr._id;

        return (
          <button
            key={addr._id}
            type="button"
            onClick={() => dispatch(setSelectedAddress(addr._id))}
            className={`w-full text-left p-4 rounded-[24px] border-2 transition-all duration-200 cursor-pointer ${
              isSelected
                ? "border-black bg-black/[0.02] shadow-sm"
                : "border-gray-100 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Selection indicator */}
              <div className="mt-0.5 flex-shrink-0">
                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
              </div>

              {/* Address info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {TYPE_ICON[addr.addressType] || TYPE_ICON.other}
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {addr.addressType}
                  </span>
                  {addr.isDefault && (
                    <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-full">
                      <Star size={7} className="fill-[#F7A221] text-[#F7A221]" />
                      Default
                    </span>
                  )}
                </div>

                <p className="font-black text-sm text-gray-900 leading-tight">
                  {addr.fullName}
                </p>
                <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                  {addr.phone}
                </p>
                <p className="text-xs text-gray-600 font-medium mt-1.5 leading-relaxed">
                  {[addr.houseNumber, addr.building, addr.floor, addr.area, addr.landmark, addr.addressLine1]
                    .filter(Boolean)
                    .join(", ")}
                  {"\n"}
                  <span className="font-bold text-gray-800">
                    {addr.city}, {addr.state} — {addr.postalCode}
                  </span>
                </p>
              </div>
            </div>
          </button>
        );
      })}

      {/* Show more / less toggle */}
      {allAddresses.length > 2 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors cursor-pointer"
        >
          {showAll ? (
            <><ChevronUp size={14} /> Show Less</>
          ) : (
            <><ChevronDown size={14} /> {allAddresses.length - 2} More Address{allAddresses.length - 2 > 1 ? "es" : ""}</>
          )}
        </button>
      )}

      {/* Add new address */}
      <button
        onClick={onAddAddress}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[24px] border-2 border-dashed border-gray-200 text-xs font-black uppercase tracking-widest text-gray-400 hover:border-black hover:text-black transition-all cursor-pointer"
      >
        <Plus size={14} /> Add New Address
      </button>
    </div>
  );
};

export default AddressSelector;