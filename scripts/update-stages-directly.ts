import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function renameOrCreateStage(oldName: string, newName: string) {
  console.log(`\nProcessing rename: "${oldName}" -> "${newName}"`);

  // Find the old stage
  const oldStage = await prisma.applicationPipeline.findFirst({
    where: { applicationPipeline: oldName },
  });

  // Find if a stage with the new name already exists
  const newStage = await prisma.applicationPipeline.findFirst({
    where: { applicationPipeline: newName },
  });

  if (!oldStage) {
    if (newStage) {
      console.log(`✓ Target stage "${newName}" already exists, and legacy stage "${oldName}" is not present.`);
    } else {
      // Neither exists, create the new one
      await prisma.applicationPipeline.create({
        data: { applicationPipeline: newName },
      });
      console.log(`✓ Created new stage "${newName}"`);
    }
    return;
  }

  if (!newStage) {
    // If the target doesn't exist, we can just update the old one
    await prisma.applicationPipeline.update({
      where: { id: oldStage.id },
      data: { applicationPipeline: newName },
    });
    console.log(`✓ Updated stage name directly from "${oldName}" to "${newName}"`);
  } else {
    // Both exist (legacy and new). We need to merge them to avoid duplicates.
    console.log(`⚠ Both stages exist. Merging relations...`);

    // 1. Update candidate applications
    const appsUpdated = await prisma.candidateApplication.updateMany({
      where: { applicationPipelineId: oldStage.id },
      data: { applicationPipelineId: newStage.id },
    });
    console.log(`  Moved ${appsUpdated.count} CandidateApplication(s) to "${newName}"`);

    // 2. Update candidate application pipelines
    const pipelinesUpdated = await prisma.candidateApplicationPipeline.updateMany({
      where: { applicationPipelineId: oldStage.id },
      data: { applicationPipelineId: newStage.id },
    });
    console.log(`  Moved ${pipelinesUpdated.count} CandidateApplicationPipeline(s) to "${newName}"`);

    // 3. Delete the old legacy stage record
    await prisma.applicationPipeline.delete({
      where: { id: oldStage.id },
    });
    console.log(`  Deleted duplicate legacy stage record "${oldName}"`);
  }
}

async function main() {
  console.log("Starting database stage updates directly...");

  // 1. Rename existing uppercase stages to camel/title case
  await renameOrCreateStage("AI SCREENING", "Ai Screening");
  await renameOrCreateStage("INTERVIEW USER 1", "User Interview 1");
  await renameOrCreateStage("INTERVIEW USER 2", "User Interview 2");

  // 2. Ensure User Interview 3 exists
  const ui3 = await prisma.applicationPipeline.findFirst({
    where: { applicationPipeline: "User Interview 3" },
  });
  if (!ui3) {
    await prisma.applicationPipeline.create({
      data: { applicationPipeline: "User Interview 3" },
    });
    console.log('\n✓ Created "User Interview 3"');
  } else {
    console.log('\n✓ "User Interview 3" already exists');
  }

  console.log("\n✅ Database stages updated successfully!");
}

main()
  .catch((error) => {
    console.error("Error executing database update script:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
