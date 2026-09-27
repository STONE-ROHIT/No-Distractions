// Module augmentation: adds `userId` to Express's Request type once
// requireAuth has run, so `req.userId` is fully typed in every controller
// instead of needing an `as` cast at every call site.
import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Set by middleware/requireAuth.ts after verifying the access token. */
      userId?: string;
    }
  }
}
