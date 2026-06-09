import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({ description: 'The password reset token sent to the user email' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ description: 'The new password to set', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
