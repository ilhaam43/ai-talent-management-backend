import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
