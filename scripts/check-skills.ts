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
  const candidate = await prisma.candidate.findFirst({
    where: { candidateEmail: 'rezaazhar.p@gmail.com' },
    select: {
      id: true,
      skills: {
        select: {
          candidateSkill: true,
          candidateRating: true,
        }
      }
    }
  });

  if (!candidate) {
    console.log('Candidate not found');
    return;
  }

  console.log(`Total skills: ${candidate.skills.length}`);
  candidate.skills.forEach((s, i) => {
    console.log(`SKILL[${i}]: "${s.candidateSkill}" | rating=${s.candidateRating}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
