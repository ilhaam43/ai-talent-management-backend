import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
