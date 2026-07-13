import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TextExtractorService } from '../cv-parser/parsers/text-extractor.service';
import { LLMParserService } from '../cv-parser/parsers/llm-parser.service';
import { QualifyDto, DisqualifyDto } from './dto/qualify.dto';
import { CreateOnlineAssessmentDto } from './dto/online-assessment.dto';

// Stage progression order
const STAGE_ORDER = [
    'Ai Screening',
    'Online Assessment',
    'User Interview 1',
    'User Interview 2',
    'User Interview 3',
    'Offering',
];

@Injectable()
export class PipelineActionsService {
    private readonly logger = new Logger(PipelineActionsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly textExtractor: TextExtractorService,
        private readonly llmParser: LLMParserService,
    ) { }

    /**
     * Get pipeline record with full relations
     */
    private async getPipeline(pipelineId: string) {
        let pipeline = await this.prisma.candidateApplicationPipeline.findUnique({
            where: { id: pipelineId },
            include: {
                applicationPipeline: true,
                applicationPipelineStatus: true,
                candidateApplication: {
                    include: {
                        candidate: true,
                        jobVacancy: { include: { jobRole: true } },
                    },
                },
                interviewData: true,
                onlineAssessment: true,
            },
        });

        if (!pipeline) {
            // Self-healing fallback: Check if the ID belongs to a CandidateApplication
            const app = await this.prisma.candidateApplication.findUnique({
                where: { id: pipelineId },
                include: {
                    applicationPipeline: true,
                    applicationLastStatus: true,
                }
            });
            if (app) {
                this.logger.log(`Healing missing CandidateApplicationPipeline for application ${app.id}`);
                let status = await this.prisma.applicationPipelineStatus.findFirst({
                    where: { applicationPipelineStatus: 'On Progress' }
                });
                if (!status) {
                    status = await this.prisma.applicationPipelineStatus.findFirst({
                        where: { applicationPipelineStatus: 'Pending' }
                    });
                }
                if (!status) {
                    status = await this.prisma.applicationPipelineStatus.findFirst();
                }
                
                if (status) {
                    pipeline = await this.prisma.candidateApplicationPipeline.create({
                        data: {
                            candidateApplicationId: app.id,
                            applicationPipelineId: app.applicationPipelineId,
                            applicationPipelineStatusId: status.id,
                            notes: 'Automatically generated during self-healing',
                        },
                        include: {
                            applicationPipeline: true,
                            applicationPipelineStatus: true,
                            candidateApplication: {
                                include: {
                                    candidate: true,
                                    jobVacancy: { include: { jobRole: true } },
                                },
                            },
                            interviewData: true,
                            onlineAssessment: true,
                        }
                    });
                    return pipeline;
                }
            }
            throw new NotFoundException(`Pipeline stage not found: ${pipelineId}`);
        }

        return pipeline;
    }

    /**
     * Get the next stage name in the pipeline
     */
    private getNextStage(currentStageName: string): string | null {
        const currentIndex = STAGE_ORDER.findIndex(
            (s) => s.toLowerCase() === currentStageName.toLowerCase(),
        );
        if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
            return null;
        }
        return STAGE_ORDER[currentIndex + 1];
    }

    /**
     * Find or create an ApplicationPipeline record by name
     */
    private async findOrCreatePipelineStage(stageName: string) {
        let stage = await this.prisma.applicationPipeline.findFirst({
            where: { applicationPipeline: { equals: stageName, mode: 'insensitive' } },
        });

        if (!stage) {
            stage = await this.prisma.applicationPipeline.create({
                data: { applicationPipeline: stageName },
            });
        }

        return stage;
    }

    /**
     * Find or create an ApplicationPipelineStatus by name
     */
    private async findOrCreateStatus(statusName: string) {
        let status = await this.prisma.applicationPipelineStatus.findFirst({
            where: { applicationPipelineStatus: { equals: statusName, mode: 'insensitive' } },
        });

        if (!status) {
            status = await this.prisma.applicationPipelineStatus.create({
                data: { applicationPipelineStatus: statusName },
            });
        }

        return status;
    }

    /**
     * Mark a pipeline stage as Qualified
     */
    async qualify(pipelineId: string, dto: QualifyDto) {
        this.logger.log(`Qualifying pipeline stage: ${pipelineId}`);

        const pipeline = await this.getPipeline(pipelineId);
        const qualifiedStatus = await this.findOrCreateStatus('Qualified');

        // Update current stage status to Qualified
        await this.prisma.candidateApplicationPipeline.update({
            where: { id: pipelineId },
            data: {
                applicationPipelineStatusId: qualifiedStatus.id,
                notes: dto.notes || pipeline.notes,
            },
        });

        let nextStageRecord = null;

        // Optionally create the next pipeline stage
        if (dto.proceedToNextStage !== false) {
            const currentStageName = pipeline.applicationPipeline.applicationPipeline;
            // Use explicit next stage from HR if provided, otherwise default to next in order
            const nextStageName = dto.nextStageName || this.getNextStage(currentStageName);

            if (nextStageName) {
                const nextPipelineStage = await this.findOrCreatePipelineStage(nextStageName);
                const pendingStatus = await this.findOrCreateStatus('Pending');

                nextStageRecord = await this.prisma.candidateApplicationPipeline.create({
                    data: {
                        candidateApplicationId: pipeline.candidateApplicationId,
                        applicationPipelineId: nextPipelineStage.id,
                        applicationPipelineStatusId: pendingStatus.id,
                    },
                    include: {
                        applicationPipeline: true,
                        applicationPipelineStatus: true,
                    },
                });

                // ✅ Update the pointer on CandidateApplication so Action Center
                // and other queries that filter by applicationPipelineId reflect
                // the true current stage, not the initial/conversion stage.
                await this.prisma.candidateApplication.update({
                    where: { id: pipeline.candidateApplicationId },
                    data: { applicationPipelineId: nextPipelineStage.id },
                });

                this.logger.log(`Created next stage: ${nextStageName}`);
            }
        }

        return {
            success: true,
            message: `Stage marked as Qualified`,
            nextStage: nextStageRecord
                ? {
                    id: nextStageRecord.id,
                    stage: nextStageRecord.applicationPipeline.applicationPipeline,
                    status: nextStageRecord.applicationPipelineStatus.applicationPipelineStatus,
                }
                : null,
        };
    }

    /**
     * Mark a pipeline stage as Not Qualified
     */
    async disqualify(pipelineId: string, dto: DisqualifyDto) {
        this.logger.log(`Disqualifying pipeline stage: ${pipelineId}`);

        const pipeline = await this.getPipeline(pipelineId);
        const notQualifiedStatus = await this.findOrCreateStatus('Not Qualified');

        await this.prisma.candidateApplicationPipeline.update({
            where: { id: pipelineId },
            data: {
                applicationPipelineStatusId: notQualifiedStatus.id,
                notes: dto.feedback || pipeline.notes,
            },
        });

        return {
            success: true,
            message: `Stage marked as Not Qualified`,
        };
    }

    /**
     * Create online assessment data for a pipeline stage
     */
    async createOnlineAssessment(pipelineId: string, dto: CreateOnlineAssessmentDto) {
        this.logger.log(`Creating online assessment for pipeline: ${pipelineId}`);

        const pipeline = await this.getPipeline(pipelineId);

        // Check if assessment already exists
        if (pipeline.onlineAssessment) {
            throw new BadRequestException('Online assessment data already exists for this stage. Use PATCH to update.');
        }

        const assessment = await this.prisma.candidateOnlineAssessment.create({
            data: {
                candidateApplicationPipelineId: pipelineId,
                assessmentLink: dto.assessmentLink,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                notes: dto.notes,
            },
        });

        return {
            success: true,
            data: assessment,
        };
    }

    /**
     * Upload vendor result file for an online assessment
     */
    async uploadResult(pipelineId: string, file: Express.Multer.File) {
        this.logger.log(`Uploading assessment result for pipeline: ${pipelineId}`);

        const pipeline = await this.getPipeline(pipelineId);

        if (!pipeline.onlineAssessment) {
            throw new BadRequestException('No online assessment found for this stage. Create assessment first.');
        }

        const assessment = await this.prisma.candidateOnlineAssessment.update({
            where: { id: pipeline.onlineAssessment.id },
            data: {
                vendorResultFileUrl: file.path,
                vendorResultFileName: file.originalname,
            },
        });

        return {
            success: true,
            data: assessment,
        };
    }

    /**
     * Parse uploaded vendor result PDF — extract Role Fit score + structured summary
     * Supports Pulsifi-format PDFs and falls back to LLM or raw extract for others.
     */
    async parseResult(pipelineId: string) {
        this.logger.log(`Parsing assessment result for pipeline: ${pipelineId}`);

        const pipeline = await this.getPipeline(pipelineId);

        if (!pipeline.onlineAssessment) {
            throw new BadRequestException('No online assessment found for this stage.');
        }

        if (!pipeline.onlineAssessment.vendorResultFileUrl) {
            throw new BadRequestException('No vendor result file uploaded yet.');
        }

        // Extract text from PDF
        const extractedText = await this.textExtractor.extractText(
            pipeline.onlineAssessment.vendorResultFileUrl,
            'application/pdf',
        );

        // 1. Try to extract Role Fit score directly from PDF text
        const roleFitScore = this.extractRoleFitScore(extractedText);
        this.logger.log(`Extracted Role Fit Score: ${roleFitScore ?? 'not found'}`);

        // 2. Try to extract structured summary from PDF text
        let summary = this.extractStructuredSummary(extractedText);

        // 3. If summary extraction failed or is too short, fall back to LLM
        if ((!summary || summary.length < 100) && this.llmParser.isAvailable()) {
            try {
                summary = await this.parseSummaryWithLLM(extractedText);
            } catch (error: any) {
                this.logger.warn(`LLM fallback failed: ${error.message}`);
                summary = this.createBasicSummary(extractedText);
            }
        } else if (!summary || summary.length < 100) {
            summary = this.createBasicSummary(extractedText);
        }

        // 4. Save summary (roleFitScore is in the summary text + returned in response)
        // NOTE: roleFitScore DB column requires a backend restart after prisma generate
        const assessment = await this.prisma.candidateOnlineAssessment.update({
            where: { id: pipeline.onlineAssessment.id },
            data: { parsedResultSummary: summary },
        });

        return {
            success: true,
            roleFitScore,
            data: assessment,
        };
    }

    /**
     * Extract the overall Role Fit score from Pulsifi-style PDFs.
     * Looks for a standalone percentage near the Role Fit section.
     * Example: document has "54%" near top / "Role Fit" heading.
     */
    private extractRoleFitScore(text: string): number | null {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Strategy 1: Look for a standalone percentage on a line after the header section
        // Pulsifi format: near the top, there's a bare "54%" followed by "Breakdown"
        for (let i = 0; i < Math.min(lines.length, 80); i++) {
            const line = lines[i];
            const nextLine = lines[i + 1] || '';

            // Match a standalone percentage line like "54%" followed by "Breakdown"
            const standaloneMatch = line.match(/^(\d{1,3})%$/);
            if (standaloneMatch && nextLine.toLowerCase().includes('breakdown')) {
                const val = parseInt(standaloneMatch[1], 10);
                if (val >= 1 && val <= 100) return val;
            }
        }

        // Strategy 2: Look for "Role Fit" followed by a percentage nearby
        const roleFitIndex = lines.findIndex(l => l.toLowerCase() === 'role fit');
        if (roleFitIndex !== -1) {
            for (let i = Math.max(0, roleFitIndex - 5); i < Math.min(lines.length, roleFitIndex + 10); i++) {
                const match = lines[i].match(/(\d{1,3})%/);
                if (match) {
                    const val = parseInt(match[1], 10);
                    if (val >= 1 && val <= 100) return val;
                }
            }
        }

        // Strategy 3: Find the first standalone percentage in the first 60 lines
        for (let i = 0; i < Math.min(lines.length, 60); i++) {
            const match = lines[i].match(/^(\d{1,3})%$/);
            if (match) {
                const val = parseInt(match[1], 10);
                if (val >= 1 && val <= 100) return val;
            }
        }

        return null;
    }

    /**
     * Extract structured summary from Pulsifi PDF.
     * Pulls: candidate name, applied position, screening status, role fit score,
     * rating highlights, professional summary, strengths, motivators, watchouts.
     */
    private extractStructuredSummary(text: string): string {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        const findLineAfter = (keyword: string): string | null => {
            const idx = lines.findIndex(l => l.toLowerCase().trim() === keyword.toLowerCase().trim());
            return idx !== -1 && lines[idx + 1] ? lines[idx + 1] : null;
        };

        // ── Professional Summary ──────────────────────────────────────────
        const profSummaryIdx = lines.findIndex(l => l === 'Professional Summary');
        let profSummary = '';
        if (profSummaryIdx !== -1) {
            const summaryLines: string[] = [];
            for (let i = profSummaryIdx + 1; i < Math.min(lines.length, profSummaryIdx + 6); i++) {
                if (lines[i].startsWith('This section') || lines[i].startsWith('What makes')) break;
                summaryLines.push(lines[i]);
            }
            profSummary = summaryLines.join(' ').trim();
        }

        // ── Key Highlights: extract all 3 subsections ─────────────────────
        // Find all "What makes X ..." headings and "What to look out for with X"
        const highlights: { title: string; items: string[] }[] = [];

        const whatMakesIndices: number[] = [];
        lines.forEach((l, i) => {
            if (l.toLowerCase().startsWith('what makes') || l.toLowerCase().startsWith('what to look out for')) {
                whatMakesIndices.push(i);
            }
        });

        for (const idx of whatMakesIndices) {
            const title = lines[idx];
            const items: string[] = [];
            for (let i = idx + 1; i < Math.min(lines.length, idx + 10); i++) {
                const l = lines[i];
                if (l.startsWith('What') || l.startsWith('SKILLS') || l.startsWith('Key Highlights') || l.length < 5) break;
                // Skip page footers
                if (l.includes('© Pulsifi') || l.match(/^\d+$/)) break;
                items.push(l);
            }
            if (items.length > 0) {
                highlights.push({ title, items });
            }
        }

        // ── Build markdown output ─────────────────────────────────────────
        const parts: string[] = [];

        if (profSummary) {
            parts.push(`### Professional Summary\n${profSummary}`);
        }

        if (highlights.length > 0) {
            const highlightBlocks = highlights
                .map(h => `**${h.title}**\n${h.items.map(item => `- ${item}`).join('\n')}`)
                .join('\n\n');
            parts.push(`### Key Highlights\n\n${highlightBlocks}`);
        }

        return parts.join('\n\n');
    }

    /**
     * Use LLM to create a concise summary of assessment results
     */
    private async parseSummaryWithLLM(text: string): Promise<string> {
        const { ConfigService } = await import('@nestjs/config');
        const OpenAI = (await import('openai')).default;

        // Access the LLM config from the existing LLMParserService pattern
        const apiKey = process.env.LLM_API_KEY;
        const baseURL = process.env.LLM_BASE_URL || 'https://dekawicara.cloudeka.ai/api';
        const model = process.env.LLM_MODEL || 'qwen/qwen3-coder';

        if (!apiKey) {
            throw new Error('LLM_API_KEY not configured');
        }

        const openai = new OpenAI({ apiKey, baseURL });

        // Truncate if needed
        const maxLength = 8000;
        const processedText = text.length > maxLength
            ? text.substring(0, maxLength) + '\n...[truncated]'
            : text;

        const response = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'You are an HR assistant. Summarize online assessment results concisely. Return markdown.',
                },
                {
                    role: 'user',
                    content: `Summarize this online assessment result document. Extract:\n- Overall score/grade if available\n- Key strengths\n- Key weaknesses/areas for improvement\n- Any notable observations\n\nReturn as concise markdown text (not JSON). Do NOT make any pass/fail recommendation - that is for HR to decide.\n\nDocument:\n${processedText}`,
                },
            ],
            temperature: 0.2,
            max_tokens: 1500,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('LLM returned empty response');
        }

        return content.trim();
    }

    /**
     * Fallback: create a basic text summary without LLM
     */
    private createBasicSummary(text: string): string {
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        const excerpt = lines.slice(0, 20).join('\n');
        return `**Assessment Result Extract:**\n\n${excerpt}\n\n*[Full document available for download]*`;
    }

    /**
     * Get all pipeline stages for a candidate application
     */
    async getStages(applicationId: string) {
        const stages = await this.prisma.candidateApplicationPipeline.findMany({
            where: { candidateApplicationId: applicationId },
            include: {
                applicationPipeline: true,
                applicationPipelineStatus: true,
                interviewData: true,
                onlineAssessment: true,
                employee: {
                    include: { user: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return stages.map((s) => ({
            id: s.id,
            stage: s.applicationPipeline.applicationPipeline,
            status: s.applicationPipelineStatus.applicationPipelineStatus,
            notes: s.notes,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            pic: s.employee?.user?.name || 'System',
            interviewData: s.interviewData
                ? {
                    id: s.interviewData.id,
                    scheduledDate: s.interviewData.scheduledDate,
                    scheduledStartTime: s.interviewData.scheduledStartTime,
                    scheduledEndTime: s.interviewData.scheduledEndTime,
                    interviewLink: s.interviewData.interviewLink,
                    interviewMethod: s.interviewData.interviewMethod,
                    interviewLocation: s.interviewData.interviewLocation,
                    interviewerName: s.interviewData.interviewerName,
                    interviewerEmail: s.interviewData.interviewerEmail,
                    hrInterviewScore: s.interviewData.hrInterviewScore ? Number(s.interviewData.hrInterviewScore) : null,
                    userInterviewScore: s.interviewData.userInterviewScore ? Number(s.interviewData.userInterviewScore) : null,
                }
                : null,
            onlineAssessment: s.onlineAssessment
                ? {
                    id: s.onlineAssessment.id,
                    assessmentLink: s.onlineAssessment.assessmentLink,
                    startDate: s.onlineAssessment.startDate,
                    endDate: s.onlineAssessment.endDate,
                    vendorResultFileUrl: s.onlineAssessment.vendorResultFileUrl,
                    vendorResultFileName: s.onlineAssessment.vendorResultFileName,
                    // roleFitScore: s.onlineAssessment.roleFitScore, // re-enable after backend restart
                    parsedResultSummary: s.onlineAssessment.parsedResultSummary,
                    notes: s.onlineAssessment.notes,
                }
                : null,
        }));
    }
}
