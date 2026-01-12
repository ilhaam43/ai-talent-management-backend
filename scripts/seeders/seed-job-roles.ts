import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const jobRoles = [
    'BACKEND SOFTWARE ENGINEER',
    'FRONTEND SOFTWARE ENGINEER',
    'FULLSTACK SOFTWARE ENGINEER',
    'SOFTWARE ARCHITECT',
    'QUALITY ASSURANCE ENGINEER',
    'PRODUCT MANAGER',
    'BUSINESS ANALYST',
    'PROJECT MANAGER',
    'CLOUD ENGINEER',
    'DEVOPS ENGINEER',
    'INFRASTRUCTURE ENGINEER',
    'CYBERSECURITY ENGINEER',
    'SECURITY OPERATIONS CENTER ANALYST',
    'NETWORK ENGINEER',
    'NOC ENGINEER',
    'DATA ENGINEER',
    'DATA ANALYST',
    'FINANCIAL ANALYST',
    'HUMAN RESOURCES GENERALIST',
    'IT SUPPORT ENGINEER',
];

async function main() {
    console.log('Seeding job roles...');

    for (const role of jobRoles) {
        const existing = await prisma.jobRole.findFirst({
            where: { jobRoleName: role },
        });

        if (existing) {
            console.log(`✓ Job role "${role}" already exists`);
        } else {
            await prisma.jobRole.create({
                data: { jobRoleName: role },
            });
            console.log(`✓ Created job role "${role}"`);
        }
    }

    console.log('\n✅ Job roles seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding job roles:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
