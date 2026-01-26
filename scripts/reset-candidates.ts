/**
 * Reset Candidate Data Script
 * 
 * This script cleans up all candidate-related data to allow fresh testing.
 * It preserves:
 * - Job vacancies
 * - Reference data (statuses, pipelines, etc.)
 * - Employee/User data
 * 
 * It deletes:
 * - All candidates (both regular and talent pool)
 * - All candidate applications
 * - All talent pool batches and queue items
 * - All candidate profile data (education, work experience, etc.)
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function resetCandidates() {
  console.log('🔄 Starting candidate data reset...\n');

  try {
    // Delete in correct order to respect foreign key constraints
    
    // 1. Delete candidate application pipelines (depends on applications)
    console.log('1️⃣  Deleting candidate application pipelines...');
    const deletedPipelines = await prisma.candidateApplicationPipeline.deleteMany({});
    console.log(`   ✅ Deleted ${deletedPipelines.count} pipeline entries\n`);

    // 2. Delete candidate match skills
    console.log('2️⃣  Deleting candidate match skills...');
    const deletedMatchSkills = await prisma.candidateMatchSkill.deleteMany({});
    console.log(`   ✅ Deleted ${deletedMatchSkills.count} match skills\n`);

    // 3. Delete candidate applications
    console.log('3️⃣  Deleting candidate applications...');
    const deletedApplications = await prisma.candidateApplication.deleteMany({});
    console.log(`   ✅ Deleted ${deletedApplications.count} applications\n`);

    // 4. Delete candidate profile data
    console.log('4️⃣  Deleting candidate documents...');
    const deletedDocs = await prisma.candidateDocument.deleteMany({});
    console.log(`   ✅ Deleted ${deletedDocs.count} documents\n`);

    console.log('5️⃣  Deleting candidate education...');
    const deletedEducation = await prisma.candidateEducation.deleteMany({});
    console.log(`   ✅ Deleted ${deletedEducation.count} education records\n`);

    console.log('6️⃣  Deleting candidate work experience...');
    const deletedWork = await prisma.candidateWorkExperience.deleteMany({});
    console.log(`   ✅ Deleted ${deletedWork.count} work experience records\n`);

    console.log('7️⃣  Deleting candidate skills...');
    const deletedSkills = await prisma.candidateSkill.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSkills.count} skills\n`);

    console.log('8️⃣  Deleting candidate certifications...');
    const deletedCerts = await prisma.candidateCertification.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCerts.count} certifications\n`);

    console.log('9️⃣  Deleting candidate organization experience...');
    const deletedOrgs = await prisma.candidateOrganizationExperience.deleteMany({});
    console.log(`   ✅ Deleted ${deletedOrgs.count} organization experience records\n`);

    console.log('🔟 Deleting candidate families...');
    const deletedFamilies = await prisma.candidateFamily.deleteMany({});
    console.log(`   ✅ Deleted ${deletedFamilies.count} family records\n`);

    console.log('1️⃣1️⃣  Deleting candidate Lintasarta families...');
    const deletedLintasartaFamilies = await prisma.candidateFamilyLintasarta.deleteMany({});
    console.log(`   ✅ Deleted ${deletedLintasartaFamilies.count} Lintasarta family records\n`);

    console.log('1️⃣2️⃣  Deleting candidate social media...');
    const deletedSocialMedia = await prisma.candidateSocialMedia.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSocialMedia.count} social media records\n`);

    console.log('1️⃣3️⃣  Deleting candidate salaries...');
    const deletedSalaries = await prisma.candidateSalary.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSalaries.count} salary records\n`);

    // 5. Delete talent pool data
    console.log('1️⃣4️⃣  Deleting talent pool screenings...');
    const deletedScreenings = await prisma.talentPoolScreening.deleteMany({});
    console.log(`   ✅ Deleted ${deletedScreenings.count} talent pool screenings\n`);

    console.log('1️⃣5️⃣  Deleting legacy talent pool candidates...');
    const deletedTalentPoolCandidates = await prisma.talentPoolCandidate.deleteMany({});
    console.log(`   ✅ Deleted ${deletedTalentPoolCandidates.count} legacy talent pool candidates\n`);

    console.log('1️⃣6️⃣  Deleting talent pool queue...');
    const deletedQueue = await prisma.talentPoolQueue.deleteMany({});
    console.log(`   ✅ Deleted ${deletedQueue.count} queue items\n`);

    console.log('1️⃣7️⃣  Deleting talent pool batches...');
    const deletedBatches = await prisma.talentPoolBatch.deleteMany({});
    console.log(`   ✅ Deleted ${deletedBatches.count} batches\n`);

    // 6. Delete candidates
    console.log('1️⃣8️⃣  Deleting candidates...');
    const deletedCandidates = await prisma.candidate.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCandidates.count} candidates\n`);

    // 7. Delete users (only those who are candidates - be careful!)
    console.log('1️⃣9️⃣  Deleting candidate users (users without employees)...');
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        employees: { none: {} }, // Only delete users who are NOT employees
      },
    });
    console.log(`   ✅ Deleted ${deletedUsers.count} users\n`);

    // 8. Delete notifications
    console.log('2️⃣0️⃣  Deleting notifications...');
    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(`   ✅ Deleted ${deletedNotifications.count} notifications\n`);

    console.log('✅ Candidate data reset complete!\n');
    console.log('📊 Summary:');
    console.log(`   - ${deletedCandidates.count} candidates`);
    console.log(`   - ${deletedApplications.count} applications`);
    console.log(`   - ${deletedBatches.count} talent pool batches`);
    console.log(`   - ${deletedUsers.count} users\n`);
    
    console.log('✨ You can now run seeders to populate fresh data.');

  } catch (error) {
    console.error('❌ Error resetting candidate data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetCandidates()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
