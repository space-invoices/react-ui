import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { deleteCookie, flushCookies, getCookie, setCookie } from "@/ui/lib/browser-cookies";

describe("Browser Cookies", () => {
  let cookieJar: string;

  beforeEach(() => {
    cookieJar = "";
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => cookieJar,
      set: (v: string) => {
        // Simulate browser: each assignment sets one cookie in the jar
        const name = v.split("=")[0];
        // Remove existing cookie with same name
        const cookies = cookieJar.split("; ").filter((c) => c && !c.startsWith(`${name}=`));
        // Only add if not expired
        if (!v.includes("expires=Thu, 01 Jan 1970")) {
          const value = v.split(";")[0]; // just name=value
          cookies.push(value);
        }
        cookieJar = cookies.join("; ");
      },
    });
  });

  afterEach(() => {
    // Restore default cookie behavior
    Object.defineProperty(document, "cookie", {
      configurable: true,
      writable: true,
      value: "",
    });
  });

  describe("setCookie", () => {
    test("builds cookie string with default path and sameSite", () => {
      // Capture the raw string assigned to document.cookie
      let raw = "";
      Object.defineProperty(document, "cookie", {
        configurable: true,
        get: () => cookieJar,
        set: (v: string) => {
          raw = v;
          cookieJar = v.split(";")[0];
        },
      });

      setCookie("test", "value");

      expect(raw).toContain("test=value");
      expect(raw).toContain("path=/");
      expect(raw.toLowerCase()).toContain("samesite=lax");
    });

    test("includes max-age when specified", () => {
      let raw = "";
      Object.defineProperty(document, "cookie", {
        configurable: true,
        get: () => cookieJar,
        set: (v: string) => {
          raw = v;
        },
      });

      setCookie("test", "value", { maxAge: 3600 });
      expect(raw).toContain("max-age=3600");
    });

    test("includes expires when specified", () => {
      let raw = "";
      Object.defineProperty(document, "cookie", {
        configurable: true,
        get: () => cookieJar,
        set: (v: string) => {
          raw = v;
        },
      });

      const date = new Date("2030-01-01");
      setCookie("test", "value", { expires: date });
      expect(raw).toContain(`expires=${date.toUTCString()}`);
    });

    test("includes secure flag when specified", () => {
      let raw = "";
      Object.defineProperty(document, "cookie", {
        configurable: true,
        get: () => cookieJar,
        set: (v: string) => {
          raw = v;
        },
      });

      setCookie("test", "value", { secure: true });
      expect(raw).toContain("secure");
    });

    test("encodes name and value", () => {
      let raw = "";
      Object.defineProperty(document, "cookie", {
        configurable: true,
        get: () => cookieJar,
        set: (v: string) => {
          raw = v;
        },
      });

      setCookie("my cookie", "hello world");
      expect(raw).toContain("my%20cookie=hello%20world");
    });

    test("returns early on server (no window)", () => {
      const windowBackup = global.window;
      // @ts-expect-error — simulate server
      global.window = undefined;

      // Should not throw
      setCookie("test", "value");

      global.window = windowBackup;
    });
  });

  describe("getCookie", () => {
    test("returns value for existing cookie", () => {
      cookieJar = "foo=bar; test=hello";
      expect(getCookie("test")).toBe("hello");
    });

    test("returns undefined for non-existent cookie", () => {
      cookieJar = "foo=bar";
      expect(getCookie("missing")).toBeUndefined();
    });

    test("decodes encoded values", () => {
      cookieJar = "test=hello%20world";
      expect(getCookie("test")).toBe("hello world");
    });

    test("returns undefined on server (no window)", () => {
      const windowBackup = global.window;
      // @ts-expect-error — simulate server
      global.window = undefined;

      expect(getCookie("test")).toBeUndefined();

      global.window = windowBackup;
    });
  });

  describe("deleteCookie", () => {
    test("removes cookie from jar", () => {
      cookieJar = "test=value";
      deleteCookie("test");
      expect(cookieJar).not.toContain("test=");
    });

    test("removes cookie with custom path", () => {
      let raw = "";
      Object.defineProperty(document, "cookie", {
        configurable: true,
        get: () => cookieJar,
        set: (v: string) => {
          raw = v;
          // simulate removal
          if (v.includes("expires=Thu, 01 Jan 1970")) {
            const name = v.split("=")[0];
            const cookies = cookieJar.split("; ").filter((c) => c && !c.startsWith(`${name}=`));
            cookieJar = cookies.join("; ");
          }
        },
      });

      cookieJar = "test=value";
      deleteCookie("test", "/custom");

      expect(raw).toContain("path=/custom");
      expect(raw).toContain("expires=Thu, 01 Jan 1970");
    });

    test("also clears .spaceinvoices.com domain cookie when on that domain", () => {
      const rawCalls: string[] = [];
      Object.defineProperty(document, "cookie", {
        configurable: true,
        get: () => cookieJar,
        set: (v: string) => {
          rawCalls.push(v);
        },
      });

      // Mock hostname
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { hostname: "app.spaceinvoices.com" },
      });

      deleteCookie("test");

      // Should have two calls: host-only + domain-scoped
      expect(rawCalls.length).toBe(2);
      expect(rawCalls[1]).toContain("domain=.spaceinvoices.com");
    });
  });

  describe("flushCookies", () => {
    test("clears auth token, user, and entity cookies", () => {
      cookieJar = "l.token=abc; l.user=xyz; l.eid=ent_123";
      flushCookies();
      expect(cookieJar).not.toContain("l.token");
      expect(cookieJar).not.toContain("l.user");
      expect(cookieJar).not.toContain("l.eid");
    });
  });
});
