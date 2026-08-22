import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { REFRESH_STRATEGY } from '../strategies/jwt-refresh.strategy';

@Injectable()
export class JwtRefreshGuard extends AuthGuard(REFRESH_STRATEGY) {}
