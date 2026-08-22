import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** E.164-ish: optional `+`, no leading zero, 10-15 digits in total. */
const PHONE_PATTERN = /^\+?[1-9][0-9]{9,14}$/;

/** At least one lower-case letter, one upper-case letter and one digit. */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export class RegisterDto {
  @ApiProperty({ example: 'Jitesh Zope', maxLength: 120 })
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'shopper@example.com', maxLength: 255 })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: '919812345678', description: 'E.164 digits, optional leading +' })
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(PHONE_PATTERN, {
    message: 'phoneNumber must be 10-15 digits, optionally prefixed with +',
  })
  phoneNumber!: string;

  @ApiProperty({ example: 'Sh0pperPass', minLength: 8, maxLength: 64 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(PASSWORD_PATTERN, {
    message: 'password must contain an upper-case letter, a lower-case letter and a digit',
  })
  password!: string;

  @ApiProperty({ example: 'Sh0pperPass', description: 'Must match password' })
  @IsString()
  confirmPassword!: string;
}
