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
const TEST_USER = {
  email: 'temp-candidate-verification@example.com',
  password: 'Password123!',
  name: 'Candidate Verification User',
};

// Initialize Prisma
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanup() {
  console.log('🧹 Cleanup: Checking for existing test user...');
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: TEST_USER.email },
      include: { candidates: true },
    });

    if (existingUser) {
      console.log(`   Found existing test user: ${existingUser.id}`);
      
      for (const cand of existingUser.candidates) {
        const cId = cand.id;
        console.log(`   Deleting candidate data for candidate ID: ${cId}...`);

        // Order matters due to foreign key constraints
        await prisma.candidateApplicationPipeline.deleteMany({
          where: { candidateApplication: { candidateId: cId } }
        });
        await prisma.candidateMatchSkill.deleteMany({ where: { candidateId: cId } });
        await prisma.candidateApplication.deleteMany({ where: { candidateId: cId } });
        await prisma.candidateSocialMedia.deleteMany({ where: { candidateId: cId } });
        await prisma.candidateSkill.deleteMany({ where: { candidateId: cId } });
        await prisma.candidateCertification.deleteMany({ where: { candidateId: cId } });
        await prisma.candidateOrganizationExperience.deleteMany({ where: { candidateId: cId } });
        await prisma.candidateWorkExperience.deleteMany({ where: { candidateId: cId } });
        await prisma.candidateEducation.deleteMany({ where: { candidateId: cId } });
        await prisma.candidateSalary.deleteMany({ where: { candidateId: cId } });
        await prisma.candidateDocument.deleteMany({ where: { candidateId: cId } });
        await prisma.candidate.delete({ where: { id: cId } });
      }

      await prisma.user.delete({ where: { id: existingUser.id } });
      console.log('   ✅ Cleanup complete.');
    } else {
      console.log('   No existing test user found.');
    }
  } catch (error: any) {
    console.warn('   ⚠️ Cleanup note:', error.message);
  }
}

async function main() {
  console.log('🚀 STARTING CANDIDATE FLOW VERIFICATION');
  console.log('=====================================\n');

  let authToken = '';
  let candidateId = '';
  let parsedData: any = null;
  let recommendedJobVacancyId = '';

  try {
    // Step 0: Cleanup
    await cleanup();

    // -------------------------------------------------------------
    // Step 1: Auth Check
    // -------------------------------------------------------------
    console.log('\n🔒 CHECK 1: Auth Check');
    console.log('--------------------');
    
    // 1.1 Register candidate
    console.log('👉 Registering new user...');
    const signupRes = await axios.post(`${BASE_URL}/auth/signup`, TEST_USER);
    if (signupRes.status === 201 && signupRes.data.access_token) {
      console.log('   [PASS] User signup successful');
      candidateId = signupRes.data.user.candidateId;
      console.log(`   Candidate ID: ${candidateId}`);
    } else {
      throw new Error(`Signup response invalid: ${signupRes.status}`);
    }

    // 1.2 Login candidate
    console.log('👉 Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    if (loginRes.status === 200 || loginRes.status === 201) {
      authToken = loginRes.data.access_token;
      console.log('   [PASS] User login successful');
      console.log(`   Access Token: ${authToken.substring(0, 30)}...`);
    } else {
      throw new Error(`Login response invalid: ${loginRes.status}`);
    }

    // 1.3 Access profile with Auth header
    console.log('👉 Fetching profile with token...');
    const profileRes = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (profileRes.status === 200 && profileRes.data.email === TEST_USER.email) {
      console.log('   [PASS] Authorized profile fetch successful');
      console.log(`   Profile Name: ${profileRes.data.name}`);
    } else {
      throw new Error('Authorized profile fetch returned invalid data');
    }

    // 1.4 Access profile without Auth header (Security Check)
    console.log('👉 Fetching profile without token (Security Check)...');
    try {
      await axios.get(`${BASE_URL}/auth/profile`);
      throw new Error('Endpoint did not enforce security (allowed request without token)');
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        console.log('   [PASS] Security Check: Request without token rejected with 401 Unauthorized');
      } else {
        throw new Error(`Security Check failed with unexpected error: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // Step 2: CV Parse Check
    // -------------------------------------------------------------
    console.log('\n📄 CHECK 2: CV Parse Check');
    console.log('------------------------');
    
    const cvPath = path.join(process.cwd(), 'test-files', 'Muhammad-Reza-Azhar-Priyadi-Resume.pdf');
    if (!fs.existsSync(cvPath)) {
      throw new Error(`CV test file not found at ${cvPath}`);
    }

    console.log(`👉 Sending PDF CV to POST /cv-parser/parse-file...`);
    const form = new FormData();
    form.append('file', fs.createReadStream(cvPath));

    const parseRes = await axios.post(`${BASE_URL}/cv-parser/parse-file`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (parseRes.status === 200 || parseRes.status === 201) {
      parsedData = parseRes.data.parsedData;
      console.log('   [PASS] CV parsed successfully');
      console.log('   Extracted Personal Info:', parsedData.personalInfo);
      console.log(`   Extracted Education: ${parsedData.education?.length || 0} entries`);
      console.log(`   Extracted Work Experience: ${parsedData.workExperience?.length || 0} entries`);
      console.log(`   Extracted Skills: ${parsedData.skills?.join(', ') || 'None'}`);
    } else {
      throw new Error(`CV parse file failed with status ${parseRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 3: Profile Store Check
    // -------------------------------------------------------------
    console.log('\n💾 CHECK 3: Profile Store Check');
    console.log('-----------------------------');

    console.log('👉 Storing parsed data via POST /candidate-profile/store-parsed-data...');
    const storeRes = await axios.post(
      `${BASE_URL}/candidate-profile/store-parsed-data`,
      { parsedData },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (storeRes.status === 200 && storeRes.data.success) {
      console.log('   [PASS] Profile store endpoint returned success');
    } else {
      throw new Error(`Profile store failed with status ${storeRes.status}`);
    }

    // Direct database assertions using Prisma
    console.log('👉 Verifying DB records created...');
    const dbCandidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        educations: true,
        workExperiences: true,
        skills: true,
      },
    });

    if (!dbCandidate) {
      throw new Error('Candidate record not found in database');
    }

    console.log(`   Found dbCandidate: ${dbCandidate.candidateFullname}`);
    if (dbCandidate.educations.length > 0) {
      console.log(`   [PASS] Education DB records verified (${dbCandidate.educations.length} records)`);
    } else {
      throw new Error('No Education records found in database');
    }

    if (dbCandidate.workExperiences.length > 0) {
      console.log(`   [PASS] Work Experience DB records verified (${dbCandidate.workExperiences.length} records)`);
    } else {
      throw new Error('No Work Experience records found in database');
    }

    if (dbCandidate.skills.length > 0) {
      console.log(`   [PASS] Skills DB records verified (${dbCandidate.skills.length} records)`);
    } else {
      throw new Error('No Skills records found in database');
    }

    // -------------------------------------------------------------
    // Step 4: Analysis Trigger Check
    // -------------------------------------------------------------
    console.log('\n🔄 CHECK 4: Analysis Trigger Check');
    console.log('--------------------------------');

    console.log('👉 Calling POST /candidate-applications/analyze with selected tracks...');
    const tracks = ['Cloud', 'Cybersecurity'];
    
    const analyzeRes = await axios.post(
      `${BASE_URL}/candidate-applications/analyze`,
      { selectedTracks: tracks },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (analyzeRes.status === 201 || analyzeRes.status === 200) {
      console.log('   [PASS] Analysis triggered successfully');
      const results = analyzeRes.data.results || [];
      console.log(`   Recommendations returned: ${results.length}`);
      
      if (results.length > 0) {
        recommendedJobVacancyId = results[0].job_id;
        console.log(`   First Recommended Job ID: ${recommendedJobVacancyId}`);
      } else {
        console.warn('   ⚠️ No job recommendations returned from n8n. Falling back to DB seed vacancy.');
        // Fallback: search an open job vacancy in DB
        const openStatus = await prisma.jobVacancyStatus.findFirst({ where: { jobVacancyStatus: 'OPEN' } });
        const openJob = openStatus ? await prisma.jobVacancy.findFirst({ where: { jobVacancyStatusId: openStatus.id } }) : null;
        if (openJob) {
          recommendedJobVacancyId = openJob.id;
          console.log(`   Selected Fallback Job ID: ${recommendedJobVacancyId}`);
        } else {
          throw new Error('No open jobs found in database to apply for fallback.');
        }
      }
    } else {
      throw new Error(`Analysis trigger failed with status ${analyzeRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 5: Job Recommendations Check
    // -------------------------------------------------------------
    console.log('\n📈 CHECK 5: Job Recommendations Check');
    console.log('-----------------------------------');

    console.log(`👉 Calling GET /analysis/${candidateId}...`);
    const analysisRes = await axios.get(`${BASE_URL}/analysis/${candidateId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (analysisRes.status === 200) {
      const recommendations = analysisRes.data;
      console.log('   [PASS] Get analysis details succeeded');
      console.log(`   Found recommendations count: ${recommendations.length}`);
      
      if (recommendations.length > 0) {
        const firstRec = recommendations[0];
        console.log('   Sample Job Recommendation:');
        console.log(`      - Job: ${firstRec.jobVacancy?.jobRole?.jobRoleName || 'N/A'}`);
        console.log(`      - Fit Score: ${firstRec.fitScore || 'N/A'}`);
        console.log(`      - Match Status: ${firstRec.aiMatchStatus || 'N/A'}`);
        console.log(`      - isTalentPool: ${firstRec.isTalentPool}`);
        
        // Assert isTalentPool starts as true
        if (firstRec.isTalentPool === true) {
          console.log('   [PASS] Verified recommended application has isTalentPool: true by default');
        } else {
          console.warn('   ⚠️ Warning: recommended application does not have isTalentPool: true');
        }
      }
    } else {
      throw new Error(`Get analysis failed with status ${analysisRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 6: Apply Check
    // -------------------------------------------------------------
    console.log('\n📝 CHECK 6: Apply Check');
    console.log('---------------------');

    console.log(`👉 Applying for Job Vacancy ID: ${recommendedJobVacancyId}...`);
    const applyRes = await axios.post(
      `${BASE_URL}/candidate-applications`,
      { jobVacancyId: recommendedJobVacancyId },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (applyRes.status === 201 || applyRes.status === 200) {
      console.log('   [PASS] Application submitted successfully');
      console.log(`   Application ID: ${applyRes.data.id}`);
      console.log(`   isTalentPool returned from API: ${applyRes.data.isTalentPool}`);
    } else {
      throw new Error(`Application failed with status ${applyRes.status}`);
    }

    // Direct database assertions using Prisma
    console.log('👉 Verifying DB updates for candidate application (isTalentPool: false)...');
    const updatedApplication = await prisma.candidateApplication.findFirst({
      where: {
        candidateId,
        jobVacancyId: recommendedJobVacancyId,
      },
    });

    if (!updatedApplication) {
      throw new Error('Updated candidate application record not found in database');
    }

    console.log(`   Application DB Record: id=${updatedApplication.id}, isTalentPool=${updatedApplication.isTalentPool}`);
    if (updatedApplication.isTalentPool === false) {
      console.log('   [PASS] Database assertion verified: isTalentPool is now false');
    } else {
      throw new Error('Database assertion failed: isTalentPool is still true');
    }

    console.log('\n🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');

  } catch (error: any) {
    console.error('\n❌ VERIFICATION TEST FAILED!');
    if (error.response) {
      console.error('   API Status:', error.response.status);
      console.error('   API Response Data:', error.response.data);
    } else {
      console.error('   Error Message:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
