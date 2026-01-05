import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class JobVacanciesService {
  private readonly logger = new Logger(JobVacanciesService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        jobSkills: true,
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
      job_skills: job.jobSkills?.map((js: any) => js.jobSkill) || [],
    }));
  }
}
