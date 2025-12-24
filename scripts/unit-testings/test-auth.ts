const http = require('http');

async function testAuth() {
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

  console.log('1. Attempting login with correct credentials...');
  const req = http.request(options, (res: any) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let data = '';
    res.on('data', (chunk: any) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 201 || res.statusCode === 200) {
        const parsed = JSON.parse(data);
        console.log('SUCCESS: Login successful. Token:', parsed.access_token ? 'Received' : 'Missing');
      } else {
        console.log('FAILURE: Login failed', res.statusCode);
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (e: any) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

testAuth();
