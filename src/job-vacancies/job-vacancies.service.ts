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


  async matchJobs(criteria: { divisions?: string[]; employmentTypeId?: string }) {
    this.logger.log(`Matching jobs with criteria: ${JSON.stringify(criteria)}`);

    const { divisions, employmentTypeId } = criteria;

    const whereClause: any = {
      jobVacancyStatus: {
        jobVacancyStatus: 'OPEN',
      },
    };

    if (employmentTypeId) {
      whereClause.employmentTypeId = employmentTypeId;
    }

    if (divisions && divisions.length > 0) {
      whereClause.OR = [
        {
          division: {
            divisionName: { in: divisions, mode: 'insensitive' },
          },
        },
        {
          department: {
            departmentName: { in: divisions, mode: 'insensitive' },
          },
        },
        {
          group: {
            groupName: { in: divisions, mode: 'insensitive' },
          },
        },
        {
          directorate: {
            directorateName: { in: divisions, mode: 'insensitive' },
          },
        },
      ];
    }

    const jobs = await this.prisma.jobVacancy.findMany({
      where: whereClause,
      include: {
        jobRole: true,
        department: true,
        division: true,
        group: true,
        directorate: true,
        employmentType: true,
        employeePosition: true,
        jobVacancySkills: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    this.logger.log(`Found ${jobs.length} matching jobs for criteria.`);

    return jobs.map((job: any) => ({
      job_id: job.id,
      job_title: job.jobRole.jobRoleName,
      department:
        job.department?.departmentName ||
        job.division?.divisionName ||
        job.group?.groupName ||
        'General',
      location: job.cityLocation,
      employment_type: job.employmentType.employmentType,
      description: job.jobRequirement || 'No description provided.',
      qualifications: job.jobQualification || 'No qualifications provided.',
      min_salary: job.minSalary,
      max_salary: job.maxSalary,
      job_skills: job.jobVacancySkills?.map((js: any) => js.skill?.skillName) || [],
    }));
  }
}
