import { useState, useEffect, useCallback, useRef } from 'react';

const TOKEN_KEY = 'painel_token';

/** Inactivity timeout in milliseconds (5 minutes). */
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export function useAuth() {
  // Use sessionStorage — token is lost when tab/browser closes
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [authRequired, setAuthRequired] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Clear session and force re-login. */
  const forceLogout = useCallback(() => {
    setToken(null);
    sessionStorage.removeItem(TOKEN_KEY);
    setAuthRequired(true);
  }, []);

  // Inactivity timer — resets on user interaction, logs out after IDLE_TIMEOUT_MS
  useEffect(() => {
    if (!token) return;

    function resetTimer() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        forceLogout();
      }, IDLE_TIMEOUT_MS);
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    for (const evt of events) {
      window.addEventListener(evt, resetTimer, { passive: true });
    }
    resetTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      for (const evt of events) {
        window.removeEventListener(evt, resetTimer);
      }
    };
  }, [token, forceLogout]);

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
          sessionStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        // If the API is unreachable, assume auth is required for safety
        setAuthRequired(true);
        setToken(null);
        sessionStorage.removeItem(TOKEN_KEY);
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
      sessionStorage.setItem(TOKEN_KEY, data.token);
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
    sessionStorage.removeItem(TOKEN_KEY);
  }, [token]);

  const isAuthenticated = authRequired === false || (authRequired === true && token !== null);

  return { token, isAuthenticated, authRequired, loading, login, logout };
}

/**
 * Returns auth headers for fetch requests.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}
