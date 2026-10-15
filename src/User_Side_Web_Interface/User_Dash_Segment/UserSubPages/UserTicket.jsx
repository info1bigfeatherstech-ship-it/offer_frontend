import React, { useEffect } from 'react';
import { Mail, FileText, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserTicket = () => {
  const navigate = useNavigate();

  const supportCategories = [
    {
      icon: <Mail className="text-red-500" size={24} />,
      title: "Email Support",
      desc: "Drop us a message",
      detail: "Our team typically responds within 24 hours for all queries.",
      action: "Send Email",
      link: "mailto:support.offerwalebaba@gmail.com",
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
      bgColor: "bg-blue-50/40",
      borderColor: "border-blue-100"
    },
  ];

  const handleAction = (item) => {
    if (item.link.startsWith('http') || item.link.startsWith('mailto')) {
      window.open(item.link, '_blank');
    } else {
      navigate(item.link);
    }
  };

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }, []);

  return (
    <div className="flex flex-wrap justify-center gap-6 p-6">
      {supportCategories.map((item, idx) => (
        <div
          key={idx}
          onClick={() => handleAction(item)}
          className={`group relative bg-white border ${item.borderColor} ${item.bgColor} p-6 sm:p-8 rounded-[2rem] transition-all duration-500 hover:shadow-2xl hover:shadow-[#f7a221]/10 cursor-pointer flex flex-col 
          w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)]`}
        >
          <div className="p-3 bg-white w-fit rounded-xl border border-slate-100 shadow-sm mb-6 group-hover:border-[#f7a221] transition-all">
            {item.icon}
          </div>

          <div className="flex-grow">
            <h3 className="text-lg font-bold mb-2 uppercase group-hover:text-[#f7a221] transition-colors">
              {item.title}
            </h3>
            <p className="text-slate-900 font-bold text-xs mb-2">
              {item.desc}
            </p>
            <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
              {item.detail}
            </p>
          </div>

          <button className="flex items-center justify-between w-full bg-slate-900 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] group-hover:bg-[#f7a221] transition-all">
            {item.action}
            <ArrowUpRight size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default UserTicket;