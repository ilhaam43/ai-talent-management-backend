import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateSkillDto {
    @IsString()
    @IsNotEmpty()
    skillName!: string;

    @IsString()
    @IsOptional()
    description?: string;
}
