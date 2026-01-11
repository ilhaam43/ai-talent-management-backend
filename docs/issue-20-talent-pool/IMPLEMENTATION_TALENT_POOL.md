# Implementation Plan - Issue #20: Talent Pool (HR Bulk CV Upload)

## Goal Description

Enable HR to upload CVs in bulk from their data bank, extract candidate information via n8n PDF extraction, screen against **all OPEN jobs**, and store results in a separate `TalentPool` table for HR to review and take action.

---

## Proposed Changes

### Database Schema (Prisma)

#### [NEW] Tables in [schema.prisma](file:///prisma/schema.prisma)

| Table | Purpose |
|-------|---------|
| `TalentPoolBatch` | Tracks upload batches (uploader, status, progress) |
| `TalentPoolQueue` | Queue items for batch processing (10 CV per batch) |
| `TalentPoolCandidate` | Extracted CV data (stored as JSON for flexibility) |
| `TalentPoolScreening` | AI screening results per candidate × job |

#### Enums Added:
- `TalentPoolSourceType`: MANUAL_UPLOAD, GOOGLE_DRIVE, ONEDRIVE
- `TalentPoolBatchStatus`: PENDING, QUEUED, PROCESSING, COMPLETED, PARTIALLY_FAILED, FAILED
- `TalentPoolQueueStatus`: PENDING, PROCESSING, COMPLETED, FAILED, DUPLICATE
- `TalentPoolHRStatus`: PENDING, REVIEWED, SHORTLISTED, PROCESSED, REJECTED

---

### Backend Module

#### [NEW] [TalentPoolModule](file:///src/talent-pool/talent-pool.module.ts)

**Files Created:**
- `talent-pool.module.ts`
- `talent-pool.controller.ts`
- `talent-pool.service.ts`
- `talent-pool.repository.ts`
- `dto/upload.dto.ts`
- `dto/callback.dto.ts`
- `dto/update-status.dto.ts`

---

### API Endpoints

| Method | Endpoint | RBAC | Purpose |
|--------|----------|------|---------|
| POST | `/talent-pool/upload` | HR, ADMIN | Upload bulk CVs (max 50) |
| POST | `/talent-pool/callback` | Internal | n8n sends parsed results |
| GET | `/talent-pool/batches` | HR, ADMIN | List upload batches |
| GET | `/talent-pool/batches/:id` | HR, ADMIN | Poll batch progress |
| GET | `/talent-pool` | HR, ADMIN | List candidates (filter by job, score) |
| GET | `/talent-pool/:id` | HR, ADMIN | Single candidate details |
| PATCH | `/talent-pool/:id/status` | HR, ADMIN | Update HR status |
| POST | `/talent-pool/batch-action` | HR, ADMIN | Bulk process candidates |
| GET | `/talent-pool/jobs/open` | HR, ADMIN | Get open jobs for filtering |

---

### n8n Workflow (Separate from Candidate Flow)

**Trigger**: Webhook (POST)

**Payload from Backend:**
```json
{
  "queueItems": [{
    "queueItemId": "uuid",
    "batchId": "uuid",
    "fileUrl": "/uploads/talent-pool/xxx.pdf",
    "fileName": "original.pdf"
  }]
}
```

**Workflow Steps:**
1. Loop through queue items
2. Extract PDF for each file
3. Parse CV data using Information Extractor
4. Get ALL open jobs from backend
5. Run Multi-Job HR Expert for each candidate
6. POST results to `/talent-pool/callback`

**Callback Payload:**
```json
{
  "batchId": "uuid",
  "queueItemId": "uuid",
  "success": true,
  "candidateData": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "education": [...],
    "workExperience": [...],
    "skills": [...],
    "screenings": [{
      "jobVacancyId": "uuid",
      "fitScore": 85.0,
      "aiMatchStatus": "STRONG_MATCH",
      "aiInsight": "markdown"
    }]
  }
}
```

---

### Key Features

1. **Queue-Based Processing**: 10 CVs per batch to prevent timeout
2. **Duplicate Detection**: Email-based, prevents re-screening same job
3. **Progress Tracking**: Poll `/talent-pool/batches/:id` for real-time status
4. **Filter by Job**: Query candidates by specific job + minimum score
5. **HR Actions**: Update status, add notes, bulk process to next step

---

## Future Improvements

### Phase 2: Google Drive / OneDrive Integration
- [ ] OAuth authentication for Google Drive
- [ ] OAuth authentication for OneDrive
- [ ] Automatic file listing from shared folder
- [ ] Scheduled sync for new uploads

### Phase 3: Convert to Candidate
- [ ] "Convert to Candidate" action that creates real Candidate record
- [ ] Pre-fill profile from Talent Pool data
- [ ] Link application history

### Phase 4: Email Notifications
- [ ] Send email to high-scoring candidates
- [ ] Email templates for different statuses
- [ ] Track email delivery and opens

### Phase 5: Advanced Analytics
- [ ] Dashboard showing talent pool health
- [ ] Skill gap analysis across candidates
- [ ] Trend reporting by source

---

## Environment Variables

```env
N8N_TALENT_POOL_WEBHOOK_URL=https://your-n8n/webhook/talent-pool
```

---

## Verification Plan

### Automated Tests
```bash
# Test upload flow
curl -X POST http://localhost:3000/talent-pool/upload \
  -H "Authorization: Bearer <HR_TOKEN>" \
  -F "files=@cv1.pdf" \
  -F "sourceType=MANUAL_UPLOAD"

# Check batch progress
curl http://localhost:3000/talent-pool/batches/<batchId>

# List candidates with filters
curl "http://localhost:3000/talent-pool?minScore=65&jobVacancyId=<id>"
```

### Manual Verification
1. HR logs in → uploads 5 PDFs → checks batch status
2. n8n processes → callback received → candidates appear in list
3. HR selects candidates → processes to "Online Test"
