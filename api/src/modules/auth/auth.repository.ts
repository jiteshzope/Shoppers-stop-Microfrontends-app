import { pool } from '../../database/pool';
import type { UserCredentialsRow, UserRow } from './auth.types';

const USER_COLUMNS = 'id, name, email, phone_number';

export async function findUserByEmail(email: string): Promise<UserCredentialsRow | null> {
  const result = await pool.query<UserCredentialsRow>(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email],
  );

  return result.rows[0] ?? null;
}

export async function emailExists(email: string): Promise<boolean> {
  const result = await pool.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
  return result.rowCount !== null && result.rowCount > 0;
}

export async function insertUser(user: {
  name: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
}): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (name, email, phone_number, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING ${USER_COLUMNS}`,
    [user.name, user.email, user.phoneNumber, user.passwordHash],
  );

  return result.rows[0];
}

export async function insertSession(session: {
  userId: string;
  tokenHash: string;
  csrfToken: string;
  expiresAt: Date;
}): Promise<void> {
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, csrf_token, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [session.userId, session.tokenHash, session.csrfToken, session.expiresAt.toISOString()],
  );
}

export async function findActiveSessionByTokenHash(
  tokenHash: string,
): Promise<(UserRow & { csrf_token: string }) | null> {
  const result = await pool.query<UserRow & { csrf_token: string }>(
    `SELECT u.id, u.name, u.email, u.phone_number, s.csrf_token
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [tokenHash],
  );

  return result.rows[0] ?? null;
}

export async function deleteSessionByTokenHash(tokenHash: string): Promise<void> {
  await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
}

export async function deleteExpiredSessions(): Promise<number> {
  const result = await pool.query(`DELETE FROM sessions WHERE expires_at <= NOW()`);
  return result.rowCount ?? 0;
}
