import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const nationalities = [
    'WNI',
    'WNA',
];

async function main() {
    console.log('Seeding nationalities...');

    for (const nationality of nationalities) {
        const existing = await prisma.nationality.findFirst({
            where: { nationality: nationality },
        });

        if (existing) {
            console.log(`✓ Nationality "${nationality}" already exists`);
        } else {
            await prisma.nationality.create({
                data: { nationality: nationality },
            });
            console.log(`✓ Created nationality "${nationality}"`);
        }
    }

    console.log('\n✅ Nationalities seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding nationalities:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
