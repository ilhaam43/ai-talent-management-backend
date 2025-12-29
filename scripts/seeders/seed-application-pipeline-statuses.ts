import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const applicationPipelineStatuses = [
    'PASSED',
    'NOT PASSED',
    'CANDIDATE REJECTED',
    'RESCHEDULE',
];

async function main() {
    console.log('Seeding application pipeline statuses...');

    for (const status of applicationPipelineStatuses) {
        const existing = await prisma.applicationPipelineStatus.findFirst({
            where: { applicationPipelineStatus: status },
        });

        if (existing) {
            console.log(`✓ Application pipeline status "${status}" already exists`);
        } else {
            await prisma.applicationPipelineStatus.create({
                data: { applicationPipelineStatus: status },
            });
            console.log(`✓ Created application pipeline status "${status}"`);
        }
    }

    console.log('\n✅ Application pipeline statuses seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding application pipeline statuses:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
