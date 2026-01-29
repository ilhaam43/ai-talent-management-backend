import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CalendarResponseDto } from './dto/calendar-response.dto';
import { CreateInterviewDataDto } from './dto/create-interview-data.dto';
import { InterviewMethod } from '@prisma/client';

@Injectable()
export class CalendarService {
    private readonly logger = new Logger(CalendarService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create interview data for a candidate application pipeline
     */
    async createInterviewData(dto: CreateInterviewDataDto) {
        this.logger.log(`Creating interview data for pipeline: ${dto.candidateApplicationPipelineId}`);

        // Verify the candidate application pipeline exists
        const pipeline = await this.prisma.candidateApplicationPipeline.findUnique({
            where: { id: dto.candidateApplicationPipelineId },
            include: {
                applicationPipeline: true,
                candidateApplication: {
                    include: {
                        candidate: true,
                    },
                },
            },
        });

        if (!pipeline) {
            throw new NotFoundException(`Candidate application pipeline not found: ${dto.candidateApplicationPipelineId}`);
        }

        // Check if interview data already exists for this pipeline
        const existingInterviewData = await this.prisma.candidateInterviewData.findUnique({
            where: { candidateApplicationPipelineId: dto.candidateApplicationPipelineId },
        });

        if (existingInterviewData) {
            throw new BadRequestException(`Interview data already exists for this pipeline. Use PUT to update.`);
        }

        // Create the interview data
        const interviewData = await this.prisma.candidateInterviewData.create({
            data: {
                candidateApplicationPipelineId: dto.candidateApplicationPipelineId,
                scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
                scheduledStartTime: dto.scheduledStartTime ? new Date(dto.scheduledStartTime) : null,
                scheduledEndTime: dto.scheduledEndTime ? new Date(dto.scheduledEndTime) : null,
                interviewLink: dto.interviewLink || null,
                interviewMethod: dto.interviewMethod as InterviewMethod,
                interviewLocation: dto.interviewLocation || null,
            },
            include: {
                candidateApplicationPipeline: {
                    include: {
                        applicationPipeline: true,
                        applicationPipelineStatus: true,
                        candidateApplication: {
                            include: {
                                candidate: {
                                    select: {
                                        id: true,
                                        candidateFullname: true,
                                        candidateEmail: true,
                                    },
                                },
                                jobVacancy: {
                                    include: {
                                        jobRole: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        this.logger.log(`Interview data created with ID: ${interviewData.id}`);

        return {
            id: interviewData.id,
            candidateApplicationPipelineId: interviewData.candidateApplicationPipelineId,
            scheduledDate: interviewData.scheduledDate,
            scheduledStartTime: interviewData.scheduledStartTime,
            scheduledEndTime: interviewData.scheduledEndTime,
            interviewLink: interviewData.interviewLink,
            interviewMethod: interviewData.interviewMethod,
            interviewLocation: interviewData.interviewLocation,
            createdAt: interviewData.createdAt,
            updatedAt: interviewData.updatedAt,
            pipeline: {
                id: interviewData.candidateApplicationPipeline.id,
                applicationPipeline: interviewData.candidateApplicationPipeline.applicationPipeline.applicationPipeline,
                status: interviewData.candidateApplicationPipeline.applicationPipelineStatus.applicationPipelineStatus,
            },
            candidate: {
                id: interviewData.candidateApplicationPipeline.candidateApplication.candidate.id,
                name: interviewData.candidateApplicationPipeline.candidateApplication.candidate.candidateFullname,
                email: interviewData.candidateApplicationPipeline.candidateApplication.candidate.candidateEmail,
            },
            jobVacancy: {
                id: interviewData.candidateApplicationPipeline.candidateApplication.jobVacancy.id,
                jobRole: interviewData.candidateApplicationPipeline.candidateApplication.jobVacancy.jobRole?.jobRoleName,
            },
        };
    }

    /**
     * Get all candidate application pipelines that are in interview stages
     * with their associated interview data
     */
    async getInterviewCalendar(): Promise<CalendarResponseDto> {
        this.logger.log('Fetching interview calendar data');

        // Find all pipelines that are interview-related (HR Interview, User Interview)
        const interviewPipelines = await this.prisma.applicationPipeline.findMany({
            where: {
                applicationPipeline: {
                    contains: 'Interview',
                    mode: 'insensitive',
                },
            },
        });

        const interviewPipelineIds = interviewPipelines.map((p) => p.id);

        if (interviewPipelineIds.length === 0) {
            this.logger.warn('No interview pipelines found in the system');
            return { data: [], total: 0 };
        }

        // Fetch candidate application pipelines that are in interview stages
        const candidateApplicationPipelines = await this.prisma.candidateApplicationPipeline.findMany({
            where: {
                applicationPipelineId: {
                    in: interviewPipelineIds,
                },
            },
            include: {
                applicationPipeline: true,
                applicationPipelineStatus: true,
                interviewData: true,
                candidateApplication: {
                    include: {
                        candidate: {
                            select: {
                                id: true,
                                candidateFullname: true,
                                candidateEmail: true,
                                phoneNumber: true,
                            },
                        },
                        jobVacancy: {
                            include: {
                                jobRole: true,
                                employeePosition: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { createdAt: 'desc' },
            ],
        });

        // Transform the data to match the response DTO
        const data = candidateApplicationPipelines.map((pipeline) => ({
            id: pipeline.id,
            candidateApplicationId: pipeline.candidateApplicationId,
            notes: pipeline.notes,
            createdAt: pipeline.createdAt,
            updatedAt: pipeline.updatedAt,
            applicationPipeline: {
                id: pipeline.applicationPipeline.id,
                applicationPipeline: pipeline.applicationPipeline.applicationPipeline,
            },
            applicationPipelineStatus: {
                id: pipeline.applicationPipelineStatus.id,
                applicationPipelineStatus: pipeline.applicationPipelineStatus.applicationPipelineStatus,
            },
            interviewData: pipeline.interviewData
                ? {
                    id: pipeline.interviewData.id,
                    scheduledDate: pipeline.interviewData.scheduledDate,
                    scheduledStartTime: pipeline.interviewData.scheduledStartTime,
                    scheduledEndTime: pipeline.interviewData.scheduledEndTime,
                    interviewLink: pipeline.interviewData.interviewLink,
                    hrInterviewScore: pipeline.interviewData.hrInterviewScore
                        ? Number(pipeline.interviewData.hrInterviewScore)
                        : undefined,
                    userInterviewScore: pipeline.interviewData.userInterviewScore
                        ? Number(pipeline.interviewData.userInterviewScore)
                        : undefined,
                    interviewMethod: pipeline.interviewData.interviewMethod,
                    interviewLocation: pipeline.interviewData.interviewLocation,
                }
                : undefined,
            candidate: {
                id: pipeline.candidateApplication.candidate.id,
                candidateFullname: pipeline.candidateApplication.candidate.candidateFullname,
                candidateEmail: pipeline.candidateApplication.candidate.candidateEmail,
                phoneNumber: pipeline.candidateApplication.candidate.phoneNumber,
            },
            jobVacancy: {
                id: pipeline.candidateApplication.jobVacancy.id,
                jobRoleName: pipeline.candidateApplication.jobVacancy.jobRole?.jobRoleName,
                employeePosition: pipeline.candidateApplication.jobVacancy.employeePosition?.employeePosition,
            },
        }));

        return {
            data,
            total: data.length,
        };
    }
}
