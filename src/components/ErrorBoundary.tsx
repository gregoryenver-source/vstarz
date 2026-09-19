import { Button } from "@/components/ui/button";
import React from "react";

/**
 * Section-level error boundary. Catches render errors inside a slice of the
 * page (e.g. a widget calling a missing backend function) so the rest of the
 * page still renders instead of the whole app blanking.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: Error) {
    console.warn("[ErrorBoundary] section failed:", err?.message ?? err);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              This section is temporarily unavailable.
            </p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
