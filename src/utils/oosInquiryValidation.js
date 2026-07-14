/**
 * Shared email/phone checks for out-of-stock inquiries (client + mirrored server rules).
 * Both email and phone are required so restock alerts can always go by email,
 * and in-app / contact matching can use phone.
 */

const EMAIL_RE =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,62}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

/**
 * @param {string} raw
 * @returns {string} 10-digit digits or ''
 */
export function normalizeInquiryPhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

/**
 * @param {string} raw
 */
export function isValidInquiryEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  if (!email || email.length > 254) return false;
  if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) return false;
  if (!email.includes('@') || !email.includes('.')) return false;
  return EMAIL_RE.test(email);
}

/**
 * Indian mobile: 10 digits starting 6–9.
 * @param {string} raw
 */
export function isValidInquiryPhone(raw) {
  const digits = normalizeInquiryPhone(raw);
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Both email and phone required and valid.
 * @param {{ email?: string, phone?: string }} input
 * @returns {{ ok: true, email: string, phone: string } | { ok: false, field: string, message: string }}
 */
export function validateInquiryContact(input = {}) {
  const emailRaw = String(input.email || '').trim();
  const phoneRaw = String(input.phone || '').trim();

  if (!emailRaw) {
    return {
      ok: false,
      field: 'email',
      message: 'Email is required so we can notify you when it is back.',
    };
  }
  if (!isValidInquiryEmail(emailRaw)) {
    return {
      ok: false,
      field: 'email',
      message: 'Enter a valid email (e.g. name@gmail.com).',
    };
  }

  if (!phoneRaw) {
    return {
      ok: false,
      field: 'phone',
      message: 'Mobile number is required.',
    };
  }
  if (!isValidInquiryPhone(phoneRaw)) {
    return {
      ok: false,
      field: 'phone',
      message: 'Enter a valid 10-digit Indian mobile number.',
    };
  }

  return {
    ok: true,
    email: emailRaw.toLowerCase(),
    phone: normalizeInquiryPhone(phoneRaw),
  };
}
