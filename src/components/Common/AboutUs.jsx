import {
  MapPin,
  ChevronDown,
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
} from "lucide-react";
import logo from "../../assets/logo.jpg"
import { Link } from "react-router-dom";
import { useEffect } from "react";

const categories = [
  {
    label: "Smart Life Gadgets",
    path: "/category/smart-life-gadgets",
    desc: "Smart gadgets & trending tech products",
    icon: Smartphone,
    color: "from-cyan-500/20 to-blue-500/10",
  },

  {
    label: "Home & Kitchen",
    path: "/category/home-and-kitchen",
    desc: "Daily essentials for modern homes",
    icon: Home,
    color: "from-orange-500/20 to-yellow-500/10",
  },

  {
    label: "Fashion World",
    path: "/category/fashion-world",
    desc: "Wholesale fashion & accessories",
    icon: Shirt,
    color: "from-pink-500/20 to-rose-500/10",
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
    label: "Stationary",
    path: "/category/stationary",
    desc: "Office, school & business supplies",
    icon: PencilRuler,
    color: "from-violet-500/20 to-purple-500/10",
  },

  {
    label: "Baby Items",
    path: "/category/baby-items",
    desc: "Safe & essential baby products",
    icon: Baby,
    color: "from-pink-400/20 to-orange-300/10",
  },

  {
    label: "Car Accessories",
    path: "/category/car-accessories",
    desc: "Accessories for smarter driving",
    icon: Car,
    color: "from-slate-500/20 to-gray-500/10",
  },

  {
    label: "Cleaning Supplies",
    path: "/category/mix-items-daily-use",
    desc: "Daily-use & hygiene essentials",
    icon: SprayCan,
    color: "from-teal-500/20 to-cyan-500/10",
  },

  {
    label: "Gifts",
    path: "/category/gifts",
    desc: "Curated gifting collections",
    icon: Gift,
    color: "from-amber-500/20 to-orange-500/10",
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
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])
  return (
    <div className="bg-[#0a0a0f] text-white overflow-hidden">

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-12 py-24 overflow-hidden">

        {/* ORBS */}
        <div className="absolute top-[-200px] right-[-150px] h-[500px] w-[500px] rounded-full bg-amber-500/20 blur-[120px]" />
        <div className="absolute bottom-[-150px] left-[-100px] h-[400px] w-[400px] rounded-full bg-orange-500/20 blur-[120px]" />

        {/* GRID */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative z-10 text-center max-w-5xl w-full">
          {/* About Us - NOW BIGGER */}
          <div className="inline-flex items-center gap-3 rounded-full border-2 border-amber-500/40 bg-amber-500/15 px-8 py-4 backdrop-blur-sm">
            <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-base sm:text-lg md:text-xl uppercase tracking-[4px] font-bold text-amber-400">
              About Us
            </span>
          </div>

          <h1 className="mt-8 text-2xl sm:text-3xl lg:text-4xl font- leading-[0.95] tracking-[-2px] sm:tracking-[-3px]">
            Discover Products <br />
            <span className="text-amber-400">You'll</span>  Love
          </h1>

          <p className="mx-auto mt-6 sm:mt-8 max-w-2xl text-base sm:text-lg leading-7 sm:leading-8 text-white/60 px-2">
            From the heart of Ulhasnagar, Maharashtra —bringing trending products,
            amazing deals, and a seamless shopping experience to businesses and
            shoppers across PAN India.
          </p>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-white/40">
            <MapPin className="h-4 w-4 text-amber-400" />
            Ulhasnagar, Maharashtra · Delivering Happiness Across India
          </div>

          <div className="mt-10 flex w-full flex-col sm:flex-row justify-center gap-4">
            <Link to="/" className="w-full sm:w-auto text-center rounded-full bg-amber-400 px-8 py-4 text-sm font-bold text-black transition hover:scale-105 hover:bg-amber-300">
              Start Shopping
            </Link>

            <Link to="/contact" className="rounded-full border border-white/20 px-8 py-4 text-sm font-bold transition hover:border-amber-400 hover:text-amber-400">
              Contact Us
            </Link>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/30">
          <ChevronDown className="animate-bounce" />
          <span className="mt-2 text-xs tracking-[3px] uppercase">
            Scroll
          </span>
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

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className="group rounded-3xl border border-gray-200 bg-[#fafafa] p-7 transition-all duration-500 hover:-translate-y-3 hover:border-amber-400 hover:shadow-2xl"
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

            <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl  tracking-[-2px]">
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
                  className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-amber-400/30 hover:shadow-2xl"
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

              <blockquote className="mt-8 border-l-4 border-amber-400 pl-6 text-lg leading-9 text-gray-600 italic">
                “We started with one goal — to become the most reliable
                wholesale partner for every business and shopper in India.”
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
            <Link to="/" className="rounded-full bg-black px-10 py-5 text-base font-bold text-white transition-all duration-300 hover:scale-105 hover:bg-black/90 hover:shadow-xl">
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