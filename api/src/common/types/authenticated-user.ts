import type { Role } from '@prisma/client';

/** Caller identity resolved from a verified access token. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  roles: Role[];
}

/** Extra claims carried by a refresh token beyond the caller's identity. */
export interface RefreshTokenContext {
  /** Row id of the `refresh_tokens` record this token was issued as. */
  tokenId: string;
  familyId: string;
  /** The raw token, needed to verify it against the stored Argon2 digest. */
  rawToken: string;
}
