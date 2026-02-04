import { describe, expect, test } from "bun:test";

import { getCookie, removeCookie, serializeCookie } from "@/ui/lib/cookies";

describe("Cookie utilities", () => {
  describe("getCookie", () => {
    test("should return undefined for non-existent cookie", () => {
      const cookiesString = "existingCookie=value; anotherCookie=anotherValue";
      expect(getCookie(cookiesString, "nonExistentCookie")).toBeUndefined();
    });

    test("should return cookie value for existing cookie", () => {
      const cookiesString = "existingCookie=value; targetCookie=targetValue; anotherCookie=anotherValue";
      expect(getCookie(cookiesString, "targetCookie")).toBe("targetValue");
    });

    test("should handle URL encoded values", () => {
      const cookiesString = "user=john%40example.com; session=abc123";
      expect(getCookie(cookiesString, "user")).toBe("john@example.com");
    });

    test("should handle empty cookie string", () => {
      expect(getCookie("", "anyCookie")).toBeUndefined();
    });

    test("should handle cookie at the beginning of the string", () => {
      const cookiesString = "firstCookie=firstValue; secondCookie=secondValue";
      expect(getCookie(cookiesString, "firstCookie")).toBe("firstValue");
    });

    test("should handle cookie at the end of the string", () => {
      const cookiesString = "firstCookie=firstValue; lastCookie=lastValue";
      expect(getCookie(cookiesString, "lastCookie")).toBe("lastValue");
    });
  });

  describe("removeCookie", () => {
    test("should remove the specified cookie", () => {
      const cookiesString = "cookie1=value1; cookieToRemove=value2; cookie3=value3";
      const result = removeCookie(cookiesString, "cookieToRemove");
      expect(result).toBe("cookie1=value1; cookie3=value3");
    });

    test("should handle empty cookie string", () => {
      expect(removeCookie("", "anyCookie")).toBe("");
    });

    test("should return original string if cookie doesn't exist", () => {
      const cookiesString = "cookie1=value1; cookie2=value2";
      const result = removeCookie(cookiesString, "nonExistentCookie");
      expect(result).toBe("cookie1=value1; cookie2=value2");
    });

    test("should handle removing the only cookie", () => {
      const cookiesString = "onlyCookie=value";
      const result = removeCookie(cookiesString, "onlyCookie");
      expect(result).toBe("");
    });

    test("should handle removing the first cookie", () => {
      const cookiesString = "firstCookie=value1; secondCookie=value2";
      const result = removeCookie(cookiesString, "firstCookie");
      expect(result).toBe("secondCookie=value2");
    });

    test("should handle removing the last cookie", () => {
      const cookiesString = "firstCookie=value1; lastCookie=value2";
      const result = removeCookie(cookiesString, "lastCookie");
      expect(result).toBe("firstCookie=value1");
    });
  });

  describe("serializeCookie", () => {
    test("should add a new cookie with default options", () => {
      const cookiesString = "existingCookie=value";
      const result = serializeCookie(cookiesString, "newCookie", "newValue");
      expect(result).toBe("existingCookie=value; newCookie=newValue; path=/; max-age=31536000");
    });

    test("should add a new cookie with custom path", () => {
      const cookiesString = "existingCookie=value";
      const result = serializeCookie(cookiesString, "newCookie", "newValue", { path: "/custom" });
      expect(result).toBe("existingCookie=value; newCookie=newValue; path=/custom; max-age=31536000");
    });

    test("should add a new cookie with custom maxAge", () => {
      const cookiesString = "existingCookie=value";
      const result = serializeCookie(cookiesString, "newCookie", "newValue", { maxAge: 3600 });
      expect(result).toBe("existingCookie=value; newCookie=newValue; path=/; max-age=3600");
    });

    test("should add a new cookie with all custom options", () => {
      const cookiesString = "existingCookie=value";
      const result = serializeCookie(cookiesString, "newCookie", "newValue", { path: "/api", maxAge: 86400 });
      expect(result).toBe("existingCookie=value; newCookie=newValue; path=/api; max-age=86400");
    });

    test("should handle empty cookie string", () => {
      const result = serializeCookie("", "newCookie", "newValue");
      expect(result).toBe("; newCookie=newValue; path=/; max-age=31536000");
    });
  });
});
