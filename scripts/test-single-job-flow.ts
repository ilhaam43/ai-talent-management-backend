
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

// Test user credentials
const TEST_USER = {
  email: 'test-integration@example.com',
  password: 'Test1234!',
  name: 'Muhammad Reza Azhar Priyadi',
};

// Simulate localStorage - selectedTracks from frontend
const LOCAL_STORAGE = {
  selectedTracks: [
    'Cloud Delivery and Operation',      
    'Cybersecurity Delivery and Operation', 
    'Collaboration Solution',             
  ],
};

let authToken: string;
let candidateId: string;
let documentId: string;

// Initialize Prisma
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function setupSingleOpenJob() {
  console.log('🔄 Step -1: Setting up DB (1 OPEN Job, others CLOSED)...');
  try {
    const openStatus = await prisma.jobVacancyStatus.findFirst({
        where: { jobVacancyStatus: { equals: 'OPEN', mode: 'insensitive' } }
    });
    const closedStatus = await prisma.jobVacancyStatus.findFirst({
        where: { jobVacancyStatus: { equals: 'CLOSED', mode: 'insensitive' } }
    });

    if (!openStatus || !closedStatus) {
        console.error('❌ Statuses OPEN/CLOSED not found.');
        return;
    }

    // 1. Close ALL jobs
    await prisma.jobVacancy.updateMany({
        data: { jobVacancyStatusId: closedStatus.id }
    });
    console.log('   🔒 ALL jobs set to CLOSED.');

    // 2. Open ONE specific job (Cloud Delivery matching)
    const targetJob = await prisma.jobVacancy.findFirst({
        where: { 
            OR: [
                 { division: { divisionName: { contains: 'Cloud Delivery', mode: 'insensitive' } } },
                 { department: { departmentName: { contains: 'Cloud Delivery', mode: 'insensitive' } } }
            ]
        }
    });

    if (targetJob) {
       await prisma.jobVacancy.update({
        where: { id: targetJob.id },
        data: { jobVacancyStatusId: openStatus.id }
      });
      console.log(`   🔓 Job set to OPEN: ${targetJob.id} (DevOps)`);
    } else {
        // Fallback
        const first = await prisma.jobVacancy.findFirst();
        if (first) {
            await prisma.jobVacancy.update({ where: { id: first.id }, data: { jobVacancyStatusId: openStatus.id }});
            console.log(`   🔓 Job set to OPEN: ${first.id} (First Available)`);
        }
    }
  } catch (err: any) {
      console.error('   Setup failed:', err.message);
  }
}

async function cleanup() {
  console.log('🧹 Step 0: Cleaning up test data...');
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: TEST_USER.email },
      include: { candidates: true },
    });

    if (existingUser?.candidates?.[0]) {
      const cId = existingUser.candidates[0].id;
      await prisma.candidateMatchSkill.deleteMany({ where: { candidateId: cId } });
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
    }

    if (existingUser) {
      await prisma.user.delete({ where: { id: existingUser.id } });
    }
    console.log('   ✅ Cleaned up User and Candidate.');
  } catch (error: any) {
    console.log('   Note:', error.message);
  }
}

async function authSignupLogin() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 1: AUTH - Signup & Login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    console.log('   🔐 Attempting signup...');
    const signupRes = await axios.post(`${BASE_URL}/auth/signup`, TEST_USER);
    authToken = signupRes.data.access_token;
    candidateId = signupRes.data.user.candidateId;
    console.log(`   ✅ Signup successful. candidateId: ${candidateId}`);
    return;
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log('   ℹ️  User already exists, logging in...');
    } else {
      throw error;
    }
  }
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: TEST_USER.email,
    password: TEST_USER.password,
  });
  authToken = loginRes.data.access_token;
  const profile = await axios.get(`${BASE_URL}/candidates/profile`, {
    headers: { Authorization: `Bearer ${authToken}` },
  }).catch(() => null);
  if (profile?.data?.id) {
    candidateId = profile.data.id;
  }
  console.log(`   ✅ Login successful. candidateId: ${candidateId || 'unknown'}`);
}

async function selectTrack() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 2: Select Track');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   📦 localStorage.setItem("selectedTracks", ${JSON.stringify(LOCAL_STORAGE.selectedTracks)})`);
  console.log('   ✅ Tracks stored in localStorage (simulated).');
}

async function uploadCV() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 3: Upload CV');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const docTypes = await axios.get(`${BASE_URL}/documents/types`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  let documentTypeId = docTypes.data.find((dt: any) => 
    dt.documentType.toLowerCase().includes('cv') || 
    dt.documentType.toLowerCase().includes('resume')
  )?.id;
  if (!documentTypeId && docTypes.data.length > 0) documentTypeId = docTypes.data[0].id;
  if (!documentTypeId) {
    const created = await prisma.documentType.create({ data: { documentType: 'CV/Resume' } });
    documentTypeId = created.id;
  }
  const cvPath = path.join(process.cwd(), 'test-files', 'Muhammad-Reza-Azhar-Priyadi-Resume.pdf');
  if (!fs.existsSync(cvPath)) {
    console.log(`   ⚠️  CV file not found at ${cvPath}`);
    return;
  }
  const form = new FormData();
  form.append('file', fs.createReadStream(cvPath));
  form.append('documentTypeId', documentTypeId);
  const uploadRes = await axios.post(`${BASE_URL}/documents/upload`, form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${authToken}` },
  });
  documentId = uploadRes.data.id;
  console.log(`   ✅ Uploaded CV. Document ID: ${documentId}`);
}

async function parseCV() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 4: Parse CV');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (!documentId) return;
  const parseRes = await axios.post(
    `${BASE_URL}/cv-parser/parse/${documentId}`,
    { candidateId },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  console.log('   ✅ CV Parsed successfully.');
  await axios.post(
    `${BASE_URL}/candidate-profile/store-parsed-data`,
    { parsedData: parseRes.data.parsedData },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  console.log('   ✅ Parsed data stored in database.');
}

async function updateProfile() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 5-6: Update Profile');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    await axios.post(
      `${BASE_URL}/candidate-profile/skills`,
      {
        skills: [
          { skill: 'Python', rating: '4' },
          { skill: 'AWS', rating: '3' },
          { skill: 'JavaScript', rating: '4' },
          { skill: 'Docker', rating: '3' },
        ],
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('   ✅ Skills added.');
  } catch (error: any) {
    console.log('   ⚠️  Skills API error:', error.message);
  }
}

async function uploadOtherDocuments() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 7: Upload Other Documents (Skipped)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function submitAndTriggerN8N() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 8: Submit Form & Trigger N8N Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const selectedTracks = LOCAL_STORAGE.selectedTracks;
  try {
    const response = await axios.post(
      `${BASE_URL}/candidate-applications/analyze`,
      { selectedTracks },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('   ✅ Analysis triggered successfully!');
    console.log(`   ℹ️  Results count: ${response.data.results?.length || 0}`);
  } catch (error: any) {
     console.log('   ⚠️  N8N/Backend Error:', error.message);
  }
}

async function viewAIResults() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 9: View AI Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const response = await axios.get(
    `${BASE_URL}/candidates/${candidateId}/ai-insights`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  console.log(`   ✅ Retrieved ${response.data.length} AI insight(s).`);
  if (response.data.length > 0) {
    console.log('\n   📊 Job Recommendations:');
    const insights = response.data.slice(0, 5);
    for (let i = 0; i < insights.length; i++) {
        const ins = insights[i];
        console.log(`   ${i+1}. ${ins.jobTitle} [${ins.status}]`);
        console.log(`      Job ID: ${ins.jobVacancyId}`);
    }
    if (response.data.length === 1) {
        console.log('\n   🎉 SUCCESS: Exactly 1 job returned as expected!');
    } else {
        console.log(`\n   ⚠️  Expected 1 job, got ${response.data.length}. Checking match...`);
    }
  } else {
      console.log('   ❌ No jobs returned. Check "OPEN" status logic.');
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     TEST SINGLE JOB FLOW                              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  try {
    await setupSingleOpenJob(); // <--- NEW STEP
    await cleanup();
    await authSignupLogin();
    await selectTrack();
    await uploadCV();
    await parseCV();
    await updateProfile();
    await uploadOtherDocuments();
    await submitAndTriggerN8N();
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await viewAIResults();
    console.log('\n   ✅ TEST COMPLETE');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
