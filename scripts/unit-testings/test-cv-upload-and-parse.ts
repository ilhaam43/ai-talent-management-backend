import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';

// Test candidate credentials
const TEST_CANDIDATE = {
  email: 'test@example.com',
  password: 'password123',
};

let authToken: string;
let candidateId: string;
let documentId: string;
let documentTypeId: string;

async function login() {
  console.log('\n1️⃣  Testing Login...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_CANDIDATE);
    authToken = response.data.access_token;
    console.log('✅ Login successful');
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error: any) {
    console.error('❌ Login failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else if (error.request) {
      console.error('   No response received. Is server running?');
      console.error('   URL:', `${BASE_URL}/auth/login`);
    } else {
      console.error('   Error:', error.message);
    }
    return false;
  }
}

async function getProfile() {
  console.log('\n2️⃣  Getting Profile...');
  try {
    const response = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    candidateId = response.data.id;
    console.log('✅ Profile retrieved');
    console.log(`   Candidate ID: ${candidateId}`);
    console.log(`   Email: ${response.data.email}`);
    return true;
  } catch (error: any) {
    console.error('❌ Get profile failed:', error.response?.data || error.message);
    return false;
  }
}

async function getDocumentTypes() {
  console.log('\n3️⃣  Getting Document Types...');
  try {
    const response = await axios.get(`${BASE_URL}/documents/types`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const types = response.data;
    console.log('✅ Document types retrieved');
    types.forEach((type: any) => {
      console.log(`   - ${type.documentType} (${type.id})`);
      if (type.documentType === 'CV/Resume') {
        documentTypeId = type.id;
      }
    });
    return true;
  } catch (error: any) {
    console.error('❌ Get document types failed:', error.response?.data || error.message);
    return false;
  }
}

async function uploadDocument() {
  console.log('\n4️⃣  Testing Document Upload...');
  
  // Create a test PDF file if it doesn't exist
  const testFilePath = path.join(__dirname, '../test-files/sample-cv.pdf');
  const testFileDir = path.dirname(testFilePath);
  
  if (!fs.existsSync(testFileDir)) {
    fs.mkdirSync(testFileDir, { recursive: true });
  }
  
  if (!fs.existsSync(testFilePath)) {
    // Create a simple PDF file (minimal valid PDF structure)
    const sampleContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 500
>>
stream
BT
/F1 12 Tf
50 750 Td
(JOHN DOE) Tj
0 -20 Td
(Email: john.doe@example.com) Tj
0 -20 Td
(Phone: +62 812-3456-7890) Tj
0 -20 Td
(Address: Jakarta, Indonesia) Tj
0 -40 Td
(EDUCATION) Tj
0 -20 Td
(University of Indonesia) Tj
0 -15 Td
(Bachelor of Computer Science, GPA: 3.75/4.00, 2013-2017) Tj
0 -40 Td
(WORK EXPERIENCE) Tj
0 -20 Td
(Tech Company Indonesia - Software Engineer) Tj
0 -15 Td
(August 2017 - December 2020) Tj
0 -40 Td
(SKILLS) Tj
0 -15 Td
(JavaScript, Python, React, Node.js) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
876
%%EOF
`;
    
    fs.writeFileSync(testFilePath, sampleContent);
    console.log('   Created sample PDF file');
  }
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('documentTypeId', documentTypeId);
    
    const response = await axios.post(`${BASE_URL}/documents/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });
    
    documentId = response.data.id;
    console.log('✅ Document uploaded successfully');
    console.log(`   Document ID: ${documentId}`);
    console.log(`   File name: ${response.data.fileName}`);
    console.log(`   File size: ${response.data.fileSize} bytes`);
    return true;
  } catch (error: any) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    return false;
  }
}

async function getDocuments() {
  console.log('\n5️⃣  Getting All Documents...');
  try {
    const response = await axios.get(`${BASE_URL}/documents`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log('✅ Documents retrieved');
    response.data.forEach((doc: any) => {
      console.log(`   - ${doc.fileName} (${doc.documentType})`);
    });
    return true;
  } catch (error: any) {
    console.error('❌ Get documents failed:', error.response?.data || error.message);
    return false;
  }
}

async function parseDocument() {
  console.log('\n6️⃣  Testing CV Parsing...');
  try {
    const response = await axios.post(
      `${BASE_URL}/cv-parser/parse/${documentId}`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    
    console.log('✅ CV parsed successfully');
    console.log('\n📄 Extracted Text Preview:');
    console.log('   ' + response.data.extractedText.substring(0, 200) + '...');
    
    console.log('\n👤 Personal Information:');
    const personal = response.data.parsedData.personalInfo;
    Object.entries(personal).forEach(([key, value]) => {
      if (value) console.log(`   ${key}: ${value}`);
    });
    
    console.log('\n🎓 Education:');
    response.data.parsedData.education.forEach((edu: any, idx: number) => {
      console.log(`   ${idx + 1}. ${edu.institution}`);
      console.log(`      ${edu.degree} in ${edu.major || 'N/A'}`);
      console.log(`      ${edu.startYear} - ${edu.endYear}, GPA: ${edu.gpa || 'N/A'}`);
    });
    
    console.log('\n💼 Work Experience:');
    response.data.parsedData.workExperience.forEach((work: any, idx: number) => {
      console.log(`   ${idx + 1}. ${work.position} at ${work.company}`);
      console.log(`      ${work.startDate} - ${work.endDate}`);
    });
    
    console.log('\n🏢 Organization Experience:');
    response.data.parsedData.organizationExperience.forEach((org: any, idx: number) => {
      console.log(`   ${idx + 1}. ${org.role} at ${org.organization}`);
      console.log(`      ${org.startDate} - ${org.endDate}`);
    });
    
    console.log('\n🔧 Skills:');
    console.log(`   ${response.data.parsedData.skills.join(', ')}`);
    
    console.log('\n📜 Certifications:');
    response.data.parsedData.certifications.forEach((cert: any, idx: number) => {
      console.log(`   ${idx + 1}. ${cert.name}`);
      if (cert.issuer) console.log(`      Issued by: ${cert.issuer}`);
    });
    
    return true;
  } catch (error: any) {
    console.error('❌ Parsing failed:', error.response?.data || error.message);
    return false;
  }
}

async function downloadDocument() {
  console.log('\n7️⃣  Testing Document Download...');
  try {
    const response = await axios.get(
      `${BASE_URL}/documents/${documentId}/download`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        responseType: 'arraybuffer',
      },
    );
    console.log('✅ Document downloaded successfully');
    console.log(`   Size: ${response.data.byteLength} bytes`);
    return true;
  } catch (error: any) {
    console.error('❌ Download failed:', error.response?.data || error.message);
    return false;
  }
}

async function deleteDocument() {
  console.log('\n8️⃣  Testing Document Deletion...');
  try {
    const response = await axios.delete(`${BASE_URL}/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log('✅ Document deleted successfully');
    console.log(`   ${response.data.message}`);
    return true;
  } catch (error: any) {
    console.error('❌ Deletion failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting CV Upload & Parse API Tests');
  console.log('=====================================');
  
  const results = {
    login: await login(),
    profile: false,
    documentTypes: false,
    upload: false,
    getDocuments: false,
    parse: false,
    download: false,
    delete: false,
  };
  
  if (results.login) {
    results.profile = await getProfile();
    results.documentTypes = await getDocumentTypes();
    
    if (results.documentTypes && documentTypeId) {
      results.upload = await uploadDocument();
      
      if (results.upload) {
        results.getDocuments = await getDocuments();
        results.parse = await parseDocument();
        results.download = await downloadDocument();
        results.delete = await deleteDocument();
      }
    }
  }
  
  console.log('\n\n📊 Test Results Summary');
  console.log('======================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

// Run tests
runTests().catch(console.error);

