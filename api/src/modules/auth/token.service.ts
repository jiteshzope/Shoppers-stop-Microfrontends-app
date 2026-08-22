import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Role, User } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';

export interface AccessTokenPayload {
  /** Subject — the user id. */
  sub: string;
  email: string;
  roles: Role[];
}

export interface RefreshTokenPayload {
  sub: string;
  /** Row id of the `refresh_tokens` record; the lookup key on refresh. */
  jti: string;
  /** Groups every rotation of one login, so reuse can be traced back. */
  fid: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds, so a client can schedule its refresh. */
  expiresIn: number;
  refreshExpiresAt: Date;
}

export interface TokenClientInfo {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  /**
   * Mints an access/refresh pair and records the refresh token.
   *
   * `familyId` is carried over on rotation and generated fresh on login, which
   * is what lets `revokeFamily` invalidate an entire compromised chain.
   */
  async issueTokens(
    user: Pick<User, 'id' | 'email' | 'roles'>,
    client: TokenClientInfo = {},
    familyId: string = randomUUID(),
  ): Promise<IssuedTokens> {
    const tokenId = randomUUID();

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.accessTokenSecret,
      expiresIn: this.config.accessTokenTtl,
    });

    const refreshPayload: RefreshTokenPayload = { sub: user.id, jti: tokenId, fid: familyId };

    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.refreshTokenSecret,
      expiresIn: this.config.refreshTokenTtl,
    });

    const refreshExpiresAt = this.expiryOf(refreshToken);

    // Only the Argon2 digest is stored. A database dump therefore yields no
    // usable refresh tokens, and the row id in the JWT is what makes the
    // digest cheap to look up.
    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        familyId,
        tokenHash: await this.passwords.hash(refreshToken),
        expiresAt: refreshExpiresAt,
        userAgent: client.userAgent?.slice(0, 255),
        ipAddress: client.ipAddress?.slice(0, 64),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.max(
        0,
        Math.floor((this.expiryOf(accessToken).getTime() - Date.now()) / 1000),
      ),
      refreshExpiresAt,
    };
  }

  async revokeToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id: tokenId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Kills every token descended from one login — the reuse-detection response. */
  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Signs the user out everywhere. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Housekeeping: rows that expired long enough ago that they can no longer be
   * replayed carry no forensic value either.
   */
  async purgeExpiredTokens(): Promise<number> {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    if (count > 0) {
      this.logger.log(`Purged ${count} expired refresh token(s)`);
    }

    return count;
  }

  /** Reads `exp` off a token this service just signed. */
  private expiryOf(token: string): Date {
    const { exp } = this.jwt.decode<{ exp: number }>(token);
    return new Date(exp * 1000);
  }
}
