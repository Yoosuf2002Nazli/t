/**
 * Jest Setup File
 * Configure testing environment before running tests
 */

// Mock environment variables
process.env.EXPO_PUBLIC_API_KEY = 'test-api-key';

// Mock fetch if needed
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Suppress console logs during tests (optional)
const originalLog = console.log;
const originalError = console.error;

beforeEach(() => {
  // Restore console functions
  console.log = originalLog;
  console.error = originalError;
});

afterEach(() => {
  jest.clearAllMocks();
});
