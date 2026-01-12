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
    console.log('Seeding auth user...');

    const email = 'test-auth@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Upsert User
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
        },
        create: {
            email,
            name: 'Test Auth User',
            password: hashedPassword,
            emailVerified: new Date(),
        },
    });

    console.log(`User created/updated: ${user.email}`);

    // 2. Upsert Candidate (required for AuthService logic)
    // Check if candidate exists for this user
    const existingCandidate = await prisma.candidate.findFirst({
        where: { userId: user.id },
    });

    if (!existingCandidate) {
        await prisma.candidate.create({
            data: {
                userId: user.id,
                candidateEmail: email,
                candidateFullname: 'Test Auth User',
            },
        });
        console.log('Candidate profile created.');
    } else {
        console.log('Candidate profile already exists.');
    }

    console.log('------------------------------------------------');
    console.log('Seeding complete.');
    console.log('------------------------------------------------');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('------------------------------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
