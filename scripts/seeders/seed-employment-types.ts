import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const employmentTypes = [
    'PKWTT',
    'PKWT',
    'OUTSOURCE',
    'INTERN',
];

async function main() {
    console.log('Seeding employment types...');

    for (const type of employmentTypes) {
        const existing = await prisma.employmentType.findFirst({
            where: { employmentType: type },
        });

        if (existing) {
            console.log(`✓ Employment type "${type}" already exists`);
        } else {
            await prisma.employmentType.create({
                data: { employmentType: type },
            });
            console.log(`✓ Created employment type "${type}"`);
        }
    }

    console.log('\n✅ Employment types seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding employment types:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
