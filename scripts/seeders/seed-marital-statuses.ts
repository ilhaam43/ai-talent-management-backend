import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const maritalStatuses = [
    'BELUM KAWIN',
    'KAWIN',
    'CERAI HIDUP',
    'CERAI MATI',
];

async function main() {
    console.log('Seeding marital statuses...');

    for (const status of maritalStatuses) {
        const existing = await prisma.maritalStatus.findFirst({
            where: { maritalStatus: status },
        });

        if (existing) {
            console.log(`✓ Marital status "${status}" already exists`);
        } else {
            await prisma.maritalStatus.create({
                data: { maritalStatus: status },
            });
            console.log(`✓ Created marital status "${status}"`);
        }
    }

    console.log('\n✅ Marital statuses seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding marital statuses:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
