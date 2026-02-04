import { beforeEach, describe, expect, mock, test } from "bun:test";
import { render, screen } from "@testing-library/react";

import { AUTH_COOKIES } from "@/ui/lib/auth";
import * as browserCookies from "@/ui/lib/browser-cookies";
import { SDKProvider, useSDK } from "@/ui/providers/sdk-provider";

// Mock the browser-cookies module
mock.module("@/ui/lib/browser-cookies", () => {
  const mockGetCookie = mock();
  return {
    getCookie: mockGetCookie,
    flushCookies: mock(),
  };
});

// Mock the SDK constructor
const mockSDKInstance = {
  middleware: [],
};

mock.module("@spaceinvoices/js-sdk", () => {
  return {
    default: mock(() => mockSDKInstance),
  };
});

// Create a test component that uses the SDK hook
const TestComponent = () => {
  const { sdk, isInitialized, isLoading, error } = useSDK();

  return (
    <div>
      <div data-testid="sdk-status">{sdk ? "SDK Available" : "No SDK"}</div>
      <div data-testid="initialized-status">{isInitialized ? "Initialized" : "Not Initialized"}</div>
      <div data-testid="loading-status">{isLoading ? "Loading" : "Not Loading"}</div>
      <div data-testid="error-status">{error ? error.message : "No Error"}</div>
    </div>
  );
};

describe("SDKProvider", () => {
  const mockGetCookie = browserCookies.getCookie as ReturnType<typeof mock>;

  beforeEach(() => {
    // Reset mocks
    mockGetCookie.mockReset();
  });

  test("should show unauthorized fallback when no tokens are available", () => {
    // Mock getCookie to return no tokens
    mockGetCookie.mockImplementation(() => undefined);

    render(
      <SDKProvider>
        <TestComponent />
      </SDKProvider>,
    );

    // Should show unauthorized fallback
    expect(screen.getByText("No SDK available. Please log in first.")).toBeInTheDocument();
  });

  test("should use custom fallback components when provided", () => {
    // Mock getCookie to return no tokens
    mockGetCookie.mockImplementation(() => undefined);

    render(
      <SDKProvider
        fallbackLoading={<div>Custom Loading...</div>}
        fallbackUnauthorized={<div>Custom Unauthorized</div>}
        fallbackError={(error) => (
          <div>
            Custom Error:
            {error.message}
          </div>
        )}
      >
        <TestComponent />
      </SDKProvider>,
    );

    // Should show custom unauthorized fallback
    expect(screen.getByText("Custom Unauthorized")).toBeInTheDocument();
  });

  test("should render children when token is available", () => {
    // Mock getCookie to return a token
    mockGetCookie.mockImplementation((name) => {
      if (name === AUTH_COOKIES.TOKEN) return "mock-token";
      return undefined;
    });

    // Render the provider with test content
    render(
      <SDKProvider>
        <div>Test Content</div>
      </SDKProvider>,
    );

    // It should render the children
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });
});
