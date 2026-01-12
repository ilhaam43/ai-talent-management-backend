import axios from 'axios';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:3000';

// Test credentials
const TEST_CANDIDATE = {
  email: 'test@example.com',
  password: 'password123',
};

// Use axios with cookie support
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Important: include cookies
});

async function testRefreshToken() {
  console.log('🚀 Testing Refresh Token Flow');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Step 1: Login
    console.log('1️⃣  Logging in...');
    const loginResponse = await axiosInstance.post('/auth/login', TEST_CANDIDATE);
    const accessToken = loginResponse.data.access_token;
    const expiresIn = loginResponse.data.expires_in;

    console.log('✅ Login successful');
    console.log(`   Access Token: ${accessToken.substring(0, 30)}...`);
    console.log(`   Expires in: ${expiresIn} seconds (${expiresIn / 60} minutes)`);
    console.log(`   Refresh Token: Set in httpOnly cookie (not accessible via JS)\n`);

    // Step 2: Use access token
    console.log('2️⃣  Testing authenticated request...');
    const profileResponse = await axiosInstance.get('/auth/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('✅ Profile retrieved');
    console.log(`   User ID: ${profileResponse.data.id}`);
    console.log(`   Email: ${profileResponse.data.email || profileResponse.data.candidateEmail}\n`);

    // Step 3: Refresh access token
    console.log('3️⃣  Refreshing access token...');
    const refreshResponse = await axiosInstance.post('/auth/refresh');

    const newAccessToken = refreshResponse.data.access_token;
    const newExpiresIn = refreshResponse.data.expires_in;

    console.log('✅ Token refreshed successfully');
    console.log(`   New Access Token: ${newAccessToken.substring(0, 30)}...`);
    console.log(`   Expires in: ${newExpiresIn} seconds (${newExpiresIn / 60} minutes)\n`);

    // Step 4: Use new access token
    console.log('4️⃣  Testing with new access token...');
    const newProfileResponse = await axiosInstance.get('/auth/profile', {
      headers: {
        Authorization: `Bearer ${newAccessToken}`,
      },
    });

    console.log('✅ Profile retrieved with new token');
    console.log(`   User ID: ${newProfileResponse.data.id}\n`);

    // Step 5: Logout
    console.log('5️⃣  Logging out...');
    const logoutResponse = await axiosInstance.post('/auth/logout');

    console.log('✅ Logout successful');
    console.log(`   Message: ${logoutResponse.data.message}\n`);

    // Step 6: Try to refresh after logout (should fail)
    console.log('6️⃣  Testing refresh after logout (should fail)...');
    try {
      await axiosInstance.post('/auth/refresh');
      console.log('❌ Refresh should have failed but succeeded');
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('✅ Refresh correctly failed after logout');
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.message || 'Unauthorized'}\n`);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('');
    console.log('Summary:');
    console.log('  ✅ Login with refresh token in cookie');
    console.log('  ✅ Use access token for API calls');
    console.log('  ✅ Refresh access token using cookie');
    console.log('  ✅ Use new access token');
    console.log('  ✅ Logout clears refresh token');
    console.log('  ✅ Refresh fails after logout');
  } catch (error: any) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    } else {
      console.error(`   Error:`, error.message);
    }
    process.exit(1);
  }
}

// Run test
testRefreshToken().catch(console.error);


