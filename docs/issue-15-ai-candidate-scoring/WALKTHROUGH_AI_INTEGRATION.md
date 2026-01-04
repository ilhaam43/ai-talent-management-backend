
# Walkthrough - Issue #15: AI Candidate Analysis Integration

## Feature Overview
This feature enables automated AI scoring of candidates. When triggered, the system sends candidate data to n8n, which uses an LLM to evaluate the candidate against open job positions based on:
1.  **Relevance Experience (40%)**
2.  **Skills & Tools (30%)**
3.  **Education (10%)**
4.  **Core Value Fit (20%)** - ICARE Values (Innovation, Collaboration, Agility, Resilience, Ethics)

## Architecture Flow
1.  **Trigger**: API `POST /candidate-applications/:id/analyze`
2.  **Backend**: Fetches data -> Checks Cache -> Calls n8n Webhook.
3.  **n8n Workflow**:
    *   Receives Candidate Data.
    *   Fetches Matching Jobs from Backend (`POST /job-vacancies/match`).
    *   LLM Analysis (Prompt Engineering).
    *   Returns JSON Response.
4.  **Backend**: Updates `CandidateApplication` with scores and insights.

## How to Test

### 1. Prerequisites
*   `.env` must have `N8N_WEBHOOK_URL`.
*   Database running and migrated.
*   n8n Workflow active.

### 2. Seed Data
Run the seeder to create dummy job vacancies:
```bash
npx ts-node --transpile-only scripts/seed-jobs.ts
```

### 3. Run Analysis
Execute the trigger script which creates a candidate application and calls the analyze endpoint:
```bash
npx ts-node --transpile-only scripts/trigger-n8n.ts
```

**Expected Output:**
```
[CandidateApplicationsService] Triggering AI Analysis for application: ...
[CandidateApplicationsService] Sending payload to n8n: ...
[CandidateApplicationsService] n8n Response: ...
[CandidateApplicationsService] AI Analysis completed in 3500ms
```

### 4. Verify Redundancy (Caching)
Run the script again immediately:
**Expected Output:**
```
[CandidateApplicationsService] Analysis already exists for application ... Skipping n8n trigger.
```

### 5. Check Database
You can inspect the results in the database:
```sql
SELECT "fit_score", "ai_insight", "ai_core_value" FROM "CandidateApplication";
```
