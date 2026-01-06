import { execSync } from 'child_process';
import path from 'path';

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
    'seed-job-vacancies.ts',
    'seed-candidates-and-applications.ts',
];

async function main() {
    console.log('Starting master seeder...\n');

    for (const seeder of seeders) {
        console.log(`--- Running ${seeder} ---`);
        try {
            const scriptPath = path.join(__dirname, '..', 'seeders', seeder);
            execSync(`npx tsx "${scriptPath}"`, { stdio: 'inherit' });
            console.log(''); // Empty line for separation
        } catch (error) {
            console.error(`❌ Failed to run ${seeder}`);
            process.exit(1);
        }
    }

    console.log('🎉 All seeders executed successfully!');
}

main().catch((error) => {
    console.error('Error in master seeder:', error);
    process.exit(1);
});
