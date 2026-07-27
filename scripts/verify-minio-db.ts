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
  console.log('--- Candidate Documents Storage Info ---');
  const docs = await prisma.candidateDocument.findMany({
    select: {
      id: true,
      filePath: true,
      objectKey: true,
      bucket: true,
      storageType: true,
      uploadStatus: true,
      originalName: true,
    }
  });
  console.log(docs);

  console.log('\n--- Candidates CV Storage Info ---');
  const candidates = await prisma.candidate.findMany({
    where: {
      cvFileUrl: { not: null }
    },
    select: {
      id: true,
      candidateFullname: true,
      cvFileUrl: true,
      cvFileName: true,
      cvStorageType: true,
    }
  });
  console.log(candidates);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
