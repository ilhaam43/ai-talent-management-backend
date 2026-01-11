import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SELECTED_TRACKS = [
  'Cloud Delivery and Operation',
  'Cybersecurity Delivery and Operation',
  'Collaboration Solution',
];

async function main() {
  console.log('🔍 Debugging Job Matching Logic');
  console.log('-------------------------------');

  // 1. List All Jobs with their Organization Structure
  console.log('\n1️⃣  ALL JOBS IN DATABASE:');
  const allJobs = await prisma.jobVacancy.findMany({
    include: {
      jobRole: true,
      division: true,
      department: true,
      group: true,
      directorate: true,
    }
  });

  if (allJobs.length === 0) {
    console.log('   ❌ No jobs found in database.');
  } else {
    allJobs.forEach((job, idx) => {
      console.log(`   [${idx + 1}] ID: ${job.id}`);
      console.log(`       Role: ${job.jobRole?.jobRoleName}`);
      console.log(`       Division: ${job.division?.divisionName}`);
      console.log(`       Department: ${job.department?.departmentName}`);
      console.log(`       Group: ${job.group?.groupName}`);
      console.log(`       Directorate: ${job.directorate?.directorateName}`);
      console.log('       ----------------');
    });
  }

  // 2. Simulate Match Logic
  console.log('\n2️⃣  SIMULATING MATCH LOGIC:');
  console.log(`   Criteria: ${JSON.stringify(SELECTED_TRACKS, null, 2)}`);

  const orConditions: any[] = [];
  for (const div of SELECTED_TRACKS) {
    const searchTerm = div.trim();
    orConditions.push(
      { division: { divisionName: { contains: searchTerm, mode: 'insensitive' } } },
      { department: { departmentName: { contains: searchTerm, mode: 'insensitive' } } },
      { group: { groupName: { contains: searchTerm, mode: 'insensitive' } } },
      { directorate: { directorateName: { contains: searchTerm, mode: 'insensitive' } } }
    );
  }

  const whereClause = {
    OR: orConditions
  };

  const matchedJobs = await prisma.jobVacancy.findMany({
    where: whereClause,
    include: {
      jobRole: true,
      division: true,
      department: true,
      group: true,
      directorate: true,
    }
  });

  console.log(`\n   ✅ Found ${matchedJobs.length} matching jobs.`);
  
  matchedJobs.forEach((job, idx) => {
    console.log(`   [${idx + 1}] ID: ${job.id}`);
    console.log(`       Role: ${job.jobRole?.jobRoleName}`);
    // Check which condition matched
    const matches: string[] = [];
    SELECTED_TRACKS.forEach(track => {
      if (job.division?.divisionName?.toLowerCase().includes(track.toLowerCase())) matches.push(`Division (${track})`);
      if (job.department?.departmentName?.toLowerCase().includes(track.toLowerCase())) matches.push(`Department (${track})`);
      if (job.group?.groupName?.toLowerCase().includes(track.toLowerCase())) matches.push(`Group (${track})`);
      if (job.directorate?.directorateName?.toLowerCase().includes(track.toLowerCase())) matches.push(`Directorate (${track})`);
    });
    console.log(`       MATCHED VIA: ${matches.join(', ')}`);
  });

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
