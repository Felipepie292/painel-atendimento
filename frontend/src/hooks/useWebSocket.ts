import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message, WSEvent } from '../types';

interface UseWebSocketReturn {
  connected: boolean;
  lastMessage: Message | null;
}

/**
 * Custom hook that manages a WebSocket connection with automatic reconnection.
 * Connects to the /ws endpoint via the Vite dev proxy.
 */
export function useWebSocket(): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const getBackoffDelay = useCallback((attempt: number): number => {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    return delay;
  }, []);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) return;
      setConnected(true);
      retryCountRef.current = 0;
    };

    ws.onmessage = (event: MessageEvent) => {
      if (unmountedRef.current) return;

      try {
        const parsed = JSON.parse(event.data as string) as WSEvent;

        if (parsed.type === 'new_message') {
          setLastMessage(parsed.data);
        }
        // 'connected' event is handled implicitly via onopen
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setConnected(false);
      wsRef.current = null;

      const delay = getBackoffDelay(retryCountRef.current);
      retryCountRef.current += 1;

      retryTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose will fire after onerror, so reconnection is handled there
      ws.close();
    };
  }, [getBackoffDelay]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { connected, lastMessage };
}
