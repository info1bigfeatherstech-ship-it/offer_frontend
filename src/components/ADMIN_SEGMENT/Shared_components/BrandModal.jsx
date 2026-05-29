// Shared_components/BrandModal.jsx

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addBrand } from '../ADMIN_REDUX_MANAGEMENT/brandSlice';

const BrandModal = ({ brands, setBrands, onSelect, onClose }) => {
  const dispatch = useDispatch();
  const [newBrand, setNewBrand] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!newBrand.trim()) {
      setError('Brand name cannot be empty');
      return;
    }

    // Check if brand already exists
    if (brands.includes(newBrand.trim())) {
      setError('This brand already exists');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Dispatch to Redux
      await dispatch(addBrand(newBrand.trim())).unwrap();
      
      // Update local brands array in parent
      const updatedBrands = [...brands, newBrand.trim()].sort();
      setBrands(updatedBrands);
      
      // Select the new brand
      onSelect(newBrand.trim());
      
      // Close modal
      onClose();
    } catch (error) {
      setError('Failed to add brand: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60] mt-[1%]">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Add New Brands</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand Name
          </label>
          <input
            type="text"
            value={newBrand}
            onChange={(e) => {
              setNewBrand(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            placeholder="e.g., Apple, Samsung, Nike"
            autoFocus
            disabled={loading}
          />
          <p className="text-xs text-gray-400 mt-2">
            Press Enter to add or Escape to cancel
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            disabled={loading || !newBrand.trim()}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              'Add Brand'
            )}
          </button>
        </div>

        {/* Show existing brands for reference */}
        {brands.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Existing brands:</p>
            <div className="flex flex-wrap gap-2">
              {brands.slice(0, 5).map((brand) => (
                <span
                  key={brand}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {brand}
                </span>
              ))}
              {brands.length > 5 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{brands.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandModal;

