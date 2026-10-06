import { defineConfig } from 'vitest/config';

// Dummy-but-valid values so config/env.ts's Zod validation passes during
// tests. Nothing in the test suite actually opens a database connection or
// a network port using these — see tests/health.test.ts, which imports the
// Express `app` directly (never `server.ts`, which is what calls
// connectDB()/listen()).
export default defineConfig({
  test: {
    environment: 'node',
    // NOT pool: 'vmThreads' here, unlike the client config — it breaks
    // every test file in this suite using top-level `await import(...)`
    // (which is most of them, for the repository-mocking pattern) with a
    // SyntaxError. Tried as the same perf improvement the client got;
    // reverted once it demonstrably didn't work for this workspace.
    env: {
      NODE_ENV: 'test',
      PORT: '5001',
      MONGODB_URI: 'mongodb://localhost:27017/no-distractions-test',
      CLIENT_URL: 'http://localhost:5173',
      JWT_ACCESS_SECRET: 'test-only-secret-do-not-use-in-real-environments-0123456789',
      YOUTUBE_API_KEY: 'test-only-key-youtube-fetches-are-mocked-in-every-test',
    },
  },
});
