import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkUser() {
    console.log('Checking test user in database...\n');

    try {
        const user = await prisma.user.findUnique({
            where: { email: 'candidate@example.com' },
            include: {
                candidates: true,
            }
        });

        if (!user) {
            console.log('❌ User NOT found in database!');
            console.log('Please run: npx tsx scripts/seeders/seed-candidate.ts');
        } else {
            console.log('✅ User found:');
            console.log('  ID:', user.id);
            console.log('  Email:', user.email);
            console.log('  Name:', user.name);
            console.log('  Password hash:', user.password.substring(0, 30) + '...');
            console.log('  Candidates:', user.candidates.length);

            if (user.candidates.length > 0) {
                console.log('\n  Candidate details:');
                user.candidates.forEach((c, i) => {
                    console.log(`    [${i}] ID: ${c.id}`);
                    console.log(`    [${i}] Email: ${c.candidateEmail}`);
                    console.log(`    [${i}] Fullname: ${c.candidateFullname}`);
                });
            }
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkUser();
