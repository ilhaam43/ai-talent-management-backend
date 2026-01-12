import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const userRoles = [
    'HUMAN RESOURCES',
    'HIRING MANAGER',
    'CANDIDATE',
];

async function main() {
    console.log('Seeding user roles...');

    for (const role of userRoles) {
        const existing = await prisma.userRole.findFirst({
            where: { roleName: role },
        });

        if (existing) {
            console.log(`✓ User role "${role}" already exists`);
        } else {
            await prisma.userRole.create({
                data: { roleName: role },
            });
            console.log(`✓ Created user role "${role}"`);
        }
    }

    console.log('\n✅ User roles seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding user roles:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
