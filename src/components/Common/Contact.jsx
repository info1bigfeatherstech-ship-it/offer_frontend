import React, { useState, useRef, useEffect } from "react";
import {
  Mail, Globe, Send, CheckCircle2,
  AlertCircle, MapPin, Clock,
  ArrowRight, Package, Star,
  BadgeCheck,
  Truck,
  BadgeIndianRupee,
  TreePine
} from "lucide-react";

// ── Floating particle background ─────────────────────────────────────────────
const Particles = () => {
  const dots = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 6,
    dur: 4 + Math.random() * 5,
  }));


  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((d) => (
        <div
          key={d.id}
          className="absolute rounded-full bg-amber-400/20 animate-ping"
          style={{
            width: d.size,
            height: d.size,
            left: `${d.x}%`,
            top: `${d.y}%`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.dur}s`,
          }}
        />
      ))}
    </div>
  );
};

// ── Stat badge ────────────────────────────────────────────────────────────────
const StatBadge = ({ icon: Icon, value, label }) => (
  <div className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-2xl px-4 py-3 border border-white/10">
    <div className="w-9 h-9 rounded-xl bg-amber-400/20 flex items-center justify-center flex-shrink-0">
      <Icon size={16} className="text-amber-400" />
    </div>
    <div>
      <div className="text-white font-bold text-sm leading-none">{value}</div>
      <div className="text-gray-400 text-[10px] mt-0.5">{label}</div>
    </div>
  </div>
);

// ── Contact info row ──────────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value, href }) => (
  <a
    href={href || "#"}
    target={href?.startsWith("http") ? "_blank" : undefined}
    rel="noreferrer"
    className="group flex items-start gap-4 py-3 border-b border-white/8 last:border-0 hover:pl-1 transition-all duration-200"
  >
    <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-amber-400/25 transition-colors">
      <Icon size={14} className="text-amber-400" />
    </div>
    <div>
      <p className="text-[12px] text-gray-500 uppercase tracking-widest font-semibold">{label}</p>
      <p className="text-gray-200 text-sm sm:text-[15px] break-words mt-0.5 group-hover:text-amber-300 transition-colors">{value}</p>
    </div>
    <ArrowRight size={12} className="text-gray-600 group-hover:text-amber-400 ml-auto mt-2 transition-colors" />
  </a>
);

// ── Input field ───────────────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div className="group">
    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 block group-focus-within:text-amber-500 transition-colors">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = `
  w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900
  placeholder:text-gray-400 outline-none
  focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/10
  transition-all duration-200
`.trim();

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ContactUs() {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const formRef = useRef(null);
  const [captcha, setCaptcha] = useState({ q: "", ans: 0 });
  const [userAnswer, setUserAnswer] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ q: `${a} + ${b} = ?`, ans: a + b });
    setUserAnswer("");
    setIsVerified(false);
  };

  const handleCaptchaChange = (e) => {
    const value = e.target.value;
    setUserAnswer(value);
    setIsVerified(parseInt(value) === captcha.ans);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isVerified) return; // guard: never submit if captcha not solved
    setStatus("loading");
    const data = new FormData(e.target);
    try {
      const res = await fetch("https://formspree.io/f/xlgavvnv", {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (res.ok) { setStatus("success"); e.target.reset(); }
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <style>{`
        .contact-root { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Syne', sans-serif; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp 0.55s cubic-bezier(.22,1,.36,1) both; }
        .slide-up-1 { animation-delay: 0.05s; }
        .slide-up-2 { animation-delay: 0.12s; }
        .slide-up-3 { animation-delay: 0.20s; }
        .slide-up-4 { animation-delay: 0.28s; }
        .slide-up-5 { animation-delay: 0.36s; }
      `}</style>

<div className="contact-root max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-16">
        {/* ── Page header ── */}
        <div className="mb-10 slide-up slide-up-1">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            We're here to help
          </div>
         <h1 className="font-satoshi text-3xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
            Get in <span className="text-amber-500">Touch</span>
          </h1>
        </div>

        {/* ── Main grid ── */}
       <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">

          {/* ── LEFT PANEL ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Dark card */}
            <div className="relative bg-gray-900 rounded-[28px] overflow-hidden p-5 sm:p-7 slide-up slide-up-2">
              <Particles />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

              <div className="relative z-10">
                <h2 className="font-satoshi text-2xl font-bold text-white mb-1">Offer Wale Baba</h2>
                <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-5">
                  Wholesale &amp; Retail
                </p>

                <div className="space-y-1 mb-6">
                  <InfoRow icon={Mail} label="Email" value="support.offerwalebaba@gmail.com" href="mailto:support.offerwalebaba@gmail.com" />
                  <InfoRow icon={Globe} label="Website" value="www.offerwalebaba.com" href="https://offerwalebaba.com/" />
                  <InfoRow icon={MapPin} label="Address" value="Sambhaji Chowk, Opp. Tipcy-Topcy Society, Babasai Nagar, Ulhasnagar, Mumbai - 421004, Maharashtra, India" href="https://maps.google.com/?q=Ulhasnagar,Maharashtra" />
                  <InfoRow icon={Clock} label="Hours" value="Tue–Sun, 1 PM – 10 PM" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <StatBadge icon={Package} value="10,000+" label="Orders Delivered" />
                  <StatBadge icon={Star} value="4.9★" label="Avg. Rating" />
                </div>

                <a
                  href="https://linktr.ee/offerwalebaba1"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 flex items-center justify-center gap-2.5 bg-white/8 hover:bg-white/14 border border-white/10 text-gray-300 hover:text-white font-semibold py-3 rounded-2xl transition-all duration-200 text-sm"
                >
                  <TreePine /> All Links &amp; Catalogue
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 slide-up slide-up-3">
              {[
                { icon: <BadgeCheck />, text: "Verified Supplier" },
                { icon: <Truck />, text: "PAN India Delivery" },
                { icon: <BadgeIndianRupee />, text: "Best Price" },
              ].map((b) => (
               <div
  key={b.text}
  className="
    bg-white border border-gray-200
    rounded-2xl
    p-2.5 sm:p-3
    text-center
    hover:border-amber-300
    hover:shadow-sm
    transition-all duration-200
  "
>
                  <div className="flex justify-center text-lg sm:text-xl mb-1">{b.icon}</div>
                  <p className="text-[10px] font-bold text-gray-600 leading-tight">{b.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT PANEL: Form ── */}
          <div className="lg:col-span-3 slide-up slide-up-3">
            <div className="bg-white border border-gray-200 rounded-[28px] p-4 sm:p-9 h-full">

              <div className="mb-7">
                <h2 className="font-display text-2xl font-bold text-gray-900">Send a Message</h2>
                <p className="text-gray-400 text-sm mt-1">We reply within 24 hours on business days.</p>
              </div>

              {status === "success" ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} className="text-green-600" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-500 text-sm max-w-xs">
                    Thank you for reaching out. We'll get back to you shortly.
                  </p>
                  <button
                    onClick={() => { setStatus("idle"); generateCaptcha(); }}
                    className="mt-6 px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-amber-500 transition-colors"
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* ── Name * ── */}
                    <Field label="Full Name" required>
                      <input
                        type="text"
                        name="name"
                        placeholder="Your full name"
                        required
                        className={inputCls}
                      />
                    </Field>

                    {/* ── Phone * ── */}
                    <Field label="Phone Number" required>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="+91 00000 00000"
                        required
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  {/* ── Email (optional — no *) ── */}
                  <Field label="Email Address">
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      className={inputCls}
                    />
                  </Field>

                  {/* ── City * ── */}
                  <Field label="City" required>
                    <input
                      type="text"
                      name="city"
                      placeholder="Your City"
                      required
                      className={inputCls}
                    />
                  </Field>

                  {/* ── Inquiry type ── */}
                  <Field label="Inquiry Type">
                    <select name="inquiry_type" required defaultValue="" className={`${inputCls} cursor-pointer`}>
                      <option value="" disabled>— Select Subject —</option>
                      <optgroup label="Order Support">
                        <option value="order_status">Where is my order? (Tracking)</option>
                        <option value="return_exchange">Return / Exchange Request</option>
                        <option value="payment_failed">Payment Failed / Double Charged</option>
                      </optgroup>
                      <optgroup label="Business & Sales">
                        <option value="wholesale">Wholesale / Distribution Inquiry</option>
                        <option value="bulk_gifting">Bulk Corporate Gifting (10+ units)</option>
                        <option value="partnership">Brand / Influencer Collaboration</option>
                      </optgroup>
                      <option value="other">General Question</option>
                    </select>
                  </Field>

                  {/* ── Message * ── */}
                  <Field label="Message" required>
                    <textarea
                      name="message"
                      rows="5"
                      placeholder="Tell us what you need — product name, quantity, delivery location..."
                      required
                      className={inputCls + " resize-none"}
                    />
                  </Field>

                  {/* ── Captcha ── */}
                  <Field label="Verification" required>
                   <div className="flex flex-wrap gap-3 items-start sm:items-center">
                      <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 select-none">
                        {captcha.q}
                      </div>
                      <input
                        type="number"
                        placeholder="Your answer"
                        value={userAnswer}
                        onChange={handleCaptchaChange}
                        className={inputCls + " w-[120px]"}
                      />
                      {/* Inline status icon */}
                      {userAnswer !== "" && (
                        isVerified
                          ? <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                          : <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
                      )}
                    </div>

                    {!isVerified && userAnswer !== "" && (
                      <p className="text-red-500 text-xs mt-1.5">Incorrect answer, please try again.</p>
                    )}

                    <button
                      type="button"
                      onClick={generateCaptcha}
                      className="text-xs text-amber-500 hover:underline mt-1.5 inline-block"
                    >
                      Change question
                    </button>
                  </Field>

                  {/* ── Error banner ── */}
                  {status === "error" && (
                    <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                      <AlertCircle size={15} className="flex-shrink-0" />
                      Failed to send. Please try again or email us at support.offerwalebaba@gmail.com.
                    </div>
                  )}

                  {/* ── Submit button — ALWAYS VISIBLE ── */}
                  <div className="relative">
                    <button
                      type="submit"
                      disabled={!isVerified || status === "loading"}
                      className={`
                        w-full font-bold py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2.5
                        transition-all duration-200 text-sm
                        ${isVerified
                          ? "bg-gray-900 hover:bg-amber-500 active:scale-[0.98] text-white cursor-pointer"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }
                      `}
                    >
                      {status === "loading" ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Send Message
                        </>
                      )}
                    </button>

                    {/* Tooltip hint when captcha not yet solved */}
                    {!isVerified && (
                      <p className="text-center text-[11px] text-gray-400 mt-2">
                        Solve the verification above to enable this button
                      </p>
                    )}
                  </div>

                  

                </form>
              )}
            </div>
          </div>
        </div>

        {/* ── Map embed ── */}
        <div className="mt-6 rounded-[28px] overflow-hidden border border-gray-200 slide-up slide-up-5" style={{ height: window.innerWidth < 640 ? 200 : 260 }}>
          <iframe
            title="OfferWaleBaba Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3767.0!2d73.155!3d19.215!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7950000000001%3A0x0!2sUlhasnagar%2C+Maharashtra+421004!5e0!3m2!1sen!2sin!4v1"
            width="100%"
            height="100%"
            style={{ border: 0, filter: "grayscale(20%) contrast(1.05)" }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

      </div>
    </div>
  );
}