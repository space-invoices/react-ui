import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type FooterAction = {
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
  secondaryAction?: FooterAction;
  tertiaryAction?: FooterAction;
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
  secondaryAction?: FooterAction;
  tertiaryAction?: FooterAction;
};

export function useFormFooterRegistration({
  formId,
  isPending,
  isDirty,
  label,
  onSubmit,
  secondaryAction,
  tertiaryAction,
}: UseFormFooterRegistrationProps) {
  const { setFormFooter } = useFormFooterContext();
  const onSubmitRef = useRef(onSubmit);
  const secondaryActionRef = useRef(secondaryAction);
  const tertiaryActionRef = useRef(tertiaryAction);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    secondaryActionRef.current = secondaryAction;
  }, [secondaryAction]);

  useEffect(() => {
    tertiaryActionRef.current = tertiaryAction;
  }, [tertiaryAction]);

  const stableOnSubmit = useCallback(() => {
    onSubmitRef.current?.();
  }, []);

  const hasSecondaryAction = !!secondaryAction;
  const secondaryActionLabel = secondaryAction?.label;
  const secondaryActionPending = secondaryAction?.isPending;
  const stableSecondaryActionOnClick = useCallback(() => {
    secondaryActionRef.current?.onClick();
  }, []);
  const hasTertiaryAction = !!tertiaryAction;
  const tertiaryActionLabel = tertiaryAction?.label;
  const tertiaryActionPending = tertiaryAction?.isPending;
  const stableTertiaryActionOnClick = useCallback(() => {
    tertiaryActionRef.current?.onClick();
  }, []);

  const stableSecondaryAction = useMemo(() => {
    if (!hasSecondaryAction || !secondaryActionLabel) return undefined;

    return {
      label: secondaryActionLabel,
      isPending: secondaryActionPending,
      onClick: stableSecondaryActionOnClick,
    };
  }, [hasSecondaryAction, secondaryActionLabel, secondaryActionPending, stableSecondaryActionOnClick]);

  const stableTertiaryAction = useMemo(() => {
    if (!hasTertiaryAction || !tertiaryActionLabel) return undefined;
    return {
      label: tertiaryActionLabel,
      isPending: tertiaryActionPending,
      onClick: stableTertiaryActionOnClick,
    };
  }, [hasTertiaryAction, stableTertiaryActionOnClick, tertiaryActionLabel, tertiaryActionPending]);

  useEffect(() => {
    setFormFooter({
      formId,
      isPending,
      isDirty,
      label,
      onSubmit: onSubmit ? stableOnSubmit : undefined,
      secondaryAction: stableSecondaryAction,
      tertiaryAction: stableTertiaryAction,
    });
  }, [
    formId,
    isPending,
    isDirty,
    label,
    onSubmit,
    setFormFooter,
    stableOnSubmit,
    stableSecondaryAction,
    stableTertiaryAction,
  ]);

  useEffect(() => {
    return () => {
      setFormFooter(null);
    };
  }, [setFormFooter]);
}
