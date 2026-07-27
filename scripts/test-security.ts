/**
 * Security Features Test Script
 *
 * Tests the security hardening features implemented:
 *   1. XSS Prevention (stripHtmlTags utility)
 *   2. Brute-Force Rate Limiting (429 on /auth/login)
 *   3. MIME-Type Validation (400 on fake PDF upload)
 *
 * Run: npx tsx scripts/test-security.ts
 */

import axios, { AxiosResponse } from 'axios';
import * as dotenv from 'dotenv';
import FormData from 'form-data';
import { stripHtmlTags } from '../src/common/utils/sanitize.util';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const BASE_URL = 'http://localhost:3000';

// ─── Helpers ─────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function pass(label: string, detail?: string) {
  console.log(`  ✅ PASS  ${label}${detail ? '  →  ' + detail : ''}`);
  passed++;
}

function fail(label: string, reason: string) {
  console.log(`  ❌ FAIL  ${label}  →  ${reason}`);
  failed++;
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) pass(label, detail);
  else fail(label, 'assertion failed');
}

async function httpStatus(fn: () => Promise<AxiosResponse>): Promise<number> {
  try {
    const r = await fn();
    return r.status;
  } catch (e: any) {
    return e.response?.status ?? 0;
  }
}

// ─── Step 1 : XSS Sanitization Unit Test ─────────────────────────────────────
function testXssSanitization() {
  console.log('\n━━━  STEP 1 : XSS Sanitization Test  ━━━━━━━━━━━━━━━━━━━━');

  const dirtyInput = '<script>alert("xss")</script>Hello <b>World</b>!';
  const expectedOutput = 'alert("xss")Hello World!';
  
  const cleanOutput = stripHtmlTags(dirtyInput);
  
  assert(cleanOutput === expectedOutput, 'stripHtmlTags removes HTML and script tags correctly', `"${cleanOutput}"`);
  
  const dirtyInput2 = '<iframe src="malicious.com"></iframe>Safe Text<img src="x" onerror="alert(1)">';
  const expectedOutput2 = 'Safe Text';
  
  const cleanOutput2 = stripHtmlTags(dirtyInput2);
  assert(cleanOutput2 === expectedOutput2, 'stripHtmlTags removes iframes and img tags correctly', `"${cleanOutput2}"`);
}

// ─── Step 2 : Rate Limiting Test ─────────────────────────────────────────────
async function testRateLimiting() {
  console.log('\n━━━  STEP 2 : Rate Limiting (Brute Force) Test  ━━━━━━━━━');
  
  console.log('  Triggering 15 rapid login requests (Limit is 5 per 60s)...');
  
  let got429 = false;
  
  for (let i = 1; i <= 15; i++) {
    const status = await httpStatus(() =>
      axios.post(`${BASE_URL}/auth/login`, {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      })
    );
    
    console.log(`    Request ${i}: HTTP ${status}`);
    
    if (status === 429) {
      got429 = true;
    }
  }
  
  assert(got429, 'Rate limiter triggered HTTP 429 Too Many Requests');
}

// ─── Step 3 : MIME-Type Validation Test ──────────────────────────────────────
async function testMimeTypeValidation() {
  console.log('\n━━━  STEP 3 : MIME-Type Validation Test  ━━━━━━━━━━━━━━━━');
  
  // We need an auth token first to bypass AuthGuard and reach the FileInterceptor
  const resAuth = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'hr@example.com',
    password: 'password123',
  }).catch(() => null);
  
  if (!resAuth) {
    console.log('  ⚠️ Warning: Could not log in with hr@example.com/password123. Ensure DB is seeded.');
    console.log('  Skipping MIME test.');
    return;
  }
  
  const token = resAuth.data.access_token;
  
  // Create a fake executable file
  const fakeExePath = path.join(__dirname, 'test.exe');
  fs.writeFileSync(fakeExePath, 'MZ90...fake executable content...');
  
  const form = new FormData();
  form.append('file', fs.createReadStream(fakeExePath), {
    filename: 'test.exe',
    contentType: 'application/octet-stream',
  });
  
  const statusExt = await httpStatus(() =>
    axios.post(`${BASE_URL}/cv-parser/parse-file`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    })
  );
  
  assert(statusExt === 400, 'Invalid file extension (.exe) rejected with HTTP 400 Bad Request', String(statusExt));
  
  // Test PDF extension but invalid MIME
  const form2 = new FormData();
  form2.append('file', fs.createReadStream(fakeExePath), {
    filename: 'test.pdf', // Tricking the extension check
    contentType: 'image/svg+xml', // But failing the MIME check
  });
  
  const statusMime = await httpStatus(() =>
    axios.post(`${BASE_URL}/cv-parser/parse-file`, form2, {
      headers: {
        ...form2.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    })
  );
  
  assert(statusMime === 400, 'Valid extension but invalid MIME type rejected with HTTP 400 Bad Request', String(statusMime));
  
  // Cleanup
  if (fs.existsSync(fakeExePath)) {
    fs.unlinkSync(fakeExePath);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Security Integration Tests                           ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`  Backend : ${BASE_URL}`);

  const start = Date.now();

  try {
    testXssSanitization();
    await testMimeTypeValidation();
    // Run Rate Limiter last since it's stateful and blocks IP
    await testRateLimiting();
  } catch (err: any) {
    fail('Unexpected error', err.response?.data?.message ?? err.message);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log(`║  Results: ${passed} passed, ${failed} failed   (${elapsed}s)`.padEnd(56) + '║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
