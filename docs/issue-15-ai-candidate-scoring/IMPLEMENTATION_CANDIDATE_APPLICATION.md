# Implementation Plan - Issue #15 Extended: Candidate Application API with Scheduling

## Goal Description

Extend the existing AI candidate scoring to include a complete candidate application flow with:
1. Candidate self-service job application
2. CV parsing and auto-population
3. AI analysis against selected job tracks
4. Interview scheduling (future phase)

---

## Proposed Changes

### Database Schema (Prisma)

#### [MODIFY] [schema.prisma](file:///prisma/schema.prisma)
- `CandidateApplication` model:
  - `fitScore`: Decimal(5,2) - AI fit score
  - `aiInsight`: Text - AI analysis summary
  - `aiInterview`: Text - Interview questions
  - `aiCoreValue`: Text - Core value alignment
  - `aiMatchStatus`: Enum (STRONG_MATCH, MATCH, NOT_MATCH)
  - `submissionDate`: Date
  - Links to `JobVacancy`, `Candidate`, `ApplicationPipeline`, `ApplicationLastStatus`

---

### Backend Services

#### [MODIFY] [CandidateApplicationsModule](file:///src/candidate-applications/candidate-applications.module.ts)

**Controller Endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/candidate-applications` | Create new application |
| GET | `/candidate-applications` | List applications (with filters) |
| GET | `/candidate-applications/:id` | Get single application |
| POST | `/candidate-applications/:id/analyze` | Trigger AI analysis |
| POST | `/candidate-applications/trigger-ai-analysis` | Trigger AI for current user's application |
| PATCH | `/candidate-applications/:id/status` | Update status (HR only) |
| POST | `/candidate-applications/:id/pipeline` | Update pipeline stage (HR only) |
| GET | `/candidate-applications/:id/pipeline-history` | Get pipeline history |
| GET | `/candidate-applications/:id/recruitment-process` | Get full process for candidate |

**Service Methods:**
- `createApplication()` - Creates application with salary info
- `triggerAiAnalysis()` - Sends to n8n, receives scores
- `updateApplicationStatus()` - Changes status
- `updateApplicationPipeline()` - Moves to next stage

---

### CV Parser Integration

#### [MODIFY] [cv-parser.service.ts](file:///src/cv-parser/cv-parser.service.ts)
- `parseAndSave()` - Parse CV and auto-save to candidate profile
- Uses LLM (Google Gemini) for intelligent extraction
- Extracts: Education, Work Experience, Skills, Certifications, Organizations

---

### n8n Workflow

**Webhook Trigger**: `POST /webhook/ai-analysis`

**Payload:**
```json
{
  "applicant_id": "uuid",
  "candidate": {
    "fullName": "string",
    "education": [],
    "workExperience": [],
    "skills": []
  },
  "track_selection": [{
    "trackId": "uuid",
    "trackName": "string"
  }]
}
```

**Response:**
```json
{
  "results": [{
    "position_ID": "uuid",
    "position_name": "string",
    "fit_score": 85.5,
    "ai_match_status": "STRONG_MATCH",
    "ai_insight": "markdown",
    "ai_interview": "markdown",
    "ai_core_value": "markdown"
  }]
}
```

---

## Future Improvements

### Phase 2: Interview Scheduling
- [ ] Calendar integration for interview slots
- [ ] Automated email notifications
- [ ] Interviewer assignment
- [ ] Video call link generation

### Phase 3: Advanced Analytics
- [ ] Dashboard for HR with conversion rates
- [ ] AI-powered candidate ranking
- [ ] Bulk interview scheduling

---

## Verification Plan

### Automated Tests
```bash
npx ts-node --transpile-only scripts/test-full-integration.ts
```

**Test Flow:**
1. Register/login candidate
2. Upload and parse CV
3. Update profile with parsed data
4. Apply for DevOps Engineer position
5. Trigger AI analysis
6. Verify database results

### Manual Verification
- Check Swagger docs at `/api/docs`
- Verify n8n execution logs
- Check `candidate_applications` table in DB
