import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
    ActionCenterFilterDto,
    ActionCenterSummaryDto,
    ActionCenterTaskDto,
    TaskTypeFilter,
} from './dto/action-center.dto';

@Injectable()
export class ActionCenterService {
    private readonly logger = new Logger(ActionCenterService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get summary counts for action center dashboard
     */
    async getSummary(): Promise<ActionCenterSummaryDto> {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Pending Approval: AI SCREENING stage
        const pendingApproval = await this.prisma.candidateApplication.count({
            where: {
                applicationPipeline: {
                    applicationPipeline: 'AI SCREENING',
                },
            },
        });

        const pendingApprovalYesterday = await this.prisma.candidateApplication.count({
            where: {
                applicationPipeline: {
                    applicationPipeline: 'AI SCREENING',
                },
                createdAt: {
                    lt: yesterday,
                },
            },
        });

        // Scheduling Needed: INTERVIEW stages
        const schedulingNeeded = await this.prisma.candidateApplication.count({
            where: {
                applicationPipeline: {
                    applicationPipeline: {
                        startsWith: 'INTERVIEW',
                    },
                },
            },
        });

        const schedulingNeededYesterday = await this.prisma.candidateApplication.count({
            where: {
                applicationPipeline: {
                    applicationPipeline: {
                        startsWith: 'INTERVIEW',
                    },
                },
                createdAt: {
                    lt: yesterday,
                },
            },
        });

        // Waiting Feedback: OFFERING stage
        const waitingFeedback = await this.prisma.candidateApplication.count({
            where: {
                applicationPipeline: {
                    applicationPipeline: 'OFFERING',
                },
            },
        });

        const waitingFeedbackYesterday = await this.prisma.candidateApplication.count({
            where: {
                applicationPipeline: {
                    applicationPipeline: 'OFFERING',
                },
                createdAt: {
                    lt: yesterday,
                },
            },
        });

        // Onboarding Soon: HIRED stage
        const onboardingSoon = await this.prisma.candidateApplication.count({
            where: {
                applicationPipeline: {
                    applicationPipeline: 'HIRED',
                },
            },
        });

        const onboardingSoonYesterday = await this.prisma.candidateApplication.count({
            where: {
                applicationPipeline: {
                    applicationPipeline: 'HIRED',
                },
                createdAt: {
                    lt: yesterday,
                },
            },
        });

        return {
            pendingApproval,
            pendingApprovalChange: pendingApproval - pendingApprovalYesterday,
            schedulingNeeded,
            schedulingNeededChange: schedulingNeeded - schedulingNeededYesterday,
            waitingFeedback,
            waitingFeedbackChange: waitingFeedback - waitingFeedbackYesterday,
            onboardingSoon,
            onboardingSoonChange: onboardingSoon - onboardingSoonYesterday,
        };
    }

    /**
     * Get tasks/applications requiring action with filters
     */
    async getTasks(filters: ActionCenterFilterDto): Promise<ActionCenterTaskDto[]> {
        const where: any = {};

        // Apply task type filter
        if (filters.taskType) {
            switch (filters.taskType) {
                case TaskTypeFilter.JOB_ROLE_REQUEST:
                    // Job Role Request: Filter by DRAFT job vacancy status
                    where.jobVacancy = {
                        jobVacancyStatus: {
                            jobVacancyStatus: 'DRAFT',
                        },
                    };
                    break;

                case TaskTypeFilter.ONLINE_ASSESSMENT:
                    where.applicationPipeline = {
                        applicationPipeline: 'ONLINE ASESSMENT',
                    };
                    break;

                case TaskTypeFilter.INTERVIEW:
                    where.applicationPipeline = {
                        applicationPipeline: {
                            startsWith: 'INTERVIEW',
                        },
                    };
                    break;

                case TaskTypeFilter.OFFER_LETTER:
                    where.applicationPipeline = {
                        applicationPipeline: 'OFFERING',
                    };
                    break;

                case TaskTypeFilter.MCU:
                    where.applicationPipeline = {
                        applicationPipeline: 'MEDICAL CHECKUP',
                    };
                    break;

                case TaskTypeFilter.ONBOARDING:
                    where.applicationPipeline = {
                        applicationPipeline: 'HIRED',
                    };
                    break;
            }
        }

        // Apply job vacancy status filter
        if (filters.jobVacancyStatus) {
            where.jobVacancy = {
                ...where.jobVacancy,
                jobVacancyStatus: {
                    jobVacancyStatus: filters.jobVacancyStatus,
                },
            };
        }

        // Apply department filter
        if (filters.departmentId) {
            where.jobVacancy = {
                ...where.jobVacancy,
                departmentId: filters.departmentId,
            };
        }

        // Apply search filter
        if (filters.search) {
            where.jobVacancy = {
                ...where.jobVacancy,
                jobRole: {
                    jobRoleName: {
                        contains: filters.search,
                        mode: 'insensitive',
                    },
                },
            };
        }

        const applications = await this.prisma.candidateApplication.findMany({
            where,
            include: {
                candidate: {
                    include: {
                        user: true,
                    },
                },
                jobVacancy: {
                    include: {
                        jobRole: true,
                        department: true,
                        jobVacancyStatus: true,
                    },
                },
                applicationPipeline: true,
            },
            orderBy: {
                submissionDate: 'desc',
            },
        });

        return applications.map((app) => ({
            id: app.id,
            jobRole: app.jobVacancy.jobRole?.jobRoleName || 'N/A',
            pic: 'ASE', // TODO: Determine PIC logic (could be from hiring manager or HR assignment)
            department: app.jobVacancy.department?.departmentName || 'Collaboration',
            task: this.getTaskName(app.applicationPipeline.applicationPipeline, app.jobVacancy.jobVacancyStatus?.jobVacancyStatus),
            dateRequired: app.submissionDate,
            candidateName: app.candidate.user.name,
            pipelineStage: app.applicationPipeline.applicationPipeline,
            jobVacancyStatus: app.jobVacancy.jobVacancyStatus?.jobVacancyStatus || 'N/A',
        }));
    }

    /**
     * Get a single task by ID
     */
    async getTaskById(id: string): Promise<ActionCenterTaskDto | null> {
        const app = await this.prisma.candidateApplication.findUnique({
            where: { id },
            include: {
                candidate: {
                    include: {
                        user: true,
                    },
                },
                jobVacancy: {
                    include: {
                        jobRole: true,
                        department: true,
                        jobVacancyStatus: true,
                    },
                },
                applicationPipeline: true,
            },
        });

        if (!app) {
            return null;
        }

        return {
            id: app.id,
            jobRole: app.jobVacancy.jobRole?.jobRoleName || 'N/A',
            pic: 'ASE',
            department: app.jobVacancy.department?.departmentName || 'Collaboration',
            task: this.getTaskName(app.applicationPipeline.applicationPipeline, app.jobVacancy.jobVacancyStatus?.jobVacancyStatus),
            dateRequired: app.submissionDate,
            candidateName: app.candidate.user.name,
            pipelineStage: app.applicationPipeline.applicationPipeline,
            jobVacancyStatus: app.jobVacancy.jobVacancyStatus?.jobVacancyStatus || 'N/A',
        };
    }

    /**
     * Map pipeline stage to user-friendly task name
     */
    private getTaskName(pipelineStage: string, jobVacancyStatus?: string): string {
        // Job Role Request is for DRAFT job vacancies (awaiting approval)
        if (jobVacancyStatus === 'DRAFT') {
            return 'Job Role Request';
        }

        const mapping: Record<string, string> = {
            'AI SCREENING': 'AI Screening',
            'ONLINE ASESSMENT': 'Online Assessment',
            'INTERVIEW USER 1': 'Interview',
            'INTERVIEW USER 2': 'Interview',
            'INTERVIEW DIRECTOR': 'Interview',
            OFFERING: 'Offer Letter',
            'MEDICAL CHECKUP': 'MCU',
            HIRED: 'Onboarding',
        };

        return mapping[pipelineStage] || pipelineStage;
    }
}
