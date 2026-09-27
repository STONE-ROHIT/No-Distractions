# middleware/

Express middleware shared across routes: centralized error handling now;
authentication (`requireAuth`), request validation, and rate limiting from
Phase 2 onward. Route-specific logic that isn't reusable belongs in a
controller instead.
