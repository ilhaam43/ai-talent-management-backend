import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const genders = [
    'LAKI-LAKI',
    'PEREMPUAN',
];

async function main() {
    console.log('Seeding genders...');

    for (const gender of genders) {
        const existing = await prisma.gender.findFirst({
            where: { gender: gender },
        });

        if (existing) {
            console.log(`✓ Gender "${gender}" already exists`);
        } else {
            await prisma.gender.create({
                data: { gender: gender },
            });
            console.log(`✓ Created gender "${gender}"`);
        }
    }

    console.log('\n✅ Genders seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding genders:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
