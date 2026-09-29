import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_talent_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding HR and Hiring Manager users...');

    // 1. Get or Create Roles
    let hrRole = await prisma.userRole.findFirst({ where: { roleName: 'HUMAN RESOURCES' } });
    if (!hrRole) {
        console.log('Creating missing role: HUMAN RESOURCES');
        hrRole = await prisma.userRole.create({ data: { roleName: 'HUMAN RESOURCES' } });
    }

    let hmRole = await prisma.userRole.findFirst({ where: { roleName: 'HIRING MANAGER' } });
    if (!hmRole) {
        console.log('Creating missing role: HIRING MANAGER');
        hmRole = await prisma.userRole.create({ data: { roleName: 'HIRING MANAGER' } });
    }

    // 2. Get or Create a Default Position
    let position = await prisma.employeePosition.findFirst({
        where: { employeePosition: 'OFFICER' },
    });

    if (!position) {
        // Try to find any position
        position = await prisma.employeePosition.findFirst();
    }

    if (!position) {
        console.log('Creating default position: OFFICER');
        position = await prisma.employeePosition.create({ data: { employeePosition: 'OFFICER' } });
    }

    console.log(`Using position: ${position.employeePosition}`);


    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const usersToSeed = [
        {
            email: 'hr@example.com',
            name: 'HR User',
            roleId: hrRole.id,
            employeeIdNumber: 'EMP-HR-001',
        },
        {
            email: 'hiring-manager@example.com',
            name: 'Hiring Manager User',
            roleId: hmRole.id,
            employeeIdNumber: 'EMP-HM-001',
        },
        {
            email: 'luthfi.fauzie@lintasarta.co.id',
            name: 'Luthfi Fauzie',
            roleId: hrRole.id,
            employeeIdNumber: '90181807',
        },
        {
            email: 'viranola.rizkiansha@lintasarta.co.id',
            name: 'Viranola Rizkiansha',
            roleId: hrRole.id,
            employeeIdNumber: '98222803',
        },
        {
            email: 'syifa.syarafina@lintasarta.co.id',
            name: 'Siva Syarafina',
            roleId: hrRole.id,
            employeeIdNumber: '94192032',
        },
        {
            email: 'awis.rahmat@lintasarta.co.id',
            name: 'Awis Rahmat Trihari',
            roleId: hrRole.id,
            employeeIdNumber: '96243391',
        },
        {
            email: 'azizah.aulia@lintasarta.co.id',
            name: 'Azizah Aulia',
            roleId: hrRole.id,
            employeeIdNumber: '10233353',
        },
        {
            email: 'junior.diogones@lintasarta.co.id',
            name: 'Junior Diogones To’a',
            roleId: hrRole.id,
            employeeIdNumber: '89253494',
        },
    ];

    for (const userData of usersToSeed) {
        // Upsert User
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {
                password: hashedPassword, // Update password if re-seeding
            },
            create: {
                email: userData.email,
                name: userData.name,
                password: hashedPassword,
                emailVerified: new Date(),
            },
        });
        console.log(`✓ User ensured: ${user.email} (${user.id})`);

        // Upsert Employee
        let employee = await prisma.employee.findFirst({
            where: { userId: user.id },
        });

        if (employee) {
            console.log(`  - Employee record already exists for ${user.email}`);
            // Optional: Update role if needed
            if (employee.userRoleId !== userData.roleId) {
                await prisma.employee.update({
                    where: { id: employee.id },
                    data: { userRoleId: userData.roleId },
                });
                console.log(`  - Updated role to ${userData.roleId}`);
            }
        } else {
            // Create new employee
            // Note: 'position.id' is guaranteed to exist from check above
            employee = await prisma.employee.create({
                data: {
                    userId: user.id,
                    userRoleId: userData.roleId,
                    employeePositionId: position.id,
                    employeeIdentificationNumber: userData.employeeIdNumber,
                },
            });
            console.log(`  - Created employee record: ${employee.employeeIdentificationNumber}`);
        }
    }

    console.log('\n✅ HR and Hiring Manager seeding completed!');
}

main()
    .catch((e) => {
        console.error('Error seeding HR/HM:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
