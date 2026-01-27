import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateSkillDto {
    @ApiProperty({ example: 'Python', description: 'Name of the skill' })
    @IsString()
    @IsNotEmpty()
    skillName!: string;

    @ApiPropertyOptional({ example: 'Programming language', description: 'Description of the skill' })
    @IsString()
    @IsOptional()
    description?: string;
}
