import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const apps = await prisma.candidateApplication.findMany({
    where: {
      candidate: {
        candidateEmail: 'rezaazhar.p@gmail.com'
      }
    },
    select: {
      id: true,
      jobVacancyId: true,
      createdAt: true,
      aiMatchStatus: true,
      fitScore: true,
      jobVacancy: {
        select: {
          jobRole: {
            select: { jobRoleName: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log('TOTAL APPLICATIONS:', apps.length);
  apps.forEach((a, i) => {
    console.log(`APP[${i}]: ${a.jobVacancy?.jobRole?.jobRoleName} | status=${a.aiMatchStatus} | score=${a.fitScore} | created=${a.createdAt}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
