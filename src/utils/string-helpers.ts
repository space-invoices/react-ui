/**
 * String utility functions
 */

/**
 * Capitalize first letter of string
 * @param str - The string to capitalize
 * @returns The capitalized string
 *
 * @example
 * capitalize("hello") // "Hello"
 * capitalize("HELLO") // "HELLO"
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to kebab-case
 * @param str - The string to convert
 * @returns The kebab-cased string
 *
 * @example
 * toKebabCase("helloWorld") // "hello-world"
 * toKebabCase("HelloWorld") // "hello-world"
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * Convert string to PascalCase
 * @param str - The string to convert
 * @returns The PascalCased string
 *
 * @example
 * toPascalCase("hello world") // "HelloWorld"
 * toPascalCase("hello-world") // "HelloWorld"
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => capitalize(word))
    .join("");
}

/**
 * Convert string to camelCase
 * @param str - The string to convert
 * @returns The camelCased string
 *
 * @example
 * toCamelCase("hello world") // "helloWorld"
 * toCamelCase("hello-world") // "helloWorld"
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert string to Title Case
 * @param str - The string to convert
 * @returns The Title Cased string
 *
 * @example
 * toTitleCase("hello world") // "Hello World"
 * toTitleCase("hello-world") // "Hello World"
 */
export function toTitleCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Create a URL-friendly slug from a string
 * @param str - The string to slugify
 * @returns The slugified string
 *
 * @example
 * slugify("Hello World!") // "hello-world"
 * slugify("Hello   World") // "hello-world"
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Truncate a string to a maximum length
 * @param str - The string to truncate
 * @param maxLength - The maximum length
 * @param suffix - The suffix to append (default: "...")
 * @returns The truncated string
 *
 * @example
 * truncate("Hello World", 5) // "Hello..."
 * truncate("Hello", 10) // "Hello"
 */
export function truncate(str: string, maxLength: number, suffix = "..."): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}
