// this modal have both features upload images with link plus zip folder 
import React, { useState } from 'react';
import BulkUploadModal from '../ADMIN_TABS/BulkUploadTab'; 

const StatsCards = ({ activeProducts, featuredProducts, archivedProducts, onViewArchived }) => {
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  return (
    <>
      <div className="flex items-center space-x-3">

        {/* Live */}
        <div className="px-4 py-2 bg-blue-50 rounded-xl flex items-center space-x-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-blue-700">{activeProducts} Active</span>
        </div>

        {/* Featured */}
        <div className="px-4 py-2 bg-purple-50 rounded-xl flex items-center space-x-2">
          <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-sm font-medium text-purple-700">{featuredProducts} Featured</span>
        </div>

        {/* Archived */}
        <button
          onClick={onViewArchived}
          className="px-4 py-2 cursor-pointer bg-gray-50 rounded-xl flex items-center space-x-2 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <span className="text-sm font-medium text-gray-700">{archivedProducts} Archived</span>
        </button>

        {/* Bulk Upload trigger */}
        <button
          onClick={() => setShowBulkUpload(true)}
          className="px-4 py-2 bg-green-50 rounded-xl cursor-pointer flex items-center space-x-2 hover:bg-green-100 transition-colors group"
        >
          <svg
            className="w-4 h-4 text-green-600  group-hover:scale-110  group-hover:animate-bounce transition-transform"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-sm font-medium text-green-700">Bulk Upload</span>
        </button>

      </div>

      {/*
        BulkUploadModal is fully self-contained.
        It has its own backdrop, header, Redux state, step flow.
        Do NOT wrap it in another modal — just isOpen + onClose.
      */}
      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
      />
    </>
  );
};

export default StatsCards;

