/**
 * Integration test: POST /talent-pool/upload-link
 *
 * Tests the Google Drive link submission flow end-to-end:
 *   1. HR Login → obtain JWT
 *   2. Submit a Drive link → verify 201 response & batch record created with sourceType LINK
 *   3. Validate batch is visible in GET /talent-pool/batches
 *   4. Guard tests → unauthenticated and non-HR should be rejected
 *   5. Validation tests → missing URL / invalid URL should return 400
 *
 * Run: npx tsx scripts/test-upload-link.ts
 */

import axios, { AxiosResponse } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:3000';

// ─── Credentials ─────────────────────────────────────────────────────────────
const HR_EMAIL    = 'hr@example.com';
const HR_PASSWORD = 'password123';

// A real-looking (but fake) Google Drive folder link for testing.
// Replace with a real one if you want n8n to actually crawl it.
const DRIVE_LINK = 'https://drive.google.com/drive/folders/1ABCxyz_test-integration-placeholder';

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

// ─── Step 1 : HR Login ───────────────────────────────────────────────────────
async function login(): Promise<string> {
  console.log('\n━━━  STEP 1 : HR Login  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email: HR_EMAIL,
    password: HR_PASSWORD,
  });

  const token: string = res.data.access_token;
  assert(!!token, 'Received JWT access_token', token.substring(0, 30) + '…');
  assert(res.data.user?.role === 'HUMAN RESOURCES', 'User has HUMAN RESOURCES role');
  return token;
}

// ─── Step 2 : Submit Drive Link ──────────────────────────────────────────────
async function submitLink(token: string): Promise<string> {
  console.log('\n━━━  STEP 2 : Submit Google Drive link  ━━━━━━━━━━━━━━━━');

  const payload = {
    sourceUrl: DRIVE_LINK,
    batchName: `Integration Test ${new Date().toISOString()}`,
  };

  const res = await axios.post(
    `${BASE_URL}/talent-pool/upload-link`,
    payload,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
  );

  const batch = res.data.batch;
  const message: string = res.data.message;

  assert(res.status === 201, 'HTTP 201 Created', String(res.status));
  assert(typeof batch?.id === 'string', 'Response contains batch.id', batch?.id);
  assert(batch?.sourceType === 'LINK', 'batch.sourceType is LINK', batch?.sourceType);
  assert(batch?.sourceUrl === DRIVE_LINK, 'batch.sourceUrl matches submitted URL');
  assert(
    ['QUEUED', 'PROCESSING'].includes(batch?.status),
    'batch.status is QUEUED or PROCESSING',
    batch?.status,
  );
  assert(typeof message === 'string' && message.length > 0, 'Response has message', message);

  console.log(`     batch.id     : ${batch.id}`);
  console.log(`     batch.status : ${batch.status}`);

  return batch.id;
}

// ─── Step 3 : Batch visible in list ─────────────────────────────────────────
async function verifyBatchInList(token: string, batchId: string): Promise<void> {
  console.log('\n━━━  STEP 3 : Batch visible in GET /talent-pool/batches  ━━');

  const res = await axios.get(`${BASE_URL}/talent-pool/batches?take=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const batches: any[] = res.data?.batches ?? res.data?.data ?? res.data;
  const found = Array.isArray(batches) && batches.some((b: any) => b.id === batchId);
  assert(found, 'Created batch appears in batch list', found ? 'found' : 'not found');

  // Also verify detail endpoint
  const detailRes = await axios.get(`${BASE_URL}/talent-pool/batches/${batchId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(detailRes.data?.id === batchId, 'GET /batches/:id returns correct batch');
  assert(detailRes.data?.sourceType === 'LINK', 'Detail confirms sourceType LINK');
  assert(detailRes.data?.sourceUrl === DRIVE_LINK, 'Detail confirms sourceUrl');
}

// ─── Step 4 : Auth guard tests ───────────────────────────────────────────────
async function testAuthGuards(): Promise<void> {
  console.log('\n━━━  STEP 4 : Auth guard tests  ━━━━━━━━━━━━━━━━━━━━━━━━');

  const body = { sourceUrl: DRIVE_LINK };

  // 4a. No token → 401
  const noAuth = await httpStatus(() =>
    axios.post(`${BASE_URL}/talent-pool/upload-link`, body),
  );
  assert(noAuth === 401, 'No token → 401 Unauthorized', String(noAuth));

  // 4b. Bad token → 401
  const badAuth = await httpStatus(() =>
    axios.post(`${BASE_URL}/talent-pool/upload-link`, body, {
      headers: { Authorization: 'Bearer obviously.invalid.token' },
    }),
  );
  assert(badAuth === 401, 'Invalid token → 401 Unauthorized', String(badAuth));
}

// ─── Step 5 : Validation tests ───────────────────────────────────────────────
async function testValidation(token: string): Promise<void> {
  console.log('\n━━━  STEP 5 : Request validation tests  ━━━━━━━━━━━━━━━━');

  const authHeader = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 5a. Missing sourceUrl → 400
  const noUrl = await httpStatus(() =>
    axios.post(`${BASE_URL}/talent-pool/upload-link`, {}, { headers: authHeader }),
  );
  assert(noUrl === 400, 'Missing sourceUrl → 400 Bad Request', String(noUrl));

  // 5b. Not a URL → 400
  const badUrl = await httpStatus(() =>
    axios.post(
      `${BASE_URL}/talent-pool/upload-link`,
      { sourceUrl: 'not-a-valid-url' },
      { headers: authHeader },
    ),
  );
  assert(badUrl === 400, 'Invalid URL → 400 Bad Request', String(badUrl));

  // 5c. batchName too long → 400
  const longName = await httpStatus(() =>
    axios.post(
      `${BASE_URL}/talent-pool/upload-link`,
      { sourceUrl: DRIVE_LINK, batchName: 'x'.repeat(256) },
      { headers: authHeader },
    ),
  );
  assert(longName === 400, 'batchName > 255 chars → 400 Bad Request', String(longName));

  // 5d. Valid URL with no batchName → 201 (batchName is optional)
  const noBatchName = await httpStatus(() =>
    axios.post(
      `${BASE_URL}/talent-pool/upload-link`,
      { sourceUrl: DRIVE_LINK },
      { headers: authHeader },
    ),
  );
  assert(noBatchName === 201, 'Valid URL without batchName → 201 Created', String(noBatchName));
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Integration Test: POST /talent-pool/upload-link     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`  Backend : ${BASE_URL}`);
  console.log(`  Drive   : ${DRIVE_LINK}`);

  const start = Date.now();

  try {
    const token  = await login();
    const batchId = await submitLink(token);
    await verifyBatchInList(token, batchId);
    await testAuthGuards();
    await testValidation(token);
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
