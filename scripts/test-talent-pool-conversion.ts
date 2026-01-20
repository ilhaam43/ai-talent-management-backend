/**
 * Test Talent Pool Conversion with Email
 * 
 * This script tests:
 * 1. HR Login
 * 2. Finding candidates in talent pool and database
 * 3. Converting to HR Interview stage
 * 4. Testing qualified candidates filter
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:3000';

// HR credentials (must exist in database)
const HR_USER = {
  email: 'hr@example.com',
  password: 'password123',
};

let authToken: string;

// Initialize Prisma
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================
// STEP 1: HR Login
// ============================================
async function hrLogin() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 1: HR Login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log(`   🔐 Logging in as HR: ${HR_USER.email}`);
  
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, HR_USER);
    authToken = loginRes.data.access_token;
    
    console.log(`   ✅ Login successful`);
    console.log(`   🔑 Token: ${authToken.substring(0, 20)}...`);
  } catch (error: any) {
    console.log(`   ❌ Login failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

// ============================================
// STEP 2: Find All Talent Pool Candidates in DB
// ============================================
async function findTalentPoolCandidatesInDB() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 2: Find All Talent Pool Candidates in Database');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Find candidates with isTalentPool = true (not yet converted)
  const talentPoolCandidates = await prisma.candidate.findMany({
    where: { isTalentPool: true },
    include: { 
      user: { select: { email: true, name: true } },
      applications: { select: { id: true, jobVacancyId: true } },
    },
  });

  console.log(`\n   📋 Talent Pool Candidates (isTalentPool=true): ${talentPoolCandidates.length}`);
  for (const c of talentPoolCandidates) {
    console.log(`   🟢 ${c.candidateFullname} (ID: ${c.id.substring(0, 8)}...)`);
    console.log(`      Email: ${c.user.email}`);
    console.log(`      Applications: ${c.applications.length}`);
  }

  // Find candidates that were previously talent pool but converted
  const convertedCandidates = await prisma.candidate.findMany({
    where: { 
      isTalentPool: false,
      talentPoolBatchId: { not: null },
    },
    include: { user: { select: { email: true, name: true } } },
  });

  console.log(`\n   📋 Converted Candidates (previously talent pool): ${convertedCandidates.length}`);
  for (const c of convertedCandidates) {
    console.log(`   🔵 ${c.candidateFullname} (ID: ${c.id.substring(0, 8)}...)`);
    console.log(`      Email: ${c.user.email}`);
  }

  return { talentPoolCandidates, convertedCandidates };
}

// ============================================
// STEP 3: Find and Convert Adam Bagus Habibie
// ============================================
async function findAndConvertAdam() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 3: Find and Convert Adam Bagus Habibie');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Search for Adam in database (regardless of isTalentPool status)
  const adam = await prisma.candidate.findFirst({
    where: {
      OR: [
        { candidateFullname: { contains: 'ilham', mode: 'insensitive' } },
        { candidateFullname: { contains: 'akmal', mode: 'insensitive' } },
        { candidateFullname: { contains: 'abdjul', mode: 'insensitive' } },
      ],
    },
    include: { 
      user: { select: { email: true, name: true, passwordSetRequired: true, passwordResetToken: true } },
      applications: {
        include: { 
          applicationPipeline: true,
          jobVacancy: { include: { jobRole: true } },
        },
      },
    },
  });

  if (!adam) {
    console.log('   ❌ Adam Bagus Habibie not found in database!');
    return null;
  }

  console.log(`   ✅ Found: ${adam.candidateFullname}`);
  console.log(`   📧 Email: ${adam.user.email}`);
  console.log(`   🏷️  isTalentPool: ${adam.isTalentPool}`);
  console.log(`   🔑 Password Reset Token: ${adam.user.passwordResetToken ? 'Set' : 'Not set'}`);
  console.log(`   📋 Applications: ${adam.applications.length}`);

  for (const app of adam.applications.slice(0, 3)) {
    console.log(`      - ${app.jobVacancy?.jobRole?.jobRoleName || 'Unknown Job'}`);
    console.log(`        Pipeline: ${app.applicationPipeline?.applicationPipeline || 'N/A'}`);
  }

  // Check if already converted
  if (!adam.isTalentPool) {
    console.log('\n   ⚠️  Adam was already converted from talent pool!');
    console.log('   Checking if we can still use the reset link...');
    
    if (adam.user.passwordResetToken) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      console.log(`   🔗 Reset Link: ${frontendUrl}/set-password?token=${adam.user.passwordResetToken}`);
    }
    
    return adam;
  }

  // Convert to HR Interview
  console.log('\n   🔄 Converting to HR Interview...');
  try {
    const response = await axios.post(
      `${BASE_URL}/talent-pool/convert/${adam.id}`,
      { targetPipelineStage: 'HR Interview' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('   ✅ Conversion successful!');
    console.log(`   🔑 Reset Token: ${response.data.resetToken?.substring(0, 20)}...`);
    console.log(`   🔗 Reset Link: ${response.data.resetLink}`);
    console.log(`   💬 ${response.data.message}`);

    return adam;
  } catch (error: any) {
    console.log(`   ❌ Conversion failed: ${error.response?.data?.message || error.message}`);
    return adam;
  }
}

// ============================================
// STEP 4: Test Qualified Candidates Filter
// ============================================
async function testQualifiedFilter() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 4: Test Qualified Candidates Filter');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Query directly from database
  const qualifiedApps = await prisma.candidateApplication.findMany({
    where: {
      aiMatchStatus: { in: ['MATCH', 'STRONG_MATCH'] },
    },
    include: {
      candidate: { include: { user: true } },
      jobVacancy: { include: { jobRole: true } },
      applicationPipeline: true,
    },
    orderBy: { fitScore: 'desc' },
    take: 10,
  });

  const notQualifiedCount = await prisma.candidateApplication.count({
    where: { aiMatchStatus: 'NOT_MATCH' },
  });

  console.log(`   ✅ Qualified candidates (MATCH/STRONG_MATCH): ${qualifiedApps.length}`);
  console.log(`   ❌ Not qualified candidates (NOT_MATCH): ${notQualifiedCount}\n`);

  console.log('   Top 10 qualified applications:');
  for (const app of qualifiedApps) {
    const name = app.candidate?.candidateFullname || app.candidate?.user?.name || 'Unknown';
    const icon = app.aiMatchStatus === 'STRONG_MATCH' ? '🟢' : '🟡';
    console.log(`   ${icon} ${name} - ${app.aiMatchStatus} (${app.fitScore}%)`);
    console.log(`      Job: ${app.jobVacancy?.jobRole?.jobRoleName || 'N/A'}`);
    console.log(`      Pipeline: ${app.applicationPipeline?.applicationPipeline || 'N/A'}`);
  }
}

// ============================================
// STEP 5: Get All Candidate Applications via API
// ============================================
async function getAllApplicationsViaAPI() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 5: Get All Candidate Applications via API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const response = await axios.get(`${BASE_URL}/candidate-applications`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const apps = response.data;
    console.log(`   ✅ Total applications: ${apps.length}\n`);

    // Group by pipeline stage
    const byPipeline: Record<string, number> = {};
    for (const app of apps) {
      const stage = app.applicationPipeline?.applicationPipeline || 'Unknown';
      byPipeline[stage] = (byPipeline[stage] || 0) + 1;
    }

    console.log('   📊 Applications by Pipeline Stage:');
    for (const [stage, count] of Object.entries(byPipeline)) {
      console.log(`      ${stage}: ${count}`);
    }
  } catch (error: any) {
    console.log(`   ⚠️ Error: ${error.response?.data?.message || error.message}`);
  }
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     TALENT POOL CONVERSION + EMAIL TEST                ║');
  console.log('║     Testing Adam Bagus Habibie Flow                    ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    await hrLogin();
    await findTalentPoolCandidatesInDB();
    await findAndConvertAdam();
    await testQualifiedFilter();
    await getAllApplicationsViaAPI();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     ✅ TEST COMPLETE                                   ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    
    console.log('\n📧 If conversion was performed, check email inbox!');
    console.log('   The email should contain:');
    console.log('   - Welcome message');
    console.log('   - Profile completion reminder');
    console.log('   - Set password link');
    console.log('   - Target stage: HR Interview');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
