import { useEffect } from "react";
import {
  Smartphone,
  Home,
  Shirt,
  Dumbbell,
  Gift,
  Plane,
  ShieldCheck,
  Truck,
  BadgeIndianRupee,
  Heart,
  CheckCircle2,
  Smile,
  PencilRuler,
  SprayCan,
  Car,
  Baby,
  Package,
} from "lucide-react";
import logo from "../../assets/logo.jpg"
import { Link } from "react-router-dom";

/** Same order, labels & paths as Navbar `mobileCategories` / MegaDropdown (Home → … → Car Accessories). */
const categories = [
  {
    label: "Home & Kitchen",
    path: "/category/home-and-kitchen",
    desc: "Daily essentials for modern homes",
    icon: Home,
    color: "from-orange-500/20 to-yellow-500/10",
  },
  {
    label: "Smart Life Gadgets",
    path: "/category/smart-life-gadgets",
    desc: "Smart gadgets & trending tech products",
    icon: Smartphone,
    color: "from-cyan-500/20 to-blue-500/10",
  },
  {
    label: "Baby Items",
    path: "/category/baby-items",
    desc: "Safe & essential baby products",
    icon: Baby,
    color: "from-pink-400/20 to-orange-300/10",
  },
  {
    label: "Stationary",
    path: "/category/stationary",
    desc: "Office, school & business supplies",
    icon: PencilRuler,
    color: "from-violet-500/20 to-purple-500/10",
  },
  {
    label: "Cleaning & Housekeeping Supplies",
    path: "/category/cleaning-&housekeeping-supplies",
    desc: "Cleaning tools & household essentials",
    icon: SprayCan,
    color: "from-teal-500/20 to-cyan-500/10",
  },
  {
    label: "Sports & Fitness",
    path: "/category/sports-and-fitness",
    desc: "Fitness gear & active lifestyle products",
    icon: Dumbbell,
    color: "from-green-500/20 to-emerald-500/10",
  },
  {
    label: "Tours & Travels",
    path: "/category/tours-and-travels",
    desc: "Travel essentials & accessories",
    icon: Plane,
    color: "from-sky-500/20 to-indigo-500/10",
  },
  {
    label: "Fashion World",
    path: "/category/fashion-world",
    desc: "Wholesale fashion & accessories",
    icon: Shirt,
    color: "from-pink-500/20 to-rose-500/10",
  },
  {
    label: "Gifts",
    path: "/category/gifts",
    desc: "Curated gifting collections",
    icon: Gift,
    color: "from-amber-500/20 to-orange-500/10",
  },
  {
    label: "Mix-items",
    path: "/category/mix-items-daily-use",
    desc: "Daily-use & mixed essentials",
    icon: Package,
    color: "from-zinc-500/20 to-stone-500/10",
  },
  {
    label: "Car Accessories",
    path: "/category/car-accessories",
    desc: "Accessories for smarter driving",
    icon: Car,
    color: "from-slate-500/20 to-gray-500/10",
  },
];

const advantages = [
  {
    title: "Fast Delivery",
    desc: "Quick doorstep delivery across India.",
    icon: Truck,
  },
  {
    title: "Affordable Prices",
    desc: "Amazing deals on trending products.",
    icon: BadgeIndianRupee,
  },
  {
    title: "Secure Payments",
    desc: "100% safe and secure checkout experience.",
    icon: ShieldCheck,
  },
  {
    title: "Easy Returns",
    desc: "Hassle-free returns and customer support.",
    icon: Heart,
  },
];

const values = [
  {
    title: "Customer Happiness",
    desc: "Everything we do starts with our customers.",
    icon: Heart,
  },
  {
    title: "Trusted Quality",
    desc: "Carefully selected products you can rely on.",
    icon: ShieldCheck,
  },
  {
    title: "Affordable Shopping",
    desc: "Great products at prices everyone loves.",
    icon: Smile,
  },
];

export default function AboutUs() {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-hidden font-sans page-transition-about" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700;900&display=swap');
        * { box-sizing: border-box; }
        .page-transition-about {
          animation: aboutPageFadeIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes aboutPageFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .about-animate-hero-pill {
          animation: aboutFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes aboutFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .about-animate-hero-title {
          animation: aboutSlideUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.05s forwards;
          transform: translateY(100%);
        }
        @keyframes aboutSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .about-animate-hero-sub {
          animation: aboutFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
          opacity: 0;
        }
        @keyframes aboutFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .about-animate-glow-pulse {
          animation: aboutGlowPulse 8s ease-in-out infinite;
        }
        @keyframes aboutGlowPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        .about-animate-glow-pulse-slow {
          animation: aboutGlowPulseSlow 10s ease-in-out infinite;
        }
        @keyframes aboutGlowPulseSlow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>

      {/* HERO — matches Policy.jsx header (dark gold, grid, wave) */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background: "linear-gradient(135deg, #050505 0%, #140B05 30%, #2A1408 65%, #090909 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute top-0 left-1/4 h-[520px] w-[520px] rounded-full blur-[120px] about-animate-glow-pulse"
          style={{ background: "radial-gradient(circle, rgba(255,140,0,0.28) 0%, transparent 72%)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full blur-[120px] about-animate-glow-pulse-slow"
          style={{ background: "radial-gradient(circle, rgba(255,94,0,0.22) 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(200,151,58,1) 1px,transparent 1px),linear-gradient(90deg,rgba(200,151,58,1) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12 pt-20 pb-32 text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#C8973A]/25 bg-[#C8973A]/10 px-5 py-2 about-animate-hero-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8973A] animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C8973A]/80">
              Who we are
            </span>
          </div>
          <div className="overflow-hidden mb-5">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl text-white tracking-[-2px] leading-[0.92] about-animate-hero-title">
              About Us
            </h1>
          </div>
          <h2 className="mx-auto max-w-2xl text-lg sm:text-xl md:text-2xl font-medium leading-snug text-white/80 about-animate-hero-sub">
            Discover Products You&apos;ll Love
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm sm:text-base leading-relaxed text-white/50 font-light about-animate-hero-sub">
            From the heart of Ulhasnagar, Maharashtra — bringing trending products, amazing deals, and a seamless shopping experience to businesses and shoppers across PAN India.
          </p>
          <p className="mt-7 text-[#C8973A]/55 text-xs sm:text-sm tracking-widest uppercase font-medium about-animate-hero-sub">
            Ulhasnagar, Maharashtra · Delivering happiness across India
          </p>
        </div>

        <div className="relative" style={{ marginBottom: "-2px" }}>
          <svg viewBox="0 0 1440 90" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none">
            <path d="M0,60 C240,90 480,20 720,50 C960,80 1200,15 1440,55 L1440,90 L0,90 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 bg-amber-400 text-black">
        {[
          ["50K+", "Happy Customers"],
          ["10K+", "Products"],
          ["Fast", "Delivery"],
          ["24/7", "Support"],
        ].map(([number, label]) => (
          <div
            key={label}
            className="border border-black/10 py-8 text-center transition-all duration-300 hover:bg-amber-300/50 hover:scale-105"
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black">{number}</h2>
            <p className="mt-2 text-xs uppercase tracking-[2px] text-black/60">
              {label}
            </p>
          </div>
        ))}
      </section>

      {/* STORY */}
      <section className="bg-[#f8f8f5] px-6 py-28 text-black lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-2 items-center">

          <div className="transition-all duration-700 hover:-translate-y-2">
            <p className="text-xs uppercase tracking-[4px] text-amber-500 font-bold">
              Our Story
            </p>

            <div className="mt-4 h-[2px] w-14 bg-amber-500" />

            <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font- leading-tight tracking-[-2px]">
              Making Everyday <br />
              Shopping Better
            </h2>

            <p className="mt-8 text-gray-600 leading-8">
              Today, thousands of customers across India trust OWB for trending products,
              daily essentials, fashion, gadgets, gifting, and more.
            </p>

            <p className="mt-5 text-gray-600 leading-8">
              OWB serves retailers, businesses, and shoppers across India with thousands of curated products,
              ensuring quality, affordability, and trust at every step.
            </p>

            <div className="mt-10 flex gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium">Verified Sellers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium">PAN India Delivery</span>
              </div>
            </div>
          </div>

          <div className="relative transition-all duration-700 hover:-translate-y-2">
            <div className="rounded-[32px] border border-amber-500/10 bg-[#111827] p-10 text-white shadow-2xl">

              <p className="text-xs uppercase tracking-[3px] text-amber-400">
                Our Foundation
              </p>

              <h3 className="mt-5 text-3xl font-black leading-tight">
                Built on Trust, <br />
                Driven by Value
              </h3>

              <p className="mt-6 leading-8 text-white/60">
                Every product is sourced directly from verified sellers —
                ensuring quality and pricing your business deserves.
              </p>
            </div>

            <div className="absolute -bottom-6 -right-6 rounded-3xl bg-amber-400 px-8 py-6 text-black shadow-2xl">
              <h2 className="text-4xl font-black">₹29</h2>
              <p className="mt-1 text-xs uppercase tracking-[2px] text-black/60">
                Starting Price
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="bg-white px-6 py-28 text-black lg:px-12">
        <div className="mx-auto max-w-7xl">

          <div className="transition-all duration-700">
            <p className="text-xs uppercase tracking-[4px] text-amber-500 font-bold">
              What We Offer
            </p>

            <div className="mt-4 h-[2px] w-14 bg-amber-500" />

            <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font- tracking-[-2px]">
              One Platform, <br />
              Every Category
            </h2>

            <p className="mt-6 max-w-2xl text-gray-600 leading-8">
              From gadgets to gifting and essentials — OWB is your all-in-one
              wholesale destination with over 10,000+ products.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-6">
            {categories.map((item, idx) => {
              const Icon = item.icon;
              const n = categories.length;
              const lgLastRowPairCenter =
                n % 3 === 2
                  ? idx === n - 2
                    ? "lg:col-start-2"
                    : idx === n - 1
                      ? "lg:col-start-4"
                      : ""
                  : "";

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`group rounded-3xl border border-gray-200 bg-[#fafafa] p-7 transition-all duration-500 hover:-translate-y-3 hover:border-amber-400 hover:shadow-2xl lg:col-span-2 ${lgLastRowPairCenter}`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 transition-all duration-300 group-hover:bg-amber-400/20 group-hover:scale-110">
                    <Icon className="h-6 w-6 text-amber-500" />
                  </div>

                  <h3 className="mt-6 text-xl font-bold">
                    {item.label}
                  </h3>

                  <p className="mt-3 text-gray-600 leading-7">
                    {item.desc}
                  </p>

                  <div className="mt-6 text-sm font-bold text-amber-500 transition-all duration-300 group-hover:translate-x-2 inline-block">
                    View Products →
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="relative overflow-hidden bg-[#0a0a0f] px-6 py-28 lg:px-12">
        <div className="absolute top-0 left-0 h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-[120px]" />

        <div className="mx-auto max-w-7xl relative z-10">

          <div className="transition-all duration-700">
            <p className="text-xs uppercase tracking-[4px] text-amber-400 font-bold">
              Why Choose Us
            </p>

            <div className="mt-4 h-[2px] w-14 bg-amber-400" />

            <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl text-white tracking-[-2px]">
              Why Shoppers Love Us
            </h2>

            <p className="mt-6 max-w-2xl text-white/60 leading-8">
              Everything built for your business — pricing, delivery,
              compliance, and trust.
            </p>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-2">
            {advantages.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-3xl border text-white  border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-amber-400/30 hover:shadow-2xl"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 transition-all duration-300 hover:scale-110">
                    <Icon className="h-6 w-6 text-amber-400" />
                  </div>

                  <h3 className="mt-6 text-2xl font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-4 leading-8 text-white/60">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="bg-[#f8f8f5] px-6 py-28 text-black lg:px-12">
        <div className="mx-auto max-w-7xl">

          <div className="transition-all duration-700">
            <p className="text-xs uppercase tracking-[4px] text-amber-500 font-bold">
              Our Values
            </p>

            <div className="mt-4 h-[2px] w-14 bg-amber-500" />

            <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl tracking-[-2px]">
              What We Stand For
            </h2>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {values.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="group rounded-3xl border border-gray-200 bg-white p-10 text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-200">
                    <Icon className="h-7 w-7 text-amber-500" />
                  </div>

                  <h3 className="mt-7 text-2xl font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-4 leading-8 text-gray-600">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="bg-white px-6 py-28 text-black lg:px-12">
        <div className="mx-auto max-w-6xl rounded-[40px] border border-gray-200 bg-[#fafafa] p-10 lg:p-16 shadow-xl transition-all duration-500 hover:shadow-2xl">

          <div className="flex flex-col items-center gap-10 lg:flex-row">

            <div className="flex h-36 w-55 items-center justify-center r bg-[#111827] text-4xl font-black text-amber-400 transition-all duration-500">
              <img src={logo} alt="OWB Logo" className="h-full w-full  object-cover" />
            </div>

            <div>
              <h2 className="text-3xl font-black">
                Offer Wale Baba
              </h2>

              <p className="mt-2 text-amber-500">
                Ulhasnagar, Maharashtra · Serving PAN India
              </p>

              <blockquote className="mt-8 border-l-4 border-amber-400 pl-6 text-lg leading-9 text-gray-600">
                We started with one goal — to become the most reliable
                wholesale partner for every business and shopper in India.
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-amber-400 px-6 py-28 text-center text-black">

        <div className="absolute left-1/2 top-[-150px] h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-black/10 blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-4xl">

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-2px]">
            Ready to Discover Amazing Products?
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-black/70">
            Explore trending products, exciting deals, and everyday essentials.
            Start your shopping journey with OWB today!
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/#top-categories" className="rounded-full bg-black px-10 py-5 text-base font-bold text-white transition-all duration-300 hover:scale-105 hover:bg-black/90 hover:shadow-xl">
              Start Shopping Now →
            </Link>

            <Link to="/contact"
              className="rounded-full border-2 border-black/20 bg-transparent px-10 py-5 text-base font-bold text-black transition-all duration-300 hover:border-amber-600 hover:bg-amber-500 hover:text-black hover:shadow-xl"
            >
              Contact Our Team
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}