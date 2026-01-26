/**
 * Debug Gmail OAuth Connection
 * 
 * Tests:
 * 1. Basic HTTPS connection to Google
 * 2. OAuth token refresh
 * 3. SMTP connection
 */

import * as https from 'https';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;
const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
const fromEmail = process.env.GMAIL_FROM_EMAIL;

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║     DEBUG GMAIL OAUTH CONNECTION                       ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Configuration:');
console.log(`   Client ID: ${clientId?.substring(0, 20)}...`);
console.log(`   Client Secret: ${clientSecret?.substring(0, 10)}...`);
console.log(`   Refresh Token: ${refreshToken?.substring(0, 20)}...`);
console.log(`   From Email: ${fromEmail}`);

async function testBasicConnection() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 TEST 1: Basic HTTPS Connection to Google');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return new Promise((resolve) => {
    const req = https.get('https://www.googleapis.com', (res) => {
      console.log(`   ✅ Connected! Status: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (error) => {
      console.log(`   ❌ Connection failed: ${error.message}`);
      console.log('   👉 This indicates a network/firewall issue');
      resolve(false);
    });

    req.setTimeout(10000, () => {
      console.log('   ❌ Connection timeout');
      req.destroy();
      resolve(false);
    });
  });
}

async function testOAuthTokenRefresh() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 TEST 2: OAuth Token Refresh');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const OAuth2 = google.auth.OAuth2;
    const oauth2Client = new OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    console.log('   Requesting access token...');
    const accessToken = await oauth2Client.getAccessToken();
    
    if (accessToken.token) {
      console.log(`   ✅ Got access token: ${accessToken.token.substring(0, 30)}...`);
      return accessToken.token;
    } else {
      console.log('   ❌ No access token returned');
      return null;
    }
  } catch (error: any) {
    console.log(`   ❌ OAuth error: ${error.message}`);
    if (error.message.includes('ECONNRESET')) {
      console.log('   👉 Network connection was reset - check firewall/VPN');
    }
    return null;
  }
}

async function testSMTPConnection(accessToken: string | null) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 TEST 3: SMTP Connection');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!accessToken) {
    console.log('   ⚠️ Skipping - no access token');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: fromEmail,
        clientId,
        clientSecret,
        refreshToken,
        accessToken,
      },
    } as any);

    console.log('   Verifying SMTP connection...');
    await transporter.verify();
    console.log('   ✅ SMTP connection verified!');

    // Try sending a test email
    console.log('\n   Sending test email to yourself...');
    const result = await transporter.sendMail({
      from: `"Test" <${fromEmail}>`,
      to: fromEmail,
      subject: 'Test Email from AI Talent Management',
      text: 'If you receive this, Gmail OAuth is working!',
    });

    console.log(`   ✅ Email sent! Message ID: ${result.messageId}`);
  } catch (error: any) {
    console.log(`   ❌ SMTP error: ${error.message}`);
  }
}

async function testAlternativeSMTP() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 TEST 4: Alternative - Direct SMTP with App Password');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   If OAuth keeps failing, you can use Gmail App Password instead:');
  console.log('   1. Enable 2FA on your Google account');
  console.log('   2. Go to https://myaccount.google.com/apppasswords');
  console.log('   3. Generate an App Password for "Mail"');
  console.log('   4. Add to .env: GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx');
  console.log('   5. Update EmailService to use app password instead of OAuth');
}

async function main() {
  const basicOk = await testBasicConnection();
  
  if (!basicOk) {
    console.log('\n⚠️ Basic connection to Google failed!');
    console.log('   Possible causes:');
    console.log('   - VPN/Proxy blocking Google');
    console.log('   - Firewall rules');
    console.log('   - Network issues');
    console.log('   - Corporate network restrictions');
    testAlternativeSMTP();
    return;
  }

  const accessToken = await testOAuthTokenRefresh();
  await testSMTPConnection(accessToken);
  testAlternativeSMTP();

  console.log('\n');
}

main().catch(console.error);
