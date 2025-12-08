# Implementation Plan - CV Upload and Parsing API (Separated)

## Goal Description

Create **separate backend APIs** for handling CV/document uploads and parsing. Following modular design:

### API 1: Document Upload & Storage
1. Accept file uploads (PDF, DOC, DOCX)
2. Store files securely on the server
3. Save document metadata to database
4. Return document record (NO parsing in this API)

### API 2: CV Parsing & Information Extraction
1. Take document ID or file as input
2. Extract text from CV (PDF/DOCX)
3. Parse text to extract structured data
4. Return parsed data as JSON (name, email, phone, education, work experience, skills, etc.)
5. **Does NOT store** candidate profile data (frontend responsibility)

### API 3-9: Candidate Profile Section APIs (Separate Issue)
Each candidate profile section will have its own CRUD API:
- Personal Information (#6)
- Address (#7)
- Education (#8)
- Work Experience (#9)
- Organization Experience (#10)
- Family (#11)
- Skills & Certification (#12)
- Supporting Documents (#13)

## User Review Required

**IMPORTANT NOTES:**

1. **Separation of Concerns**: 
   - **Upload API**: Only handles file upload and storage (no parsing)
   - **Parse API**: Only handles text extraction and data parsing (no storage)
   - **Profile APIs**: Separate APIs for each section (handled in other issues #4-#13)

2. **Database Schema**: I will add the following tables to Prisma schema based on `erd.md`:
   - `document_types`: Dictionary for document types (CV, Cover Letter, Certificate, etc.)
   - `candidate_documents`: Stores uploaded documents metadata (file path, name, size, type)
   - **Note**: Extracted text will be stored temporarily in `extractedText` field for reference
   - **Candidate profile fields** will be handled in separate issues (#4-#13)

3. **File Storage**: Files will be stored locally in `uploads/documents/` directory. For production, consider cloud storage (S3, Azure Blob, etc.).

4. **CV Parsing Strategy**: 
   - Use `pdf-parse` for PDF files
   - Use `mammoth` for DOCX files
   - Use regex and NLP patterns to extract structured data (name, email, phone, education, experience, skills)
   - **Parsing is done on-demand** via separate API endpoint

5. **Dependencies to Add**:
   - `multer` (file upload middleware - included in @nestjs/platform-express)
   - `pdf-parse` (PDF text extraction)
   - `mammoth` (DOCX text extraction)
   - `@types/multer` (TypeScript types)

## Proposed Changes

### 1. Database Schema Updates

**[MODIFY]** `prisma/schema.prisma`
- Add `DocumentType` model (id, documentType, createdAt, updatedAt)
- Add `CandidateDocument` model with fields:
  - id, candidateId, documentTypeId, filePath, originalFilename, mimeType, fileSize, extractedText (optional), createdAt, updatedAt
  - Relation to `Candidate` and `DocumentType`
- **Note**: Candidate profile fields will be added in separate issues (#4-#13)

**[ACTION]** Run migration:
```bash
npx prisma migrate dev --name add_candidate_documents
```

### 2. Install Dependencies

**[ACTION]** Install required packages:
```bash
npm install pdf-parse mammoth
npm install -D @types/multer @types/pdf-parse
```

### 3. Documents Module (Upload & Storage)

**[NEW]** `src/documents/documents.module.ts`
- Create DocumentsModule for file upload/storage
- Import CandidatesModule for candidate validation
- Export DocumentsService

**[NEW]** `src/documents/documents.service.ts`
- `uploadDocument(candidateId, file, documentTypeId)`: Save file and create database record
- `getDocumentsByCandidate(candidateId)`: Retrieve all documents for a candidate
- `getDocumentById(documentId, candidateId)`: Get specific document (with auth check)
- `deleteDocument(documentId, candidateId)`: Remove document file and record
- `downloadDocument(documentId, candidateId)`: Stream file for download
- **NO parsing logic in this service**

**[NEW]** `src/documents/documents.controller.ts`
- `POST /documents/upload` - Upload document (multipart/form-data)
  - Body: file (multipart), documentTypeId
  - Returns: document metadata only (no parsing)
- `GET /documents` - Get all documents for authenticated candidate
- `GET /documents/:documentId` - Get specific document details
- `DELETE /documents/:documentId` - Delete document
- `GET /documents/:documentId/download` - Download original file
- Use `@UseGuards(AuthGuard('jwt'))` for authentication
- Use `@UseInterceptors(FileInterceptor('file'))` for file upload

**[NEW]** `src/documents/dto/upload-document.dto.ts`
- Validation for documentTypeId
- File validation rules (size, type)

**[NEW]** `src/documents/entities/candidate-document.entity.ts`
- TypeScript interface for CandidateDocument

**[NEW]** `src/documents/config/multer.config.ts`
- Configure multer storage (destination: `uploads/documents/`, filename: UUID)
- File filter (accept only PDF, DOC, DOCX)
- Size limit (10MB)

### 4. CV Parser Module (Parsing & Extraction)

**[NEW]** `src/cv-parser/cv-parser.module.ts`
- Create separate CVParserModule for parsing logic
- Import DocumentsModule to access files
- Export CVParserService

**[NEW]** `src/cv-parser/cv-parser.service.ts`
- `parseDocument(documentId, candidateId)`: Parse document by ID
- `parseFile(file)`: Parse uploaded file directly
- `extractTextFromPDF(filePath)`: PDF text extraction
- `extractTextFromDOCX(filePath)`: DOCX text extraction
- `parsePersonalInfo(text)`: Extract name, email, phone, address using regex
- `parseEducation(text)`: Extract education history
- `parseWorkExperience(text)`: Extract work experience
- `parseOrganizationExperience(text)`: Extract organization experience
- `parseSkills(text)`: Extract skills list
- `parseCertifications(text)`: Extract certifications
- Return structured data object

**[NEW]** `src/cv-parser/cv-parser.controller.ts`
- `POST /cv-parser/parse/:documentId` - Parse existing document
  - Requires JWT auth
  - Returns parsed data structure
- `POST /cv-parser/parse-file` - Parse uploaded file without storing
  - Body: file (multipart)
  - Returns parsed data structure
- Use `@UseGuards(AuthGuard('jwt'))` for authentication

**[NEW]** `src/cv-parser/dto/parsed-candidate-data.dto.ts`
- Structure for extracted data with nested objects:
  - personalInfo: { fullName, email, phone, dateOfBirth, address }
  - education: [{ institution, degree, major, gpa, startYear, endYear }]
  - workExperience: [{ company, position, startDate, endDate, description }]
  - organizationExperience: [{ organization, role, startDate, endDate, description }]
  - skills: [string]
  - certifications: [{ name, issuer, date }]

**[NEW]** `src/cv-parser/parsers/text-extractor.service.ts`
- PDF and DOCX text extraction logic
- Handle errors and unsupported formats

**[NEW]** `src/cv-parser/parsers/data-extractor.service.ts`
- Regex-based data extraction
- Pattern matching for different CV formats
- Section detection (education, experience, skills, etc.)

### 5. Document Types Seed

**[NEW]** `scripts/seed-document-types.ts`
- Seed common document types:
  - CV/Resume
  - Cover Letter
  - Certificate
  - Portfolio
  - ID Card
  - Transcript
  - Supporting Document

### 6. App Module

**[MODIFY]** `src/app.module.ts`
- Import DocumentsModule
- Import CVParserModule
- Configure static file serving for uploads (optional)

## API Endpoints Summary

### 📁 Documents API - Upload & Storage (Issue #2 - Part 1)
```
POST   /documents/upload
       - Upload CV/document (FILE STORAGE ONLY)
       - Requires: JWT auth, multipart file, documentTypeId
       - Body: { file: File, documentTypeId: string }
       - Returns: { 
           id: string,
           candidateId: string,
           fileName: string,
           filePath: string,
           fileSize: number,
           mimeType: string,
           documentTypeId: string,
           uploadedAt: Date
         }
       - NO PARSING in this endpoint

GET    /documents
       - Get all documents for current authenticated candidate
       - Requires: JWT auth
       - Returns: [{ id, fileName, documentType, fileSize, uploadedAt }]

GET    /documents/:documentId
       - Get document details (metadata only)
       - Requires: JWT auth
       - Returns: { id, fileName, filePath, documentType, uploadedAt }

DELETE /documents/:documentId
       - Delete document file and record
       - Requires: JWT auth
       - Returns: { success: true, message: string }

GET    /documents/:documentId/download
       - Download original document file
       - Requires: JWT auth
       - Returns: File stream
```

### 🔍 CV Parsing API - Text Extraction & Analysis (Issue #2 - Part 2)
```
POST   /cv-parser/parse/:documentId
       - Parse CV by document ID
       - Requires: JWT auth
       - Returns: {
           extractedText: string,
           parsedData: {
             personalInfo: {
               fullName?: string,
               email?: string,
               phone?: string,
               dateOfBirth?: string,
               address?: string
             },
             education: [{
               institution: string,
               degree: string,
               major: string,
               gpa: string,
               startYear: string,
               endYear: string
             }],
             workExperience: [{
               company: string,
               position: string,
               startDate: string,
               endDate: string,
               description: string
             }],
             organizationExperience: [{
               organization: string,
               role: string,
               startDate: string,
               endDate: string,
               description: string
             }],
             skills: [string],
             certifications: [{
               name: string,
               issuer: string,
               date: string
             }]
           }
         }
       - This endpoint ONLY returns parsed data
       - Frontend is responsible for storing data via profile APIs

POST   /cv-parser/parse-file
       - Parse CV from uploaded file directly (without storing)
       - Requires: JWT auth, multipart file
       - Body: { file: File }
       - Returns: Same structure as above
       - Use case: Preview parsing before actual upload
```

### 👤 Candidate Profile APIs (Separate Issues - Reference Only)
```
These will be implemented in separate issues:

POST   /candidates/personal-info        (Issue #6)
PATCH  /candidates/personal-info        (Issue #4)
GET    /candidates/personal-info

POST   /candidates/address              (Issue #7)
PATCH  /candidates/address              (Issue #4)
GET    /candidates/address

POST   /candidates/education            (Issue #8)
PATCH  /candidates/education/:id        (Issue #4)
GET    /candidates/education
DELETE /candidates/education/:id

POST   /candidates/work-experience      (Issue #9)
PATCH  /candidates/work-experience/:id  (Issue #4)
GET    /candidates/work-experience
DELETE /candidates/work-experience/:id

POST   /candidates/organization-experience    (Issue #10)
PATCH  /candidates/organization-experience/:id (Issue #4)
GET    /candidates/organization-experience
DELETE /candidates/organization-experience/:id

POST   /candidates/family               (Issue #11)
PATCH  /candidates/family/:id           (Issue #4)
GET    /candidates/family
DELETE /candidates/family/:id

POST   /candidates/skills               (Issue #12)
PATCH  /candidates/skills/:id           (Issue #4)
GET    /candidates/skills
DELETE /candidates/skills/:id

POST   /candidates/certification        (Issue #12)
PATCH  /candidates/certification/:id    (Issue #4)
GET    /candidates/certification
DELETE /candidates/certification/:id
```

## File Structure
```
src/
  documents/                    # MODULE 1: File Upload & Storage
    config/
      multer.config.ts          # Multer configuration
    dto/
      upload-document.dto.ts    # Upload validation
    entities/
      candidate-document.entity.ts  # TypeScript interfaces
    documents.controller.ts     # Upload/Download/Delete endpoints
    documents.service.ts        # File storage business logic
    documents.module.ts         # Module definition
  
  cv-parser/                    # MODULE 2: CV Parsing & Extraction
    dto/
      parsed-candidate-data.dto.ts  # Parsed data structure
    parsers/
      text-extractor.service.ts     # PDF/DOCX text extraction
      data-extractor.service.ts     # Regex-based data parsing
    cv-parser.controller.ts     # Parse endpoints
    cv-parser.service.ts        # Parsing orchestration
    cv-parser.module.ts         # Module definition
  
  candidates/                   # MODULE 3: Candidate Management
    candidates.service.ts       # Candidate CRUD (basic)
    candidates.module.ts
    # Profile APIs will be added in issues #4-#13

uploads/
  documents/                    # Stored files (UUID filenames)
    
scripts/
  seed-document-types.ts        # Seed document types
  test-cv-upload.ts             # Test upload functionality
  test-cv-parser.ts             # Test parsing functionality

test-files/                     # Sample CVs for testing
  sample-cv.pdf
  sample-cv.docx
```

## Security Considerations

1. **File Validation**: Strict MIME type checking and file extension validation
2. **File Size Limit**: Max 10MB per upload
3. **Authentication**: All endpoints protected by JWT authentication
4. **Authorization**: Candidates can only access their own documents
5. **File Storage**: Files stored outside public directory
6. **SQL Injection**: Using Prisma ORM with parameterized queries
7. **Path Traversal**: Sanitize filenames, use UUID for file storage

## Architecture Flow

### Workflow: Upload → Parse → Store Profile

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
│  (Upload Module)    │
│                     │
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
       │    (documentId)
       ▼
┌─────────────────────┐
│  CV Parser API      │
│  (Parsing Module)   │
│                     │
│  - Get file path    │
│  - Extract text     │
│  - Parse data       │
└──────┬──────────────┘
       │
       │ Returns: { parsedData: { personalInfo, education, ... } }
       │
┌──────▼──────┐
│  Frontend   │
│             │
│  - Display  │
│  - Prefill  │
│    forms    │
└──────┬──────┘
       │
       │ 3. POST /candidates/personal-info
       │    POST /candidates/education
       │    POST /candidates/work-experience
       │    (User reviews and submits each section)
       ▼
┌─────────────────────┐
│  Candidate Profile  │
│  APIs (Issues 4-13) │
│                     │
│  - Store profile    │
│    data to DB       │
└─────────────────────┘
```

## Parsing Strategy

### Text Extraction
1. **PDF**: Use `pdf-parse` library to extract raw text
2. **DOCX**: Use `mammoth` to convert to text
3. **Fallback**: Return error message if parsing fails, but keep file stored

### Data Extraction (Regex + Patterns)

#### Personal Information
- **Email**: `/[\w.-]+@[\w.-]+\.\w+/g`
- **Phone**: `/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g`
- **Name**: Extract from first lines, look for "Name:", "Full Name:" patterns
- **Date of Birth**: `/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g`
- **Address**: Look for "Address:", "Location:", "City:" keywords

#### Education
- Keywords: "Education", "Academic", "University", "College", "School"
- Degree patterns: "Bachelor", "Master", "PhD", "Diploma", "S1", "S2"
- GPA patterns: "GPA: X.XX", "IPK: X.XX"
- Date ranges: "2018-2022", "2018 - 2022"

#### Work Experience
- Keywords: "Experience", "Employment", "Work History", "Professional Experience"
- Company and position extraction
- Date ranges and duration
- Job descriptions

#### Organization Experience
- Keywords: "Organization", "Volunteer", "Community", "Association"
- Role and position
- Date ranges

#### Skills
- Section headers: "Skills", "Technical Skills", "Expertise", "Competencies"
- Comma-separated or bullet list detection
- Programming languages, tools, soft skills

#### Certifications
- Keywords: "Certificate", "Certification", "Training", "Course"
- Issuer and date extraction

### Response Format
The CV Parser API returns a structured JSON object that frontend can use to:
1. Display parsed data to user for review
2. Pre-fill form fields in candidate profile sections
3. Allow user to edit/correct before submission
4. Submit data to respective profile APIs (issues #4-#13)

## Verification Plan

### Automated Tests

**[NEW]** `scripts/test-cv-upload.ts`
- Test Document Upload API:
  - Create test candidate
  - Upload sample CV (PDF)
  - Verify file is stored on disk
  - Verify document record in database
  - Test document retrieval
  - Test document download
  - Test document deletion
  - Verify file is removed from disk

**[NEW]** `scripts/test-cv-parser.ts`
- Test CV Parser API:
  - Upload sample CV
  - Parse document by ID
  - Verify extracted text is returned
  - Verify parsed data structure
  - Validate each section (personalInfo, education, workExperience, etc.)
  - Test parse-file endpoint (direct file upload)

**Sample Test CVs**:
- `test-files/sample-cv.pdf` - PDF format with structured content
- `test-files/sample-cv.docx` - DOCX format with structured content

### Manual Testing with Postman/cURL

#### 1. Document Upload API

**Upload CV**:
```bash
curl -X POST http://localhost:3000/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@sample-cv.pdf" \
  -F "documentTypeId=1"

# Expected Response:
# {
#   "id": "uuid",
#   "candidateId": "candidate-uuid",
#   "fileName": "sample-cv.pdf",
#   "filePath": "uploads/documents/uuid.pdf",
#   "fileSize": 245678,
#   "mimeType": "application/pdf",
#   "documentTypeId": "1",
#   "uploadedAt": "2024-12-05T10:30:00.000Z"
# }
```

**Get All Documents**:
```bash
curl http://localhost:3000/documents \
  -H "Authorization: Bearer <token>"
```

**Get Document Details**:
```bash
curl http://localhost:3000/documents/<documentId> \
  -H "Authorization: Bearer <token>"
```

**Download Document**:
```bash
curl http://localhost:3000/documents/<documentId>/download \
  -H "Authorization: Bearer <token>" \
  -o downloaded-cv.pdf
```

**Delete Document**:
```bash
curl -X DELETE http://localhost:3000/documents/<documentId> \
  -H "Authorization: Bearer <token>"
```

#### 2. CV Parser API

**Parse Existing Document**:
```bash
curl -X POST http://localhost:3000/cv-parser/parse/<documentId> \
  -H "Authorization: Bearer <token>"

# Expected Response:
# {
#   "extractedText": "Full CV text content...",
#   "parsedData": {
#     "personalInfo": {
#       "fullName": "John Doe",
#       "email": "john.doe@example.com",
#       "phone": "+62 812-3456-7890",
#       "dateOfBirth": "1995-05-15",
#       "address": "Jakarta, Indonesia"
#     },
#     "education": [{
#       "institution": "University of Indonesia",
#       "degree": "Bachelor",
#       "major": "Computer Science",
#       "gpa": "3.75",
#       "startYear": "2013",
#       "endYear": "2017"
#     }],
#     "workExperience": [{
#       "company": "Tech Company",
#       "position": "Software Engineer",
#       "startDate": "2017-08",
#       "endDate": "2020-12",
#       "description": "Developed web applications..."
#     }],
#     "organizationExperience": [{
#       "organization": "Student Association",
#       "role": "Vice President",
#       "startDate": "2015-01",
#       "endDate": "2016-12",
#       "description": "Led team of 20 members..."
#     }],
#     "skills": ["JavaScript", "Python", "React", "Node.js"],
#     "certifications": [{
#       "name": "AWS Certified Developer",
#       "issuer": "Amazon Web Services",
#       "date": "2020-06"
#     }]
#   }
# }
```

**Parse File Directly**:
```bash
curl -X POST http://localhost:3000/cv-parser/parse-file \
  -H "Authorization: Bearer <token>" \
  -F "file=@sample-cv.pdf"

# Returns same structure as above
```

#### 3. Integration Test (Full Flow)

```bash
# Step 1: Login
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"candidate@example.com","password":"password123"}' \
  | jq -r '.access_token')

# Step 2: Upload CV
DOC_ID=$(curl -X POST http://localhost:3000/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample-cv.pdf" \
  -F "documentTypeId=1" \
  | jq -r '.id')

# Step 3: Parse CV
curl -X POST http://localhost:3000/cv-parser/parse/$DOC_ID \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# Step 4: (Future) Submit parsed data to profile APIs
# POST /candidates/personal-info
# POST /candidates/education
# etc.
```

## Implementation Steps

### Phase 1: Database & Dependencies
1. ⬜ **Database Schema** - Add DocumentType and CandidateDocument models
2. ⬜ **Run Migration** - `npx prisma migrate dev --name add_candidate_documents`
3. ⬜ **Install Dependencies** - pdf-parse, mammoth, @types/multer

### Phase 2: Documents Module (Upload & Storage)
4. ⬜ **Multer Configuration** - File upload settings, validation, storage
5. ⬜ **Documents Service** - Upload, retrieve, delete, download logic
6. ⬜ **Documents Controller** - REST endpoints for document CRUD
7. ⬜ **Documents Module** - Wire up service, controller, exports
8. ⬜ **Test Upload** - Verify file upload and storage works

### Phase 3: CV Parser Module (Parsing & Extraction)
9. ⬜ **Text Extractor Service** - PDF and DOCX text extraction
10. ⬜ **Data Extractor Service** - Regex-based data parsing logic
11. ⬜ **CV Parser Service** - Orchestrate extraction and parsing
12. ⬜ **CV Parser Controller** - REST endpoints for parsing
13. ⬜ **CV Parser Module** - Wire up services, controller, exports
14. ⬜ **Test Parsing** - Verify parsing returns structured data

### Phase 4: Integration & Testing
15. ⬜ **App Module** - Import DocumentsModule and CVParserModule
16. ⬜ **Seed Script** - Create document types seed data
17. ⬜ **Test Scripts** - Automated tests for upload and parsing
18. ⬜ **Sample Files** - Create test CV files (PDF, DOCX)
19. ⬜ **Swagger Documentation** - Update API docs for all endpoints
20. ⬜ **Integration Test** - Full workflow test (upload → parse)

### Phase 5: Security & Validation
21. ⬜ **Authorization** - Ensure candidates can only access their documents
22. ⬜ **File Validation** - MIME type, size, extension checks
23. ⬜ **Error Handling** - Proper error messages for all scenarios
24. ⬜ **Cleanup** - Remove temporary files, handle failed uploads

## Success Criteria

### Documents API (Upload & Storage)
- ✅ Candidate can upload CV (PDF/DOCX) via API
- ✅ File is stored securely on disk with UUID filename
- ✅ Document metadata is saved to database
- ✅ Candidate can retrieve list of their documents
- ✅ Candidate can download their original files
- ✅ Candidate can delete their documents
- ✅ Authorization: candidates can only access their own documents
- ✅ File validation: only PDF/DOCX, max 10MB

### CV Parser API (Parsing & Extraction)
- ✅ Can parse PDF files and extract text
- ✅ Can parse DOCX files and extract text
- ✅ Extracted text is returned in response
- ✅ Structured data is parsed from text:
  - ✅ Personal info (name, email, phone, DOB, address)
  - ✅ Education (institution, degree, major, GPA, years)
  - ✅ Work experience (company, position, dates, description)
  - ✅ Organization experience (org, role, dates, description)
  - ✅ Skills (array of skills)
  - ✅ Certifications (name, issuer, date)
- ✅ Can parse existing document by ID
- ✅ Can parse uploaded file directly without storing

### General
- ✅ All endpoints are authenticated via JWT
- ✅ Swagger documentation is complete and accurate
- ✅ Test scripts validate all functionality
- ✅ Error handling for unsupported files, parsing failures
- ✅ Proper HTTP status codes and error messages

## Scope Clarification

### ✅ THIS ISSUE (#2) - CV Upload & Parsing
**What we're building:**
1. **Documents API** - Upload, store, retrieve, download, delete CV files
2. **CV Parser API** - Extract text and parse structured data from CVs
3. Database models for documents
4. File storage system
5. Text extraction (PDF/DOCX)
6. Regex-based data parsing
7. Return parsed data as JSON response

**What we're NOT building (separate issues):**
- ❌ Storing parsed data to candidate profile (handled in issues #4-#13)
- ❌ Candidate profile CRUD APIs (handled in issues #4-#13)
- ❌ Personal information API (issue #6)
- ❌ Address API (issue #7)
- ❌ Education API (issue #8)
- ❌ Work experience API (issue #9)
- ❌ Organization experience API (issue #10)
- ❌ Family API (issue #11)
- ❌ Skills & certification API (issue #12)
- ❌ Supporting documents API (issue #13)

### Frontend Integration Flow
1. **Upload**: Frontend calls `POST /documents/upload` with CV file
2. **Parse**: Frontend calls `POST /cv-parser/parse/:documentId` to get structured data
3. **Display**: Frontend displays parsed data to user for review/editing
4. **Store**: User reviews and submits data via respective profile APIs (issues #4-#13)

### Key Architectural Decision
**Separation of concerns:**
- Documents module = File storage only
- CV Parser module = Data extraction only
- Candidate Profile modules = Data persistence (separate issues)

This allows:
- Independent development and testing
- Flexibility to swap parsing implementations
- Clear API boundaries
- Better maintainability

## Future Enhancements (Not in This Implementation)

### Parsing Improvements
- AI-based parsing using OpenAI/Claude API for better accuracy
- Machine learning model for CV classification
- Multi-language CV support (detect language, parse accordingly)
- Table extraction (skills matrix, education table)
- Logo/company detection from images
- Resume formatting and standardization

### File Management
- Support for more file formats (RTF, TXT, images with OCR)
- Cloud storage integration (S3, Azure Blob, Google Cloud Storage)
- Virus scanning for uploaded files (ClamAV integration)
- Duplicate detection (hash-based)
- File compression and optimization
- Automatic backup and archival

### Advanced Features
- CV scoring and matching against job requirements
- Skills validation and normalization (map synonyms)
- Industry/company detection and categorization
- Salary expectation extraction
- LinkedIn profile import
- Batch CV processing
- CV comparison and ranking
- Analytics dashboard for CV quality

## Notes

### Technical Notes
- This implementation focuses on **basic CV upload and parsing** with regex-based extraction
- For production-grade parsing, consider integrating AI services (OpenAI, Google Document AI, Azure Form Recognizer)
- Ensure adequate disk space for file storage (or use cloud storage)
- Implement cleanup jobs for old/unused documents
- Consider caching parsed data in document record to avoid re-parsing
- Use UUID for filenames to prevent collisions and path traversal attacks

### Performance Considerations
- PDF parsing can be slow for large files (consider background jobs)
- Set appropriate timeouts for parsing operations
- Consider queue system for batch processing (Bull, BullMQ)
- Monitor disk space usage

### Security Considerations
- Always validate file type on server (don't trust client MIME type)
- Scan files for malware before processing
- Limit file size to prevent DoS attacks
- Use UUID filenames to prevent path traversal
- Store files outside web root
- Implement rate limiting on upload endpoints
- Log all upload and parsing activities

### Testing Recommendations
- Test with various CV formats (different structures, languages)
- Test with corrupted/malformed files
- Test with very large files
- Test with files containing special characters
- Load testing for concurrent uploads
- Integration tests with real-world CV samples

git fetch origin
git checkout 2-create-backend-api-for-handle-upload-cv-candidate-and-parsing-to-autofill-form-candidate