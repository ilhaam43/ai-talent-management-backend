import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const socialMedias = [
    'INSTAGRAM',
    'TIKTOK',
    'FACEBOOK',
    'X',
    'LINKEDIN',
];

async function main() {
    console.log('Seeding social media...');

    for (const media of socialMedias) {
        const existing = await prisma.socialMedia.findFirst({
            where: { socialMedia: media },
        });

        if (existing) {
            console.log(`✓ Social media "${media}" already exists`);
        } else {
            await prisma.socialMedia.create({
                data: { socialMedia: media },
            });
            console.log(`✓ Created social media "${media}"`);
        }
    }

    console.log('\n✅ Social media seeded successfully!');
}

main()
    .catch((error) => {
        console.error('Error seeding social media:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
