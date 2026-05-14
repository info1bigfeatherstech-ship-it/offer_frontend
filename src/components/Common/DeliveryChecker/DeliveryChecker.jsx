import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  checkDelivery,
  selectDelivery,
  selectCheckoutLoading,
  selectCheckoutError,
  setDeliveryResult,
} from "../../../components/REDUX_FEATURES/REDUX_SLICES/checkoutSlice/checkoutSlice";
import { MapPin, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

/**
 * DeliveryChecker
 *
 * Reusable component — drop it anywhere:
 *   <DeliveryChecker />                     (standalone pincode input)
 *   <DeliveryChecker prefillPincode="110001" />  (auto-check on mount)
 *   <DeliveryChecker compact />             (small inline version)
 *   <DeliveryChecker onResult={(r) => {}} /> (callback on result)
 *
 * Props:
 *   prefillPincode  — auto-fill + auto-check this pincode on mount
 *   compact         — renders a smaller inline pill version
 *   onResult        — callback(deliveryResult) when check completes
 *   showTitle       — show "Check Delivery" heading (default: true)
 */
const DeliveryChecker = ({
  prefillPincode = "",
  compact = false,
  onResult,
  showTitle = true,
  className = "",
}) => {
  const dispatch = useDispatch();
  const delivery = useSelector(selectDelivery);
  const loading = useSelector(selectCheckoutLoading);
  const error = useSelector(selectCheckoutError);

  const [pincode, setPincode] = useState(() => String(prefillPincode || "").trim());

  // Sync + auto-check when prefill becomes available or changes (e.g. default address loads after mount)
  const lastPrefillSynced = useRef("");
  useEffect(() => {
    const p = String(prefillPincode || "").trim();
    if (!/^\d{6}$/.test(p)) return;
    if (lastPrefillSynced.current === p) return;
    lastPrefillSynced.current = p;
    setPincode(p);
    dispatch(checkDelivery({ pincode: p }));
  }, [prefillPincode, dispatch]);

  // Fire onResult callback whenever delivery state changes
  useEffect(() => {
    if (delivery.isDeliverable !== null && onResult) {
      onResult(delivery);
    }
  }, [delivery.isDeliverable, onResult]);

  const handleCheck = () => {
    if (!/^\d{6}$/.test(pincode)) return;
    dispatch(checkDelivery({ pincode }));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleCheck();
  };

  const isChecking = loading.delivery;
  const result = delivery;
  const hasResult = result.isDeliverable !== null && result.checkedPincode === pincode;

  // ── Compact pill version ──────────────────────────────────────────────────
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-2">
          <MapPin size={12} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={pincode}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setPincode(v);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter pincode"
            className="bg-transparent text-xs font-bold outline-none w-24 placeholder-gray-400"
            maxLength={6}
          />
        </div>

        <button
          onClick={handleCheck}
          disabled={pincode.length !== 6 || isChecking}
          className="text-xs font-black uppercase tracking-widest text-[#F7A221] hover:text-black disabled:opacity-40 cursor-pointer transition-colors"
        >
          {isChecking ? <Loader2 size={12} className="animate-spin" /> : "Check"}
        </button>

        {hasResult && (
          result.isDeliverable ? (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 size={13} />
              <span className="text-[11px] font-black">
                {result.estimatedDays ? `${result.estimatedDays} days` : "Deliverable"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-500">
              <XCircle size={13} />
              <span className="text-[11px] font-black">Not available</span>
            </div>
          )
        )}
      </div>
    );
  }

  // ── Full version ──────────────────────────────────────────────────────────
  return (
    <div className={`w-full ${className}`}>
      {showTitle && (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
          Check Delivery
        </p>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MapPin
            size={14}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={pincode}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setPincode(v);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter 6-digit pincode"
            className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-2xl pl-10 pr-4 py-3.5 text-sm font-bold outline-none transition-all"
            maxLength={6}
          />
        </div>

        <button
          onClick={handleCheck}
          disabled={pincode.length !== 6 || isChecking}
          className="px-5 py-3.5 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
        >
          {isChecking ? (
            <><Loader2 size={14} className="animate-spin" /> Checking</>
          ) : (
            "Check"
          )}
        </button>
      </div>

      {/* API error */}
      {error.delivery && (
        <div className="mt-3 flex items-center gap-2 text-red-500">
          <XCircle size={14} className="flex-shrink-0" />
          <p className="text-xs font-bold">{error.delivery.message}</p>
        </div>
      )}

      {/* Result */}
      {hasResult && !error.delivery && (
        <div
          className={`mt-3 flex items-start gap-3 rounded-2xl px-4 py-3.5 border ${
            result.isDeliverable
              ? "bg-green-50 border-green-100"
              : "bg-red-50 border-red-100"
          }`}
        >
          {result.isDeliverable ? (
            <>
              <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-black text-green-800">
                  Delivery available to{" "}
                  <span className="text-green-600">{result.checkedPincode}</span>
                </p>
                {result.estimatedDays && (
                  <p className="text-[11px] text-green-600 font-bold mt-0.5">
                    Estimated delivery in{" "}
                    <span className="font-black">{result.estimatedDays} business days</span>
                    {result.courierName ? ` via ${result.courierName}` : ""}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <XCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-black text-red-700">
                  Delivery not available to {result.checkedPincode}
                </p>
                <p className="text-[11px] text-red-500 font-medium mt-0.5">
                  {result.message || "We don't deliver to this pincode yet"}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryChecker;