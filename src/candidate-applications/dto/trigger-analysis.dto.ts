import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional } from 'class-validator';

export class TriggerAnalysisDto {
  @ApiPropertyOptional({
    description: 'Selected career tracks from localStorage',
    example: ['Cloud', 'Finance'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  selectedTracks?: string[];
}
