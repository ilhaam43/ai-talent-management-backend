import axios from 'axios';

async function main() {
    const baseUrl = 'http://localhost:3000'; // Adjust if needed

    try {
        console.log('Testing RBAC...');

        // 1. Login as HR
        console.log('\n--- Logging in as HR ---');
        const hrLogin = await axios.post(`${baseUrl}/auth/login`, {
            email: 'hr@example.com',
            password: 'password123',
        });
        const hrToken = hrLogin.data.access_token;
        console.log('HR logged in.');

        // 2. Login as Hiring Manager (Non-HR)
        console.log('\n--- Logging in as Hiring Manager ---');
        const hmLogin = await axios.post(`${baseUrl}/auth/login`, {
            email: 'hiring-manager@example.com',
            password: 'password123',
        });
        const hmToken = hmLogin.data.access_token;
        console.log('Hiring Manager logged in.');

        // 3. Access Protected Route as HR
        console.log('\n--- Accessing HR Route as HR ---');
        try {
            const resHr = await axios.get(`${baseUrl}/rbac-test/hr`, {
                headers: { Authorization: `Bearer ${hrToken}` },
            });
            console.log('✅ HR Access Success:', resHr.data);
        } catch (e: any) {
            console.error('❌ HR Access Failed:', e.response?.status, e.response?.data);
        }

        // 4. Access Protected Route as Hiring Manager (should fail for HR route)
        console.log('\n--- Accessing HR Route as Hiring Manager (should be forbidden) ---');
        try {
            await axios.get(`${baseUrl}/rbac-test/hr`, {
                headers: { Authorization: `Bearer ${hmToken}` },
            });
            console.error('❌ Hiring Manager Access ALLOWED to HR route (Should be forbidden)');
        } catch (e: any) {
            if (e.response?.status === 403) {
                console.log('✅ Hiring Manager Access Forbidden (403) - Correct behavior');
            } else {
                console.error('❌ Hiring Manager Access Error (Unexpected status):', e.response?.status);
            }
        }

        // 5. Access Hiring Manager Route as Hiring Manager
        console.log('\n--- Accessing Hiring Manager Route as Hiring Manager ---');
        try {
            const resHm = await axios.get(`${baseUrl}/rbac-test/hiring-manager`, {
                headers: { Authorization: `Bearer ${hmToken}` },
            });
            console.log('✅ Hiring Manager Access Success:', resHm.data);
        } catch (e: any) {
            console.error('❌ Hiring Manager Access Failed:', e.response?.status, e.response?.data);
        }

    } catch (error) {
        console.error('Test script error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

main();
