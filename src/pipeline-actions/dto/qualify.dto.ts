import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QualifyDto {
    @ApiPropertyOptional({ description: 'Notes for this qualification decision' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({
        description: 'Whether to automatically create the next pipeline stage',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    proceedToNextStage?: boolean;

    @ApiPropertyOptional({
        description: 'Specific next stage name to proceed to (e.g., "User Interview 2", "Offering"). If not provided, uses the default next stage in order.',
    })
    @IsOptional()
    @IsString()
    nextStageName?: string;
}

export class DisqualifyDto {
    @ApiPropertyOptional({ description: 'Feedback/reason for disqualification' })
    @IsOptional()
    @IsString()
    feedback?: string;
}
