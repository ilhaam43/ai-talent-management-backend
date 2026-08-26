/**
 * Delete All Data Except Users Script
 * 
 * This script wipes all transactional and candidate operational data while preserving:
 * - User accounts (`User`)
 * - User Roles & Permissions (`UserRole`, `Permission`, `RolePermission`)
 * - Employee data & Org structure (`Employee`, `Directorate`, `Group`, `Division`, `Department`, `SubDepartment`, `EmployeePosition`)
 * - Master & Reference lookup data (`Skill`, `JobRole`, `Province`, `City`, etc.)
 * 
 * Usage:
 *   npx tsx scripts/delete-all-data-except-users.ts [--confirm] [--delete-candidate-users]
 * 
 * Options:
 *   --confirm                  Bypass execution prompt and run immediately.
 *   --delete-candidate-users   Also delete User accounts associated strictly with candidates (users without an employee profile).
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

async function deleteAllDataExceptUsers() {
  const args = process.argv.slice(2);
  const isConfirmed = args.includes('--confirm');
  const deleteCandidateUsers = args.includes('--delete-candidate-users');

  console.log('============ 🧹 DELETE ALL DATA EXCEPT USER DATA ============\n');

  if (!isConfirmed) {
    console.log('⚠️  WARNING: Running in SAFETY MODE.');
    console.log('   This operation will delete all Job Vacancies, Applications, Candidates,');
    console.log('   Talent Pool data, and Notifications while preserving User & Employee data.\n');
    console.log('👉 To execute this script, pass the --confirm flag:');
    console.log('   npx tsx scripts/delete-all-data-except-users.ts --confirm\n');
    console.log('👉 Optional: To also delete candidate user accounts (users without employees):');
    console.log('   npx tsx scripts/delete-all-data-except-users.ts --confirm --delete-candidate-users\n');
    return;
  }

  try {
    console.log('🚀 Starting deletion process in foreign key safe order...\n');

    // 1. Delete Candidate Interview Data
    console.log('1️⃣  Deleting Candidate Interview Data...');
    const interviewData = await prisma.candidateInterviewData.deleteMany({});
    console.log(`   ✅ Deleted ${interviewData.count} interview data records`);

    // 2. Delete Candidate Online Assessments
    console.log('2️⃣  Deleting Candidate Online Assessments...');
    const onlineAssessments = await prisma.candidateOnlineAssessment.deleteMany({});
    console.log(`   ✅ Deleted ${onlineAssessments.count} online assessment records`);

    // 3. Delete Candidate Application Pipelines
    console.log('3️⃣  Deleting Candidate Application Pipelines...');
    const applicationPipelines = await prisma.candidateApplicationPipeline.deleteMany({});
    console.log(`   ✅ Deleted ${applicationPipelines.count} application pipeline entries`);

    // 4. Delete Candidate Match Skills
    console.log('4️⃣  Deleting Candidate Match Skills...');
    const matchSkills = await prisma.candidateMatchSkill.deleteMany({});
    console.log(`   ✅ Deleted ${matchSkills.count} match skill entries`);

    // 5. Delete Candidate Applications
    console.log('5️⃣  Deleting Candidate Applications...');
    const applications = await prisma.candidateApplication.deleteMany({});
    console.log(`   ✅ Deleted ${applications.count} applications`);

    // 6. Delete Job Vacancy Skills
    console.log('6️⃣  Deleting Job Vacancy Skills...');
    const jobVacancySkills = await prisma.jobVacancySkill.deleteMany({});
    console.log(`   ✅ Deleted ${jobVacancySkills.count} job vacancy skills`);

    // 7. Delete Talent Pool Screenings
    console.log('7️⃣  Deleting Talent Pool Screenings...');
    const talentPoolScreenings = await prisma.talentPoolScreening.deleteMany({});
    console.log(`   ✅ Deleted ${talentPoolScreenings.count} talent pool screenings`);

    // 8. Delete Job Vacancies
    console.log('8️⃣  Deleting Job Vacancies...');
    const jobVacancies = await prisma.jobVacancy.deleteMany({});
    console.log(`   ✅ Deleted ${jobVacancies.count} job vacancies`);

    // 9. Delete Candidate Documents
    console.log('9️⃣  Deleting Candidate Documents...');
    const candidateDocs = await prisma.candidateDocument.deleteMany({});
    console.log(`   ✅ Deleted ${candidateDocs.count} candidate documents`);

    // 10. Delete Candidate Educations
    console.log('🔟 Deleting Candidate Educations...');
    const candidateEducations = await prisma.candidateEducation.deleteMany({});
    console.log(`   ✅ Deleted ${candidateEducations.count} candidate education records`);

    // 11. Delete Candidate Work Experiences
    console.log('1️⃣1️⃣ Deleting Candidate Work Experiences...');
    const candidateWork = await prisma.candidateWorkExperience.deleteMany({});
    console.log(`   ✅ Deleted ${candidateWork.count} candidate work experience records`);

    // 12. Delete Candidate Skills
    console.log('1️⃣2️⃣ Deleting Candidate Skills...');
    const candidateSkills = await prisma.candidateSkill.deleteMany({});
    console.log(`   ✅ Deleted ${candidateSkills.count} candidate skills`);

    // 13. Delete Candidate Certifications
    console.log('1️⃣3️⃣ Deleting Candidate Certifications...');
    const candidateCerts = await prisma.candidateCertification.deleteMany({});
    console.log(`   ✅ Deleted ${candidateCerts.count} candidate certifications`);

    // 14. Delete Candidate Organization Experiences
    console.log('1️⃣4️⃣ Deleting Candidate Organization Experiences...');
    const candidateOrgs = await prisma.candidateOrganizationExperience.deleteMany({});
    console.log(`   ✅ Deleted ${candidateOrgs.count} candidate org experience records`);

    // 15. Delete Candidate Family records
    console.log('1️⃣5️⃣ Deleting Candidate Family Records...');
    const candidateFamilies = await prisma.candidateFamily.deleteMany({});
    console.log(`   ✅ Deleted ${candidateFamilies.count} candidate family records`);

    // 16. Delete Candidate Lintasarta Family records
    console.log('1️⃣6️⃣ Deleting Candidate Lintasarta Family Records...');
    const candidateLintasartaFamilies = await prisma.candidateFamilyLintasarta.deleteMany({});
    console.log(`   ✅ Deleted ${candidateLintasartaFamilies.count} candidate Lintasarta family records`);

    // 17. Delete Candidate Social Media
    console.log('1️⃣7️⃣ Deleting Candidate Social Media...');
    const candidateSocials = await prisma.candidateSocialMedia.deleteMany({});
    console.log(`   ✅ Deleted ${candidateSocials.count} candidate social media records`);

    // 18. Delete Candidate Salaries
    console.log('1️⃣8️⃣ Deleting Candidate Salaries...');
    const candidateSalaries = await prisma.candidateSalary.deleteMany({});
    console.log(`   ✅ Deleted ${candidateSalaries.count} candidate salary records`);

    // 19. Delete Candidate Addresses
    console.log('1️⃣9️⃣ Deleting Candidate Addresses...');
    const candidateAddresses = await prisma.candidateAddress.deleteMany({});
    console.log(`   ✅ Deleted ${candidateAddresses.count} candidate address records`);

    // 20. Delete Candidate Current Addresses
    console.log('2️⃣0️⃣ Deleting Candidate Current Addresses...');
    const candidateCurrentAddresses = await prisma.candidateCurrentAddress.deleteMany({});
    console.log(`   ✅ Deleted ${candidateCurrentAddresses.count} candidate current address records`);

    // 21. Delete Talent Pool Candidates
    console.log('2️⃣1️⃣ Deleting Talent Pool Candidates...');
    const talentPoolCandidates = await prisma.talentPoolCandidate.deleteMany({});
    console.log(`   ✅ Deleted ${talentPoolCandidates.count} talent pool candidates`);

    // 22. Delete Talent Pool Queue
    console.log('2️⃣2️⃣ Deleting Talent Pool Queue...');
    const talentPoolQueue = await prisma.talentPoolQueue.deleteMany({});
    console.log(`   ✅ Deleted ${talentPoolQueue.count} talent pool queue items`);

    // 23. Delete Talent Pool Batches
    console.log('2️⃣3️⃣ Deleting Talent Pool Batches...');
    const talentPoolBatches = await prisma.talentPoolBatch.deleteMany({});
    console.log(`   ✅ Deleted ${talentPoolBatches.count} talent pool batches`);

    // 24. Delete Candidates
    console.log('2️⃣4️⃣ Deleting Candidates...');
    const candidates = await prisma.candidate.deleteMany({});
    console.log(`   ✅ Deleted ${candidates.count} candidates`);

    // 25. Delete Notifications
    console.log('2️⃣5️⃣ Deleting Notifications...');
    const notifications = await prisma.notification.deleteMany({});
    console.log(`   ✅ Deleted ${notifications.count} notifications`);

    // 26. Delete Candidate Users (Optional)
    let candidateUsersDeletedCount = 0;
    if (deleteCandidateUsers) {
      console.log('2️⃣6️⃣ Deleting Candidate Users (Users without employee records)...');
      const deletedCandidateUsers = await prisma.user.deleteMany({
        where: {
          employees: { none: {} },
        },
      });
      candidateUsersDeletedCount = deletedCandidateUsers.count;
      console.log(`   ✅ Deleted ${candidateUsersDeletedCount} candidate user accounts`);
    } else {
      console.log('ℹ️  Preserved all User accounts (including candidate users). Use --delete-candidate-users to include candidate users.');
    }

    // Verify remaining User count
    const remainingUsers = await prisma.user.count();
    const remainingEmployees = await prisma.employee.count();

    console.log('\n================ DATA DELETION COMPLETE ================');
    console.log(`📊 Summary of Preserved Data:`);
    console.log(`   👤 Users remaining: ${remainingUsers}`);
    console.log(`   👔 Employees remaining: ${remainingEmployees}`);
    console.log(`✨ All transactional and candidate data has been wiped successfully.\n`);

  } catch (error) {
    console.error('❌ Error occurred during deletion:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllDataExceptUsers()
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
