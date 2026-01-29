import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { ChatResponseDto, ChatMessageHistory } from './dto/chat.dto';
import { v4 as uuidv4 } from 'uuid';

interface ChatSession {
  messages: ChatMessageHistory[];
  createdAt: Date;
  lastActivity: Date;
}

/**
 * AI Assistant Service - Proxy to n8n chatbot workflow
 * 
 * This service acts as a simple proxy between the frontend and n8n.
 * n8n handles all AI logic, memory, and can call back to this backend
 * for data retrieval via its HTTP Request tool.
 */
@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly n8nChatbotUrl: string;
  private readonly sessions: Map<string, ChatSession> = new Map();
  
  // Session cleanup interval (30 minutes of inactivity)
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Configure n8n chatbot webhook URL
    this.n8nChatbotUrl = this.configService.get<string>('N8N_CHATBOT_WEBHOOK_URL') 
      || 'http://localhost:5678/webhook-test/chatbot';
    
    this.logger.log(`AI Assistant using n8n webhook: ${this.n8nChatbotUrl}`);

    // Clean up expired sessions periodically
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Process user message by forwarding to n8n chatbot
   * n8n handles all AI logic, memory, and data retrieval
   */
  async processMessage(
    message: string,
    sessionId?: string,
  ): Promise<ChatResponseDto> {
    const sid = sessionId || uuidv4();
    
    // Track session locally (for history endpoint)
    let session = this.sessions.get(sid);
    if (!session) {
      session = {
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      this.sessions.set(sid, session);
    }

    // Add user message to local history
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    session.lastActivity = new Date();

    try {
      // Forward message to n8n chatbot
      const response = await this.callN8nChatbot(message, sid);

      // Add assistant response to local history
      session.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      });

      return {
        response,
        sessionId: sid,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error processing message: ${err.message}`, err.stack);
      
      // Return error message to user
      return {
        response: `Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.`,
        sessionId: sid,
      };
    }
  }

  /**
   * Call n8n chatbot webhook
   * Sends: chatInput (user message) and sessionId (for n8n memory)
   */
  private async callN8nChatbot(message: string, sessionId: string): Promise<string> {
    this.logger.debug(`Calling n8n webhook: ${this.n8nChatbotUrl}`);
    
    // Simple payload - let n8n handle everything
    const payload = {
      chatInput: message,
      sessionId: sessionId,
    };

    const response = await fetch(this.n8nChatbotUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n webhook returned ${response.status}: ${errorText}`);
    }

    const result = await response.json() as Record<string, unknown>;
    
    // n8n AI Agent typically returns { output: "..." }
    const responseText = (result.output as string) || 
      (result.response as string) || 
      (result.text as string) || 
      (result.message as string) || 
      (typeof result === 'string' ? result : JSON.stringify(result));

    return responseText;
  }

  /**
   * Get chat history for a session
   */
  async getSessionHistory(sessionId: string): Promise<ChatMessageHistory[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    return session.messages;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT_MS) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired sessions`);
    }
  }

  // ============================================================
  // DATA RETRIEVAL ENDPOINTS (for n8n's HTTP Request tool)
  // ============================================================

  /**
   * Search candidates - called by n8n's retrieval data tool
   */
  async searchCandidates(query?: string, limit: number = 10): Promise<any[]> {
    try {
      const whereConditions: any = {};

      if (query && query.trim()) {
        const keywords = query.split(/\s+/).filter(k => k.length > 2);
        if (keywords.length > 0) {
          whereConditions.OR = keywords.flatMap((keyword) => [
            { candidateFullname: { contains: keyword, mode: 'insensitive' } },
            { candidateEmail: { contains: keyword, mode: 'insensitive' } },
            { skills: { some: { skill: { skillName: { contains: keyword, mode: 'insensitive' } } } } },
          ]);
        }
      }

      const candidates = await this.prisma.candidate.findMany({
        where: whereConditions,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          skills: { include: { skill: true } },
          workExperiences: { take: 2, orderBy: { employmentStartedDate: 'desc' } },
          educations: { 
            take: 1, 
            orderBy: { candidateStartedYearStudy: 'desc' },
            include: { candidateLastEducation: true }
          },
          applications: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { jobVacancy: { include: { jobRole: true } } },
          },
        } as any,
      }) as any[];

      return candidates.map((c) => ({
        id: c.id,
        name: c.candidateFullname,
        email: c.candidateEmail,
        city: c.cityDomicile,
        skills: c.skills?.map((s: any) => s.skill?.skillName).filter(Boolean).join(', ') || '',
        latestPosition: c.workExperiences?.[0]?.jobTitle || null,
        latestCompany: c.workExperiences?.[0]?.companyName || null,
        education: c.educations?.[0]
          ? `${c.educations[0].candidateLastEducation?.candidateEducation || 'Degree'} - ${c.educations[0].candidateSchool}`
          : null,
        appliedJob: c.applications?.[0]?.jobVacancy?.jobRole?.jobRoleName || null,
      }));
    } catch (error: any) {
      this.logger.error(`Error searching candidates: ${error.message}`, error.stack);
      return [{ error: error.message, stack: error.stack }];
    }
  }

  /**
   * Search applications with AI results - called by n8n's retrieval data tool
   */
  async searchApplications(query?: string, limit: number = 10): Promise<any[]> {
    try {
      const whereConditions: any = {};

      if (query && query.trim()) {
        const keywords = query.split(/\s+/).filter(k => k.length > 2);
        if (keywords.length > 0) {
          whereConditions.OR = keywords.flatMap((keyword) => [
            { candidate: { candidateFullname: { contains: keyword, mode: 'insensitive' } } },
            { jobVacancy: { jobRole: { jobRoleName: { contains: keyword, mode: 'insensitive' } } } },
          ]);
        }
      }

    const applications = await this.prisma.candidateApplication.findMany({
        where: whereConditions,
        take: limit,
        orderBy: [{ fitScore: 'desc' }, { createdAt: 'desc' }],
        include: {
          candidate: {
            include: { skills: true }, // CandidateSkill has no relation to a "Skill" model, it's a direct table
          },
          jobVacancy: {
            include: { jobRole: true, employeePosition: true },
          },
          applicationPipeline: true,
          applicationLastStatus: true,
        } as any,
      }) as any[];

      return applications.map((app) => ({
        id: app.id,
        candidateName: app.candidate?.candidateFullname,
        candidateEmail: app.candidate?.candidateEmail,
        jobRole: app.jobVacancy?.jobRole?.jobRoleName,
        position: app.jobVacancy?.employeePosition?.employeePosition,
        fitScore: app.fitScore ? Number(app.fitScore) : null,
        aiMatchStatus: app.aiMatchStatus,
        aiInsight: app.aiInsight,
        aiInterview: app.aiInterview,
        aiCoreValue: app.aiCoreValue,
        pipeline: app.applicationPipeline?.applicationPipeline,
        status: app.applicationLastStatus?.applicationLastStatus,
        skills: app.candidate?.skills?.map((s: any) => s.candidateSkill).filter(Boolean).join(', ') || '',
        submissionDate: app.submissionDate,
      }));
    } catch (error: any) {
      this.logger.error(`Error searching applications: ${error.message}`, error.stack);
      return [{ error: error.message, stack: error.stack }];
    }
  }

  /**
   * Get statistics - called by n8n's retrieval data tool
   */
  async getStats(): Promise<{
    totalCandidates: number;
    totalApplications: number;
    activeJobs: number;
    strongMatchCount: number;
    matchCount: number;
  }> {
    const [totalCandidates, totalApplications, activeJobs, strongMatchCount, matchCount] =
      await Promise.all([
        this.prisma.candidate.count(),
        this.prisma.candidateApplication.count(),
        this.prisma.jobVacancy.count({
          where: {
            jobVacancyStatus: {
              jobVacancyStatus: { not: 'Closed' },
            },
          },
        }),
        this.prisma.candidateApplication.count({
          where: { aiMatchStatus: 'STRONG_MATCH' as any },
        }),
        this.prisma.candidateApplication.count({
          where: { aiMatchStatus: 'MATCH' as any },
        }),
      ]);

    return {
      totalCandidates,
      totalApplications,
      activeJobs,
      strongMatchCount,
      matchCount,
    };
  }
}
