import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { SessionUserDto } from './dto/auth-response.dto';
import { PasswordService } from './password.service';
import { IssuedTokens, TokenClientInfo, TokenService } from './token.service';
import type { RefreshRequestUser } from './strategies/jwt-refresh.strategy';

export interface AuthResult {
  user: SessionUserDto;
  tokens: IssuedTokens;
}

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phoneNumber: true,
  roles: true,
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto, client: TokenClientInfo): Promise<AuthResult> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('PASSWORD_CONFIRMATION_MISMATCH');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('EMAIL_IN_USE');
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        passwordHash: await this.passwords.hash(dto.password),
      },
      select: SAFE_USER_SELECT,
    });

    return { user, tokens: await this.tokens.issueTokens(user, client) };
  }

  async login(dto: LoginDto, client: TokenClientInfo): Promise<AuthResult> {
    const record = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { ...SAFE_USER_SELECT, passwordHash: true },
    });

    if (!record) {
      // Spend the same effort as a real verification so a probe cannot tell a
      // missing account from a wrong password by how long the answer took.
      await this.passwords.verifyDummy(dto.password);
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    if (!(await this.passwords.verify(record.passwordHash, dto.password))) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    await this.upgradeHashIfNeeded(record.id, record.passwordHash, dto.password);

    const { passwordHash: _passwordHash, ...user } = record;
    return { user, tokens: await this.tokens.issueTokens(user, client) };
  }

  /**
   * Rotates a refresh token.
   *
   * The presented token is verified against its stored Argon2 digest, revoked,
   * and replaced by a fresh pair in the same family. Presenting a token that is
   * *already* revoked means someone is replaying an old one, so the whole family
   * is torn down and both the attacker and the legitimate client are forced to
   * log in again — the standard response, because there is no way to tell which
   * of the two is holding the stolen copy.
   */
  async refresh(context: RefreshRequestUser, client: TokenClientInfo): Promise<AuthResult> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: context.tokenId },
      include: { user: { select: SAFE_USER_SELECT } },
    });

    if (!stored || stored.userId !== context.userId) {
      throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    }

    if (stored.revokedAt) {
      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId}; revoking family ${stored.familyId}`,
      );
      await this.tokens.revokeFamily(stored.familyId);
      throw new UnauthorizedException('REFRESH_TOKEN_REUSED');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('REFRESH_TOKEN_EXPIRED');
    }

    if (!(await this.passwords.verify(stored.tokenHash, context.rawToken))) {
      // A well-formed JWT whose digest does not match means the row was rotated
      // out from under it; treat it as a replay.
      await this.tokens.revokeFamily(stored.familyId);
      throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    }

    await this.tokens.revokeToken(stored.id);

    const user = stored.user;
    return { user, tokens: await this.tokens.issueTokens(user, client, stored.familyId) };
  }

  /** Ends this one session. Other devices keep their tokens. */
  async logout(tokenId: string): Promise<void> {
    await this.tokens.revokeToken(tokenId);
  }

  /** Ends every session for the caller. */
  async logoutEverywhere(userId: string): Promise<void> {
    await this.tokens.revokeAllForUser(userId);
  }

  async findById(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    return user;
  }

  /**
   * Re-hashes on a successful login when the stored digest predates the current
   * Argon2 parameters, so raising the cost factor upgrades accounts silently
   * instead of needing a password reset.
   */
  private async upgradeHashIfNeeded(
    userId: string,
    digest: string,
    plaintext: string,
  ): Promise<void> {
    if (!this.passwords.needsRehash(digest)) {
      return;
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await this.passwords.hash(plaintext) },
      });
    } catch (error) {
      // A failed upgrade must never fail the login it rode along with.
      this.logger.warn(`Could not upgrade password hash for user ${userId}`, error as Error);
    }
  }
}
