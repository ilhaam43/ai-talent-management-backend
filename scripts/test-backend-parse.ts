import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CVParserService } from '../src/cv-parser/cv-parser.service';
import * as path from 'path';
import * as fs from 'fs';

async function testBackendService() {
  console.log('🚀 Initializing NestJS App context inside container...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const cvParserService = app.get(CVParserService);

  const cvPath = path.resolve('/usr/src/app/test-files/CV_Aditiya Purwansyah.pdf');
  console.log(`📄 Testing backend CVParserService on: ${cvPath}`);

  const mockFile = {
    fieldname: 'file',
    originalname: 'CV_Aditiya Purwansyah.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    destination: '/tmp',
    filename: 'test-cv.pdf',
    path: cvPath,
    size: fs.statSync(cvPath).size,
    buffer: fs.readFileSync(cvPath),
    stream: null as any,
  };

  const result = await cvParserService.parseFile(mockFile);
  console.log('\n--- BACKEND CVPARSERSERVICE RESULT ---');
  console.log('Work Experience count:', result.parsedData.workExperience.length);
  console.log('Work Companies:', result.parsedData.workExperience.map((w: any) => w.company));
  console.log('Organization Experience count:', result.parsedData.organizationExperience.length);
  console.log('Organization Names:', result.parsedData.organizationExperience.map((o: any) => o.organization));
  console.log('Skills count:', result.parsedData.skills.length);
  console.log('Certifications count:', result.parsedData.certifications.length);

  await app.close();
}

testBackendService().catch(console.error);
