import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function testCandidateLogin() {
    console.log('Testing candidate login...\n');

    try {
        // Test login with candidate@example.com
        console.log('1. Logging in as candidate@example.com...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'candidate@example.com',
            password: 'password123',
        });

        console.log('✅ Login successful!');
        console.log('Response:', JSON.stringify(loginRes.data, null, 2));

        const token = loginRes.data.access_token;

        // Test accessing a protected endpoint
        console.log('\n2. Testing protected endpoint with token...');
        const profileRes = await axios.get(`${API_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Profile access successful!');
        console.log('Profile:', JSON.stringify(profileRes.data, null, 2));

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
    }
}

testCandidateLogin();
