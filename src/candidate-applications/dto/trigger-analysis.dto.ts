import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class TriggerAnalysisDto {
  @ApiProperty({
    description: 'Selected career tracks from localStorage',
    example: ['Cloud', 'Finance'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  selectedTracks!: string[];
}
