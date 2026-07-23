
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');

        // Get a candidate
        const candidate = await prisma.candidate.findFirst();

        if (!candidate) {
            console.log('No candidates found in DB.');
            return;
        }

        console.log(`Found candidate: ${candidate.id} (${candidate.candidateFullname})`);

        // Check existing skills
        const existingSkills = await prisma.candidateSkill.findMany({
            where: { candidateId: candidate.id }
        });
        console.log(`Current skills count: ${existingSkills.length}`);
        existingSkills.forEach(s => console.log(` - ${s.candidateSkill} (${s.candidateRating})`));

        // Try to create a skill
        console.log('Attempting to create a test skill...');
        try {
            const newSkill = await prisma.candidateSkill.create({
                data: {
                    candidateId: candidate.id,
                    candidateSkill: 'TestDebugSkill',
                    candidateRating: '3' // Using string '3' directly if possible, or mapping
                }
            });
            console.log('Successfully created skill:', newSkill);
        } catch (err) {
            console.error('Failed to create skill with string "3":', err.message);

            // Try with enum if available? 
            // In compiled JS, we usually pass value. If Prisma client handles map, we pass the Enum Value alias?
            // Actually raw query might be safer to see what happens.
        }

    } catch (error) {
        console.error('General Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
