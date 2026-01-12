# Walkthrough - Candidate Application Flow

## Feature Overview

This feature enables candidates to apply for jobs with AI-powered screening:
1. **Self-Service Application**: Candidate uploads CV and applies to jobs
2. **Auto CV Parsing**: LLM extracts education, skills, experience
3. **AI Scoring**: n8n workflow evaluates candidate against job requirements
4. **Status Tracking**: HR manages application pipeline

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      CANDIDATE FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│  1. Register/Login                                               │
│  2. Upload CV → Parse → Auto-populate profile                    │
│  3. Browse open jobs                                             │
│  4. Apply to job (with salary expectation)                       │
│  5. System triggers n8n AI analysis                              │
│  6. Receive AI score and match status                            │
│  7. View application status in dashboard                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        HR FLOW                                   │
├─────────────────────────────────────────────────────────────────┤
│  1. View applications with AI scores                             │
│  2. Filter by fit score, status, job                             │
│  3. Update application status (Qualified/Not Qualified)          │
│  4. Move to pipeline stage (Interview, Online Test, etc.)        │
│  5. Schedule interviews (future)                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### For Candidates

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/candidate-applications` | Create application |
| GET | `/candidate-applications/:id/recruitment-process` | View my application |
| POST | `/candidate-applications/trigger-ai-analysis` | Trigger AI for my application |

### For HR

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/candidate-applications` | List all applications |
| PATCH | `/candidate-applications/:id/status` | Update status |
| POST | `/candidate-applications/:id/pipeline` | Update pipeline |
| GET | `/candidate-applications/:id/pipeline-history` | View history |

---

## How to Test

### 1. Prerequisites
- `.env` with `N8N_WEBHOOK_URL`
- Database running with seeded data
- n8n Workflow active

### 2. Run Integration Test
```bash
npx ts-node --transpile-only scripts/test-full-integration.ts
```

### 3. Expected Output
```
📋 CANDIDATE SELF-SERVICE FLOW
✅ STEP 1: Register - Email: test@example.com
✅ STEP 2: Login - Token received
✅ STEP 3: Upload CV - Parsed successfully
✅ STEP 4: Update Profile - 3 education, 3 work exp, 12 skills
✅ STEP 5: Apply for Job - DevOps Engineer
📊 AI Match: MATCH, Fit Score: 78
```

### 4. Check Database
```sql
SELECT 
  c.candidate_name,
  j.job_role_id,
  ca.fit_score,
  ca.ai_match_status,
  als.application_last_status
FROM candidate_applications ca
JOIN candidates c ON ca.candidate_id = c.id
JOIN job_vacancies j ON ca.job_vacancy_id = j.id
JOIN application_last_statuses als ON ca.application_latest_status_id = als.id;
```

---

## CV Parsing Details

The CV parser extracts:
- **Personal Info**: Name, Email, Phone, LinkedIn
- **Education**: Institution, Degree, Major, GPA, Dates
- **Work Experience**: Company, Position, Dates, Description
- **Skills**: Technical and soft skills
- **Certifications**: Name, Issuer, Date
- **Organizations**: Name, Role, Dates

---

## n8n Workflow Structure

```
Webhook Trigger → Get Candidate Data → Get Matching Jobs → HR Agent (OpenAI) → Respond to Webhook
```

The HR Agent evaluates:
1. **Experience Relevance (40%)**: Match with job requirements
2. **Skills & Tools (30%)**: Technical alignment
3. **Education (10%)**: Qualification match
4. **Core Values (20%)**: Company culture fit (ICARE)
