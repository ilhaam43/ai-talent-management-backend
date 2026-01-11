
import { PrismaClient, CandidateRating } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const candidateId = 'cf24dd9c-906f-43fa-b6cf-ddfd786df95e'; // From last failed test run

  console.log('Attempting to update candidate:', candidateId);

  const skillsData = [
    { candidateSkill: 'Python', candidateRating: 'FOUR' },
    { candidateSkill: 'AWS', candidateRating: 'THREE' },
    { candidateSkill: 'JavaScript', candidateRating: 'FOUR' },
    { candidateSkill: 'Docker', candidateRating: 'THREE' },
  ];

  try {
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      console.error('Candidate not found!');
      return;
    }

    console.log('Found candidate. Updating...');

    const updateResult = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        skills: {
          deleteMany: {},
          create: skillsData.map(item => ({
             candidateId: candidateId,
             candidateSkill: item.candidateSkill,
             candidateRating: item.candidateRating as CandidateRating
          }))
        }
      }
    });

    console.log('Update successful!', updateResult);

  } catch (error) {
    console.error('❌ Update failed with error:');
    console.dir(error, { depth: null });
  } finally {
    await prisma.$disconnect();
  }
}

main();
