// ADMIN_TABS/MARKETING/coupons/CouponTable.jsx
import React from 'react';
import { Edit2, Trash2, Power, Calendar, Users, Tag, IndianRupeeIcon } from 'lucide-react';
import { format } from 'date-fns';

const CouponTable = ({ coupons, isLoading, onEdit, onDelete, onToggleStatus }) => {
    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-500">Loading coupons...</p>
                </div>
            </div>
        );
    }

    if (coupons.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-8 text-center">
                    <Tag className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No coupons found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first coupon.</p>
                </div>
            </div>
        );
    }

    const getDiscountBadge = (coupon) => {
        if (coupon.discountType === 'percentage') {
            return `${coupon.discountValue}% OFF`;
        }
        return `₹${coupon.discountValue} OFF`;
    };

    const isExpired = (expiryDate) => new Date(expiryDate) < new Date();

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coupon</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Order</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Till</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {coupons.map((coupon) => (
                            <tr key={coupon._id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div>
                                        <div className="font-medium text-gray-900">{coupon.code}</div>
                                        <div className="text-sm text-gray-500">{coupon.name}</div>
                                        {coupon.description && (
                                            <div className="text-xs text-gray-400 mt-1">{coupon.description}</div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${coupon.discountType === 'percentage' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                        <IndianRupeeIcon size={12} />
                                        {getDiscountBadge(coupon)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {coupon.minOrderValue > 0 ? `₹${coupon.minOrderValue}` : 'No min'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`text-sm ${isExpired(coupon.expiryDate) ? 'text-red-600' : 'text-gray-600'}`}>
                                        {format(new Date(coupon.expiryDate), 'dd MMM yyyy')}
                                    </div>
                                    {isExpired(coupon.expiryDate) && (
                                        <div className="text-xs text-red-500">Expired</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {coupon.usageLimit ? `${coupon.usedCount}/${coupon.usageLimit}` : `${coupon.usedCount} uses`}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => onToggleStatus(coupon._id, coupon.isActive)}
                                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${
                                            coupon.isActive && !isExpired(coupon.expiryDate)
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        <Power size={10} />
                                        {coupon.isActive && !isExpired(coupon.expiryDate) ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        onClick={() => onEdit(coupon)}
                                        className="text-blue-600 hover:text-blue-800 cursor-pointer"
                                        title="Edit"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(coupon._id)}
                                        className="text-red-600 hover:text-red-800 cursor-pointer"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CouponTable;