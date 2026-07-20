/**
 * fix-pipeline-pointers.ts
 *
 * One-time backfill script:
 * Updates CandidateApplication.applicationPipelineId to point to the
 * LATEST CandidateApplicationPipeline stage for each application.
 *
 * Run with: npx tsx scripts/fix-pipeline-pointers.ts
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔧 Starting pipeline pointer backfill...\n');

  // Get all active (non-talent-pool) candidate applications
  const applications = await prisma.candidateApplication.findMany({
    where: { isTalentPool: false },
    include: {
      applicationPipeline: true,
      candidateApplicationPipelines: {
        include: { applicationPipeline: true },
        orderBy: { createdAt: 'desc' }, // latest first
      },
    },
  });

  console.log(`Found ${applications.length} active candidate applications.\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let noHistoryCount = 0;

  for (const app of applications) {
    const latestPipelineRow = app.candidateApplicationPipelines[0];

    if (!latestPipelineRow) {
      console.log(`  ⚠️  App ${app.id}: No pipeline history found, skipping.`);
      noHistoryCount++;
      continue;
    }

    const currentPointer = app.applicationPipeline.applicationPipeline;
    const latestStage = latestPipelineRow.applicationPipeline.applicationPipeline;

    if (app.applicationPipelineId === latestPipelineRow.applicationPipelineId) {
      console.log(`  ✓  App ${app.id}: Already correct → "${currentPointer}"`);
      skippedCount++;
      continue;
    }

    // Update the pointer to the latest stage
    await prisma.candidateApplication.update({
      where: { id: app.id },
      data: { applicationPipelineId: latestPipelineRow.applicationPipelineId },
    });

    console.log(
      `  ✅ App ${app.id}: Updated "${currentPointer}" → "${latestStage}"`
    );
    updatedCount++;
  }

  console.log('\n========================================');
  console.log(`✅ Updated    : ${updatedCount} applications`);
  console.log(`⏭️  Skipped   : ${skippedCount} (already correct)`);
  console.log(`⚠️  No history: ${noHistoryCount} applications`);
  console.log('========================================');
  console.log('\n✅ Backfill complete! Action Center should now show correct data.');
}

main()
  .catch((err) => {
    console.error('❌ Error during backfill:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
