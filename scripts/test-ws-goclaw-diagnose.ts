import WebSocket from 'ws';

const GOCLAW_WS_URL = 'ws://agentic-ai-recruitment.lintasarta.dev/ws';
const GOCLAW_GATEWAY_TOKEN = 'c3bab9f7c506eab42341bb7e39659591';
const GOCLAW_AGENT_KEY = 'a-l-i-c-e-solo';
const userId = 'aitm_test_diagnose_user';

console.log('Connecting to GoClaw at:', GOCLAW_WS_URL);

const ws = new WebSocket(GOCLAW_WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to GoClaw WS');

  // Step 1: Handshake connect
  const connectFrame = {
    type: 'req',
    id: `conn-${Date.now()}`,
    method: 'connect',
    params: {
      token: GOCLAW_GATEWAY_TOKEN,
      user_id: userId,
      protocol: 3,
    },
  };
  console.log('📤 Sending connect frame:', connectFrame);
  ws.send(JSON.stringify(connectFrame));
});

let chatSent = false;

ws.on('message', (raw: Buffer) => {
  const text = raw.toString();
  try {
    const frame = JSON.parse(text);
    console.log('\n📥 [GoClaw Frame Received]:', {
      type: frame.type,
      event: frame.event,
      method: frame.method,
      ok: frame.ok,
      payload: frame.payload,
    });

    // If handshake succeeded, send a chat query that should trigger agent tools/thinking
    if (frame.type === 'res' && frame.ok && !chatSent) {
      chatSent = true;
      const chatReqId = `chat-${Date.now()}`;
      const chatFrame = {
        type: 'req',
        id: chatReqId,
        method: 'chat.send',
        params: {
          message: 'Carikan kandidat Frontend Developer dengan skill React dari database CV',
          agentId: GOCLAW_AGENT_KEY,
          channel: 'websocket',
          sessionKey: `agent:${GOCLAW_AGENT_KEY}:direct:${userId}:${Date.now()}`,
        },
      };
      console.log('\n📤 Sending chat.send frame:', chatFrame);
      ws.send(JSON.stringify(chatFrame));
    }

    if (frame.type === 'res' && frame.payload?.content) {
      console.log('\n🏁 [Agent Finished Response]:', frame.payload.content);
      setTimeout(() => {
        console.log('Test completed.');
        ws.close();
        process.exit(0);
      }, 2000);
    }
  } catch (err) {
    console.log('Raw message:', text);
  }
});

ws.on('error', (err) => {
  console.error('❌ WS Error:', err.message);
});

ws.on('close', (code, reason) => {
  console.log('WS Closed:', code, reason.toString());
});

setTimeout(() => {
  console.log('\n⏱️ Timeout reached (30s)');
  ws.close();
  process.exit(0);
}, 30000);
