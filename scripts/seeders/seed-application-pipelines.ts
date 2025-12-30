import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const applicationPipelines = [
    'AI SCREENING',
    'ONLINE ASESSMENT',
    'INTERVIEW USER 1',
    'INTERVIEW USER 2',
    'INTERVIEW DIRECTOR',
    'MEDICAL CHECKUP',
    'OFFERING',
    'HIRED',
];

async function main() {
    console.log('Seeding application pipelines...');

    for (const pipeline of applicationPipelines) {
        const existing = await prisma.applicationPipeline.findFirst({
            where: { applicationPipeline: pipeline },
        });

        if (existing) {
            console.log(`✓ Application pipeline "${pipeline}" already exists`);
        } else {
            await prisma.applicationPipeline.create({
                data: { applicationPipeline: pipeline },
            });
            console.log(`✓ Created application pipeline "${pipeline}"`);
        }
    }

    console.log('\n✅ Application pipelines seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding application pipelines:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
