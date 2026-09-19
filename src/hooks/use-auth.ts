import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useSafeQuery } from "@/lib/safe-query";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  // Safe query: a missing users module on a stale backend must not crash auth.
  const user = useSafeQuery(api.users.currentUser);
  const { signIn, signOut } = useAuthActions();

  // Loading only while the auth client itself resolves. The user profile
  // query is best-effort (useSafeQuery): if the backend is unreachable or a
  // function is missing, we must not block on it forever — signed-out users
  // should still be redirected to /auth instead of spinning indefinitely.
  const isLoading = isAuthLoading || (isAuthenticated && user === undefined);

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
