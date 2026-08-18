import { badRequest } from '../../shared/http-error';
import type { LoginInput, RegisterInput } from './auth.types';

/** E.164-ish: optional `+`, no leading zero, 10-15 digits in total. */
const PHONE_PATTERN = /^\+?[1-9][0-9]{9,14}$/;

/** At least one lower case letter, one upper case letter and one digit; 8-64 chars. */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseRegisterPayload(body: unknown): RegisterInput {
  const payload = (body ?? {}) as Record<string, unknown>;

  const name = readText(payload['name']);
  const email = readText(payload['email']);
  const phoneNumber = readText(payload['phoneNumber']);
  const password = typeof payload['password'] === 'string' ? payload['password'] : '';
  const confirmPassword =
    typeof payload['confirmPassword'] === 'string' ? payload['confirmPassword'] : '';

  const isValid =
    name.length > 0 &&
    EMAIL_PATTERN.test(email) &&
    PHONE_PATTERN.test(phoneNumber) &&
    PASSWORD_PATTERN.test(password) &&
    password === confirmPassword;

  if (!isValid) {
    throw badRequest('INVALID_REGISTER_PAYLOAD');
  }

  return { name, email: normalizeEmail(email), phoneNumber, password };
}

export function parseLoginPayload(body: unknown): LoginInput {
  const payload = (body ?? {}) as Record<string, unknown>;

  const email = readText(payload['email']);
  const password = typeof payload['password'] === 'string' ? payload['password'] : '';

  if (!email || !password) {
    throw badRequest('INVALID_LOGIN_PAYLOAD');
  }

  return { email: normalizeEmail(email), password };
}
