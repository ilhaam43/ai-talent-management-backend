import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AiAssistantService } from './ai-assistant.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@ApiTags('AI Assistant')
@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('chat')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send message to AI Assistant',
    description: 'Send a message to n8n AI chatbot and get response.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI response generated successfully',
    type: ChatResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async chat(@Body() dto: ChatRequestDto): Promise<ChatResponseDto> {
    return this.aiAssistantService.processMessage(dto.message, dto.sessionId);
  }

  @Get('sessions/:sessionId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get chat session history',
    description: 'Retrieve the conversation history for a specific session.',
  })
  @ApiResponse({ status: 200, description: 'Session history retrieved' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  getSessionHistory(@Param('sessionId') sessionId: string) {
    return this.aiAssistantService.getSessionHistory(sessionId);
  }

  // ============================================================
  // DATA RETRIEVAL ENDPOINTS (for n8n's HTTP Request tool)
  // These are internal endpoints - no auth required for n8n
  // ============================================================

  @Get('data/candidates')
  @ApiOperation({
    summary: 'Search candidates (for n8n)',
    description: 'Internal endpoint for n8n to retrieve candidate data.',
  })
  @ApiQuery({ name: 'query', required: false, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results' })
  async searchCandidates(
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiAssistantService.searchCandidates(query, limit ? parseInt(limit) : 10);
  }

  @Get('data/applications')
  @ApiOperation({
    summary: 'Search applications (for n8n)',
    description: 'Internal endpoint for n8n to retrieve application data with AI screening results.',
  })
  @ApiQuery({ name: 'query', required: false, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results' })
  async searchApplications(
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiAssistantService.searchApplications(query, limit ? parseInt(limit) : 10);
  }

  @Get('data/stats')
  @ApiOperation({
    summary: 'Get statistics (for n8n)',
    description: 'Internal endpoint for n8n to retrieve HR statistics.',
  })
  async getStats() {
    return this.aiAssistantService.getStats();
  }
}
