import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:3000';

// HR credentials (must exist in database)
const HR_USER = {
  email: 'hr@example.com', // HR user email from database
  password: 'password123', // From seed-hr-hiring-manager.ts
};

// Test CV files
const TEST_CV_FILES = [
  path.join(__dirname, '..', 'test-files', 'CV Adam Bagus Habibie Al Rasyid.pdf'),
  path.join(__dirname, '..', 'test-files', "CV Athoillah updated'23.pdf"),
  path.join(__dirname, '..', 'test-files', 'Muhammad-Reza-Azhar-Priyadi-Resume.pdf'),
  path.join(__dirname, '..', 'test-files', 'CV_Aditiya Purwansyah.pdf'),
  path.join(__dirname, '..', 'test-files', 'Ilhaam Akmal Abdjul-resume (5) conv.pdf'),
];

let authToken: string;
let employeeId: string;
let batchId: string;

// Initialize Prisma
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Step timing tracking
interface StepTiming {
  step: string;
  duration: number;
}
const stepTimings: StepTiming[] = [];

// Helper to time a step
async function timeStep<T>(stepName: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  stepTimings.push({ step: stepName, duration });
  return result;
}

// ============================================
// STEP 1: HR Login
// ============================================
async function hrLogin() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 1: HR Login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('HR Login', async () => {
    console.log(`   🔐 Logging in as HR: ${HR_USER.email}`);
    
    try {
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, HR_USER);
      authToken = loginRes.data.access_token;
      employeeId = loginRes.data.user.employeeId;
      
      console.log(`   ✅ Login successful`);
      console.log(`   👤 Employee ID: ${employeeId}`);
      console.log(`   🔑 Token: ${authToken.substring(0, 20)}...`);
    } catch (error: any) {
      console.log(`   ❌ Login failed: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  });
}

// ============================================
// STEP 2: Show Existing Candidate Applications
// ============================================
async function showCandidateApplications() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 2: Show Existing Candidate Applications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('List Candidate Applications', async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/candidate-applications`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const apps = response.data;
      console.log(`   ✅ Found ${apps.length} candidate application(s)\n`);
      
      for (let i = 0; i < Math.min(apps.length, 10); i++) {
        const app = apps[i];
        const statusIcon = app.aiMatchStatus === 'STRONG_MATCH' ? '🟢' : 
                          app.aiMatchStatus === 'MATCH' ? '🟡' : '🔴';
        
        console.log(`   ${i + 1}. ${app.candidate?.candidateName || 'Unknown'}`);
        console.log(`      Job: ${app.jobVacancy?.jobRole?.jobRoleName || 'N/A'}`);
        console.log(`      ${statusIcon} Score: ${app.fitScore || 'N/A'} | Status: ${app.aiMatchStatus || 'N/A'}`);
        console.log(`      Pipeline: ${app.applicationPipeline?.applicationPipeline || 'N/A'}`);
        console.log('');
      }
      
      if (apps.length > 10) {
        console.log(`   ... and ${apps.length - 10} more`);
      }
    } catch (error: any) {
      console.log(`   ⚠️  Error: ${error.response?.data?.message || error.message}`);
    }
  });
}

// ============================================
// STEP 3: Check Open Jobs
// ============================================
async function showOpenJobs() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 3: Check Open Jobs for Talent Pool Screening');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('List Open Jobs', async () => {
    const openJobs = await prisma.jobVacancy.findMany({
      where: {
        jobVacancyStatus: { jobVacancyStatus: 'OPEN' }
      },
      include: {
        jobRole: true,
        division: true,
      }
    });

    console.log(`   ✅ Found ${openJobs.length} OPEN job vacancies\n`);
    
    for (let i = 0; i < openJobs.length; i++) {
      const job = openJobs[i];
      console.log(`   ${i + 1}. ${job.jobRole?.jobRoleName || 'N/A'}`);
      console.log(`      Division: ${job.division?.divisionName || 'N/A'}`);
    }
    console.log('\n   📌 Talent Pool will screen CVs against ALL these jobs');
  });
}

// ============================================
// STEP 4: Upload Bulk CVs
// ============================================
async function uploadBulkCVs() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 4: Upload Bulk CVs to Talent Pool');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('Upload Bulk CVs', async () => {
    // Check which files exist
    const existingFiles: string[] = [];
    for (const filePath of TEST_CV_FILES) {
      if (fs.existsSync(filePath)) {
        existingFiles.push(filePath);
        console.log(`   ✅ Found: ${path.basename(filePath)}`);
      } else {
        console.log(`   ❌ Missing: ${path.basename(filePath)}`);
      }
    }

    if (existingFiles.length === 0) {
      throw new Error('No CV files found to upload');
    }

    console.log(`\n   📤 Uploading ${existingFiles.length} CV(s)...`);

    const form = new FormData();
    for (const filePath of existingFiles) {
      form.append('files', fs.createReadStream(filePath));
    }
    form.append('sourceType', 'MANUAL_UPLOAD');
    form.append('batchName', `Test Batch ${new Date().toISOString().split('T')[0]}`);

    try {
      const response = await axios.post(
        `${BASE_URL}/talent-pool/upload`,
        form,
        { 
          headers: { 
            Authorization: `Bearer ${authToken}`,
            ...form.getHeaders(),
          },
          timeout: 60000,
        }
      );

      batchId = response.data.batch.id;
      console.log(`   ✅ Upload successful`);
      console.log(`   📦 Batch ID: ${batchId}`);
      console.log(`   📁 Total Files: ${response.data.batch.totalFiles}`);
      console.log(`   📋 Status: ${response.data.batch.status}`);
      console.log(`   💬 ${response.data.message}`);
    } catch (error: any) {
      console.log(`   ❌ Upload failed: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  });
}

// ============================================
// STEP 5: Poll Batch Progress
// ============================================
async function pollBatchProgress() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 5: Poll Batch Processing Progress');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('Poll Batch Progress', async () => {
    if (!batchId) {
      console.log('   ⚠️  No batch ID - skipping');
      return;
    }

    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // Max 10 minutes (10s * 60)

    while (!completed && attempts < maxAttempts) {
      attempts++;
      
      try {
        const response = await axios.get(
          `${BASE_URL}/talent-pool/batches/${batchId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        const batch = response.data;
        const progress = Math.round((batch.processedFiles + batch.failedFiles) / batch.totalFiles * 100);
        
        console.log(`   ⏳ [Attempt ${attempts}] Status: ${batch.status} | Progress: ${progress}%`);
        console.log(`      Processed: ${batch.processedFiles} | Failed: ${batch.failedFiles} | Total: ${batch.totalFiles}`);

        if (['COMPLETED', 'PARTIALLY_FAILED', 'FAILED'].includes(batch.status)) {
          completed = true;
          console.log(`\n   ✅ Batch processing complete: ${batch.status}`);
        } else {
          console.log('      Waiting 10s...\n');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      } catch (error: any) {
        console.log(`   ⚠️  Error: ${error.response?.data?.message || error.message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    if (!completed) {
      console.log('   ⚠️  Timeout waiting for batch to complete');
      console.log('   💡 n8n may still be processing. Check /talent-pool/batches/:id later.');
    }
  });
}

// ============================================
// STEP 6: View Talent Pool Candidates
// ============================================
async function viewTalentPoolCandidates() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 6: View Talent Pool Candidates');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('View Candidates', async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/talent-pool`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const { candidates, total } = response.data;
      console.log(`   ✅ Found ${total} talent pool candidate(s)\n`);
      
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        console.log(`   ${i + 1}. ${candidate.fullName}`);
        console.log(`      📧 Email: ${candidate.email || 'N/A'}`);
        console.log(`      📱 Phone: ${candidate.phone || 'N/A'}`);
        console.log(`      📄 CV: ${candidate.cvFileName}`);
        console.log(`      🏷️  HR Status: ${candidate.hrStatus}`);
        
        if (candidate.screenings && candidate.screenings.length > 0) {
          console.log(`      📊 Screenings (${candidate.screenings.length}):`);
          for (const screening of candidate.screenings) {
            const statusIcon = screening.aiMatchStatus === 'STRONG_MATCH' ? '🟢' : 
                              screening.aiMatchStatus === 'MATCH' ? '🟡' : '🔴';
            console.log(`         ${statusIcon} ${screening.jobVacancy?.jobRole?.jobRoleName || 'N/A'}: ${screening.fitScore}%`);
          }
        } else {
          console.log(`      📊 No screenings yet (n8n processing may still be ongoing)`);
        }
        console.log('');
      }
    } catch (error: any) {
      console.log(`   ⚠️  Error: ${error.response?.data?.message || error.message}`);
    }
  });
}

// ============================================
// STEP 7: View Screening Results per Job
// ============================================
async function viewScreeningsByJob() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 7: View Screening Results by Job');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('View Screenings by Job', async () => {
    // Get all open jobs
    const openJobs = await prisma.jobVacancy.findMany({
      where: { jobVacancyStatus: { jobVacancyStatus: 'OPEN' } },
      include: { jobRole: true, division: true },
    });

    for (const job of openJobs) {
      try {
        const response = await axios.get(
          `${BASE_URL}/talent-pool?jobVacancyId=${job.id}&minScore=0`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        const { candidates } = response.data;
        const matchedCandidates = candidates.filter((c: any) => 
          c.screenings?.some((s: any) => s.jobVacancyId === job.id)
        );

        if (matchedCandidates.length > 0) {
          console.log(`\n   📋 ${job.jobRole?.jobRoleName} (${job.division?.divisionName})`);
          console.log(`   ${'─'.repeat(50)}`);
          
          for (const candidate of matchedCandidates) {
            const screening = candidate.screenings?.find((s: any) => s.jobVacancyId === job.id);
            if (screening) {
              const statusIcon = screening.aiMatchStatus === 'STRONG_MATCH' ? '🟢' : 
                                screening.aiMatchStatus === 'MATCH' ? '🟡' : '🔴';
              console.log(`   ${statusIcon} ${candidate.fullName}: ${screening.fitScore}% (${screening.aiMatchStatus})`);
            }
          }
        }
      } catch (error: any) {
        // Skip jobs with no results
      }
    }
  });
}

// ============================================
// STEP 8: Database Summary
// ============================================
async function databaseSummary() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 8: Database Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('Database Summary', async () => {
    const batchCount = await prisma.talentPoolBatch.count();
    const candidateCount = await prisma.talentPoolCandidate.count();
    const screeningCount = await prisma.talentPoolScreening.count();
    const queueCount = await prisma.talentPoolQueue.count();

    console.log(`   📊 TALENT POOL DATABASE STATS`);
    console.log(`   ${'─'.repeat(40)}`);
    console.log(`   📦 Batches: ${batchCount}`);
    console.log(`   👥 Candidates: ${candidateCount}`);
    console.log(`   📋 Screenings: ${screeningCount}`);
    console.log(`   ⏳ Queue Items: ${queueCount}`);

    // Show latest batch details
    if (batchId) {
      const batch = await prisma.talentPoolBatch.findUnique({
        where: { id: batchId },
        include: {
          candidates: {
            include: {
              screenings: true,
            },
          },
          queueItems: true,
        },
      });

      if (batch) {
        console.log(`\n   📦 LATEST BATCH DETAILS`);
        console.log(`   ${'─'.repeat(40)}`);
        console.log(`   ID: ${batch.id}`);
        console.log(`   Name: ${batch.batchName || 'N/A'}`);
        console.log(`   Status: ${batch.status}`);
        console.log(`   Total Files: ${batch.totalFiles}`);
        console.log(`   Processed: ${batch.processedFiles}`);
        console.log(`   Failed: ${batch.failedFiles}`);
        console.log(`   Candidates Created: ${batch.candidates.length}`);
        
        const totalScreenings = batch.candidates.reduce(
          (acc, c) => acc + c.screenings.length, 0
        );
        console.log(`   Total Screenings: ${totalScreenings}`);
      }
    }
  });
}

// ============================================
// Print Timing Report
// ============================================
function printTimingReport() {
  console.log('\n\n╔════════════════════════════════════════════════════════╗');
  console.log('║                 ⏱️  TIMING REPORT                       ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  
  let totalTime = 0;
  for (const timing of stepTimings) {
    const paddedStep = timing.step.padEnd(30);
    const paddedTime = `${timing.duration}ms`.padStart(10);
    console.log(`║  ${paddedStep} ${paddedTime}     ║`);
    totalTime += timing.duration;
  }
  
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  ${'TOTAL'.padEnd(30)} ${`${totalTime}ms`.padStart(10)}     ║`);
  console.log('╚════════════════════════════════════════════════════════╝');
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     TALENT POOL INTEGRATION TEST                       ║');
  console.log('║     HR Bulk CV Upload + AI Screening                   ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const testStart = Date.now();

  try {
    // HR Flow
    await hrLogin();                    // Step 1
    await showCandidateApplications();  // Step 2
    await showOpenJobs();               // Step 3
    await uploadBulkCVs();              // Step 4
    
    console.log('\n⏳ Waiting 5s for queue processing to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await pollBatchProgress();          // Step 5
    await viewTalentPoolCandidates();   // Step 6
    await viewScreeningsByJob();        // Step 7
    await databaseSummary();            // Step 8

    const totalSeconds = ((Date.now() - testStart) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     ✅ TALENT POOL TEST COMPLETE                      ║');
    console.log(`║     Total Time: ${totalSeconds}s                              ║`);
    console.log('╚════════════════════════════════════════════════════════╝');

    printTimingReport();

    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Configure N8N_TALENT_POOL_WEBHOOK_URL in .env');
    console.log('   2. Create n8n workflow with Talent Pool trigger');
    console.log('   3. Run this test again to see full AI screening results');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
