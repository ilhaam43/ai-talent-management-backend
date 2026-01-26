/**
 * Cleanup Script: Remove Duplicates and Set All to Talent Pool
 * 
 * This script:
 * 1. Identifies duplicate candidates by name/email
 * 2. Keeps only one instance of each candidate
 * 3. Sets all candidates to isTalentPool=true
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

async function cleanupAndMoveTotalentPool() {
  console.log('🔧 Starting cleanup: Remove duplicates + Move all to Talent Pool\n');

  try {
    // Step 1: Find all candidates
    const allCandidates = await prisma.candidate.findMany({
      select: {
        id: true,
        candidateFullname: true,
        candidateEmail: true,
        isTalentPool: true,
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: 'asc' }, // Keep oldest
    });

    console.log(`📊 Total candidates in database: ${allCandidates.length}\n`);

    // Step 2: Identify duplicates by name (case-insensitive)
    const seen = new Map<string, string>(); // name -> id to keep
    const duplicateIds: string[] = [];

    for (const candidate of allCandidates) {
      const name = (candidate.candidateFullname || '').trim().toUpperCase();
      
      if (!name) continue; // Skip empty names
      
      if (seen.has(name)) {
        // This is a duplicate, mark for deletion
        duplicateIds.push(candidate.id);
        console.log(`   🔍 Duplicate found: ${candidate.candidateFullname} (will delete ID: ${candidate.id.substring(0, 8)}...)`);
      } else {
        // First occurrence, keep this one
        seen.set(name, candidate.id);
      }
    }

    console.log(`\n📋 Summary:`);
    console.log(`   - Unique candidates: ${seen.size}`);
    console.log(`   - Duplicates to remove: ${duplicateIds.length}\n`);

    // Step 3: Delete duplicate candidates (cascade will handle related records)
    if (duplicateIds.length > 0) {
      console.log('🗑️  Deleting duplicate candidates...');
      
      const deleteResult = await prisma.candidate.deleteMany({
        where: { id: { in: duplicateIds } },
      });
      
      console.log(`   ✅ Deleted ${deleteResult.count} duplicate candidate(s)\n`);
    }


    // Step 4: Reset ALL applications to Talent Pool and AI SCREENING
    console.log('🔄 Resetting all applications to Talent Pool and AI SCREENING...');
    
    const defaultPipeline = await prisma.applicationPipeline.findFirst({
        where: { applicationPipeline: 'AI SCREENING' },
    });

    if (defaultPipeline) {
        const appUpdateResult = await prisma.candidateApplication.updateMany({
            where: {},
            data: { 
                isTalentPool: true,
                applicationPipelineId: defaultPipeline.id 
            },
        });
        console.log(`   ✅ Reset ${appUpdateResult.count} application(s) to Talent Pool / AI SCREENING\n`);
    } else {
        console.log('   ⚠️ Could not find "AI SCREENING" pipeline - skipping application reset\n');
    }

    // Step 5: Verify final state
    const finalCount = await prisma.candidate.count();
    const talentPoolAppCount = await prisma.candidateApplication.count({
      where: { isTalentPool: true },
    });
    const activeAppCount = await prisma.candidateApplication.count({
      where: { isTalentPool: false },
    });

    console.log('✨ Cleanup complete!');
    console.log(`📊 Final state:`);
    console.log(`   - Total candidates: ${finalCount}`);
    console.log(`   - Applications in Talent Pool: ${talentPoolAppCount}`);
    console.log(`   - Applications Active: ${activeAppCount}`);
    console.log('\n🚀 Refresh your application to see the changes!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

cleanupAndMoveTotalentPool()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  });
