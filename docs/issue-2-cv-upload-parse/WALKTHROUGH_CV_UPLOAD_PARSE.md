# CV Upload and Parsing API - Implementation Walkthrough

This document provides a complete walkthrough of the CV upload and parsing API implementation for the AI Talent Management Backend.

## 📋 Overview

I have implemented **two separate API modules** following the separation of concerns principle:

1. **Documents API** - Handles file upload, storage, and management
2. **CV Parser API** - Handles text extraction and data parsing

This modular approach allows:
- Independent testing and scaling
- Flexibility to swap parsing implementations (e.g., AI-based parsing in the future)
- Clear API boundaries and responsibilities
- Better maintainability

## 🗄️ Database Changes

### Schema Updates

Added two new models to `prisma/schema.prisma`:

1. **DocumentType** - Dictionary table for document types (CV, Certificate, etc.)
   - `id` (UUID, primary key)
   - `documentType` (String, unique)
   - `createdAt`, `updatedAt` (Timestamps)

2. **CandidateDocument** - Stores uploaded document metadata
   - `id` (UUID, primary key)
   - `candidateId` (Foreign key to Candidate)
   - `documentTypeId` (Foreign key to DocumentType)
   - `originalFilename` (String)
   - `filePath` (String)
   - `mimeType` (String)
   - `fileSize` (Integer)
   - `extractedText` (Text, nullable)
   - `createdAt`, `updatedAt` (Timestamps)

3. **Updated Candidate Model** - Added relation to documents

### Migration

```bash
npx prisma migrate dev --name add_candidate_documents
```

## 📦 Dependencies Installed

```bash
npm install pdf-parse mammoth --legacy-peer-deps
npm install -D @types/multer @types/pdf-parse --legacy-peer-deps
npm install axios form-data --legacy-peer-deps  # For testing
```

- **pdf-parse**: Extract text from PDF files
- **mammoth**: Extract text from DOCX files
- **@types/multer**: TypeScript types for file uploads
- **axios, form-data**: For testing scripts

## 🏗️ Module Structure

### 1. Documents Module (File Upload & Storage)

**Location**: `src/documents/`

**Files Created**:
- `config/multer.config.ts` - File upload configuration
- `dto/upload-document.dto.ts` - DTO for upload validation
- `entities/candidate-document.entity.ts` - TypeScript interfaces
- `documents.service.ts` - Business logic for document management
- `documents.controller.ts` - REST API endpoints
- `documents.module.ts` - Module definition

**Key Features**:
- File validation (PDF, DOC, DOCX only)
- File size limit (10MB)
- UUID-based filename generation (security)
- Authorization checks (candidates can only access their own documents)
- CRUD operations for documents

**API Endpoints**:
```
POST   /documents/upload          - Upload document
GET    /documents                 - Get all candidate's documents
GET    /documents/types           - Get document types
GET    /documents/:id             - Get document details
GET    /documents/:id/download    - Download document file
DELETE /documents/:id             - Delete document
```

### 2. CV Parser Module (Parsing & Extraction)

**Location**: `src/cv-parser/`

**Files Created**:
- `dto/parsed-candidate-data.dto.ts` - DTOs for parsed data structure
- `parsers/text-extractor.service.ts` - PDF/DOCX text extraction
- `parsers/data-extractor.service.ts` - Regex-based data parsing
- `cv-parser.service.ts` - Orchestration service
- `cv-parser.controller.ts` - REST API endpoints
- `cv-parser.module.ts` - Module definition

**Key Features**:
- Text extraction from PDF and DOCX
- Regex-based pattern matching for data extraction
- Structured data parsing:
  - Personal information (name, email, phone, DOB, address)
  - Education history (institution, degree, major, GPA, years)
  - Work experience (company, position, dates, description)
  - Organization experience (org, role, dates, description)
  - Skills (array of skills)
  - Certifications (name, issuer, date)

**API Endpoints**:
```
POST   /cv-parser/parse/:documentId  - Parse uploaded document
POST   /cv-parser/parse-file          - Parse file without storing
```

## 🔐 Security Features

1. **Authentication**: All endpoints protected by JWT authentication (`@UseGuards(AuthGuard('jwt'))`)
2. **Authorization**: Candidates can only access their own documents
3. **File Validation**: 
   - MIME type checking
   - File extension validation
   - File size limit (10MB)
4. **Secure Storage**: 
   - UUID filenames prevent collisions and path traversal
   - Files stored outside public directory
5. **SQL Injection Prevention**: Using Prisma ORM with parameterized queries

## 📝 Parsing Strategy

### Text Extraction
- **PDF**: Uses `pdf-parse` library to extract raw text
- **DOCX**: Uses `mammoth` to convert document to text
- **Error Handling**: Proper error messages if parsing fails

### Data Extraction (Regex-Based)

**Personal Information**:
- Email: `/[\w.-]+@[\w.-]+\.\w+/`
- Phone: Various formats including Indonesian numbers
- Name: Pattern matching from document header
- Date of Birth: Multiple date formats
- ID Card Number (KTP): 16-digit pattern

**Education**:
- Section detection: "Education", "Pendidikan", "Academic"
- Degree patterns: Bachelor, Master, PhD, S1, S2, D3, etc.
- Institution extraction
- GPA parsing
- Year ranges

**Work Experience**:
- Section detection: "Work Experience", "Employment", "Pengalaman Kerja"
- Company and position extraction
- Date range parsing
- Job description extraction

**Organization Experience**:
- Section detection: "Organization", "Volunteer", "Community"
- Organization name and role extraction
- Date ranges

**Skills**:
- Section detection: "Skills", "Keahlian", "Expertise"
- Comma/bullet point separation
- Deduplication

**Certifications**:
- Section detection: "Certification", "Certificate", "Sertifikat"
- Name and issuer extraction
- Date parsing

## 🧪 Testing

### Seed Script

**File**: `scripts/seed-document-types.ts`

Seeds the database with common document types:
- CV/Resume
- Cover Letter
- Certificate
- Portfolio
- ID Card
- Transcript
- Supporting Document
- Reference Letter
- Work Sample

**Run**:
```bash
npx ts-node scripts/seed-document-types.ts
```

### Test Script

**File**: `scripts/test-cv-upload-and-parse.ts`

Comprehensive test script that:
1. Logs in as test candidate
2. Gets candidate profile
3. Retrieves document types
4. Uploads a test CV
5. Lists all documents
6. Parses the uploaded CV
7. Downloads the document
8. Deletes the document

**Run**:
```bash
# Start the server first
npm run start:dev

# In another terminal:
npx ts-node scripts/test-cv-upload-and-parse.ts
```

### Manual Testing with cURL

#### 1. Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"candidate@example.com","password":"password123"}'
```

#### 2. Upload CV
```bash
curl -X POST http://localhost:3000/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@path/to/cv.pdf" \
  -F "documentTypeId=DOCUMENT_TYPE_ID"
```

#### 3. Parse CV
```bash
curl -X POST http://localhost:3000/cv-parser/parse/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔄 Integration Flow

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 1. POST /documents/upload
       │    (file + documentTypeId)
       ▼
┌─────────────────────┐
│  Documents API      │
│  - Validate file    │
│  - Store to disk    │
│  - Save metadata    │
└──────┬──────────────┘
       │
       │ Returns: { documentId, fileName, ... }
       │
┌──────▼──────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 2. POST /cv-parser/parse/:documentId
       ▼
┌─────────────────────┐
│  CV Parser API      │
│  - Get file path    │
│  - Extract text     │
│  - Parse data       │
└──────┬──────────────┘
       │
       │ Returns: { parsedData: {...} }
       │
┌──────▼──────┐
│  Frontend   │
│  - Display  │
│  - Prefill  │
│    forms    │
└──────┬──────┘
       │
       │ 3. POST /candidates/personal-info
       │    POST /candidates/education
       │    etc. (Future implementation)
       ▼
┌─────────────────────┐
│  Candidate Profile  │
│  APIs (Issues 4-13) │
└─────────────────────┘
```

## 📊 Parsed Data Structure

The CV Parser returns a structured JSON object:

```json
{
  "extractedText": "Full CV text content...",
  "parsedData": {
    "personalInfo": {
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+62 812-3456-7890",
      "dateOfBirth": "15-05-1995",
      "placeOfBirth": "Jakarta",
      "address": "Jakarta, Indonesia",
      "city": "Jakarta",
      "idCardNumber": "1234567890123456"
    },
    "education": [
      {
        "institution": "University of Indonesia",
        "degree": "Bachelor",
        "major": "Computer Science",
        "gpa": "3.75",
        "maxGpa": "4.00",
        "startYear": "2013",
        "endYear": "2017"
      }
    ],
    "workExperience": [
      {
        "company": "Tech Company",
        "position": "Software Engineer",
        "startDate": "August 2017",
        "endDate": "December 2020",
        "description": "Developed web applications..."
      }
    ],
    "organizationExperience": [
      {
        "organization": "Student Association",
        "role": "Vice President",
        "startDate": "2015",
        "endDate": "2016",
        "description": "Led team of 20 members..."
      }
    ],
    "skills": [
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "Python"
    ],
    "certifications": [
      {
        "name": "AWS Certified Developer",
        "issuer": "Amazon Web Services",
        "startDate": "June 2020"
      }
    ]
  }
}
```

## 🚀 Getting Started

### Prerequisites
1. Docker (for PostgreSQL)
2. Node.js 18+
3. npm or yarn

### Setup Steps

1. **Start Database**:
```bash
docker compose up -d db
```

2. **Run Migration**:
```bash
npx prisma migrate dev
```

3. **Seed Document Types**:
```bash
npx ts-node scripts/seed-document-types.ts
```

4. **Seed Test Candidate** (if not already done):
```bash
npx ts-node scripts/seed-candidate.ts
```

5. **Start Server**:
```bash
npm run start:dev
```

6. **Test API**:
```bash
# In another terminal
npx ts-node scripts/test-cv-upload-and-parse.ts
```

### Swagger Documentation

Access the interactive API documentation at:
```
http://localhost:3000/docs
```

Use the "Authorize" button to add your JWT token for testing protected endpoints.

## 📁 File Storage

- **Location**: `uploads/documents/`
- **Naming**: UUID-based filenames for security
- **Gitignore**: Added to `.gitignore` to prevent committing uploaded files

## ⚠️ Important Notes

1. **This Implementation (Issue #2)**:
   - ✅ Document upload and storage
   - ✅ CV parsing and text extraction
   - ✅ Structured data extraction
   - ❌ Does NOT store parsed data to candidate profile

2. **Future Implementation (Issues #4-#13)**:
   - Candidate profile APIs (Personal Info, Address, Education, etc.)
   - Each section will have its own CRUD endpoints
   - Frontend will call these APIs to store parsed data

3. **Parsing Accuracy**:
   - Current implementation uses regex-based parsing
   - Works well for standard CV formats
   - For better accuracy, consider AI-based parsing (OpenAI, Claude, Google Document AI)

4. **Storage Considerations**:
   - Files stored locally in `uploads/` directory
   - For production, consider cloud storage (S3, Azure Blob)
   - Implement cleanup jobs for old/unused documents

## 🔧 Configuration

### Environment Variables

Ensure `.env` file contains:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_talent_db?schema=public"
JWT_SECRET="your-secret-key"
```

### File Upload Limits

Configured in `src/documents/config/multer.config.ts`:
- Max file size: 10MB
- Allowed types: PDF, DOC, DOCX
- Storage location: `./uploads/documents`

## 🐛 Troubleshooting

### Database Connection Error
```
Error: P1001: Can't reach database server
```
**Solution**: Start Docker database with `docker compose up -d db`

### File Upload Error
```
Invalid file type
```
**Solution**: Ensure file is PDF, DOC, or DOCX format

### Parsing Error
```
Failed to extract text from document
```
**Solution**: 
- Check if file is corrupted
- Ensure file contains extractable text (not scanned images)
- For scanned PDFs, OCR processing would be needed

### Permission Error
```
You do not have permission to access this document
```
**Solution**: Ensure you're authenticated as the document owner

## 📈 Performance Considerations

1. **Text Extraction**: Can be slow for large PDFs (100+ pages)
2. **Parsing**: Regex-based parsing is fast but may need optimization for very long documents
3. **Concurrent Uploads**: Server can handle multiple simultaneous uploads
4. **Storage**: Monitor disk space usage for uploaded files

## 🔮 Future Enhancements

1. **AI-Based Parsing**:
   - Integrate OpenAI/Claude API for better accuracy
   - Handle complex CV formats and layouts
   - Multi-language support

2. **Advanced Features**:
   - OCR for scanned documents
   - CV scoring and matching
   - Skills normalization and validation
   - Duplicate detection

3. **Cloud Storage**:
   - AWS S3 integration
   - Azure Blob Storage
   - Google Cloud Storage

4. **Performance**:
   - Background job processing for large files
   - Caching of parsed data
   - Batch processing support

## ✅ Success Criteria

All implemented successfully:
- ✅ Candidate can upload CV (PDF/DOCX) via API
- ✅ File is stored securely on disk with UUID filename
- ✅ Document metadata is saved to database
- ✅ Candidate can retrieve list of their documents
- ✅ Candidate can download their original files
- ✅ Candidate can delete their documents
- ✅ CV text extraction works for PDF and DOCX
- ✅ Structured data is parsed from CV text
- ✅ Authorization: candidates can only access their own documents
- ✅ File validation: only PDF/DOCX, max 10MB
- ✅ All endpoints are authenticated via JWT
- ✅ Swagger documentation is complete

## 📚 Related Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN_CV_UPLOAD.md)
- [ERD Documentation](../erd.md)
- [README](../README.md)

## 🤝 Contributing

When extending this implementation:
1. Follow the existing module structure
2. Add tests for new features
3. Update Swagger documentation
4. Update this walkthrough document

---

**Implementation Date**: December 5, 2025  
**Issue**: #2 - Create Backend API for handle upload CV candidate and parsing to autofill form candidate  
**Status**: ✅ Complete


