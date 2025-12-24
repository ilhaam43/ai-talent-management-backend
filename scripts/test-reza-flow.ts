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

// Reza's credentials
const REZA = {
  email: 'rezaazhar.p@gmail.com',
  password: 'reza123',
  name: 'Muhammad Reza Azhar Priyadi',
};

let authToken: string;
let candidateId: string;
let documentTypeId: string;
let documentId: string;

// Initialize Prisma with Pg adapter for Prisma v7
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanupReza() {
  console.log('🧹 Step 0: Cleaning up existing Reza data...');
  try {
    // Find Reza's user record
    const existingUser = await prisma.user.findUnique({
      where: { email: REZA.email },
      include: { candidates: true },
    });

    if (existingUser) {
      console.log(`   Found existing user: ${existingUser.id}`);
      
      if (existingUser.candidates?.[0]) {
        candidateId = existingUser.candidates[0].id;
        console.log(`   Found existing candidate: ${candidateId}`);

        // Delete related data in order (respecting foreign keys)
        await prisma.candidateSocialMedia.deleteMany({ where: { candidateId } });
        await prisma.candidateSkill.deleteMany({ where: { candidateId } });
        await prisma.candidateCertification.deleteMany({ where: { candidateId } });
        await prisma.candidateOrganizationExperience.deleteMany({ where: { candidateId } });
        await prisma.candidateWorkExperience.deleteMany({ where: { candidateId } });
        await prisma.candidateEducation.deleteMany({ where: { candidateId } });
        await prisma.candidateDocument.deleteMany({ where: { candidateId } });
        await prisma.candidate.delete({ where: { id: candidateId } });
      }
      
      // Delete User (cascade will handle candidates if any)
      await prisma.user.delete({ where: { id: existingUser.id } });

      console.log('   ✅ Cleaned up existing data\n');
    } else {
      console.log('   No existing data found\n');
    }
  } catch (error: any) {
    console.log('   Note:', error.message, '\n');
  }
}

async function seedReza() {
  console.log('🌱 Step 1: Creating Reza as new user and candidate...');
  try {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(REZA.password, salt);

    // Create User first
    const user = await prisma.user.create({
      data: {
        email: REZA.email,
        password: hashedPassword,
        name: REZA.name,
      },
    });

    // Then create Candidate linked to User
    const candidate = await prisma.candidate.create({
      data: {
        userId: user.id,
        candidateEmail: REZA.email,
        candidateFullname: REZA.name,
      },
    });

    candidateId = candidate.id;
    console.log(`   ✅ Created user: ${user.id}`);
    console.log(`   ✅ Created candidate: ${candidateId}`);
    console.log(`   Email: ${REZA.email}`);
    console.log(`   Name: ${REZA.name}\n`);
    return true;
  } catch (error: any) {
    console.error('   ❌ Failed:', error.message);
    return false;
  }
}

async function login() {
  console.log('🔐 Step 2: Logging in as Reza...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: REZA.email,
      password: REZA.password,
    });
    authToken = response.data.access_token;
    console.log(`   ✅ Login successful`);
    console.log(`   Token: ${authToken.substring(0, 30)}...\n`);
    return true;
  } catch (error: any) {
    console.error('   ❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getDocumentType() {
  console.log('📋 Step 3: Getting document types...');
  try {
    const response = await axios.get(`${BASE_URL}/documents/types`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (response.data.length === 0) {
      console.log('   ⚠️  No document types found. Creating default ones...');
      await createDefaultDocumentTypes();

      // Retry getting types
      const retryResponse = await axios.get(`${BASE_URL}/documents/types`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      response.data = retryResponse.data;
    }

    const cvType = response.data.find((t: any) => t.documentType === 'CV/Resume');
    if (cvType) {
      documentTypeId = cvType.id;
      console.log(`   ✅ Found CV/Resume type: ${documentTypeId}\n`);
      return true;
    }
    // Fallback
    if (response.data.length > 0) {
      documentTypeId = response.data[0].id;
      console.log(`   ✅ Using first type: ${documentTypeId}\n`);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error('   ❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function createDefaultDocumentTypes() {
  try {
    const defaultTypes = ['CV/Resume', 'Cover Letter', 'Certificate'];

    for (const type of defaultTypes) {
      const existing = await prisma.documentType.findFirst({
        where: { documentType: type },
      });

      if (!existing) {
        await prisma.documentType.create({
          data: { documentType: type },
        });
        console.log(`     Created: ${type}`);
      }
    }
  } catch (error: any) {
    console.error('     Error creating document types:', error.message);
  }
}

async function uploadCV() {
  console.log("📤 Step 4: Uploading Reza's CV...");

  const cvPath = path.join(process.cwd(), 'test-files', 'Muhammad-Reza-Azhar-Priyadi-Resume.pdf');

  if (!fs.existsSync(cvPath)) {
    console.error(`   ❌ CV file not found: ${cvPath}`);
    return false;
  }

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(cvPath));
    form.append('documentTypeId', documentTypeId);

    const response = await axios.post(`${BASE_URL}/documents/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });

    documentId = response.data.id;
    console.log(`   ✅ CV uploaded`);
    console.log(`   Document ID: ${documentId}\n`);
    return true;
  } catch (error: any) {
    console.error('   ❌ Upload failed:', error.response?.data || error.message);
    return false;
  }
}

async function parseCV() {
  console.log('🔍 Step 5: Parsing CV...');
  try {
    const response = await axios.post(
      `${BASE_URL}/cv-parser/parse/${documentId}`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    const parsed = response.data.parsedData;
    console.log('   ✅ CV parsed successfully');
    console.log(`   Name found: ${parsed.personalInfo?.fullName || 'N/A'}`);
    console.log(`   Email found: ${parsed.personalInfo?.email || 'N/A'}`);
    console.log(`   Education: ${parsed.education?.length || 0} entries`);
    console.log(`   Work Exp: ${parsed.workExperience?.length || 0} entries`);
    console.log(`   Skills: ${parsed.skills?.length || 0} items\n`);

    return parsed;
  } catch (error: any) {
    console.error('   ❌ Parse failed:', error.response?.data || error.message);
    return null;
  }
}

async function storeToDatabase(parsedData: any) {
  console.log('💾 Step 6: Storing parsed data to database...');
  try {
    const response = await axios.post(
      `${BASE_URL}/candidate-profile/store-parsed-data`,
      { parsedData },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const result = response.data.data;
    console.log('   ✅ Data stored to database');
    console.log(`   Personal Info: ${result.personalInfo ? '✅' : '❌'}`);
    console.log(`   Education: ${result.education?.length || 0} entries`);
    console.log(`   Work Exp: ${result.workExperience?.length || 0} entries`);
    console.log(`   Skills: ${result.skills?.length || 0} items`);
    console.log(`   Certifications: ${result.certifications?.length || 0} items\n`);

    return true;
  } catch (error: any) {
    console.error('   ❌ Store failed:', error.response?.data || error.message);
    return false;
  }
}

async function verifyDatabase() {
  console.log('🔎 Step 7: Verifying data in database...');
  console.log('='.repeat(70));

  try {
    // Get candidate via User
    const user = await prisma.user.findUnique({
      where: { email: REZA.email },
      include: { candidates: true },
    });

    if (!user || !user.candidates?.[0]) {
      console.log('   ❌ Candidate not found in database');
      return false;
    }

    const candidate = await prisma.candidate.findFirst({
      where: { id: user.candidates[0].id },
      include: {
        user: true, // Include User relation
        // candidateAddress: true, // Relation not defined in schema, use ID lookup
        educations: {
          include: { candidateLastEducation: true },
        },
        workExperiences: true,
        organizationExperiences: true,
        skills: true,
        certifications: true,
        socialMedia: true,
        documents: true,
      },
    });

    if (!candidate) {
      console.log('   ❌ Candidate not found in database');
      return false;
    }

    console.log('\n📊 DATABASE VERIFICATION RESULTS');
    console.log('='.repeat(70));

    // Personal Info
    console.log('\n👤 PERSONAL INFO:');
    console.log(`   ID:       ${candidate.id}`);
    console.log(`   Name:     ${candidate.candidateFullname || candidate.user?.name || 'N/A'}`);
    console.log(`   Email:    ${candidate.candidateEmail || candidate.user?.email || 'N/A'}`);
    console.log(`   DOB:      ${candidate.dateOfBirth || 'N/A'}`);
    console.log(`   Place:    ${candidate.placeOfBirth || 'N/A'}`);

    // Address
    console.log('\n🏠 ADDRESS:');
    if (candidate.candidateAddressId) {
      console.log(`   Address ID: ${candidate.candidateAddressId}`);
      
      // Fetch address details manually since relation is missing
      const address = await prisma.candidateAddress.findUnique({
        where: { id: candidate.candidateAddressId }
      });
      
      if (address) {
        console.log(`   Details: ${address.candidateAddress || 'N/A'}`);
        console.log(`   Province: ${address.province || 'N/A'}`);
        console.log(`   City: ${address.city || 'N/A'}`);
      } else {
        console.log('   Address record not found');
      }
    } else {
      console.log('   No address stored');
    }

    // Education
    console.log('\n🎓 EDUCATION:');
    if (candidate.educations && candidate.educations.length > 0) {
      candidate.educations.forEach((edu: any, idx: number) => {
        console.log(`   ${idx + 1}. ${edu.candidateSchool || 'N/A'}`);
        console.log(`      Major: ${edu.candidateMajor || 'N/A'}`);
        console.log(`      Level: ${edu.candidateLastEducation?.candidateEducation || 'N/A'}`);
        console.log(`      GPA:   ${edu.candidateGpa || 'N/A'}`);
      });
    } else {
      console.log('   No education stored');
    }

    // Work Experience
    console.log('\n💼 WORK EXPERIENCE:');
    if (candidate.workExperiences && candidate.workExperiences.length > 0) {
      candidate.workExperiences.forEach((work: any, idx: number) => {
        console.log(`   ${idx + 1}. ${work.jobTitle || 'N/A'} at ${work.companyName || 'N/A'}`);
        console.log(`      Period: ${work.employmentStartedDate || 'N/A'} - ${work.employmentEndedDate || 'Present'}`);
        console.log(`      Type:   ${work.jobType || 'N/A'}`);
      });
    } else {
      console.log('   No work experience stored');
    }

    // Skills
    console.log('\n🔧 SKILLS:');
    if (candidate.skills && candidate.skills.length > 0) {
      const skillNames = candidate.skills.map((s: any) => s.candidateSkill).join(', ');
      console.log(`   ${skillNames}`);
      console.log(`   Total: ${candidate.skills.length} skills`);
    } else {
      console.log('   No skills stored');
    }

    // Certifications
    console.log('\n📜 CERTIFICATIONS:');
    if (candidate.certifications && candidate.certifications.length > 0) {
      candidate.certifications.slice(0, 5).forEach((cert: any, idx: number) => {
        console.log(`   ${idx + 1}. ${cert.certificationTitle || 'N/A'}`);
        console.log(`      Issuer: ${cert.institutionName || 'N/A'}`);
      });
      if (candidate.certifications.length > 5) {
        console.log(`   ... and ${candidate.certifications.length - 5} more`);
      }
    } else {
      console.log('   No certifications stored');
    }

    // Documents
    console.log('\n📄 DOCUMENTS:');
    if (candidate.documents && candidate.documents.length > 0) {
      candidate.documents.forEach((doc: any, idx: number) => {
        console.log(`   ${idx + 1}. ${doc.filePath}`);
        console.log(`      Type: ${doc.documentTypeId}`);
      });
    } else {
      console.log('   No documents stored');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Database verification complete!');

    return true;
  } catch (error: any) {
    console.error('   ❌ Verification failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 FULL FLOW TEST: Reza Registration → Login → Upload CV → Store to DB');
  console.log('='.repeat(70));
  console.log('');

  try {
    // Step 0: Cleanup
    await cleanupReza();

    // Step 1: Create Reza
    if (!(await seedReza())) return;

    // Step 2: Login
    if (!(await login())) return;

    // Step 3: Get document type
    if (!(await getDocumentType())) return;

    // Step 4: Upload CV
    if (!(await uploadCV())) return;

    // Step 5: Parse CV
    const parsedData = await parseCV();
    if (!parsedData) return;

    // Step 6: Store to database
    if (!(await storeToDatabase(parsedData))) return;

    // Step 7: Verify in database
    await verifyDatabase();

    console.log('\n🎉 ALL STEPS COMPLETED SUCCESSFULLY!');
    console.log("   Reza's data has been stored in the database.\n");
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
