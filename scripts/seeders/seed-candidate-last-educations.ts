import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const lastEducations = [
    'SMA',
    'SMK',
    'S1',
    'S2',
    'S3',
    'D1',
    'D2',
    'D3',
    'D4',
    'Bachelor',
    'Master',
    'Doctorate',
    'PhD',
    'Diploma',
    'High School',
    'SMA / SMK Sederajat',
    'Diploma (D1/D2/D3)',
    'Sarjana (S1)',
    'Magister (S2)',
    'Doktor (S3)',
];

async function main() {
    console.log('Seeding candidate last educations...');

    for (const education of lastEducations) {
        const existing = await prisma.candidateLastEducation.findFirst({
            where: { candidateEducation: education },
        });

        if (existing) {
            console.log(`✓ Candidate last education "${education}" already exists`);
        } else {
            await prisma.candidateLastEducation.create({
                data: { candidateEducation: education },
            });
            console.log(`✓ Created candidate last education "${education}"`);
        }
    }

    console.log('\n✅ Candidate last educations seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding candidate last educations:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
