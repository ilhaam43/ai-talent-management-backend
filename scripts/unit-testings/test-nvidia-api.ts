/**
 * Test script for NVIDIA API connection
 * Tests connection to build.nvidia.com / integrate.api.nvidia.com
 */

import OpenAI from 'openai';

const API_KEY = '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';
const BASE_URL = 'https://integrate.api.nvidia.com/v1';

// Models to test
const MODELS_TO_TEST = [
  'nvidia/llama-3.1-nemotron-70b-instruct',  // Text model from NVIDIA
  'nvidia/nemotron-4-340b-instruct',          // Large text model
  'meta/llama-3.1-8b-instruct',               // Smaller, faster model
];

async function testNvidiaAPI() {
  console.log('🚀 NVIDIA API Connection Test');
  console.log('=' .repeat(60));
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  API Key: ${API_KEY.substring(0, 15)}...`);
  console.log('');

  const client = new OpenAI({
    apiKey: API_KEY,
    baseURL: BASE_URL,
  });

  // Test 1: List available models
  console.log('📋 Test 1: Listing available models...');
  try {
    const models = await client.models.list();
    console.log('  ✅ Models endpoint accessible!');
    console.log(`  Found ${(models.data as any[]).length} models`);
    
    // Show first 10 models
    const modelList = (models.data as any[]).slice(0, 10);
    modelList.forEach((m: any) => {
      console.log(`    - ${m.id}`);
    });
    if ((models.data as any[]).length > 10) {
      console.log(`    ... and ${(models.data as any[]).length - 10} more`);
    }
  } catch (error: any) {
    console.log(`  ❌ Failed to list models: ${error.message}`);
  }

  console.log('');

  // Test 2: Chat completion with simple prompt
  console.log('💬 Test 2: Chat completion test...');
  
  for (const model of MODELS_TO_TEST) {
    console.log(`\n  Testing model: ${model}`);
    const startTime = Date.now();
    
    try {
      const response = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Respond very briefly.',
          },
          {
            role: 'user',
            content: 'Say "Hello from NVIDIA!" in exactly 5 words.',
          },
        ],
        temperature: 0.1,
        max_tokens: 50,
      });

      const responseTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || 'No response';
      
      console.log(`    ✅ Success! (${responseTime}ms)`);
      console.log(`    Response: ${content}`);
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.log(`    ❌ Failed (${responseTime}ms): ${error.message}`);
      if (error.status === 404) {
        console.log(`    Model "${model}" not found`);
      }
    }
  }

  console.log('\n');
  console.log('=' .repeat(60));
  console.log('Test complete!');
}

testNvidiaAPI().catch(console.error);
