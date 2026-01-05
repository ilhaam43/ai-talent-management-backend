
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CandidatesService } from '../src/candidates/candidates.service';
import { PrismaService } from '../src/database/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(CandidatesService);
  const prisma = app.get(PrismaService);
  
  // Create a dummy user first (required for candidate)
  const timestamp = Date.now();
  const email = `test.user.${timestamp}@example.com`;
  
  console.log(`Creating test user: ${email}`);
  const user = await prisma.user.create({
    data: {
      email: email,
      name: 'Test User',
      password: 'hashedpassword', // Dummy
      role: {
         create: {
             userRole: 'CANDIDATE' // Assuming this exists or just string if it's enum but schema shows UserRole model
         }
      }
    }
  }).catch(async (e) => {
      // Fallback if role creation fails or simple user creation
      return prisma.user.create({
        data: {
            email: email,
            name: 'Test User',
            password: 'hashedpassword'
        }
      });
  });

  console.log(`User created: ${user.id}`);

  console.log('Creating test candidate...');
  const candidate = await prisma.candidate.create({
    data: {
      userId: user.id,
      candidateEmail: email,
      candidateFullname: 'Test Candidate',
      documents: {
        create: {
            filePath: '/tmp/test.pdf',
            documentType: {
                create: {
                    documentType: `CV_${timestamp}`
                }
            }
        }
      }
    }
  });

  console.log(`Testing with Candidate ID: ${candidate.id}`);

  try {
      const detail = await service.getById(candidate.id);
      console.log('Candidate basic info found:', detail?.candidateEmail);
      
      console.log('Relations check:');
      console.log('- Documents:', detail?.documents?.length ?? 'N/A');
      
      if (detail?.documents?.length > 0) {
          console.log('  - Document Type:', (detail.documents[0] as any).documentType?.documentType ?? 'N/A');
      }

      const fs = require('fs');
      if (detail?.documents?.length > 0) {
        console.log('SUCCESS: Retrieved candidate details with relations.');
        fs.writeFileSync('verification_result.txt', 'SUCCESS');
      } else {
        console.error('FAILURE: Documents not returned.');
        fs.writeFileSync('verification_error.txt', 'Documents missing');
        process.exit(1);
      }

  } catch (error) {
      const fs = require('fs');
      console.error('ERROR: Failed to get candidate details', error);
      fs.writeFileSync('verification_error.txt', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      process.exit(1);
  }
  
  await app.close();
}
bootstrap();
