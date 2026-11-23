import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ConflictError, NotFoundError } from '../errors.js';

export interface ApiError {
  error: string;
  /** Field-level validation messages, keyed by field name. */
  fields?: Record<string, string>;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    res.status(400).json({ error: 'Validation failed', fields } satisfies ApiError);
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message } satisfies ApiError);
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message, fields: { email: err.message } } satisfies ApiError);
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Request body is not valid JSON' } satisfies ApiError);
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' } satisfies ApiError);
};
