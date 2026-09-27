import { defineConfig } from 'vitest/config';

// Dummy-but-valid values so config/env.ts's Zod validation passes during
// tests. Nothing in the test suite actually opens a database connection or
// a network port using these — see tests/health.test.ts, which imports the
// Express `app` directly (never `server.ts`, which is what calls
// connectDB()/listen()).
export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      PORT: '5001',
      MONGODB_URI: 'mongodb://localhost:27017/no-distractions-test',
      CLIENT_URL: 'http://localhost:5173',
    },
  },
});
