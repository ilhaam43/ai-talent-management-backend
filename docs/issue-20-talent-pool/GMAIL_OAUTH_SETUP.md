# Gmail OAuth Setup Guide

## Overview

This guide covers setting up Gmail OAuth for sending emails in AI Talent Management. The system supports two methods:
1. **App Password** (Recommended for development)
2. **OAuth2** (Recommended for production)

---

## Option 1: Gmail App Password (Simple)

Best for development and testing. Avoids OAuth complexity.

### Step 1: Enable 2-Step Verification

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click **2-Step Verification**
3. Follow the setup wizard
4. Complete verification

### Step 2: Generate App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select **App**: Mail
3. Select **Device**: Windows Computer (or your device)
4. Click **Generate**
5. Copy the 16-character password (e.g., `xxxx xxxx xxxx xxxx`)

### Step 3: Add to .env

```env
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx  # Remove spaces
GMAIL_FROM_EMAIL=your-email@gmail.com
GMAIL_FROM_NAME=AI Talent Management
```

### Step 4: Restart Server

```bash
npm start
```

The EmailService will automatically use App Password when `GMAIL_APP_PASSWORD` is set.

---

## Option 2: Gmail OAuth2 (Production)

More secure, but requires more setup.

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a Project** → **New Project**
3. Enter project name (e.g., `AI Talent Management`)
4. Click **Create**

### Step 2: Enable Gmail API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Gmail API** → **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Fill in required fields:
   - App name: `AI Talent Management`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**
5. Add scopes: `https://mail.google.com/`
6. Add test users (your email)
7. Click **Save and Continue**

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `AI Talent Management`
5. Authorized redirect URIs: Add `https://developers.google.com/oauthplayground`
6. Click **Create**
7. **Copy Client ID and Client Secret**

### Step 5: Get Refresh Token

1. Go to [OAuth Playground](https://developers.google.com/oauthplayground)
2. Click settings (gear icon) in top right
3. Check **Use your own OAuth credentials**
4. Enter your Client ID and Client Secret
5. Close settings
6. In left panel, find **Gmail API v1**
7. Select `https://mail.google.com/`
8. Click **Authorize APIs**
9. Sign in with your Google account
10. Click **Allow**
11. Click **Exchange authorization code for tokens**
12. **Copy the Refresh Token**

### Step 6: Add to .env

```env
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-xxxxxxxx
GMAIL_REFRESH_TOKEN=1//xxxxxxxx
GMAIL_FROM_EMAIL=your-email@gmail.com
GMAIL_FROM_NAME=AI Talent Management
```

---

## Troubleshooting

### ECONNRESET Error

**Problem**: `read ECONNRESET` when sending emails

**Causes**:
- Firewall blocking SMTP (port 587)
- VPN/Proxy interference
- Corporate network restrictions

**Solution**: Use App Password method instead of OAuth

### Token Expired

**Problem**: OAuth refresh token stopped working

**Solution**: 
1. Go to OAuth Playground
2. Re-authorize with your credentials
3. Get new refresh token
4. Update `.env`

### No API Activity in Console

**Problem**: Google Cloud Console shows no API calls

**Solution**: This means requests aren't reaching Google. Check:
- Network connectivity
- Firewall rules
- VPN settings

### Test Email Connection

Run the debug script:
```bash
npx tsx scripts/debug-gmail-oauth.ts
```

This will test:
1. Basic HTTPS connection to Google
2. OAuth token refresh
3. SMTP connection
4. Test email sending

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GMAIL_APP_PASSWORD` | * | 16-char App Password |
| `GMAIL_CLIENT_ID` | ** | OAuth Client ID |
| `GMAIL_CLIENT_SECRET` | ** | OAuth Client Secret |
| `GMAIL_REFRESH_TOKEN` | ** | OAuth Refresh Token |
| `GMAIL_FROM_EMAIL` | Yes | Sender email address |
| `GMAIL_FROM_NAME` | No | Sender display name |

\* Required if using App Password method  
\** Required if using OAuth method

---

## Security Notes

1. **Never commit `.env`** - Add to `.gitignore`
2. **Use App Password for dev** - Easier to rotate if leaked
3. **OAuth for production** - More secure token management
4. **Rotate tokens regularly** - Especially after team changes
