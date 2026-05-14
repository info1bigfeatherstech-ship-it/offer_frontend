import React, { useState } from 'react';
import {
  Facebook, Instagram, Youtube, ShieldCheck, Star, Award,
  ChevronRight, Zap, Briefcase, Globe
} from 'lucide-react';
import logo from "../../assets/logo.jpg";
import { Link } from 'react-router-dom';
import google from "../.././assets/google.png"

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [isOpen, setisOpen] = useState(false)

  // Modified footerSections that uses the categories
  const footerSections = [
    {
      title: "Quick links",
      items: [
        { label: "Smart Life Gadgets", path: "/category/smart-life-gadgets" },
        { label: "Home & Kitchen", path: "/category/home-and-kitchen" },
        { label: "Fashion World", path: "/category/fashion-world" },
        { label: "Sports & Fitness", path: "/category/sports-and-fitness" },
        { label: "Tours & Travels", path: "/category/tours-and-travels" },
        { label: "Stationary", path: "/category/stationary" },
      ]
    },
    {
      title: "Quick links",
      items: [
        { label: "Baby Items", path: "/category/baby-items" },
        { label: "Car Accessories", path: "/category/car-accessories" },
        { label: "Cleaning & Housekeeping Supplies", path: "/category/cleaning-&housekeeping-supplies" },
        { label: "Gifts", path: "/category/gifts" },
        { label: "Mix-items", path: "/category/mix-items-daily-use" },
      ]
    },
    // { 
    //   title: "Categories", 
    //   items: categories // Reusing your categories array
    // },
    {
      title: "Important Links",
      items: [
        { label: "About Us", path: "/about" },
        { label: "Contact Us", path: "/contact" },
        // { label: "Influencer Form", path: "/influencer-form" },
        { label: "Customer Care", path: "/customer-care" },
        { label: "Influencer Form", path: "/Influencer" },
      ]
    },
    {
      title: "Policies",
      items: [
        { label: "Return & Refund", path: "/policies/return-refund" },
        { label: "Order Cancellation Policy", path: "/policies/order-cancellation" },
        { label: "Privacy Policy", path: "/policies/privacy-policy" },
        { label: "Shipping Policy", path: "/policies/shipping-policy" },
        { label: "Terms & Conditions", path: "/policies/terms-conditions" }
      ]
    }
  ];
  // { title: "Solutions", items: ["Brand Drop Shipping", "Shopify Website", "B2B Drop Shipping", "Reseller Plan"] }
  const socialLinks = [
    {
      icon: "fa-whatsapp",
      color: "bg-[#25D366]",
      iconColor: "text-[#25D366]",
      link: "https://wa.me/message/72BTQZMTQU2AG1" // replace with your number
    },
    // {
    //   icon: "fa-telegram",
    //   color: "hover:bg-[#0088cc]",
    //   link: "https://t.me/OfferWaleBabaRetail"
    // },
    // {
    //   icon: "fa-instagram",
    //   color: "hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7]",
    //   link: " hhttps://www.instagram.com/offer_wale_baba?igsh=Mjd6aG84bXV5dmRn"
    // },
    // {
    //   icon: "fa-facebook",
    //   color: "hover:bg-[#1877F2]",
    //   link: "https://www.facebook.com/share/1Eej9auTBB"
    // },
    // {
    //   icon: "fa-youtube",
    //   color: "hover:bg-[#FF0000]",
    //   link: "https://youtube.com/@offerwalebabaa?si=dyfMK956fnjZhZ1O"
    // },
    // {
    //   icon: "fa-threads",
    //   color: "hover:bg-black border-white/20",
    //   link: "https://www.threads.net/@yourusername"
    // },
    {
      icon: "fa-google",
      color: "bg-[#4285F4]",
      label: "Google",
      link: "https://www.google.com/search?q=OfferWaleBaba&stick=H4sIAAAAAAAA_-NgU1I1qDBOSjW3NLU0S000N0pKSUqxMqhIMkoyMzNPMkhMNE1KNkpKW8TK65-WlloUnpiT6pSYlAgA9JZF2jkAAAA&hl=en&mat=CRFncPBLRARKElcBTVDHnlFZAzRUb5k7XxJQUtIo8wkxRLilxtEbwkTszXtkEc5ACbiU0Rdp8GkiDbg99jHlvSmDg_UAZsfXWVQZ-MJOdtz8aSvPSjHQIm98wMZv9rgWgNM&authuser=0" // or Google Maps link
    }
  ];

  return (
    <footer className="relative bg-[#050505] text-gray-400 pt-32 pb-12 overflow-hidden font-sans selection:bg-[#f7a221] selection:text-black">
      <style>{`
        .owb-footer-meta {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .owb-footer-meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 2rem 2.5rem;
          }
          .owb-footer-meta > .owb-footer-meta-hours {
            grid-column: 1 / -1;
          }
        }
        @media (min-width: 1024px) and (max-width: 1502px) {
          .owb-footer-meta {
            display: flex;
            flex-direction: column;
            gap: 2.5rem;
            align-items: stretch;
          }
          .owb-footer-meta > .owb-footer-meta-support { order: 1; }
          .owb-footer-meta > .owb-footer-meta-hours { order: 2; }
          .owb-footer-meta > .owb-footer-meta-location { order: 3; min-width: 0; }
        }
        @media (min-width: 1503px) {
          .owb-footer-meta {
            display: grid;
            grid-template-columns: 1.45fr 1fr;
            column-gap: 3.5rem;
            row-gap: 2.5rem;
          }
          .owb-footer-meta > .owb-footer-meta-hours {
            grid-column: 1 / -1;
          }
        }
      `}</style>

      {/* --- BACKGROUND WATERMARK (BABA) WITH INTEGRATED PRECISION NEON --- */}
      <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none z-0">
        <svg
          viewBox="0 0 1000 400"
          className="w-[120vw] h-auto opacity-40"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* High-end architectural glow filter */}
            <filter id="neon-glow-premium" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* SHARED TEXT GROUP: Ensures the heavy fill and the neon line are perfectly pixel-aligned */}
          <g className="baba-master-group">
            {/* 1. The Heavy Background Fill (The "Big BABA" Text) */}
            <text
              x="50%" y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-fill-base"
            >
              BABA
            </text>

            {/* 2. The Precision Running Neon Border (The "Electricity" Layer) */}
            <text
              x="50%" y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-neon-border"
              filter="url(#neon-glow-premium)"
            >
              BABA
            </text>
          </g>
        </svg>
      </div>

      {/* --- AMBIENT LIGHT EFFECTS --- */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[1000px] h-[600px] bg-[#f7a221]/[0.05] rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[500px] bg-blue-600/[0.03] rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
      </div>

      <div className="container relative z-10 mx-auto px-6 lg:px-12">

        {/* CENTERED LOGO SECTION */}
        <div className="flex flex-col items-center text-center mb-24">
          <div className="relative group inline-block">
            <div className="absolute -inset-10 bg-[#f7a221]/20 blur-[100px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-1000"></div>

            <div className="flex items-center justify-center gap-4 mb-8">
              <span className="h-[1.5px] w-12 bg-[#f7a221]"></span>
              <span className="text-[#f7a221] font-black text-[12px] tracking-[0.6em] uppercase">
                OfferwaleBaba Exclusive
              </span>
              <span className="h-[1.5px] w-12 bg-[#f7a221]"></span>
            </div>

            <h1
              className="text-6xl md:text-[10rem] font-black tracking-tighter leading-[0.75] uppercase bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${logo})`,
                backgroundSize: 'cover',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0px 10px 30px rgba(0,0,0,0.5))'
              }}
            >
              Offerwale <br />
              BABA
            </h1>

            <h2 className="mt-8 text-2xl md:text-3xl font-black text-white tracking-tighter max-w-2xl mx-auto uppercase">
              The New Standard of <span className="text-[#f7a221] not-italic">Indian Minimalism</span>
            </h2>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {socialLinks.map((social, i) => (
              <a
                key={i}
                href={social.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative flex items-center justify-center p-4 bg-white/5 border border-white/10 rounded-2xl text-gray-400
                  hover:text-white hover:-translate-y-2 hover:shadow-2xl
                  transition-all duration-500 ${social.color}`}
              >
                {/* NORMAL ICON */}
                <i
                  className={`fa-brands ${social.icon} text-2xl transition-opacity duration-300 ${social.icon === "fa-google" ? "group-hover:opacity-0" : ""
                    } ${social.icon === "fa-whatsapp" ? "text-[#25D366]" : ""}`}
                />

                {/* GOOGLE SVG */}
                {social.icon === "fa-google" && (
                  <img
                    src={google}
                    alt="google"
                    className="w-6 h-6 absolute  group-hover: transition-opacity duration-300"
                  />
                )}
              </a>
            ))}
          </div>
        </div>

        {/* MAIN FOOTER CONTENT GRID */}
        {/* MAIN FOOTER CONTENT GRID */}
        <div className="grid lg:grid-cols-12 gap-16 mb-24 border-t border-white/5 pt-24">

          {/* Support & Location Section */}
          <div className="lg:col-span-5 space-y-8">
            <div className="relative aspect-video rounded-[2rem] overflow-hidden border border-white/10 group">
              <iframe
                title="location"
                src="https://www.google.com/maps?q=19.2092622,73.1663272&z=16&output=embed"
                className="w-full h-full border-0 grayscale invert opacity-40 
                   group-hover:opacity-100 group-hover:grayscale-0 
                   transition-all duration-1000"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Layout: md 2-col; lg–1502px stack Support → Hours → Location (full width); 1503+ 2-col + hours row */}
            <div className="owb-footer-meta">
              {/* Support Info - Takes 1 column on desktop */}
              <div className="owb-footer-meta-support min-w-0">
                <p className="text-[#f7a221] font-black text-[20px] tracking-widest uppercase mb-2">
                  Support
                </p>
                <p className="text-white font-bold text-lg mb-1">+91 9370686008</p>
                <a
                  href="mailto:support.offerwalebaba@gmail.com"
                  className="text-white text-sm break-all lg:break-normal block hover:text-[#f7a221] transition-colors"
                >
                  support.offerwalebaba@gmail.com
                </a>
              </div>

              {/* Location Info - Takes 1 column on desktop */}
              <a
                href="https://www.google.com/maps?q=19.2092622,73.1663272&z=16"
                target="_blank"
                rel="noopener noreferrer"
                className="owb-footer-meta-location block min-w-0 group/link"
              >
                <p className="text-[#f7a221] font-black text-[20px] tracking-widest uppercase mb-2">
                  Location
                </p>
                <p className="text-white text-base md:text-lg leading-relaxed group-hover/link:underline">
                Sambhaji Chowk, Opp. Tipcy-Topcy Society, Babasai Nagar, Ulhasnagar, Mumbai - 421004, Maharastra, India"
                </p>
              </a>

              {/* Working Hours - Spans full width at the bottom on desktop */}
              <div className="owb-footer-meta-hours min-w-0 border-t border-white/10 pt-4 md:pt-0 md:border-none">
                <p className="text-[#f7a221] font-black text-[20px] tracking-widest uppercase mb-2">
                  Working Hours
                </p>
                <p className="text-white text-base md:text-lg leading-relaxed">
                  Tue–Sun, 1 PM – 10 PM
                </p>
              </div>
            </div>
          </div>

          {/* Quick Links Section */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {footerSections.map((section, idx) => (
              <div key={idx} className="space-y-6">
                <h4 className="   hover:text-white text-[#f7a221]  text-lg font- uppercase  flex items-center gap-1">
                  <div className="h-px w-1 bg-[#f7a221]"></div>
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.items.map((item, i) => (
                    <li key={i} className="group flex items-center text-sm font-semibold text-white">
                      <Link
                        to={item.path}
                        className="flex items-center cursor-pointer hover:text-[#f7a221] transition-colors duration-300"
                      >
                        <span className="w-0 overflow-hidden group-hover:w-4 transition-all duration-300 text-[#f7a221]">
                          <ChevronRight size={14} />
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>



        {/* TRUST SECTION */}
        {/* <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 md:p-12 flex flex-wrap justify-between items-center gap-8 mb-12">
          <div className="flex flex-wrap gap-12 items-center">
            
            <div className="flex items-center gap-4 group">
              <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-all">
                <ShieldCheck size={40} className="text-blue-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-white font-black text-xl  uppercase tracking-tighter">IndiaMart</p>
                <p className="text-[10px] uppercase font-bold text-gray-500 group-hover:text-blue-400 transition-colors">Gold Verified</p>
              </div>
            </div>

            
            <div className="flex items-center gap-4 group">
              <div className="p-3 bg-[#f7a221]/10 rounded-2xl group-hover:bg-[#f7a221]/20 transition-all">
                <Briefcase size={40} className="text-[#f7a221]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-white font-black text-xl  uppercase tracking-tighter">Trade India</p>
                <p className="text-[10px] uppercase font-bold text-gray-500 group-hover:text-[#f7a221] transition-colors">Premium Member</p>
              </div>
            </div>

            
            <div className="flex items-center gap-4 group">
              <div className="p-3 bg-green-500/10 rounded-2xl group-hover:bg-green-500/20 transition-all">
                <Globe size={40} className="text-green-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-white font-black text-xl  uppercase tracking-tighter">Export India</p>
                <p className="text-[10px] uppercase font-bold text-gray-500 group-hover:text-green-400 transition-colors">Global Trust</p>
              </div>
            </div>
          </div>

         
          <div className="flex items-center gap-6 px-6 md:px-8 py-4 bg-black/40 rounded-3xl border border-white/5 backdrop-blur-sm hover:border-[#f7a221]/30 transition-all w-full sm:w-auto justify-center">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#050505] bg-zinc-800 flex items-center justify-center hover:-translate-y-1 transition-transform">
                  <Star size={10} md:size={12} fill="#f7a221" className="text-[#f7a221]" />
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-white font-black text-xl md:text-2xl leading-none">4.9</p>
                <span className="text-[#f7a221] text-[10px] md:text-xs">★★★★★</span>
              </div>
              <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Trustpilot Score</p>
            </div>
          </div>
        </div> */}



        <div className="flex flex-col md:flex-row justify-center items-center gap-6 border-t border-white/5 pt-12">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] text-center md:text-left">
            © {currentYear} Design and Developed by <span className='underline'>Offer Wale Baba</span>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(20px, -30px) scale(1.05); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 12s infinite ease-in-out alternate; }

        /* SHARED TYPOGRAPHY - Ensures pixel-perfect alignment */
        .text-fill-base, .text-neon-border {
          font-family: sans-serif;
          font-weight: 900;
          font-size: 380px;
          letter-spacing: -24px;
        }

        /* 1. The Heavy Background */
        .text-fill-base {
          fill: rgba(255, 255, 255, 0.2);
        }

        /* 2. The Precision Neon Border Animation */
        .text-neon-border {
          fill: transparent;
          stroke: #f7a221;
          stroke-width: 3px;
          stroke-dasharray: 200 1200;
          animation: precisionRun 14s linear infinite;
        }
 
        @keyframes precisionRun {
          from { stroke-dashoffset: 1400; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;

