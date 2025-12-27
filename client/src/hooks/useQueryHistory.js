import { useState, useEffect } from 'react';

/**
 * Custom hook for managing query history
 * Stores queries in localStorage and provides history management
 */
export function useQueryHistory(maxHistory = 50) {
  const [history, setHistory] = useState([]);
  const STORAGE_KEY = 'social-command-center-query-history';

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load query history:', error);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save query history:', error);
    }
  }, [history]);

  /**
   * Add a query to history
   * @param {string} query - The query string
   */
  const addQuery = (query) => {
    if (!query || !query.trim()) return;

    const trimmedQuery = query.trim();

    setHistory(prev => {
      // Remove duplicates
      const filtered = prev.filter(item => item.query !== trimmedQuery);

      // Add new query at the beginning
      const newHistory = [
        {
          query: trimmedQuery,
          timestamp: new Date().toISOString(),
          id: Date.now()
        },
        ...filtered
      ];

      // Limit history size
      return newHistory.slice(0, maxHistory);
    });
  };

  /**
   * Remove a specific query from history
   * @param {number} id - Query ID to remove
   */
  const removeQuery = (id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  /**
   * Clear all history
   */
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  /**
   * Get recent queries (last N)
   * @param {number} count - Number of queries to return
   * @returns {Array} Recent queries
   */
  const getRecentQueries = (count = 10) => {
    return history.slice(0, count);
  };

  /**
   * Search history
   * @param {string} searchTerm - Term to search for
   * @returns {Array} Matching queries
   */
  const searchHistory = (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return history;

    const lower = searchTerm.toLowerCase();
    return history.filter(item =>
      item.query.toLowerCase().includes(lower)
    );
  };

  /**
   * Get query suggestions based on partial input
   * @param {string} partial - Partial query string
   * @param {number} limit - Max suggestions to return
   * @returns {Array} Suggested queries
   */
  const getSuggestions = (partial, limit = 5) => {
    if (!partial || partial.length < 2) return [];

    const lower = partial.toLowerCase();
    return history
      .filter(item => item.query.toLowerCase().startsWith(lower))
      .slice(0, limit);
  };

  return {
    history,
    addQuery,
    removeQuery,
    clearHistory,
    getRecentQueries,
    searchHistory,
    getSuggestions
  };
}

export default useQueryHistory;
