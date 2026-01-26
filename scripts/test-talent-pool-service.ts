/**
 * Test Talent Pool Service Logic
 * Simulates getUnifiedTalentPoolCandidates query
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testTalentPoolQuery() {
  console.log('🔍 Testing Talent Pool Unified Query (Simulating getUnifiedTalentPoolCandidates)\n');

  try {
    const whereClause: any = {
      isTalentPool: true,
    };

    console.log('Query where:', JSON.stringify(whereClause, null, 2));
    
    // Simulate the exact query from service
    const candidates = await prisma.candidate.findMany({
        where: whereClause,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              passwordSetRequired: true,
            },
          },
          talentPoolBatch: {
            select: {
              id: true,
              batchName: true,
              status: true,
            },
          },
          educations: true,
          workExperiences: true,
          skills: true,
          certifications: true,
          organizationExperiences: true,
          applications: {
            select: {
              id: true,
              fitScore: true,
              aiMatchStatus: true,
              aiInsight: true,
              jobVacancyId: true,
              jobVacancy: {
                select: {
                  id: true,
                  jobRole: {
                    select: { jobRoleName: true },
                  },
                },
              },
            },
            orderBy: { fitScore: 'desc' },
          },
        },
      });

    console.log(`\n📊 Results: ${candidates.length} candidates found`);

    if (candidates.length === 0) {
        console.log('⚠️  Returned 0 results! Checking why...');
        const rawCount = await prisma.candidate.count({ where: { isTalentPool: true } });
        console.log(`    Raw count of isTalentPool=true: ${rawCount}`);
        if (rawCount > 0) {
            console.log('    ! Relation includes might be causing filtering or error?');
        }
    } else {
        console.log('✅ Query success!');
        candidates.forEach((c, idx) => {
            console.log(`${idx+1}. ${c.candidateFullname} (Batch: ${c.talentPoolBatch?.batchName || 'None'})`);
            console.log(`   Applications: ${c.applications.length}`);
        });
    }

  } catch (error) {
    console.error('❌ Query Failed:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testTalentPoolQuery();
