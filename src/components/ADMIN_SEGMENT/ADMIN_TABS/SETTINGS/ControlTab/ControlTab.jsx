import React, { useEffect, useState } from 'react';
import { 
  ChevronRight, 
  Star, 
  FileText, 
  Truck, 
  Settings2, 
  Store, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

const ControlTab = () => {
  const [controls, setControls] = useState({
    store: true,
    delivery: true,
    pickup: false,
  });

  const toggleStatus = (key) => {
    setControls(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // Adds smooth animation
    });
  }, []);

  return (
    <div className="bg-[#f9fafb] min-h-screen p-6 md:p-10 font-sans">
      <div className="w-full space-y-8">
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl  text-gray-900 tracking-tight">Store Controls</h1>
          <span className="text-xs  text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider border border-blue-100">
            Live Dashboard
          </span>
        </div>

        {/* --- Section 1: Dynamic Status Controls --- */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200 flex items-center gap-2">
            <Settings2 size={16} className="text-gray-400" />
            <h2 className="text-sm font- text-gray-500 uppercase tracking-widest">Operational Status</h2>
          </div>

          <div className="divide-y divide-gray-100 cursor-pointer">
            <StatusRow 
              title="Global Store Access" 
              desc="Allow customers to browse your products" 
              isActive={controls.store} 
              onToggle={() => toggleStatus('store')} 
            />
            <StatusRow 
              title="Delivery Services" 
              desc="Enable/Disable shipping and home delivery" 
              isActive={controls.delivery} 
              onToggle={() => toggleStatus('delivery')} 
            />
            <StatusRow 
              title="Self Pick-up" 
              desc="Allow customers to collect from store" 
              isActive={controls.pickup} 
              onToggle={() => toggleStatus('pickup')} 
            />
          </div>
        </section>

        {/* --- Section 2: Configuration --- */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Store className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="text-sm  text-gray-400 uppercase tracking-wider">Business Framework</h3>
                <p className="text-lg  text-gray-900">Business to Customer (B2C)</p>
              </div>
            </div>
            <button className="px-5 py-2 text-sm  cursor-pointer text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100">
              Change Type
            </button>
          </div>
        </section>

        {/* --- Section 3: Feature Marketplace (New Releases) --- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg  text-gray-800">Advanced Features</h2>
            <button className="flex cursor-pointer items-center text-blue-600 text-sm  hover:gap-2 transition-all">
              Explore All <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FeatureCard 
              icon={<Star className="text-amber-500" />}
              title="Review Engine"
              desc="Build social proof with automated customer ratings."
              bgColor="bg-amber-50"
            />
            <FeatureCard 
              icon={<FileText className="text-blue-500" />}
              title="GST Automator"
              desc="Generate compliant invoices instantly per order."
              bgColor="bg-blue-50"
            />
            <FeatureCard 
              icon={<Truck className="text-purple-500" />}
              title="COD Management"
              desc="Set logic-based fees for Cash on Delivery orders."
              bgColor="bg-purple-50"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

// Sub-component: Status Toggles
const StatusRow = ({ title, desc, isActive, onToggle }) => (
  <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-base  text-gray-800">{title}</p>
        {isActive ? 
          <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase bg-green-50 px-2 py-0.5 rounded border border-green-100">
            <CheckCircle2 size={10} /> Active
          </span> : 
          <span className="flex items-center gap-1 text-[10px] font-black text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded border border-red-100">
            <XCircle size={10} /> Paused
          </span>
        }
      </div>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
    
    <button 
      onClick={onToggle}
      className={`relative cursor-pointer inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${isActive ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

// Sub-component: Feature Cards
const FeatureCard = ({ icon, title, desc, bgColor }) => (
  <div className="group bg-white p-6 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer">
    <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h4 className=" text-gray-900 mb-2">{title}</h4>
    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
  </div>
);

export default ControlTab;