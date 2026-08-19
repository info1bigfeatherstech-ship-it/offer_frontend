import React, { useState } from 'react';
import { Info } from 'lucide-react';

const ProductDisplaySettings = () => {
  const [selectedRatio, setSelectedRatio] = useState('3:4');
  const [selectedColor, setSelectedColor] = useState('white');

  const aspectRatios = [
    { id: '1:1', label: 'Square (1:1)', desc: 'Perfect for a balanced, grid-friendly layout. Ideal for most products.', width: 'w-10', height: 'h-10' },
    { id: '3:4', label: 'Portrait (3:4)', desc: 'Great for fashion, electronics, or anything vertical.', width: 'w-8', height: 'h-10' },
    { id: '9:16', label: 'Portrait (9:16)', desc: 'Great for mobile-first visuals. Suited for beauty, wellness, fitness, and service-based businesses.', width: 'w-6', height: 'h-10' },
    { id: '4:3', label: 'Landscape (4:3)', desc: 'Ideal for wide products like trays, shoes or scenery.', width: 'w-12', height: 'h-9' },
    { id: '16:9', label: 'Landscape (16:9)', desc: 'Best for wide, desktop-friendly images. Ideal for travel, real estate, and event-based businesses.', width: 'w-12', height: 'h-7' },
  ];

  return (
    <div className="w-full p-8 font-sans text-gray-900">
      {/* Page Title */}
      <h1 className="text-xl  mb-6">Product display preference</h1>

      {/* Blue Note Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3 mb-8">
        <div className="bg-blue-100 p-1 rounded-md">
           <Info size={16} className="text-blue-600" />
        </div>
        <p className="text-sm text-gray-700">
          <span className="">Note:</span> This size will be used as a default for the image cropper for product / service images.
        </p>
      </div>

      {/* Aspect Ratio Selection Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8 shadow-sm">
        <div className="bg-gray-50/50 px-6 py-3 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-500">Select one option</span>
        </div>

        <div className="divide-y divide-gray-100">
          {aspectRatios.map((ratio) => (
            <label 
              key={ratio.id} 
              className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-6">
                {/* Visual Ratio Preview */}
                <div className="w-16 flex justify-center items-center">
                  <div className={`bg-blue-100 border-2 border-blue-200 rounded ${ratio.width} ${ratio.height}`} />
                </div>
                
                {/* Text Info */}
                <div>
                  <h3 className="text-sm  text-gray-800">{ratio.label}</h3>
                  <p className="text-xs text-gray-400 mt-1">{ratio.desc}</p>
                </div>
              </div>

              {/* Radio Input */}
              <input
                type="radio"
                name="aspect-ratio"
                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                checked={selectedRatio === ratio.id}
                onChange={() => setSelectedRatio(ratio.id)}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Base Color Selection Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="max-w-md text-center md:text-left">
          <h3 className="text-sm  text-gray-800">Choose a default base color of product image card</h3>
          <p className="text-xs text-gray-400 mt-2">
            This will be used when the cropped image does not match the product image display preference.
          </p>
        </div>

        {/* Color Previews */}
        <div className="flex items-center gap-4">
          {/* Transparent Option */}
          <div 
            onClick={() => setSelectedColor('transparent')}
            className={`cursor-pointer rounded-lg p-1 transition-all ${selectedColor === 'transparent' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
          >
            <div className="w-32 h-20 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center relative">
               <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300" alt="preview" className="w-24 z-10" />
            </div>
          </div>

          {/* Black Option */}
          <div 
            onClick={() => setSelectedColor('black')}
            className={`cursor-pointer rounded-lg p-1 transition-all ${selectedColor === 'black' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
          >
            <div className="w-32 h-20 bg-black rounded-md overflow-hidden flex items-center justify-center">
               <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300" alt="preview" className="w-24" />
            </div>
          </div>

          {/* White Option (Selected in screenshot) */}
          <div 
            onClick={() => setSelectedColor('white')}
            className={`cursor-pointer rounded-lg p-1 transition-all ${selectedColor === 'white' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
          >
            <div className="w-32 h-20 bg-white border border-gray-200 rounded-md overflow-hidden flex items-center justify-center shadow-sm">
               <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300" alt="preview" className="w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDisplaySettings;