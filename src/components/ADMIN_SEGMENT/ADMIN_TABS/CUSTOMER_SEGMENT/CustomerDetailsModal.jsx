import React, { useEffect, useCallback } from 'react';
import { useGetUserByIdQuery } from '../../ADMIN_REDUX_MANAGEMENT/userAnalyticsApi';
import { DateTimeCell } from './adminDateTime';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const DetailRow = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-100 last:border-0">
    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide sm:w-36 flex-shrink-0">
      {label}
    </dt>
    <dd className="text-sm text-gray-900 flex-1">{children}</dd>
  </div>
);

const CustomerDetailsModal = ({
  isOpen,
  onClose,
  userId = null,
  initialUser = null,
  onViewCart,
}) => {
  const shouldFetch = isOpen && !!userId;

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = useGetUserByIdQuery(userId, { skip: !shouldFetch });

  const user = response?.data?.user || initialUser;
  const cart = response?.data?.cart;
  const wishlist = response?.data?.wishlist;
  const cartItemCount = cart?.itemCount ?? cart?.items?.length ?? initialUser?.cartItemsCount ?? 0;
  const wishlistCount =
    wishlist?.products?.length ?? initialUser?.wishlistCount ?? 0;

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const isVerified = user?.isEmailVerified || user?.isPhoneVerified || user?.isVerified;
  const displayName = user?.name || 'Customer';

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-details-title"
          className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
            <h3 id="customer-details-title" className="text-lg font-semibold text-gray-900">
              Customer Details
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close customer details"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {isLoading && !user ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500">Loading customer details...</p>
              </div>
            ) : error && !user ? (
              <div className="text-center py-12">
                <p className="text-red-600 font-medium">Failed to load customer details</p>
                <p className="text-sm text-gray-500 mt-1">
                  {error?.data?.message || 'Please try again later'}
                </p>
              </div>
            ) : (
              <>
                {isFetching && !isLoading && (
                  <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-center mb-4">
                    Refreshing...
                  </div>
                )}

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                    {displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-gray-900 truncate">{displayName}</p>
                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </div>

                <dl>
                  <DetailRow label="Email">
                    {user?.email || <span className="text-gray-400">Not provided</span>}
                  </DetailRow>
                  <DetailRow label="Phone">
                    {user?.phone || <span className="text-gray-400">Not provided</span>}
                  </DetailRow>
                  <DetailRow label="Role">
                    <span className="capitalize">{user?.role || 'user'}</span>
                  </DetailRow>
                  <DetailRow label="Status">
                    <span className="capitalize">{user?.status || 'active'}</span>
                  </DetailRow>
                  <DetailRow label="Joined">
                    <DateTimeCell iso={user?.createdAt} />
                  </DetailRow>
                  <DetailRow label="Last active">
                    <DateTimeCell iso={user?.updatedAt || user?.lastActive} />
                  </DetailRow>
                  <DetailRow label="Cart">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium text-purple-600">
                        {cartItemCount} item{cartItemCount !== 1 ? 's' : ''}
                      </span>
                      {cart?.totalAmount > 0 && (
                        <span className="text-gray-600">· {formatCurrency(cart.totalAmount)}</span>
                      )}
                      {cartItemCount > 0 && onViewCart && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onViewCart(userId);
                          }}
                          className="text-xs font-medium text-purple-600 hover:text-purple-800 underline"
                        >
                          View cart
                        </button>
                      )}
                    </div>
                  </DetailRow>
                  <DetailRow label="Wishlist">
                    <span className="font-medium text-pink-600">
                      {wishlistCount} item{wishlistCount !== 1 ? 's' : ''}
                    </span>
                  </DetailRow>
                  {user?.registrationMethod && (
                    <DetailRow label="Registered via">
                      <span className="capitalize">{user.registrationMethod}</span>
                    </DetailRow>
                  )}
                </dl>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsModal;
