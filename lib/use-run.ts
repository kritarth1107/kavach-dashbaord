import { useEffect } from "react";

/**
 * Run a loader whenever it changes (its useCallback deps), one tick after render, so its "loading" state update is not
 * a synchronous setState inside an effect (react-hooks/set-state-in-effect: cascading renders).
 */
export function useRun(run: () => unknown) {
  useEffect(() => {
    const t = setTimeout(() => void run(), 0);
    return () => clearTimeout(t);
  }, [run]);
}
