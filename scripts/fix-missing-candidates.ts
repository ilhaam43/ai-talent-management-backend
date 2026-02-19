import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== CHECKING USER CANDIDATE PROFILES ===\n');

  // Get all users
  const users = await prisma.user.findMany({
    include: {
      candidate: true,
    },
  });

  console.log(`Found ${users.length} users:\n`);

  const usersWithoutCandidates: any[] = [];

  for (const user of users) {
    if (user.candidate) {
      console.log(`✅ ${user.email} - Has candidate profile (${user.candidate.candidateFullname})`);
    } else {
      console.log(`❌ ${user.email} - NO candidate profile`);
      usersWithoutCandidates.push(user);
    }
  }

  if (usersWithoutCandidates.length > 0) {
    console.log(`\n\n=== CREATING MISSING CANDIDATE PROFILES ===\n`);

    for (const user of usersWithoutCandidates) {
      const candidate = await prisma.candidate.create({
        data: {
          userId: user.id,
          candidateFullname: user.name,
          candidateEmail: user.email,
        },
      });
      console.log(`✅ Created candidate profile for ${user.email}`);
    }

    console.log('\n✨ All users now have candidate profiles!');
  } else {
    console.log('\n✅ All users have candidate profiles!');
  }

  console.log('\n=== DONE ===\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
