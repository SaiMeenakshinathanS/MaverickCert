// ─── Reusable API hooks for Maverick Certify ─────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getBatches,
  getReportsOverview,
  getReportsBatches,
  getReportsLinkedIn,
  getReportsTrends,
  getReportsEmailStats,
  getCertificates,
  getEmployees,
  getUsers,
  getUserCount,
  getRecentActivities,
} from "../services/api";

/**
 * Generic async data fetcher hook.
 * @param {Function} fetchFn - async function returning data
 * @param {any[]} deps - dependency array
 * @param {number} pollInterval - ms interval for auto-refresh (0 = disabled)
 */
export function useAsyncData(fetchFn, deps = [], pollInterval = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const execute = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    setLoading(true);
    execute();

    if (pollInterval > 0) {
      timerRef.current = setInterval(execute, pollInterval);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [execute, pollInterval]);

  return { data, loading, error, refetch: execute };
}

// ── Domain-specific hooks ─────────────────────────────────────────────────────

export function useBatches(pollInterval = 0) {
  return useAsyncData(getBatches, [], pollInterval);
}

export function useReportsOverview(pollInterval = 0) {
  return useAsyncData(getReportsOverview, [], pollInterval);
}

export function useReportsBatches() {
  return useAsyncData(getReportsBatches, []);
}

export function useReportsLinkedIn() {
  return useAsyncData(getReportsLinkedIn, []);
}

export function useReportsTrends() {
  return useAsyncData(getReportsTrends, []);
}

export function useReportsEmailStats() {
  return useAsyncData(getReportsEmailStats, []);
}

export function useCertificates(filters = {}) {
  const key = JSON.stringify(filters);
  return useAsyncData(() => getCertificates(filters), [key]);
}

export function useEmployees(filters = {}, pollInterval = 0) {
  const key = JSON.stringify(filters);
  return useAsyncData(() => getEmployees(filters), [key], pollInterval);
}

export function useUsers(pollInterval = 0) {
  return useAsyncData(getUsers, [], pollInterval);
}

export function useUserCount(pollInterval = 0) {
  return useAsyncData(getUserCount, [], pollInterval);
}

export function useRecentActivities(pollInterval = 0) {
  return useAsyncData(getRecentActivities, [], pollInterval);
}
