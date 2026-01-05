
import axios from 'axios';
import assert from 'assert';

const API_URL = 'http://localhost:3000/candidate-applications';

async function testCandidateApplications() {
    console.log('Starting Candidate Applications Endpoint Test...');

    try {
        // 1. GET All Applications
        console.log(`\n[TEST] GET ${API_URL}`);
        const response = await axios.get(API_URL);

        assert.strictEqual(response.status, 200);
        assert(Array.isArray(response.data), 'Response data should be an array');
        assert(response.data.length > 0, 'Should return at least one application');

        console.log(`✅ Received ${response.data.length} applications`);

        // 2. Validate Data Structure & Seeded Data
        console.log('\n[TEST] Verifying specific seeded candidates...');

        const apps = response.data;

        // Candidate 1: Aulia Kayesha
        const aulia = apps.find((a: any) => a.candidate.user.name === 'Aulia Kayesha');
        assert(aulia, 'Aulia Kayesha should exist');
        assert.strictEqual(aulia.jobVacancy.jobRole.jobRoleName, 'Product Manager');
        assert.strictEqual(aulia.fitScore, '94');
        assert.strictEqual(aulia.applicationPipeline.applicationPipeline, 'INTERVIEW USER 1');
        assert.strictEqual(aulia.applicationLastStatus.applicationLastStatus, 'PASSED');

        // Verify Enriched Fields
        assert.ok(aulia.candidate.genderId, 'Gender should be populated');
        assert.ok(aulia.candidate.religionId, 'Religion should be populated');
        assert.strictEqual(aulia.candidate.phoneNumber, '08123456789');
        assert.strictEqual(aulia.candidate.placeOfBirth, 'Jakarta');
        assert.strictEqual(aulia.jobVacancy.cityLocation, 'Jakarta');
        assert.ok(aulia.jobVacancy.jobQualification, 'Job Qualification should be populated');

        // Verify AI Analysis Fields
        assert.ok(aulia.aiInsight, 'AI Insight should be populated');
        assert.ok(aulia.aiInterview, 'AI Interview should be populated');
        assert.ok(aulia.resultSummary, 'Result Summary should be populated');

        if (aulia.aiMatchStatus) {
            console.log(`ℹ️ AI Match Status: ${aulia.aiMatchStatus}`);
            assert(['STRONG MATCH', 'MATCH', 'NOT MATCH', 'STRONG_MATCH', 'NOT_MATCH'].includes(aulia.aiMatchStatus));
        }

        console.log('✅ Aulia Kayesha verified (Enriched Data + AI Analysis)');


        // Candidate 2: Daniel
        const daniel = apps.find((a: any) => a.candidate.user.name === 'Daniel');
        assert(daniel, 'Daniel should exist');
        assert.strictEqual(daniel.fitScore, '70');
        assert.strictEqual(daniel.applicationPipeline.applicationPipeline, 'AI SCREENING');
        assert.strictEqual(daniel.applicationLastStatus.applicationLastStatus, 'PARTIALLY PASSED');
        console.log('✅ Daniel verified');

        // Candidate 3: Elvita Carolina (Not Passed)
        const elvita = apps.find((a: any) => a.candidate.user.name === 'Elvita Carolina');
        assert(elvita, 'Elvita Carolina should exist');
        assert.strictEqual(elvita.jobVacancy.jobRole.jobRoleName, 'Lead Product Manager');
        assert.strictEqual(elvita.applicationLastStatus.applicationLastStatus, 'NOT PASSED');
        console.log('✅ Elvita Carolina verified');

        console.log('\nALL CANDIDATE APPLICATION TESTS PASSED');

    } catch (error: any) {
        console.error('❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
            console.error('Response Status:', error.response.status);
        }
        process.exit(1);
    }
}

testCandidateApplications();
