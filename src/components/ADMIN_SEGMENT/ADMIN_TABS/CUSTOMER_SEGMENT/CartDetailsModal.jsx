import React, { useEffect, useCallback } from 'react';
import {
  useGetCartByIdQuery,
  useGetUserByIdQuery,
} from '../../ADMIN_REDUX_MANAGEMENT/userAnalyticsApi';
import { DateTimeCell } from './adminDateTime';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const formatVariantAttributes = (attributes = []) => {
  if (!attributes.length) return null;
  return attributes
    .map((attr) => `${attr.key}: ${attr.value}`)
    .join(' · ');
};

const CartItemRow = ({ item }) => {
  const variantLabel = formatVariantAttributes(item.variantAttributes);

  return (
    <div className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:border-purple-100 transition-colors">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.productName}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-300">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 line-clamp-2">{item.productName}</h4>
        {variantLabel && (
          <p className="text-xs text-gray-500 mt-1">{variantLabel}</p>
        )}
        {(item.productCode ?? item.sku) && (
          <p className="text-xs text-gray-400 mt-0.5">
            Product code: {item.productCode ?? item.sku}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
          <span className="text-gray-600">Qty: <strong>{item.quantity}</strong></span>
          <span className="text-gray-400">×</span>
          <span className="text-gray-600">{formatCurrency(item.unitPrice)}</span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="font-bold text-purple-600">{formatCurrency(item.lineTotal)}</p>
        {item.addedAt && (
          <div className="mt-1">
            <p className="text-xs text-gray-400">Added</p>
            <DateTimeCell iso={item.addedAt} className="text-xs" />
          </div>
        )}
      </div>
    </div>
  );
};

const CartDetailsModal = ({ isOpen, onClose, cartId = null, userId = null }) => {
  const shouldFetchByCart = isOpen && !!cartId;
  const shouldFetchByUser = isOpen && !!userId && !cartId;

  const {
    data: cartResponse,
    isLoading: isCartLoading,
    isFetching: isCartFetching,
    error: cartError,
  } = useGetCartByIdQuery(cartId, { skip: !shouldFetchByCart });

  const {
    data: userResponse,
    isLoading: isUserLoading,
    isFetching: isUserFetching,
    error: userError,
  } = useGetUserByIdQuery(userId, { skip: !shouldFetchByUser });

  const cart = shouldFetchByCart
    ? cartResponse?.data
    : shouldFetchByUser
      ? userResponse?.data?.cart
      : null;

  const customer = cart?.user || userResponse?.data?.user || null;
  const isLoading = isCartLoading || isUserLoading;
  const isFetching = isCartFetching || isUserFetching;
  const error = cartError || userError;
  const items = cart?.items || [];

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
          aria-labelledby="cart-details-title"
          className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
            <div>
              <h3 id="cart-details-title" className="text-lg font-semibold text-gray-900">
                Cart Details
              </h3>
              {customer && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {customer.name} · {customer.email}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close cart details"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500">Loading cart items...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 font-medium">Failed to load cart details</p>
                <p className="text-sm text-gray-500 mt-1">
                  {error?.data?.message || 'Please try again later'}
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6M12 15v6" />
                </svg>
                <h4 className="text-lg font-medium text-gray-900">Cart is empty</h4>
                <p className="text-gray-500 mt-1">This customer has no items in their cart.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {isFetching && !isLoading && (
                  <div className="text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg text-center">
                    Refreshing...
                  </div>
                )}
                {items.map((item, index) => (
                  <CartItemRow
                    key={`${item.productId}-${item.variantId}-${index}`}
                    item={item}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cart && items.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <span>{cart.itemCount ?? items.length} item{(cart.itemCount ?? items.length) !== 1 ? 's' : ''}</span>
                {cart.updatedAt && (
                  <span className="ml-3 inline-flex items-center gap-1">
                    · Last updated
                    <DateTimeCell iso={cart.updatedAt} />
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Cart Total</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(cart.totalAmount)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDetailsModal;
