import bcrypt from 'bcryptjs';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from '../../config/environment';
import { conflict, unauthorized } from '../../shared/http-error';
import * as repository from './auth.repository';
import type {
  IssuedSession,
  LoginInput,
  RegisterInput,
  ResolvedSession,
  SafeUser,
  UserRow,
} from './auth.types';

const PASSWORD_SALT_ROUNDS = 12;
const TOKEN_BYTES = 32;

function toSafeUser(row: UserRow): SafeUser {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phoneNumber: row.phone_number,
  };
}

/**
 * Session tokens are stored as digests only, so a database dump cannot be
 * replayed as a set of live sessions.
 */
function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

async function issueSession(userId: string): Promise<IssuedSession> {
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const csrfToken = randomBytes(TOKEN_BYTES).toString('hex');
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 60 * 60 * 1000);

  await repository.insertSession({
    userId,
    tokenHash: hashToken(token),
    csrfToken,
    expiresAt,
  });

  return { token, csrfToken };
}

export async function register(
  input: RegisterInput,
): Promise<{ user: SafeUser; session: IssuedSession }> {
  if (await repository.emailExists(input.email)) {
    throw conflict('EMAIL_IN_USE');
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
  const user = toSafeUser(
    await repository.insertUser({
      name: input.name,
      email: input.email,
      phoneNumber: input.phoneNumber,
      passwordHash,
    }),
  );

  return { user, session: await issueSession(user.id) };
}

export async function login(
  input: LoginInput,
): Promise<{ user: SafeUser; session: IssuedSession }> {
  const row = await repository.findUserByEmail(input.email);

  // Always run a comparison so that a missing account and a wrong password take
  // a comparable amount of time and cannot be told apart by timing alone.
  const passwordHash = row?.password_hash ?? '';
  const passwordMatches = passwordHash
    ? await bcrypt.compare(input.password, passwordHash)
    : false;

  if (!row || !passwordMatches) {
    throw unauthorized('INVALID_CREDENTIALS');
  }

  const user = toSafeUser(row);
  return { user, session: await issueSession(user.id) };
}

export async function resolveSession(rawToken: string): Promise<ResolvedSession | null> {
  const row = await repository.findActiveSessionByTokenHash(hashToken(rawToken));
  if (!row) {
    return null;
  }

  return { user: toSafeUser(row), csrfToken: row.csrf_token };
}

export async function revokeSession(rawToken: string): Promise<void> {
  await repository.deleteSessionByTokenHash(hashToken(rawToken));
}

export async function purgeExpiredSessions(): Promise<number> {
  return repository.deleteExpiredSessions();
}

/** Constant-time comparison so CSRF tokens cannot be guessed byte by byte. */
export function csrfTokenMatches(expected: string, received: string): boolean {
  if (!expected || !received || expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
