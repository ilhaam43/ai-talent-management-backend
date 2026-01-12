
# Implementation Plan - Issue #15: AI Candidate Analysis Integration

## Goal Description
Integrate an AI-powered candidate analysis service using n8n and an LLM (e.g., OpenAI/Llama) to evaluate candidates against job vacancies. The results (Fit Score, Core Value Analysis, Interview Questions) must be stored in the database.

## Proposed Changes

### Database Schema (Prisma)
#### [MODIFY] [schema.prisma](file:///prisma/schema.prisma)
*   Update `CandidateApplication` model:
    *   `fitScore`: Decimal(5,2)
    *   `aiInsight`: Text (Markdown)
    *   `aiInterview`: Text (Markdown) - New
    *   `aiCoreValue`: Text (Markdown) - New

### Backend Services
#### [NEW] [JobVacanciesModule](file:///src/job-vacancies/job-vacancies.module.ts)
*   **Controller**: `POST /job-vacancies/match`
    *   Receives `criteria` (divisions, employmentType).
    *   Returns list of matching `JobVacancy` objects for the AI to analyze.
*   **Service**:
    *   Queries `JobVacancy` with Prisma.
    *   Filters by status 'OPEN'.

#### [NEW] [CandidateApplicationsModule](file:///src/candidate-applications/candidate-applications.module.ts)
*   **Controller**: `POST /candidate-applications/:id/analyze`
*   **Service**:
    *   `triggerAiAnalysis(applicationId)`:
        1.  Fetch application + candidate data (Skills, Experience, CV Text).
        2.  **Redundancy Check**: If `fitScore` exists, return cached data.
        3.  Construct Payload: `applicant_id`, `candidate` (flattened), `criteria`.
        4.  Call n8n Webhook (`N8N_WEBHOOK_URL`).
        5.  Receive Response (Sync): Parse `results` array.
        6.  Update `CandidateApplication` in DB.
        7.  Log execution duration.

### Scripting
*   `scripts/seed-jobs.ts`: Populates dummy job vacancies.
*   `scripts/trigger-n8n.ts`: E2E test script to create application node and trigger analysis.

## Verification Plan

### Automated Tests
*   Run `npx ts-node --transpile-only scripts/trigger-n8n.ts`
    *   **Success**: Logs "AI Analysis completed" and updates DB.
    *   **Redundancy**: Second run logs "Analysis already exists".

### Manual Verification
*   Check n8n Workflow executions.
*   Verify DB records using Prisma Studio.
