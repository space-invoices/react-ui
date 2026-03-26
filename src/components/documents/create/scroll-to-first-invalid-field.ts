export function scrollToFirstInvalidField(formId: string) {
  if (typeof document === "undefined") {
    return;
  }

  const form = document.getElementById(formId);
  if (!form) {
    return;
  }

  const scrollToInvalidField = () => {
    const errorTarget = form.querySelector<HTMLElement>('[data-form-error-summary="true"], [aria-invalid="true"]');
    if (!errorTarget) {
      return;
    }

    errorTarget.scrollIntoView({ behavior: "smooth", block: "center" });

    if (errorTarget.matches('[aria-invalid="true"]') && typeof errorTarget.focus === "function") {
      errorTarget.focus({ preventScroll: true });
    }
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(scrollToInvalidField);
  });
}
