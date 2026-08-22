import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * The refresh token normally travels in the httpOnly cookie the login response
 * set. Clients that cannot rely on cross-site cookies — a micro-frontend on a
 * different origin, a mobile app — send it in the body instead.
 */
export class RefreshDto {
  @ApiPropertyOptional({ description: 'Omit when the refresh cookie is sent instead.' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
