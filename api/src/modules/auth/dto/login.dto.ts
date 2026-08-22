import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'shopper@example.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Sh0pperPass' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  password!: string;
}
