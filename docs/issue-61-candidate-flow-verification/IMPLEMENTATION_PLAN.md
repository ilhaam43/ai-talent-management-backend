# Implementation Plan: Candidate Application Flow Verification

## 📋 Goal Description

The goal of this task is to verify that the complete end-to-end candidate application flow works correctly and securely from the backend perspective. It covers the entire lifecycle of a candidate, starting from registering a user, uploading and parsing their CV, storing the extracted profile details, requesting AI matching/scoring, checking recommended job recommendations, and final job application.

---

## 📡 Endpoints Under Test

The following endpoints will be tested in order during the integration verification:

| Step | Endpoint | HTTP Method | Description |
| :--- | :--- | :--- | :--- |
| **1.1** | `/auth/signup` | `POST` | Registers a temporary test user and candidate profile. |
| **1.2** | `/auth/login` | `POST` | Validates credentials and returns JWT access token. |
| **1.3** | `/auth/profile` | `GET` | Verifies candidate profile details with valid JWT. |
| **1.4** | `/auth/profile` | `GET` | Security check: Verifies request without JWT is rejected. |
| **2.1** | `/cv-parser/parse-file` | `POST` | Direct multipart CV parsing (from PDF/Word CV). |
| **3.1** | `/candidate-profile/store-parsed-data` | `POST` | Saves structured CV details to DB candidate profile. |
| **4.1** | `/candidate-applications/analyze` | `POST` | Triggers N8N workflow to calculate matches against open jobs. |
| **5.1** | `/analysis/:id` | `GET` | Fetches match results and recommended jobs (`isTalentPool: true`). |
| **6.1** | `/candidate-applications` | `POST` | Submits candidate job application for a specific open vacancy. |

---

## 🔍 Database Assertions Plan

To guarantee correctness, the verification script uses direct Prisma Client queries to validate database updates:

1. **Step 3 (Profile Store)**:
   - Query candidate educations and check `educations.length > 0`.
   - Query candidate work experiences and check `workExperiences.length > 0`.
   - Query candidate skills and check `skills.length > 0`.

2. **Step 6 (Job Application)**:
   - Query `candidateApplication` for the given candidate and vacancy.
   - Verify `isTalentPool === false` to ensure they have been converted from recommendation status to active applicant status.

---

## 🛡️ Security Considerations

- Access tokens are passed as Bearer JWT tokens.
- Secure resources `/auth/profile`, `/cv-parser/parse-file`, `/candidate-profile/store-parsed-data`, `/candidate-applications/analyze`, and `/candidate-applications` must enforce valid JWT signatures.
- Invalid token request or requests missing Authorization headers must be rejected with HTTP `401 Unauthorized`.
