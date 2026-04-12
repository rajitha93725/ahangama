/**
 * Shared mock helpers for API route tests.
 */

// Mock session factory
export function mockSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      role: "GUEST",
      ...overrides,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

// Build a mock NextRequest for GET
export function mockGetRequest(url: string) {
  return {
    nextUrl: new URL(url, "http://localhost:3000"),
    json: jest.fn(),
    formData: jest.fn(),
  };
}

// Build a mock NextRequest for POST/PATCH/DELETE
export function mockMutationRequest(body: unknown) {
  return {
    nextUrl: new URL("http://localhost:3000"),
    json: jest.fn().mockResolvedValue(body),
    formData: jest.fn(),
  };
}
