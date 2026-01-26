
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkApplications() {
  console.log('🔍 Checking Candidate Applications for Ilhaam...\n');

  try {
    // Find candidate by exact name match (or email if known)
    const candidate = await prisma.candidate.findFirst({
        where: { candidateFullname: { contains: 'ILHAAM', mode: 'insensitive' } },
        include: { applications: true }
    });

    if (!candidate) {
        console.log('❌ Candidate ILHAAM not found');
        return;
    }

    console.log(`Candidate: ${candidate.candidateFullname} (${candidate.candidateEmail})`);
    console.log(`Is Talent Pool: ${candidate.isTalentPool}`);
    
    const apps = await prisma.candidateApplication.findMany({
        where: { candidateId: candidate.id },
        include: {
            jobVacancy: { include: { jobRole: true } },
            applicationPipeline: true
        }
    });

    console.log(`Found ${apps.length} applications:\n`);

    apps.forEach((app, idx) => {
        console.log(`${idx+1}. Job: ${app.jobVacancy.jobRole.jobRoleName}`);
        console.log(`   Pipeline: ${app.applicationPipeline.applicationPipeline}`);
        console.log(`   App ID: ${app.id}`);
        console.log('---');
    });

  } catch (error) {
    console.error('❌ Query Failed:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkApplications();
