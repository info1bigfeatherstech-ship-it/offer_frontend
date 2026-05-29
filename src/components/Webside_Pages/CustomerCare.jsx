import React, { useEffect } from 'react';
import { 
  Mail, 
  MessageCircle, 
  FileText, 
  ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CustomerCare() {

 
  const navigate = useNavigate();
const WhatsAppIcon = () => (
  <svg 
    viewBox="0 0 24 24" 
    className="w-6 h-6 text-[#25D366]" // This controls the "currentColor"
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }, []);
  useEffect(() => {
    if (window.AOS) {
      window.AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 100,
      });
    }
  }, []);

  const supportCategories = [
    {
      icon: <Mail className="text-red-500" size={24} />,
      title: "Email Support",
      desc: "Drop us a message",
      detail: "Our team typically responds within 24 hours for all queries.",
      action: "Send Email",
      link: "mailto:support.offerwalebaba@gmail.com",
      isExternal: true,
      bgColor: "bg-red-50/40",
      borderColor: "border-red-100"
    },
    {
      icon: <WhatsAppIcon fill="currentColor" size={24} />,
      title: "WhatsApp Help",
      desc: "Instant Chat Support",
      detail: "Get quick updates and help directly on your WhatsApp.",
      action: "Chat Now",
      // This version includes the pre-filled message: 
// "Hello Offer Wale Baba Team! I need some help with my order."
    link: `https://wa.me/919370686008?text=${encodeURIComponent("Hello Offer Wale Baba Team! I need some help with my order.")}`,
      isExternal: true,
      bgColor: "bg-[#25D366]/10",
      borderColor: "border-green-100"
    },
    {
      icon: <FileText className="text-blue-500" size={24} />,
      title: "Service Inquiry",
      desc: "Submit a Request",
      detail: "Fill out our formal contact form for specific business needs.",
      action: "Fill the Form",
      link: "/contact",
      isExternal: false,
      bgColor: "bg-blue-50/40",
      borderColor: "border-blue-100"
    },
  ];

  const handleAction = (item) => {
    if (item.isExternal) {
      window.open(item.link, '_blank');
    } else {
      navigate(item.link);
    }
  };

  return (
   <div className="w-fit h-fit p-4 mx-auto mb-28 bg-[#F9FAFB] text-slate-800 font-sans selection:bg-[#f7a221] selection:text-white overflow-hidden">

  {/* BG GLOW */}
  <div
    className="
      absolute top-0 left-0 right-0
      h-[280px] sm:h-[450px]
      bg-gradient-to-b
      from-[#f7a221]/10
      via-[#f7a221]/5
      to-transparent
      pointer-events-none
    "
  />

  <div
    className="
      relative z-10
      container mx-auto
      px-3 sm:px-6
      py-8 sm:py-14 md:py-10
    "
  >
    <div className="max-w-6xl mx-auto">

      {/* HEADER */}
      <div className="text-center mb-8 sm:mb-10">

        {/* BADGE */}
        <div
          className="
            inline-flex items-center gap-2 sm:gap-3
            px-3 sm:px-4
            py-2
            rounded-full
            bg-white
            border border-slate-200
            shadow-sm
            mb-5 sm:mb-6
          "
          data-aos="fade-up"
        >
          <span className="relative flex h-2 w-2">
            <span
              className="
                animate-ping absolute inline-flex
                h-full w-full rounded-full
                bg-[#f7a221] opacity-75
              "
            />
            <span
              className="
                relative inline-flex
                rounded-full h-2 w-2
                bg-[#f7a221]
              "
            />
          </span>

          <span
            className="
              text-[9px] sm:text-[10px]
              font-black
              uppercase
              tracking-[0.22em]
              text-slate-500
            "
          >
            Concierge Desk
          </span>
        </div>

        {/* TITLE */}
        <h1
          className="
            text-2xl
            sm:text-4xl
            md:text-6xl
            leading-tight
            mb-4
            uppercase
            px-2
          "
          data-aos="fade-up"
          data-aos-delay="200"
        >
          Elite Support &{" "}
          <span className="text-[#f7a221]">
            Seamless Solutions
          </span>
        </h1>

        {/* SUBTEXT */}
        <p
          className="
            text-slate-500
            text-xs sm:text-base
            max-w-2xl
            mx-auto
            font-medium
            leading-relaxed
            px-3
          "
          data-aos="fade-up"
          data-aos-delay="300"
        >
          Select a channel below to connect with{" "}
          <span className="underline text-[#f7a221] font-bold">
            OFFER WALE BABA
          </span>
          .
        </p>
      </div>

      {/* GRID */}
      <div
        className="
          grid
          grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-3
          gap-3 sm:gap-5
        "
      >
        {supportCategories.map((item, idx) => (
          <div
            key={idx}
            onClick={() => handleAction(item)}
            className={`
              group
              relative
              bg-white
              border
              ${item.borderColor}
              ${item.bgColor}
              rounded-[24px] sm:rounded-[2rem]
              p-4 sm:p-7
              transition-all duration-500
              hover:shadow-2xl
              hover:shadow-[#f7a221]/10
              cursor-pointer
              flex flex-col
              min-w-0
              active:scale-[0.99]
            `}
            data-aos="fade-up"
            data-aos-delay={(idx * 100) + 400}
          >

            {/* ICON */}
            <div
              className="
                p-3
                bg-white
                w-fit
                rounded-xl
                border border-slate-100
                shadow-sm
                mb-4 sm:mb-6
                group-hover:border-[#f7a221]
                transition-all
              "
            >
              {item.icon}
            </div>

            {/* CONTENT */}
            <div className="flex-grow min-w-0">

              {/* TITLE */}
              <h3
                className="
                  text-base sm:text-lg
                  font-bold
                  mb-2
                  uppercase
                  group-hover:text-[#f7a221]
                  transition-colors
                  break-words
                "
              >
                {item.title}
              </h3>

              {/* DESC */}
              <p
                className="
                  text-slate-900
                  font-bold
                  text-[11px] sm:text-xs
                  mb-2
                  leading-relaxed
                  break-words
                "
              >
                {item.desc}
              </p>

              {/* DETAIL */}
              <p
                className="
                  text-slate-500
                  text-[11px] sm:text-xs
                  font-medium
                  leading-relaxed
                  mb-5 sm:mb-6
                  break-words
                "
              >
                {item.detail}
              </p>
            </div>

            {/* BUTTON */}
            <button
              className="
                flex items-center justify-between
                w-full
                bg-slate-900
                text-white
                px-4
                py-3
                rounded-xl
                font-black
                uppercase
                text-[10px]
                tracking-[0.18em]
                group-hover:bg-[#f7a221]
                transition-all
                cursor-pointer
              "
            >
              <span className="truncate">
                {item.action}
              </span>

              <ArrowUpRight
                size={14}
                className="shrink-0"
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
</div>
  );
}

