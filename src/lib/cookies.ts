/**
 * Cookie helper functions that work on both client and server
 * provided a cookie string from the server or client headers
 */

export function getCookie(cookiesString: string, name: string) {
  const value = `; ${cookiesString}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length >= 2) {
    return decodeURIComponent(parts[1]?.split(";").shift() ?? "");
  }
  return undefined;
}

export function removeCookie(cookiesString: string, cookieName: string): string {
  if (!cookiesString) return "";

  // Split cookies string into individual cookies
  const cookies = cookiesString
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => !cookie.startsWith(`${cookieName}=`));

  // Join remaining cookies back together
  return cookies.join("; ");
}

export function serializeCookie(
  cookiesString: string,
  name: string,
  value: string,
  options: { path?: string; maxAge?: number } = {},
) {
  const cookie = `${name}=${value}; path=${options.path || "/"}; max-age=${options.maxAge || 31536000}`;
  return `${cookiesString}; ${cookie}`;
}
