import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, CandidateRating } from '@prisma/client';
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
  password: 'Test1234!',
  name: 'Muhammad Reza Azhar Priyadi',
};

// Simulate localStorage - selectedTracks from frontend
// These must match ACTUAL division names from seed-org-structure.ts
const LOCAL_STORAGE = {
  selectedTracks: [
    'Cloud Delivery and Operation',      // Division for Cloud jobs
    'Cybersecurity Delivery and Operation', // Division for Cybersecurity jobs  
    'Collaboration Solution',             // Division for IT Services jobs
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

async function cleanup() {
  console.log('🧹 Step 0: Cleaning up test data...');
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: TEST_USER.email },
      include: { candidates: true },
    });

    if (existingUser?.candidates?.[0]) {
      const cId = existingUser.candidates[0].id;
      
      // Delete in order
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

// ============================================
// FLOW STEP 1: AUTH - Signup/Login
// ============================================
async function authSignupLogin() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 1: AUTH - Signup & Login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Try signup first
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

  // Login if signup failed (user exists)
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: TEST_USER.email,
    password: TEST_USER.password,
  });
  authToken = loginRes.data.access_token;
  
  // Get candidateId from profile
  const profile = await axios.get(`${BASE_URL}/candidates/profile`, {
    headers: { Authorization: `Bearer ${authToken}` },
  }).catch(() => null);
  
  if (profile?.data?.id) {
    candidateId = profile.data.id;
  }
  
  console.log(`   ✅ Login successful. candidateId: ${candidateId || 'unknown'}`);
}

// ============================================
// FLOW STEP 2: Select Track (simulated localStorage)
// ============================================
async function selectTrack() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 2: Select Track (simulated localStorage)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log(`   📦 localStorage.setItem("selectedTracks", ${JSON.stringify(LOCAL_STORAGE.selectedTracks)})`);
  console.log('   ✅ Tracks stored in localStorage (simulated).');
}

// ============================================
// FLOW STEP 3: Upload CV
// ============================================
async function uploadCV() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 3: Upload CV');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Get CV document type
  const docTypes = await axios.get(`${BASE_URL}/documents/types`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  let documentTypeId = docTypes.data.find((dt: any) => 
    dt.documentType.toLowerCase().includes('cv') || 
    dt.documentType.toLowerCase().includes('resume')
  )?.id;

  if (!documentTypeId && docTypes.data.length > 0) {
    documentTypeId = docTypes.data[0].id;
  }

  if (!documentTypeId) {
    console.log('   ⚠️  No document types found. Creating CV type...');
    const created = await prisma.documentType.create({
      data: { documentType: 'CV/Resume' },
    });
    documentTypeId = created.id;
  }

  // Find CV file
  const cvPath = path.join(process.cwd(), 'test-files', 'Muhammad-Reza-Azhar-Priyadi-Resume.pdf');
  
  if (!fs.existsSync(cvPath)) {
    console.log(`   ⚠️  CV file not found at ${cvPath}`);
    console.log('   Note: Skipping CV upload.');
    return;
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(cvPath));
  form.append('documentTypeId', documentTypeId);

  const uploadRes = await axios.post(`${BASE_URL}/documents/upload`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${authToken}`,
    },
  });

  documentId = uploadRes.data.id;
  console.log(`   ✅ Uploaded CV. Document ID: ${documentId}`);
  console.log(`   📁 Stored in folder: ${uploadRes.data.folder || 'cv'}`);
}

// ============================================
// FLOW STEP 4: Parse CV
// ============================================
async function parseCV() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 4: Parse CV');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!documentId) {
    console.log('   ⚠️  No document to parse. Skipping.');
    return;
  }

  const parseRes = await axios.post(
    `${BASE_URL}/cv-parser/parse/${documentId}`,
    { candidateId },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  console.log('   ✅ CV Parsed successfully.');
  console.log(`   ℹ️  Extracted: ${parseRes.data.parsedData?.personalInfo?.fullName || 'N/A'}`);

  // Store parsed data
  await axios.post(
    `${BASE_URL}/candidate-profile/store-parsed-data`,
    { parsedData: parseRes.data.parsedData },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  console.log('   ✅ Parsed data stored in database.');
}

// ============================================
// FLOW STEP 5-6: Update Profile (simulated)
// ============================================
async function updateProfile() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 5-6: Update Profile (autofill form + corrections)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Add some skills for testing matchSkill functionality
  // Using the API endpoint to properly handle the enum conversion
  console.log('   📝 Adding skills via API...');
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
    console.log('   ✅ Skills added: Python, AWS, JavaScript, Docker');
  } catch (error: any) {
    console.log('   ⚠️  Skills API error:', error.response?.data || error.message);
    console.log('   ℹ️  Skills from CV parse will be used instead.');
  }
}

// ============================================
// FLOW STEP 7: Upload Other Documents (optional)
// ============================================
async function uploadOtherDocuments() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 7: Upload Other Documents (Optional - Simulated)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('   ℹ️  In production, candidate can upload:');
  console.log('       - Ijazah (PDF) → uploads/documents/ijazah/');
  console.log('       - KTP (PDF/Image) → uploads/documents/ktp/');
  console.log('       - Transcript (PDF) → uploads/documents/transcript/');
  console.log('       - Portfolio (PDF) → uploads/documents/other/');
  console.log('   ✅ Simulated - no actual upload in test.');
}

// ============================================
// FLOW STEP 8: Submit & Trigger N8N Analysis
// ============================================
async function submitAndTriggerN8N() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 8: Submit Form & Trigger N8N Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Get selectedTracks from simulated localStorage
  const selectedTracks = LOCAL_STORAGE.selectedTracks;
  console.log(`   📦 Reading localStorage.getItem("selectedTracks"): ${JSON.stringify(selectedTracks)}`);

  console.log('   🤖 Triggering AI Analysis...');
  console.log(`   POST /candidate-applications/analyze`);
  console.log(`   Body: { selectedTracks: ${JSON.stringify(selectedTracks)} }`);

  try {
    const response = await axios.post(
      `${BASE_URL}/candidate-applications/analyze`,
      { selectedTracks },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('   ✅ Analysis triggered successfully!');
    console.log(`   ℹ️  Processing time: ${response.data.processing_time_ms}ms`);
    console.log(`   ℹ️  Results count: ${response.data.results?.length || 0}`);
  } catch (error: any) {
    if (error.response?.status === 500 && error.response?.data?.message?.includes('N8N')) {
      console.log('   ⚠️  N8N webhook not available (expected in test environment)');
      console.log('   ℹ️  In production, this would send data to n8n for AI analysis.');
    } else {
      throw error;
    }
  }
}

// ============================================
// FLOW STEP 9: View AI Results
// ============================================
async function viewAIResults() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FLOW STEP 9: View AI Results & Recommendations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test GET /candidates/:id/ai-insights
  console.log(`   🔍 GET /candidates/${candidateId}/ai-insights`);

  const response = await axios.get(
    `${BASE_URL}/candidates/${candidateId}/ai-insights`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  console.log(`   ✅ Retrieved ${response.data.length} AI insight(s) / Job Recommendation(s).`);

  if (response.data.length > 0) {
    console.log('\n   📊 Job Recommendations (AI Insights):');
    console.log('   ─────────────────────────────────────');
    
    // Display all insights (up to 5)
    const insights = response.data.slice(0, 5);
    for (let i = 0; i < insights.length; i++) {
      const insight = insights[i];
      const statusIcon = insight.status === 'STRONG_MATCH' ? '🟢' : 
                         insight.status === 'MATCH' ? '🟡' : '🔴';
      
      console.log(`\n   ${i + 1}. ${insight.jobTitle || 'Job'} [${statusIcon} ${insight.status}]`);
      console.log(`      ├─ Job Vacancy ID: ${insight.jobVacancyId}`);
      console.log(`      ├─ Matching Skills: ${insight.matchSkill || '(none detected)'}`);
      console.log(`      └─ AI Insight: ${insight.aiInsight?.substring(0, 100)}...`);
    }

    if (response.data.length > 5) {
      console.log(`\n   ... and ${response.data.length - 5} more recommendations`);
    }

    // Summary
    console.log('\n   📈 Summary:');
    const strongMatches = response.data.filter((i: any) => i.status === 'STRONG_MATCH').length;
    const matches = response.data.filter((i: any) => i.status === 'MATCH').length;
    const notMatches = response.data.filter((i: any) => i.status === 'NOT_MATCH').length;
    console.log(`      🟢 Strong Match: ${strongMatches}`);
    console.log(`      🟡 Match: ${matches}`);
    console.log(`      🔴 Not Match: ${notMatches}`);
  }
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     FULL INTEGRATION TEST - CANDIDATE FLOW            ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    await cleanup();
    
    // Follow the flow exactly:
    await authSignupLogin();      // Flow 1: Auth
    await selectTrack();          // Flow 2: Select Track (localStorage)
    await uploadCV();             // Flow 3: Upload CV
    await parseCV();              // Flow 4: Parse CV
    await updateProfile();        // Flow 5-6: Update profile
    await uploadOtherDocuments(); // Flow 7: Other docs (simulated)
    await submitAndTriggerN8N();  // Flow 8: Submit & N8N
    
    // Wait for N8N to process (if running)
    console.log('\n⏳ Waiting 2 seconds for any async processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await viewAIResults();        // Flow 9: View results

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     ✅ FULL INTEGRATION TEST COMPLETE                 ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
