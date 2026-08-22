import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CREDENTIAL_THROTTLE } from '../../common/throttling';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AppConfigService } from '../../config/app-config.service';
import { AuthService, type AuthResult } from './auth.service';
import { clearRefreshCookie, setRefreshCookie } from './auth.cookies';
import { AuthResponseDto, MessageResponseDto, SessionUserDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import type { RefreshRequestUser } from './strategies/jwt-refresh.strategy';
import type { TokenClientInfo } from './token.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('register')
  @ApiOperation({ summary: 'Create an account and start a session' })
  @ApiOkResponse({ type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    return this.respondWithSession(
      await this.auth.register(dto, clientInfoOf(request)),
      response,
    );
  }

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Exchange credentials for an access/refresh pair' })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    return this.respondWithSession(await this.auth.login(dto, clientInfoOf(request)), response);
  }

  /**
   * Rotates the refresh token. Reads it from the httpOnly cookie, or from the
   * body when the client cannot rely on cross-site cookies.
   */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Throttle(CREDENTIAL_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiCookieAuth()
  @ApiBody({ type: RefreshDto, required: false })
  @ApiOperation({ summary: 'Rotate the refresh token and mint a new access token' })
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const context = request.user as RefreshRequestUser;
    return this.respondWithSession(
      await this.auth.refresh(context, clientInfoOf(request)),
      response,
    );
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiCookieAuth()
  @ApiBody({ type: RefreshDto, required: false })
  @ApiOperation({ summary: 'Revoke the presented refresh token' })
  @ApiOkResponse({ type: MessageResponseDto })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageResponseDto> {
    const { tokenId } = request.user as RefreshRequestUser;
    await this.auth.logout(tokenId);
    clearRefreshCookie(response, this.config);

    return { message: 'LOGOUT_SUCCESS' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke every refresh token for the caller' })
  @ApiOkResponse({ type: MessageResponseDto })
  async logoutEverywhere(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageResponseDto> {
    await this.auth.logoutEverywhere(userId);
    clearRefreshCookie(response, this.config);

    return { message: 'LOGOUT_ALL_SUCCESS' };
  }

  /** Lets a micro-frontend rehydrate its session on a full page load. */
  @Get('session')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the caller behind the access token' })
  @ApiOkResponse({ type: SessionUserDto })
  session(@CurrentUser() user: AuthenticatedUser): { user: AuthenticatedUser } {
    return { user };
  }

  private respondWithSession(result: AuthResult, response: Response): AuthResponseDto {
    const { tokens, user } = result;
    setRefreshCookie(response, this.config, tokens.refreshToken, tokens.refreshExpiresAt);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: 'Bearer',
    };
  }
}

function clientInfoOf(request: Request): TokenClientInfo {
  return {
    userAgent: request.get('user-agent') ?? undefined,
    ipAddress: request.ip,
  };
}
