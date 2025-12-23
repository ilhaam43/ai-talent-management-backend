import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';

const TEST_CANDIDATE = {
  email: 'test@example.com',
  password: 'password123',
};

let authToken: string;
let documentTypeId: string;

interface ParseResult {
  fileName: string;
  success: boolean;
  personalInfo?: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
  education?: number;
  workExperience?: number;
  skills?: number;
  certifications?: number;
  error?: string;
}

async function login(): Promise<boolean> {
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

async function getDocumentType(): Promise<boolean> {
  try {
    const response = await axios.get(`${BASE_URL}/documents/types`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const cvType = response.data.find((t: any) => t.documentType === 'CV/Resume');
    if (cvType) {
    documentTypeId = cvType.id;
      return true;
    }
    // Fallback to first type
    if (response.data.length > 0) {
      documentTypeId = response.data[0].id;
    return true;
    }
    return false;
  } catch (error: any) {
    console.error('❌ Failed to get document types:', error.response?.data || error.message);
    return false;
  }
}

async function testCV(cvPath: string): Promise<ParseResult> {
  const fileName = path.basename(cvPath);
  const result: ParseResult = { fileName, success: false };

  try {
    // Upload
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

    // Parse
    const parseResponse = await axios.post(
      `${BASE_URL}/cv-parser/parse/${documentId}`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    
    const parsedData = parseResponse.data.parsedData;
    
    result.success = true;
    result.personalInfo = {
      fullName: parsedData.personalInfo?.fullName,
      email: parsedData.personalInfo?.email,
      phone: parsedData.personalInfo?.phone,
    };
    result.education = parsedData.education?.length || 0;
    result.workExperience = parsedData.workExperience?.length || 0;
    result.skills = parsedData.skills?.length || 0;
    result.certifications = parsedData.certifications?.length || 0;

  } catch (error: any) {
    result.error = error.response?.data?.message || error.message;
  }

  return result;
}

function printResult(result: ParseResult) {
  console.log('\n' + '='.repeat(70));
  console.log(`📄 ${result.fileName}`);
  console.log('='.repeat(70));

  if (result.success) {
    console.log(`👤 Name:       ${result.personalInfo?.fullName || '❌ Not found'}`);
    console.log(`📧 Email:      ${result.personalInfo?.email || '❌ Not found'}`);
    console.log(`📱 Phone:      ${result.personalInfo?.phone || '❌ Not found'}`);
    console.log(`🎓 Education:  ${result.education} entries`);
    console.log(`💼 Work Exp:   ${result.workExperience} entries`);
    console.log(`🔧 Skills:     ${result.skills} items`);
    console.log(`📜 Certs:      ${result.certifications} items`);
  } else {
    console.log(`❌ Error: ${result.error}`);
  }
}

async function main() {
  console.log('🚀 Testing All CVs in test-files folder');
  console.log('='.repeat(70));
  console.log('');

  if (!(await login())) return;
  if (!(await getDocumentType())) return;

  const testFilesDir = path.join(process.cwd(), 'test-files');
  const files = fs.readdirSync(testFilesDir).filter((f) => f.toLowerCase().endsWith('.pdf'));

  console.log(`Found ${files.length} PDF files to test\n`);

  const results: ParseResult[] = [];

  for (const file of files) {
    console.log(`\n📤 Processing: ${file}...`);
    const result = await testCV(path.join(testFilesDir, file));
    results.push(result);
    printResult(result);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(70));

  const successCount = results.filter((r) => r.success).length;
  const nameFound = results.filter((r) => r.personalInfo?.fullName).length;
  const emailFound = results.filter((r) => r.personalInfo?.email).length;
  const phoneFound = results.filter((r) => r.personalInfo?.phone).length;
  const totalEdu = results.reduce((sum, r) => sum + (r.education || 0), 0);
  const totalWork = results.reduce((sum, r) => sum + (r.workExperience || 0), 0);
  const totalSkills = results.reduce((sum, r) => sum + (r.skills || 0), 0);

  console.log(`\n✅ Parsed successfully: ${successCount}/${files.length}`);
  console.log('\n📈 Detection Rate:');
  console.log(`   Name:       ${nameFound}/${successCount} (${Math.round((nameFound / successCount) * 100)}%)`);
  console.log(`   Email:      ${emailFound}/${successCount} (${Math.round((emailFound / successCount) * 100)}%)`);
  console.log(`   Phone:      ${phoneFound}/${successCount} (${Math.round((phoneFound / successCount) * 100)}%)`);
  console.log(`\n📊 Total Extracted:`);
  console.log(`   Education:      ${totalEdu} entries`);
  console.log(`   Work Exp:       ${totalWork} entries`);
  console.log(`   Skills:         ${totalSkills} items`);

  console.log('\n📋 Per-file Results:');
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    const name = r.personalInfo?.fullName || 'N/A';
    console.log(`   ${status} ${r.fileName}: ${name}`);
  }
  }

main().catch(console.error);
