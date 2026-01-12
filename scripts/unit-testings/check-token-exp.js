
const http = require('http');

async function testToken() {
    const email = 'test-auth@example.com';
    const password = 'password123';
    const postData = JSON.stringify({ email, password });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode === 201 || res.statusCode === 200) {
                const parsed = JSON.parse(data);
                const token = parsed.access_token;
                if (token) {
                    const parts = token.split('.');
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                    console.log('Token Payload:', payload);
                    if (payload.iat && payload.exp) {
                        const diff = payload.exp - payload.iat;
                        console.log(`Expiration difference: ${diff} seconds`);
                    }
                }
            } else {
                console.log('Login failed', res.statusCode);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Error: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

testToken();
