import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const applicationPipelineStatuses = [
    'Qualified',
    'Not Qualified',
    'On Progress',
    'Reschedule',
];

async function main() {
    console.log('Seeding application pipeline statuses...');

    for (const status of applicationPipelineStatuses) {
        const existing = await prisma.applicationPipelineStatus.findFirst({
            where: { applicationPipelineStatus: status },
        });

        if (existing) {
            console.log(`✓ Application pipeline status "${status}" already exists`);
        } else {
            await prisma.applicationPipelineStatus.create({
                data: { applicationPipelineStatus: status },
            });
            console.log(`✓ Created application pipeline status "${status}"`);
        }
    }

    console.log('\n✅ Application pipeline statuses seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding application pipeline statuses:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
