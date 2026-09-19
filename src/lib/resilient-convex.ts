import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";

/**
 * A Convex client whose WebSocket failures are silently ignored.
 *
 * Some hosts block Convex's WebSocket endpoints, and a failed WS turns every
 * query into an uncaught rejection that crashes React. Queries will fall back
 * to their static/default data (the app ships fallback content), so the UI
 * still renders even without a live backend.
 */
export class ResilientConvexClient extends ConvexReactClient {
  constructor(address: string, options?: { verbose?: boolean }) {
    super(address, options);
    // Suppress unhandled promise rejections originating from the client
    // (query subscription loops, etc.) so they don't crash the app.
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason as { message?: string } | undefined;
        if (
          reason instanceof Error &&
          /WebSocket|convex|Could not connect/i.test(reason.message)
        ) {
          event.preventDefault();
          console.warn("[convex] suppressed connection error:", reason.message);
        }
      });
    }
  }
}
