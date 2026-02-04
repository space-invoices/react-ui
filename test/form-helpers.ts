import { expect } from "bun:test";
import { act } from "@testing-library/react";

export const createMockPromise = () => {
  let resolve: (value: any) => void;
  let reject: (error: any) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
};

export const submitFormAndWait = async ({
  form,
  submitButton,
  mockPromise,
  response,
}: {
  form: HTMLElement;
  submitButton: HTMLElement;
  mockPromise: ReturnType<typeof createMockPromise>;
  response: any;
}) => {
  // Submit form
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true }));
  });

  // Wait for button to be disabled
  await act(async () => {
    expect(submitButton).toBeDisabled();
  });

  // Resolve the promise
  await act(async () => {
    await mockPromise.resolve(response);
  });

  // Wait for button to be enabled
  await act(async () => {
    expect(submitButton).not.toBeDisabled();
  });
};
