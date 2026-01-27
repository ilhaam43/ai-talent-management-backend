import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateJobRoleDto {
    @ApiProperty({ example: 'Software Engineer', description: 'Name of the job role' })
    @IsString()
    @IsNotEmpty()
    jobRoleName!: string;
}
