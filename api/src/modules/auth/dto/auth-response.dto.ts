import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/** User projection safe to expose to clients — never any password material. */
export class SessionUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phoneNumber!: string;

  @ApiProperty({ enum: Role, isArray: true })
  roles!: Role[];
}

export class AuthResponseDto {
  @ApiProperty({ type: SessionUserDto })
  user!: SessionUserDto;

  @ApiProperty({ description: 'Bearer token for the Authorization header.' })
  accessToken!: string;

  @ApiProperty({
    description:
      'Also set as an httpOnly cookie scoped to /api/v1/auth. Returned in the body for clients that cannot use cross-site cookies.',
  })
  refreshToken!: string;

  @ApiProperty({ description: 'Access-token lifetime in seconds.' })
  expiresIn!: number;

  @ApiProperty({ enum: ['Bearer'], default: 'Bearer' })
  tokenType!: 'Bearer';
}

export class MessageResponseDto {
  @ApiProperty()
  message!: string;
}
