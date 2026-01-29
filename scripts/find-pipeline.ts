
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find a pipeline that is in an Interview stage
    // First find interview pipelines
    const interviewPipelines = await prisma.applicationPipeline.findMany({
        where: {
            applicationPipeline: {
                contains: 'Interview',
                mode: 'insensitive',
            },
        },
    });

    const ids = interviewPipelines.map(p => p.id);
    console.log('Interview Pipeline IDs:', ids);

    if (ids.length === 0) {
        console.log('No interview pipelines found.');
        return;
    }

    // Find a candidate app pipeline that DOES NOT have interview data yet
    const pipeline = await prisma.candidateApplicationPipeline.findFirst({
        where: {
            applicationPipelineId: { in: ids },
            interviewData: null // Ensure no existing interview data
        },
        include: {
            applicationPipeline: true
        }
    });

    if (pipeline) {
        console.log('FOUND_PIPELINE_ID:', pipeline.id);
        console.log('Stage:', pipeline.applicationPipeline.applicationPipeline);
    } else {
        console.log('No candidate application pipeline found in interview stage.');

        // Fallback: find ANY pipeline just for testing if strictly necessary, 
        // but the controller logic might filter by interview stage for the GET endpoint.
        // The POST endpoint doesn't seem to enforce the stage name, just existence.
        const anyPipeline = await prisma.candidateApplicationPipeline.findFirst();
        if (anyPipeline) {
            console.log('FALLBACK_PIPELINE_ID:', anyPipeline.id);
        }
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
