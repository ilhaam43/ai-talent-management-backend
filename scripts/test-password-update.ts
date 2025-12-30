import axios from 'axios';

const API_URL = 'http://localhost:3000';
const TEST_EMAIL = 'candidate@example.com';
const ORIGINAL_PASSWORD = 'password123';
const NEW_PASSWORD = 'newpassword456';

async function testPasswordUpdate() {
    console.log('=== Testing Password Update Flow ===\n');

    try {
        // Step 1: Login with original password
        console.log('1. Logging in with original password...');
        const loginRes1 = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: ORIGINAL_PASSWORD,
        });
        console.log('✅ Original login successful');
        const token = loginRes1.data.access_token;
        const candidateId = loginRes1.data.user?.candidateId;

        if (!candidateId) {
            console.error('❌ No candidateId in login response');
            return;
        }
        console.log(`   Candidate ID: ${candidateId}`);

        // Step 2: Get current settings
        console.log('\n2. Getting current settings...');
        const settingsRes = await axios.get(`${API_URL}/candidates/${candidateId}/settings`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Current settings:', settingsRes.data);

        // Step 3: Update password
        console.log(`\n3. Updating password to: ${NEW_PASSWORD}`);
        const updateRes = await axios.patch(`${API_URL}/candidates/${candidateId}/settings`, {
            password: NEW_PASSWORD
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Password update response:', updateRes.data);

        // Step 4: Try to login with OLD password (should fail)
        console.log('\n4. Attempting login with OLD password (should fail)...');
        try {
            await axios.post(`${API_URL}/auth/login`, {
                email: TEST_EMAIL,
                password: ORIGINAL_PASSWORD,
            });
            console.log('❌ ERROR: Old password still works! This is a bug.');
        } catch (error: any) {
            if (error.response?.status === 401) {
                console.log('✅ Old password correctly rejected');
            } else {
                console.log('⚠️  Unexpected error:', error.message);
            }
        }

        // Step 5: Login with NEW password (should succeed)
        console.log('\n5. Logging in with NEW password...');
        const loginRes2 = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: NEW_PASSWORD,
        });
        console.log('✅ New password login successful!');
        console.log('   Token received:', loginRes2.data.access_token ? 'Yes' : 'No');

        // Step 6: Reset password back to original for future tests
        console.log('\n6. Resetting password back to original...');
        const newToken = loginRes2.data.access_token;
        await axios.patch(`${API_URL}/candidates/${candidateId}/settings`, {
            password: ORIGINAL_PASSWORD
        }, {
            headers: { Authorization: `Bearer ${newToken}` }
        });
        console.log('✅ Password reset to original');

        console.log('\n=== All tests passed! ===');

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testPasswordUpdate();
