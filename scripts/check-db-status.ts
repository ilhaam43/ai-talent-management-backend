import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('=== Database Status Check ===\n');

    // Count jobs
    const jobs = await prisma.jobVacancy.count();
    console.log(`📊 Total Job Vacancies: ${jobs}`);

    // Count by status
    const statuses = await prisma.jobVacancyStatus.findMany();
    console.log(`\n🔖 Job Vacancy Statuses:`);
    for (const s of statuses) {
        const count = await prisma.jobVacancy.count({
            where: { jobVacancyStatusId: s.id }
        });
        console.log(`   - ${s.jobVacancyStatus}: ${count} jobs`);
    }

    // List divisions
    const divisions = await prisma.division.findMany({
        orderBy: { divisionName: 'asc' }
    });
    console.log(`\n🏢 Total Divisions: ${divisions.length}`);
    
    // Show divisions that have open jobs
    const openStatus = await prisma.jobVacancyStatus.findFirst({ where: { jobVacancyStatus: 'OPEN' } });
    if (openStatus) {
        const openJobs = await prisma.jobVacancy.findMany({
            where: { jobVacancyStatusId: openStatus.id },
            include: {
                division: true,
                jobRole: true
            }
        });
        console.log(`\n✅ OPEN Jobs (${openJobs.length}):`);
        for (const job of openJobs) {
            console.log(`   - [${job.division?.divisionName}] ${job.jobRole?.jobRoleName}`);
        }
    }

    // Key divisions for UI tracks
    console.log(`\n📋 Key Divisions for UI Tracks:`);
    const trackDivisions = [
        'Cloud Delivery and Operation',
        'Cybersecurity Delivery and Operation',
        'Collaboration Solution',
        'Infrastructure Solution',
        'CEO Office',
        'Strategy and Business Development',
        'Finance',
        'Human Capital Strategy and Experience'
    ];
    for (const name of trackDivisions) {
        const div = await prisma.division.findFirst({ where: { divisionName: name } });
        console.log(`   - ${name}: ${div ? '✅ Found' : '❌ Not Found'}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
