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

async function testMyCV() {
  console.log('🚀 Testing CV Upload & Parse with Real CV');
  console.log('==========================================\n');

  // 1. Login
  console.log('1️⃣  Logging in...');
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_CANDIDATE);
    authToken = loginResponse.data.access_token;
    console.log('✅ Login successful\n');
  } catch (error: any) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return;
  }

  // 2. Get Document Types
  console.log('2️⃣  Getting document types...');
  try {
    const typesResponse = await axios.get(`${BASE_URL}/documents/types`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const cvType = typesResponse.data.find((t: any) => t.documentType === 'CV/Resume');
    documentTypeId = cvType.id;
    console.log('✅ Found CV/Resume type\n');
  } catch (error: any) {
    console.error('❌ Failed to get document types:', error.response?.data || error.message);
    return;
  }

  // 3. Upload Your CV
  console.log('3️⃣  Uploading your CV...');
  const cvPath = path.join(process.cwd(), 'Muhammad-Reza-Azhar-Priyadi-Resume.pdf');
  
  if (!fs.existsSync(cvPath)) {
    console.error('❌ CV file not found at:', cvPath);
    console.log('   Please ensure your CV is in the project root directory');
    return;
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
    console.log('✅ CV uploaded successfully!');
    console.log(`   Document ID: ${documentId}`);
    console.log(`   File size: ${uploadResponse.data.fileSize} bytes\n`);
  } catch (error: any) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    return;
  }

  // 4. Parse Your CV
  console.log('4️⃣  Parsing your CV...');
  try {
    const parseResponse = await axios.post(
      `${BASE_URL}/cv-parser/parse/${documentId}`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    const parsedData = parseResponse.data.parsedData;

    console.log('✅ CV parsed successfully!\n');
    
    console.log('=' .repeat(60));
    console.log('📄 EXTRACTED TEXT PREVIEW');
    console.log('='.repeat(60));
    console.log(parseResponse.data.extractedText.substring(0, 500));
    console.log('...\n');

    console.log('='.repeat(60));
    console.log('👤 PERSONAL INFORMATION');
    console.log('='.repeat(60));
    if (parsedData.personalInfo) {
      Object.entries(parsedData.personalInfo).forEach(([key, value]) => {
        if (value) {
          console.log(`   ${key.padEnd(20)}: ${value}`);
        }
      });
    }
    console.log('');

    console.log('='.repeat(60));
    console.log('🎓 EDUCATION');
    console.log('='.repeat(60));
    if (parsedData.education && parsedData.education.length > 0) {
      parsedData.education.forEach((edu: any, idx: number) => {
        console.log(`   ${idx + 1}. ${edu.institution || 'N/A'}`);
        console.log(`      Degree: ${edu.degree || 'N/A'}`);
        if (edu.major) console.log(`      Major: ${edu.major}`);
        if (edu.gpa) console.log(`      GPA: ${edu.gpa}${edu.maxGpa ? '/' + edu.maxGpa : ''}`);
        console.log(`      Period: ${edu.startYear || 'N/A'} - ${edu.endYear || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('   No education data extracted\n');
    }

    console.log('='.repeat(60));
    console.log('💼 WORK EXPERIENCE');
    console.log('='.repeat(60));
    if (parsedData.workExperience && parsedData.workExperience.length > 0) {
      parsedData.workExperience.forEach((work: any, idx: number) => {
        console.log(`   ${idx + 1}. ${work.position || 'N/A'}`);
        console.log(`      Company: ${work.company || 'N/A'}`);
        console.log(`      Period: ${work.startDate || 'N/A'} - ${work.endDate || 'N/A'}`);
        if (work.description) {
          console.log(`      Description: ${work.description.substring(0, 100)}...`);
        }
        console.log('');
      });
    } else {
      console.log('   No work experience data extracted\n');
    }

    console.log('='.repeat(60));
    console.log('🏢 ORGANIZATION EXPERIENCE');
    console.log('='.repeat(60));
    if (parsedData.organizationExperience && parsedData.organizationExperience.length > 0) {
      parsedData.organizationExperience.forEach((org: any, idx: number) => {
        console.log(`   ${idx + 1}. ${org.role || 'N/A'}`);
        console.log(`      Organization: ${org.organization || 'N/A'}`);
        console.log(`      Period: ${org.startDate || 'N/A'} - ${org.endDate || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('   No organization experience data extracted\n');
    }

    console.log('='.repeat(60));
    console.log('🔧 SKILLS');
    console.log('='.repeat(60));
    if (parsedData.skills && parsedData.skills.length > 0) {
      const skillsPerLine = 4;
      for (let i = 0; i < parsedData.skills.length; i += skillsPerLine) {
        const skillsLine = parsedData.skills.slice(i, i + skillsPerLine).join(', ');
        console.log(`   ${skillsLine}`);
      }
      console.log('');
    } else {
      console.log('   No skills data extracted\n');
    }

    console.log('='.repeat(60));
    console.log('📜 CERTIFICATIONS');
    console.log('='.repeat(60));
    if (parsedData.certifications && parsedData.certifications.length > 0) {
      parsedData.certifications.forEach((cert: any, idx: number) => {
        console.log(`   ${idx + 1}. ${cert.name || 'N/A'}`);
        if (cert.issuer) console.log(`      Issued by: ${cert.issuer}`);
        if (cert.startDate) console.log(`      Date: ${cert.startDate}`);
        console.log('');
      });
    } else {
      console.log('   No certifications data extracted\n');
    }

    console.log('='.repeat(60));
    console.log('✅ PARSING COMPLETE!');
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.error('❌ Parsing failed:', error.response?.data || error.message);
    return;
  }

  // 5. Cleanup (Optional - delete the uploaded document)
  console.log('\n5️⃣  Do you want to delete the uploaded CV? (It will remain in database)');
  console.log('   You can manually delete it via DELETE /documents/' + documentId);
  console.log('   Or through Swagger UI at http://localhost:3000/docs');
}

// Run the test
testMyCV().catch(console.error);


