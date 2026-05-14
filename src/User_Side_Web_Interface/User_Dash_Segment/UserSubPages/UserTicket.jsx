import React, { useState } from 'react';
import { LifeBuoy, Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

const UserTicket = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Mock data for tickets
  const tickets = [
    { id: 'TKT-9921', subject: 'Late Delivery - Order #OWB-ECOMM-88291', status: 'Open', priority: 'High', date: 'Mar 18, 2026' },
    { id: 'TKT-8840', subject: 'Refund Status for Returned Item', status: 'Resolved', priority: 'Medium', date: 'Feb 12, 2026' },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Open': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Resolved': return 'bg-green-100 text-green-600 border-green-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Support Tickets</h1>
          <p className="text-gray-500 font-bold text-sm uppercase tracking-widest mt-1">Get help with your orders</p>
        </div>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center justify-center gap-2 bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] transition-all shadow-lg active:scale-95"
        >
          {showCreateForm ? 'Close Form' : <><Plus size={18} /> New Ticket</>}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active', count: 1, icon: <Clock size={16} />, color: 'text-orange-500' },
          { label: 'Resolved', count: 12, icon: <CheckCircle2 size={16} />, color: 'text-green-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
            <span className={stat.color}>{stat.icon}</span>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 leading-none">{stat.label}</p>
              <p className="text-lg font-black text-gray-900">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Ticket Form (Collapsible) */}
      {showCreateForm && (
        <div className="bg-white border-2 border-black rounded-[32px] p-8 shadow-2xl animate-slideDown">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2">
            <MessageSquare className="text-[#F7A221]" /> Open a New Query
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-gray-400 ml-1">Subject / Issue Type</label>
              <select className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl outline-none font-bold appearance-none transition-all">
                <option>Delivery Related</option>
                <option>Payment/Refund Issue</option>
                <option>Product Quality</option>
                <option>Account Access</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-gray-400 ml-1">Related Order (Optional)</label>
              <input type="text" placeholder="#OWB-ECOMM-…" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl outline-none font-bold" />
            </div>
            <div className="col-span-full space-y-2">
              <label className="text-[11px] font-black uppercase text-gray-400 ml-1">Explain your problem</label>
              <textarea rows="4" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl outline-none font-bold resize-none" placeholder="Details help us solve it faster..."></textarea>
            </div>
            <button className="col-span-full bg-black text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-orange-500 transition-all">
              Submit Ticket
            </button>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="group bg-white p-6 rounded-[32px] border border-gray-100 hover:border-black hover:shadow-xl transition-all duration-300 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl ${ticket.status === 'Resolved' ? 'bg-gray-100 text-gray-400' : 'bg-orange-50 text-orange-500'}`}>
                {ticket.status === 'Resolved' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-gray-400 tracking-widest">{ticket.id}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${getStatusStyle(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
                <h4 className="font-black text-gray-900 group-hover:text-[#F7A221] transition-colors">{ticket.subject}</h4>
                <p className="text-xs font-bold text-gray-400 mt-1">Last activity: {ticket.date}</p>
              </div>
            </div>
            <button className="p-3 bg-gray-50 rounded-xl group-hover:bg-black group-hover:text-white transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserTicket;