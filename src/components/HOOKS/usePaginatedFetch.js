
import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * ROBUST usePaginatedFetch Hook
 * - No unnecessary API calls
 * - Correct hasNextPage calculation
 * - AbortController for race condition prevention
 * - Memoized fetch params comparison
 * - Prevents loadMore button when no more products
 * - FIXED: Properly re-fetches when fetchParams changes
 */
const usePaginatedFetch = ({
  fetchAction,
  selectData,
  selectLoading,
  selectPagination,
  fetchParams = {},
  limit = 500,
  enabled = true,
}) => {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const data = useSelector(selectData);
  const isLoading = useSelector(selectLoading);
  const pagination = useSelector(selectPagination);

  // Store previous fetchParams for comparison
  const prevFetchParamsRef = useRef();

  // Core fetch function with abort support
  const executeFetch = useCallback(async (pageToFetch, shouldAppend = false) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await dispatch(
        fetchAction({
          ...fetchParams,
          page: pageToFetch,
          limit: limit,
        })
      ).unwrap();

      if (!isMountedRef.current) return result;
      return result;
    } catch (error) {
      if (error?.name === 'ConditionError') return null;
      if (error?.name === 'AbortError') return null;
      if (!isMountedRef.current) return null;
      throw error;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [dispatch, fetchAction, fetchParams, limit]);

  // 🔥 CRITICAL FIX: Detect when fetchParams changes and reset everything
  useEffect(() => {
    if (!enabled) return;

    // Check if fetchParams changed
    const currentParamsStr = JSON.stringify(fetchParams);
    const prevParamsStr = prevFetchParamsRef.current ? JSON.stringify(prevFetchParamsRef.current) : null;

    if (prevParamsStr !== currentParamsStr) {
      // Params changed - reset to page 1 and refetch
      setPage(1);
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Fetch new data
      executeFetch(1, false);
    }

    // Store current params for next comparison
    prevFetchParamsRef.current = fetchParams;
  }, [fetchParams, enabled, executeFetch]);

  // Effect for page changes
  useEffect(() => {
    if (!enabled) return;
    if (page === 1) return; // Page 1 is handled by the params change effect

    executeFetch(page, true);
  }, [page, enabled, executeFetch]);

  // Reset function for manual refresh
  const resetPage = useCallback(() => {
    setPage(1);
    // Force refetch by resetting params ref
    prevFetchParamsRef.current = null;
  }, []);

  // Load more function
  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage === true && !isLoading && page < (pagination?.totalPages || Infinity)) {
      setPage(prev => prev + 1);
    }
  }, [pagination?.hasNextPage, isLoading, page, pagination?.totalPages]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Derived state
  const isFetchingMore = isLoading && page > 1;
  const hasNoMoreProducts = pagination?.hasNextPage === false && data?.length > 0;
  const shouldShowLoadMore = pagination?.hasNextPage === true && !hasNoMoreProducts;

  return {
    data: data || [],
    isLoading,
    isFetchingMore,
    hasNoMoreProducts,
    shouldShowLoadMore,
    pagination,
    page,
    loadMore,
    resetPage,
    totalProducts: pagination?.total || 0,
    loadedProducts: data?.length || 0,
  };
};

export default usePaginatedFetch;

