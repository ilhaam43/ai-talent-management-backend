import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('=== Checking Candidate Applications in DB ===\n');

    const apps = await prisma.candidateApplication.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log(`📊 Total Applications: ${apps.length}\n`);

    for (const app of apps) {
        const candidate = await prisma.candidate.findUnique({
            where: { id: app.candidateId },
            include: { user: true }
        });
        const job = await prisma.jobVacancy.findUnique({
            where: { id: app.jobVacancyId },
            include: { jobRole: true, division: true }
        });
        const pipeline = await prisma.applicationPipeline.findUnique({
            where: { id: app.applicationPipelineId }
        });
        const status = app.applicationLatestStatusId 
            ? await prisma.applicationLastStatus.findUnique({ where: { id: app.applicationLatestStatusId } })
            : null;
        const history = await prisma.candidateApplicationPipeline.findMany({
            where: { candidateApplicationId: app.id },
            include: {
                applicationPipeline: true,
                applicationPipelineStatus: true
            },
            orderBy: { createdAt: 'asc' }
        });

        console.log('─────────────────────────────────────────────────');
        console.log(`📝 Application ID: ${app.id}`);
        console.log(`   Candidate: ${candidate?.user?.name || 'Unknown'} (${candidate?.user?.email})`);
        console.log(`   Job: ${job?.jobRole?.jobRoleName} @ ${job?.division?.divisionName}`);
        console.log(`   AI Match Status: ${app.aiMatchStatus || 'N/A'}`);
        console.log(`   Fit Score: ${app.fitScore || 'N/A'}`);
        console.log(`   Current Pipeline: ${pipeline?.applicationPipeline || 'N/A'}`);
        console.log(`   Latest Status: ${status?.applicationLastStatus || 'N/A'}`);
        console.log(`   Submission Date: ${app.submissionDate?.toISOString() || 'N/A'}`);
        
        console.log(`\n   📊 Pipeline History (${history.length} stages):`);
        for (const stage of history) {
            console.log(`      - ${stage.applicationPipeline?.applicationPipeline}: ${stage.applicationPipelineStatus?.applicationPipelineStatus}`);
            if (stage.scheduledDate) {
                console.log(`        Scheduled: ${stage.scheduledDate}`);
            }
        }
        console.log();
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
