import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, WebSocket } from 'ws';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GoclawService, GoclawFrame } from './goclaw.service';
import { QuotaService } from './quota.service';
import { PrismaService } from '../database/prisma.service';
import { parse } from 'url';

import { AiAssistantService } from './ai-assistant.service';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  goclawUserId?: string;
  email?: string;
  name?: string;
  activeSessionKey?: string;
  cleanupGoclawListener?: () => void;
}

@WebSocketGateway({
  path: '/ws/chat',
})
export class GoclawWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GoclawWsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly goclawService: GoclawService,
    private readonly quotaService: QuotaService,
    private readonly prisma: PrismaService,
    private readonly aiAssistantService: AiAssistantService,
  ) {}

  async handleConnection(client: AuthenticatedSocket, req: any) {
    try {
      // Parse query params to get JWT token
      const url = req.url || '';
      const parsedUrl = parse(url, true);
      const token = parsedUrl.query.token as string;

      if (!token) {
        this.logger.warn('WS connection rejected: No token provided');
        client.send(JSON.stringify({ type: 'error', error: 'Authentication required' }));
        client.close(4001, 'Unauthorized');
        return;
      }

      // Verify JWT
      const secret = this.configService.get<string>('JWT_SECRET') || 'supersecretjwt';
      const payload = this.jwtService.verify(token, { secret });

      client.userId = payload.sub;
      client.email = payload.email;
      client.name = payload.name;
      const goclawUserId = `aitm_${payload.sub}`;
      client.goclawUserId = goclawUserId;

      this.logger.log(`Client connected: ${payload.email} (${goclawUserId})`);

      // Connect to GoClaw upstream
      await this.goclawService.getConnection(payload.sub, payload.name);

      // Add listener for GoClaw events to forward back to frontend client
      const removeListener = this.goclawService.addEventListener(goclawUserId, (frame: GoclawFrame) => {
        this.handleGoClawFrame(client, frame);
      });

      client.cleanupGoclawListener = removeListener;

      // Check quota on connect
      const quota = await this.quotaService.checkQuota(goclawUserId);

      client.send(
        JSON.stringify({
          type: 'connected',
          payload: {
            user: { id: payload.sub, email: payload.email, name: payload.name },
            quota,
          },
        }),
      );

      if (quota.status === 'exceeded') {
        client.send(
          JSON.stringify({
            type: 'quota_exceeded',
            payload: quota,
          }),
        );
      } else if (quota.status === 'warning') {
        client.send(
          JSON.stringify({
            type: 'quota_warning',
            payload: quota,
          }),
        );
      }
    } catch (err: any) {
      this.logger.error(`WS Auth Error: ${err.message}`);
      client.send(JSON.stringify({ type: 'error', error: 'Invalid or expired token' }));
      client.close(4001, 'Unauthorized');
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.email) {
      this.logger.log(`Client disconnected: ${client.email}`);
    }
    if (client.cleanupGoclawListener) {
      client.cleanupGoclawListener();
    }
  }

  /**
   * Patterns that indicate internal agent/system errors that should not be shown to the user.
   */
  private readonly INTERNAL_ERROR_PATTERNS = [
    /CRITICAL:.*exec returned identical results/i,
    /\[System: WARNING.*exec has returned the same result/i,
    /failed to stat document file:/i,
    /Document analysis failed: all providers failed/i,
    /litellm\.BadRequestError/i,
    /deka-llm:.*"error"/i,
    /HTTP 400:.*deka-llm/i,
    /No fallback model group found/i,
    /\(command completed with no output\)/,
    /Stopping to prevent runaway loop/i,
  ];

  private readonly FRIENDLY_ERROR = '⚠️ Maaf, saya mengalami kendala teknis saat memproses permintaan Anda. Silakan coba lagi atau ajukan pertanyaan lain.';

  /**
   * Check if text contains internal error patterns that should be hidden from the user.
   */
  private containsInternalError(text: string): boolean {
    return this.INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Clean streaming chunks: remove lines that contain internal error patterns.
   */
  private sanitizeChunk(chunk: string): string {
    const lines = chunk.split('\n');
    const cleaned = lines.filter((line) => !this.containsInternalError(line));
    return cleaned.join('\n');
  }

  private handleGoClawFrame(client: AuthenticatedSocket, frame: GoclawFrame) {
    if (client.readyState !== WebSocket.OPEN) return;

    if (frame.type === 'event') {
      // Event from GoClaw
      if (frame.event === 'chat') {
        const payload = frame.payload;
        if (payload?.chunk || payload?.delta) {
          let chunk = payload.chunk || payload.delta || '';
          chunk = this.sanitizeChunk(chunk);
          if (chunk.trim()) {
            client.send(
              JSON.stringify({
                type: 'chunk',
                chunk,
                sessionKey: client.activeSessionKey,
              }),
            );
          }
        }
      } else if (frame.event === 'agent') {
        client.send(
          JSON.stringify({
            type: 'agent',
            payload: frame.payload,
            sessionKey: client.activeSessionKey,
          }),
        );
      }
    } else if (frame.type === 'res') {
      if (frame.ok && frame.payload?.content) {
        let content = frame.payload.content;
        // Replace entire response if it contains internal error messages
        if (this.containsInternalError(content)) {
          this.logger.warn(`Filtered internal error from agent response for user ${client.email}`);
          content = this.FRIENDLY_ERROR;
        } else if (client.userId) {
          // Check for generated files in user's workspace
          try {
            const recentFiles = this.aiAssistantService.getRecentGeneratedFiles(client.userId);
            for (const file of recentFiles) {
              const downloadUrl = `https://backend-ai-recruitment.lintasarta.dev/ai-assistant/download/${encodeURIComponent(file)}`;
              if (!content.includes(`/ai-assistant/download/${encodeURIComponent(file)}`)) {
                content += `\n\n📥 **Download File:** [${file}](${downloadUrl})`;
              }
            }
          } catch (err: any) {
            this.logger.warn(`Failed to check recent generated files: ${err.message}`);
          }
        }
        client.send(
          JSON.stringify({
            type: 'agent_finish',
            payload: { ...frame.payload, content },
            sessionKey: client.activeSessionKey,
          }),
        );
      } else if (!frame.ok && frame.error) {
        client.send(
          JSON.stringify({
            type: 'error',
            error: 'Terjadi kesalahan pada sistem. Silakan coba lagi.',
          }),
        );
      }
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { message: string; sessionKey?: string },
  ) {
    if (!client.goclawUserId || !client.userId) {
      return { type: 'error', error: 'Not authenticated' };
    }

    // 1. Quota Pre-Check
    const quota = await this.quotaService.checkQuota(client.goclawUserId);
    if (quota.status === 'exceeded') {
      client.send(
        JSON.stringify({
          type: 'quota_exceeded',
          payload: quota,
        }),
      );
      return;
    }

    const { message, sessionKey: inputSessionKey } = data;
    if (!message || !message.trim()) return;

    let targetSessionKey = inputSessionKey;

    // Create sessionKey if not provided
    if (!targetSessionKey) {
      targetSessionKey = `agent:${this.goclawService.agentKey}:direct:${client.goclawUserId}:${Date.now()}`;
      // Save session in DB
      await this.prisma.chatSession.create({
        data: {
          userId: client.userId,
          sessionKey: targetSessionKey,
          title: message.length > 30 ? message.slice(0, 30) + '...' : message,
          lastMessage: message,
        },
      });

      // Notify client about created session
      client.send(
        JSON.stringify({
          type: 'session_created',
          sessionKey: targetSessionKey,
          payload: { sessionKey: targetSessionKey },
        }),
      );
    } else {
      // Update last message & timestamp
      await this.prisma.chatSession.update({
        where: { sessionKey: targetSessionKey },
        data: {
          lastMessage: message,
          updatedAt: new Date(),
        },
      }).catch(() => null);
    }

    client.activeSessionKey = targetSessionKey;

    // Ensure connection active
    await this.goclawService.getConnection(client.userId, client.name);

    // Send chat to GoClaw
    try {
      this.goclawService.sendChat(client.goclawUserId, message, targetSessionKey);
    } catch (err: any) {
      client.send(
        JSON.stringify({
          type: 'error',
          error: `Failed to send to agent: ${err.message}`,
        }),
      );
    }
  }

  @SubscribeMessage('get_history')
  async handleGetHistory(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionKey: string },
  ) {
    if (!client.goclawUserId) return;
    try {
      const messages = await this.goclawService.getChatHistory(client.goclawUserId, data.sessionKey);
      client.send(
        JSON.stringify({
          type: 'chat_history',
          sessionKey: data.sessionKey,
          payload: { messages },
        }),
      );
    } catch (err: any) {
      client.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  }

  @SubscribeMessage('list_sessions')
  async handleListSessions(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) return;
    try {
      const sessions = await this.prisma.chatSession.findMany({
        where: { userId: client.userId },
        orderBy: { updatedAt: 'desc' },
      });
      client.send(
        JSON.stringify({
          type: 'sessions_list',
          payload: { sessions },
        }),
      );
    } catch (err: any) {
      client.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  }
}
