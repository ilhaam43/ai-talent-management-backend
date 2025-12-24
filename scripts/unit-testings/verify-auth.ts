
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_talent_db?schema=public',
        },
    },
});

async function main() {
    const email = 'testuser@example.com';
    const password = 'testpassword123';

    // 1. Create User
    console.log('--- Seeding User ---');
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (!existing) {
            // Use bcryptjs or just rely on 'require' if available, otherwise skip hashing if just testing flow?
            // But auth service compares hash. We MUST hash.
            // Trying to use pure JS implementation if possible or rely on installed bcrypt.
            // Since we are in the project root, node_modules should be available.
            const bcrypt = require('bcrypt');
            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(password, salt);

            await prisma.user.create({
                data: {
                    name: 'Test User',
                    email,
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            });
            console.log('User created');
        } else {
            console.log('User already exists');
        }
    } catch (e) {
        console.error('Error creating user:', e);
        return;
    }

    // 2. Test Login
    console.log('\n--- Testing Login ---');
    try {
        const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Data:', data);

        if (data.access_token) {
            console.log('SUCCESS: Access token received.');
        } else {
            console.log('FAILURE: No access token in response.');
        }

    } catch (e) {
        console.error('Login failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
