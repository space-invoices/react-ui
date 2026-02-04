import { describe, expect, mock, test } from "bun:test";
import { renderHook } from "@testing-library/react";

import { createTranslation } from "@/ui/lib/translation";

describe("createTranslation", () => {
  test("should return the original text when no options are provided", () => {
    const { result } = renderHook(() => createTranslation());

    expect(result.current("Hello")).toBe("Hello");
  });

  test("should use external translation function when provided", () => {
    const mockTranslate = mock((key: string) => `translated:${key}`);

    const { result } = renderHook(() => createTranslation({ t: mockTranslate }));

    expect(result.current("Hello")).toBe("translated:Hello");
    expect(mockTranslate).toHaveBeenCalledWith("Hello");
  });

  test("should prepend namespace to key when using external translation function", () => {
    const mockTranslate = mock((key: string) => `translated:${key}`);

    const { result } = renderHook(() => createTranslation({ t: mockTranslate, namespace: "common" }));

    expect(result.current("Hello")).toBe("translated:common.Hello");
    expect(mockTranslate).toHaveBeenCalledWith("common.Hello");
  });

  test("should use built-in translations for non-English locale", () => {
    const translations = {
      de: {
        Hello: "Hallo",
        Goodbye: "Auf Wiedersehen",
      },
    };

    const { result } = renderHook(() => createTranslation({ locale: "de", translations }));

    expect(result.current("Hello")).toBe("Hallo");
    expect(result.current("Goodbye")).toBe("Auf Wiedersehen");
  });

  test("should fall back to original text when translation is missing", () => {
    const translations = {
      de: {
        Hello: "Hallo",
      },
    };

    const { result } = renderHook(() => createTranslation({ locale: "de", translations }));

    expect(result.current("Hello")).toBe("Hallo");
    expect(result.current("Missing")).toBe("Missing");
  });

  test("should prioritize external translation function over built-in translations", () => {
    const mockTranslate = mock((key: string) => `translated:${key}`);
    const translations = {
      de: {
        Hello: "Hallo",
      },
    };

    const { result } = renderHook(() =>
      createTranslation({
        t: mockTranslate,
        locale: "de",
        translations,
      }),
    );

    expect(result.current("Hello")).toBe("translated:Hello");
    expect(mockTranslate).toHaveBeenCalledWith("Hello");
  });

  test("should return original text for English locale even if translations exist", () => {
    const translations = {
      en: {
        Hello: "Hello (EN)",
      },
      de: {
        Hello: "Hallo",
      },
    };

    const { result } = renderHook(() => createTranslation({ locale: "en", translations }));

    // Should return original text, not the English translation
    expect(result.current("Hello")).toBe("Hello");
  });
});
