import type { Select } from "@base-ui/react/select";
import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * How long an orphaned event can still arrive after the popup closes. Generous enough to
 * cover the synthesized touch sequence, short enough that the guard is gone long before
 * the user could start a new interaction.
 */
const ORPHANED_EVENT_WINDOW_MS = 350;

/**
 * Only a selection closes the popup mid-gesture. An outside press or a trigger press
 * already owns the click that follows it, and dismissing with the keyboard produces none.
 */
const ORPHANING_CLOSE_REASON = "item-press";

/**
 * Keyboards and assistive technology activate controls without a pointer, so their
 * events also arrive with no preceding `pointerdown` and would otherwise look orphaned.
 *
 * Mirrors Base UI's own `isVirtualClick` (itself from react-aria), because `detail === 0`
 * alone does not identify them: a screen reader dispatches a trusted activation with an
 * empty pointer type, and TalkBack synthesizes a click reporting a button still held.
 */
function isVirtualActivation(event: MouseEvent) {
  if (event.detail === 0) {
    return true;
  }

  if ((event as PointerEvent).pointerType === "" && event.isTrusted) {
    return true;
  }

  // A genuine click always reports no buttons held by the time it is dispatched.
  return event.type === "click" && event.buttons === 1;
}

/**
 * Guards against the stray events a popup leaves behind when a selection closes it.
 *
 * A select popup covers the fields beneath its trigger, and the selection commits and
 * unmounts it while the browser is still resolving the gesture. The `mousedown` and
 * `click` dispatched afterwards then hit-test against whatever now sits under the
 * pointer — usually the next form control, so picking a payment type would open the
 * date picker below it. Base UI's own backdrop stops blocking as soon as the popup
 * starts closing, so those events have to be swallowed here.
 *
 * They are identified as orphaned rather than by input device: a deliberate interaction
 * always dispatches its own `pointerdown` first, and a keyboard-activated click carries
 * `detail === 0`. Neither is swallowed, so mouse, touch, and keyboard all stay intact.
 *
 * Returns props to spread onto a popup root that reports `onOpenChange`:
 *
 * ```tsx
 * const orphanedClickGuard = useOrphanedClickGuard();
 * <Select {...orphanedClickGuard} onValueChange={field.onChange} />
 * ```
 */
export function useOrphanedClickGuard() {
  const stopWatchingRef = useRef<(() => void) | null>(null);

  const watchForOrphanedEvents = useCallback(() => {
    // A close while a previous window is still open supersedes it.
    stopWatchingRef.current?.();

    let timeoutId = 0;

    const stopWatching = () => {
      stopWatchingRef.current = null;
      window.clearTimeout(timeoutId);
      document.removeEventListener("pointerdown", stopWatching, true);
      document.removeEventListener("mousedown", swallowOrphanedEvent, true);
      document.removeEventListener("click", swallowOrphanedEvent, true);
    };

    function swallowOrphanedEvent(event: MouseEvent) {
      if (isVirtualActivation(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    }

    // Registering during the current event's dispatch is safe: capture-phase listeners
    // added on `document` after it has already been visited are not invoked for it.
    // The window closes on real pointer activity or on timeout, never on a swallow, so
    // that the whole synthesized `mousedown` + `click` pair is caught.
    document.addEventListener("pointerdown", stopWatching, true);
    document.addEventListener("mousedown", swallowOrphanedEvent, true);
    document.addEventListener("click", swallowOrphanedEvent, true);
    timeoutId = window.setTimeout(stopWatching, ORPHANED_EVENT_WINDOW_MS);
    stopWatchingRef.current = stopWatching;
  }, []);

  // A dismissed dialog can unmount with the window still open (Escape leaves no
  // pointerdown to disarm it), so tear it down rather than letting it outlive the form.
  useEffect(() => () => stopWatchingRef.current?.(), []);

  return useMemo(
    () => ({
      onOpenChange: (open: boolean, eventDetails: Select.Root.ChangeEventDetails) => {
        if (!open && eventDetails.reason === ORPHANING_CLOSE_REASON) {
          watchForOrphanedEvents();
        }
      },
    }),
    [watchForOrphanedEvents],
  );
}
