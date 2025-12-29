import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const applicationLastStatuses = [
    'PASSED',
    'NOT PASSED',
    'PARTIALLY PASSED',
    'CANDIDATE REJECTED',
    'RESCHEDULE',
];

async function main() {
    console.log('Seeding application last statuses...');

    for (const status of applicationLastStatuses) {
        const existing = await prisma.applicationLastStatus.findFirst({
            where: { applicationLastStatus: status },
        });

        if (existing) {
            console.log(`✓ Application last status "${status}" already exists`);
        } else {
            await prisma.applicationLastStatus.create({
                data: { applicationLastStatus: status },
            });
            console.log(`✓ Created application last status "${status}"`);
        }
    }

    console.log('\n✅ Application last statuses seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding application last statuses:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
