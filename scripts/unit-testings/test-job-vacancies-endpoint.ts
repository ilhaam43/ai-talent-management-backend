
import axios from 'axios';

const API_URL = 'http://localhost:3000/job-vacancies';

async function runTests() {
    console.log('Starting Job Vacancy Endpoint Tests...');

    let vacancyId: string | null = null;
    const testSkills = ['Java', 'Python'];

    try {
        // 1. CREATE
        console.log('\n[TEST] Creating Job Vacancy...');
        // Need Reference IDs. In a real test we'd fetch them first.
        // For this script, we'll assume the user has run seeders and we can fetch one first.
        // Or we can try to fetch references via Prisma if we could import it, but this is a client script.
        // Better: Fetch references via simple query if we can, or just hardcode/fetch from other endpoints if they exist.
        // BUT, verification script `scripts/verify-crud.ts` used Prisma.
        // We can use Prisma in this script providing we handle the import correctly (tsx handles it).

        // Actually, mixing Prisma access in an "Endpoint Test" is cheating but efficient for setup.
        // Let's use Prisma to get IDs, then Axios to test the Endpoint.

        const { PrismaClient } = require('@prisma/client');
        const { Pool } = require('pg');
        const { PrismaPg } = require('@prisma/adapter-pg');
        require('dotenv').config();

        const connectionString = process.env.DATABASE_URL;
        const pool = new Pool({ connectionString });
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });

        await prisma.$connect();

        const role = await prisma.jobRole.findFirst();
        const pos = await prisma.employeePosition.findFirst();
        const type = await prisma.employmentType.findFirst();
        const status = await prisma.jobVacancyStatus.findFirst();
        const duration = await prisma.jobVacancyDuration.findFirst();
        const reason = await prisma.jobVacancyReason.findFirst();

        if (!role) throw new Error("Seed data missing");

        const payload = {
            jobRoleId: role.id,
            employeePositionId: pos.id,
            employmentTypeId: type.id,
            jobVacancyStatusId: status.id,
            jobVacancyDurationId: duration.id,
            jobVacancyReasonId: reason.id,
            jobRequirement: "Endpoint Test Req",
            jobDescription: "Endpoint Test Desc",
            cityLocation: "Test City",
            minSalary: 5000,
            maxSalary: 10000,
            skills: testSkills
        };

        const createRes = await axios.post(API_URL, payload);
        if (createRes.status === 201) {
            console.log('✅ Create Success:', createRes.data.id);
            vacancyId = createRes.data.id;
        } else {
            console.error('❌ Create Failed:', createRes.status, createRes.data);
        }

        // 2. GET ALL
        console.log('\n[TEST] Get All Vacancies...');
        const listRes = await axios.get(API_URL);
        if (listRes.status === 200 && Array.isArray(listRes.data)) {
            const found = listRes.data.find((v: any) => v.id === vacancyId);
            if (found) console.log('✅ Get All: Created vacancy found in list');
            else console.warn('⚠️ Get All: Created vacancy NOT found in list');
        }

        // 3. GET ONE
        if (vacancyId) {
            console.log('\n[TEST] Get One Vacancy...');
            const oneRes = await axios.get(`${API_URL}/${vacancyId}`);
            if (oneRes.status === 200) {
                const skillsReceived = oneRes.data.jobVacancySkills.map((s: any) => s.skill.skillName);
                const hasSkills = testSkills.every(s => skillsReceived.includes(s));
                if (hasSkills) console.log('✅ Get One: Skills verified');
                else console.error('❌ Get One: Skills mismatch', skillsReceived);
            }
        }

        // 4. UPDATE
        if (vacancyId) {
            console.log('\n[TEST] Update Vacancy (Change Skills)...');
            const newSkills = ['React.js'];
            const updateRes = await axios.patch(`${API_URL}/${vacancyId}`, {
                cityLocation: "Updated City",
                skills: newSkills
            });

            if (updateRes.status === 200) {
                const skillsReceived = updateRes.data.jobVacancySkills.map((s: any) => s.skill.skillName);
                if (skillsReceived.includes('React.js') && !skillsReceived.includes('Java')) {
                    console.log('✅ Update: Skills successfully synced (replaced)');
                } else {
                    console.error('❌ Update: Skill sync failed', skillsReceived);
                }
            }
        }

        // 5. DELETE
        if (vacancyId) {
            console.log('\n[TEST] Delete Vacancy...');
            const delRes = await axios.delete(`${API_URL}/${vacancyId}`);
            if (delRes.status === 200) {
                console.log('✅ Delete Success');

                // Verify gone
                try {
                    await axios.get(`${API_URL}/${vacancyId}`);
                } catch (e: any) {
                    if (e.response && e.response.status === 404) {
                        console.log('✅ Verified 404 after delete');
                    } else {
                        console.warn('⚠️ Unexpected response verifying delete:', e.message);
                    }
                }
            }
        }

        await prisma.$disconnect();

    } catch (error: any) {
        console.error('❌ Test Execution Failed:', error.message);
        if (error.response) console.error('Response Data:', error.response.data);
    }
}

runTests();
