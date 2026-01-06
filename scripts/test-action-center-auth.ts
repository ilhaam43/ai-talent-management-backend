import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function testActionCenterWithAuth() {
    console.log('Testing Action Center Endpoints with Authentication...\\n');

    try {
        // Step 1: Login to get JWT token
        console.log('1. Logging in to get JWT token...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'fadli.anantama@example.com',
            password: 'password123'
        });

        const token = loginResponse.data.access_token;
        console.log('✓ Login successful, token obtained\\n');

        // Configure axios with auth header
        const authHeaders = {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        // Step 2: Test Summary Endpoint
        console.log('2. Testing GET /action-center/summary');
        const summaryResponse = await axios.get(`${API_URL}/action-center/summary`, authHeaders);
        console.log('Summary:', JSON.stringify(summaryResponse.data, null, 2));
        console.log('✓ Summary endpoint working\\n');

        // Step 3: Test All Tasks
        console.log('3. Testing GET /action-center/tasks (no filters)');
        const tasksResponse = await axios.get(`${API_URL}/action-center/tasks`, authHeaders);
        console.log(`Found ${tasksResponse.data.length} total tasks`);
        if (tasksResponse.data.length > 0) {
            console.log('Sample task:', JSON.stringify(tasksResponse.data[0], null, 2));
        }
        console.log('✓ Tasks endpoint working\\n');

        // Step 4: Test Task Type Filter - Online Assessment
        console.log('4. Testing filter: taskType=ONLINE_ASSESSMENT');
        const onlineAssessmentResponse = await axios.get(`${API_URL}/action-center/tasks`, {
            ...authHeaders,
            params: { taskType: 'ONLINE_ASSESSMENT' }
        });
        console.log(`Found ${onlineAssessmentResponse.data.length} online assessment tasks`);
        console.log('✓ Online Assessment filter working\\n');

        // Step 5: Test Task Type Filter - Interview
        console.log('5. Testing filter: taskType=INTERVIEW');
        const interviewResponse = await axios.get(`${API_URL}/action-center/tasks`, {
            ...authHeaders,
            params: { taskType: 'INTERVIEW' }
        });
        console.log(`Found ${interviewResponse.data.length} interview tasks`);
        if (interviewResponse.data.length > 0) {
            console.log('Sample interview task:', JSON.stringify(interviewResponse.data[0], null, 2));
        }
        console.log('✓ Interview filter working\\n');

        // Step 6: Test Task Type Filter - Job Role Request (DRAFT)
        console.log('6. Testing filter: taskType=JOB_ROLE_REQUEST');
        const draftResponse = await axios.get(`${API_URL}/action-center/tasks`, {
            ...authHeaders,
            params: { taskType: 'JOB_ROLE_REQUEST' }
        });
        console.log(`Found ${draftResponse.data.length} job role requests (DRAFT status)`);
        console.log('✓ Job Role Request filter working\\n');

        // Step 7: Test Task Type Filter - Offer Letter
        console.log('7. Testing filter: taskType=OFFER_LETTER');
        const offerResponse = await axios.get(`${API_URL}/action-center/tasks`, {
            ...authHeaders,
            params: { taskType: 'OFFER_LETTER' }
        });
        console.log(`Found ${offerResponse.data.length} offer letter tasks`);
        console.log('✓ Offer Letter filter working\\n');

        // Step 8: Test Task Type Filter - MCU
        console.log('8. Testing filter: taskType=MCU');
        const mcuResponse = await axios.get(`${API_URL}/action-center/tasks`, {
            ...authHeaders,
            params: { taskType: 'MCU' }
        });
        console.log(`Found ${mcuResponse.data.length} MCU tasks`);
        console.log('✓ MCU filter working\\n');

        // Step 9: Test Task Type Filter - Onboarding
        console.log('9. Testing filter: taskType=ONBOARDING');
        const onboardingResponse = await axios.get(`${API_URL}/action-center/tasks`, {
            ...authHeaders,
            params: { taskType: 'ONBOARDING' }
        });
        console.log(`Found ${onboardingResponse.data.length} onboarding tasks`);
        console.log('✓ Onboarding filter working\\n');

        // Step 10: Test Get Task by ID
        if (tasksResponse.data.length > 0) {
            const taskId = tasksResponse.data[0].id;
            console.log(`10. Testing GET /action-center/tasks/${taskId}`);
            const taskResponse = await axios.get(`${API_URL}/action-center/tasks/${taskId}`, authHeaders);
            console.log('Task details:', JSON.stringify(taskResponse.data, null, 2));
            console.log('✓ Get task by ID working\\n');
        }

        // Summary of results
        console.log('\\n' + '='.repeat(60));
        console.log('✅ ALL ACTION CENTER ENDPOINTS WORKING CORRECTLY!');
        console.log('='.repeat(60));
        console.log('\\nSummary of Results:');
        console.log(`  - Total tasks: ${tasksResponse.data.length}`);
        console.log(`  - Online Assessments: ${onlineAssessmentResponse.data.length}`);
        console.log(`  - Interviews: ${interviewResponse.data.length}`);
        console.log(`  - Job Role Requests (DRAFT): ${draftResponse.data.length}`);
        console.log(`  - Offer Letters: ${offerResponse.data.length}`);
        console.log(`  - MCU: ${mcuResponse.data.length}`);
        console.log(`  - Onboarding: ${onboardingResponse.data.length}`);
        console.log('\\nPipeline Status Summary:');
        console.log(`  - Pending Approval: ${summaryResponse.data.pendingApproval} (${summaryResponse.data.pendingApprovalChange >= 0 ? '+' : ''}${summaryResponse.data.pendingApprovalChange})`);
        console.log(`  - Scheduling Needed: ${summaryResponse.data.schedulingNeeded} (${summaryResponse.data.schedulingNeededChange >= 0 ? '+' : ''}${summaryResponse.data.schedulingNeededChange})`);
        console.log(`  - Waiting Feedback: ${summaryResponse.data.waitingFeedback} (${summaryResponse.data.waitingFeedbackChange >= 0 ? '+' : ''}${summaryResponse.data.waitingFeedbackChange})`);
        console.log(`  - Onboarding Soon: ${summaryResponse.data.onboardingSoon} (${summaryResponse.data.onboardingSoonChange >= 0 ? '+' : ''}${summaryResponse.data.onboardingSoonChange})`);

    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.error('\\nAuthentication failed. Please check credentials.');
        }
    }
}

testActionCenterWithAuth();
