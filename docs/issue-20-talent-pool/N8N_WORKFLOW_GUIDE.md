# n8n Workflow Guide - Talent Pool

## Overview

The Talent Pool uses a **separate n8n workflow** from the Candidate flow to prevent timeout issues and prioritization conflicts.

---

## Why Separate Workflows?

| Concern | Same Workflow | Separate Workflows |
|---------|---------------|-------------------|
| **Timeout** | 50 CVs = 15+ min, blocks candidates | Candidate not affected |
| **Priority** | Hard to prioritize | n8n executes immediately |
| **Debugging** | Complex to trace | Clear separation |
| **Scaling** | Single queue | Independent scaling |

---

## Workflow 1: Candidate Flow (Existing)

**Trigger**: Webhook
**Purpose**: Single candidate, selected job tracks only
**Response Time**: ~20 seconds

---

## Workflow 2: Talent Pool (New)

**Trigger**: Webhook
**Purpose**: Batch of CVs, ALL open jobs
**Response Time**: Async (callback-based)

### Nodes:

```
1. Webhook Trigger
       │
       ▼
2. Loop (for each queue item)
       │
       ▼
3. Extract PDF from File
       │
       ▼
4. Information Extractor (OpenAI)
       │
       ▼
5. Get All Open Jobs (HTTP Request)
       │
       ▼
6. Multi-Job HR Expert (OpenAI Agent)
       │
       ▼
7. Prepare API Payload (Code)
       │
       ▼
8. Send Callback (HTTP Request)
```

---

## Information Extractor Schema

```json
{
  "type": "object",
  "properties": {
    "fullName": {
      "type": "string",
      "description": "Candidate's full name"
    },
    "email": {
      "type": "string",
      "description": "Email address"
    },
    "phone": {
      "type": "string",
      "description": "Phone number with country code"
    },
    "city": {
      "type": "string",
      "description": "Current city and country"
    },
    "linkedin": {
      "type": "string",
      "description": "LinkedIn profile URL"
    },
    "education": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "institution": { "type": "string" },
          "degree": { "type": "string" },
          "major": { "type": "string" },
          "gpa": { "type": "string" },
          "startYear": { "type": "string" },
          "endYear": { "type": "string" }
        }
      }
    },
    "workExperience": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "company": { "type": "string" },
          "position": { "type": "string" },
          "startDate": { "type": "string" },
          "endDate": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "organizationExperience": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "organization": { "type": "string" },
          "role": { "type": "string" },
          "startDate": { "type": "string" },
          "endDate": { "type": "string" }
        }
      }
    },
    "skills": {
      "type": "array",
      "items": { "type": "string" }
    },
    "certifications": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "issuer": { "type": "string" },
          "date": { "type": "string" }
        }
      }
    }
  },
  "required": ["fullName"]
}
```

---

## System Prompt for Information Extractor

```
You are an expert CV/resume extraction algorithm.

RULES:
1. Extract ALL relevant information from the text
2. For arrays, include ALL items found
3. Use null for missing optional fields
4. Format dates as "YYYY-MM" or "YYYY"
5. For ongoing positions, use "Present" as endDate
6. Skills should be individual strings
7. Extract certifications as separate items
```

---

## Multi-Job HR Expert Prompt

The agent evaluates each candidate against all open jobs:

```
You are an HR screening expert. For each open job position:

1. Analyze the candidate's qualifications against job requirements
2. Score based on:
   - Experience Relevance (40%)
   - Skills & Tools (30%)
   - Education (10%)
   - Core Value Fit (20%)
3. Return only positions with:
   - Fit score >= 65, OR
   - Match status = MATCH or STRONG_MATCH

Output JSON array of matching positions.
```

---

## Callback Payload Format

```json
{
  "batchId": "uuid",
  "queueItemId": "uuid",
  "success": true,
  "candidateData": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+62812345678",
    "city": "Jakarta, Indonesia",
    "linkedin": "https://linkedin.com/in/johndoe",
    "education": [
      {
        "institution": "ITB",
        "degree": "S.Kom",
        "major": "Computer Science",
        "gpa": "3.5",
        "startYear": "2015",
        "endYear": "2019"
      }
    ],
    "workExperience": [...],
    "skills": ["Python", "Docker", "AWS"],
    "certifications": [...],
    "organizationExperience": [...],
    "cvFileUrl": "/uploads/talent-pool/xxx.pdf",
    "cvFileName": "john_doe_cv.pdf",
    "screenings": [
      {
        "jobVacancyId": "uuid",
        "fitScore": 85.0,
        "aiMatchStatus": "STRONG_MATCH",
        "aiInsight": "Strong candidate with...",
        "aiInterview": "Suggested questions...",
        "aiCoreValue": "ICARE alignment..."
      }
    ]
  }
}
```

---

## Error Handling

If extraction or analysis fails:

```json
{
  "batchId": "uuid",
  "queueItemId": "uuid",
  "success": false,
  "errorMessage": "Failed to extract PDF: Invalid format"
}
```

Backend will:
1. Mark queue item as FAILED
2. Increment batch `failedFiles` counter
3. Continue processing other items
