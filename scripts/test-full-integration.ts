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

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test user credentials
const TEST_USER = {
  email: 'test-integration@example.com',
  password: 'Test1234!',
  name: 'Muhammad Reza Azhar Priyadi',
};

// Simulate localStorage - selectedTracks from frontend
const LOCAL_STORAGE = {
  selectedTracks: [
    'Cloud',              // Maps to "Cloud Delivery and Operation" division
    'Cybersecurity',      // Maps to "Cybersecurity Delivery and Operation" division
  ],
};

// Test files for document upload
const TEST_FILES = {
  cv: path.join(__dirname, '..', 'test-files', 'Muhammad-Reza-Azhar-Priyadi-Resume.pdf'),
  transcript: path.join(__dirname, '..', 'test-files', 'academi_transcript', 'Markdown to PDF.pdf'),
  ijazah: path.join(__dirname, '..', 'test-files', 'ijazah', 'Muhammad Reza Azhar P_Ijazah.pdf'),
  ktp: path.join(__dirname, '..', 'test-files', 'ktp', 'Cloudeka new logo Lintasarta All-02.png'),
  portfolio: path.join(__dirname, '..', 'test-files', 'other', 'porto.pdf'),
};

let authToken: string;
let candidateId: string;

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
// STEP 0: CLEANUP - Delete ALL test data
// ============================================
async function cleanup() {
  console.log('\n🧹 STEP 0: Cleaning up ALL test data...');
  const start = Date.now();
  
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: TEST_USER.email },
      include: { candidates: true },
    });

    if (existingUser?.candidates?.[0]) {
      const cId = existingUser.candidates[0].id;
      console.log(`   📦 Found existing candidate: ${cId}`);
      
      // Get all candidate applications
      const applications = await prisma.candidateApplication.findMany({
        where: { candidateId: cId },
      });
      
      // Delete application pipeline history first
      for (const app of applications) {
        try {
          await prisma.candidateApplicationPipeline.deleteMany({
            where: { candidateApplicationId: app.id }
          });
          await prisma.candidateMatchSkill.deleteMany({
            where: { candidateApplicationId: app.id }
          });
        } catch (e) { /* ignore */ }
      }
      
      // Delete all candidate-related data in order (wrap each in try-catch)
      const deleteSteps = [
        { name: 'applications', fn: () => prisma.candidateApplication.deleteMany({ where: { candidateId: cId } }) },
        { name: 'salary', fn: () => prisma.candidateSalary.deleteMany({ where: { candidateId: cId } }) },
        { name: 'social media', fn: () => prisma.candidateSocialMedia.deleteMany({ where: { candidateId: cId } }) },
        { name: 'skills', fn: () => prisma.candidateSkill.deleteMany({ where: { candidateId: cId } }) },
        { name: 'match skills', fn: () => prisma.candidateMatchSkill.deleteMany({ where: { candidateId: cId } }) },
        { name: 'certifications', fn: () => prisma.candidateCertification.deleteMany({ where: { candidateId: cId } }) },
        { name: 'org experience', fn: () => prisma.candidateOrganizationExperience.deleteMany({ where: { candidateId: cId } }) },
        { name: 'work experience', fn: () => prisma.candidateWorkExperience.deleteMany({ where: { candidateId: cId } }) },
        { name: 'education', fn: () => prisma.candidateEducation.deleteMany({ where: { candidateId: cId } }) },
        { name: 'family', fn: () => prisma.candidateFamily.deleteMany({ where: { candidateId: cId } }) },
        { name: 'documents', fn: () => prisma.candidateDocument.deleteMany({ where: { candidateId: cId } }) },
      ];

      for (const step of deleteSteps) {
        try {
          await step.fn();
          console.log(`   🗑️  Deleted candidate ${step.name}`);
        } catch (e) { /* ignore if not found */ }
      }
      
      try {
        console.log('   🗑️  Deleting candidate record...');
        await prisma.candidate.delete({ where: { id: cId } });
      } catch (e) { /* ignore */ }
    }

    if (existingUser) {
      try {
        console.log('   🗑️  Deleting user record...');
        await prisma.user.delete({ where: { id: existingUser.id } });
      } catch (e) { /* ignore */ }
    }

    const duration = Date.now() - start;
    stepTimings.push({ step: 'Cleanup', duration });
    console.log(`   ✅ Cleanup complete (${duration}ms)`);
  } catch (error: any) {
    console.log('   ⚠️  Cleanup note:', error.message);
  }
}

// ============================================
// STEP 1: Close 1 IT Support Job (Cybersecurity)
// ============================================
async function closeOneItSupportJob() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 1: Close 1 IT Support Job (for 3-job screening)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('Close IT Support Job', async () => {
    // Find CLOSED status
    const closedStatus = await prisma.jobVacancyStatus.findFirst({
      where: { jobVacancyStatus: 'CLOSED' }
    });
    
    if (!closedStatus) {
      console.log('   ⚠️  CLOSED status not found');
      return;
    }

    // Find one IT Support job in Cybersecurity that's OPEN and close it
    const itSupportJobs = await prisma.jobVacancy.findMany({
      where: {
        division: { divisionName: { contains: 'Cybersecurity', mode: 'insensitive' } },
        jobRole: { jobRoleName: { contains: 'IT SUPPORT', mode: 'insensitive' } },
        jobVacancyStatus: { jobVacancyStatus: 'OPEN' }
      },
      include: { jobRole: true, division: true, jobVacancyStatus: true }
    });

    if (itSupportJobs.length > 1) {
      const jobToClose = itSupportJobs[0];
      await prisma.jobVacancy.update({
        where: { id: jobToClose.id },
        data: { jobVacancyStatusId: closedStatus.id }
      });
      console.log(`   ✅ Closed: ${jobToClose.jobRole?.jobRoleName} @ ${jobToClose.division?.divisionName}`);
      console.log(`   📊 Remaining OPEN IT Support in Cybersecurity: ${itSupportJobs.length - 1}`);
    } else {
      console.log(`   ℹ️  Only ${itSupportJobs.length} IT Support job(s) in Cybersecurity - no changes needed`);
    }
  });
}

// ============================================
// STEP 2: AUTH - Signup
// ============================================
async function authSignup() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 2: AUTH - Signup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('Auth Signup', async () => {
    console.log('   🔐 Attempting signup...');
    const signupRes = await axios.post(`${BASE_URL}/auth/signup`, TEST_USER);
    authToken = signupRes.data.access_token;
    candidateId = signupRes.data.user.candidateId;
    console.log(`   ✅ Signup successful`);
    console.log(`   📦 Candidate ID: ${candidateId}`);
    console.log(`   🔑 Token: ${authToken.substring(0, 20)}...`);
  });
}

// Global document types cache
let documentTypes: any[] = [];

// ============================================
// STEP 3: Fetch Document Types
// ============================================
async function fetchDocumentTypes() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 3: Fetch Document Types');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('Fetch Document Types', async () => {
    const response = await axios.get(`${BASE_URL}/documents/types`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    documentTypes = response.data;
    console.log(`   ✅ Retrieved ${documentTypes.length} document types`);
    for (const dt of documentTypes) {
      console.log(`      - ${dt.documentType} (${dt.id})`);
    }
  });
}

// Helper to get document type ID by name
function getDocumentTypeId(typeName: string): string {
  const dt = documentTypes.find((t: any) => 
    t.documentType.toLowerCase().includes(typeName.toLowerCase())
  );
  return dt?.id || documentTypes[0]?.id;
}

// ============================================
// STEP 4: Upload CV
// ============================================
async function uploadCV() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 4: Upload CV');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('Upload CV', async () => {
    if (!fs.existsSync(TEST_FILES.cv)) {
      console.log(`   ❌ CV file not found: ${TEST_FILES.cv}`);
      throw new Error('CV file not found');
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILES.cv));
    form.append('documentTypeId', getDocumentTypeId('CV'));

    const response = await axios.post(
      `${BASE_URL}/documents/upload`,
      form,
      { headers: { Authorization: `Bearer ${authToken}`, ...form.getHeaders() } }
    );

    // Store document ID for parsing
    cvDocumentId = response.data.id;

    console.log(`   ✅ Uploaded CV`);
    console.log(`   📄 Document ID: ${response.data.id}`);
    console.log(`   📁 Folder: ${response.data.folder}`);
  });
}

// Global CV document ID and parsed data
let cvDocumentId: string;
let parsedCVData: any = null;

// ============================================
// STEP 5: Parse CV
// ============================================
async function parseCV() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 5: Parse CV');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('Parse CV', async () => {
    if (!cvDocumentId) {
      console.log('   ⚠️  No CV document ID - skipping parse');
      return;
    }
    
    console.log('   📝 Parsing CV...');
    const response = await axios.post(
      `${BASE_URL}/cv-parser/parse/${cvDocumentId}`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    // Save parsed data for later use
    parsedCVData = response.data.parsedData;
    
    console.log(`   ✅ CV Parsed`);
    console.log(`   📛 Name: ${parsedCVData?.personalInfo?.fullName || 'N/A'}`);
    console.log(`   📚 Education entries: ${parsedCVData?.education?.length || 0}`);
    console.log(`   💼 Work experience entries: ${parsedCVData?.workExperience?.length || 0}`);
  });
}

// ============================================
// STEP 6: Upload Additional Documents
// ============================================
async function uploadAdditionalDocuments() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 6: Upload Additional Documents');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const documents = [
    { file: TEST_FILES.transcript, typeName: 'Transcript', name: 'Academic Transcript' },
    { file: TEST_FILES.ijazah, typeName: 'Supporting', name: 'Ijazah' },
    { file: TEST_FILES.ktp, typeName: 'ID Card', name: 'KTP' },
    { file: TEST_FILES.portfolio, typeName: 'Portfolio', name: 'Portfolio' },
  ];

  for (const doc of documents) {
    await timeStep(`Upload ${doc.name}`, async () => {
      if (!fs.existsSync(doc.file)) {
        console.log(`   ⚠️  ${doc.name} file not found: ${doc.file}`);
        return;
      }

      try {
        const form = new FormData();
        form.append('file', fs.createReadStream(doc.file));
        form.append('documentTypeId', getDocumentTypeId(doc.typeName));

        const response = await axios.post(
          `${BASE_URL}/documents/upload`,
          form,
          { headers: { Authorization: `Bearer ${authToken}`, ...form.getHeaders() } }
        );

        console.log(`   ✅ Uploaded ${doc.name}`);
        console.log(`      📄 Document ID: ${response.data.id}`);
        console.log(`      📁 Folder: ${response.data.folder}`);
      } catch (error: any) {
        console.log(`   ⚠️  ${doc.name} upload failed: ${error.response?.data?.message || error.message}`);
      }
    });
  }
}

// ============================================
// STEP 7: Update Profile (Add Skills & Organization)
// ============================================
async function updateProfile() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 7: Update Profile (Skills & Organization)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('Update Profile', async () => {
    console.log('   📝 Updating profile with parsed CV data + custom entries...');
    
    // Fetch a valid education level ID from database
    const educationLevels = await prisma.candidateLastEducation.findFirst();
    const defaultEducationId = educationLevels?.id || null;

    // Map parsed CV education to Prisma format
    const educations = parsedCVData?.education?.map((edu: any) => ({
      candidateLastEducationId: defaultEducationId, // Use valid ID from database
      candidateSchool: edu.university || edu.institution || '',
      candidateMajor: edu.major || null,
      candidateGpa: edu.gpa || null,
      candidateMaxGpa: edu.gpaMax || edu.maxGpa || null,
      candidateCountry: edu.country || 'Indonesia',
      candidateStartedYearStudy: edu.startYear ? `${edu.startYear}-01-01T00:00:00Z` : null,
      candidateEndedYearStudy: edu.endYear ? `${edu.endYear}-12-31T00:00:00Z` : null,
    })) || [];

    // Map parsed CV work experience to Prisma format  
    const workExperiences = parsedCVData?.workExperience?.map((work: any) => {
      // Helper to convert date to ISO 8601 or null
      const toISODate = (dateStr: any) => {
        if (!dateStr) return null;
        try {
          return new Date(dateStr).toISOString();
        } catch {
          return null;
        }
      };

      return {
        companyName: work.company || '',
        jobTitle: work.position || '',
        jobType: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP'].includes(work.jobType?.toUpperCase().replace('-', '_')) ? work.jobType.toUpperCase().replace('-', '_') : 'FULL_TIME',
        fieldOfWork: work.fieldOfWork || '',
        industry: work.industry || '',
        employmentStartedDate: toISODate(work.startDate) || new Date().toISOString(),
        employmentEndedDate: toISODate(work.endDate),
        workExperienceDescription: work.description || '',
        country: work.country || 'Indonesia',
        referenceName: 'N/A',
        referencePhoneNumber: 'N/A',
        referenceRelationship: 'N/A',
      };
    }) || [];
    
    const updateData: any = {};

    // Add educations if parsed from CV
    if (educations.length > 0) {
      updateData.educations = educations;
    }

    // Add work experiences if parsed from CV
    if (workExperiences.length > 0) {
      updateData.workExperiences = workExperiences;
    }

    // Map parsed CV skills to Prisma format (with default rating)
    // Skills from CV are strings - we need to convert them to skill objects with ratings
    const skillsFromCV = parsedCVData?.skills?.map((skill: string) => ({
      candidateSkill: skill,
      candidateRating: 'THREE', // Default rating - candidate can adjust later
    })) || [];
    
    if (skillsFromCV.length > 0) {
      updateData.skills = skillsFromCV;
    }

    // Map parsed CV certifications to Prisma format
    const certificationsFromCV = parsedCVData?.certifications?.map((cert: any) => ({
      certificationTitle: cert.name || cert.title || '',
      institutionName: cert.issuer || cert.institution || '',
      certificationStartDate: cert.startDate || null,
      certificationEndedDate: cert.endDate || null,
    })).filter((cert: any) => cert.certificationTitle) || [];
    
    if (certificationsFromCV.length > 0) {
      updateData.certifications = certificationsFromCV;
    }

    // Add manually specified organization experience
    updateData.organizationExperiences = [
      {
        organizationName: 'Local Mosque Youth Organization',
        role: 'Financial Treasurer',
        organizationExperienceStartedDate: '2020-01-01T00:00:00Z',
        organizationExperienceEndedDate: '2022-12-31T00:00:00Z',
        organizationExperienceDescription: 'Managed financial records and budgeting for youth activities.',
        location: 'Jakarta'
      }
    ];

    const response = await axios.patch(
      `${BASE_URL}/candidates/${candidateId}`,
      updateData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('   ✅ Profile updated successfully');
    console.log(`   📚 Education entries: ${educations.length}`);
    console.log(`   💼 Work experience entries: ${workExperiences.length}`);
    console.log(`   🛠️  Skills from CV: ${skillsFromCV.length}`);
    console.log(`   📜 Certifications from CV: ${certificationsFromCV.length}`);
    console.log(`   🏛️  Organization added: ${updateData.organizationExperiences[0].organizationName}`);
  });
}

// ============================================
// STEP 8: Submit & Trigger AI Analysis
// ============================================
async function submitAndTriggerAI() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 8: Submit & Trigger AI Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('AI Analysis', async () => {
    console.log(`   📦 Selected Tracks: ${JSON.stringify(LOCAL_STORAGE.selectedTracks)}`);
    console.log('   🤖 Triggering AI Analysis...');
    
    const response = await axios.post(
      `${BASE_URL}/candidate-applications/analyze`,
      { selectedTracks: LOCAL_STORAGE.selectedTracks },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log(`   ✅ Analysis complete`);
    console.log(`   📊 Jobs analyzed: ${response.data.results?.length || 0}`);
  });
}

// ============================================
// STEP 9: View AI Results
// ============================================
async function viewAIResults() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 9: View AI Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('View AI Results', async () => {
    const response = await axios.get(
      `${BASE_URL}/candidates/${candidateId}/ai-insights`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log(`   ✅ Retrieved ${response.data.length} job recommendation(s)\n`);
    
    for (let i = 0; i < response.data.length; i++) {
      const insight = response.data[i];
      const statusIcon = insight.status === 'STRONG_MATCH' ? '🟢' : 
                         insight.status === 'MATCH' ? '🟡' : '🔴';
      
      console.log(`   ${i + 1}. ${insight.jobTitle} [${statusIcon} ${insight.status}]`);
      console.log(`      Fit Score: ${insight.fitScore}`);
      console.log(`      Skills: ${insight.matchSkill || 'none'}`);
    }

    // Summary
    const strongMatches = response.data.filter((i: any) => i.status === 'STRONG_MATCH').length;
    const matches = response.data.filter((i: any) => i.status === 'MATCH').length;
    const notMatches = response.data.filter((i: any) => i.status === 'NOT_MATCH').length;
    
    console.log(`\n   📈 Summary: 🟢${strongMatches} 🟡${matches} 🔴${notMatches}`);
  });
}

// ============================================
// STEP 10: Apply for a Job
// ============================================
async function applyForJob() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 10: Apply for a Job');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('Apply for Job', async () => {
    // Find the DevOps job (STRONG_MATCH from AI)
    const devopsJob = await prisma.jobVacancy.findFirst({
      where: { 
        jobRole: { jobRoleName: { contains: 'DEVOPS', mode: 'insensitive' } },
        jobVacancyStatus: { jobVacancyStatus: 'OPEN' }
      },
      include: { jobRole: true, division: true }
    });

    if (!devopsJob) {
      console.log('   ⚠️  No DevOps job found');
      return;
    }

    console.log(`   🎯 Job: ${devopsJob.jobRole?.jobRoleName} @ ${devopsJob.division?.divisionName}`);

    const response = await axios.post(
      `${BASE_URL}/candidate-applications`,
      { jobVacancyId: devopsJob.id },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log(`   ✅ Application submitted`);
    console.log(`   📦 Application ID: ${response.data.id}`);
    console.log(`   🎯 AI Match: ${response.data.aiMatchStatus}`);
    console.log(`   📊 Fit Score: ${response.data.fitScore}`);
    console.log(`   📋 Pipeline: ${response.data.applicationPipeline?.applicationPipeline}`);
    console.log(`   🏷️  Status: ${response.data.applicationLatestStatus?.applicationLastStatus}`);
  });
}

// ============================================
// STEP 11: Verify Database
// ============================================
async function verifyDatabase() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 STEP 10: Verify Database');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await timeStep('Verify Database', async () => {
    // Count candidate documents
    const docs = await prisma.candidateDocument.count({ where: { candidateId } });
    console.log(`   📄 Documents uploaded: ${docs}`);

    // Count applications
    const apps = await prisma.candidateApplication.count({ where: { candidateId } });
    console.log(`   📝 Applications: ${apps}`);

    // Check application details - find DevOps application specifically
    const devopsJob = await prisma.jobVacancy.findFirst({
      where: { 
        jobRole: { jobRoleName: { contains: 'DEVOPS', mode: 'insensitive' } },
      },
    });

    const application = devopsJob 
      ? await prisma.candidateApplication.findFirst({
          where: { candidateId, jobVacancyId: devopsJob.id },
        })
      : await prisma.candidateApplication.findFirst({
          where: { candidateId },
          orderBy: { createdAt: 'desc' }
        });

    if (application) {
      const pipeline = await prisma.applicationPipeline.findUnique({
        where: { id: application.applicationPipelineId }
      });
      const status = application.applicationLatestStatusId 
        ? await prisma.applicationLastStatus.findUnique({ where: { id: application.applicationLatestStatusId } })
        : null;
      
      console.log(`   🎯 DevOps Application:`);
      console.log(`      - AI Match: ${application.aiMatchStatus}`);
      console.log(`      - Fit Score: ${application.fitScore}`);
      console.log(`      - Pipeline: ${pipeline?.applicationPipeline}`);
      console.log(`      - Status: ${status?.applicationLastStatus}`);
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
  console.log('║     FULL INTEGRATION TEST - CANDIDATE FLOW            ║');
  console.log('║     All data will be cleaned and recreated            ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const testStart = Date.now();

  try {
    // Clean all existing test data
    await cleanup();
    
    // Setup: Close 1 IT Support job for 3-job screening
    await closeOneItSupportJob();
    
    // Full flow
    await authSignup();           // Step 2
    await fetchDocumentTypes();   // Step 3
    await uploadCV();             // Step 4
    await parseCV();              // Step 5
    await uploadAdditionalDocuments(); // Step 6
    await updateProfile();        // Step 7
    await submitAndTriggerAI();   // Step 8
    
    // Wait for async processing
    console.log('\n⏳ Waiting 2s for async processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await viewAIResults();        // Step 9
    await applyForJob();          // Step 10
    await verifyDatabase();       // Step 11

    const totalSeconds = ((Date.now() - testStart) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     ✅ FULL INTEGRATION TEST COMPLETE                 ║');
    console.log(`║     Total Time: ${totalSeconds}s                              ║`);
    console.log('╚════════════════════════════════════════════════════════╝');

    printTimingReport();

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
