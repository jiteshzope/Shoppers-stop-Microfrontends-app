import type { NextFunction, Request, RequestHandler, Response } from 'express';

type MaybeAsyncHandler<TRequest extends Request> = (
  req: TRequest,
  res: Response,
  next: NextFunction,
) => unknown;

/**
 * Express 4 does not forward rejected promises to the error middleware, so every
 * handler is wrapped here instead of repeating try/catch in each route. The type
 * parameter also lets routes declare the narrowed request produced by upstream
 * middleware without casting at every call site.
 */
export function asyncHandler<TRequest extends Request = Request>(
  handler: MaybeAsyncHandler<TRequest>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req as TRequest, res, next)).catch(next);
  };
}
