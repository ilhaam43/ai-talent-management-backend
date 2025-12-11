# Implementation Plan - Store Parsed CV Data to Database

## Goal Description

Create an API service that accepts parsed CV data (from CV Parser API) and stores it into the candidate profile database tables. This service will:

1. Accept parsed candidate data from CV parsing results
2. Map parsed data to database schema (handling reference data lookups)
3. Store data in appropriate candidate profile tables:
   - Personal Information → `candidates` table
   - Address → `candidate_addreseses` / `candidate_current_addreseses` tables
   - Education → `candidate_educations` table
   - Work Experience → `candidate_work_experiences` table
   - Organization Experience → `candidate_org_experiences` table
   - Skills → `candidate_skills` table
   - Certifications → `candidate_certification` table
   - Social Media → `candidate_social_media` table
4. Use JWT authentication to identify the candidate
5. Handle data validation and reference data lookups (religion, nationality, gender, etc.)
6. Support both "store all" and "store specific section" operations

## User Review Required

**IMPORTANT NOTES:**

1. **Integration with Existing APIs**:
   - This service integrates with the CV Parser API (Issue #2)
   - Uses JWT authentication (already implemented)
   - Works with existing database schema (no schema changes needed)

2. **Data Mapping Strategy**:
   - Parse string values to enums (JobType, FieldOfWork, Industry, Country, etc.)
   - Lookup reference data (Religion, Nationality, Gender, SocialMedia, etc.)
   - Handle date parsing from various formats
   - Map address components to geo tables (Province, City, Subdistrict, PostalCode)

3. **API Design**:
   - **Option 1**: Single endpoint that stores all parsed data at once
   - **Option 2**: Separate endpoints for each section (more granular control)
   - **Recommended**: Both - main endpoint for "store all" + individual endpoints for specific sections

4. **Data Validation**:
   - Validate required fields before storing
   - Handle missing reference data gracefully (create or skip)
   - Validate date formats and parse correctly
   - Handle enum value mismatches

5. **Transaction Handling**:
   - Use database transactions for atomic operations
   - Rollback on errors to maintain data consistency

## Proposed Changes

### 1. Database Schema

**NO CHANGES NEEDED** - All required tables already exist in `schema.prisma`:
- `candidates` - Personal information
- `candidate_addreseses` / `candidate_current_addreseses` - Address data
- `candidate_educations` - Education history
- `candidate_work_experiences` - Work experience
- `candidate_org_experiences` - Organization experience
- `candidate_skills` - Skills with ratings
- `candidate_certification` - Certifications
- `candidate_social_media` - Social media links
- Reference tables: `religions`, `nationalities`, `genders`, `social_media`, `candidate_last_educations`, etc.

**ACTION**: Ensure reference data is seeded (religions, nationalities, genders, social_media types, etc.)

### 2. Install Dependencies

**NO NEW DEPENDENCIES** - All required packages already installed:
- Prisma (database ORM)
- NestJS (framework)
- JWT (authentication)
- class-validator, class-transformer (validation)

### 3. Candidate Profile Service Module

**[NEW]** `src/candidate-profile/candidate-profile.module.ts`
- Create CandidateProfileModule
- Import CandidatesModule, DatabaseModule
- Export CandidateProfileService

**[NEW]** `src/candidate-profile/candidate-profile.service.ts`
- `storeParsedData(candidateId, parsedData)`: Store all parsed data sections
- `storePersonalInfo(candidateId, personalInfo)`: Store personal information
- `storeAddress(candidateId, address, isCurrent)`: Store address (domicile or current)
- `storeEducation(candidateId, education[])`: Store education history
- `storeWorkExperience(candidateId, workExperience[])`: Store work experience
- `storeOrganizationExperience(candidateId, orgExperience[])`: Store organization experience
- `storeSkills(candidateId, skills[])`: Store skills
- `storeCertifications(candidateId, certifications[])`: Store certifications
- `storeSocialMedia(candidateId, socialMedia)`: Store social media links

**Helper Methods**:
- `findOrCreateReferenceData(type, value)`: Lookup or create reference data
- `parseDate(dateString)`: Parse various date formats to Date
- `mapEnumValue(enumType, value)`: Map string to enum value
- `findOrCreateAddress(addressData)`: Create address record with geo lookup
- `mapEducationLevel(level)`: Map education level to CandidateLastEducation

**[NEW]** `src/candidate-profile/candidate-profile.controller.ts`
- `POST /candidate-profile/store-parsed-data` - Store all parsed data at once
- `POST /candidate-profile/personal-info` - Store personal information only
- `POST /candidate-profile/address` - Store address (with `isCurrent` flag)
- `POST /candidate-profile/education` - Store education history
- `POST /candidate-profile/work-experience` - Store work experience
- `POST /candidate-profile/organization-experience` - Store organization experience
- `POST /candidate-profile/skills` - Store skills
- `POST /candidate-profile/certifications` - Store certifications
- `POST /candidate-profile/social-media` - Store social media links

**All endpoints**:
- Protected with `@UseGuards(AuthGuard('jwt'))`
- Extract candidateId from JWT token
- Use Swagger decorators for API documentation

**[NEW]** `src/candidate-profile/dto/store-parsed-data.dto.ts`
- DTOs for each section matching `ParsedCandidateData` structure
- Validation decorators for required fields
- Transform decorators for date parsing

### 4. Reference Data Lookup Service

**[NEW]** `src/candidate-profile/services/reference-data.service.ts`
- `findOrCreateReligion(name)`: Find or create religion
- `findOrCreateNationality(name)`: Find or create nationality
- `findOrCreateGender(name)`: Find or create gender
- `findOrCreateSocialMediaType(name)`: Find or create social media type
- `findOrCreateEducationLevel(level)`: Find or create education level
- `findOrCreateAddress(province, city, subdistrict, postalCode)`: Find or create address with geo lookup

### 5. Data Mapping Utilities

**[NEW]** `src/candidate-profile/utils/data-mapper.util.ts`
- `parseDate(dateString)`: Parse various date formats (DD/MM/YYYY, YYYY-MM-DD, "August 2017", etc.)
- `mapJobType(jobTypeString)`: Map to JobType enum
- `mapFieldOfWork(fieldString)`: Map to FieldOfWork enum
- `mapIndustry(industryString)`: Map to Industry enum
- `mapCountry(countryString)`: Map to Country enum
- `mapRelationship(relationshipString)`: Map to Relationship enum
- `mapFamilyStatus(statusString)`: Map to FamilyStatus enum
- `mapCandidateRating(ratingString)`: Map to CandidateRating enum
- `normalizeEducationLevel(level)`: Normalize education level strings

### 6. Address Geo Lookup Service

**[NEW]** `src/candidate-profile/services/address-lookup.service.ts`
- `findOrCreateProvince(name)`: Find or create province
- `findOrCreateCity(provinceId, cityName)`: Find or create city
- `findOrCreateSubdistrict(cityId, subdistrictName)`: Find or create subdistrict
- `findOrCreatePostalCode(subdistrictId, postalCode)`: Find or create postal code
- `createAddressRecord(userId, provinceId, cityId, subdistrictId, postalCodeId, address)`: Create address record

## API Endpoints

### 1. Store All Parsed Data

**POST** `/candidate-profile/store-parsed-data`

**Request Body**:
```json
{
  "parsedData": {
    "personalInfo": {
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+62 812-3456-7890",
      "dateOfBirth": "15-05-1995",
      "placeOfBirth": "Jakarta",
      "idCardNumber": "1234567890123456",
      "gender": "Male",
      "maritalStatus": "Single",
      "nationality": "Indonesian",
      "religion": "Islam",
      "nickname": "John"
    },
    "address": {
      "province": "DKI Jakarta",
      "city": "Jakarta Selatan",
      "subdistrict": "Kebayoran Baru",
      "postalCode": "12120"
    },
    "education": [...],
    "workExperience": [...],
    "organizationExperience": [...],
    "skills": [...],
    "certifications": [...],
    "socialMedia": {...}
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Candidate profile data stored successfully",
  "data": {
    "personalInfo": { "id": "..." },
    "address": { "id": "..." },
    "education": [{ "id": "..." }],
    "workExperience": [{ "id": "..." }],
    "organizationExperience": [{ "id": "..." }],
    "skills": [{ "id": "..." }],
    "certifications": [{ "id": "..." }],
    "socialMedia": [{ "id": "..." }]
  }
}
```

### 2. Store Personal Information

**POST** `/candidate-profile/personal-info`

**Request Body**:
```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+62 812-3456-7890",
  "dateOfBirth": "15-05-1995",
  "placeOfBirth": "Jakarta",
  "idCardNumber": "1234567890123456",
  "gender": "Male",
  "maritalStatus": "Single",
  "nationality": "Indonesian",
  "religion": "Islam",
  "nickname": "John"
}
```

### 3. Store Address

**POST** `/candidate-profile/address`

**Request Body**:
```json
{
  "province": "DKI Jakarta",
  "city": "Jakarta Selatan",
  "subdistrict": "Kebayoran Baru",
  "postalCode": "12120",
  "address": "Jl. Example No. 123",
  "isCurrent": false
}
```

### 4. Store Education

**POST** `/candidate-profile/education`

**Request Body**:
```json
{
  "education": [
    {
      "educationLevel": "Bachelor",
      "university": "University of Indonesia",
      "major": "Computer Science",
      "gpa": "3.75",
      "gpaMax": "4.00",
      "startYear": "2013",
      "endYear": "2017",
      "country": "Indonesia",
      "city": "Jakarta"
    }
  ]
}
```

### 5. Store Work Experience

**POST** `/candidate-profile/work-experience`

**Request Body**:
```json
{
  "workExperience": [
    {
      "company": "Tech Company",
      "position": "Software Engineer",
      "jobType": "FULL_TIME",
      "fieldOfWork": "IT",
      "industry": "TECHNOLOGY",
      "startDate": "August 2017",
      "endDate": "December 2020",
      "description": "Developed web applications...",
      "country": "INDONESIA"
    }
  ]
}
```

### 6. Store Organization Experience

**POST** `/candidate-profile/organization-experience`

**Request Body**:
```json
{
  "organizationExperience": [
    {
      "organization": "Student Association",
      "role": "Vice President",
      "startDate": "2015",
      "endDate": "2016",
      "description": "Led team of 20 members...",
      "location": "Jakarta"
    }
  ]
}
```

### 7. Store Skills

**POST** `/candidate-profile/skills`

**Request Body**:
```json
{
  "skills": [
    {
      "skill": "JavaScript",
      "rating": "FOUR"
    },
    {
      "skill": "TypeScript",
      "rating": "THREE"
    }
  ]
}
```

### 8. Store Certifications

**POST** `/candidate-profile/certifications`

**Request Body**:
```json
{
  "certifications": [
    {
      "name": "AWS Certified Developer",
      "issuer": "Amazon Web Services",
      "startDate": "June 2020",
      "endDate": "June 2023",
      "location": "Online",
      "description": "Cloud computing certification"
    }
  ]
}
```

### 9. Store Social Media

**POST** `/candidate-profile/social-media`

**Request Body**:
```json
{
  "linkedin": "https://linkedin.com/in/johndoe",
  "instagram": "johndoe",
  "facebook": "johndoe",
  "tiktok": "johndoe"
}
```

## Data Mapping Logic

### Personal Information Mapping

```typescript
// Map to candidates table
{
  candidateFullname: personalInfo.fullName,
  candidateNickname: personalInfo.nickname,
  candidateEmail: personalInfo.email,
  dateOfBirth: parseDate(personalInfo.dateOfBirth),
  placeOfBirth: personalInfo.placeOfBirth,
  idCardNumber: personalInfo.idCardNumber,
  religionId: await findOrCreateReligion(personalInfo.religion),
  nationalityId: await findOrCreateNationality(personalInfo.nationality),
  // Note: gender and maritalStatus need separate lookup tables if not in Candidate model
}
```

### Address Mapping

```typescript
// 1. Lookup/create geo data
const province = await findOrCreateProvince(address.province);
const city = await findOrCreateCity(province.id, address.city);
const subdistrict = await findOrCreateSubdistrict(city.id, address.subdistrict);
const postalCode = await findOrCreatePostalCode(subdistrict.id, address.postalCode);

// 2. Create address record
const addressRecord = await createAddressRecord(
  candidateId,
  province.id,
  city.id,
  subdistrict.id,
  postalCode.id,
  address.address
);

// 3. Link to candidate
await updateCandidate(candidateId, {
  candidateAddressId: addressRecord.id, // or candidateCurrentAddressId
});
```

### Education Mapping

```typescript
// Map each education entry
for (const edu of education) {
  const educationLevel = await findOrCreateEducationLevel(edu.educationLevel);
  
  await createEducation({
    candidateId,
    candidateLastEducationId: educationLevel.id,
    candidateSchool: edu.university,
    candidateMajor: edu.major,
    candidateGpa: edu.gpa,
    candidateMaxGpa: edu.gpaMax,
    candidateCountry: edu.country,
    candidateStartedYearStudy: parseDate(edu.startYear),
    candidateEndedYearStudy: parseDate(edu.endYear),
  });
}
```

### Work Experience Mapping

```typescript
// Map each work experience
for (const work of workExperience) {
  await createWorkExperience({
    candidateId,
    companyName: work.company,
    jobTitle: work.position,
    jobType: mapJobType(work.jobType), // Enum mapping
    fieldOfWork: mapFieldOfWork(work.fieldOfWork),
    industry: mapIndustry(work.industry),
    employmentStartedDate: parseDate(work.startDate),
    employmentEndedDate: parseDate(work.endDate),
    workExperienceDescription: work.description,
    country: mapCountry(work.country),
    reasonForResignation: work.reasonForResignation,
    benefit: work.benefit,
    referenceName: work.referenceName,
    phoneNumber: work.referencePhone,
    relationship: mapRelationship(work.referenceRelationship),
  });
}
```

### Skills Mapping

```typescript
// Map each skill
for (const skill of skills) {
  await createSkill({
    candidateId,
    candidateSkills: skill,
    candidateRating: mapCandidateRating("THREE"), // Default or from parsing
  });
}
```

### Certifications Mapping

```typescript
// Map each certification
for (const cert of certifications) {
  await createCertification({
    candidateId,
    certificationTitle: cert.name,
    institutionName: cert.issuer,
    location: cert.location,
    certificationStartDate: parseDate(cert.startDate),
    certificationEndedDate: parseDate(cert.endDate),
    certificationDescription: cert.description,
  });
}
```

### Social Media Mapping

```typescript
// Map each social media platform
const socialMediaTypes = {
  linkedin: await findOrCreateSocialMediaType("LinkedIn"),
  instagram: await findOrCreateSocialMediaType("Instagram"),
  facebook: await findOrCreateSocialMediaType("Facebook"),
  tiktok: await findOrCreateSocialMediaType("TikTok"),
};

for (const [platform, url] of Object.entries(socialMedia)) {
  if (url) {
    await createSocialMedia({
      candidateId,
      candidateSocialMediaId: socialMediaTypes[platform].id,
      candidateSocialMediaUrl: url,
    });
  }
}
```

## Error Handling

1. **Missing Reference Data**: Create if possible, or skip with warning
2. **Invalid Date Formats**: Log warning and skip invalid dates
3. **Enum Value Mismatches**: Use default value or skip with error
4. **Database Errors**: Rollback transaction and return error
5. **Validation Errors**: Return 400 with validation details

## Transaction Management

Use Prisma transactions for atomic operations:

```typescript
await this.prisma.$transaction(async (tx) => {
  // Store all data in single transaction
  // Rollback on any error
});
```

## Testing Plan

### Unit Tests
- Test data mapping functions
- Test reference data lookup
- Test date parsing
- Test enum mapping

### Integration Tests
- Test storing complete parsed data
- Test storing individual sections
- Test error handling
- Test transaction rollback

### E2E Tests
- Test full flow: Upload CV → Parse → Store Data
- Test with real CV files
- Test with missing/invalid data

## Security Considerations

1. **Authentication**: All endpoints require JWT authentication
2. **Authorization**: Candidates can only store data for themselves (from JWT token)
3. **Input Validation**: Validate all input data before storing
4. **SQL Injection**: Using Prisma ORM (parameterized queries)
5. **Data Sanitization**: Sanitize string inputs

## Performance Considerations

1. **Batch Operations**: Use batch inserts for arrays (education, work experience, etc.)
2. **Reference Data Caching**: Cache reference data lookups
3. **Transaction Size**: Limit transaction size for large datasets
4. **Async Operations**: Use async/await for database operations

## Success Criteria

- ✅ API accepts parsed CV data and stores to database
- ✅ All data sections are properly mapped to database schema
- ✅ Reference data lookups work correctly
- ✅ Date parsing handles various formats
- ✅ Enum mapping works for all enum types
- ✅ Transaction rollback on errors
- ✅ JWT authentication enforced
- ✅ Input validation implemented
- ✅ Swagger documentation complete
- ✅ Error handling comprehensive

## Next Steps After Implementation

1. Create test script to verify end-to-end flow
2. Create walkthrough documentation
3. Test with various CV formats
4. Handle edge cases and improve error messages

---

**Issue**: #5 - Create API Service to create candidate data after upload CV  
**Status**: 📋 Planning  
**Dependencies**: Issue #2 (CV Upload & Parse), JWT Auth


