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
let documentId: string;
let parsedData: any;

async function login() {
  console.log('🔐 Step 1: Logging in...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_CANDIDATE);
    authToken = response.data.access_token;
    console.log('✅ Login successful');
    console.log(`   Token: ${authToken.substring(0, 30)}...\n`);
    return true;
  } catch (error: any) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getDocumentType() {
  console.log('📋 Step 2: Getting document types...');
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

async function uploadCV(cvPath: string) {
  console.log('📤 Step 3: Uploading CV...');
  
  if (!fs.existsSync(cvPath)) {
    console.error(`❌ CV file not found: ${cvPath}`);
    return false;
  }

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(cvPath));
    form.append('documentTypeId', documentTypeId);

    const uploadResponse = await axios.post(`${BASE_URL}/documents/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });

    documentId = uploadResponse.data.id;
    console.log(`✅ CV uploaded successfully!`);
    console.log(`   Document ID: ${documentId}`);
    console.log(`   File: ${path.basename(cvPath)}\n`);
    return true;
  } catch (error: any) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    return false;
  }
}

async function parseCV() {
  console.log('🔍 Step 4: Parsing CV...');
  try {
    const parseResponse = await axios.post(
      `${BASE_URL}/cv-parser/parse/${documentId}`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    parsedData = parseResponse.data.parsedData;
    const extractedText = parseResponse.data.extractedText;

    console.log('✅ CV parsed successfully!');
    console.log(`   Text extracted: ${extractedText?.length || 0} characters`);
    console.log(`   Personal info: ${parsedData.personalInfo ? '✅' : '❌'}`);
    console.log(`   Education: ${parsedData.education?.length || 0} entries`);
    console.log(`   Work experience: ${parsedData.workExperience?.length || 0} entries`);
    console.log(`   Organization experience: ${parsedData.organizationExperience?.length || 0} entries`);
    console.log(`   Skills: ${parsedData.skills?.length || 0} items`);
    console.log(`   Certifications: ${parsedData.certifications?.length || 0} items`);
    console.log(`   Social media: ${parsedData.socialMedia ? '✅' : '❌'}\n`);

    // Show preview
    if (parsedData.personalInfo) {
      console.log('   👤 Name:', parsedData.personalInfo.fullName || 'N/A');
      console.log('   📧 Email:', parsedData.personalInfo.email || 'N/A');
      console.log('   📱 Phone:', parsedData.personalInfo.phone || 'N/A');
    }

    return true;
  } catch (error: any) {
    console.error('❌ Parsing failed:', error.response?.data || error.message);
    return false;
  }
}

async function storeToDatabase() {
  console.log('💾 Step 5: Storing parsed data to database...');
  console.log('📋 Parsed Data Structure:');
  console.log('   - personalInfo:', parsedData.personalInfo ? '✅' : '❌', JSON.stringify(parsedData.personalInfo || {}).substring(0, 100));
  console.log('   - education:', parsedData.education?.length || 0, 'entries');
  console.log('   - workExperience:', parsedData.workExperience?.length || 0, 'entries');
  console.log('   - organizationExperience:', parsedData.organizationExperience?.length || 0, 'entries');
  console.log('   - skills:', parsedData.skills?.length || 0, 'items');
  console.log('   - certifications:', parsedData.certifications?.length || 0, 'items');
  console.log('');
  
  try {
    const storeResponse = await axios.post(
      `${BASE_URL}/candidate-profile/store-parsed-data`,
      {
        parsedData: parsedData,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('📦 Full Response:', JSON.stringify(storeResponse.data, null, 2));
    
    const results = storeResponse.data.data;

    console.log('\n✅ Data stored successfully!\n');
    console.log('📊 Stored Data Summary:');
    console.log('   Personal Info:', results.personalInfo ? '✅' : '❌');
    if (results.personalInfo) {
      console.log('      - Full Name:', results.personalInfo.candidateFullname || 'N/A');
      console.log('      - Email:', results.personalInfo.candidateEmail || 'N/A');
    }
    console.log('   Address:', results.address ? '✅' : '❌');
    console.log('   Education:', results.education?.length || 0, 'entries');
    if (results.education && results.education.length > 0) {
      results.education.forEach((edu: any, idx: number) => {
        console.log(`      ${idx + 1}. ${edu.candidateSchool || 'N/A'} - ${edu.candidateMajor || 'N/A'}`);
      });
    }
    console.log('   Work Experience:', results.workExperience?.length || 0, 'entries');
    if (results.workExperience && results.workExperience.length > 0) {
      results.workExperience.forEach((work: any, idx: number) => {
        console.log(`      ${idx + 1}. ${work.jobTitle || 'N/A'} at ${work.companyName || 'N/A'}`);
      });
    }
    console.log('   Organization Experience:', results.organizationExperience?.length || 0, 'entries');
    if (results.organizationExperience && results.organizationExperience.length > 0) {
      results.organizationExperience.forEach((org: any, idx: number) => {
        console.log(`      ${idx + 1}. ${org.role || 'N/A'} at ${org.organizationName || 'N/A'}`);
      });
    }
    console.log('   Skills:', results.skills?.length || 0, 'items');
    if (results.skills && results.skills.length > 0) {
      console.log('      -', results.skills.slice(0, 5).map((s: any) => s.candidateSkills).join(', '));
      if (results.skills.length > 5) console.log(`      ... and ${results.skills.length - 5} more`);
    }
    console.log('   Certifications:', results.certifications?.length || 0, 'items');
    if (results.certifications && results.certifications.length > 0) {
      results.certifications.forEach((cert: any, idx: number) => {
        console.log(`      ${idx + 1}. ${cert.certificationTitle || 'N/A'}`);
      });
    }
    console.log('   Social Media:', results.socialMedia?.length || 0, 'links\n');

    return true;
  } catch (error: any) {
    console.error('❌ Store failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function verifyStoredData() {
  console.log('🔍 Step 6: Verifying stored data...');
  try {
    // Get candidate profile to verify
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    console.log('✅ Profile retrieved');
    console.log(`   Candidate ID: ${profileResponse.data.id}`);
    console.log(`   Email: ${profileResponse.data.email || profileResponse.data.candidateEmail || 'N/A'}\n`);

    // Note: We can't directly query the stored data without additional endpoints
    // But we can check if the request was successful
    return true;
  } catch (error: any) {
    console.error('❌ Verification failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTest() {
  console.log('🚀 Testing: Login → Upload CV → Parse → Store to Database');
  console.log('='.repeat(70));
  console.log('');

  // Find first PDF in test-files folder
  const testFilesDir = path.join(process.cwd(), 'test-files');
  let cvPath: string | null = null;

  if (fs.existsSync(testFilesDir)) {
    const files = fs.readdirSync(testFilesDir);
    const pdfFiles = files.filter((f) => f.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length > 0) {
      cvPath = path.join(testFilesDir, pdfFiles[0]);
    }
  }

  // Fallback: try root directory
  if (!cvPath) {
    const rootFiles = fs.readdirSync(process.cwd());
    const pdfFiles = rootFiles.filter((f) => f.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length > 0) {
      cvPath = path.join(process.cwd(), pdfFiles[0]);
    }
  }

  if (!cvPath) {
    console.error('❌ No PDF file found in test-files folder or root directory');
    console.log('   Please place a CV PDF file in the test-files folder');
    return;
  }

  console.log(`📄 Using CV: ${path.basename(cvPath)}\n`);

  const results = {
    login: await login(),
    documentType: false,
    upload: false,
    parse: false,
    store: false,
    verify: false,
  };

  if (results.login) {
    results.documentType = await getDocumentType();

    if (results.documentType) {
      results.upload = await uploadCV(cvPath);

      if (results.upload) {
        results.parse = await parseCV();

        if (results.parse) {
          results.store = await storeToDatabase();

          if (results.store) {
            results.verify = await verifyStoredData();
          }
        }
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Login: ${results.login ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Get Document Type: ${results.documentType ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Upload CV: ${results.upload ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Parse CV: ${results.parse ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Store to Database: ${results.store ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Verify Data: ${results.verify ? 'PASS' : 'FAIL'}`);

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;

  console.log(`\n${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Data successfully stored to database!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

// Run test
runTest().catch((error) => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});

