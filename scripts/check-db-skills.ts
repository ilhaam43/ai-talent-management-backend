
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to database...');
    
    // Count candidates
    const candidateCount = await prisma.candidate.count();
    console.log(`Total Candidates: ${candidateCount}`);

    // Count skills
    const skillCount = await prisma.candidateSkill.count();
    console.log(`Total Skills: ${skillCount}`);

    // Get candidates with skills
    const candidates = await prisma.candidate.findMany({
      take: 5,
      include: {
        skills: true
      }
    });

    console.log('\n--- Candidate Skills Check ---');
    for (const c of candidates) {
      console.log(`Candidate: ${c.candidateFullname} (${c.id})`);
      console.log(`Skills count: ${c.skills.length}`);
      if (c.skills.length > 0) {
        console.log(`Skills: ${c.skills.map(s => `${s.candidateSkill}:${s.candidateRating}`).join(', ')}`);
      } else {
        console.log('No skills found.');
      }
      console.log('---');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
