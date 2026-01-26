/**
 * Diagnostic Script: Check Database State
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

async function diagnosticCheck() {
  console.log('🔍 Database Diagnostic Report\n');
  console.log('=' .repeat(60));

  try {
    // Check Candidates
    const allCandidates = await prisma.candidate.findMany({
      select: {
        id: true,
        candidateFullname: true,
        candidateEmail: true,
        isTalentPool: true,
      },
    });

    console.log('\n📋 CANDIDATES TABLE:');
    console.log(`Total: ${allCandidates.length}\n`);
    
    allCandidates.forEach((c, idx) => {
      const poolStatus = c.isTalentPool ? '✅ TALENT POOL' : '❌ ACTIVE';
      console.log(`${idx + 1}. ${c.candidateFullname || 'No Name'}`);
      console.log(`   Email: ${c.candidateEmail || 'No Email'}`);
      console.log(`   Status: ${poolStatus} (isTalentPool=${c.isTalentPool})`);
      console.log(`   ID: ${c.id.substring(0, 8)}...`);
      console.log('');
    });

    // Check Applications
    const allApplications = await prisma.candidateApplication.findMany({
      select: {
        id: true,
        candidate: {
          select: {
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

    console.log('=' .repeat(60));
    console.log('\n📄 CANDIDATE APPLICATIONS TABLE:');
    console.log(`Total Applications: ${allApplications.length}\n`);

    const activeApps = allApplications.filter(app => !app.candidate?.isTalentPool);
    const talentPoolApps = allApplications.filter(app => app.candidate?.isTalentPool);

    console.log(`Applications with isTalentPool=false: ${activeApps.length}`);
    console.log(`Applications with isTalentPool=true: ${talentPoolApps.length}\n`);

    if (activeApps.length > 0) {
      console.log('⚠️  PROBLEM: Found applications with isTalentPool=false:');
      activeApps.forEach((app, idx) => {
        console.log(`   ${idx + 1}. ${app.candidate?.candidateFullname} - ${app.jobVacancy?.jobRole?.jobRoleName}`);
      });
    }

    // What the API query would return
    console.log('\n' + '='.repeat(60));
    console.log('\n🔎 WHAT API RETURNS:');
    console.log('\nActive Candidates endpoint (/candidate-applications):');
    console.log(`Should show: ${activeApps.length} candidates`);
    
    console.log('\nTalent Pool endpoint (/talent-pool/unified):');
    console.log(`Should show: ${talentPoolApps.length} candidates`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Diagnostic complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

diagnosticCheck()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  });
