import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:3000';

// HR credentials (must exist in database)
const HR_USER = {
  email: 'hr@example.com',
  password: 'password123',
};

// Test CV files
const TEST_CV_FILES = [
  path.join(__dirname, '..', 'test-files', 'CV Adam Bagus Habibie Al Rasyid.pdf'),
  path.join(__dirname, '..', 'test-files', 'CV_Aditiya Purwansyah.pdf'),
];

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 STARTING ISSUE #62 VERIFICATION TEST');
  
  // Cleanup ALL existing talent pool candidates in the main Candidate table
  console.log('\n🧹 Cleaning up all existing talent pool candidates...');
  try {
    const tpCandidates = await prisma.candidate.findMany({
      where: { talentPoolBatchId: { not: null } },
      include: { user: true }
    });
    
    console.log(`   Found ${tpCandidates.length} old talent pool candidates to delete.`);
    for (const c of tpCandidates) {
      const cId = c.id;
      // Delete applications and pipelines
      const apps = await prisma.candidateApplication.findMany({ where: { candidateId: cId } });
      for (const app of apps) {
        await prisma.candidateApplicationPipeline.deleteMany({ where: { candidateApplicationId: app.id } });
        await prisma.candidateMatchSkill.deleteMany({ where: { candidateApplicationId: app.id } });
      }
      await prisma.candidateApplication.deleteMany({ where: { candidateId: cId } });
      await prisma.candidateSalary.deleteMany({ where: { candidateId: cId } });
      await prisma.candidateSocialMedia.deleteMany({ where: { candidateId: cId } });
      await prisma.candidateSkill.deleteMany({ where: { candidateId: cId } });
      await prisma.candidateCertification.deleteMany({ where: { candidateId: cId } });
      await prisma.candidateOrganizationExperience.deleteMany({ where: { candidateId: cId } });
      await prisma.candidateWorkExperience.deleteMany({ where: { candidateId: cId } });
      await prisma.candidateEducation.deleteMany({ where: { candidateId: cId } });
      await prisma.candidateFamily.deleteMany({ where: { candidateId: cId } });
      await prisma.candidateDocument.deleteMany({ where: { candidateId: cId } });
      
      await prisma.candidate.delete({ where: { id: cId } });
      
      if (c.user) {
        await prisma.user.delete({ where: { id: c.userId } });
      }
      console.log(`   - Deleted candidate ${c.candidateFullname} and user ${c.user?.email}`);
    }
  } catch (e: any) {
    console.log('   ⚠️ Cleanup error:', e.message);
  }

  // 1. HR Login
  console.log('\n🔐 Logging in as HR...');
  let authToken: string;
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, HR_USER);
    authToken = loginRes.data.access_token;
    console.log('✅ HR Login successful');
  } catch (error: any) {
    console.error('❌ HR Login failed:', error.response?.data || error.message);
    process.exit(1);
  }

  // Find an open job vacancy in the database to use for screening callback simulation
  const openJob = await prisma.jobVacancy.findFirst({
    where: {
      jobVacancyStatus: { jobVacancyStatus: 'OPEN' }
    },
    include: {
      jobRole: true
    }
  });

  if (!openJob) {
    console.error('❌ No open job vacancy found in the database. Please run seeders first.');
    process.exit(1);
  }
  console.log(`✅ Found open job for test: ${openJob.jobRole?.jobRoleName} (ID: ${openJob.id})`);

  // ============================================
  // Task 1: Bulk Upload
  // ============================================
  console.log('\n📦 TASK 1: Bulk Uploading CVs...');
  
  const form = new FormData();
  for (const filePath of TEST_CV_FILES) {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Test CV file not found at: ${filePath}`);
      process.exit(1);
    }
    form.append('files', fs.createReadStream(filePath));
    console.log(`   - Adding file: ${path.basename(filePath)}`);
  }
  form.append('sourceType', 'MANUAL_UPLOAD');
  form.append('batchName', `Verification Batch ${Date.now()}`);

  let batchId: string;
  try {
    const uploadRes = await axios.post(
      `${BASE_URL}/talent-pool/upload`,
      form,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...form.getHeaders(),
        }
      }
    );
    batchId = uploadRes.data.batch.id;
    console.log(`✅ Bulk Upload successful! Batch ID: ${batchId}`);
    console.log(`   Status: ${uploadRes.data.batch.status}`);
    console.log(`   Total files: ${uploadRes.data.batch.totalFiles}`);
  } catch (error: any) {
    console.error('❌ Bulk Upload failed:', error.response?.data || error.message);
    process.exit(1);
  }

  // Verify batch and queue records in database
  const batchInDb = await prisma.talentPoolBatch.findUnique({
    where: { id: batchId },
    include: { queueItems: true }
  });

  if (!batchInDb) {
    console.error('❌ Batch record not found in database!');
    process.exit(1);
  }
  console.log(`✅ Database Verify: Batch found with status '${batchInDb.status}'`);
  console.log(`✅ Database Verify: Queue items created: ${batchInDb.queueItems.length}`);
  for (const item of batchInDb.queueItems) {
    console.log(`   - Queue Item ID: ${item.id} | File: ${item.fileName} | Status: ${item.status}`);
  }

  const queueItems = batchInDb.queueItems;

  // ============================================
  // Task 2 & 3: Poll Batch Status & Wait for Real n8n Workflow
  // ============================================
  console.log('\n⏳ TASK 2 & 3: Polling Batch Status (Waiting for actual n8n callback)...');
  
  let completed = false;
  let attempts = 0;
  const maxAttempts = 90; // Max 15 minutes (10s * 90)
  let batchStatusData: any = null;

  while (!completed && attempts < maxAttempts) {
    attempts++;
    
    try {
      const response = await axios.get(
        `${BASE_URL}/talent-pool/batches/${batchId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      batchStatusData = response.data;
      const progress = Math.round((batchStatusData.processedFiles + batchStatusData.failedFiles) / batchStatusData.totalFiles * 100);
      
      console.log(`   ⏳ [Attempt ${attempts}] Status: ${batchStatusData.status} | Progress: ${progress}%`);
      console.log(`      Processed: ${batchStatusData.processedFiles} | Failed: ${batchStatusData.failedFiles} | Total: ${batchStatusData.totalFiles}`);

      if (['COMPLETED', 'PARTIALLY_FAILED', 'FAILED'].includes(batchStatusData.status)) {
        completed = true;
        console.log(`\n   ✅ Batch processing complete: ${batchStatusData.status}`);
      } else {
        console.log('      Waiting 10s...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } catch (error: any) {
      console.log(`   ⚠️  Error polling batch status: ${error.response?.data?.message || error.message}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  if (!completed) {
    console.error('❌ Timeout waiting for n8n to finish processing the batch.');
    process.exit(1);
  }

  if (batchStatusData.status === 'FAILED') {
    console.error('❌ Batch processing failed completely.');
    process.exit(1);
  }

  // Fetch created candidates from database
  const createdCandidates = await prisma.candidate.findMany({
    where: { talentPoolBatchId: batchId },
    include: {
      user: true,
      educations: true,
      workExperiences: true,
      skills: true,
      applications: true,
    }
  });

  if (createdCandidates.length === 0) {
    console.error('❌ No candidates were successfully created from this batch. Check n8n logs.');
    process.exit(1);
  }

  const createdCandidateIds = createdCandidates.map(c => c.id);
  console.log(`\n🔍 Verifying created candidate records in DB...`);
  for (const candidate of createdCandidates) {
    console.log(`✅ Candidate: ${candidate.candidateFullname} (ID: ${candidate.id})`);
    console.log(`   User Record: ${candidate.user ? 'Created (Email: ' + candidate.user.email + ')' : 'Not found!'}`);
    console.log(`   Educations: ${candidate.educations.length}`);
    console.log(`   Work Experiences: ${candidate.workExperiences.length}`);
    console.log(`   Skills: ${candidate.skills.length}`);
    console.log(`   Applications created: ${candidate.applications.length}`);
    
    for (const app of candidate.applications) {
      console.log(`   Application: Job ID: ${app.jobVacancyId} | isTalentPool: ${app.isTalentPool}`);
      if (app.isTalentPool !== true) {
        console.error(`❌ Application isTalentPool is NOT true!`);
        process.exit(1);
      }
    }
  }

  // Ensure at least one candidate has an application to test conversion/pipeline progression
  const targetCandidateId = createdCandidateIds[0];
  const existingApplications = await prisma.candidateApplication.findMany({
    where: { candidateId: targetCandidateId }
  });
  
  if (existingApplications.length === 0) {
    console.log(`\n   💡 Candidate has no applications (n8n screening score was low or did not match). Creating a test application...`);
    const [defaultSalary, appliedStatus, screeningPipeline, qualifiedPipelineStatus] = await Promise.all([
      prisma.candidateSalary.findFirst({ where: { candidateId: targetCandidateId } }),
      prisma.applicationLastStatus.findFirst({ where: { applicationLastStatus: 'Applied' } }),
      prisma.applicationPipeline.findFirst({ where: { applicationPipeline: 'Screening' } }),
      prisma.applicationPipelineStatus.findFirst({ where: { applicationPipelineStatus: 'Qualified' } }),
    ]);

    let salaryId = defaultSalary?.id;
    if (!salaryId) {
      const newSalary = await prisma.candidateSalary.create({
        data: {
          candidateId: targetCandidateId,
          currentSalary: 0,
          expectationSalary: 0,
        },
      });
      salaryId = newSalary.id;
    }

    if (appliedStatus && screeningPipeline && qualifiedPipelineStatus) {
      await prisma.candidateApplication.create({
        data: {
          candidateId: targetCandidateId,
          jobVacancyId: openJob.id,
          candidateSalaryId: salaryId,
          applicationLatestStatusId: appliedStatus.id,
          applicationPipelineId: screeningPipeline.id,
          fitScore: 80,
          aiMatchStatus: 'STRONG_MATCH',
          aiInsight: 'Created for test verification.',
          submissionDate: new Date(),
          isTalentPool: true,
          candidateApplicationPipelines: {
            create: [{
              applicationPipelineId: screeningPipeline.id,
              applicationPipelineStatusId: qualifiedPipelineStatus.id,
              notes: 'Auto-qualified from Talent Pool AI screening (Test Mock)',
            }],
          },
        },
      });
      console.log(`   ✅ Test application created successfully!`);
    } else {
      console.error('❌ Failed to find default pipeline statuses/stages in database.');
      process.exit(1);
    }
  }

  // ============================================
  // Task 4: Talent Pool View (Unified)
  // ============================================
  console.log('\n👁️ TASK 4: Checking Unified Talent Pool View...');
  try {
    const unifiedRes = await axios.get(
      `${BASE_URL}/talent-pool/unified?batchId=${batchId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Unified Talent Pool view retrieved successfully.');
    console.log(`   Total Candidates in this batch: ${unifiedRes.data.total}`);
    
    for (const item of unifiedRes.data.candidates) {
      console.log(`   - Candidate: ${item.candidateFullname} | Email: ${item.candidateEmail}`);
      console.log(`     Applications: ${item.applications.length}`);
      for (const app of item.applications) {
        console.log(`       * App ID: ${app.id} | Job Role: ${app.jobVacancy?.jobRole?.jobRoleName} | isTalentPool: ${app.isTalentPool}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to get unified talent pool view:', error.response?.data || error.message);
    process.exit(1);
  }

  // ============================================
  // Task 5: Process Conversion
  // ============================================
  console.log('\n🔄 TASK 5: Converting Candidate to Active Recruitment Pipeline...');
  
  let convertRes: any;
  try {
    convertRes = await axios.post(
      `${BASE_URL}/talent-pool/convert/${targetCandidateId}`,
      { targetPipelineStage: 'Online Assessment' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Conversion successful!');
    console.log(`   Message: ${convertRes.data.message}`);
    console.log(`   Reset Link: ${convertRes.data.resetLink}`);
  } catch (error: any) {
    console.error('❌ Conversion failed:', error.response?.data || error.message);
    process.exit(1);
  }

  // Verify in database that isTalentPool = false and pipeline is 'Online Assessment'
  const convertedCandidate = await prisma.candidate.findUnique({
    where: { id: targetCandidateId },
    include: {
      applications: {
        include: {
          applicationPipeline: true,
          candidateApplicationPipelines: {
            include: {
              applicationPipeline: true,
              applicationPipelineStatus: true
            }
          }
        }
      }
    }
  });

  if (!convertedCandidate) {
    console.error(`❌ Converted candidate not found in database!`);
    process.exit(1);
  }

  console.log(`   Converted Candidate Applications:`);
  let activeApplicationId: string = '';
  let activePipelineStageId: string = '';
  
  for (const app of convertedCandidate.applications) {
    console.log(`   - App ID: ${app.id} | isTalentPool: ${app.isTalentPool} | Pipeline Stage: ${app.applicationPipeline?.applicationPipeline}`);
    
    if (app.isTalentPool !== false) {
      console.error(`❌ Application isTalentPool is NOT false after conversion!`);
      process.exit(1);
    }
    
    if (app.applicationPipeline?.applicationPipeline !== 'Online Assessment') {
      console.error(`❌ Application pipeline stage is NOT 'Online Assessment'!`);
      process.exit(1);
    }
    
    // Find the latest pipeline history record
    const latestHistory = app.candidateApplicationPipelines.find(
      h => h.applicationPipeline?.applicationPipeline === 'Online Assessment'
    );
    
    if (!latestHistory) {
      console.error(`❌ No pipeline history record found for 'Online Assessment'!`);
      process.exit(1);
    }
    
    console.log(`     History Status: ${latestHistory.applicationPipelineStatus?.applicationPipelineStatus} | Notes: ${latestHistory.notes}`);
    activeApplicationId = app.id;
    activePipelineStageId = latestHistory.id;
  }

  // ============================================
  // Task 6: Pipeline Progression
  // ============================================
  console.log('\n📈 TASK 6: Testing Pipeline Progression...');
  
  console.log(`   Current pipeline stage record ID: ${activePipelineStageId}`);
  
  // Qualify the Online Assessment stage to move to User Interview 1
  let qualifyRes: any;
  try {
    qualifyRes = await axios.post(
      `${BASE_URL}/pipeline-actions/${activePipelineStageId}/qualify`,
      {
        notes: 'Passed Online Assessment. Moving to User Interview 1.',
        proceedToNextStage: true
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✅ Qualify stage endpoint successful!');
    console.log(`   Message: ${qualifyRes.data.message}`);
    console.log(`   Next Stage:`, qualifyRes.data.nextStage);
  } catch (error: any) {
    console.error('❌ Qualify stage failed:', error.response?.data || error.message);
    process.exit(1);
  }

  // Verify in database that stage order progressed correctly
  const appWithProgress = await prisma.candidateApplication.findUnique({
    where: { id: activeApplicationId },
    include: {
      candidateApplicationPipelines: {
        include: {
          applicationPipeline: true,
          applicationPipelineStatus: true
        }
      }
    }
  });

  if (!appWithProgress) {
    console.error(`❌ Application not found!`);
    process.exit(1);
  }

  console.log(`   Application Pipeline History after qualifying:`);
  let nextStagePipelineId: string = '';
  
  for (const h of appWithProgress.candidateApplicationPipelines) {
    console.log(`   - Stage: ${h.applicationPipeline?.applicationPipeline} | Status: ${h.applicationPipelineStatus?.applicationPipelineStatus} | Notes: ${h.notes}`);
    if (h.applicationPipeline?.applicationPipeline === 'User Interview 1') {
      nextStagePipelineId = h.id;
    }
  }

  if (!nextStagePipelineId) {
    console.error(`❌ Next stage 'User Interview 1' was not created!`);
    process.exit(1);
  }

  // Now disqualify the User Interview 1 stage (using the disqualify endpoint, i.e. /pipeline-actions/:id/disqualify)
  console.log(`\n   Disqualifying the User Interview 1 stage (ID: ${nextStagePipelineId})...`);
  let disqualifyRes: any;
  try {
    disqualifyRes = await axios.post(
      `${BASE_URL}/pipeline-actions/${nextStagePipelineId}/disqualify`,
      {
        feedback: 'Candidate did not meet criteria for User Interview 1.'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Disqualify stage endpoint successful!');
    console.log(`   Message: ${disqualifyRes.data.message}`);
  } catch (error: any) {
    console.error('❌ Disqualify stage failed:', error.response?.data || error.message);
    process.exit(1);
  }

  // Verify in database that User Interview 1 status is 'Not Qualified'
  const appAfterDisqualify = await prisma.candidateApplication.findUnique({
    where: { id: activeApplicationId },
    include: {
      candidateApplicationPipelines: {
        where: { id: nextStagePipelineId },
        include: {
          applicationPipeline: true,
          applicationPipelineStatus: true
        }
      }
    }
  });

  const progressRecord = appAfterDisqualify?.candidateApplicationPipelines[0];
  if (!progressRecord) {
    console.error(`❌ Disqualified progress record not found in database!`);
    process.exit(1);
  }

  console.log(`   Disqualified Stage Status: ${progressRecord.applicationPipeline?.applicationPipeline} | Status: ${progressRecord.applicationPipelineStatus?.applicationPipelineStatus} | Notes: ${progressRecord.notes}`);
  if (progressRecord.applicationPipelineStatus?.applicationPipelineStatus !== 'Not Qualified') {
    console.error(`❌ Disqualified stage status in database is NOT 'Not Qualified'!`);
    process.exit(1);
  }

  console.log('\n🎉 ALL ISSUE #62 VERIFICATION TASKS COMPLETED SUCCESSFULLY!');
}

main()
  .catch(e => {
    console.error('Fatal error during verification:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
