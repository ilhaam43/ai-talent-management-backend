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
  console.log('--- Database Job Roles ---');
  const jobRoles = await prisma.jobRole.findMany({
    orderBy: { jobRoleName: 'asc' }
  });
  console.log(`Total Job Roles in Database: ${jobRoles.length}`);
  console.log(jobRoles);

  // Find duplicates by name
  const counts: Record<string, number> = {};
  const duplicates: string[] = [];
  for (const role of jobRoles) {
    const name = role.jobRoleName;
    counts[name] = (counts[name] || 0) + 1;
    if (counts[name] === 2) {
      duplicates.push(name);
    }
  }

  if (duplicates.length > 0) {
    console.log('\n⚠️ Found DUPLICATE job roles in database:');
    for (const dup of duplicates) {
      const dupRoles = jobRoles.filter(r => r.jobRoleName === dup);
      console.log(`- "${dup}" exists ${counts[dup]} times:`);
      console.log(dupRoles);
    }
  } else {
    console.log('\n✅ No duplicate job roles found in database.');
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
