import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignupDto {
    @ApiProperty({
        description: 'User email address',
        example: 'email.career@gmail.com',
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email!: string;

    @ApiProperty({
        description: 'User full name',
        example: 'John Doe',
    })
    @IsString({ message: 'Full name must be a string' })
    @IsNotEmpty({ message: 'Full name is required' })
    @MinLength(2, { message: 'Full name must be at least 2 characters long' })
    name!: string;

    @ApiProperty({
        description: 'User password',
        example: 'SecurePassword123!',
        minLength: 8,
    })
    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password!: string;
}
