import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, BadgeCheck, Package, Truck } from "lucide-react";
import { getSubscriptionSettings } from "../../SERVICES/dropshipperAuthApi";

const PORTAL_FALLBACK = "http://localhost:5174/register";

function portalUrl() {
  const raw = String(import.meta.env.VITE_DROPSHIPPER_PORTAL_URL || "").trim();
  return raw || PORTAL_FALLBACK;
}

function formatInr(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BecomeDropshipper() {
  const [loading, setLoading] = useState(true);
  const [feeLabel, setFeeLabel] = useState(null);
  const [years, setYears] = useState(1);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [feeError, setFeeError] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getSubscriptionSettings();
        if (cancelled) return;
        const settings = data?.settings || {};
        setFeeLabel(formatInr(settings.subscriptionAmountInr));
        setYears(Number(settings.subscriptionYears) || 1);
        setRegistrationOpen(settings.registrationOpen !== false);
        setFeeError(false);
      } catch {
        if (!cancelled) setFeeError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const href = portalUrl();

  return (
    <div className="relative bg-[#F9FAFB] text-slate-800 font-sans selection:bg-[#f7a221] selection:text-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-gradient-to-b from-[#f7a221]/15 via-[#f7a221]/5 to-transparent" />

      <div className="relative mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-[#c47b0a]"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.22em] text-[#c47b0a]">
          Partner program
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
          Become a Dropshipper
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Sell Offer Wale Baba products under your own name. Registration and payment
          happen on the partner portal. After approval, you activate the account and
          place orders on the dropship channel.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <Package className="text-[#f7a221]" size={22} />
            <p className="mt-3 text-sm font-bold text-slate-900">Catalog access</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              List priced dropship products from our catalog.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <Truck className="text-[#f7a221]" size={22} />
            <p className="mt-3 text-sm font-bold text-slate-900">We fulfill</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Orders ship on the dropship storefront after you place them.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <BadgeCheck className="text-[#f7a221]" size={22} />
            <p className="mt-3 text-sm font-bold text-slate-900">Yearly access</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              One subscription covers a full year on the partner portal.
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-[#f7a221]/30 bg-white shadow-sm">
          <div className="bg-[#111111] px-6 py-5 text-white sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f7a221]">
              Subscription
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                {loading ? (
                  <div className="h-10 w-36 animate-pulse rounded-lg bg-white/10" />
                ) : (
                  <p className="text-4xl font-black tracking-tight">
                    {feeLabel || "Fee on portal"}
                  </p>
                )}
                <p className="mt-1 text-sm text-white/70">
                  {years === 1 ? "1 year" : `${years} years`} · paid on the partner portal
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  registrationOpen
                    ? "bg-[#f7a221] text-black"
                    : "bg-white/10 text-white"
                }`}
              >
                {registrationOpen ? "Registration open" : "Registration closed"}
              </span>
            </div>
          </div>

          <div className="space-y-4 px-6 py-6 sm:px-8">
            {feeError && (
              <p className="text-sm text-slate-500">
                The current fee could not be loaded. The partner portal shows the amount due before payment.
              </p>
            )}
            {!registrationOpen && !loading && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                New applications are paused right now. You can still open the partner portal to check status or sign in.
              </p>
            )}
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f7a221] px-6 py-3.5 text-sm font-bold text-black transition-colors hover:bg-[#e89412] sm:w-auto"
            >
              Continue to registration
              <ArrowUpRight size={18} />
            </a>
            <p className="text-xs text-slate-400">Opens the dropshipper portal in a new tab.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
