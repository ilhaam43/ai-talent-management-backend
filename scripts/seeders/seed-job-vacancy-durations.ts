import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const jobVacancyDurations = [
    30,
    60,
    90,
];

async function main() {
    console.log('Seeding job vacancy durations...');

    for (const duration of jobVacancyDurations) {
        const existing = await prisma.jobVacancyDuration.findFirst({
            where: { daysDuration: duration },
        });

        if (existing) {
            console.log(`✓ Job vacancy duration "${duration} days" already exists`);
        } else {
            await prisma.jobVacancyDuration.create({
                data: { daysDuration: duration },
            });
            console.log(`✓ Created job vacancy duration "${duration} days"`);
        }
    }

    console.log('\n✅ Job vacancy durations seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding job vacancy durations:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
