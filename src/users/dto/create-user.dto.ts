import { IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  id!: string

  @ApiProperty()
  @IsString()
  name!: string

  @ApiProperty()
  @IsString()
  email!: string

  @ApiProperty()
  @IsString()
  password!: string
}