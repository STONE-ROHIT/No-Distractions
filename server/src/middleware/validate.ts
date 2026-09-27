import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from './errorHandler.js';

/**
 * Middleware factory: validates `req.body` against a Zod schema before the
 * controller ever sees it. On success, `req.body` is REPLACED with the
 * parsed result (so defaults/trimming/lowercasing from the schema apply
 * everywhere downstream); on failure, throws a 400 with every field error
 * joined into one readable message.
 */
export function validate(schema: ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');
      next(new AppError(400, message));
      return;
    }

    req.body = result.data;
    next();
  };
}
