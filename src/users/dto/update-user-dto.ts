import { IsString, IsEmail } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateUserDto {
  @ApiProperty()
  @IsString()
  id!: string

  @ApiProperty()
  @IsString()
  name?: string

  @ApiProperty()
  @IsEmail()
  email?: string

  @ApiProperty()
  @IsString()
  password?: string
}