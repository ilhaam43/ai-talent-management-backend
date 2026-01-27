import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_talent_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding Lintasarta candidate users...');

    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const candidatesToSeed = [
        {
            email: 'muhammad.reza@lintasarta.co.id',
            name: 'Muhammad Reza',
            fullname: 'Muhammad Reza',
        },
        {
            email: 'adam.bagus@lintasarta.co.id',
            name: 'Adam Bagus',
            fullname: 'Adam Bagus',
        },
    ];

    for (const candidateData of candidatesToSeed) {
        // Upsert User
        const user = await prisma.user.upsert({
            where: { email: candidateData.email },
            update: {
                password: hashedPassword, // Update password if re-seeding
            },
            create: {
                email: candidateData.email,
                name: candidateData.name,
                password: hashedPassword,
                emailVerified: new Date(),
            },
        });
        console.log(`✓ User ensured: ${user.email} (${user.id})`);

        // Upsert Candidate
        let candidate = await prisma.candidate.findFirst({
            where: { userId: user.id },
        });

        if (candidate) {
            console.log(`  - Candidate record already exists for ${user.email}`);
            // Update candidate data if needed
            await prisma.candidate.update({
                where: { id: candidate.id },
                data: {
                    candidateEmail: candidateData.email,
                    candidateFullname: candidateData.fullname,
                },
            });
            console.log(`  - Updated candidate data`);
        } else {
            // Create new candidate
            candidate = await prisma.candidate.create({
                data: {
                    userId: user.id,
                    candidateEmail: candidateData.email,
                    candidateFullname: candidateData.fullname,
                },
            });
            console.log(`  - Created candidate record: ${candidate.id}`);
        }
    }

    console.log('\n✅ Lintasarta candidate seeding completed!');
    console.log('\nTest credentials:');
    console.log('  Email: muhammad.reza@lintasarta.co.id');
    console.log('  Email: adam.bagus@lintasarta.co.id');
    console.log('  Password: password123');
}

main()
    .catch((e) => {
        console.error('Error seeding candidates:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
