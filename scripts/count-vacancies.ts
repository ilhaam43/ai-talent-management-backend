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
  const count = await prisma.jobVacancy.count();
  console.log(`Total Job Vacancies in Database: ${count}`);

  const vacancies = await prisma.jobVacancy.findMany({
    select: {
      id: true,
      jobRole: {
        select: {
          jobRoleName: true
        }
      }
    }
  });
  console.log(vacancies);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
