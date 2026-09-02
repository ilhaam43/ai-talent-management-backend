import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
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
  /** Derived company name from user email domain (e.g. 'lintasarta') */
  companyName?: string;
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

      // Verify user exists in database (e.g. after database reset/reseed)
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true },
      });

      if (!user) {
        this.logger.warn(`WS connection rejected: User ${payload.sub} (${payload.email}) not found in DB.`);
        client.send(JSON.stringify({ type: 'error', error: 'User session expired or invalidated. Please login again.' }));
        client.close(4001, 'Unauthorized');
        return;
      }

      client.userId = payload.sub;
      client.email = payload.email;
      client.name = payload.name;
      client.companyName = this.companyFromEmail(payload.email);
      const goclawUserId = `aitm_${payload.sub}`;
      client.goclawUserId = goclawUserId;

      this.logger.log(`Client connected: ${payload.email} (${goclawUserId}) [company: ${client.companyName}]`);

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
   * Patterns that indicate internal agent/system errors and MCP/tool traces that should not be shown to the user.
   */
  private readonly INTERNAL_ERROR_PATTERNS = [
    /<<<EXTERNAL_UNTRUSTED_CONTENT>>>[\s\S]*?<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>/gi,
    /<<<EXTERNAL_UNTRUSTED_CONTENT>>>/gi,
    /<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>/gi,
    /\[REMINDER:\s*Above content is from an EXTERNAL[^\]]*\]/gi,
    /MCP tool "[^"]*" error:[\s\S]*/gi,
    /Tool '[^']*' parameter validation failed:[\s\S]*/gi,
    /Invalid discriminator value[\s\S]*/gi,
    /Source:\s*MCP Server[^\n]*/gi,
    /\(command completed with no output\)/gi,
    /^path is required$/gim,
    /^Sent file:\s*.+/gim,
    /CRITICAL:.*exec returned identical results.*/gi,
    /\[System: WARNING.*exec has returned the same result.*/gi,
    /failed to stat document file:.*/gi,
    /Document analysis failed:.*/gi,
    /litellm\.BadRequestError.*/gi,
    /deka-llm:.*"error".*/gi,
    /HTTP 400:.*deka-llm.*/gi,
    /No fallback model group found.*/gi,
    /Stopping to prevent runaway loop.*/gi,
  ];

  private readonly FRIENDLY_ERROR = '⚠️ Maaf, saya mengalami kendala teknis saat memproses permintaan Anda. Silakan coba lagi atau ajukan pertanyaan lain.';

  /**
   * Check if text contains internal error patterns.
   */
  private containsInternalError(text: string): boolean {
    return this.INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Clean message content by stripping out MCP tool logs, system wrappers, and trace outputs.
   */
  public cleanMessageContent(text: string): string {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text;
    for (const pattern of this.INTERNAL_ERROR_PATTERNS) {
      cleaned = cleaned.replace(pattern, '');
    }
    // Clean up excessive blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
  }

  /**
   * Clean streaming chunks: remove internal error/trace patterns.
   */
  private sanitizeChunk(chunk: string): string {
    return this.cleanMessageContent(chunk);
  }

  /**
   * Check if a message is a transient tool announcement rather than a final assistant response.
   */
  private isToolAnnouncement(text: string): boolean {
    if (!text) return false;
    const trimmed = text.trim();
    if (trimmed.length < 250) {
      const lower = trimmed.toLowerCase();
      if (
        lower.startsWith('siap') ||
        lower.startsWith('oke') ||
        lower.startsWith('baik') ||
        lower.startsWith('mohon tunggu') ||
        lower.startsWith('tunggu sebentar') ||
        lower.includes('mohon tunggu') ||
        lower.includes('tunggu sebentar') ||
        lower.includes('saya cari di database') ||
        lower.includes('saya akan mencari') ||
        lower.includes('saya cek di database') ||
        lower.includes('saya cari di linkedin') ||
        lower.includes('searching cv database') ||
        lower.includes('searching internal cv') ||
        lower.includes('searching linkedin') ||
        lower.includes('sedang mencari') ||
        lower.includes('sedang memeriksa') ||
        lower.includes('sedang menelusuri') ||
        lower.includes('🔄')
      ) {
        return true;
      }
    }
    return false;
  }

  // ─── PII Masking Helpers ───────────────────────────────────────────────────

  /** The CV data owner company — only this company sees unmasked PII */
  private readonly DATA_OWNER_COMPANY = 'lintasarta';

  /**
   * Extract company name from email domain.
   * e.g. 'hr@lintasarta.co.id' → 'lintasarta'
   */
  private companyFromEmail(email?: string): string {
    if (!email || !email.includes('@')) return '';
    const domain = email.split('@')[1].toLowerCase();
    return domain.split('.')[0];
  }

  /**
   * Check if the client belongs to the data-owning company.
   */
  private isOwnerCompanyUser(client: AuthenticatedSocket): boolean {
    const company = client.companyName || this.companyFromEmail(client.email);
    if (!company) return false; // Non-owner by default (Zero-Trust)
    return company === this.DATA_OWNER_COMPANY || company === 'example'; // example = demo accounts
  }

  /**
   * Mask PII patterns in text (safety net for agent free-form responses).
   * Masks: email addresses, phone numbers, LinkedIn URLs, and ID card numbers.
   */
  private maskPiiInText(text: string): string {
    if (!text || typeof text !== 'string') return text;

    // Mask email addresses: user@domain.com → u***@d***.com
    text = text.replace(
      /\b([A-Za-z0-9])[A-Za-z0-9._%+-]*@([A-Za-z0-9])[A-Za-z0-9.-]*\.([A-Za-z]{2,})\b/g,
      (_, localFirst, domainFirst, tld) =>
        `${localFirst}***@${domainFirst}***.${tld}`,
    );

    // Mask phone numbers: +62 85883725857 → +62 ********57
    // Handles various formats: +62xxx, 08xxx, (021) xxx
    text = text.replace(
      /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d[\d\s-]{6,}\d/g,
      (match) => {
        const digits = match.replace(/\D/g, '');
        if (digits.length < 7) return match; // Too short, probably not a phone
        return digits.slice(0, 3) + '*'.repeat(digits.length - 5) + digits.slice(-2);
      },
    );

    // Mask LinkedIn URLs
    text = text.replace(
      /https?:\/\/(www\.)?linkedin\.com\/in\/[^\s)"\]]+/gi,
      '[LinkedIn - masked]',
    );

    // Mask ID card numbers (16 digits)
    text = text.replace(
      /\b(\d{4})\d{8}(\d{4})\b/g,
      '$1********$2',
    );

    return text;
  }

  /**
   * Conditionally apply PII masking to text based on client's company.
   */
  private applyPiiMasking(client: AuthenticatedSocket, text: string): string {
    if (this.isOwnerCompanyUser(client)) return text;
    return this.maskPiiInText(text);
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
          chunk = this.applyPiiMasking(client, chunk);
          if (chunk.trim()) {
            if (this.isToolAnnouncement(chunk)) {
              client.send(
                JSON.stringify({
                  type: 'agent',
                  payload: {
                    status: 'announcement',
                    announcement: chunk.trim(),
                  },
                  sessionKey: client.activeSessionKey,
                }),
              );
            } else {
              client.send(
                JSON.stringify({
                  type: 'chunk',
                  chunk,
                  sessionKey: client.activeSessionKey,
                }),
              );
            }
          }
        }
      } else if (frame.event === 'agent') {
        const subType = frame.payload?.type;
        const innerPayload = frame.payload?.payload || {};

        if (subType === 'chunk') {
          let chunk = innerPayload.content || innerPayload.delta || '';
          chunk = this.sanitizeChunk(chunk);
          chunk = this.applyPiiMasking(client, chunk);
          if (chunk) {
            if (this.isToolAnnouncement(chunk)) {
              client.send(
                JSON.stringify({
                  type: 'agent',
                  payload: {
                    status: 'announcement',
                    announcement: chunk.trim(),
                  },
                  sessionKey: client.activeSessionKey,
                }),
              );
            } else {
              client.send(
                JSON.stringify({
                  type: 'chunk',
                  chunk,
                  sessionKey: client.activeSessionKey,
                }),
              );
            }
          }
        } else if (subType === 'block.reply') {
          const content = innerPayload.content || '';
          if (innerPayload.source === 'tool_announcement' || this.isToolAnnouncement(content)) {
            client.send(
              JSON.stringify({
                type: 'agent',
                payload: {
                  status: 'announcement',
                  announcement: content.trim(),
                },
                sessionKey: client.activeSessionKey,
              }),
            );
          }
        } else if (subType === 'thinking') {
          const thought = innerPayload.content || innerPayload.text || innerPayload.thinking || '';
          this.logger.log(`[WS Event -> Frontend] thinking: ${thought.slice(0, 60)}... (user: ${client.email})`);
          client.send(
            JSON.stringify({
              type: 'agent',
              payload: {
                status: 'thinking',
                thought,
                phase: 'thinking',
              },
              sessionKey: client.activeSessionKey,
            }),
          );
        } else if (subType === 'tool.call') {
          const tool = innerPayload.name || innerPayload.tool || '';
          const args = innerPayload.arguments || innerPayload.args || innerPayload.input;
          this.logger.log(`[WS Event -> Frontend] tool.call: ${tool} (user: ${client.email})`);
          client.send(
            JSON.stringify({
              type: 'agent',
              payload: {
                status: 'tool_call',
                tool,
                args,
                input: args,
              },
              sessionKey: client.activeSessionKey,
            }),
          );
        } else if (subType === 'tool.result') {
          const tool = innerPayload.name || innerPayload.tool || '';
          this.logger.log(`[WS Event -> Frontend] tool.result: ${tool} (user: ${client.email})`);
          client.send(
            JSON.stringify({
              type: 'agent',
              payload: {
                status: 'tool_result',
                tool,
                output: innerPayload.result,
              },
              sessionKey: client.activeSessionKey,
            }),
          );
        } else {
          // Deep clean & mask payload for client (handles run.completed and other event subtypes)
          let cleanPayload = frame.payload;
          if (cleanPayload) {
            cleanPayload = JSON.parse(JSON.stringify(cleanPayload));
            if (cleanPayload.payload?.content && typeof cleanPayload.payload.content === 'string') {
              cleanPayload.payload.content = this.applyPiiMasking(client, this.cleanMessageContent(cleanPayload.payload.content));
            }
            if (cleanPayload.content && typeof cleanPayload.content === 'string') {
              cleanPayload.content = this.applyPiiMasking(client, this.cleanMessageContent(cleanPayload.content));
            }
          }
          this.logger.log(`[WS Event -> Frontend] agent: ${JSON.stringify(cleanPayload)} (user: ${client.email})`);
          client.send(
            JSON.stringify({
              type: 'agent',
              payload: cleanPayload,
              sessionKey: client.activeSessionKey,
            }),
          );
        }
      } else if (frame.event === 'tool.call' || frame.event === 'tool_call') {
        this.logger.log(`[WS Event -> Frontend] tool.call: ${frame.payload?.tool || frame.payload?.name} (user: ${client.email})`);
        client.send(
          JSON.stringify({
            type: 'agent',
            payload: {
              status: 'tool_call',
              tool: frame.payload?.tool || frame.payload?.name,
              input: frame.payload?.input || frame.payload?.args,
              ...frame.payload,
            },
            sessionKey: client.activeSessionKey,
          }),
        );
      } else if (frame.event === 'tool.result' || frame.event === 'tool_result') {
        let output = frame.payload?.output;
        if (typeof output === 'string') {
          output = this.applyPiiMasking(client, output);
        }
        this.logger.log(`[WS Event -> Frontend] tool.result: ${frame.payload?.tool || frame.payload?.name} (user: ${client.email})`);
        client.send(
          JSON.stringify({
            type: 'agent',
            payload: {
              status: 'tool_result',
              tool: frame.payload?.tool || frame.payload?.name,
              output,
              ...frame.payload,
            },
            sessionKey: client.activeSessionKey,
          }),
        );
      } else if (frame.event === 'thought' || frame.event === 'thinking') {
        this.logger.log(`[WS Event -> Frontend] thought/thinking (user: ${client.email})`);
        client.send(
          JSON.stringify({
            type: 'agent',
            payload: {
              status: 'thinking',
              thought: frame.payload?.thought || frame.payload?.text || frame.payload?.delta || frame.payload?.reasoning_content,
              ...frame.payload,
            },
            sessionKey: client.activeSessionKey,
          }),
        );
      }
    } else if (frame.type === 'res') {
      if (frame.ok && frame.payload?.content) {
        let content = this.cleanMessageContent(frame.payload.content);
        if (!content && this.containsInternalError(frame.payload.content)) {
          this.logger.warn(`Filtered internal error from agent response for user ${client.email}`);
          content = this.FRIENDLY_ERROR;
        } else if (client.userId) {
          // Check for generated files in user's workspace
          try {
            const recentFiles = this.aiAssistantService.getRecentGeneratedFiles(client.userId, 7 * 24 * 3600 * 1000);
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

        if (!content.trim()) {
          content = 'Siap, permintaan telah selesai diproses.';
        }

        // Apply PII masking for non-owner company users
        content = this.applyPiiMasking(client, content);

        const thought = frame.payload?.thought || frame.payload?.thinking || frame.payload?.reasoning_content;

        client.send(
          JSON.stringify({
            type: 'agent_finish',
            payload: { ...frame.payload, content, thought },
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

    // Send chat to GoClaw with user context header so agent tools know caller email/company
    try {
      const userContextPrefix = `[User: ${client.email} | Company: ${client.companyName || 'unknown'}]\n`;
      const messageWithContext = `${userContextPrefix}${message}`;
      this.goclawService.sendChat(client.goclawUserId, messageWithContext, targetSessionKey);
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
    if (!client.goclawUserId || !client.userId) return;
    try {
      const rawMessages = await this.goclawService.getChatHistory(client.goclawUserId, data.sessionKey);
      const userFiles = this.aiAssistantService.getRecentGeneratedFiles(client.userId, 7 * 24 * 3600 * 1000);

      const cleanedMessages: Array<{ role: string; content: string; thought?: string }> = [];

      if (Array.isArray(rawMessages)) {
        for (const m of rawMessages) {
          // Strictly keep only user and assistant messages (filter out tool, function, system)
          if (m.role !== 'user' && m.role !== 'assistant') continue;

          let content = m.content || m.text || '';
          if (typeof content !== 'string') continue;

          let thought = m.thought || m.thinking || m.reasoning_content || '';
          const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
          if (thinkMatch) {
            thought = (thought ? thought + '\n\n' : '') + thinkMatch[1].trim();
            content = content.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
          }

          content = this.cleanMessageContent(content);
          if (!content.trim()) continue;

          // Filter out transient tool announcements so history contains only clean Q&A
          if (m.role === 'assistant' && (m.source === 'tool_announcement' || this.isToolAnnouncement(content))) {
            continue;
          }

          if (m.role === 'assistant') {
            // Check if any files were generated that match or belong to this chat
            for (const file of userFiles) {
              const downloadUrl = `https://backend-ai-recruitment.lintasarta.dev/ai-assistant/download/${encodeURIComponent(file)}`;
              if (
                content.toLowerCase().includes(file.toLowerCase()) &&
                !content.includes(`/ai-assistant/download/${encodeURIComponent(file)}`)
              ) {
                content += `\n\n📥 **Download File:** [${file}](${downloadUrl})`;
              }
            }
          }

          cleanedMessages.push({
            role: m.role,
            content: m.role === 'assistant' ? this.applyPiiMasking(client, content) : content,
            thought: thought ? this.cleanMessageContent(thought) : undefined,
          });
        }

        // If there are user files and none of the assistant messages have download links, attach to the last assistant message
        if (userFiles.length > 0) {
          const lastAssistant = [...cleanedMessages].reverse().find((m) => m.role === 'assistant');
          if (lastAssistant) {
            for (const file of userFiles) {
              const downloadUrl = `https://backend-ai-recruitment.lintasarta.dev/ai-assistant/download/${encodeURIComponent(file)}`;
              if (!lastAssistant.content.includes(`/ai-assistant/download/${encodeURIComponent(file)}`)) {
                lastAssistant.content += `\n\n📥 **Download File:** [${file}](${downloadUrl})`;
              }
            }
          }
        }
      }

      client.send(
        JSON.stringify({
          type: 'chat_history',
          sessionKey: data.sessionKey,
          payload: { messages: cleanedMessages },
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
