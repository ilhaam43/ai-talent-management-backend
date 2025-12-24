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
  console.log('🧹 Cleaning up orphan candidates (without user_id)...');
  
  try {
    // Delete all candidates that don't have user_id
    // Since user_id is required in new schema, we need to delete old data
    const result = await prisma.$executeRaw`
      DELETE FROM candidates 
      WHERE user_id IS NULL OR user_id NOT IN (SELECT id FROM users)
    `;
    
    console.log(`✅ Deleted ${result} orphan candidate(s)`);
  } catch (error: any) {
    // If column doesn't exist yet, just continue
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('   Note: user_id column does not exist yet, will be created by schema push');
    } else {
      console.error('   Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();



