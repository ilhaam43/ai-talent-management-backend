import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';

// Test credentials
const TEST_CANDIDATE = {
  email: 'test@example.com',
  password: 'password123',
};

let authToken: string;
let documentTypeId: string;

interface TestResult {
  fileName: string;
  uploaded: boolean;
  parsed: boolean;
  extractedTextLength: number;
  hasPersonalInfo: boolean;
  educationCount: number;
  workExperienceCount: number;
  skillsCount: number;
  certificationsCount: number;
  error?: string;
}

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_CANDIDATE);
    authToken = response.data.access_token;
    console.log('✅ Login successful\n');
    return true;
  } catch (error: any) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getDocumentType() {
  console.log('📋 Getting document types...');
  try {
    const response = await axios.get(`${BASE_URL}/documents/types`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const cvType = response.data.find((t: any) => t.documentType === 'CV/Resume');
    documentTypeId = cvType.id;
    console.log(`✅ Found CV/Resume type: ${documentTypeId}\n`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to get document types:', error.response?.data || error.message);
    return false;
  }
}

async function testCV(cvPath: string): Promise<TestResult> {
  const fileName = path.basename(cvPath);
  const result: TestResult = {
    fileName,
    uploaded: false,
    parsed: false,
    extractedTextLength: 0,
    hasPersonalInfo: false,
    educationCount: 0,
    workExperienceCount: 0,
    skillsCount: 0,
    certificationsCount: 0,
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 Testing: ${fileName}`);
  console.log('='.repeat(60));

  // Check if file exists
  if (!fs.existsSync(cvPath)) {
    result.error = 'File not found';
    console.log(`❌ File not found: ${cvPath}`);
    return result;
  }

  // Upload CV
  try {
    console.log('📤 Uploading CV...');
    const form = new FormData();
    form.append('file', fs.createReadStream(cvPath));
    form.append('documentTypeId', documentTypeId);

    const uploadResponse = await axios.post(`${BASE_URL}/documents/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });

    const documentId = uploadResponse.data.id;
    result.uploaded = true;
    console.log(`✅ Uploaded successfully (ID: ${documentId})`);

    // Parse CV
    console.log('🔍 Parsing CV...');
    const parseResponse = await axios.post(
      `${BASE_URL}/cv-parser/parse/${documentId}`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    result.parsed = true;
    result.extractedTextLength = parseResponse.data.extractedText?.length || 0;
    
    const parsedData = parseResponse.data.parsedData;
    
    // Check personal info
    const personalInfo = parsedData.personalInfo || {};
    result.hasPersonalInfo = !!(
      personalInfo.fullName ||
      personalInfo.email ||
      personalInfo.phone
    );

    // Count items
    result.educationCount = Array.isArray(parsedData.education) ? parsedData.education.length : 0;
    result.workExperienceCount = Array.isArray(parsedData.workExperience)
      ? parsedData.workExperience.length
      : 0;
    result.skillsCount = Array.isArray(parsedData.skills) ? parsedData.skills.length : 0;
    result.certificationsCount = Array.isArray(parsedData.certifications)
      ? parsedData.certifications.length
      : 0;

    console.log('✅ Parsing completed');
    console.log(`   Text extracted: ${result.extractedTextLength} characters`);
    console.log(`   Personal info: ${result.hasPersonalInfo ? '✅' : '❌'}`);
    console.log(`   Education: ${result.educationCount} entries`);
    console.log(`   Work experience: ${result.workExperienceCount} entries`);
    console.log(`   Skills: ${result.skillsCount} items`);
    console.log(`   Certifications: ${result.certificationsCount} items`);

    // Show extracted data preview
    if (personalInfo.fullName) {
      console.log(`\n   👤 Name: ${personalInfo.fullName}`);
    }
    if (personalInfo.email) {
      console.log(`   📧 Email: ${personalInfo.email}`);
    }
    if (personalInfo.phone) {
      console.log(`   📱 Phone: ${personalInfo.phone}`);
    }
    if (result.educationCount > 0) {
      console.log(`\n   🎓 Education:`);
      parsedData.education.slice(0, 2).forEach((edu: any, idx: number) => {
        console.log(`      ${idx + 1}. ${edu.institution || 'N/A'} - ${edu.degree || 'N/A'}`);
      });
    }
    if (result.workExperienceCount > 0) {
      console.log(`\n   💼 Work Experience:`);
      parsedData.workExperience.slice(0, 2).forEach((work: any, idx: number) => {
        console.log(`      ${idx + 1}. ${work.position || 'N/A'} at ${work.company || 'N/A'}`);
      });
    }

    // Cleanup - delete document
    try {
      await axios.delete(`${BASE_URL}/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  } catch (error: any) {
    result.error = error.response?.data?.message || error.message;
    console.log(`❌ Error: ${result.error}`);
  }

  return result;
}

async function runTests() {
  console.log('🚀 Testing All CVs in test-files Folder');
  console.log('='.repeat(60));
  console.log('');

  // Login
  if (!(await login())) {
    return;
  }

  // Get document type
  if (!(await getDocumentType())) {
    return;
  }

  // Get all PDF files from test-files
  const testFilesDir = path.join(process.cwd(), 'test-files');
  const files = fs.readdirSync(testFilesDir).filter((file) => file.endsWith('.pdf'));

  if (files.length === 0) {
    console.log('❌ No PDF files found in test-files folder');
    return;
  }

  console.log(`📁 Found ${files.length} PDF file(s) to test\n`);

  const results: TestResult[] = [];

  // Test each CV
  for (const file of files) {
    const cvPath = path.join(testFilesDir, file);
    const result = await testCV(cvPath);
    results.push(result);
    
    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter((r) => r.parsed && r.extractedTextLength > 0).length;
  const failed = results.filter((r) => !r.parsed || r.extractedTextLength === 0).length;

  console.log(`\nTotal CVs tested: ${results.length}`);
  console.log(`✅ Successfully parsed: ${successful}`);
  console.log(`❌ Failed: ${failed}\n`);

  console.log('Detailed Results:');
  console.log('-'.repeat(60));
  
  results.forEach((result, idx) => {
    console.log(`\n${idx + 1}. ${result.fileName}`);
    console.log(`   Upload: ${result.uploaded ? '✅' : '❌'}`);
    console.log(`   Parse: ${result.parsed ? '✅' : '❌'}`);
    console.log(`   Text length: ${result.extractedTextLength} chars`);
    
    if (result.parsed) {
      console.log(`   Personal info: ${result.hasPersonalInfo ? '✅' : '❌'}`);
      console.log(`   Education: ${result.educationCount}`);
      console.log(`   Work exp: ${result.workExperienceCount}`);
      console.log(`   Skills: ${result.skillsCount}`);
      console.log(`   Certifications: ${result.certificationsCount}`);
    }
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  // Analysis
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📈 ANALYSIS');
  console.log('='.repeat(60));

  const avgTextLength = results.reduce((sum, r) => sum + r.extractedTextLength, 0) / results.length;
  const avgEducation = results.reduce((sum, r) => sum + r.educationCount, 0) / results.length;
  const avgWorkExp = results.reduce((sum, r) => sum + r.workExperienceCount, 0) / results.length;
  const avgSkills = results.reduce((sum, r) => sum + r.skillsCount, 0) / results.length;

  console.log(`\nAverage text length: ${Math.round(avgTextLength)} characters`);
  console.log(`Average education entries: ${avgEducation.toFixed(1)}`);
  console.log(`Average work experience: ${avgWorkExp.toFixed(1)}`);
  console.log(`Average skills: ${avgSkills.toFixed(1)}`);

  // Identify problematic CVs
  const problematic = results.filter(
    (r) => r.extractedTextLength < 200 || !r.hasPersonalInfo || r.educationCount === 0,
  );

  if (problematic.length > 0) {
    console.log(`\n⚠️  CVs that may need attention (${problematic.length}):`);
    problematic.forEach((r) => {
      console.log(`   - ${r.fileName} (${r.extractedTextLength} chars, ${r.educationCount} education)`);
    });
  }

  console.log('\n✅ Testing completed!');
}

// Run tests
runTests().catch(console.error);

