import { Component, type ReactNode } from "react";

/**
 * Contains render-time failures (e.g. a Convex query throwing) to the wrapped
 * subtree, so one broken widget can never blank an entire page.
 */
export class QueryErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: Error) {
    console.warn("[VStarz] widget error contained:", err.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? null
      );
    }
    return this.props.children;
  }
}
