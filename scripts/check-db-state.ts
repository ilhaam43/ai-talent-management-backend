import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkDatabase() {
    console.log('Checking job vacancies in database...\\n');

    const vacancies = await prisma.jobVacancy.findMany({
        take: 3,
        include: {
            jobRole: true,
            division: {
                include: {
                    directorate: true,
                    group: true
                }
            }
        }
    });

    for (const v of vacancies) {
        console.log(`Job: ${v.jobRole?.jobRoleName}`);
        console.log(`  Division: ${v.division?.divisionName}`);
        console.log(`  Directorate in DB: ${v.directorateId ? 'SET' : 'NULL'}`);
        console.log(`  Group in DB: ${v.groupId ? 'SET' : 'NULL'}`);
        console.log(`  Department in DB: ${v.departmentId ? 'SET' : 'NULL'}`);
        console.log(`  Division's Directorate ID: ${v.division?.directorateId}`);
        console.log(`  Division's Group ID: ${v.division?.groupId}`);
        console.log('');
    }

    await prisma.$disconnect();
}

checkDatabase();
