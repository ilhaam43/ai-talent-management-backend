import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const documentTypes = [
  'CV/Resume',
  'Cover Letter',
  'Certificate',
  'Portfolio',
  'ID Card',
  'Transcript',
  'Supporting Document',
  'Reference Letter',
  'Work Sample',
];

async function main() {
  console.log('Seeding document types...');

  for (const type of documentTypes) {
    const existing = await prisma.documentType.findFirst({
      where: { documentType: type },
    });

    if (existing) {
      console.log(`✓ Document type "${type}" already exists`);
    } else {
      await prisma.documentType.create({
        data: { documentType: type },
      });
      console.log(`✓ Created document type "${type}"`);
    }
  }

  console.log('\n✅ Document types seeded successfully!');

  // Display all document types
  const allTypes = await prisma.documentType.findMany({
    orderBy: { documentType: 'asc' },
  });

  console.log('\nAvailable document types:');
  allTypes.forEach((type) => {
    console.log(`  - ${type.documentType} (ID: ${type.id})`);
  });
}

main()
  .catch((error) => {
    console.error('Error seeding document types:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


