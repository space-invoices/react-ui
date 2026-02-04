import { ACTIVE_ENTITY_COOKIE } from "@/ui/components/entities/keys";

import { AUTH_COOKIES } from "./auth";
import { getCookie as _getCookie } from "./cookies";

type CookieOptions = {
  path?: string;
  expires?: Date;
  maxAge?: number;
  domain?: string;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
};

/**
 * Sets a cookie with the given name, value, and options
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}) {
  if (typeof window === "undefined") {
    console.warn("setCookie called on server");
    return;
  }

  const { path = "/", expires, maxAge, domain, secure, sameSite = "Lax" } = options;

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  cookie += `; path=${path}`;

  if (expires) cookie += `; expires=${expires.toUTCString()}`;
  if (maxAge) cookie += `; max-age=${maxAge}`;
  if (domain) cookie += `; domain=${domain}`;
  if (secure) cookie += "; secure";
  if (sameSite) cookie += `; samesite=${sameSite}`;

  // biome-ignore lint/suspicious/noDocumentCookie: required for cookie helper
  document.cookie = cookie;
}

/**
 * Gets a cookie value by name
 */
export function getCookie(name: string): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return _getCookie(document.cookie, name);
}

/**
 * Removes a cookie by name
 */
export function deleteCookie(name: string, path = "/") {
  if (typeof window === "undefined") {
    console.warn("deleteCookie called on server");
    return;
  }

  setCookie(name, "", {
    path,
    expires: new Date(0),
  });
}

export function flushCookies() {
  deleteCookie(AUTH_COOKIES.TOKEN);
  deleteCookie(AUTH_COOKIES.USER);
  deleteCookie(ACTIVE_ENTITY_COOKIE);
}
