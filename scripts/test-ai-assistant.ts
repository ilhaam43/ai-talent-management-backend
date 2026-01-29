/**
 * Test script for AI Assistant API
 * Run with: npx tsx scripts/test-ai-assistant.ts
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const prisma = new PrismaClient();

interface ChatResponse {
  response: string;
  sessionId: string;
  candidates?: any[];
  sources?: string[];
}

async function login(): Promise<string> {
  console.log('📝 Logging in to get access token...');
  
  // Get an existing user for testing
  const user = await prisma.user.findFirst({
    where: {
      employees: {
        some: {},
      },
    },
    include: {
      employees: true,
    },
  });

  if (!user) {
    throw new Error('No employee user found for testing. Please create one first.');
  }

  console.log(`   Found user: ${user.email}`);
  
  // Login with the user
  const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: user.email,
    password: 'password123', // Adjust based on your test user's password
  });

  return loginResponse.data.access_token;
}

async function testChatEndpoint(token: string): Promise<void> {
  console.log('\n🤖 Testing AI Assistant Chat Endpoint\n');

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test 1: Simple greeting
  console.log('Test 1: Simple greeting');
  try {
    const response = await axios.post<ChatResponse>(
      `${API_BASE_URL}/ai-assistant/chat`,
      { message: 'Halo', sessionId: null },
      { headers }
    );
    console.log('✅ Response:', response.data.response.substring(0, 200) + '...');
    console.log('   Session ID:', response.data.sessionId);
  } catch (error: any) {
    console.log('❌ Error:', error.response?.data || error.message);
  }

  // Test 2: Query for candidates
  console.log('\nTest 2: Query for candidates');
  try {
    const response = await axios.post<ChatResponse>(
      `${API_BASE_URL}/ai-assistant/chat`,
      { message: 'Tampilkan kandidat terbaik' },
      { headers }
    );
    console.log('✅ Response:', response.data.response.substring(0, 300) + '...');
    console.log('   Candidates found:', response.data.candidates?.length || 0);
    console.log('   Sources:', response.data.sources?.join(', '));
  } catch (error: any) {
    console.log('❌ Error:', error.response?.data || error.message);
  }

  // Test 3: Query for specific skills
  console.log('\nTest 3: Query for candidates with specific skills');
  try {
    const response = await axios.post<ChatResponse>(
      `${API_BASE_URL}/ai-assistant/chat`,
      { message: 'Cari kandidat dengan skill Python' },
      { headers }
    );
    console.log('✅ Response:', response.data.response.substring(0, 300) + '...');
    console.log('   Candidates found:', response.data.candidates?.length || 0);
  } catch (error: any) {
    console.log('❌ Error:', error.response?.data || error.message);
  }

  // Test 4: Query for statistics
  console.log('\nTest 4: Query for statistics');
  try {
    const response = await axios.post<ChatResponse>(
      `${API_BASE_URL}/ai-assistant/chat`,
      { message: 'Berapa jumlah total kandidat yang sudah melamar?' },
      { headers }
    );
    console.log('✅ Response:', response.data.response.substring(0, 300) + '...');
  } catch (error: any) {
    console.log('❌ Error:', error.response?.data || error.message);
  }

  // Test 5: Query for strong match candidates
  console.log('\nTest 5: Query for strong match candidates');
  try {
    const response = await axios.post<ChatResponse>(
      `${API_BASE_URL}/ai-assistant/chat`,
      { message: 'Siapa kandidat dengan status strong match?' },
      { headers }
    );
    console.log('✅ Response:', response.data.response.substring(0, 300) + '...');
    console.log('   Candidates found:', response.data.candidates?.length || 0);
  } catch (error: any) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 AI Assistant Integration Test');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_BASE_URL}`);

  try {
    const token = await login();
    await testChatEndpoint(token);
    console.log('\n✅ All tests completed!');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Make sure the backend server is running (npm run start:dev)');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
