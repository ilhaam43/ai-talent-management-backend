# Issue #5: Store Parsed CV Data to Database

## 📋 Overview

Implementation of API service to store parsed CV data (from CV Parser API) into candidate profile database tables.

**Issue**: #5 - Create API Service to create candidate data after upload CV  
**Status**: 📋 Planning  
**Implementation Date**: TBD

## 📚 Documentation

### 1. [Implementation Plan](./IMPLEMENTATION_PLAN_STORE_PARSED_DATA.md)
Complete implementation plan with:
- Goal description
- API endpoints design
- Data mapping strategy
- Reference data lookup
- Error handling
- Testing plan

### 2. Walkthrough (To be created)
Complete implementation walkthrough with:
- What was implemented
- How to use
- Testing instructions
- Troubleshooting

## 🎯 What Will Be Implemented

### Candidate Profile Service
- Store parsed personal information to `candidates` table
- Store address data to `candidate_addreseses` / `candidate_current_addreseses` tables
- Store education history to `candidate_educations` table
- Store work experience to `candidate_work_experiences` table
- Store organization experience to `candidate_org_experiences` table
- Store skills to `candidate_skills` table
- Store certifications to `candidate_certification` table
- Store social media links to `candidate_social_media` table

### Reference Data Management
- Automatic lookup/creation of reference data:
  - Religions
  - Nationalities
  - Genders
  - Social Media Types
  - Education Levels
  - Geo data (Provinces, Cities, Subdistricts, Postal Codes)

### Data Mapping & Transformation
- Date parsing from various formats
- Enum value mapping (JobType, FieldOfWork, Industry, Country, etc.)
- Address geo lookup and creation
- Education level normalization

## 🔗 Related Documentation

- [Issue #2: CV Upload & Parse](../issue-2-cv-upload-parse/README.md)
- [Main Documentation](../README.md)
- [Database Schema](../../prisma/schema.prisma)

## 📝 Notes

- This implementation stores parsed CV data to database
- Requires CV Upload & Parse API (Issue #2) to be completed first
- Uses existing database schema (no migrations needed)
- All endpoints protected with JWT authentication
- Supports both "store all" and "store specific section" operations

---

**Next Steps**: Review implementation plan, then proceed with implementation


