# Walkthrough - Talent Pool (HR Bulk CV Upload)

## Feature Overview

The Talent Pool enables HR to:
1. Upload CVs in bulk (PDF files)
2. AI screens candidates against ALL open jobs
3. View candidates with fit scores
4. Take action on high-scoring candidates

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       HR UPLOAD FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│  1. HR uploads PDFs (max 50 per batch)                           │
│  2. Backend stores files → Creates batch + queue                 │
│  3. Queue processor sends 10 CVs to n8n                          │
│  4. n8n extracts PDF → Parses CV → Gets ALL jobs                 │
│  5. n8n runs HR Agent → Scores each job                          │
│  6. n8n POSTs results to /talent-pool/callback                   │
│  7. Backend saves candidate + screenings                         │
│  8. Repeat until all CVs processed                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HR REVIEW FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│  1. View Talent Pool list (sorted by fit score)                  │
│  2. Filter by job, minimum score, status                         │
│  3. Select candidates → Process to next step                     │
│  4. Add notes, update status                                     │
│  5. (Future) Send email to candidates                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Upload & Process

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/talent-pool/upload` | Upload CVs (multipart/form-data) |
| GET | `/talent-pool/batches` | List all batches |
| GET | `/talent-pool/batches/:id` | Poll batch progress |

### Candidate Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/talent-pool` | List candidates with filters |
| GET | `/talent-pool/:id` | Get single candidate |
| PATCH | `/talent-pool/:id/status` | Update HR status |
| POST | `/talent-pool/batch-action` | Bulk update candidates |

---

## Database Tables

### TalentPoolBatch
Tracks each upload:
- `totalFiles`: Number of CVs uploaded
- `processedFiles`: Successfully processed
- `failedFiles`: Failed to process
- `status`: PENDING → QUEUED → PROCESSING → COMPLETED

### TalentPoolQueue
Individual files in queue:
- `fileUrl`: Path to PDF
- `status`: PENDING → PROCESSING → COMPLETED/FAILED/DUPLICATE

### TalentPoolCandidate
Extracted CV data:
- `fullName`, `email`, `phone`
- `educationData`: JSON array
- `workExperienceData`: JSON array
- `skillsData`: JSON array
- `hrStatus`: HR review status

### TalentPoolScreening
AI results per job:
- `fitScore`: 0-100
- `aiMatchStatus`: STRONG_MATCH, MATCH, NOT_MATCH
- `aiInsight`: Detailed analysis

---

## How to Test

### 1. Prerequisites
- Add `N8N_TALENT_POOL_WEBHOOK_URL` to `.env`
- Create `uploads/talent-pool` folder
- n8n Talent Pool workflow active

### 2. Upload CVs
```bash
curl -X POST http://localhost:3000/talent-pool/upload \
  -H "Authorization: Bearer <HR_TOKEN>" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@cv1.pdf" \
  -F "files=@cv2.pdf" \
  -F "sourceType=MANUAL_UPLOAD" \
  -F "batchName=January Batch"
```

**Response:**
```json
{
  "batch": {
    "id": "uuid",
    "totalFiles": 2,
    "status": "QUEUED"
  },
  "message": "2 files queued for processing. Check batch status for progress."
}
```

### 3. Poll Progress
```bash
curl http://localhost:3000/talent-pool/batches/<batchId>
```

**Response:**
```json
{
  "id": "uuid",
  "totalFiles": 2,
  "processedFiles": 1,
  "failedFiles": 0,
  "status": "PROCESSING"
}
```

### 4. View Candidates
```bash
curl "http://localhost:3000/talent-pool?minScore=65"
```

---

## n8n Workflow Setup

### Trigger: Webhook
- Method: POST
- Path: `/talent-pool`

### Extract PDF (Loop)
For each queue item:
```javascript
// Code node to prepare files
for (let item of items) {
  // Process each file
}
```

### Information Extractor
Schema includes:
- fullName, email, phone
- education[] (institution, degree, dates)
- workExperience[] (company, position, dates)
- skills[]
- certifications[]

### Get All Open Jobs
HTTP Request to backend:
```
GET /job-vacancies?status=OPEN
```

### Multi-Job HR Expert
For each job, evaluate candidate against:
- Job requirements
- Skills match
- Experience relevance
- Return scores ≥ 65 or MATCH status

### Send Callback
POST to `/talent-pool/callback`:
```json
{
  "batchId": "...",
  "queueItemId": "...",
  "success": true,
  "candidateData": {...}
}
```

---

## Duplicate Detection

The system prevents duplicate screenings:

1. **Same email exists?**
   - Check if candidate already in Talent Pool
   
2. **Same job already screened?**
   - Skip that job, only add new jobs
   
3. **Mark as DUPLICATE**
   - Queue item marked, but counted as success
