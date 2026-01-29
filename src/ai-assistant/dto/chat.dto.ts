import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ChatRequestDto {
  @ApiProperty({
    description: 'User message to the AI assistant',
    example: 'Siapa kandidat terbaik untuk posisi Data Analyst?',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({
    description: 'Session ID for chat context (optional)',
    example: 'session-12345',
  })
  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'AI assistant response',
    example: 'Berdasarkan analisis data kandidat, berikut rekomendasi...',
  })
  response!: string;

  @ApiProperty({
    description: 'Session ID for maintaining conversation context',
    example: 'session-12345',
  })
  sessionId!: string;

  @ApiPropertyOptional({
    description: 'Retrieved candidates data (if applicable)',
  })
  candidates?: any[];

  @ApiPropertyOptional({
    description: 'Source of data used in response',
  })
  sources?: string[];
}

export interface ChatMessageHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}
