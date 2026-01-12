import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const applicationLastStatuses = [
    'Qualified',
    'Not Qualified',
    'On Progress',
    'Reschedule',
];

async function main() {
    console.log('Seeding application last statuses...');

    for (const status of applicationLastStatuses) {
        const existing = await prisma.applicationLastStatus.findFirst({
            where: { applicationLastStatus: status },
        });

        if (existing) {
            console.log(`✓ Application last status "${status}" already exists`);
        } else {
            await prisma.applicationLastStatus.create({
                data: { applicationLastStatus: status },
            });
            console.log(`✓ Created application last status "${status}"`);
        }
    }

    console.log('\n✅ Application last statuses seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding application last statuses:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
