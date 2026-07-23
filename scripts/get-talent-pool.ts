import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@db:5432/ai_talent_db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log('Connecting to database...');
    
    // Active Candidates
    const activeCandidates = await prisma.candidate.count();
    console.log(`Total Active Candidates: ${activeCandidates}`);

    // Candidate Applications
    const activeApplications = await prisma.candidateApplication.count();
    console.log(`Total Candidate Applications: ${activeApplications}`);

    // Candidate Applications that are in Talent Pool
    const talentPoolApps = await prisma.candidateApplication.count({
      where: {
        isTalentPool: true
      }
    });
    console.log(`Candidate Applications in Talent Pool (isTalentPool = true): ${talentPoolApps}`);

    console.log('\n==================================================');
    console.log('          TALENT POOL CANDIDATE APPLICATIONS');
    console.log('==================================================');
    const dbCandidates = await prisma.candidateApplication.findMany({
      where: {
        isTalentPool: true
      },
      take: 20,
      select: {
        id: true,
        fitScore: true,
        aiMatchStatus: true,
        candidate: {
          select: {
            candidateFullname: true,
            phoneNumber: true,
            linkedInUrl: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
        jobVacancy: {
          select: {
            jobRole: {
              select: {
                jobRoleName: true
              }
            }
          }
        },
        applicationLastStatus: {
          select: {
            applicationLastStatus: true
          }
        }
      }
    });

    for (const app of dbCandidates) {
      console.log(`- Candidate: ${app.candidate?.candidateFullname}`);
      console.log(`  Email: ${app.candidate?.user?.email || 'N/A'}`);
      console.log(`  Phone: ${app.candidate?.phoneNumber || 'N/A'}`);
      console.log(`  Application ID: ${app.id}`);
      console.log(`  Job: ${app.jobVacancy?.jobRole?.jobRoleName}`);
      console.log(`  Score: ${app.fitScore}%`);
      console.log(`  AI Status: ${app.aiMatchStatus}`);
      console.log(`  Last Status: ${app.applicationLastStatus?.applicationLastStatus}`);
      console.log('--------------------------------------------------');
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
