import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTalentPoolFlags() {
  console.log('🔧 Fixing talent pool flags for misplaced candidates...\n');

  // Find candidates that appear in active list but should be in talent pool
  // These are candidates with applications but marked as isTalentPool: false
  const candidatesToFix = await prisma.candidate.findMany({
    where: {
      isTalentPool: false,
      // Candidates with names matching known talent pool candidates
      OR: [
        { candidateFullname: { contains: 'ADITYA', mode: 'insensitive' } },
        { candidateFullname: { contains: 'Muhammad Reza', mode: 'insensitive' } },
      ],
    },
    include: {
      applications: {
        select: {
          id: true,
          jobVacancy: {
            select: { jobRole: { select: { jobRoleName: true } } },
          },
        },
      },
    },
  });

  console.log(`Found ${candidatesToFix.length} candidate(s) to review:\n`);

  for (const candidate of candidatesToFix) {
    console.log(`📋 ${candidate.candidateFullname || 'Unknown'} (ID: ${candidate.id})`);
    console.log(`   - Applications: ${candidate.applications.length}`);
    console.log(`   - Current flag: isTalentPool = ${candidate.isTalentPool}`);
  }

  if (candidatesToFix.length === 0) {
    console.log('✅ No candidates need fixing!');
    return;
  }

  console.log('\n🔄 Updating isTalentPool flag to TRUE for these candidates...\n');

  // Update all found candidates to isTalentPool: true
  const updateResult = await prisma.candidate.updateMany({
    where: {
      id: { in: candidatesToFix.map((c) => c.id) },
    },
    data: {
      isTalentPool: true,
    },
  });

  console.log(`✅ Updated ${updateResult.count} candidate(s)`);
  console.log('\n📝 Summary:');
  for (const candidate of candidatesToFix) {
    console.log(`   - ${candidate.candidateFullname}: Now in Talent Pool`);
  }

  console.log('\n✨ Done! Refresh your application to see the changes.');
}

fixTalentPoolFlags()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
