import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as uuid from 'uuid';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Job Vacancies...');

  // Ensure necessary reference data exists
  // For simplicity, we create them if missing or pick existing.
  
  // 1. Employee Position
  let position = await prisma.employeePosition.findFirst({ where: { employeePosition: 'Staff' } });
  if (!position) {
     position = await prisma.employeePosition.create({ data: { employeePosition: 'Staff' } });
  }

  // 2. Job Status
  let status = await prisma.jobVacancyStatus.findFirst({ where: { jobVacancyStatus: 'OPEN' } });
  if (!status) {
      status = await prisma.jobVacancyStatus.create({ data: { jobVacancyStatus: 'OPEN' } });
  }

  // 3. Duration
   let duration = await prisma.jobVacancyDuration.findFirst();
  if (!duration) {
      duration = await prisma.jobVacancyDuration.create({ data: { daysDuration: 30 } });
  }

  // 4. Employment Type
  let employmentType = await prisma.employmentType.findFirst({ where: { employmentType: 'Full-time' } });
  if (!employmentType) {
      employmentType = await prisma.employmentType.create({ data: { employmentType: 'Full-time' } });
  }

  // 5. Divisions / Departments (Reference Context)
  const departments = [
    { name: 'Cloud', type: 'Department' },
    { name: 'IT Services', type: 'Department' },
    { name: 'Cybersecurity', type: 'Department' }
  ];

  const jobsData = [
    {
      role: 'Cloud Engineer',
      dept: 'Cloud',
      req: 'Deep understanding of AWS/Azure, Kubernetes, and Terraform.',
      qual: 'Bachelor Degree in CS, AWS Certified Solutions Architect.',
      minSal: 15000000,
      maxSal: 25000000
    },
    {
       role: 'IT Support Specialist',
       dept: 'IT Services',
       req: 'Experience with Windows/Mac OS, basic networking, and helpdesk tools.',
       qual: 'Diploma/Bachelor in IT.',
       minSal: 6000000,
       maxSal: 9000000
    },
    {
        role: 'Security Analyst',
        dept: 'Cybersecurity',
        req: 'Knowledge of SIEM, IDS/IPS, and incident response.',
        qual: 'Bachelor in CS/Cybersecurity, CEH/CISSP is a plus.',
        minSal: 12000000,
        maxSal: 18000000
    }
  ];

  for (const job of jobsData) {
      // Find or create job role
      let jobRole = await prisma.jobRole.findFirst({ where: { jobRoleName: job.role } });
      if (!jobRole) {
          jobRole = await prisma.jobRole.create({ data: { jobRoleName: job.role } });
      }

      // Find or create department
      let department = await prisma.department.findFirst({ where: { departmentName: job.dept } });
      if (!department) {
          department = await prisma.department.create({ data: { departmentName: job.dept } });
      }

      // Create Job Vacancy
      const vacancy = await prisma.jobVacancy.create({
          data: {
              jobRoleId: jobRole.id,
              employeePositionId: position.id,
              jobVacancyStatusId: status.id,
              jobVacancyDurationId: duration.id,
              employmentTypeId: employmentType.id,
              departmentId: department.id,
              jobRequirement: job.req,
              jobQualification: job.qual,
              minSalary: job.minSal,
              maxSalary: job.maxSal,
              cityLocation: 'Jakarta',
          }
      });

      console.log(`   Created Job: ${job.role} in ${job.dept} (ID: ${vacancy.id})`);
  }

  console.log('✅ Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
