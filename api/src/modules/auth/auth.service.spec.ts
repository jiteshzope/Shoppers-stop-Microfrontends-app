import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import type { PasswordService } from './password.service';
import type { TokenService } from './token.service';
import type { PrismaService } from '../../prisma/prisma.service';

const USER = {
  id: 'e6b0c1a2-0000-4000-8000-000000000001',
  name: 'Jitesh Zope',
  email: 'jz@example.com',
  phoneNumber: '919812345678',
  roles: [Role.USER],
};

const TOKENS = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresIn: 900,
  refreshExpiresAt: new Date(Date.now() + 60_000),
};

const REGISTER_DTO = {
  name: USER.name,
  email: USER.email,
  phoneNumber: USER.phoneNumber,
  password: 'Sh0pperPass',
  confirmPassword: 'Sh0pperPass',
};

describe('AuthService', () => {
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    refreshToken: { findUnique: jest.Mock };
  };
  let passwords: {
    hash: jest.Mock;
    verify: jest.Mock;
    verifyDummy: jest.Mock;
    needsRehash: jest.Mock;
  };
  let tokens: {
    issueTokens: jest.Mock;
    revokeToken: jest.Mock;
    revokeFamily: jest.Mock;
    revokeAllForUser: jest.Mock;
  };
  let auth: AuthService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      refreshToken: { findUnique: jest.fn() },
    };

    passwords = {
      hash: jest.fn().mockResolvedValue('digest'),
      verify: jest.fn().mockResolvedValue(true),
      verifyDummy: jest.fn().mockResolvedValue(undefined),
      needsRehash: jest.fn().mockReturnValue(false),
    };

    tokens = {
      issueTokens: jest.fn().mockResolvedValue(TOKENS),
      revokeToken: jest.fn().mockResolvedValue(undefined),
      revokeFamily: jest.fn().mockResolvedValue(undefined),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };

    auth = new AuthService(
      prisma as unknown as PrismaService,
      passwords as unknown as PasswordService,
      tokens as unknown as TokenService,
    );
  });

  describe('register', () => {
    it('hashes the password and issues a token pair', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(USER);

      const result = await auth.register(REGISTER_DTO, {});

      expect(passwords.hash).toHaveBeenCalledWith('Sh0pperPass');
      expect(result.user).toEqual(USER);
      expect(result.tokens).toEqual(TOKENS);
      // The plaintext must never reach the database.
      const [created] = prisma.user.create.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(created.data).not.toHaveProperty('password');
      expect(created.data.passwordHash).toBe('digest');
    });

    it('rejects a mismatched confirmation before touching the database', async () => {
      await expect(
        auth.register({ ...REGISTER_DTO, confirmPassword: 'Different1' }, {}),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('refuses an email that is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER.id });

      await expect(auth.register(REGISTER_DTO, {})).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns the caller and a token pair on a correct password', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...USER, passwordHash: 'digest' });

      const result = await auth.login({ email: USER.email, password: 'Sh0pperPass' }, {});

      expect(result.user).toEqual(USER);
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('still burns a verification when the account does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        auth.login({ email: 'nobody@example.com', password: 'Sh0pperPass' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      // Without this, response time alone would reveal which emails exist.
      expect(passwords.verifyDummy).toHaveBeenCalledWith('Sh0pperPass');
    });

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...USER, passwordHash: 'digest' });
      passwords.verify.mockResolvedValue(false);

      await expect(
        auth.login({ email: USER.email, password: 'WrongPass1' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('upgrades a digest built with outdated parameters', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...USER, passwordHash: 'weak-digest' });
      passwords.needsRehash.mockReturnValue(true);

      await auth.login({ email: USER.email, password: 'Sh0pperPass' }, {});

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER.id },
        data: { passwordHash: 'digest' },
      });
    });
  });

  describe('refresh', () => {
    const context = {
      userId: USER.id,
      tokenId: 'a1b2c3d4-0000-4000-8000-000000000009',
      familyId: 'f1f2f3f4-0000-4000-8000-000000000009',
      rawToken: 'refresh',
    };

    const storedToken = {
      id: context.tokenId,
      userId: USER.id,
      familyId: context.familyId,
      tokenHash: 'digest',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null as Date | null,
      user: USER,
    };

    it('revokes the presented token and issues a pair in the same family', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken);

      const result = await auth.refresh(context, {});

      expect(tokens.revokeToken).toHaveBeenCalledWith(context.tokenId);
      expect(tokens.issueTokens).toHaveBeenCalledWith(USER, {}, context.familyId);
      expect(result.user).toEqual(USER);
    });

    it('tears down the whole family when an already-revoked token is replayed', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ ...storedToken, revokedAt: new Date() });

      await expect(auth.refresh(context, {})).rejects.toThrow('REFRESH_TOKEN_REUSED');
      expect(tokens.revokeFamily).toHaveBeenCalledWith(context.familyId);
      expect(tokens.issueTokens).not.toHaveBeenCalled();
    });

    it('tears down the family when the token does not match the stored digest', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      passwords.verify.mockResolvedValue(false);

      await expect(auth.refresh(context, {})).rejects.toThrow('INVALID_REFRESH_TOKEN');
      expect(tokens.revokeFamily).toHaveBeenCalledWith(context.familyId);
    });

    it('rejects an expired token without revoking the family', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        expiresAt: new Date(Date.now() - 1),
      });

      await expect(auth.refresh(context, {})).rejects.toThrow('REFRESH_TOKEN_EXPIRED');
      expect(tokens.revokeFamily).not.toHaveBeenCalled();
    });

    it('refuses a token whose subject does not own the stored row', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ ...storedToken, userId: 'someone-else' });

      await expect(auth.refresh(context, {})).rejects.toThrow('INVALID_REFRESH_TOKEN');
    });
  });
});
