import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const jobVacancyReasons = [
    'New Position',
    'Replacement',
    'Business Expansion',
    'Project Based',
    'Seasonal Demand',
];

async function main() {
    console.log('Seeding job vacancy reasons...');

    for (const reason of jobVacancyReasons) {
        const existing = await prisma.jobVacancyReason.findFirst({
            where: { reason },
        });

        if (existing) {
            console.log(`✓ Job vacancy reason "${reason}" already exists`);
        } else {
            await prisma.jobVacancyReason.create({
                data: { reason },
            });
            console.log(`✓ Created job vacancy reason "${reason}"`);
        }
    }

    console.log('\n✅ Job vacancy reasons seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding job vacancy reasons:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
