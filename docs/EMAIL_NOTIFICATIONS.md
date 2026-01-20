# Email Notifications Feature

## Overview

This feature adds email notifications for:
1. **Candidate Flow**: Automated emails when HR updates candidate pipeline status
2. **Talent Pool Conversion**: Welcome emails when converting talent pool candidates to active pipeline

## Email Templates

### 1. Pipeline Update Email
**Trigger**: When HR moves a candidate to a new stage (Qualified/On Progress status)

**Content**:
- Congratulations message
- Job title and company info
- Next stage information
- Interview schedule (if provided)
- Interview link (if provided)

### 2. Rejection Email
**Trigger**: When HR marks candidate as "Not Qualified"

**Content**:
- Professional rejection message
- Encouragement to apply for other positions
- Feedback notes (if provided by HR)

### 3. Talent Pool Welcome Email
**Trigger**: When converting talent pool candidate to active pipeline

**Content**:
- Welcome message
- Set password link (24-hour validity)
- Profile completion reminder
- Target interview stage information
- Job title (if available)

## Configuration

### Environment Variables

Add to `.env`:

```env
# Gmail OAuth (Option 1 - Production recommended)
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token

# Gmail App Password (Option 2 - Development/Simple)
GMAIL_APP_PASSWORD=your-16-char-password

# Gmail Sender Info
GMAIL_FROM_EMAIL=your-email@gmail.com
GMAIL_FROM_NAME=AI Talent Management
```

### Gmail OAuth Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable Gmail API

2. **Create OAuth Credentials**
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Add authorized redirect: `https://developers.google.com/oauthplayground`

3. **Get Refresh Token**
   - Go to [OAuth Playground](https://developers.google.com/oauthplayground)
   - Click settings (gear icon), check "Use your own OAuth credentials"
   - Enter Client ID and Secret
   - Select Gmail API v1 → `https://mail.google.com/`
   - Authorize and get refresh token

### Gmail App Password Setup (Simpler Alternative)

1. **Enable 2-Step Verification**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification if not already enabled

2. **Generate App Password**
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select App: Mail
   - Select Device: Windows Computer
   - Click Generate
   - Copy 16-character password (remove spaces)

3. **Add to `.env`**
   ```env
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   ```

## Usage

### Candidate Flow

When HR updates application status via API:

```bash
POST /candidate-applications/:id/status
{
  "applicationPipelineId": "uuid",
  "applicationPipelineStatusId": "uuid",
  "notes": "Great interview performance",
  "link": "https://meet.google.com/abc-def-ghi",
  "scheduledDate": "2026-01-25"
}
```

**Email sent when**:
- Status is "Qualified" or "On Progress" → Congrats email
- Status is "Not Qualified" → Rejection email

### Talent Pool Conversion

Convert talent pool candidate:

```bash
POST /talent-pool/convert/:candidateId
{
  "targetPipelineStage": "HR Interview"  # or "User Interview" | "Online Assessment"
}
```

**Response includes**:
```json
{
  "success": true,
  "resetToken": "abc123...",
  "resetLink": "http://localhost:3001/set-password?token=abc123...",
  "message": "Candidate converted to HR Interview. Password setup email sent."
}
```

## Qualified Candidates Filter

New method to filter candidates by AI match status:

```typescript
// In CandidateApplicationsService
await findAllByQualification({
  qualified: true,     // MATCH or STRONG_MATCH
  jobVacancyId: "uuid",
  search: "John Doe"
})
```

## Testing

### Test Email Connection

```bash
npx tsx scripts/debug-gmail-oauth.ts
```

### Test Talent Pool Conversion

```bash
npx tsx scripts/test-talent-pool-conversion.ts
```

### Reset Test Data

```bash
npx tsx scripts/reset-talent-pool.ts
```

## Troubleshooting

### ECONNRESET Error

If you get `read ECONNRESET` error:
- **Network/Firewall blocking SMTP**: Switch to App Password method
- **VPN Issues**: Disable VPN or use App Password
- **Corporate Network**: Use App Password (simpler, bypasses OAuth SMTP)

### Email Not Sent

Check server logs for:
```
[EmailService] Using Gmail App Password authentication
```
or
```
[EmailService] Using Gmail OAuth2 authentication
```

### Token Expired

OAuth tokens expire. Regenerate refresh token at OAuth Playground.

## Architecture

```
┌─────────────────────┐
│  HR Dashboard       │
│  (Frontend)         │
└──────┬──────────────┘
       │ POST /candidate-applications/:id/status
       ▼
┌─────────────────────┐
│  API Controller     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Service Layer      │
│  - Update DB        │
│  - Determine Status │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐      ┌──────────────┐
│  EmailService       │─────▶│  Gmail API   │
│  - Build Template   │      │  (OAuth/App) │
│  - Send Email       │      └──────────────┘
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Candidate Inbox    │
└─────────────────────┘
```

## Files Changed

- `src/email/email.service.ts` - New email service
- `src/email/email.module.ts` - Email module
- `src/candidate-applications/candidate-applications.service.ts` - Email integration
- `src/candidate-applications/candidate-applications.module.ts` - Import EmailModule
- `src/talent-pool/talent-pool.service.ts` - Welcome email on conversion
- `src/talent-pool/talent-pool.module.ts` - Import EmailModule
- `.env.example` - Environment variables template
- `scripts/test-talent-pool-conversion.ts` - Test script
- `scripts/debug-gmail-oauth.ts` - Debug script
- `scripts/reset-talent-pool.ts` - Reset test data

## Next Steps

- [ ] Add email templates customization via admin panel
- [ ] Implement email queue for better reliability
- [ ] Add email delivery tracking
- [ ] Support multiple languages
- [ ] Add SMS notifications option
