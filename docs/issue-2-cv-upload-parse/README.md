# Issue #2: CV Upload & Parse API

## 📋 Overview

Implementation of backend API for handling CV/document uploads and parsing to extract structured information for autofilling candidate forms.

**Issue**: #2 - Create Backend API for handle upload CV candidate and parsing to autofill form candidate  
**Status**: ✅ Complete  
**Implementation Date**: December 5, 2025

## 📚 Documentation

### 1. [Implementation Plan](./IMPLEMENTATION_PLAN_CV_UPLOAD.md)
Complete implementation plan with:
- Goal description
- Database schema changes
- Module structure
- API endpoints
- Security considerations
- Testing plan

### 2. [Walkthrough](./WALKTHROUGH_CV_UPLOAD_PARSE.md)
Complete implementation walkthrough with:
- What was implemented
- How to use
- Testing instructions
- Troubleshooting

### 3. [Test Results](./CV_TEST_RESULTS.md)
Test results for all CVs in test-files folder:
- Success rate: 80% (4/5 CVs)
- Detailed parsing results
- Analysis and recommendations

## 🎯 What Was Implemented

### Documents API (Upload & Storage)
- File upload with validation (PDF, DOC, DOCX)
- Document metadata storage
- File download
- Document deletion
- Authorization checks

### CV Parser API (Parsing & Extraction)
- PDF text extraction (pdf-parse)
- DOCX text extraction (mammoth)
- **LLM-based parsing** (Llama4 Maverick / OpenAI-compatible) ⭐
- Regex-based parsing (fallback)
- Structured data parsing:
  - Personal information
  - Education history
  - Work experience
  - Organization experience
  - Skills
  - Certifications

## 🚀 Quick Start

```bash
# Start database
docker compose up -d db

# Run migration
npx prisma migrate dev

# Seed document types
npx ts-node scripts/seed-document-types.ts

# Start server
npm start

# Test
npx ts-node scripts/test-cv-upload-and-parse.ts
```

## 📡 API Endpoints

### Documents API
- `POST /documents/upload` - Upload CV/document
- `GET /documents` - Get all documents
- `GET /documents/types` - Get document types
- `GET /documents/:id` - Get document details
- `GET /documents/:id/download` - Download file
- `DELETE /documents/:id` - Delete document

### CV Parser API
- `POST /cv-parser/parse/:documentId` - Parse uploaded document
- `POST /cv-parser/parse-file` - Parse file without storing

## 🔗 Related Documentation

- [Main Documentation](../README.md)
- [Docker Deployment](../DOCKER_DEPLOYMENT.md)
- [Quick Start Guide](../QUICK_START_CV_API.md)

## 📝 Notes

- This implementation handles **upload and parsing only**
- **Storing parsed data** to candidate profile is handled in separate issues (#4-#13)
- **LLM Parsing**: Uses Llama4 Maverick (or any OpenAI-compatible API) for high-accuracy parsing
- **Fallback**: Automatically falls back to regex-based parsing if LLM is unavailable
- **Setup**: See [LLM Setup Guide](../LLM_SETUP.md) for configuration

---

**Next Steps**: Implement candidate profile APIs (Issues #4-#13) to store parsed data

