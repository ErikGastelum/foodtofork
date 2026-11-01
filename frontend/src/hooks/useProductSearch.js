// Debounced product autocomplete for the manual-add screen (owner: Jonathan).
//
//   const { results, loading, error } = useProductSearch(text);
//
// Waits 300 ms after the user stops typing, needs at least 2 characters, and
// cancels the previous request when the text changes, as API_CONTRACT asks.

import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function useProductSearch(query, { limit = 8, delay = 300 } = {}) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const found = await api.searchProducts(q, { limit, signal: controller.signal });
        setResults(found);
        setError(null);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setResults([]);
        setError(err.message);
      }
      setLoading(false);
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, limit, delay]);

  return { results, loading, error };
}
