import { badRequest } from './http-error';

/** Parses a route/body value that must be a positive integer, or fails with 400. */
export function parsePositiveInteger(value: unknown, errorCode: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest(errorCode);
  }

  return parsed;
}
