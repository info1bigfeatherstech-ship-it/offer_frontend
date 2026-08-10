/**
 * Client-side address checks — keep rules aligned with backend:
 * `backend/utils/addressValidation.js`
 *
 * Shiprocket / Shipmozo street composition:
 *   line1 = houseNumber, building, floor, addressLine1
 *   line2 = addressLine2, area, landmark
 * Combined length must be ≤ MAX_COURIER_COMBINED_STREET_CHARS (190).
 */

export const ADDRESS_LINE1_MIN_LEN = 10;
/** Per form addressLine field; courier combined cap is the hard shipping limit. */
export const ADDRESS_LINE_MAX_LEN = 200;
export const MAX_COURIER_COMBINED_STREET_CHARS = 190;

function trim(value) {
  if (value == null) return "";
  return String(value).trim();
}

/**
 * Same composition as Shiprocket / Shipmozo push payloads.
 * City / state / pincode / country are NOT included.
 */
export function buildCourierStreetLines(addr = {}) {
  const line1 = [addr.houseNumber, addr.building, addr.floor, addr.addressLine1]
    .map(trim)
    .filter(Boolean)
    .join(", ");
  const line2 = [addr.addressLine2, addr.area, addr.landmark]
    .map(trim)
    .filter(Boolean)
    .join(", ");
  return {
    line1,
    line2,
    combinedLength: line1.length + line2.length,
  };
}

/**
 * @returns {{ combinedLength: number, max: number, remaining: number, overLimit: boolean }}
 */
export function getCourierStreetUsage(addr = {}) {
  const { combinedLength } = buildCourierStreetLines(addr);
  const max = MAX_COURIER_COMBINED_STREET_CHARS;
  return {
    combinedLength,
    max,
    remaining: Math.max(0, max - combinedLength),
    overLimit: combinedLength > max,
  };
}

/**
 * @returns {string | null} error message for UI, or null if OK
 */
export function validateCourierStreetClient(addr = {}) {
  const usage = getCourierStreetUsage(addr);
  if (usage.overLimit) {
    return `Address too long for courier (${usage.combinedLength}/${usage.max}). Shorten street details.`;
  }
  return null;
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
  if (trim(form.houseNumber).length > 80) {
    return { ok: false, message: "House/Flat number is too long." };
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
  if (trim(form.area).length > 120) {
    return { ok: false, message: "Area/Locality must be at most 120 characters." };
  }
  if (trim(form.landmark) && trim(form.landmark).length > 150) {
    return { ok: false, message: "Landmark must be at most 150 characters." };
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
  const courierErr = validateCourierStreetClient(form);
  if (courierErr) {
    return { ok: false, message: courierErr };
  }
  return { ok: true };
}
