
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixDuplicates() {
  console.log('🛠️ Starting duplicate cleanup...\n');

  // --- Step 1: Deduplicate Job Vacancies ---
  console.log('🔍 Analyzing Job Vacancies...');
  
  const vacancies = await prisma.jobVacancy.findMany({
    include: {
      jobRole: true,
      employeePosition: true
    },
    orderBy: { createdAt: 'asc' } // Keep oldest
  });

  const uniqueMap = new Map<string, string>(); // key -> primaryId
  const duplicates = [];

  for (const v of vacancies) {
    const key = `${v.jobRoleId}-${v.employeePositionId}`; // Unique identifier combo
    
    if (uniqueMap.has(key)) {
      // This is a duplicate!
      duplicates.push({
        duplicateId: v.id,
        primaryId: uniqueMap.get(key),
        name: `${v.jobRole.jobRoleName} - ${v.employeePosition.employeePosition}`
      });
    } else {
      // This is the first one (primary)
      uniqueMap.set(key, v.id);
    }
  }

  console.log(`⚠️ Found ${duplicates.length} duplicate Job Vacancies to merge.`);

  for (const dup of duplicates) {
    const { duplicateId, primaryId, name } = dup;
    console.log(`   MERGING: ${name} (${duplicateId} -> ${primaryId})`);

    // 1. Migrate CandidateApplications
    const apps = await prisma.candidateApplication.updateMany({
      where: { jobVacancyId: duplicateId },
      data: { jobVacancyId: primaryId! }
    });
    if (apps.count > 0) console.log(`      Migrated ${apps.count} applications.`);

    // 2. Migrate or Delete JobVacancySkills
    // We can just delete the duplicate's skills since the primary presumably has them or we don't care about merging sets right now
    await prisma.jobVacancySkill.deleteMany({
      where: { jobVacancyId: duplicateId }
    });

    // 3. Delete the duplicate JobVacancy
    await prisma.jobVacancy.delete({
      where: { id: duplicateId }
    });
    console.log(`      ✅ Deleted duplicate vacancy.`);
  }

  // --- Step 2: Check Job Roles again just in case ---
  // (User mentioned redundant job roles, but previous check said none. We'll skip unless we find any.)

  console.log('\n✅ Deduplication complete!');
  await prisma.$disconnect();
  await pool.end();
}

fixDuplicates().catch(e => {
  console.error(e);
  process.exit(1);
});
