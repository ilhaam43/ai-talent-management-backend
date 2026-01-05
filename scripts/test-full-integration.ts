import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:3000';

// Test user credentials
const TEST_USER = {
  email: 'test-integration@example.com',
  password: 'test123',
  name: 'Muhammad Reza Azhar Priyadi',
};

let authToken: string;
let candidateId: string;
let documentId: string;
let applicationId: string;
let jobVacancyId: string;

// Initialize Prisma
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanup() {
  console.log('🧹 Step 0: Cleaning up...');
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: TEST_USER.email },
      include: { candidates: true },
    });

    if (existingUser?.candidates?.[0]) {
      const cId = existingUser.candidates[0].id;
      
      // Delete in order
      await prisma.candidateApplication.deleteMany({ where: { candidateId: cId } });
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

async function seedUser() {
  console.log('🌱 Step 1: Seeding User & Candidate...');
  const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);

  const user = await prisma.user.create({
    data: {
      email: TEST_USER.email,
      password: hashedPassword,
      name: TEST_USER.name,
    },
  });

  const candidate = await prisma.candidate.create({
    data: {
      userId: user.id,
      candidateEmail: TEST_USER.email,
      candidateFullname: TEST_USER.name,
    },
  });

  candidateId = candidate.id;
  console.log(`   ✅ Created Candidate: ${candidateId}`);
}

async function login() {
  console.log('🔐 Step 2: Login...');
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  authToken = response.data.access_token;
  console.log('   ✅ Login successful.');
}

async function uploadAndParseCV() {
  console.log('📄 Step 3: CV Upload & Parse...');
  
  // Get document type
  const docTypes = await axios.get(`${BASE_URL}/document-types`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const cvType = docTypes.data.find((dt: any) => dt.documentTypeName === 'CV');

  // Upload CV
  const cvPath = path.join(__dirname, '../../uploads/documents/reza-cv.pdf');
  const form = new FormData();
  form.append('file', fs.createReadStream(cvPath));
  form.append('candidateId', candidateId);
  form.append('documentTypeId', cvType.id);

  const uploadRes = await axios.post(`${BASE_URL}/documents/upload`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${authToken}`,
    },
  });

  documentId = uploadRes.data.id;
  console.log(`   ✅ Uploaded Document ID: ${documentId}`);

  // Parse CV
  await axios.post(
    `${BASE_URL}/cv-parser/parse`,
    { documentId, candidateId },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  // Store parsed data
  await axios.post(
    `${BASE_URL}/candidate-profile/store-parsed-data`,
    { candidateId },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  console.log('   ✅ CV Parsed and Stored.');
}

async function prepareJobAndApplication() {
  console.log('💼 Step 4: Job Application & dependencies...');

  // Get a job vacancy (or create one)
  const jobs = await prisma.jobVacancy.findMany({ take: 1 });
  
  if (jobs.length === 0) {
    throw new Error('No job vacancies found. Please seed jobs first.');
  }

  jobVacancyId = jobs[0].id;

  // Create application
  const application = await prisma.candidateApplication.create({
    data: {
      candidateId,
      jobVacancyId,
    },
  });

  applicationId = application.id;
  console.log(`   ✅ Created Application: ${applicationId}`);
}

async function triggerN8NAnalysis() {
  console.log('🤖 Step 5: Trigger N8N/AI Analysis...');
  
  const response = await axios.post(
    `${BASE_URL}/candidate-applications/${applicationId}/analyze`,
    {},
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  console.log('   ✅ Analysis Triggered.');
  console.log(`   Response: Fit Score ${response.data.fitScore}, Insight: ${response.data.aiInsight?.substring(0, 50)}...`);
}

async function testGetCandidateById() {
  console.log('🔎 Step 6: Test GET /candidates/:id...');
  
  const response = await axios.get(`${BASE_URL}/candidates/${candidateId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (response.data.candidateFullname) {
    console.log(`   ✅ GET /candidates/:id returns candidate data.`);
    console.log(`   Candidate Name: ${response.data.candidateFullname}`);
  } else {
    console.log('   ❌ Response missing candidateFullname');
  }

  return response.data;
}

async function testGetAiInsights() {
  console.log('🤖 Step 7: Test GET /candidates/:id/ai-insights...');
  
  const response = await axios.get(`${BASE_URL}/candidates/${candidateId}/ai-insights`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (Array.isArray(response.data)) {
    console.log(`   ✅ GET /ai-insights returns array with ${response.data.length} items.`);
    
    if (response.data.length > 0) {
      const firstItem = response.data[0];
      console.log(`   ℹ️  AI Response Item:`, JSON.stringify(firstItem, null, 2));
      
      // Verify structure
      if (firstItem.jobVacancyId && firstItem.fitScore !== undefined && firstItem.aiInsight && firstItem.status) {
        console.log('   ✅ Response contains jobVacancyId, fitScore, aiInsight, and status.');
        
        // Check personalization
        if (firstItem.aiInsight.includes('Hi ') && firstItem.aiInsight.includes('you')) {
          console.log('   ✅ AI Insight is personalized with greeting and "you".');
        } else {
          console.log('   ⚠️  AI Insight may not be fully personalized.');
        }
        
        // Check status mapping
        if (['STRONG_MATCH', 'MATCH', 'NOT_MATCH'].includes(firstItem.status)) {
          console.log(`   ✅ Status is correctly mapped: ${firstItem.status}`);
        } else {
          console.log(`   ❌ Status has unexpected value: ${firstItem.status}`);
        }
      } else {
        console.log('   ❌ Response missing required fields');
      }
    }
  } else {
    console.log('   ❌ Response is not an array');
  }

  return response.data;
}

async function main() {
  try {
    await cleanup();
    await seedUser();
    await login();
    await uploadAndParseCV();
    await prepareJobAndApplication();
    await triggerN8NAnalysis();
    
    // Wait a bit for N8N to process
    console.log('⏳ Waiting 3 seconds for N8N processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await testGetCandidateById();
    await testGetAiInsights();

    console.log('\n🏁 Full Integration Test Complete.');
  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
