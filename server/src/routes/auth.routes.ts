import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.validators.js';

export const authRouter = Router();

// Credential-guessing endpoints get a tighter limit than the rest of the
// API, keyed by IP. Each route gets its OWN limiter instance (its own
// bucket) so hammering /login can't use up someone's signup attempts, or
// the reverse. Generous enough that a real user mistyping a password a few
// times never notices it.
function credentialsLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message: 'Too many attempts. Please try again in a few minutes.' } },
  });
}

authRouter.post(
  '/register',
  credentialsLimiter(),
  validate(registerSchema),
  authController.register,
);
authRouter.post('/login', credentialsLimiter(), validate(loginSchema), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
