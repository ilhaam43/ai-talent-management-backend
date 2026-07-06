# Walkthrough: Candidate Application Flow Verification

We have successfully executed the verification steps and verified that the entire candidate application flow functions correctly and securely on the backend.

---

## 🚀 How to Run the Verification Script

Run the automated integration checks inside the running NestJS application container:

```bash
docker exec ai-talent-backend-app npx tsx scripts/verify-candidate-flow.ts
```

---

## 📝 Step-by-Step Walkthrough & Assertions

### Step 0: Cleanup
- Before each test run, the script searches for any existing user with email `temp-candidate-verification@example.com` and deletes related database records (cascaded deletions respect foreign key constraints on candidate educations, experience, documents, applications, etc.).

### Step 1: Authentication Check
- **Endpoint**: `POST /auth/signup` and `POST /auth/login`
- **Security Check**: Requesting `/auth/profile` without JWT token is rejected with HTTP `401 Unauthorized`. Requesting with Bearer JWT token retrieves user details.

### Step 2: CV Parsing Check
- **Endpoint**: `POST /cv-parser/parse-file`
- **Action**: Uploads the test PDF CV `test-files/Muhammad-Reza-Azhar-Priyadi-Resume.pdf`.
- **Assertion**: Verifies that parser successfully returns candidate's personalInfo, skills list, work experiences, and education logs.

### Step 3: Profile Storing Check
- **Endpoint**: `/candidate-profile/store-parsed-data`
- **Action**: Posts the extracted CV data.
- **Assertion**: Script queries Prisma client to verify that database tables for educations, work experiences, and skills are populated for this candidate.

### Step 4: AI Analysis Match Trigger Check
- **Endpoint**: `POST /candidate-applications/analyze`
- **Action**: Triggers N8N webhook calculations with selected career tracks (`["Cloud", "Cybersecurity"]`).
- **Assertion**: Receives open job recommendations from N8N matching the candidate's tracks.

### Step 5: Recommendations Check
- **Endpoint**: `GET /analysis/:id`
- **Assertion**: Checks that recommended applications are returned with status `isTalentPool: true` by default.

### Step 6: Application Submission Check
- **Endpoint**: `POST /candidate-applications`
- **Action**: Applies for one of the matched vacancy IDs.
- **Assertion**: Checks database to verify that `isTalentPool` is updated to `false` for this application, transforming the recommendation into an active candidate application.

---

## 📡 Verified Output Log

Below is the verified clean stdout logs of the integration check run:

```text
=== STARTING CANDIDATE FLOW VERIFICATION ===
[CLEANUP] Checking for existing test user...
[CLEANUP] Found existing test user: d3d2c85f-b0a8-47a1-aaeb-42701534358b
[CLEANUP] Deleting candidate data for candidate ID: 5bcb71b7-80be-417f-9b39-2b2f50cb3319...
[CLEANUP] Cleanup complete.
[CHECK 1] Auth Check
[CHECK 1] Registering new user...
[PASS] User signup successful
[INFO] Candidate ID: 15c6082e-dc18-40bb-bcb3-8cb697fc5d3b
[CHECK 1] Logging in...
[PASS] User login successful
[INFO] Access Token: eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...
[CHECK 1] Fetching profile with token...
[PASS] Authorized profile fetch successful
[INFO] Profile Name: Candidate Verification User
[CHECK 1] Fetching profile without token (Security Check)...
[PASS] Security Check: Request without token rejected with 401 Unauthorized
[CHECK 2] CV Parse Check
[CHECK 2] Sending PDF CV to POST /cv-parser/parse-file...
[PASS] CV parsed successfully
[INFO] Extracted Personal Info: {
  fullName: 'Muhammad Reza Azhar Priyadi',
  phone: '+6285691577498',
  email: 'rezaazhar.p@gmail.com'
}
[INFO] Extracted Education: 2 entries
[INFO] Extracted Work Experience: 3 entries
[INFO] Extracted Skills: C, PYTHON, Machine Learning, Tensorflow, Kubernetes, Chatbot Development, C++, Mathematics for Machine Learning, Computer Vision, Pytorch, docker, Github
[CHECK 3] Profile Store Check
[CHECK 3] Storing parsed data via POST /candidate-profile/store-parsed-data...
[PASS] Profile store endpoint returned success
[CHECK 3] Verifying DB records created...
[INFO] Found dbCandidate: Muhammad Reza Azhar Priyadi
[PASS] Education DB records verified (2 records)
[PASS] Work Experience DB records verified (3 records)
[PASS] Skills DB records verified (12 records)
[CHECK 4] Analysis Trigger Check
[CHECK 4] Calling POST /candidate-applications/analyze with selected tracks...
[PASS] Analysis triggered successfully
[INFO] Recommendations returned: 5
[INFO] First Recommended Job ID: b7681860-10f5-4028-a066-40b2afcf5db8
[CHECK 5] Job Recommendations Check
[CHECK 5] Calling GET /analysis/15c6082e-dc18-40bb-bcb3-8cb697fc5d3b...
[PASS] Get analysis details succeeded
[INFO] Found recommendations count: 3
[INFO] Sample Job Recommendation:
      - Job: IT SUPPORT ENGINEER
      - Fit Score: 35
      - Match Status: NOT_MATCH
      - isTalentPool: true
[PASS] Verified recommended application has isTalentPool: true by default
[CHECK 6] Apply Check
[CHECK 6] Applying for Job Vacancy ID: b7681860-10f5-4028-a066-40b2afcf5db8...
[PASS] Application submitted successfully
[INFO] Application ID: e1282a8b-216a-4bdd-8179-ec0f071b13f2
[INFO] isTalentPool returned from API: false
[CHECK 6] Verifying DB updates for candidate application (isTalentPool: false)...
[INFO] Application DB Record: id=e1282a8b-216a-4bdd-8179-ec0f071b13f2, isTalentPool=false
[PASS] Database assertion verified: isTalentPool is now false

=== ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ===
```
