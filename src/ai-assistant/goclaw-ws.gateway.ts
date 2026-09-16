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
import { LlmDashboardService, MessageQuotaPreflight } from './llm-dashboard.service';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { parse } from 'url';

import { AiAssistantService } from './ai-assistant.service';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  goclawUserId?: string;
  email?: string;
  name?: string;
  activeSessionKey?: string;
  activeSessionCreatedAt?: number;
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
    private readonly llmDashboardService: LlmDashboardService,
    private readonly prisma: PrismaService,
    private readonly aiAssistantService: AiAssistantService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
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

      // Check quota on connect (token limits + message plan summary)
      const [quota, planSummary] = await Promise.all([
        this.quotaService.checkQuota(goclawUserId),
        this.llmDashboardService.getQuotaSummary(payload.sub),
      ]);

      client.send(
        JSON.stringify({
          type: 'connected',
          payload: {
            user: { id: payload.sub, email: payload.email, name: payload.name },
            quota,
            planSummary,
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
          let thought = innerPayload.content || innerPayload.text || innerPayload.thinking || '';
          thought = this.applyPiiMasking(client, thought);
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
          let rawResult = innerPayload.result;
          let output = rawResult;
          if (typeof rawResult === 'string') {
            output = this.applyPiiMasking(client, rawResult);
          } else if (rawResult && typeof rawResult === 'object') {
            try {
              output = JSON.parse(this.applyPiiMasking(client, JSON.stringify(rawResult)));
            } catch {
              output = rawResult;
            }
          }
          client.send(
            JSON.stringify({
              type: 'agent',
              payload: {
                status: 'tool_result',
                tool,
                output,
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
        let rawThought = frame.payload?.thought || frame.payload?.text || frame.payload?.delta || frame.payload?.reasoning_content;
        let thought = typeof rawThought === 'string' ? this.applyPiiMasking(client, rawThought) : rawThought;
        client.send(
          JSON.stringify({
            type: 'agent',
            payload: {
              status: 'thinking',
              thought,
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
          // Attach workspace files only when they belong to THIS session:
          // either the agent named the file in its response, or the file was
          // created after this chat session started. The workspace dir is
          // per-user across sessions, so a blanket attach leaks other chats'
          // uploads into this one.
          try {
            const sessionStart = client.activeSessionCreatedAt;
            const candidates = this.aiAssistantService.getRecentGeneratedFilesWithAge(
              client.userId,
              7 * 24 * 3600 * 1000,
            );
            const lower = content.toLowerCase();
            for (const file of candidates) {
              const mentioned = lower.includes(file.name.toLowerCase());
              const createdInSession =
                sessionStart !== undefined ? file.mtimeMs >= sessionStart : false;
              if (!mentioned && !createdInSession) continue;
              const downloadUrl = `https://backend-ai-recruitment.lintasarta.dev/ai-assistant/download/${encodeURIComponent(file.name)}`;
              if (!content.includes(`/ai-assistant/download/${encodeURIComponent(file.name)}`)) {
                content += `\n\n📥 **Download File:** [${file.name}](${downloadUrl})`;
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

        let rawThought = frame.payload?.thought || frame.payload?.thinking || frame.payload?.reasoning_content;
        const thought = typeof rawThought === 'string' ? this.applyPiiMasking(client, rawThought) : rawThought;

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

    // 1b. Message quota pre-check against the LLM dashboard (plan limits)
    const messageQuota = await this.llmDashboardService.preflight(client.userId);
    // Alerting rides on the same preflight result. Fire-and-forget: a failed
    // notification must never delay or break the send itself.
    void this.notifyQuotaState(client, messageQuota);
    if (!messageQuota.allowed) {
      client.send(
        JSON.stringify({
          type: 'quota_exceeded',
          payload: {
            ...quota,
            messageQuota: true,
            reason: messageQuota.reason || 'MESSAGE_QUOTA_EXHAUSTED',
            details: messageQuota.details || null,
          },
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
      const createdSession = await this.prisma.chatSession.create({
        data: {
          userId: client.userId,
          sessionKey: targetSessionKey,
          title: message.length > 30 ? message.slice(0, 30) + '...' : message,
          lastMessage: message,
        },
      });
      client.activeSessionCreatedAt = createdSession.createdAt.getTime();

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
      const updatedSession = await this.prisma.chatSession.update({
        where: { sessionKey: targetSessionKey },
        data: {
          lastMessage: message,
          updatedAt: new Date(),
        },
      }).catch(() => null);
      client.activeSessionCreatedAt = updatedSession?.createdAt.getTime();
    }

    client.activeSessionKey = targetSessionKey;

    // Ensure connection active
    await this.goclawService.getConnection(client.userId, client.name);

    // Send chat to GoClaw with user context header so agent tools know caller email/company
    try {
      const isOwner = this.isOwnerCompanyUser(client);
      const effectiveCompany = isOwner ? 'lintasarta' : (client.companyName || 'external');
      const userContextPrefix = `[User: ${client.email} | UserId: ${client.userId} | Company: ${effectiveCompany}]\n`;
      const messageWithContext = `${userContextPrefix}${message}`;
      void this.llmDashboardService.recordPendingMessage(
        client.userId,
        `${targetSessionKey}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      );
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
      // Workspace files are per-user across sessions: attach them to a history
      // message only when the message names the file, or (fallback) when the
      // file was created inside this session's own time window.
      const candidates = this.aiAssistantService.getRecentGeneratedFilesWithAge(
        client.userId,
        7 * 24 * 3600 * 1000,
      );
      const linkedFiles = new Set<string>();

      const cleanedMessages: Array<{ role: string; content: string; thought?: string }> = [];

      if (Array.isArray(rawMessages)) {
        for (const m of rawMessages) {
          // Strictly keep only user and assistant messages (filter out tool, function, system)
          if (m.role !== 'user' && m.role !== 'assistant') continue;

          let content = m.content || m.text || '';
          if (typeof content !== 'string') continue;

          // GoClaw stores the user message with our routing header prepended
          // ([User: ... | Company: ...]) — never show it back to the user.
          if (m.role === 'user') {
            content = content.replace(/^\[User:[^\]]*\]\s*/, '');
          }

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
            for (const file of candidates) {
              const downloadUrl = `https://backend-ai-recruitment.lintasarta.dev/ai-assistant/download/${encodeURIComponent(file.name)}`;
              if (
                content.toLowerCase().includes(file.name.toLowerCase()) &&
                !content.includes(`/ai-assistant/download/${encodeURIComponent(file.name)}`)
              ) {
                content += `\n\n📥 **Download File:** [${file.name}](${downloadUrl})`;
                linkedFiles.add(file.name);
              }
            }
          }

          cleanedMessages.push({
            role: m.role,
            content: m.role === 'assistant' ? this.applyPiiMasking(client, content) : content,
            thought: thought ? this.applyPiiMasking(client, this.cleanMessageContent(thought)) : undefined,
          });
        }

        // Fallback: files generated during this session's lifetime that the
        // agent never named (e.g. silent report exports) attach to the last
        // assistant message. Files from other sessions stay out.
        const windowFiles = candidates.filter((f) => !linkedFiles.has(f.name));
        if (windowFiles.length > 0) {
          const sessionRow = await this.prisma.chatSession.findUnique({
            where: { sessionKey: data.sessionKey },
            select: { createdAt: true, updatedAt: true },
          });
          if (sessionRow) {
            const from = sessionRow.createdAt.getTime();
            const to = sessionRow.updatedAt.getTime() + 60_000;
            const inWindow = windowFiles.filter((f) => f.mtimeMs >= from && f.mtimeMs <= to);
            const lastAssistant = [...cleanedMessages].reverse().find((m) => m.role === 'assistant');
            if (lastAssistant) {
              for (const file of inWindow) {
                const downloadUrl = `https://backend-ai-recruitment.lintasarta.dev/ai-assistant/download/${encodeURIComponent(file.name)}`;
                if (!lastAssistant.content.includes(`/ai-assistant/download/${encodeURIComponent(file.name)}`)) {
                  lastAssistant.content += `\n\n📥 **Download File:** [${file.name}](${downloadUrl})`;
                }
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

  /** Share of a quota at which a warning is raised — matches QuotaService. */
  private readonly QUOTA_WARNING_PCT = 80;

  private readonly WINDOW_MS = {
    fiveHour: 5 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
  } as const;

  /** Plan alerts are scoped to a billing period; 30 days outlives any month. */
  private readonly PLAN_ALERT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

  /**
   * Alerts already raised, mapped to when each may be raised again. In-memory
   * on purpose: a restart can re-send one alert, which beats a DB round trip
   * on every chat message.
   */
  private readonly quotaAlertExpiry = new Map<string, number>();

  private claimAlert(key: string, ttlMs: number): boolean {
    const now = Date.now();
    for (const [claimed, expiresAt] of this.quotaAlertExpiry) {
      if (expiresAt <= now) this.quotaAlertExpiry.delete(claimed);
    }
    if ((this.quotaAlertExpiry.get(key) ?? 0) > now) return false;
    this.quotaAlertExpiry.set(key, now + ttlMs);
    return true;
  }

  /**
   * The sending member's company, plus who must hear about a shared-quota
   * problem: every member loses the assistant, but only the HR admin
   * (companies.hrAdminId) can raise a limit or upgrade the plan.
   */
  private async resolveCompanyAudience(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      select: { companyId: true },
    });
    const companyId = employee?.companyId;
    if (!companyId) return null;

    const [company, employees] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, hrAdmin: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.employee.findMany({
        where: { companyId },
        select: { userId: true },
      }),
    ]);
    if (!company) return null;

    return {
      companyId,
      companyName: company.name,
      memberUserIds: employees.map((e) => e.userId),
      admin: company.hrAdmin,
    };
  }

  private async notifyQuotaState(
    client: AuthenticatedSocket,
    quota: MessageQuotaPreflight,
  ): Promise<void> {
    if (!client.userId) return;
    try {
      if (quota.allowed) {
        await this.notifyQuotaThresholds(client, quota);
      } else {
        await this.notifyQuotaDenial(client, quota);
      }
    } catch (err: any) {
      this.logger.error(`Quota alert failed for ${client.userId}: ${err.message}`);
    }
  }

  /**
   * A blocked send. Rolling 5h/1w limits are per member, so only that member
   * is told; the plan quota is shared, so every member gets the bell and the
   * HR admin gets the email.
   */
  private async notifyQuotaDenial(
    client: AuthenticatedSocket,
    quota: MessageQuotaPreflight,
  ): Promise<void> {
    const userId = client.userId!;
    const window = quota.details?.window;

    if (window) {
      const limit = quota.details?.limit ?? 0;
      const freesAt = quota.details?.freesAt ?? null;
      // freesAt identifies this window instance, so the alert can fire again
      // once the window rolls over and blocks the member a second time.
      const key = `window:${userId}:${window}:${freesAt ?? 'none'}`;
      if (!this.claimAlert(key, this.WINDOW_MS[window])) return;
      await this.notificationsService.notifyQuotaWindowLimit(userId, {
        window,
        limit,
        used: quota.details?.used ?? limit,
        freesAt,
      });
      return;
    }

    const audience = await this.resolveCompanyAudience(userId);
    if (!audience) return;

    const periodKey = quota.periodEnd ?? 'unknown';
    if (!this.claimAlert(`plan:${audience.companyId}:exhausted:${periodKey}`, this.PLAN_ALERT_TTL_MS)) return;

    const details = {
      companyName: audience.companyName,
      planName: quota.planName ?? null,
      usedMessages: quota.usedMessages ?? 0,
      planMessages: quota.planMessages ?? null,
      triggeredByName: client.name ?? undefined,
      periodEnd: quota.periodEnd ?? null,
    };

    await this.notificationsService.notifyCompanyQuotaExhausted(audience.memberUserIds, details);
    if (audience.admin) {
      await this.emailService.sendQuotaExhaustedEmail(audience.admin.email, audience.admin.name, details);
    }
  }

  /**
   * An allowed send that crossed a warning threshold. Members are warned about
   * their own rolling windows; the HR admin is warned about the shared plan
   * quota by bell and email, because only they can act on it.
   */
  private async notifyQuotaThresholds(
    client: AuthenticatedSocket,
    quota: MessageQuotaPreflight,
  ): Promise<void> {
    const userId = client.userId!;

    for (const window of ['fiveHour', 'week'] as const) {
      const state = quota.windows?.[window];
      if (!state?.enabled || !state.limit) continue;
      // remaining === 0 belongs to the denial path, not the warning path.
      if (state.pct < this.QUOTA_WARNING_PCT || state.remaining === 0) continue;
      const bucket = Math.floor(Date.now() / this.WINDOW_MS[window]);
      if (!this.claimAlert(`window:${userId}:${window}:warn:${bucket}`, this.WINDOW_MS[window])) continue;
      await this.notificationsService.notifyQuotaWindowWarning(userId, {
        window,
        limit: state.limit,
        used: state.used,
        pct: state.pct,
      });
    }

    const planMessages = quota.planMessages;
    if (!quota.hasMessageQuota || !planMessages) return;
    if ((quota.totalRemainingMessages ?? 0) <= 0) return;
    const usedMessages = quota.usedMessages ?? 0;
    const pct = Math.round((usedMessages / planMessages) * 100);
    if (pct < this.QUOTA_WARNING_PCT) return;

    const audience = await this.resolveCompanyAudience(userId);
    if (!audience?.admin) return;

    const periodKey = quota.periodEnd ?? 'unknown';
    if (!this.claimAlert(`plan:${audience.companyId}:warn:${periodKey}`, this.PLAN_ALERT_TTL_MS)) return;

    const details = {
      companyName: audience.companyName,
      planName: quota.planName ?? null,
      usedMessages,
      planMessages,
      pct,
      triggeredByName: client.name ?? undefined,
      periodEnd: quota.periodEnd ?? null,
    };

    await this.notificationsService.notifyCompanyQuotaWarning(audience.admin.id, details);
    await this.emailService.sendQuotaWarningEmail(audience.admin.email, audience.admin.name, details);
  }
}
