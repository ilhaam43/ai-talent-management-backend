import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEST_EMAIL = 'test.settings@example.com';
const TEST_PASSWORD = 'password123';
const API_URL = 'http://localhost:3000';

async function main() {
    console.log('--- Testing Candidate Settings API ---');

    let candidateId = '';
    let userId = '';

    try {
        // 1. Setup Test User
        console.log('\n1. Setting up test user...');

        // Clean up previous test run
        const existingCandidate = await prisma.candidate.findFirst({
            where: { candidateEmail: TEST_EMAIL },
            include: { user: true }
        });

        if (existingCandidate) {
            console.log('Cleaning up existing test user...');
            await prisma.user.delete({ where: { id: existingCandidate.userId } });
            // Candidate should be deleted by cascade or we delete explicitly if not
        } else {
            // Also check user if candidate record doesn't exist but user does
            const existingUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
            if (existingUser) {
                await prisma.user.delete({ where: { id: existingUser.id } });
            }
        }

        const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

        // Find role
        const candidateRole = await prisma.userRole.findFirst({
            where: { roleName: 'CANDIDATE' }
        });

        if (!candidateRole) {
            throw new Error('CANDIDATE role not found. Please run seed-user-roles.ts');
        }

        const newUser = await prisma.user.create({
            data: {
                name: 'Test Candidate',
                email: TEST_EMAIL,
                password: hashedPassword,
            }
        });

        // Wait, how does the system know the user is a CANDIDATE? 
        // Typically through a join or if the User model had a roleId.
        // Let's re-read schema.
        // User DOES NOT have roleId.
        // Employee DOES have userRoleId.
        // Candidate DOES NOT have userRoleId.
        // Maybe the RolesGuard checks if userId exists in Candidate table? 
        // Or assumes all users without Employee record are candidates? 
        // Or maybe my understanding of their auth is incomplete.
        // Let's peek at `Authentication` flow or `RolesGuard` if needed, but for now I'll just create the Candidate record.

        const newCandidate = await prisma.candidate.create({
            data: {
                userId: newUser.id,
                candidateEmail: TEST_EMAIL,
                candidateFullname: 'Test Candidate',
            }
        });

        candidateId = newCandidate.id;
        userId = newUser.id;
        console.log(`User created. Candidate ID: ${candidateId}`);

        // 2. Login
        console.log('\n2. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
        });
        const token = loginRes.data.access_token;
        console.log('Login successful.');

        // 3. Get Settings
        console.log('\n3. Testing GET Settings...');
        const getRes = await axios.get(`${API_URL}/candidates/${candidateId}/settings`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Current Settings:', getRes.data);

        if (getRes.data.email !== TEST_EMAIL || getRes.data.fullname !== 'Test Candidate') {
            console.error('❌ Mismatch in fetched settings!');
        } else {
            console.log('✅ GET Settings verified.');
        }

        // 4. Update Settings
        console.log('\n4. Testing PATCH Settings...');
        const newEmail = 'updated.test@example.com';
        const newName = 'Updated Test Candidate';
        const newPass = 'newpassword123';

        const patchRes = await axios.patch(`${API_URL}/candidates/${candidateId}/settings`, {
            email: newEmail,
            fullname: newName,
            password: newPass
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Update Response:', patchRes.data);

        if (patchRes.data.email !== newEmail || patchRes.data.fullname !== newName) {
            console.error('❌ Mismatch in update response!');
        } else {
            console.log('✅ Update response verified.');
        }

        // 4.1 Test Partial Update (Fullname only)
        console.log('\n4.1 Testing Partial Update (Fullname only)...');
        const partialName = 'Partial Name Update';
        await axios.patch(`${API_URL}/candidates/${candidateId}/settings`, {
            fullname: partialName
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Verify email is still the same, but name updated
        const partialGetRes = await axios.get(`${API_URL}/candidates/${candidateId}/settings`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (partialGetRes.data.fullname === partialName && partialGetRes.data.email === newEmail) {
            console.log('✅ Partial update (fullname) verified.');
        } else {
            console.error('❌ Partial update failed!', partialGetRes.data);
        }

        // 5. Verify Persistence with GET (using new token? No, token usually valid unless email change invalidates it? 
        // changing email might invalidate token if email is in payload. 
        // But let's try with old token first.
        console.log('\n5. Verifying DB Persistence...');

        // Re-login might be safer if email changed
        try {
            console.log('Attempting re-login with new credentials...');
            const reLogin = await axios.post(`${API_URL}/auth/login`, {
                email: newEmail,
                password: newPass
            });
            const newToken = reLogin.data.access_token;
            console.log('Re-login successful.');

            const verifyRes = await axios.get(`${API_URL}/candidates/${candidateId}/settings`, {
                headers: { Authorization: `Bearer ${newToken}` }
            });
            console.log('Verified Settings:', verifyRes.data);

            if (verifyRes.data.email === newEmail && verifyRes.data.fullname === partialName) {
                console.log('✅ Persistence verified.');
            } else {
                console.error('❌ Persistence check failed!');
            }
        } catch (e) {
            console.error('Re-login failed, update might have failed or token issue:', e.message);
        }

    } catch (error: any) {
        console.error('Test Failed:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
    } finally {
        console.log('\nCleanup...');
        if (userId) {
            await prisma.user.delete({ where: { id: userId } }).catch(e => console.error(e));
        }
        await prisma.$disconnect();
    }
}

main();
