/**
 * Error type carrying the HTTP status and the stable, client-facing error code
 * that the front end maps to user-visible copy. Anything thrown that is not an
 * `HttpError` is treated as an unexpected failure and reported as a 500.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'HttpError';
  }
}

export const badRequest = (code: string) => new HttpError(400, code);
export const unauthorized = (code = 'UNAUTHORIZED') => new HttpError(401, code);
export const forbidden = (code = 'FORBIDDEN') => new HttpError(403, code);
export const notFound = (code: string) => new HttpError(404, code);
export const conflict = (code: string) => new HttpError(409, code);
