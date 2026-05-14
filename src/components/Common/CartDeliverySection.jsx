import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  Truck,
  Edit2,
} from 'lucide-react';

import {
  checkDelivery,
  selectDelivery,
  selectCheckoutLoading,
  selectCheckoutError,
} from '../REDUX_FEATURES/REDUX_SLICES/checkoutSlice/checkoutSlice';

/**
 * Delivery UI shared by Cart sidebar and full My Cart page:
 * — logged-in + saved pincode: green/red card, estimate, pencil to try another pin
 * — guest / no saved pin / edit mode: compact input + Check
 */
const CartDeliverySection = ({ isLoggedIn, userPincode }) => {
  const dispatch = useDispatch();
  const delivery = useSelector(selectDelivery);
  const checkoutLoading = useSelector(selectCheckoutLoading);
  const checkoutError = useSelector(selectCheckoutError);

  const [pincode, setPincode] = useState(() => {
    const p = String(userPincode || '').trim();
    return /^\d{6}$/.test(p) ? p : '';
  });
  const [isEditing, setIsEditing] = useState(false);
  const [tempPincode, setTempPincode] = useState('');
  const [isDeliveryLoading, setIsDeliveryLoading] = useState(false);

  const lastSyncedSavedPin = useRef('');

  // Auto-fill + check when default-address pincode is available or changes (skip while editing)
  useEffect(() => {
    if (!isLoggedIn || !userPincode || !/^\d{6}$/.test(userPincode) || isEditing) return;
    if (lastSyncedSavedPin.current === userPincode) return;
    lastSyncedSavedPin.current = userPincode;
    setPincode(userPincode);
    setIsDeliveryLoading(true);
    dispatch(checkDelivery({ pincode: userPincode })).finally(() =>
      setIsDeliveryLoading(false)
    );
  }, [isLoggedIn, userPincode, isEditing, dispatch]);

  const handleCheck = () => {
    if (!/^\d{6}$/.test(pincode)) return;
    setIsDeliveryLoading(true);
    dispatch(checkDelivery({ pincode })).finally(() => setIsDeliveryLoading(false));
  };

  const handleEditClick = () => {
    setTempPincode('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempPincode('');
  };

  const handleTempCheck = () => {
    if (!/^\d{6}$/.test(tempPincode)) return;
    setIsDeliveryLoading(true);
    setPincode(tempPincode);
    dispatch(checkDelivery({ pincode: tempPincode }))
      .finally(() => {
        setIsDeliveryLoading(false);
        setIsEditing(false);
        setTempPincode('');
      });
  };

  const isChecking = !!(checkoutLoading?.delivery) || isDeliveryLoading;

  const hasResult =
    delivery.isDeliverable !== null &&
    delivery.checkedPincode === pincode &&
    !isEditing;

  if (isChecking && isLoggedIn && userPincode && !isEditing) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-gray-50 border border-gray-100">
        <Loader2 size={14} className="animate-spin text-[#F7A221]" />
        <span className="text-[11px] font-medium text-gray-500">
          Checking delivery to {userPincode}…
        </span>
      </div>
    );
  }

  if (isLoggedIn && userPincode && !isEditing && hasResult) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 border ${
            delivery.isDeliverable
              ? 'bg-green-50 border-green-100'
              : 'bg-red-50 border-red-100'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {delivery.isDeliverable ? (
              <>
                <Truck size={14} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-black text-green-800">
                    Delivery to{' '}
                    <span className="text-green-600">{delivery.checkedPincode}</span>
                  </p>
                  {delivery.estimatedDays ? (
                    <p className="text-[10px] text-green-600 font-bold mt-0.5">
                      Arrives in{' '}
                      <span className="font-black">{delivery.estimatedDays} business days</span>
                      {delivery.courierName ? ` via ${delivery.courierName}` : ''}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-black text-red-700">
                    Not deliverable to {delivery.checkedPincode}
                  </p>
                  <p className="text-[10px] text-red-500 font-medium mt-0.5">
                    {delivery.message || "We don't deliver to this pincode yet"}
                  </p>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleEditClick}
            className="p-1.5 hover:bg-white/70 rounded-full transition-colors shrink-0 cursor-pointer ml-2"
            aria-label="Change pincode"
            title="Check a different pincode"
          >
            <Edit2 size={14} className="text-gray-500" />
          </button>
        </div>

        {checkoutError?.delivery && (
          <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
            <XCircle size={11} /> {checkoutError.delivery.message}
          </p>
        )}
      </div>
    );
  }

  const inputValue = isEditing ? tempPincode : pincode;
  const setInputValue = isEditing ? setTempPincode : setPincode;
  const checkHandler = isEditing ? handleTempCheck : handleCheck;
  const checkDisabled = inputValue.length !== 6 || isChecking;

  return (
    <div className="flex flex-col gap-2">
      {isEditing && (
        <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
          <MapPin size={10} className="text-[#F7A221]" />
          Check delivery for a different pincode
          {userPincode ? ` (saved: ${userPincode})` : ''}
        </p>
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-2 flex-1">
          <MapPin size={12} className="text-gray-400 shrink-0" />
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setInputValue(v);
            }}
            onKeyDown={(e) => e.key === 'Enter' && checkHandler()}
            placeholder="Enter pincode"
            className="bg-transparent text-xs font-bold outline-none w-full placeholder-gray-400"
            maxLength={6}
            autoFocus={isEditing}
          />
        </div>

        <button
          type="button"
          onClick={checkHandler}
          disabled={checkDisabled}
          className="text-xs font-black uppercase tracking-widest text-[#F7A221] hover:text-black disabled:opacity-40 transition-colors cursor-pointer shrink-0"
        >
          {isChecking ? <Loader2 size={12} className="animate-spin" /> : 'Check'}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
          >
            Cancel
          </button>
        )}

        {!isChecking && !isEditing && hasResult && (
          delivery.isDeliverable ? (
            <div className="flex items-center gap-1 text-green-600 shrink-0">
              <CheckCircle2 size={13} />
              <span className="text-[11px] font-black whitespace-nowrap">
                {delivery.estimatedDays ? `${delivery.estimatedDays}d` : '✓'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-500 shrink-0">
              <XCircle size={13} />
              <span className="text-[11px] font-black whitespace-nowrap">N/A</span>
            </div>
          )
        )}
      </div>

      {checkoutError?.delivery && (
        <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
          <XCircle size={11} /> {checkoutError.delivery.message}
        </p>
      )}
    </div>
  );
};

export default CartDeliverySection;
