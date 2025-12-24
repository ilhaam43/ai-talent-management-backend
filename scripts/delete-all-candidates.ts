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
  console.log('🧹 Deleting all candidates to prepare for schema migration...');
  
  try {
    // Delete all candidates (cascade will handle related data)
    const result = await prisma.candidate.deleteMany({});
    console.log(`✅ Deleted ${result.count} candidate(s)`);
  } catch (error: any) {
    console.error('   Error:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();



