/**
 * Test API Query: Check what findAll actually returns
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

async function testApiQuery() {
  console.log('🔍 Testing API Query (Simulating /candidate-applications endpoint)\n');

  try {
    // This is what candidate-applications.service.ts findAll() does
    const where: any = {
      candidate: {
        isTalentPool: false,
      },
    };

    console.log('Query filter:', JSON.stringify(where, null, 2));
    console.log('\n' + '='.repeat(60));

    const applications = await prisma.candidateApplication.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            candidateFullname: true,
            isTalentPool: true,
          },
        },
        jobVacancy: {
          select: {
            jobRole: { select: { jobRoleName: true } },
          },
        },
      },
    });

    console.log(`\n📊 Query Results: ${applications.length} applications found\n`);

    if (applications.length > 0) {
      console.log('⚠️  PROBLEM: Query returned applications when it should return 0!\n');
      console.log('Applications returned:');
      applications.forEach((app, idx) => {
        console.log(`\n${idx + 1}. ${app.candidate?.candidateFullname || 'Unknown'}`);
        console.log(`   Job: ${app.jobVacancy?.jobRole?.jobRoleName || 'Unknown'}`);
        console.log(`   Candidate isTalentPool: ${app.candidate?.isTalentPool}`);
        console.log(`   Application ID: ${app.id.substring(0, 8)}...`);
      });
    } else {
      console.log('✅ Query correctly returned 0 applications (as expected)');
    }

    console.log('\n' + '='.repeat(60));

    // Double-check: Query ALL applications and show their talent pool status
    const allApps = await prisma.candidateApplication.findMany({
      include: {
        candidate: {
          select: {
            candidateFullname: true,
            isTalentPool: true,
          },
        },
      },
    });

    console.log(`\n📋 All Applications in DB: ${allApps.length}`);
    const grouped = allApps.reduce((acc: any, app) => {
      const status = app.candidate?.isTalentPool ? 'Talent Pool' : 'Active';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    console.log('Breakdown:');
    Object.entries(grouped).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testApiQuery()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  });
