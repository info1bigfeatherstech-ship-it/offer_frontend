export function apiErrorMessage(err, fallback = "Something went wrong") {
  return err?.response?.data?.message || err?.message || fallback;
}

export function formatInr(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function labelize(value) {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  return raw.replace(/_/g, " ");
}

export function statusPillClass(status) {
  const key = String(status || "").toLowerCase();
  if (["approved", "active", "paid"].includes(key)) {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (["rejected", "failed", "suspended"].includes(key)) {
    return "bg-rose-50 text-rose-800 border-rose-200";
  }
  if (key === "expired") return "bg-slate-100 text-slate-700 border-slate-200";
  if (key === "pending" || key.startsWith("pending") || key === "draft") {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }
  return "bg-gray-50 text-gray-700 border-gray-200";
}
