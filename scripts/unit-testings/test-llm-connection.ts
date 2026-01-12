/**
 * Quick script to test LLM API connection
 */
import axios from 'axios';

const API_KEY = 'sk-75d162f17b904c23b99320133e2120f7';
const BASE_URL = 'https://dekawicara.cloudeka.ai/api';
const MODEL = 'qwen/qwen3-coder';

async function testConnection() {
  console.log('Testing LLM API connection...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  console.log('');

  // Test 1: Check if the endpoint is reachable
  console.log('Test 1: Checking endpoint reachability...');
  try {
    const response = await axios.get(`${BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    console.log('✅ Endpoint is reachable!');
    console.log('Available models:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Endpoint test failed:');
    console.log(`   Status: ${error.response?.status || 'N/A'}`);
    console.log(`   Message: ${error.message}`);
    if (error.response?.data) {
      console.log(`   Response: ${JSON.stringify(error.response.data)}`);
    }
  }

  console.log('');

  // Test 2: Try a simple chat completion
  console.log('Test 2: Testing chat completion...');
  try {
    const response = await axios.post(
      `${BASE_URL}/chat/completions`,
      {
        model: MODEL,
        messages: [
          { role: 'user', content: 'Say "hello" in JSON format: {"greeting":"hello"}' }
        ],
        temperature: 0.1,
        max_tokens: 50,
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    console.log('✅ Chat completion works!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Chat completion failed:');
    console.log(`   Status: ${error.response?.status || 'N/A'}`);
    console.log(`   Message: ${error.message}`);
    if (error.response?.data) {
      console.log(`   Response: ${JSON.stringify(error.response.data)}`);
    }
  }

  // Test 4: Try different model name formats
  console.log('');
  console.log('Test 4: Trying different model names...');
  
  const modelNames = [
    'qwen3-coder',
    'qwen-3-coder',
    'Qwen3-Coder',
    'qwen/qwen3-coder',
    'qwen3',
    'qwen-3',
    'gpt-3.5-turbo',
    'gpt-4',
    'llama3',
    'llama-3',
    'deepseek-coder',
  ];

  for (const model of modelNames) {
    try {
      console.log(`   Trying model: ${model}`);
      const response = await axios.post(
        `${BASE_URL}/chat/completions`,
        {
          model: model,
          messages: [
            { role: 'user', content: 'Say hi' }
          ],
          max_tokens: 10,
        },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      console.log(`   ✅ Model "${model}" works!`);
      console.log(`   Response: ${response.data.choices[0]?.message?.content || 'No content'}`);
      break;
    } catch (error: any) {
      const status = error.response?.status || 'N/A';
      const detail = error.response?.data?.detail || error.message;
      console.log(`   ❌ ${model} - Status: ${status}, Detail: ${detail}`);
    }
  }
}

testConnection().catch(console.error);

