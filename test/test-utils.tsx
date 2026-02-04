/**
 * Shared test utilities for UI Package tests
 *
 * This module provides common mocks, wrappers, and utilities used across tests.
 */

import { mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ============================================================================
// REACT QUERY SETUP
// ============================================================================

/**
 * Create a QueryClient configured for testing
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty for mock logger
      log: () => {},
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty for mock logger
      warn: () => {},
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty for mock logger
      error: () => {},
    },
  });
}

/**
 * Create a QueryClientProvider wrapper for tests
 */
export function createQueryWrapper(queryClient?: QueryClient) {
  const client = queryClient || createTestQueryClient();

  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

// ============================================================================
// SDK MOCKS
// ============================================================================

/**
 * Create mock resource with standard CRUD methods
 */
function createMockResource(resourceId: string) {
  return {
    create: mock(async (data: any) => ({
      id: `${resourceId}-123`,
      ...data,
    })),
    update: mock(async (id: string, data: any) => ({
      id,
      ...data,
    })),
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    delete: mock(async () => {}),
    list: mock(async () => ({
      data: [],
      pagination: { total: 0 },
    })),
    get: mock(async (id: string) => ({
      id,
    })),
  };
}

/**
 * Create mock SDK with nested resource structure matching the new SDK
 */
export function createMockSDK() {
  return {
    customers: createMockResource("customer"),
    entities: createMockResource("entity"),
    invoices: createMockResource("invoice"),
    advanceInvoices: createMockResource("advance-invoice"),
    creditNotes: createMockResource("credit-note"),
    estimates: createMockResource("estimate"),
    items: createMockResource("item"),
    taxes: createMockResource("tax"),
    payments: createMockResource("payment"),
    activities: createMockResource("activity"),
    users: {
      ...createMockResource("user"),
      getMe: mock(async () => ({ id: "user-123", email: "test@example.com" })),
    },
  };
}

/**
 * Setup SDK provider mock
 */
export function setupSDKMocks(mockSDK?: ReturnType<typeof createMockSDK>) {
  const sdk = mockSDK || createMockSDK();

  mock.module("@/ui/providers/sdk-provider", () => ({
    useSDK: () => ({ sdk }),
  }));

  return sdk;
}

// ============================================================================
// ENTITIES PROVIDER MOCKS
// ============================================================================

/**
 * Mock active entity
 */
export const mockActiveEntity = {
  id: "entity-123",
  name: "Test Entity",
  environment: "live",
};

/**
 * Setup entities provider mock
 */
export function setupEntitiesProviderMocks(activeEntity = mockActiveEntity) {
  const mockImplementation = () => ({
    useEntities: () => ({
      entities: activeEntity ? [activeEntity] : [],
      activeEntity,
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
      setActiveEntity: mock(() => {}),
      environment: activeEntity?.environment ?? "live",
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
      setEnvironment: mock(() => {}),
      isLoading: false,
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
      refetchEntities: mock(async () => {}),
      isError: false,
      error: null,
      status: "success",
    }),
  });

  mock.module("@/ui/providers/entities-provider", mockImplementation);
  mock.module("@/ui/providers/entities-context", mockImplementation);
}

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

/**
 * Reset SDK mocks
 */
export function resetSDKMocks(sdk: ReturnType<typeof createMockSDK>) {
  Object.values(sdk).forEach((resource) => {
    if (typeof resource === "object" && resource !== null) {
      Object.values(resource).forEach((mockFn) => {
        if (typeof mockFn === "function" && "mockClear" in mockFn) {
          (mockFn as any).mockClear();
        }
      });
    }
  });
}

// ============================================================================
// COMMON TEST PATTERNS
// ============================================================================

/**
 * Create a complete test setup with SDK and QueryClient
 */
export function createTestSetup(
  options: { sdk?: ReturnType<typeof createMockSDK>; activeEntity?: any; queryClient?: QueryClient } = {},
) {
  const sdk = options.sdk || createMockSDK();
  const queryClient = options.queryClient || createTestQueryClient();
  const wrapper = createQueryWrapper(queryClient);

  setupSDKMocks(sdk);
  setupEntitiesProviderMocks(options.activeEntity);

  return {
    sdk,
    queryClient,
    wrapper,
  };
}

/**
 * Wait for a mock to be called with specific arguments
 */
export async function waitForMockCall(
  mockFn: any,
  predicate?: (args: any[]) => boolean,
  timeout = 1000,
): Promise<any[]> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const calls = mockFn.mock.calls;
    if (calls.length > 0) {
      if (!predicate || calls.some(predicate)) {
        return calls[calls.length - 1];
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Mock was not called within ${timeout}ms`);
}

// ============================================================================
// FORM TEST HELPERS (from existing form-helpers.ts)
// ============================================================================

/**
 * Create a mock promise that can be resolved/rejected manually
 */
export function createMockPromise<T = any>() {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

/**
 * Submit a form and wait for it to complete
 */
export async function submitFormAndWait(options: {
  form: HTMLElement;
  submitButton: HTMLElement;
  mockPromise: ReturnType<typeof createMockPromise>;
  response: any;
}) {
  const { form: _form, submitButton, mockPromise, response } = options;

  // Trigger form submission
  submitButton.click();

  // Wait a bit for the mutation to start
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Resolve the promise
  mockPromise.resolve(response);

  // Wait for the mutation to complete
  await new Promise((resolve) => setTimeout(resolve, 100));
}
