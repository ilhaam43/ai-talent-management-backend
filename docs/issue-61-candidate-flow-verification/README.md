# Issue #61: E2E Verification of Candidate Onboarding and Screening Flow

## 📋 Overview

Comprehensive verification of the entire candidate application flow to ensure it works correctly and securely from the backend perspective. This check verifies endpoints for authentication, CV parsing, candidate profile persistence, AI matching, job recommendations, and final job application.

**Issue**: #61 - test(qa): e2e verification of candidate onboarding and screening flow  
**Status**: ✅ Complete  
**Verification Date**: July 2026

## 📚 Documentation

### 1. [Implementation Plan](./IMPLEMENTATION_PLAN.md)
Complete verification plan with:
- Flow goals
- Verification strategy
- Endpoints under test
- Target assertions

### 2. [Walkthrough](./WALKTHROUGH.md)
Complete verification walkthrough with:
- Verified endpoints details
- Direct database verification queries
- Execution output log
- Troubleshooting & running instructions

## 🎯 Verification Coverage

### 1. Authentication Check
- **Signup**: `POST /auth/signup` to register a new user.
- **Login**: `POST /auth/login` to login and retrieve a JWT token.
- **Authorization**: `GET /auth/profile` with Bearer JWT token.
- **Security Guard**: `GET /auth/profile` without token rejected with HTTP `401 Unauthorized`.

### 2. CV Parse Check
- **Parse File**: `POST /cv-parser/parse-file` to upload and directly extract structured JSON from a PDF CV file.

### 3. Profile Store Check
- **Store Data**: `POST /candidate-profile/store-parsed-data` to persist candidate personal details, educations, work experiences, and skills.
- **DB Check**: Direct query assertions using Prisma to verify related records are successfully persisted in the database.

### 4. Analysis Trigger Check
- **Trigger Matching**: `POST /candidate-applications/analyze` to trigger the N8N AI workflow for matching the candidate against open jobs.

### 5. Job Recommendations Check
- **Retrieve Analysis**: `GET /analysis/:id` to retrieve recommendations and verify matches have `isTalentPool: true` set by default.

### 6. Apply Check
- **Apply for Vacancy**: `POST /candidate-applications` to submit a candidate application for an open vacancy.
- **DB Check**: Assert `isTalentPool` has updated from `true` to `false` for that application in the database.

## 🚀 How to Run the Verification Script

To run the complete automated candidate flow checks, execute the following command:

```bash
docker exec ai-talent-backend-app npx tsx scripts/verify-candidate-flow.ts
```

Alternatively, if running locally outside of Docker (with forwarded database port 5432):

```bash
npx tsx scripts/verify-candidate-flow.ts
```
