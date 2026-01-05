import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding job vacancy statuses...\n');
    const statuses = ['OPEN', 'CLOSED', 'DRAFT', 'ARCHIVED'];

    for (const status of statuses) {
        const existing = await prisma.jobVacancyStatus.findFirst({
            where: { jobVacancyStatus: status }
        });

        if (!existing) {
            await prisma.jobVacancyStatus.create({
                data: { jobVacancyStatus: status }
            });
            console.log(`Created status: ${status}`);
        } else {
            console.log(`Status already exists: ${status}`);
        }
    }
}

main()
    .catch((error) => {
        console.error('Error seeding statuses:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
