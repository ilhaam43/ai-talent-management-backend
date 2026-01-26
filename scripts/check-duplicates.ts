
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkDuplicates() {
  console.log('🔍 Checking for duplicates...\n');

  // 1. Check Job Roles
  const jobRoles = await prisma.jobRole.groupBy({
    by: ['jobRoleName'],
    _count: {
      jobRoleName: true
    },
    having: {
      jobRoleName: {
        _count: {
          gt: 1
        }
      }
    }
  });

  if (jobRoles.length > 0) {
    console.log(`⚠️ Found ${jobRoles.length} duplicate Job Roles:`);
    for (const role of jobRoles) {
      console.log(`   - "${role.jobRoleName}": ${role._count.jobRoleName} copies`);
    }
  } else {
    console.log('✅ No duplicate Job Roles found.');
  }

  // 2. Check Job Vacancies (by Role + Position)
  const vacancies = await prisma.jobVacancy.findMany({
    include: {
      jobRole: true,
      employeePosition: true
    }
  });

  // Group manually since we need relation data
  const vacancyMap = new Map();
  for (const v of vacancies) {
    const key = `${v.jobRole.jobRoleName}-${v.employeePosition.employeePosition}`;
    if (!vacancyMap.has(key)) vacancyMap.set(key, 0);
    vacancyMap.set(key, vacancyMap.get(key) + 1);
  }

  let dupVacancyCount = 0;
  console.log('\n🔍 Checking Job Vacancies...');
  for (const [key, count] of vacancyMap.entries()) {
    if (count > 1) {
      console.log(`   - "${key}": ${count} copies`);
      dupVacancyCount++;
    }
  }

  if (dupVacancyCount === 0) console.log('✅ No duplicate Job Vacancies found.');

  await prisma.$disconnect();
  await pool.end();
}

checkDuplicates().catch(console.error);
