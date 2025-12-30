import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const religions = [
    'ISLAM',
    'KRISTEN PROTESTAN',
    'KATOLIK',
    'HINDU',
    'BUDDHA',
    'KONGHUCU',
];

async function main() {
    console.log('Seeding religions...');

    for (const religion of religions) {
        const existing = await prisma.religion.findFirst({
            where: { religion: religion },
        });

        if (existing) {
            console.log(`✓ Religion "${religion}" already exists`);
        } else {
            await prisma.religion.create({
                data: { religion: religion },
            });
            console.log(`✓ Created religion "${religion}"`);
        }
    }

    console.log('\n✅ Religions seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding religions:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
