
import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * ROBUST usePaginatedFetch Hook
 * - Page advances only after a successful fetch (no skipped pages on 429/errors)
 * - Load-more lock prevents double-clicks from stacking requests
 * - AbortController for race condition prevention
 * - Skeleton/loading clears when Redux loading clears (including failures)
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
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadMoreLockRef = useRef(false);
  const pageRef = useRef(1);

  const data = useSelector(selectData);
  const isLoading = useSelector(selectLoading);
  const pagination = useSelector(selectPagination);

  const prevFetchParamsRef = useRef();

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const executeFetch = useCallback(async (pageToFetch) => {
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
      if (error?.aborted) return null;
      if (!isMountedRef.current) return null;
      throw error;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [dispatch, fetchAction, fetchParams, limit]);

  // Params change → reset to page 1 and refetch
  useEffect(() => {
    if (!enabled) return;

    const currentParamsStr = JSON.stringify(fetchParams);
    const prevParamsStr = prevFetchParamsRef.current
      ? JSON.stringify(prevFetchParamsRef.current)
      : null;

    if (prevParamsStr !== currentParamsStr) {
      setPage(1);
      pageRef.current = 1;
      setIsFetchingMore(false);
      loadMoreLockRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      executeFetch(1).catch(() => {
        /* Redux rejected handler owns error state */
      });
    }

    prevFetchParamsRef.current = fetchParams;
  }, [fetchParams, enabled, executeFetch]);

  const resetPage = useCallback(() => {
    setPage(1);
    pageRef.current = 1;
    setIsFetchingMore(false);
    loadMoreLockRef.current = false;
    prevFetchParamsRef.current = null;
  }, []);

  const loadMore = useCallback(async () => {
    if (!enabled) return;
    if (loadMoreLockRef.current || isLoading || isFetchingMore) return;
    if (pagination?.hasNextPage !== true) return;

    const nextPage = pageRef.current + 1;
    if (pagination?.totalPages != null && nextPage > pagination.totalPages) return;

    loadMoreLockRef.current = true;
    setIsFetchingMore(true);
    try {
      await executeFetch(nextPage);
      if (!isMountedRef.current) return;
      setPage(nextPage);
      pageRef.current = nextPage;
    } catch {
      // Stay on current page so the failed page can be retried
    } finally {
      if (isMountedRef.current) setIsFetchingMore(false);
      loadMoreLockRef.current = false;
    }
  }, [enabled, isLoading, isFetchingMore, pagination?.hasNextPage, pagination?.totalPages, executeFetch]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Local flag is set for the whole load-more attempt and cleared in finally (incl. 429).
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
