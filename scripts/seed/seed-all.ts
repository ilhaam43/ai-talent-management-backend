import { execSync } from 'child_process';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const seeders = [
    'seed-user-roles.ts',
    'seed-employee-positions.ts',
    'seed-hr-hiring-manager.ts',
    'seed-employment-types.ts',
    'seed-job-vacancy-durations.ts',
    'seed-job-vacancy-reasons.ts',
    'seed-job-vacancy-statuses.ts',
    'seed-religions.ts',
    'seed-marital-statuses.ts',
    'seed-nationalities.ts',
    'seed-language-proficiencies.ts',
    'seed-genders.ts',
    'seed-social-media.ts',
    'seed-skills.ts',
    'seed-org-structure.ts',
    'seed-job-roles.ts',
    'seed-application-pipelines.ts',
    'seed-application-pipeline-statuses.ts',
    'seed-application-last-statuses.ts',
    'seed-candidate-last-educations.ts',
    'seed-document-types.ts',
    'seed-auth.ts',
    'seed-candidate.ts',
    'seed-lintasarta-candidates.ts',
    'seed-job-vacancies.ts',
    'seed-candidates-and-applications.ts',
];

async function main() {
    // const forceSeed = process.env.FORCE_SEED === 'true';

    // if (!forceSeed) {
    //     try {
    //         const roleCount = await prisma.userRole.count();
    //         if (roleCount > 0) {
    //             console.log('⚡ Database already contains seed data. Skipping master seeder for fast startup.');
    //             console.log('   (To force re-seeding, run with environment variable FORCE_SEED=true)');
    //             await prisma.$disconnect();
    //             return;
    //         }
    //     } catch {
    //         // Table might not exist yet before first migration; proceed to seed
    //     }
    // }

    console.log('Starting master seeder...\n');

    for (const seeder of seeders) {
        console.log(`--- Running ${seeder} ---`);
        try {
            const scriptPath = path.join(__dirname, '..', 'seeders', seeder);
            execSync(`npx tsx "${scriptPath}"`, { stdio: 'inherit' });
            console.log(''); // Empty line for separation
        } catch (error) {
            console.error(`❌ Failed to run ${seeder}`);
            await prisma.$disconnect();
            process.exit(1);
        }
    }

    console.log('🎉 All seeders executed successfully!');
    await prisma.$disconnect();
}

main().catch(async (error) => {
    console.error('Error in master seeder:', error);
    await prisma.$disconnect();
    process.exit(1);
});
