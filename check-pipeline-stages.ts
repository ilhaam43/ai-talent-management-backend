import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log('Connecting to database...');
    
    // Fetch all ApplicationPipelines
    const pipelines = await prisma.applicationPipeline.findMany();
    console.log('\n--- Application Pipelines (Pipeline Stages) ---');
    console.log(`Total stages: ${pipelines.length}`);
    pipelines.forEach((p, idx) => {
      console.log(`${idx + 1}. [ID: ${p.id}] ${p.applicationPipeline}`);
    });

    // Fetch all ApplicationPipelineStatuses
    const statuses = await prisma.applicationPipelineStatus.findMany();
    console.log('\n--- Application Pipeline Statuses ---');
    console.log(`Total statuses: ${statuses.length}`);
    statuses.forEach((s, idx) => {
      console.log(`${idx + 1}. [ID: ${s.id}] ${s.applicationPipelineStatus}`);
    });

    // Let's also check if there are any candidate applications mapped to pipeline stages
    const pipelineCounts = await prisma.candidateApplicationPipeline.groupBy({
      by: ['applicationPipelineId'],
      _count: {
        id: true
      }
    });

    console.log('\n--- Candidates Count per Pipeline Stage ---');
    for (const count of pipelineCounts) {
      const pipeline = pipelines.find(p => p.id === count.applicationPipelineId);
      console.log(`- Stage: ${pipeline ? pipeline.applicationPipeline : 'Unknown'} (ID: ${count.applicationPipelineId}): ${count._count.id} candidates`);
    }

  } catch (error) {
    console.error('Error querying pipeline stages:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
