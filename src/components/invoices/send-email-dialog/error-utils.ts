type ApiErrorData = {
  code?: string;
  message?: string;
};

type ApiErrorLike = {
  status?: number;
  data?: ApiErrorData;
  message?: string;
};

type Translate = (key: string) => string;

const GENERIC_API_ERROR_PATTERN = /^API error:\s*\d+$/i;
const EMAIL_VERIFICATION_REQUIRED_CODE = "email_verification_required";
const EMAIL_VERIFICATION_REQUIRED_PATTERN = /verify your email address before sending emails/i;

function getApiErrorLike(error: unknown): ApiErrorLike | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  return error as ApiErrorLike;
}

export function isEmailVerificationRequiredError(error: unknown): boolean {
  const apiError = getApiErrorLike(error);
  const status = apiError?.status;
  const apiCode = apiError?.data?.code;
  const apiMessage = apiError?.data?.message;

  return (
    status === 403 &&
    (apiCode === EMAIL_VERIFICATION_REQUIRED_CODE ||
      (typeof apiMessage === "string" && EMAIL_VERIFICATION_REQUIRED_PATTERN.test(apiMessage)))
  );
}

export function getSendEmailErrorMessage(error: unknown, t: Translate): string {
  if (isEmailVerificationRequiredError(error)) {
    return t("Email verification required description");
  }

  const apiError = getApiErrorLike(error);
  const apiMessage = apiError?.data?.message;
  if (typeof apiMessage === "string" && apiMessage.trim().length > 0) {
    return apiMessage;
  }

  if (error instanceof Error && error.message.trim().length > 0 && !GENERIC_API_ERROR_PATTERN.test(error.message)) {
    return error.message;
  }

  return t("Failed to send email");
}
