import React from 'react';

export function formatAdminDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAdminTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function DateTimeCell({ iso, className = '' }) {
  if (!iso) {
    return <span className={`text-gray-400 text-sm ${className}`}>—</span>;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return <span className={`text-gray-400 text-sm ${className}`}>—</span>;
  }

  return (
    <div className={className}>
      <div className="text-sm text-gray-700 leading-tight">{formatAdminDate(iso)}</div>
      <div className="text-xs text-gray-500 mt-0.5 leading-tight">{formatAdminTime(iso)}</div>
    </div>
  );
}
