import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type HeaderActionPublisher = (action: ReactNode) => void;

type StableHeaderActionOptions = {
  action: ReactNode;
  onChange?: HeaderActionPublisher;
  /**
   * A deterministic representation of everything that changes the rendered
   * action or its behavior. Equal signatures are published only once.
   */
  signature: string | null;
};

const UNPUBLISHED = Symbol("unpublished-header-action");

type LastPublication =
  | typeof UNPUBLISHED
  | {
      action: ReactNode;
      onChange: HeaderActionPublisher;
      signature: string | null;
    };

/**
 * Publishes a form-owned action into an external header without creating a
 * parent/child update loop when the action JSX is reconstructed on rerender.
 */
export function useStableHeaderAction({ action, onChange, signature }: StableHeaderActionOptions) {
  const lastPublicationRef = useRef<LastPublication>(UNPUBLISHED);

  useEffect(() => {
    if (!onChange) {
      lastPublicationRef.current = UNPUBLISHED;
      return;
    }

    const lastPublication = lastPublicationRef.current;
    if (lastPublication !== UNPUBLISHED && lastPublication.signature === signature) {
      if (lastPublication.onChange === onChange) return;

      // A parent may wrap its state setter in a new callback on every render.
      // Reusing the previously published node lets React bail out of the
      // equivalent state update while still notifying a genuinely new publisher.
      lastPublicationRef.current = { ...lastPublication, onChange };
      onChange(lastPublication.action);
      return;
    }

    lastPublicationRef.current = { action, onChange, signature };
    onChange(action);
  }, [action, onChange, signature]);
}
