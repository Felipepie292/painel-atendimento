import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'painel_token';

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [authRequired, setAuthRequired] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if auth is required on mount
  useEffect(() => {
    async function check() {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/auth/verify', { headers });
        const data = await res.json();

        if (data.auth_required === false) {
          setAuthRequired(false);
        } else if (res.ok && data.valid) {
          setAuthRequired(true);
        } else {
          setAuthRequired(true);
          setToken(null);
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        setAuthRequired(false);
      } finally {
        setLoading(false);
      }
    }
    void check();
  }, [token]);

  const login = useCallback(async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.auth_required === false) {
        setAuthRequired(false);
        return true;
      }
      setToken(data.token);
      localStorage.setItem(TOKEN_KEY, data.token);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore */ }
    }
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  const isAuthenticated = authRequired === false || (authRequired === true && token !== null);

  return { token, isAuthenticated, authRequired, loading, login, logout };
}

/**
 * Returns auth headers for fetch requests.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}
