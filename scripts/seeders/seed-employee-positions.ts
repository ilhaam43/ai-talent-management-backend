import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const employeePositions = [
    'TECHNICIAN',
    'JUNIOR ENGINEER',
    'HELPDESK',
    'ENGINEER',
    'OFFICER',
    'SENIOR ENGINEER',
    'SENIOR OFFICER',
    'ASSISTANT VICE PRESIDENT',
    'VICE PRESIDENT',
    'SENIOR VICE PRESIDENT',
    'CHIEF',
    'DIRECTOR',
];

async function main() {
    console.log('Seeding employee positions...');

    for (const position of employeePositions) {
        const existing = await prisma.employeePosition.findFirst({
            where: { employeePosition: position },
        });

        if (existing) {
            console.log(`✓ Employee position "${position}" already exists`);
        } else {
            await prisma.employeePosition.create({
                data: { employeePosition: position },
            });
            console.log(`✓ Created employee position "${position}"`);
        }
    }

    console.log('\n✅ Employee positions seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding employee positions:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
