// ADMIN_SEGMENT/ADMIN_TABS/WHOLESALER_TAB/RequestDetailModal.jsx

import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  useNotifyOwnerMutation,
  useNotifyApplicantMutation,
} from "../../ADMIN_REDUX_MANAGEMENT/wholesalerApi/wholesalerApi";

const RequestDetailModal = ({ isOpen, onClose, request, onRequestAction }) => {
  const [isLoadingOwner, setIsLoadingOwner] = useState(false);
  const [isLoadingApplicant, setIsLoadingApplicant] = useState(false);
  
  const [notifyOwner] = useNotifyOwnerMutation();
  const [notifyApplicant] = useNotifyApplicantMutation();
  
  const handleNotifyOwner = async () => {
    console.log("Notify Owner clicked for request ID:", request?.id);
    if (!request?._id) return;
    setIsLoadingOwner(true);
    try {
      const result = await notifyOwner({ id: request._id }).unwrap();
      if (result.waMeUrl) {
        window.open(result.waMeUrl, "_blank");
        toast.success("WhatsApp link opened! Send to owner.");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to generate WhatsApp link");
    } finally {
      setIsLoadingOwner(false);
    }
  };
  
  const handleNotifyApplicant = async () => {
    if (!request?._id) return;
    setIsLoadingApplicant(true);
    try {
      const result = await notifyApplicant({ id: request._id }).unwrap();
      if (result.waMeUrl) {
        window.open(result.waMeUrl, "_blank");
        toast.success("WhatsApp link opened! Notify applicant.");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to generate WhatsApp link");
    } finally {
      setIsLoadingApplicant(false);
    }
  };
  
  if (!isOpen) return null;
  
  const getStatusActions = () => {
    switch (request?.status) {
      case "pending":
        return (
          <button
            onClick={handleNotifyOwner}
            disabled={isLoadingOwner}
            className="px-4 py-2 bg-yellow-600 cursor-pointer text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoadingOwner ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            Notify Owner via WhatsApp
          </button>
        );
      case "approved":
      case "rejected":
        return (
          <button
            onClick={handleNotifyApplicant}
            disabled={isLoadingApplicant}
            className="px-4 py-2 bg-green-600 cursor-pointer text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoadingApplicant ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            )}
            Notify Applicant via WhatsApp
          </button>
        );
      default:
        return null;
    }
  };
  
  return (
    <div 
      className="fixed inset-0 z-[100] overflow-y-auto" 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4" style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
            <h3 className="text-lg font-medium text-gray-900">
              Wholesaler Request Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 cursor-pointer hover:text-gray-500 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Body */}
          <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 130px)' }}>
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Full Name</p>
                    <p className="text-sm font-medium text-gray-900">{request?.fullName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{request?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Mobile Number</p>
                    <p className="text-sm font-medium text-gray-900">{request?.mobileNumber || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">WhatsApp Number</p>
                    <p className="text-sm font-medium text-gray-900">{request?.whatsappNumber || "—"}</p>
                  </div>
                </div>
              </div>
              
              {/* Address Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">Address Information</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Permanent Address</p>
                    <p className="text-sm text-gray-900">{request?.permanentAddress || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Business Address</p>
                    <p className="text-sm text-gray-900">{request?.businessAddress || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Delivery Address</p>
                    <p className="text-sm text-gray-900">{request?.deliveryAddress || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Has Shop</p>
                    <p className="text-sm text-gray-900">{request?.haveShop ? "Yes" : "No"}</p>
                  </div>
                </div>
              </div>
              
              {/* Business Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">Business Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Selling Place From</p>
                    <p className="text-sm text-gray-900">{request?.sellingPlaceFrom || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Selling Zone/City</p>
                    <p className="text-sm text-gray-900">{request?.sellingZoneCity || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Product Category</p>
                    <p className="text-sm text-gray-900">{request?.productCategory || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Monthly Estimated Purchase</p>
                    <p className="text-sm text-gray-900">
                      {request?.monthlyEstimatedPurchase ? `₹${parseInt(request.monthlyEstimatedPurchase).toLocaleString()}` : "—"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Documents */}
              {(request?.idProofUrl || request?.businessAddressProofUrl) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">Documents</h4>
                  <div className="space-y-3">
                    {request?.idProofUrl && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">ID Proof</p>
                        <a
                          href={request.idProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          View Document →
                        </a>
                      </div>
                    )}
                    {request?.businessAddressProofUrl && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Business Address Proof</p>
                        <a
                          href={request.businessAddressProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          View Document →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Status & Timestamps */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <p className="font-medium text-gray-700">Status:</p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold ${
                      request?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request?.status === 'approved' ? 'bg-green-100 text-green-800' :
                      request?.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {(request?.status || 'pending').charAt(0).toUpperCase() + (request?.status || 'pending').slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Submitted:</p>
                    <p>{request?.createdAt ? new Date(request.createdAt).toLocaleString() : "—"}</p>
                  </div>
                  {request?.updatedAt && (
                    <div className="col-span-2">
                      <p className="font-medium text-gray-700">Last Updated:</p>
                      <p>{new Date(request.updatedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {getStatusActions()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailModal;
