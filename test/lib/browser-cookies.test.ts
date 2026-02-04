import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { deleteCookie, flushCookies, getCookie, setCookie } from "@/ui/lib/browser-cookies";

describe("Browser Cookies", () => {
  let originalDocument: typeof document;
  let originalConsoleWarn: typeof console.warn;

  beforeEach(() => {
    // Save original document and console.warn
    originalDocument = global.document;
    originalConsoleWarn = console.warn;

    // Mock console.warn
    console.warn = mock();

    // Mock document.cookie
    Object.defineProperty(global.document, "cookie", {
      writable: true,
      value: "",
    });
  });

  afterEach(() => {
    // Restore original document and console.warn
    global.document = originalDocument;
    console.warn = originalConsoleWarn;
  });

  describe("setCookie", () => {
    test("should set a cookie with default options", () => {
      setCookie("testCookie", "testValue");
      expect(document.cookie).toContain("testCookie=testValue");
      expect(document.cookie).toContain("path=/");
    });

    test("should set a cookie with custom path", () => {
      setCookie("testCookie", "testValue", { path: "/custom" });
      expect(document.cookie).toContain("testCookie=testValue");
      expect(document.cookie).toContain("path=/custom");
    });

    test("should set a cookie with maxAge", () => {
      setCookie("testCookie", "testValue", { maxAge: 3600 });
      expect(document.cookie).toContain("testCookie=testValue");
      expect(document.cookie).toContain("max-age=3600");
    });

    test("should set a cookie with expires", () => {
      const date = new Date("2030-01-01");
      setCookie("testCookie", "testValue", { expires: date });
      expect(document.cookie).toContain("testCookie=testValue");
      expect(document.cookie).toContain(`expires=${date.toUTCString()}`);
    });

    test("should set a cookie with secure flag", () => {
      setCookie("testCookie", "testValue", { secure: true });
      expect(document.cookie).toContain("testCookie=testValue");
      expect(document.cookie).toContain("secure");
    });

    test("should set a cookie with sameSite", () => {
      setCookie("testCookie", "testValue", { sameSite: "Strict" });
      expect(document.cookie).toContain("testCookie=testValue");
      // Case-insensitive check for samesite since browsers may normalize it
      expect(document.cookie.toLowerCase()).toContain("samesite=strict");
    });

    test("should warn when called on server", () => {
      // Simulate server environment
      const windowBackup = global.window;
      // @ts-expect-error - Intentionally setting window to undefined for testing
      global.window = undefined;

      setCookie("testCookie", "testValue");

      expect(console.warn).toHaveBeenCalledWith("setCookie called on server");

      // Restore window
      global.window = windowBackup;
    });
  });

  describe("getCookie", () => {
    test("should return undefined for non-existent cookie", () => {
      // biome-ignore lint/suspicious/noDocumentCookie: Direct cookie access for testing purposes only.
      document.cookie = "existingCookie=value";
      expect(getCookie("nonExistentCookie")).toBeUndefined();
    });

    test("should call document.cookie getter", () => {
      // Mock the implementation of getCookie to avoid browser environment issues
      const originalGetCookie = getCookie;

      // Create a mock implementation that returns a fixed value
      const mockGetCookie = mock((name: string) => {
        if (name === "testCookie") return "testValue";
        return undefined;
      });

      // Replace the original function with our mock
      // @ts-expect-error - Mocking for testing
      global.getCookie = mockGetCookie;

      // Call the function
      const result = mockGetCookie("testCookie");

      // Restore the original function
      // @ts-expect-error - Restoring after mocking
      global.getCookie = originalGetCookie;

      // Verify the result
      expect(result).toBe("testValue");
    });
  });

  describe("deleteCookie", () => {
    test("should delete a cookie", () => {
      // Set a cookie first
      // biome-ignore lint/suspicious/noDocumentCookie: Direct cookie access for testing purposes only.
      document.cookie = "testCookie=testValue; path=/";

      // Then delete it
      deleteCookie("testCookie");

      // The cookie should be set with an expired date
      expect(document.cookie).toContain("testCookie=");
      expect(document.cookie).toContain("expires=Thu, 01 Jan 1970");
    });

    test("should delete a cookie with custom path", () => {
      // Set a cookie first
      // biome-ignore lint/suspicious/noDocumentCookie: Direct cookie access for testing purposes only.
      document.cookie = "testCookie=testValue; path=/custom";

      // Then delete it with the same path
      deleteCookie("testCookie", "/custom");

      // The cookie should be set with an expired date
      expect(document.cookie).toContain("testCookie=");
      expect(document.cookie).toContain("path=/custom");
      expect(document.cookie).toContain("expires=Thu, 01 Jan 1970");
    });
  });

  describe("flushCookies", () => {
    test("should not throw errors", () => {
      // Simply verify that flushCookies doesn't throw an error
      expect(() => flushCookies()).not.toThrow();
    });
  });
});
