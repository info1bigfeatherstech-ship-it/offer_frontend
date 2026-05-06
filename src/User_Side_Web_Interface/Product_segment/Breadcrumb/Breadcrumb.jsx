import { ArrowLeft, ChevronDown, Filter } from 'lucide-react';
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';

const Breadcrumb = ({ product }) => {
    const categoryName = product?.category?.name || "";
    // console.log("categoryname",product);
    
    const navigate = useNavigate();
      const [isFilterOpen, setIsFilterOpen] = useState(false);
  return (
    <div>
         <div className="bg-gray-50 border-b border-zinc-100 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-1 text-zinc-500 hover:text-zinc-900">
              <ArrowLeft size={20} />
            </button>
            <nav className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
              <Link to="/" className="text-zinc-900">Home</Link>
              <ChevronDown size={10} />
              <span className="text-zinc-900 font-bold">{categoryName}</span>
            </nav>
          </div>
          <button
            onClick={() => setIsFilterOpen(true)}
            className="md:hidden p-2 text-zinc-900"
          >
            <Filter size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Breadcrumb