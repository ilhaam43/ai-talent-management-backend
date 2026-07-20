import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Error: Please provide a candidate email address.");
    console.log("Usage: npx tsx scripts/reset-application.ts <candidate-email>");
    process.exit(1);
  }

  console.log(`Searching for user ${email}...`);
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }

  const candidate = await prisma.candidate.findFirst({
    where: { userId: user.id },
  });

  if (!candidate) {
    console.log(`Candidate profile for user ID ${user.id} not found.`);
    return;
  }

  console.log(`Found candidate profile (ID: ${candidate.id}). Finding active applications...`);

  // Find all applications where isTalentPool is false (meaning they applied)
  const applications = await prisma.candidateApplication.findMany({
    where: {
      candidateId: candidate.id,
      isTalentPool: false,
    },
  });

  if (applications.length === 0) {
    console.log("No active applications found for this candidate.");
    return;
  }

  for (const app of applications) {
    console.log(`Resetting application ID ${app.id} (Job Vacancy ID: ${app.jobVacancyId})...`);

    // Delete pipeline history
    const deletePipelines = await prisma.candidateApplicationPipeline.deleteMany({
      where: { candidateApplicationId: app.id },
    });
    console.log(`  - Deleted ${deletePipelines.count} pipeline history entries`);

    // Update application back to recommendation (isTalentPool = true)
    await prisma.candidateApplication.update({
      where: { id: app.id },
      data: {
        isTalentPool: true,
      },
    });
    console.log(`  - Updated isTalentPool back to true`);
  }

  console.log("Reset completed successfully!");
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
