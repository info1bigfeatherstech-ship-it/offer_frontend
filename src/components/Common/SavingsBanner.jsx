import React from "react";

const formatInr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n ?? 0);

const SavingsBanner = ({ amount = 0, className = "" }) => {
  const savings = Math.max(0, Number(amount) || 0);
  if (savings <= 0) return null;

  return (
    <div
      className={`w-full text-center py-2.5 px-3 ${className}`.trim()}
      style={{
        background: "#ecfdf5",
        color: "#15803d",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      You are saving {formatInr(savings)}
    </div>
  );
};

export default SavingsBanner;
