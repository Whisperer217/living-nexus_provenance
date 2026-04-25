/**
 * Living Nexus — useCommunityEvents
 * Connects to the server's SSE stream and exposes a callback-based API
 * for reacting to real-time community events (e.g., new member joined).
 *
 * Usage:
 *   useCommunityEvents({
 *     onNewMember: ({ name, joinedAt }) => { ... }
 *   });
 */

import { useEffect, useRef } from "react";

type NewMemberPayload = {
  name: string;
  joinedAt: number;
};

type CommunityEventHandlers = {
  onNewMember?: (payload: NewMemberPayload) => void;
};

export function useCommunityEvents(handlers: CommunityEventHandlers) {
  // Keep handlers in a ref so we don't need to re-subscribe on every render
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 2_000; // start at 2 s, back off up to 30 s
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      es = new EventSource("/api/sse/events", { withCredentials: true });

      es.addEventListener("connected", () => {
        // Reset backoff on successful connection
        retryDelay = 2_000;
      });

      es.addEventListener("new_member", (e: MessageEvent) => {
        try {
          const payload: NewMemberPayload = JSON.parse(e.data);
          handlersRef.current.onNewMember?.(payload);
        } catch {
          // Malformed payload — ignore
        }
      });

      es.onerror = () => {
        es?.close();
        es = null;
        if (!destroyed) {
          // Exponential backoff with a 30 s ceiling
          retryTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 1.5, 30_000);
            connect();
          }, retryDelay);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      es?.close();
    };
  }, []); // mount once — handlers are accessed via ref
}
