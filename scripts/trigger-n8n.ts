import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BASE_URL = 'http://localhost:3000'; // Adjust if different

async function main() {
  console.log('🚀 Triggering AI Analysis Flow...');

  // 1. Find a Candidate Application to analyze
  // We need an application that has a candidate and a job vacancy.
  // If none exists, we should create one.

  console.log('   Finding/Creating Application...');
  
  // Get a user/candidate (Reza from previous test)
  let candidate = await prisma.candidate.findFirst({
      where: { candidateEmail: 'rezaazhar.p@gmail.com' }
  });

  if (!candidate) {
      console.log('   Target candidate (Reza) not found. Please run test-reza-flow.ts first or create a candidate.');
      // Fallback to any candidate
      candidate = await prisma.candidate.findFirst();
      if (!candidate) {
          console.error('   ❌ No candidates found in DB. Aborting.');
          return;
      }
  }

  // Get a job vacancy
  const job = await prisma.jobVacancy.findFirst({
      where: { department: { departmentName: 'Cloud' } },
      include: { jobVacancyStatus: true } // to check if status exists
  });

  if (!job) {
      console.error('   ❌ No Cloud jobs found. Run seed-jobs.ts.');
      return;
  }
  
  // Check/Create Application Status
  let appStatus = await prisma.applicationStatus.findFirst({ where: { applicationStatus: 'Applied' } });
  if (!appStatus) {
      appStatus = await prisma.applicationStatus.create({ data: { applicationStatus: 'Applied' } });
  }
  
  // Check/Create Salary record (required relation)
  let salary = await prisma.candidateSalary.findFirst({ where: { candidateId: candidate.id } });
  if (!salary) {
      salary = await prisma.candidateSalary.create({ 
          data: { 
              candidateId: candidate.id, 
              expectationSalary: 15000000 
            } 
        });
  }

  // Create Application
  let application = await prisma.candidateApplication.findFirst({
      where: {
          candidateId: candidate.id,
          jobVacancyId: job.id
      }
  });

  if (!application) {
      application = await prisma.candidateApplication.create({
          data: {
              candidateId: candidate.id,
              jobVacancyId: job.id,
              applicationStatusId: appStatus.id,
              candidateSalaryId: salary.id,
              submissionDate: new Date(),
          }
      });
      console.log(`   Created Application ID: ${application.id}`);
  } else {
      console.log(`   Using existing Application ID: ${application.id}`);
  }

  // 2. Trigger Analysis Endpoint
  console.log(`\n   Hitting Endpoint: POST ${BASE_URL}/candidate-applications/${application.id}/analyze`);
  
  try {
      // Note: This requires the NestJS server to be running!
      // If we want to test the SERVICE logic directly without server, we could instantiate the service here,
      // but testing via endpoint is better integration test.
      // However, for this script to run standalone against the service logic without running the full backend:
      
      // Let's rely on the server being UP. 
      // If server is not up, this will fail.
      
      const response = await axios.post(`${BASE_URL}/candidate-applications/${application.id}/analyze`);
      
      console.log('\n✅ Analysis Triggered Successfully!');
      console.log('   Response Data:', JSON.stringify(response.data, null, 2));

      // 3. Verify Database Update
      const updatedApp = await prisma.candidateApplication.findUnique({
          where: { id: application.id }
      });
      
      console.log('\n🔍 Database Verification:');
      console.log(`   Fit Score: ${updatedApp?.fitScore}`);
      console.log(`   AI Insight: ${updatedApp?.aiInsight ? updatedApp.aiInsight.substring(0, 50) + '...' : 'N/A'}`);

  } catch (error: any) {
      console.error('   ❌ Error triggering analysis:', error.message);
      if (error.response) {
          console.error('   Response:', error.response.data);
      } else {
          console.log('   Make sure the NestJS server is running (npm run start:dev)!');
      }
  }

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
