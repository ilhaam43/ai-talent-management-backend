# Quick Start Guide - CV Upload & Parse API

## 🚀 Quick Setup (5 Steps)

### 1. Start Database
```bash
docker compose up -d db
```

### 2. Run Migration
```bash
npx prisma migrate dev --name add_candidate_documents
```

### 3. Seed Document Types
```bash
npx ts-node scripts/seed-document-types.ts
```

### 4. Seed Test Candidate (if not already done)
```bash
npx ts-node scripts/seed-candidate.ts
```

### 5. Start Server
```bash
npm run start:dev
```

## 🧪 Test the API

### Option 1: Automated Test Script
```bash
npx ts-node scripts/test-cv-upload-and-parse.ts
```

### Option 2: Swagger UI
1. Open browser: `http://localhost:3000/docs`
2. Click "Authorize" button
3. Login to get token: POST `/auth/login`
4. Paste token: `Bearer YOUR_TOKEN`
5. Test endpoints

### Option 3: Manual cURL

**Step 1: Login**
```bash
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"candidate@example.com","password":"password123"}' \
  | jq -r '.access_token')
```

**Step 2: Get Document Types**
```bash
curl http://localhost:3000/documents/types \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Step 3: Upload CV**
```bash
DOC_ID=$(curl -X POST http://localhost:3000/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@path/to/cv.pdf" \
  -F "documentTypeId=YOUR_TYPE_ID" \
  | jq -r '.id')
```

**Step 4: Parse CV**
```bash
curl -X POST http://localhost:3000/cv-parser/parse/$DOC_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

## 📌 API Endpoints

### Documents API
- `POST /documents/upload` - Upload CV/document
- `GET /documents` - List all your documents
- `GET /documents/types` - Get document types
- `GET /documents/:id` - Get document details
- `GET /documents/:id/download` - Download file
- `DELETE /documents/:id` - Delete document

### CV Parser API
- `POST /cv-parser/parse/:documentId` - Parse uploaded document
- `POST /cv-parser/parse-file` - Parse file without storing

## 📝 Example Response

```json
{
  "extractedText": "JOHN DOE\nEmail: john@example.com...",
  "parsedData": {
    "personalInfo": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+62 812-3456-7890"
    },
    "education": [{
      "institution": "University of Indonesia",
      "degree": "Bachelor",
      "major": "Computer Science",
      "gpa": "3.75"
    }],
    "workExperience": [{
      "company": "Tech Company",
      "position": "Software Engineer"
    }],
    "skills": ["JavaScript", "Python", "React"],
    "certifications": []
  }
}
```

## 🔑 Test Credentials

```
Email: candidate@example.com
Password: password123
```

## 📚 Full Documentation

- [Issue #2 Documentation](./issue-2-cv-upload-parse/)
  - [Implementation Plan](./issue-2-cv-upload-parse/IMPLEMENTATION_PLAN_CV_UPLOAD.md)
  - [Walkthrough](./issue-2-cv-upload-parse/WALKTHROUGH_CV_UPLOAD_PARSE.md)
  - [API Summary](./issue-2-cv-upload-parse/CV_API_SUMMARY.md)
- [Main Documentation](./README.md)
- [Docker Deployment](./DOCKER_DEPLOYMENT.md)
- [ERD](../erd.md)

## ⚠️ Troubleshooting

**Database connection error?**
```bash
docker compose up -d db
```

**Migration error?**
```bash
npx prisma generate
npx prisma migrate dev
```

**Test candidate not found?**
```bash
npx ts-node scripts/seed-candidate.ts
```


