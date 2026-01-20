import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== CHECKING REQUIRED LOOKUP DATA ===\n');

  // Check ApplicationLastStatus
  const lastStatuses = await prisma.applicationLastStatus.findMany();
  console.log('ApplicationLastStatus records:', lastStatuses.length);
  if (lastStatuses.length > 0) {
    lastStatuses.forEach(s => console.log(`  - ${s.applicationLastStatus} (${s.id})`));
  } else {
    console.log('  ⚠️  NO RECORDS - Need to seed!');
  }

  // Check ApplicationPipeline
  const pipelines = await prisma.applicationPipeline.findMany();
  console.log('\nApplicationPipeline records:', pipelines.length);
  if (pipelines.length > 0) {
    pipelines.forEach(p => console.log(`  - ${p.applicationPipeline} (${p.id})`));
  } else {
    console.log('  ⚠️  NO RECORDS - Need to seed!');
  }

  // Check ApplicationPipelineStatus
  const pipelineStatuses = await prisma.applicationPipelineStatus.findMany();
  console.log('\nApplicationPipelineStatus records:', pipelineStatuses.length);
  if (pipelineStatuses.length > 0) {
    pipelineStatuses.forEach(s => console.log(`  - ${s.applicationPipelineStatus} (${s.id})`));
  } else {
    console.log('  ⚠️  NO RECORDS - Need to seed!');
  }

  // Check unified candidates
  const unifiedCandidates = await prisma.candidate.findMany({
    where: { isTalentPool: true },
    include: {
      user: { select: { email: true, passwordSetRequired: true } },
      skills: { select: { candidateSkill: true } },
      applications: { select: { id: true, fitScore: true } },
    },
  });

  console.log('\n=== UNIFIED TALENT POOL CANDIDATES ===\n');
  console.log('Total:', unifiedCandidates.length);
  
  for (const c of unifiedCandidates) {
    console.log(`\n${c.candidateFullname}`);
    console.log(`  Email: ${c.user?.email}`);
    console.log(`  Password Needs Set: ${c.user?.passwordSetRequired}`);
    console.log(`  Skills: ${c.skills.length}`);
    console.log(`  Applications: ${c.applications.length}`);
    if (c.applications.length > 0) {
      c.applications.forEach(a => console.log(`    - App ${a.id.substring(0, 8)} (Score: ${a.fitScore})`));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
