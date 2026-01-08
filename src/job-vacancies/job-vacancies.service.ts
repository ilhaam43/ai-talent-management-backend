import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateJobVacancyDto } from './dto/create-job-vacancy.dto';
import { UpdateJobVacancyDto } from './dto/update-job-vacancy.dto';

@Injectable()
export class JobVacanciesService {
  private readonly logger = new Logger(JobVacanciesService.name);

  constructor(private readonly prisma: PrismaService) { }

  async create(createJobVacancyDto: CreateJobVacancyDto) {
    const { skills, ...data } = createJobVacancyDto;

    // Resolve skills to IDs
    let skillResolutions: { skillId: string }[] = [];
    if (skills && skills.length > 0) {
      const foundSkills = await (this.prisma as any).skill.findMany({
        where: { skillName: { in: skills, mode: 'insensitive' } }
      });
      skillResolutions = foundSkills.map((s: any) => ({ skillId: s.id }));
    }

    return this.prisma.jobVacancy.create({
      data: {
        ...data,
        jobVacancySkills: {
          create: skillResolutions
        }
      } as any,
      include: {
        jobVacancySkills: { include: { skill: true } }
      }
    });
  }

  async findAll() {
    return this.prisma.jobVacancy.findMany({
      include: {
        jobRole: true,
        department: true,
        division: true,
        group: true,
        directorate: true,
        employmentType: true,
        employeePosition: true,
        jobVacancySkills: { include: { skill: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.jobVacancy.findUnique({
      where: { id },
      include: {
        jobRole: true,
        department: true,
        division: true,
        group: true,
        directorate: true,
        employmentType: true,
        employeePosition: true,
        jobVacancySkills: { include: { skill: true } },
      },
    });
    if (!job) throw new NotFoundException(`Job Vacancy with ID ${id} not found`);
    return job;
  }

  async update(id: string, updateJobVacancyDto: UpdateJobVacancyDto) {
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
          jobVacancySkills: { include: { skill: true } }
        }
      });
    });

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists
    return this.prisma.jobVacancy.delete({ where: { id } });
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

    // Only filter by status if we need to - for now, return all jobs
    // Filter for OPEN jobs
    whereClause.jobVacancyStatus = { jobVacancyStatus: 'OPEN' };

    if (employmentTypeId) {
      whereClause.employmentTypeId = employmentTypeId;
    }

    // Build OR conditions for each division/track
    // Supports both exact match and partial/contains match
    if (divisions && Array.isArray(divisions) && divisions.length > 0) {
      const orConditions: any[] = [];
      
      for (const div of divisions) {
        if (!div || typeof div !== 'string' || div.trim() === '') continue;
        
        const searchTerm = div.trim();
        // Add contains match for each division name
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

    // Start with basic query - no filtering to debug
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
        take: 20, // Limit results
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
      // Return empty array instead of throwing to allow workflow to continue
      return [];
    }
  }
}
