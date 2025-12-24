
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_talent_db?schema=public',
        },
    },
});

async function main() {
    try {
        console.log('Connecting to database...');
        // Try to count users or just connect
        const result = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`;
        console.log('Tables in public schema:', result);

        const count = await prisma.user.count();
        console.log('User count:', count);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
