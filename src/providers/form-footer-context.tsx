import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type SecondaryAction = {
  label: string;
  onClick: () => void;
  isPending?: boolean;
};

type FormFooterState = {
  formId: string;
  isPending: boolean;
  isDirty: boolean;
  label: string;
  onSubmit?: () => void;
  secondaryAction?: SecondaryAction;
};

type FormFooterContextType = {
  state: FormFooterState | null;
  setFormFooter: (state: FormFooterState | null) => void;
};

const FormFooterContext = createContext<FormFooterContextType | undefined>(undefined);

export function FormFooterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FormFooterState | null>(null);

  return <FormFooterContext.Provider value={{ state, setFormFooter: setState }}>{children}</FormFooterContext.Provider>;
}

export function useFormFooterContext() {
  const context = useContext(FormFooterContext);
  if (!context) {
    throw new Error("useFormFooterContext must be used within FormFooterProvider");
  }
  return context;
}

type UseFormFooterRegistrationProps = {
  formId: string;
  isPending: boolean;
  isDirty: boolean;
  label: string;
  onSubmit?: () => void;
  secondaryAction?: SecondaryAction;
};

export function useFormFooterRegistration({
  formId,
  isPending,
  isDirty,
  label,
  onSubmit,
  secondaryAction,
}: UseFormFooterRegistrationProps) {
  const { setFormFooter } = useFormFooterContext();
  const onSubmitRef = useRef(onSubmit);
  const secondaryActionRef = useRef(secondaryAction);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    secondaryActionRef.current = secondaryAction;
  }, [secondaryAction]);

  const stableOnSubmit = useCallback(() => {
    onSubmitRef.current?.();
  }, []);

  const hasSecondaryAction = !!secondaryAction;
  const secondaryActionLabel = secondaryAction?.label;
  const secondaryActionPending = secondaryAction?.isPending;
  const stableSecondaryActionOnClick = useCallback(() => {
    secondaryActionRef.current?.onClick();
  }, []);

  const stableSecondaryAction = useMemo(() => {
    if (!hasSecondaryAction || !secondaryActionLabel) return undefined;

    return {
      label: secondaryActionLabel,
      isPending: secondaryActionPending,
      onClick: stableSecondaryActionOnClick,
    };
  }, [hasSecondaryAction, secondaryActionLabel, secondaryActionPending, stableSecondaryActionOnClick]);

  useEffect(() => {
    setFormFooter({
      formId,
      isPending,
      isDirty,
      label,
      onSubmit: onSubmit ? stableOnSubmit : undefined,
      secondaryAction: stableSecondaryAction,
    });
  }, [formId, isPending, isDirty, label, onSubmit, setFormFooter, stableOnSubmit, stableSecondaryAction]);

  useEffect(() => {
    return () => {
      setFormFooter(null);
    };
  }, [setFormFooter]);
}
