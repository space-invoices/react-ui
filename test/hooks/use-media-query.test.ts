import { beforeEach, describe, expect, it, mock } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useMediaQuery } from "@/ui/hooks/use-media-query";

describe("useMediaQuery Hook", () => {
  let matchMediaMock: any;
  let listeners: Map<string, () => void>;

  beforeEach(() => {
    listeners = new Map();

    // Mock matchMedia
    matchMediaMock = mock((query: string) => {
      const mql = {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: mock((_event: string, handler: () => void) => {
          listeners.set(query, handler);
        }),
        removeEventListener: mock((_event: string, _handler: () => void) => {
          listeners.delete(query);
        }),
        dispatchEvent: mock(() => undefined),
      };

      // Determine if query matches based on common breakpoints
      if (query.includes("min-width: 768px")) {
        mql.matches = true; // Desktop
      } else if (query.includes("max-width: 767px")) {
        mql.matches = false; // Mobile
      }

      return mql;
    });

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: matchMediaMock,
    });
  });

  it("should return true for matching media query", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    expect(result.current).toBe(true);
  });

  it("should return false for non-matching media query", () => {
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));

    expect(result.current).toBe(false);
  });

  it("should register media query listener on mount", () => {
    const query = "(min-width: 768px)";
    renderHook(() => useMediaQuery(query));

    expect(matchMediaMock).toHaveBeenCalledWith(query);
  });

  it("should cleanup listener on unmount", () => {
    const query = "(min-width: 768px)";
    const { unmount } = renderHook(() => useMediaQuery(query));

    const mql = matchMediaMock.mock.results[0].value;
    unmount();

    expect(mql.removeEventListener).toHaveBeenCalled();
  });

  it("should handle different media queries", () => {
    const queries = ["(min-width: 768px)", "(max-width: 1024px)", "(orientation: portrait)"];

    queries.forEach((query) => {
      renderHook(() => useMediaQuery(query));
      expect(matchMediaMock).toHaveBeenCalledWith(query);
    });
  });

  it("should return false as default when query doesn't match", () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: mock(() => undefined),
      removeEventListener: mock(() => undefined),
      dispatchEvent: mock(() => undefined),
    }));

    const { result } = renderHook(() => useMediaQuery("(min-width: 2000px)"));

    expect(result.current).toBe(false);
  });

  it("should handle empty query", () => {
    const { result } = renderHook(() => useMediaQuery(""));

    expect(matchMediaMock).toHaveBeenCalledWith("");
    expect(result.current).toBeDefined();
  });
});
