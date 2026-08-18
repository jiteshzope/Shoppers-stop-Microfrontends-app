/** User projection that is safe to expose to clients — no password material. */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone_number: string;
}

export interface UserCredentialsRow extends UserRow {
  password_hash: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * A freshly minted session. `token` is the only copy of the raw session secret —
 * the database stores nothing but its SHA-256 digest.
 */
export interface IssuedSession {
  token: string;
  csrfToken: string;
}

export interface ResolvedSession {
  user: SafeUser;
  csrfToken: string;
}
