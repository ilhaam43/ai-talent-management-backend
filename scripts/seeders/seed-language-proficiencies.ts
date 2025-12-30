import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const languageProficiencies = [
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'NATIVE',
];

async function main() {
    console.log('Seeding language proficiencies...');

    for (const proficiency of languageProficiencies) {
        const existing = await prisma.languageProficiency.findFirst({
            where: { languageProficiency: proficiency },
        });

        if (existing) {
            console.log(`✓ Language proficiency "${proficiency}" already exists`);
        } else {
            await prisma.languageProficiency.create({
                data: { languageProficiency: proficiency },
            });
            console.log(`✓ Created language proficiency "${proficiency}"`);
        }
    }

    console.log('\n✅ Language proficiencies seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding language proficiencies:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
