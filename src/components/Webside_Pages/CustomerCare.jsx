import React, { useEffect } from 'react';
import { 
  Mail, 
  FileText, 
  ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CustomerCare() {

 
  const navigate = useNavigate();

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

