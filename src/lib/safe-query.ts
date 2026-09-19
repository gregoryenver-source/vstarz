import { useConvex } from "convex/react";
import type {
  FunctionReference,
  FunctionArgs,
  FunctionReturnType,
} from "convex/server";
import type { OptionalRestArgsOrSkip } from "convex/react";
import { useEffect, useRef, useState } from "react";

type QueryRef = FunctionReference<"query">;

/**
 * Drop-in replacement for `useQuery` from "convex/react" that never throws.
 *
 * `useQuery` throws during render when the backend function is missing or
 * errors (e.g. a stale cloud deployment), which unmounts the whole React
 * tree. This hook keeps the same live-subscription behaviour but swallows
 * server errors and returns `undefined` instead, so pages render their
 * empty/default states and recover automatically once the backend catches up.
 */
export function useSafeQuery<Query extends QueryRef>(
  query: Query,
  ...args: OptionalRestArgsOrSkip<Query>
): FunctionReturnType<Query> | undefined {
  const client = useConvex();
  const skip = args[0] === "skip";
  const callArgs = (args[0] ?? {}) as FunctionArgs<Query>;

  const [data, setData] = useState<FunctionReturnType<Query> | undefined>(
    undefined,
  );
  const erroredRef = useRef(false);

  // Serialize the query identity so the effect re-runs on query/args change.
  const key = (() => {
    try {
      return JSON.stringify([query, callArgs]);
    } catch {
      return String(Math.random());
    }
  })();

  useEffect(() => {
    if (skip) {
      setData(undefined);
      return;
    }
    let alive = true;

    let unsubscribe: (() => void) | undefined = undefined;
    try {
      const watch = (
        client as unknown as {
          watch: (
            q: QueryRef,
            a: FunctionArgs<Query>,
          ) => {
            onUpdate: (cb: () => void) => () => void;
            currentResults: () => FunctionReturnType<Query>;
          };
        }
      ).watch(query, callArgs);

      const read = () => {
        if (!alive) return;
        try {
          const value = watch.currentResults();
          erroredRef.current = false;
          setData(value);
        } catch (err) {
          // The watch throws from currentResults() when the server rejects
          // the query (missing function, auth failure, etc.). Render the
          // default state instead of propagating the error into React.
          if (!erroredRef.current) {
            erroredRef.current = true;
            console.warn(
              "[safe-query] backend query unavailable, rendering default state:",
              (err as Error)?.message ?? err,
            );
          }
          setData(undefined);
        }
      };

      unsubscribe = watch.onUpdate(read);
      read();
    } catch (err) {
      console.warn(
        "[safe-query] could not subscribe:",
        (err as Error)?.message ?? err,
      );
      setData(undefined);
    }

    return () => {
      alive = false;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key, skip]);

  return data;
}
