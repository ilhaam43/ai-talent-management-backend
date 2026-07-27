
import { CandidateRating, PrismaClient } from '@prisma/client';

console.log('CandidateRating Enum Object:', CandidateRating);
console.log('CandidateRating.THREE value:', CandidateRating.THREE);

const prisma = new PrismaClient();

async function main() {
  try {
    const candidate = await prisma.candidate.findFirst();
    if (candidate) {
        console.log('Attempting to create skill with CandidateRating.THREE...');
        await prisma.candidateSkill.create({
            data: {
                candidateId: candidate.id,
                candidateSkill: 'DebugEnumSkill',
                candidateRating: CandidateRating.THREE
            }
        });
        console.log('Success!');
    }
  } catch(e) {
      console.error('Error:', e);
  } finally {
      await prisma.$disconnect();
  }
}

main();
