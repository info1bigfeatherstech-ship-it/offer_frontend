/**
 * Client-side address checks — keep rules aligned with backend:
 * `backend/offerWaleBaba/utils/addressValidation.js`
 */

export const ADDRESS_LINE1_MIN_LEN = 10;
export const ADDRESS_LINE_MAX_LEN = 200;

function trim(value) {
  if (value == null) return "";
  return String(value).trim();
}

/**
 * @returns {string | null} error message for UI, or null if OK
 */
export function validateStreetLinesClient(addressLine1, addressLine2) {
  const line1 = trim(addressLine1);
  const line2 = trim(addressLine2);
  const combined = (line1 + line2).replace(/\s/g, "");

  if (!line1) {
    return "Address line 1 is required (street, building, road).";
  }
  if (line1.length < ADDRESS_LINE1_MIN_LEN) {
    return `Address line 1 must be at least ${ADDRESS_LINE1_MIN_LEN} characters — add street or area detail, not only a flat number.`;
  }
  if (line1.length > ADDRESS_LINE_MAX_LEN || line2.length > ADDRESS_LINE_MAX_LEN) {
    return `Each address line must be at most ${ADDRESS_LINE_MAX_LEN} characters.`;
  }
  if (combined.length < 3) {
    return "Street address is too short for delivery.";
  }
  return null;
}

/**
 * @param {object} form — same shape as AddressFormModal EMPTY_FORM + filled fields
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateAddressFormStep2(form) {
  if (!trim(form.houseNumber)) {
    return { ok: false, message: "House/Flat number is required." };
  }
  if (trim(form.building) && trim(form.building).length > 150) {
    return { ok: false, message: "Building name must be at most 150 characters." };
  }
  if (trim(form.floor) && trim(form.floor).length > 80) {
    return { ok: false, message: "Floor details must be at most 80 characters." };
  }
  if (!trim(form.area)) {
    return { ok: false, message: "Area/Locality is required." };
  }
  if (!trim(form.city)) {
    return { ok: false, message: "City is required." };
  }
  if (!trim(form.state)) {
    return { ok: false, message: "State is required." };
  }
  const streetErr = validateStreetLinesClient(form.addressLine1, form.addressLine2);
  if (streetErr) {
    return { ok: false, message: streetErr };
  }
  return { ok: true };
}
