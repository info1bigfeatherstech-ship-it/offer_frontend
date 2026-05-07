// ADMIN_TABS/MARKETING/coupons/CouponTab.jsx
import React, { useState, useCallback } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { useGetCouponsQuery, useDeleteCouponMutation, useToggleCouponStatusMutation } from '../../../ADMIN_REDUX_MANAGEMENT/couponApi/couponApi';
import CouponTable from './CouponTable';
import CouponCreate from './CouponCreate';
import { toast } from 'react-toastify';

const CouponTab = ({ onBack }) => {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);

    // API hooks
    const { data, isLoading, refetch, isFetching } = useGetCouponsQuery({ page, limit: 10, status, search });
    const [deleteCoupon] = useDeleteCouponMutation();
    const [toggleStatus] = useToggleCouponStatusMutation();

    const coupons = data?.coupons || [];
    const pagination = data?.pagination;

    // Handlers
    const handleEdit = useCallback((coupon) => {
        setEditingCoupon(coupon);
        setIsModalOpen(true);
    }, []);

    const handleDelete = useCallback(async (id) => {
        if (window.confirm('Are you sure you want to delete this coupon?')) {
            try {
                await deleteCoupon(id).unwrap();
                toast.success('Coupon deleted successfully');
                refetch();
            } catch (error) {
                toast.error(error?.data?.message || 'Failed to delete coupon');
            }
        }
    }, [deleteCoupon, refetch]);

    const handleToggleStatus = useCallback(async (id, currentStatus) => {
        try {
            await toggleStatus(id).unwrap();
            toast.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            refetch();
        } catch (error) {
            toast.error(error?.data?.message || 'Failed to update coupon status');
        }
    }, [toggleStatus, refetch]);

    const handleModalClose = useCallback(() => {
        setIsModalOpen(false);
        setEditingCoupon(null);
    }, []);

    const handleSuccess = useCallback(() => {
        handleModalClose();
        refetch();
        toast.success(editingCoupon ? 'Coupon updated successfully' : 'Coupon created successfully');
    }, [refetch, editingCoupon, handleModalClose]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <button
                        onClick={onBack}
                        className="text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1 text-sm"
                    >
                        ← Back to Marketing
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Create and manage discount coupons</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all cursor-pointer"
                >
                    <Plus size={18} />
                    Create Coupon
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by coupon code or name..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => {
                        setStatus(e.target.value);
                        setPage(1);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                >
                    <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Table */}
            <CouponTable
                coupons={coupons}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
            />

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                        Previous
                    </button>
                    <span className="px-3 py-1">
                        Page {page} of {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={page === pagination.totalPages}
                        className="px-3 py-1 border rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            <CouponCreate
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSuccess={handleSuccess}
                editingCoupon={editingCoupon}
            />
        </div>
    );
};

export default CouponTab;