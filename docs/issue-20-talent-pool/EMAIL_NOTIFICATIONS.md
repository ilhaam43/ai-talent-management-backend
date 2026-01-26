# Email Notifications - Talent Pool & Candidate Flow

## Overview

Email notifications are sent automatically when:
1. **Talent Pool Conversion** - Candidate converted to active pipeline
2. **Pipeline Status Update** - HR moves candidate to new stage
3. **Rejection** - Candidate marked as "Not Qualified"

---

## Email Templates

### 1. Talent Pool Welcome Email

**Trigger**: `POST /talent-pool/convert/:id`

**Content**:
- Welcome message
- Password reset link (24-hour validity)
- Profile completion reminder
- Target stage (HR Interview/User Interview/Online Assessment)
- Job title (if available)

**Template Location**: `src/email/email.service.ts` → `getTalentPoolWelcomeTemplate()`

### 2. Pipeline Update Email

**Trigger**: `updateApplicationStatus()` with status "Qualified" or "On Progress"

**Content**:
- Congratulations message
- Job title and company
- Next stage information
- Interview schedule (if provided)
- Interview link (if provided)

**Template Location**: `src/email/email.service.ts` → `getPipelineUpdateTemplate()`

### 3. Rejection Email

**Trigger**: `updateApplicationStatus()` with status "Not Qualified"

**Content**:
- Professional rejection message
- Encouragement to apply for other positions
- Feedback notes (if provided by HR)

**Template Location**: `src/email/email.service.ts` → `getRejectionTemplate()`

---

## API Integration

### Talent Pool Conversion

```bash
POST /talent-pool/convert/:candidateId
Authorization: Bearer <HR_TOKEN>
Content-Type: application/json

{
  "targetPipelineStage": "HR Interview"
}
```

**Response**:
```json
{
  "success": true,
  "resetToken": "abc123...",
  "resetLink": "http://localhost:3001/set-password?token=abc123...",
  "message": "Candidate converted to HR Interview. Password setup email sent."
}
```

### Pipeline Status Update

```bash
PATCH /candidate-applications/:id/status
Authorization: Bearer <HR_TOKEN>
Content-Type: application/json

{
  "applicationPipelineId": "uuid",
  "applicationPipelineStatusId": "uuid",
  "notes": "Great interview!",
  "link": "https://meet.google.com/abc-def",
  "scheduledDate": "2026-01-25"
}
```

**Email Logic**:
- Status "Qualified" or "On Progress" → Pipeline update email
- Status "Not Qualified" → Rejection email

---

## Configuration

### Required Environment Variables

```env
# App Password Method (Recommended)
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
GMAIL_FROM_EMAIL=your-email@gmail.com
GMAIL_FROM_NAME=AI Talent Management

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3001
```

### Files Modified

| File | Changes |
|------|---------|
| `src/email/email.service.ts` | New service with 3 email templates |
| `src/email/email.module.ts` | Email module definition |
| `src/candidate-applications/candidate-applications.service.ts` | Email integration |
| `src/candidate-applications/candidate-applications.module.ts` | Import EmailModule |
| `src/talent-pool/talent-pool.service.ts` | Welcome email on conversion |
| `src/talent-pool/talent-pool.module.ts` | Import EmailModule |

---

## Testing

### Test Email Connection

```bash
npx tsx scripts/debug-gmail-oauth.ts
```

### Test Talent Pool Conversion

```bash
npx tsx scripts/test-talent-pool-conversion.ts
```

This script:
1. Logs in as HR
2. Finds talent pool candidates
3. Converts selected candidate to HR Interview
4. Verifies email was sent

### Reset Test Data

```bash
npx tsx scripts/reset-talent-pool.ts
```

Resets `isTalentPool=true` for Adam and Ilham for re-testing.

---

## Qualified Candidates Filter

New method to filter by AI match status:

```typescript
// Service method
await candidateApplicationsService.findAllByQualification({
  qualified: true,     // MATCH or STRONG_MATCH
  jobVacancyId: "uuid",
  search: "John"
});
```

**Filter Logic**:
- `qualified: true` → aiMatchStatus IN ('MATCH', 'STRONG_MATCH')
- `qualified: false` → aiMatchStatus = 'NOT_MATCH'

---

## Error Handling

Email errors are logged but don't block the main flow:

```typescript
try {
  await emailService.sendPipelineUpdateEmail(...);
  this.logger.log(`Email sent to ${email}`);
} catch (error) {
  this.logger.error(`Failed to send email: ${error.message}`);
  // Don't throw - application is already updated
}
```

This ensures database updates succeed even if email fails.

---

## Next Steps (Future)

- [ ] Email queue for reliability
- [ ] Custom email templates via admin panel
- [ ] Email delivery tracking
- [ ] Multi-language support
- [ ] SMS notifications option
