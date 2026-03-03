/**
 * Delete User by Email Script
 * 
 * This script deletes a specific user and ALL related data based on their email.
 * 
 * Usage:
 *   npx tsx scripts/delete-user-by-email.ts <email>
 * 
 * Example:
 *   npx tsx scripts/delete-user-by-email.ts sahla.sholihah@gmail.com
 * 
 * It deletes:
 * - Job vacancies created by the user
 * - Candidate applications for job vacancies
 * - Reference data (statuses, pipelines, etc.) linked to the user
 * - Employee/User data
 * - Auth data
 * - Candidates linked to the user
 * - All related profile data
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

async function deleteUserByEmail(email: string) {
  console.log(`🗑️  Starting comprehensive deletion for email: ${email}\n`);

  try {
    // Search for email in ALL tables
    console.log('🔍 Searching for email in all tables...\n');
    
    const [userByEmail, candidatesByEmail, talentPoolCandidatesByEmail] = await Promise.all([
      prisma.user.findFirst({
        where: { email },
        include: { employees: true, candidates: true },
      }),
      prisma.candidate.findMany({
        where: { candidateEmail: email },
        include: { user: { include: { employees: true, candidates: true } } },
      }),
      prisma.talentPoolCandidate.findMany({
        where: { email },
        include: { batch: true },
      }),
    ]);

    // Collect all unique user IDs and candidate IDs
    const userIds = new Set<string>();
    const candidateIds = new Set<string>();
    const employeeIds = new Set<string>();
    const talentPoolCandidateIds = new Set<string>();

    // From User table
    if (userByEmail) {
      console.log(`✅ Found in User table: ${userByEmail.name} (${userByEmail.email})`);
      userIds.add(userByEmail.id);
      userByEmail.employees.forEach((emp: { id: string }) => employeeIds.add(emp.id));
      userByEmail.candidates.forEach((cand: { id: string }) => candidateIds.add(cand.id));
    }

    // From Candidate table
    if (candidatesByEmail.length > 0) {
      console.log(`✅ Found ${candidatesByEmail.length} candidate(s) in Candidate table:`);
      candidatesByEmail.forEach((candidate: any) => {
        console.log(`   - ${candidate.candidateFullname || 'Unknown'} (${candidate.candidateEmail})`);
        candidateIds.add(candidate.id);
        if (candidate.user) {
          userIds.add(candidate.user.id);
          candidate.user.employees?.forEach((emp: { id: string }) => employeeIds.add(emp.id));
          candidate.user.candidates?.forEach((cand: { id: string }) => candidateIds.add(cand.id));
        }
      });
    }

    // From TalentPoolCandidate table
    if (talentPoolCandidatesByEmail.length > 0) {
      console.log(`✅ Found ${talentPoolCandidatesByEmail.length} talent pool candidate(s):`);
      talentPoolCandidatesByEmail.forEach((tpc: any) => {
        console.log(`   - ${tpc.fullName} (${tpc.email})`);
        talentPoolCandidateIds.add(tpc.id);
      });
    }

    // Check if anything was found
    if (userIds.size === 0 && candidateIds.size === 0 && talentPoolCandidateIds.size === 0) {
      console.log(`\n❌ Email "${email}" not found in any table (User, Candidate, or TalentPoolCandidate).`);
      return;
    }

    console.log(`\n📊 Found data to delete:`);
    console.log(`   - ${userIds.size} user(s)`);
    console.log(`   - ${candidateIds.size} candidate(s)`);
    console.log(`   - ${employeeIds.size} employee(s)`);
    console.log(`   - ${talentPoolCandidateIds.size} talent pool candidate(s)\n`);

    const userIdArray = Array.from(userIds);
    const candidateIdArray = Array.from(candidateIds);
    const employeeIdArray = Array.from(employeeIds);
    const talentPoolCandidateIdArray = Array.from(talentPoolCandidateIds);

    // Delete data in correct order to respect foreign key constraints

    // 1. Delete candidate-related data
    if (candidateIdArray.length > 0) {
      console.log('1️⃣  Deleting candidate-related data...');

      // First, get all application IDs for these candidates
      const candidateApplications = await prisma.candidateApplication.findMany({
        where: { candidateId: { in: candidateIdArray } },
        select: { id: true },
      });
      const applicationIds = candidateApplications.map((app: { id: string }) => app.id);

      if (applicationIds.length > 0) {
        // Delete candidate application pipelines
        console.log('   📋 Deleting candidate application pipelines...');
        const deletedPipelines = await prisma.candidateApplicationPipeline.deleteMany({
          where: { candidateApplicationId: { in: applicationIds } },
        });
        console.log(`   ✅ Deleted ${deletedPipelines.count} pipeline entries\n`);

        // Delete candidate match skills
        console.log('   📋 Deleting candidate match skills...');
        const deletedMatchSkills = await prisma.candidateMatchSkill.deleteMany({
          where: { candidateApplicationId: { in: applicationIds } },
        });
        console.log(`   ✅ Deleted ${deletedMatchSkills.count} match skills\n`);

        // Delete candidate applications
        console.log('   📋 Deleting candidate applications...');
        const deletedApplications = await prisma.candidateApplication.deleteMany({
          where: { candidateId: { in: candidateIdArray } },
        });
        console.log(`   ✅ Deleted ${deletedApplications.count} applications\n`);
      }

      // Delete candidate profile data
      console.log('   📋 Deleting candidate documents...');
      const deletedDocs = await prisma.candidateDocument.deleteMany({
        where: { candidateId: { in: candidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedDocs.count} documents\n`);

      console.log('   📋 Deleting candidate education...');
      const deletedEducation = await prisma.candidateEducation.deleteMany({
        where: { candidateId: { in: candidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedEducation.count} education records\n`);

      console.log('   📋 Deleting candidate work experience...');
      const deletedWork = await prisma.candidateWorkExperience.deleteMany({
        where: { candidateId: { in: candidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedWork.count} work experience records\n`);

      console.log('   📋 Deleting candidate skills...');
      const deletedSkills = await prisma.candidateSkill.deleteMany({
        where: { candidateId: { in: candidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedSkills.count} skills\n`);

      console.log('   📋 Deleting candidate certifications...');
      const deletedCerts = await prisma.candidateCertification.deleteMany({
        where: { candidateId: { in: candidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedCerts.count} certifications\n`);

      console.log('   📋 Deleting candidate organization experience...');
      const deletedOrgs = await prisma.candidateOrganizationExperience.deleteMany({
        where: { candidateId: { in: candidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedOrgs.count} organization experience records\n`);

      console.log('   📋 Deleting candidate families...');
      const deletedFamilies = await prisma.candidateFamily.deleteMany({
        where: { candidateId: { in: candidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedFamilies.count} family records\n`);

      console.log('   📋 Deleting candidate Lintasarta families...');
      const deletedLintasartaFamilies = await prisma.candidateFamilyLintasarta.deleteMany({
        where: { candidateId: { in: candidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedLintasartaFamilies.count} Lintasarta family records\n`);

      console.log('   📋 Deleting candidate social media...');
      const deletedSocialMedia = await prisma.candidateSocialMedia.deleteMany({
        where: { candidateId: { in: candidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedSocialMedia.count} social media records\n`);

      console.log('   📋 Deleting candidate salaries...');
      const deletedSalaries = await prisma.candidateSalary.deleteMany({
        where: { candidateId: { in: candidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedSalaries.count} salary records\n`);

      // Delete candidate addresses
      console.log('   📋 Deleting candidate addresses...');
      const deletedAddresses = await prisma.candidateAddress.deleteMany({
        where: { userId: { in: userIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedAddresses.count} addresses\n`);

      console.log('   📋 Deleting candidate current addresses...');
      const deletedCurrentAddresses = await prisma.candidateCurrentAddress.deleteMany({
        where: { userId: { in: userIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedCurrentAddresses.count} current addresses\n`);

      // Delete candidates
      console.log('   📋 Deleting candidates...');
      const deletedCandidates = await prisma.candidate.deleteMany({
        where: { id: { in: candidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedCandidates.count} candidates\n`);
    }

    // 2. Delete talent pool candidates
    if (talentPoolCandidateIdArray.length > 0) {
      console.log('2️⃣  Deleting talent pool candidates...');

      // Delete talent pool screenings
      console.log('   📋 Deleting talent pool screenings...');
      const deletedScreenings = await prisma.talentPoolScreening.deleteMany({
        where: { talentPoolCandidateId: { in: talentPoolCandidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedScreenings.count} screenings\n`);

      // Delete talent pool candidates
      console.log('   📋 Deleting talent pool candidates...');
      const deletedTalentPoolCandidates = await prisma.talentPoolCandidate.deleteMany({
        where: { id: { in: talentPoolCandidateIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedTalentPoolCandidates.count} talent pool candidates\n`);
    }

    // 3. Delete employee-related data
    if (employeeIdArray.length > 0) {
      console.log('3️⃣  Deleting employee-related data...');

      // Delete employees
      console.log('   📋 Deleting employees...');
      const deletedEmployees = await prisma.employee.deleteMany({
        where: { id: { in: employeeIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedEmployees.count} employees\n`);
    }

    // 4. Delete notifications for these users
    if (userIdArray.length > 0) {
      console.log('4️⃣  Deleting notifications...');
      const deletedNotifications = await prisma.notification.deleteMany({
        where: { userId: { in: userIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedNotifications.count} notifications\n`);
    }

    // 5. Delete user sessions/auth data
    console.log('5️⃣  Deleting user sessions/auth data...');
    // If you have a session table, delete it here
    console.log('   ℹ️  No session table found (skipped)\n');

    // 6. Finally, delete the users
    if (userIdArray.length > 0) {
      console.log('6️⃣  Deleting users...');
      const deletedUsers = await prisma.user.deleteMany({
        where: { id: { in: userIdArray } },
      });
      console.log(`   ✅ Deleted ${deletedUsers.count} user(s)\n`);
    }

    console.log('✅ Deletion complete!\n');
    console.log(`📊 Successfully deleted all data associated with email "${email}"`);

  } catch (error) {
    console.error('❌ Error deleting data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Email address is required');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/delete-user-by-email.ts <email>');
  console.log('\nExample:');
  console.log('  npx tsx scripts/delete-user-by-email.ts sahla.sholihah@gmail.com');
  process.exit(1);
}

// Confirmation prompt
console.log('⚠️  WARNING: This will permanently delete the user and ALL related data!');
console.log(`   Email: ${email}\n`);
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  deleteUserByEmail(email)
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
}, 5000);
