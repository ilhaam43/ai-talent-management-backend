import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
console.log('Database URL exists:', !!connectionString);

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createTestUser() {
  console.log('👤 Creating test user...');

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (existingUser) {
      console.log('   ✅ Test user already exists');
      return existingUser;
    }

    // Create user
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash('password123', salt);

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
      },
    });

    // Create candidate
    const candidate = await prisma.candidate.create({
      data: {
        userId: user.id,
        candidateEmail: 'test@example.com',
        candidateFullname: 'Test User',
      },
    });

    console.log('   ✅ Created test user and candidate');
    return user;

  } catch (error: any) {
    console.error('   ❌ Error creating test user:', error.message);
    return null;
  }
}

async function testAuth() {
  console.log('🔐 Testing authentication directly...\n');

  try {
    // Create test user if not exists
    const testUser = await createTestUser();
    if (!testUser) return;

    console.log('\n1. Checking for test user...');
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
      include: { candidates: true },
    });

    if (!user) {
      console.log('   ❌ Test user not found');
      return;
    }

    console.log(`   ✅ Found user: ${user.email}`);
    console.log(`   Password hash exists: ${!!user.password}`);

    if (user.password) {
      const isValid = await bcrypt.compare('password123', user.password);
      console.log(`   Password valid: ${isValid}`);
    }

    console.log(`   Has candidate: ${!!user.candidates?.[0]}`);

    // Test auth service logic
    console.log('\n2. Testing auth service logic...');
    if (user.password && (await bcrypt.compare('password123', user.password))) {
      const candidate = user.candidates?.[0] || null;
      const result = {
        id: user.id,
        email: user.email,
        candidateId: candidate?.id || null,
        candidateEmail: candidate?.candidateEmail || user.email,
      };
      console.log('   ✅ Auth validation successful:', result);
    } else {
      console.log('   ❌ Auth validation failed');
    }

  } catch (error: any) {
    console.error('   ❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();
