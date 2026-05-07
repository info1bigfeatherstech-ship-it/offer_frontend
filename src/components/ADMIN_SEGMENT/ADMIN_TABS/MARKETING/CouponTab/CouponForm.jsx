// ADMIN_TABS/MARKETING/coupons/CouponForm.jsx
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const CouponForm = ({ initialData, onSubmit, onCancel, isLoading }) => {
    const [formData, setFormData] = useState({
        code: initialData?.code || '',
        name: initialData?.name || '',
        description: initialData?.description || '',
        discountType: initialData?.discountType || 'percentage',
        discountValue: initialData?.discountValue || '',
        maxDiscountAmount: initialData?.maxDiscountAmount || '',
        minOrderValue: initialData?.minOrderValue || 0,
        applicableUsers: initialData?.applicableUsers || ['user', 'wholesaler'],
        usageLimit: initialData?.usageLimit || '',
        perUserLimit: initialData?.perUserLimit || 1,
        expiryDate: initialData?.expiryDate ? new Date(initialData.expiryDate) : new Date(),
        isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    });

    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};
        if (!formData.code.trim()) newErrors.code = 'Coupon code is required';
        if (!formData.name.trim()) newErrors.name = 'Coupon name is required';
        if (!formData.discountValue) newErrors.discountValue = 'Discount value is required';
        if (formData.discountValue <= 0) newErrors.discountValue = 'Discount value must be greater than 0';
        if (formData.discountType === 'percentage' && formData.discountValue > 100) {
            newErrors.discountValue = 'Percentage cannot exceed 100';
        }
        if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
        if (formData.expiryDate && new Date(formData.expiryDate) <= new Date()) {
            newErrors.expiryDate = 'Expiry date must be in the future';
        }
        if (formData.usageLimit && formData.usageLimit < 0) {
            newErrors.usageLimit = 'Usage limit cannot be negative';
        }
        if (formData.perUserLimit < 1) {
            newErrors.perUserLimit = 'Per user limit must be at least 1';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            const submitData = {
                ...formData,
                discountValue: Number(formData.discountValue),
                maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
                minOrderValue: Number(formData.minOrderValue),
                usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
                perUserLimit: Number(formData.perUserLimit),
            };
            onSubmit(submitData);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Code and Name */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Coupon Code <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                        placeholder="WELCOME20"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.code ? 'border-red-500' : 'border-gray-300'}`}
                        disabled={isLoading}
                    />
                    {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Coupon Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Welcome Discount"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                        disabled={isLoading}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows="2"
                    placeholder="Brief description of this coupon..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                    <select
                        value={formData.discountType}
                        onChange={(e) => handleChange('discountType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount Value <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        value={formData.discountValue}
                        onChange={(e) => handleChange('discountValue', e.target.value)}
                        placeholder={formData.discountType === 'percentage' ? '10' : '100'}
                        className={`w-full px-3 py-2 border rounded-lg ${errors.discountValue ? 'border-red-500' : 'border-gray-300'}`}
                        disabled={isLoading}
                    />
                    {errors.discountValue && <p className="text-red-500 text-xs mt-1">{errors.discountValue}</p>}
                </div>
            </div>

            {/* Max Discount & Min Order */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Discount Amount (For % only)
                    </label>
                    <input
                        type="number"
                        value={formData.maxDiscountAmount}
                        onChange={(e) => handleChange('maxDiscountAmount', e.target.value)}
                        placeholder="Leave empty for no limit"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={isLoading || formData.discountType !== 'percentage'}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Value</label>
                    <input
                        type="number"
                        value={formData.minOrderValue}
                        onChange={(e) => handleChange('minOrderValue', e.target.value)}
                        placeholder="0 for no minimum"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={isLoading}
                    />
                </div>
            </div>

            {/* Applicable Users */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applicable For</label>
                <div className="flex gap-4">
                    {['user', 'wholesaler'].map((type) => (
                        <label key={type} className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.applicableUsers.includes(type)}
                                onChange={(e) => {
                                    const newUsers = e.target.checked
                                        ? [...formData.applicableUsers, type]
                                        : formData.applicableUsers.filter(u => u !== type);
                                    handleChange('applicableUsers', newUsers);
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                            <span className="text-sm text-gray-700 capitalize">{type}s</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Usage Limits */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Usage Limit</label>
                    <input
                        type="number"
                        value={formData.usageLimit}
                        onChange={(e) => handleChange('usageLimit', e.target.value)}
                        placeholder="Leave empty for unlimited"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={isLoading}
                    />
                    {errors.usageLimit && <p className="text-red-500 text-xs mt-1">{errors.usageLimit}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Per User Limit</label>
                    <input
                        type="number"
                        value={formData.perUserLimit}
                        onChange={(e) => handleChange('perUserLimit', e.target.value)}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={isLoading}
                    />
                    {errors.perUserLimit && <p className="text-red-500 text-xs mt-1">{errors.perUserLimit}</p>}
                </div>
            </div>

            {/* Expiry Date */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                    selected={formData.expiryDate}
                    onChange={(date) => handleChange('expiryDate', date)}
                    minDate={new Date()}
                    dateFormat="dd/MM/yyyy"
                    className={`w-full px-3 py-2 border rounded-lg ${errors.expiryDate ? 'border-red-500' : 'border-gray-300'}`}
                    disabled={isLoading}
                />
                {errors.expiryDate && <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>}
            </div>

            {/* Active Status */}
            <div>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => handleChange('isActive', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <span className="text-sm text-gray-700">Active (immediately available for use)</span>
                </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                    disabled={isLoading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Saving...' : (initialData ? 'Update Coupon' : 'Create Coupon')}
                </button>
            </div>
        </form>
    );
};

export default CouponForm;