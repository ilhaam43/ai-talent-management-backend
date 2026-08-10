import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
export class VerifyOtpDto {
  @ApiProperty({ example: 'hr@lintasarta.co.id' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email!: string;
  @ApiProperty({ example: '123456', description: 'The 6-digit OTP sent to your email' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp!: string;
}
