import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

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

  useEffect(() => {
    setFormFooter({
      formId,
      isPending,
      isDirty,
      label,
      onSubmit,
      secondaryAction,
    });

    return () => {
      setFormFooter(null);
    };
  }, [formId, isPending, isDirty, label, onSubmit, secondaryAction, setFormFooter]);
}
