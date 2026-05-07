// ADMIN_TABS/MARKETING/coupons/CouponCreate.jsx
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import CouponForm from './CouponForm';
import { useCreateCouponMutation, useUpdateCouponMutation } from '../../../ADMIN_REDUX_MANAGEMENT/couponApi/couponApi';
import { toast } from 'react-toastify';

const CouponCreate = ({ isOpen, onClose, onSuccess, editingCoupon }) => {
    const [createCoupon, { isLoading: isCreating }] = useCreateCouponMutation();
    const [updateCoupon, { isLoading: isUpdating }] = useUpdateCouponMutation();

    useEffect(() => {
        if (!isOpen) {
            // Reset form when modal closes
            document.body.style.overflow = 'auto';
        } else {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    const handleSubmit = async (formData) => {
        try {
            if (editingCoupon) {
                await updateCoupon({ id: editingCoupon._id, ...formData }).unwrap();
            } else {
                await createCoupon(formData).unwrap();
            }
            onSuccess();
        } catch (error) {
            toast.error(error?.data?.message || `Failed to ${editingCoupon ? 'update' : 'create'} coupon`);
            throw error;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="px-6 py-4">
                        <CouponForm
                            initialData={editingCoupon}
                            onSubmit={handleSubmit}
                            onCancel={onClose}
                            isLoading={isCreating || isUpdating}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CouponCreate;