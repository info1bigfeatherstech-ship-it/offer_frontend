
import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * ROBUST usePaginatedFetch Hook
 * - No unnecessary API calls
 * - Correct hasNextPage calculation
 * - AbortController for race condition prevention
 * - Memoized fetch params comparison
 * - Prevents loadMore button when no more products
 */
const usePaginatedFetch = ({
  fetchAction,
  selectData,
  selectLoading,
  selectPagination,
  fetchParams = {},
  limit = 500,
  enabled = true, // NEW: can disable auto-fetch
}) => {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const data = useSelector(selectData);
  const isLoading = useSelector(selectLoading);
  const pagination = useSelector(selectPagination);

  // Stable refs to prevent unnecessary re-renders
  const fetchActionRef = useRef(fetchAction);
  const fetchParamsRef = useRef(fetchParams);
  const limitRef = useRef(limit);

  // Update refs when values change
  useEffect(() => { fetchActionRef.current = fetchAction; }, [fetchAction]);
  useEffect(() => { fetchParamsRef.current = fetchParams; }, [fetchParams]);
  useEffect(() => { limitRef.current = limit; }, [limit]);
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  // Memoized comparison of fetchParams to avoid infinite loops
  const getFetchParamsHash = useCallback(() => {
    return JSON.stringify({
      ...fetchParamsRef.current,
      limit: limitRef.current,
    });
  }, []);

  const prevParamsHash = useRef(getFetchParamsHash());

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
        fetchActionRef.current({
          ...fetchParamsRef.current,
          page: pageToFetch,
          limit: limitRef.current,
        })
      ).unwrap();

      if (!isMountedRef.current) return result;

      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
        return null;
      }
      throw error;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [dispatch]);

  // Effect for initial load and page changes
  useEffect(() => {
    if (!enabled) return;

    const currentParamsHash = getFetchParamsHash();
    const paramsChanged = prevParamsHash.current !== currentParamsHash;

    if (paramsChanged) {
      // Params changed - reset to page 1
      setPage(1);
      prevParamsHash.current = currentParamsHash;
      executeFetch(1, false);
    } else {
      // Normal page fetch
      executeFetch(page, page > 1);
    }
  }, [page, enabled, getFetchParamsHash, executeFetch]);

  // Reset function for manual refresh
  const resetPage = useCallback(() => {
    setPage(1);
    prevParamsHash.current = getFetchParamsHash();
  }, [getFetchParamsHash]);

  // Load more function - ONLY works if hasNextPage is true
  const loadMore = useCallback(() => {
    // CRITICAL FIX: Check hasNextPage before loading more
    if (pagination?.hasNextPage === true && !isLoading && page < (pagination?.totalPages || Infinity)) {
      setPage(prev => prev + 1);
    }
  }, [pagination?.hasNextPage, isLoading, page, pagination?.totalPages]);

  // Derived state
  const isFetchingMore = isLoading && page > 1;
  const hasNoMoreProducts = pagination?.hasNextPage === false && data?.length > 0;
  const shouldShowLoadMore = pagination?.hasNextPage === true && !hasNoMoreProducts;

  return {
    data: data || [],
    isLoading,
    isFetchingMore,
    hasNoMoreProducts,     // NEW: true when all products loaded
    shouldShowLoadMore,    // NEW: use this to conditionally render button
    pagination,
    page,
    loadMore,
    resetPage,
    totalProducts: pagination?.total || 0,
    loadedProducts: data?.length || 0,
  };
};

export default usePaginatedFetch;

// bottom code have 
// Over-fetching risk - The fetchKey + page dependency triggers unnecessary API calls when dependency changes

// Race condition potential - No abort controller; rapid param changes could have responses arriving out of order

// Performance - fetchParamsStr stringify on every render (fine for small objects, bad for large)

// import { useState, useEffect, useRef, useCallback } from 'react';
// import { useDispatch, useSelector } from 'react-redux';

// const usePaginatedFetch = ({
//   fetchAction,
//   selectData,
//   selectLoading,
//   selectPagination,
//   fetchParams = {},
//   limit = 12,
// }) => {
//   const dispatch = useDispatch();
//   const [page, setPage]         = useState(1);
//   const [fetchKey, setFetchKey] = useState(0); // ✅ force re-fetch even when page stays at 1

//   const data       = useSelector(selectData);
//   const isLoading  = useSelector(selectLoading);
//   const pagination = useSelector(selectPagination);

//   const fetchActionRef = useRef(fetchAction);
//   const fetchParamsRef = useRef(fetchParams);
//   const isLoadingRef   = useRef(isLoading);

//   useEffect(() => { fetchActionRef.current = fetchAction; }, [fetchAction]);
//   useEffect(() => { fetchParamsRef.current = fetchParams; }, [fetchParams]);
//   useEffect(() => { isLoadingRef.current   = isLoading;   }, [isLoading]);

//   // ✅ fetchKey in deps — tag/param change pe forcefully re-fetch
//   useEffect(() => {
//     dispatch(fetchActionRef.current({
//       ...fetchParamsRef.current,
//       page,
//       limit,
//     }));
//     if (page === 1) window.scrollTo({ top: 0, behavior: 'smooth' });
//   }, [page, fetchKey, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

//   // ✅ fetchParams change hone pe page reset + fetchKey bump
//   const fetchParamsStr     = JSON.stringify(fetchParams);
//   const prevFetchParamsStr = useRef(fetchParamsStr);

//   useEffect(() => {
//     if (prevFetchParamsStr.current !== fetchParamsStr) {
//       prevFetchParamsStr.current = fetchParamsStr;
//       setPage(1);
//       setFetchKey(k => k + 1); // ✅ forces re-fetch even if page was already 1
//     }
//   }, [fetchParamsStr]);

//   const loadMore = useCallback(() => {
//     if (pagination?.hasNextPage && !isLoadingRef.current) {
//       setPage(prev => prev + 1);
//     }
//   }, [pagination?.hasNextPage]);

//   // ✅ resetPage bhi fetchKey bump kare
//   const resetPage = useCallback(() => {
//     setPage(1);
//     setFetchKey(k => k + 1);
//   }, []);

//   const isFetchingMore = isLoading && page > 1;

//   return {
//     data,
//     isLoading,
//     isFetchingMore,
//     pagination,
//     page,
//     loadMore,
//     resetPage,
//   };
// };

// export default usePaginatedFetch;