import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { CreateJobVacancyDto } from './dto/create-job-vacancy.dto';
import { UpdateJobVacancyDto } from './dto/update-job-vacancy.dto';
import { NotificationsService } from '../notifications/notifications.service';


@Injectable()
export class JobVacanciesService {
  private readonly logger = new Logger(JobVacanciesService.name);

  // Standard includes for all queries
  private readonly standardIncludes = {
    jobRole: true,
    department: true,
    division: true,
    group: true,
    directorate: true,
    employmentType: true,
    employeePosition: true,
    jobVacancyStatus: true,
    jobVacancyDuration: true,
    jobVacancyReason: true,
    jobVacancySkills: { include: { skill: true } },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) { }

  async create(createJobVacancyDto: CreateJobVacancyDto, createdByUserId: string) {
    const { skills, ...data } = createJobVacancyDto;

    // Default status to 'OPEN' if not provided
    if (!data.jobVacancyStatusId) {
      const openStatus = await this.prisma.jobVacancyStatus.findFirst({
        where: { jobVacancyStatus: 'OPEN' }
      });
      if (openStatus) {
        data.jobVacancyStatusId = openStatus.id;
      } else {
        this.logger.warn("Status 'OPEN' not found, creating without statusId might fail if required by DB");
      }
    }

    // Resolve skills to IDs
    let skillResolutions: { skillId: string }[] = [];
    if (skills && skills.length > 0) {
      const foundSkills = await (this.prisma as any).skill.findMany({
        where: { skillName: { in: skills, mode: 'insensitive' } }
      });
      skillResolutions = foundSkills.map((s: any) => ({ skillId: s.id }));
    }

    const newJobVacancy = await this.prisma.jobVacancy.create({
      data: {
        ...data,
        jobVacancySkills: {
          create: skillResolutions
        }
      } as any,
      include: this.standardIncludes
    });

    await this.notificationsService.notifyJobVacancyCreated(
      (newJobVacancy as any).jobRole?.jobRoleName || 'Position',
      newJobVacancy.id,
      createdByUserId,
    );

    return newJobVacancy;
  }

  async findAll() {
    return this.prisma.jobVacancy.findMany({
      include: this.standardIncludes,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.jobVacancy.findUnique({
      where: { id },
      include: this.standardIncludes,
    });
    if (!job) throw new NotFoundException(`Job Vacancy with ID ${id} not found`);
    return job;
  }

  async update(id: string, updateJobVacancyDto: UpdateJobVacancyDto, updatedByUserId: string) {
    const { skills, ...data } = updateJobVacancyDto;

    // Check if exists
    await this.findOne(id);

    const updated = await this.prisma.$transaction(async (prisma) => {
      // Update basic fields
      if (Object.keys(data).length > 0) {
        await prisma.jobVacancy.update({
          where: { id },
          data: data
        });
      }

      // Update skills if provided
      if (skills) {
        // Find IDs
        const foundSkills = await (prisma as any).skill.findMany({
          where: { skillName: { in: skills, mode: 'insensitive' } }
        });
        const skillIds = foundSkills.map((s: any) => s.id);

        // Replace skills: Delete all existing, then add new
        await prisma.jobVacancySkill.deleteMany({
          where: { jobVacancyId: id }
        });

        if (skillIds.length > 0) {
          await prisma.jobVacancySkill.createMany({
            data: skillIds.map((sid: string) => ({
              jobVacancyId: id,
              skillId: sid
            }))
          });
        }
      }

      return prisma.jobVacancy.findUnique({
        where: { id },
        include: {
          jobRole: true,
          department: true,
          division: true,
          group: true,
          directorate: true,
          employmentType: true,
          employeePosition: true,
          jobVacancyStatus: true,
          jobVacancyDuration: true,
          jobVacancyReason: true,
          jobVacancySkills: { include: { skill: true } },
        }
      });
    });

    if (updated) {
      await this.notificationsService.notifyJobVacancyUpdated(
        (updated as any).jobRole?.jobRoleName || 'Position',
        updated.id,
        updatedByUserId,
      );
    }

    return updated;
  }

  /**
   * Soft delete: set status to CLOSED instead of hard delete
   */
  async remove(id: string) {
    await this.findOne(id); // Ensure exists

    // Find the CLOSED status
    const closedStatus = await this.prisma.jobVacancyStatus.findFirst({
      where: { jobVacancyStatus: 'CLOSED' }
    });

    if (!closedStatus) {
      this.logger.error("Status 'CLOSED' not found in database. Cannot soft delete.");
      throw new NotFoundException("Status 'CLOSED' not found. Please seed the database with a CLOSED status.");
    }

    return this.prisma.jobVacancy.update({
      where: { id },
      data: {
        jobVacancyStatusId: closedStatus.id,
        jobVacancyClosedAt: new Date(),
      },
      include: this.standardIncludes
    });
  }

  /**
   * Cron job: runs every hour to auto-close expired job vacancies.
   * Uses Jakarta timezone (Asia/Jakarta, UTC+7).
   */
  @Cron('0 * * * *') // Every hour at minute 0
  async closeExpiredJobs() {
    this.logger.log('Running auto-close expired jobs cron (Jakarta timezone)...');

    try {
      // Get current time in Jakarta (UTC+7)
      const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      this.logger.log(`Current Jakarta time: ${nowJakarta.toISOString()}`);

      // Find the OPEN status
      const openStatus = await this.prisma.jobVacancyStatus.findFirst({
        where: { jobVacancyStatus: 'OPEN' }
      });
      if (!openStatus) {
        this.logger.warn("Status 'OPEN' not found, skipping auto-close.");
        return;
      }

      // Find the CLOSED status
      const closedStatus = await this.prisma.jobVacancyStatus.findFirst({
        where: { jobVacancyStatus: 'CLOSED' }
      });
      if (!closedStatus) {
        this.logger.warn("Status 'CLOSED' not found, skipping auto-close.");
        return;
      }

      // Find all OPEN jobs with their duration
      const openJobs = await this.prisma.jobVacancy.findMany({
        where: { jobVacancyStatusId: openStatus.id },
        include: { jobVacancyDuration: true, jobRole: true },
      });

      let closedCount = 0;

      for (const job of openJobs) {
        const durationDays = job.jobVacancyDuration?.daysDuration;
        if (!durationDays) continue;

        // Calculate expiry date: createdAt + daysDuration
        const createdAt = new Date(job.createdAt);
        const expiryDate = new Date(createdAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

        if (nowJakarta >= expiryDate) {
          // Job has expired, close it
          await this.prisma.jobVacancy.update({
            where: { id: job.id },
            data: {
              jobVacancyStatusId: closedStatus.id,
              jobVacancyClosedAt: new Date(),
            },
          });
          closedCount++;
          this.logger.log(`Auto-closed expired job: ${(job as any).jobRole?.jobRoleName || job.id} (created: ${createdAt.toISOString()}, duration: ${durationDays} days)`);
        }
      }

      if (closedCount > 0) {
        this.logger.log(`Auto-closed ${closedCount} expired job(s).`);
      } else {
        this.logger.log('No expired jobs found.');
      }
    } catch (error: any) {
      this.logger.error(`Error in closeExpiredJobs cron: ${error.message}`);
    }
  }


  async matchJobs(criteria: { divisions?: string[]; selectedTracks?: string[]; employmentTypeId?: string }) {
    this.logger.log(`Matching jobs with criteria: ${JSON.stringify(criteria)}`);

    // Accept either 'divisions' or 'selectedTracks' (alias for n8n compatibility)
    let divisions = criteria.divisions || criteria.selectedTracks;
    const { employmentTypeId } = criteria;

    this.logger.log(`Received raw divisions/selectedTracks: ${JSON.stringify(divisions)} (Type: ${typeof divisions})`);

    // Ensure divisions is an array (handle potential single string from n8n)
    if (typeof divisions === 'string') {
      divisions = [divisions];
    }

    // Build where clause - start with empty object
    const whereClause: any = {};

    // Filter for OPEN jobs
    whereClause.jobVacancyStatus = { jobVacancyStatus: 'OPEN' };

    if (employmentTypeId) {
      whereClause.employmentTypeId = employmentTypeId;
    }

    // Build OR conditions for each division/track
    if (divisions && Array.isArray(divisions) && divisions.length > 0) {
      const orConditions: any[] = [];

      for (const div of divisions) {
        if (!div || typeof div !== 'string' || div.trim() === '') continue;

        const searchTerm = div.trim();
        orConditions.push(
          { division: { divisionName: { contains: searchTerm, mode: 'insensitive' } } },
          { department: { departmentName: { contains: searchTerm, mode: 'insensitive' } } },
          { group: { groupName: { contains: searchTerm, mode: 'insensitive' } } },
          { directorate: { directorateName: { contains: searchTerm, mode: 'insensitive' } } }
        );
      }

      if (orConditions.length > 0) {
        whereClause.OR = orConditions;
      }
    }

    this.logger.log(`Building query with whereClause: ${JSON.stringify(whereClause)}`);

    try {
      const jobs = await this.prisma.jobVacancy.findMany({
        where: whereClause,
        include: {
          jobRole: true,
          employmentType: true,
          department: true,
          division: true,
          group: true,
          directorate: true,
          jobVacancySkills: {
            include: {
              skill: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      });

      this.logger.log(`Found ${jobs.length} matching jobs for criteria.`);

      return jobs.map((job: any) => ({
        job_id: job.id,
        job_title: job.jobRole?.jobRoleName || 'Unknown Role',
        department: job.department?.departmentName ||
          job.division?.divisionName ||
          job.group?.groupName ||
          job.directorate?.directorateName ||
          'General',
        location: job.cityLocation || 'Not specified',
        employment_type: job.employmentType?.employmentType || 'Full-time',
        description: job.jobRequirement || 'No description provided.',
        qualifications: job.jobQualification || 'No qualifications provided.',
        min_salary: job.minSalary,
        max_salary: job.maxSalary,
        job_skills: job.jobVacancySkills?.map((js: any) => js.skill?.skillName).filter(Boolean) || [],
      }));
    } catch (error: any) {
      this.logger.error(`Error in matchJobs: ${error.message}`);
      return [];
    }
  }
}
