# Database Schema - AI Talent Management System

## Lookup/Reference Tables

### user_roles
- `id` - Primary Key
- `role_name` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### job_roles
- `id` - Primary Key
- `job_role_name` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### directorates
- `id` - Primary Key
- `directorate_name` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### groups
- `id` - Primary Key
- `group_name` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### divisions
- `id` - Primary Key
- `division_name` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### departments
- `id` - Primary Key
- `department_name` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### sub_departments
- `id` - Primary Key
- `sub_department_name` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### employee_positions
- `id` - Primary Key
- `employee_position` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### application_statuses
- `id` - Primary Key
- `application_status` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### application_pipelines
- `id` - Primary Key
- `application_pipeline` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### application_pipeline_statuses
- `id` - Primary Key
- `application_pipeline_status` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### job_vacancy_statuses
- `id` - Primary Key
- `job_vacancy_status` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_last_educations
- `id` - Primary Key
- `candidate_education` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### job_vacancy_durations
- `id` - Primary Key
- `days_duration` - INTEGER
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### employment_types
- `id` - Primary Key
- `employment_type` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### document_types
- `id` - Primary Key
- `document_type` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### religions
- `id` - Primary Key
- `religion` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### marital_statuses
- `id` - Primary Key
- `marital_status` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### nationalities
- `id` - Primary Key
- `nationality` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### language_proficiencies
- `id` - Primary Key
- `language_proficiency` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### genders
- `id` - Primary Key
- `gender` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### social_media
- `id` - Primary Key
- `social_media` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

---

## Location Tables

### provinces
- `id` - Primary Key
- `province` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### cities
- `id` - Primary Key
- `province_id` - Foreign Key → provinces(id)
- `city` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### subdistricts
- `id` - Primary Key
- `city_id` - Foreign Key → cities(id)
- `subdistrict` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### postal_codes
- `id` - Primary Key
- `subdistrict_id` - Foreign Key → subdistricts(id)
- `postal_code` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

---

## Permission & Role Tables

### permissions
- `id` - Primary Key
- `permission_name` - VARCHAR
- `description` - TEXT
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### role_permissions
- `id` - Primary Key
- `user_role_id` - Foreign Key → user_roles(id)
- `permission_id` - Foreign Key → permissions(id)
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

---

## User & Employee Tables

### users
- `id` - Primary Key
- `name` - VARCHAR
- `email` - VARCHAR (UNIQUE)
- `email_verified_at` - TIMESTAMP (NULLABLE)
- `password` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### employees
- `id` - Primary Key
- `user_id` - Foreign Key → users(id)
- `user_role_id` - Foreign Key → user_roles(id)
- `employee_position_id` - Foreign Key → employee_positions(id)
- `directorate_id` - Foreign Key → directorates(id) (NULLABLE)
- `group_id` - Foreign Key → groups(id) (NULLABLE)
- `division_id` - Foreign Key → divisions(id) (NULLABLE)
- `department_id` - Foreign Key → departments(id) (NULLABLE)
- `sub_department_id` - Foreign Key → sub_departments(id) (NULLABLE)
- `employee_identification_number` - VARCHAR (UNIQUE)
- `phone_number` - VARCHAR
- `date_of_birth` - DATE
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

---

## Job Vacancy Tables

### job_vacancies
- `id` - Primary Key
- `job_role_id` - Foreign Key → job_roles(id)
- `employee_position_id` - Foreign Key → employee_positions(id)
- `job_vacancy_status_id` - Foreign Key → job_vacancy_statuses(id)
- `job_vacancy_duration_id` - Foreign Key → job_vacancy_durations(id)
- `employment_type_id` - Foreign Key → employment_types(id)
- `directorate_id` - Foreign Key → directorates(id) (NULLABLE)
- `group_id` - Foreign Key → groups(id) (NULLABLE)
- `division_id` - Foreign Key → divisions(id) (NULLABLE)
- `department_id` - Foreign Key → departments(id) (NULLABLE)
- `sub_department_id` - Foreign Key → sub_departments(id) (NULLABLE)
- `job_requirement` - TEXT
- `job_qualification` - TEXT
- `job_vacancy_closed_at` - DATE (NULLABLE)
- `city_location` - VARCHAR
- `min_salary` - DECIMAL(15,2) (NULLABLE)
- `max_salary` - DECIMAL(15,2) (NULLABLE)
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

---

## Candidate Tables

### candidate_addresses
- `id` - Primary Key
- `user_id` - Foreign Key → users(id)
- `province` - VARCHAR
- `city` - VARCHAR
- `subdistrict` - VARCHAR
- `postal_code` - VARCHAR
- `candidate_address` - TEXT
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_current_addresses
- `id` - Primary Key
- `user_id` - Foreign Key → users(id)
- `province` - VARCHAR
- `city` - VARCHAR
- `subdistrict` - VARCHAR
- `postal_code` - VARCHAR
- `candidate_address` - TEXT
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidates
- `id` - Primary Key
- `user_id` - Foreign Key → users(id)
- `candidate_last_education_id` - Foreign Key → candidate_last_educations(id)
- `religion_id` - Foreign Key → religions(id)
- `marital_status_id` - Foreign Key → marital_statuses(id)
- `nationality_id` - Foreign Key → nationalities(id)
- `language_proficiency_id` - Foreign Key → language_proficiencies(id)
- `gender_id` - Foreign Key → genders(id)
- `candidate_address_id` - Foreign Key → candidate_addresses(id)
- `candidate_current_address_id` - Foreign Key → candidate_current_addresses(id)
- `candidate_fullname` - VARCHAR
- `candidate_nickname` - VARCHAR
- `candidate_email` - VARCHAR (UNIQUE)
- `city_domicile` - VARCHAR
- `date_of_birth` - DATE
- `place_of_birth` - VARCHAR
- `id_card_number` - VARCHAR (UNIQUE)
- `phone_number` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_salaries
- `id` - Primary Key
- `candidate_id` - Foreign Key → candidates(id)
- `current_salary` - DECIMAL(15,2) (NULLABLE)
- `expectation_salary` - DECIMAL(15,2) (NULLABLE)
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_applications
- `id` - Primary Key
- `job_vacancy_id` - Foreign Key → job_vacancies(id)
- `candidate_id` - Foreign Key → candidates(id)
- `candidate_salary_id` - Foreign Key → candidate_salaries(id)
- `application_status_id` - Foreign Key → application_statuses(id)
- `fit_score` - DECIMAL(5,2)
- `submission_date` - DATE
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_work_experiences
- `id` - Primary Key
- `candidate_id` - Foreign Key → candidates(id)
- `company_name` - VARCHAR
- `job_title` - VARCHAR
- `job_type` - ENUM('Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship')
- `field_of_work` - VARCHAR
- `industry` - VARCHAR
- `employment_started_date` - DATE
- `employment_ended_date` - DATE (NULLABLE)
- `work_experience_description` - TEXT
- `country` - VARCHAR
- `reason_for_resignation` - TEXT (NULLABLE)
- `benefit` - TEXT (NULLABLE)
- `reference_name` - VARCHAR
- `reference_phone_number` - VARCHAR
- `reference_relationship` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_organization_experiences
- `id` - Primary Key
- `candidate_id` - Foreign Key → candidates(id)
- `organization_name` - VARCHAR
- `role` - VARCHAR
- `organization_experience_started_date` - DATE
- `organization_experience_ended_date` - DATE (NULLABLE)
- `organization_experience_description` - TEXT
- `location` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_educations
- `id` - Primary Key
- `candidate_id` - Foreign Key → candidates(id)
- `candidate_last_education_id` - Foreign Key → candidate_last_educations(id)
- `candidate_school` - VARCHAR
- `candidate_major` - VARCHAR
- `candidate_gpa` - DECIMAL(3,2)
- `candidate_max_gpa` - DECIMAL(3,2)
- `candidate_country` - VARCHAR
- `candidate_started_year_study` - DATE
- `candidate_ended_year_study` - DATE (NULLABLE)
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_families
- `id` - Primary Key
- `candidate_id` - Foreign Key → candidates(id)
- `family_status` - ENUM('Father', 'Mother', 'Sibling', 'Spouse', 'Child')
- `family_name` - VARCHAR
- `family_job` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_families_lintasarta
- `id` - Primary Key
- `candidate_id` - Foreign Key → candidates(id)
- `family_status` - ENUM('Father', 'Mother', 'Sibling', 'Spouse', 'Child')
- `family_name` - VARCHAR
- `family_position` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_social_media
- `id` - Primary Key
- `candidate_id` - Foreign Key → candidates(id)
- `social_media_id` - Foreign Key → social_media(id)
- `candidate_social_media_url` - TEXT
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_skills
- `id` - Primary Key
- `candidate_id` - Foreign Key → candidates(id)
- `candidate_skill` - VARCHAR
- `candidate_rating` - ENUM('1', '2', '3', '4', '5')
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_certifications
- `id` - Primary Key
- `candidate_id` - Foreign Key → candidates(id)
- `certification_title` - VARCHAR
- `institution_name` - VARCHAR
- `location` - VARCHAR
- `certification_start_date` - DATE
- `certification_ended_date` - DATE (NULLABLE)
- `certification_description` - TEXT (NULLABLE)
- `file_path` - VARCHAR
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_application_pipelines
- `id` - Primary Key
- `candidate_application_id` - Foreign Key → candidate_applications(id)
- `application_pipeline_id` - Foreign Key → application_pipelines(id)
- `application_pipeline_status_id` - Foreign Key → application_pipeline_statuses(id)
- `notes` - TEXT (NULLABLE)
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### candidate_documents
- `id` - Primary Key
- `candidate_id` - Foreign Key → candidates(id)
- `document_type_id` - Foreign Key → document_types(id)
- `file_path` - VARCHAR
- `extracted_text` - LONGTEXT (NULLABLE)
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

---

## Key Changes & Corrections

### Table Name Corrections:
- `group` → `groups` (reserved keyword)
- `subdistricties` → `subdistricts` (typo)
- `candidate_addreseses` → `candidate_addresses` (typo)
- `candidate_current_addreseses` → `candidate_current_addresses` (typo)
- `candidate_certification` → `candidate_certifications` (plural)

### Column Name Corrections:
- `cities` column in cities table → `city`
- `subdistricties` → `subdistrict`
- `postal_codes` → `postal_code`
- `directorates_id` → `directorate_id` (consistent naming)
- `job_vacancy_durations_id` → `job_vacancy_duration_id`
- `candidate_education_id` (duplicate in candidates table - removed one)
- `language_proficieny_id` → `language_proficiency_id` (typo)
- `candidate email` → `candidate_email` (space removed)
- `job_vacancies_id` → `job_vacancy_id` (singular)
- `candidates_id` → `candidate_id` (singular)
- `candidate_skills` → `candidate_skill` (singular for individual skill)
- `phone_number` in work experiences → `reference_phone_number` (clarity)
- `relationship` → `reference_relationship` (clarity)

### Data Type Corrections:
- Salary fields: `STRING` → `DECIMAL(15,2)`
- `fit_score`: `FLOAT` → `DECIMAL(5,2)`
- `candidate_gpa`: `STRING` → `DECIMAL(3,2)`
- `days_duration`: `number` → `INTEGER`
- `postal_code`: Changed to VARCHAR (can contain letters in some countries)

### Missing Fields Added:
- Added `user_id` to candidates table
- Added `gender_id` to candidates table
- Added `marital_status_id` to candidates table
- Added `phone_number` to candidates table

### Structural Improvements:
- Removed duplicate `candidate_education_id` in candidates table
- Removed redundant `candidate_id` from `candidate_application_pipelines` (already linked via `candidate_application_id`)
- Standardized all foreign key naming to singular form
- Added proper NULLABLE indicators where appropriate
- Converted ENUM fields to VARCHAR where values might expand
- Kept ENUM for fixed sets (family_status, skill_rating)
- Changed `candidate_addresses` and `candidate_current_addresses` location fields from foreign keys to plain VARCHAR columns (province, city, subdistrict, postal_code) for simplified data entry
