/** Coalesce line-item edits before building and serializing the full document payload. */
export function createPreviewChangeScheduler() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(timeout);
    timeout = undefined;
  };
  return {
    cancel,
    schedule(callback: () => void, fieldName?: string) {
      cancel();
      if (fieldName === "items" || fieldName?.startsWith("items.")) {
        timeout = setTimeout(() => {
          timeout = undefined;
          callback();
        }, 120);
      } else {
        // Customer and fiscal settings also drive surrounding UI; keep them immediate.
        callback();
      }
    },
  };
}
