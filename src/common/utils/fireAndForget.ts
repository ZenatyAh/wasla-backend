/**
 * Schedules async work outside the request/response cycle. Failures are logged
 * and never propagated to the caller.
 */
export const fireAndForget = (
  label: string,
  run: () => Promise<unknown>,
): void => {
  void run().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[${label}] background task failed: ${message}`);
  });
};
