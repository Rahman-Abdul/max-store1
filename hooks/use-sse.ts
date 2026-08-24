"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

interface SSEEvent {
  type: string;
  title: string;
  message: string;
  data?: any;
  shopId?: string;
}

interface UseSSEOptions {
  shopId?: string;
  onEvent?: (event: SSEEvent) => void;
  showToasts?: boolean;
}

export function useSSE({ shopId, onEvent, showToasts = true }: UseSSEOptions = {}) {
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    const url = shopId ? `/api/pusher?shopId=${shopId}` : "/api/pusher";
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: SSEEvent = JSON.parse(e.data);
        onEvent?.(event);

        if (showToasts) {
          switch (event.type) {
            case "LOW_STOCK":
              toast.warning(event.title, { description: event.message });
              break;
            case "NEW_SALE":
              toast.success(event.title, { description: event.message });
              break;
            case "REFUND":
              toast.info(event.title, { description: event.message });
              break;
            case "EXPENSE_APPROVED":
              toast.success(event.title, { description: event.message });
              break;
            default:
              toast.info(event.title, { description: event.message });
          }
        }
      } catch {
        // Ignore parse errors for keepalive pings
      }
    };

    es.onerror = () => {
      es.close();
      // Reconnect after 5 seconds
      setTimeout(connect, 5000);
    };
  }, [shopId, onEvent, showToasts]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
    };
  }, [connect]);
}
