import { execSync } from 'child_process';

async function main() {
    console.log('🔄 Starting database reset and reseed process...\n');

    try {
        // Step 1: Reset database using db push (works better in Docker)
        console.log('📦 Step 1: Resetting database schema...');
        execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
        console.log('✅ Database reset complete\n');

        // Step 2: Generate Prisma Client
        console.log('⚙️  Step 2: Generating Prisma Client...');
        execSync('npx prisma generate', { stdio: 'inherit' });
        console.log('✅ Prisma Client generated\n');

        // Step 3: Run all seeders
        console.log('🌱 Step 3: Running all seeders...');
        execSync('npx tsx scripts/seed/seed-all.ts', { stdio: 'inherit' });
        console.log('✅ Seeders complete\n');

        console.log('🎉 Database reset and reseed completed successfully!');
    } catch (error) {
        console.error('❌ Error during database reset and reseed:', error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
