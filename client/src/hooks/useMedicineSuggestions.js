import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

let cachedMedicines = null;
let lastFetchTime = 0;
const CACHE_TTL = 30000; // 30 seconds

export function useMedicineSuggestions() {
  const [medicines, setMedicines] = useState(cachedMedicines || []);
  const [loading, setLoading] = useState(!cachedMedicines);

  const fetchMedicines = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedMedicines && now - lastFetchTime < CACHE_TTL) {
      setMedicines(cachedMedicines);
      setLoading(false);
      return cachedMedicines;
    }

    try {
      setLoading(true);
      const res = await api.get('/medicines');
      const list = res.data?.medicines || [];
      cachedMedicines = list;
      lastFetchTime = Date.now();
      setMedicines(list);
      return list;
    } catch (err) {
      console.error('Failed to load medicine suggestions:', err);
      return cachedMedicines || [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const refreshMedicines = useCallback(() => {
    return fetchMedicines(true);
  }, [fetchMedicines]);

  return {
    medicines,
    loading,
    refreshMedicines,
  };
}
