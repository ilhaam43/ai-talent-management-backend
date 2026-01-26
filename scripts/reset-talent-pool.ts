/**
 * Reset talent pool candidates for testing
 * Sets isTalentPool = true for Adam and Ilham
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

async function main() {
  console.log('\n=== RESET TALENT POOL CANDIDATES ===\n');

  // Find Adam and Ilham
  const candidates = await prisma.candidate.findMany({
    where: {
      OR: [
        { candidateFullname: { contains: 'adam', mode: 'insensitive' } },
        { candidateFullname: { contains: 'ilham', mode: 'insensitive' } },
        { candidateFullname: { contains: 'ilhaam', mode: 'insensitive' } },
      ],
    },
    include: { user: { select: { email: true } } },
  });

  console.log(`Found ${candidates.length} matching candidates:\n`);

  for (const c of candidates) {
    console.log(`   - ${c.candidateFullname} (${c.user.email})`);
    console.log(`     Current isTalentPool: ${c.isTalentPool}`);
  }

  // Reset isTalentPool to true
  console.log('\n📋 Resetting isTalentPool to true...\n');

  for (const c of candidates) {
    await prisma.candidate.update({
      where: { id: c.id },
      data: { isTalentPool: true },
    });

    // Also clear password reset token so a new one will be generated
    await prisma.user.update({
      where: { id: c.userId },
      data: {
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    console.log(`   ✅ Reset: ${c.candidateFullname}`);
  }

  // Verify
  console.log('\n📋 Verification:\n');
  const updated = await prisma.candidate.findMany({
    where: {
      OR: [
        { candidateFullname: { contains: 'adam', mode: 'insensitive' } },
        { candidateFullname: { contains: 'ilham', mode: 'insensitive' } },
        { candidateFullname: { contains: 'ilhaam', mode: 'insensitive' } },
      ],
    },
    include: { user: { select: { email: true } } },
  });

  for (const c of updated) {
    console.log(`   ${c.isTalentPool ? '🟢' : '🔴'} ${c.candidateFullname}: isTalentPool = ${c.isTalentPool}`);
  }

  console.log('\n=== DONE ===\n');
  console.log('You can now run test-talent-pool-conversion.ts to test the email flow!\n');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
