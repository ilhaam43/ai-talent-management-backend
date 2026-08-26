import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateGuideStatusDto {
  @ApiProperty({
    description: 'Whether the guide popup has been dismissed by the user',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  guideDismissed: boolean = true;
}
