import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import * as crypto from 'crypto';

const API_URL = 'http://localhost:3000';
const TEST_EMAIL_SUCCESS = 'test-set-password-success@example.com';
const TEST_EMAIL_EXPIRED = 'test-set-password-expired@example.com';
const NEW_PASSWORD = 'newpassword123';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testSetPasswordFlow() {
    console.log('=== Testing Set Password Flow ===\n');

    try {
        // --- Setup Test Users ---
        console.log('0. Setting up test users in DB...');
        // Clean up first just in case
        await prisma.user.deleteMany({
            where: { email: { in: [TEST_EMAIL_SUCCESS, TEST_EMAIL_EXPIRED] } }
        });

        const validToken = crypto.randomBytes(32).toString('hex');
        const expiredToken = crypto.randomBytes(32).toString('hex');

        await prisma.user.create({
            data: {
                name: 'Test Valid Token',
                email: TEST_EMAIL_SUCCESS,
                password: 'placeholder',
                passwordSetRequired: true,
                passwordResetToken: validToken,
                passwordResetExpiry: new Date(Date.now() + 3600000), // 1 hour in future
                candidates: {
                    create: {
                        candidateFullname: 'Test Valid Token',
                        candidateEmail: TEST_EMAIL_SUCCESS
                    }
                }
            }
        });

        await prisma.user.create({
            data: {
                name: 'Test Expired Token',
                email: TEST_EMAIL_EXPIRED,
                password: 'placeholder',
                passwordSetRequired: true,
                passwordResetToken: expiredToken,
                passwordResetExpiry: new Date(Date.now() - 3600000), // 1 hour in past
                candidates: {
                    create: {
                        candidateFullname: 'Test Expired Token',
                        candidateEmail: TEST_EMAIL_EXPIRED
                    }
                }
            }
        });

        console.log('✅ Test users created.');

        // Step 1: Test valid token
        console.log(`\n1. Testing valid token update for ${TEST_EMAIL_SUCCESS}...`);
        const successRes = await axios.post(`${API_URL}/auth/set-password`, {
            token: validToken,
            password: NEW_PASSWORD
        });
        console.log('✅ Password set successfully:', successRes.data);

        // Step 2: Try login with new password
        console.log(`\n2. Attempting login with new password...`);
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_EMAIL_SUCCESS,
            password: NEW_PASSWORD,
        });
        console.log('✅ Login successful! Received token:', loginRes.data.access_token ? 'Yes' : 'No');

        // Step 3: Try to use the same token again (should fail)
        console.log(`\n3. Trying to reuse the same valid token (should fail)...`);
        try {
            await axios.post(`${API_URL}/auth/set-password`, {
                token: validToken,
                password: 'anotherpassword',
            });
            console.log('❌ ERROR: Reusing token worked! This is a bug.');
        } catch (error: any) {
            if (error.response?.status === 400) {
                console.log('✅ Token reuse correctly rejected');
            } else {
                console.log('⚠️ Unexpected error:', error.message);
            }
        }

        // Step 4: Test expired token
        console.log(`\n4. Testing expired token update for ${TEST_EMAIL_EXPIRED} (should fail)...`);
        try {
            await axios.post(`${API_URL}/auth/set-password`, {
                token: expiredToken,
                password: NEW_PASSWORD,
            });
            console.log('❌ ERROR: Expired token worked! This is a bug.');
        } catch (error: any) {
            if (error.response?.status === 400) {
                console.log('✅ Expired token correctly rejected');
            } else {
                console.log('⚠️ Unexpected error:', error.message);
            }
        }

        console.log('\n=== All tests passed! ===');

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    } finally {
        // Clean up
        console.log('\nCleaning up test users...');
        await prisma.user.deleteMany({
            where: { email: { in: [TEST_EMAIL_SUCCESS, TEST_EMAIL_EXPIRED] } }
        });
        await prisma.$disconnect();
    }
}

testSetPasswordFlow();
