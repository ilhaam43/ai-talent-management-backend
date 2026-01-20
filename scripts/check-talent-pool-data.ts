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
  console.log('\n=== TALENT POOL DATABASE STATS ===\n');

  const batches = await prisma.talentPoolBatch.count();
  const candidates = await prisma.talentPoolCandidate.count();
  const screenings = await prisma.talentPoolScreening.count();
  const queue = await prisma.talentPoolQueue.count();

  console.log('📦 Batches:', batches);
  console.log('👥 Candidates:', candidates);
  console.log('📋 Screenings:', screenings);
  console.log('⏳ Queue Items:', queue);

  // Get candidate details
  const candidateList = await prisma.talentPoolCandidate.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      hrStatus: true,
      cvFileName: true,
      educationData: true,
      workExperienceData: true,
      skillsData: true,
      _count: { select: { screenings: true } }
    }
  });

  console.log('\n=== TALENT POOL CANDIDATES ===\n');
  for (let i = 0; i < candidateList.length; i++) {
    const c = candidateList[i];
    console.log(`${i + 1}. ${c.fullName}`);
    console.log(`   📧 Email: ${c.email}`);
    console.log(`   📱 Phone: ${c.phone}`);
    console.log(`   📄 CV: ${c.cvFileName}`);
    console.log(`   🏷️  HR Status: ${c.hrStatus}`);
    console.log(`   📊 Screenings: ${c._count.screenings}`);
    console.log(`   📚 Education Data: ${c.educationData ? 'Yes' : 'No'}`);
    console.log(`   💼 Work Experience: ${c.workExperienceData ? 'Yes' : 'No'}`);
    console.log(`   🛠️  Skills: ${c.skillsData ? 'Yes' : 'No'}`);
    console.log('');
  }

  // Check if any data exists in main Candidate table with talent pool link
  const regularCandidates = await prisma.candidate.count();
  console.log('\n=== REGULAR CANDIDATES (for reference) ===\n');
  console.log('Total regular candidates:', regularCandidates);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
