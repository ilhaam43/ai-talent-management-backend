# Database ERD

## Overview
- This ERD models recruitment, organizational structure, RBAC (roles/permissions), candidate profiles, and application pipelines.
- Tables are grouped into domains below with short descriptions and typical relationships.

## Identity & RBAC
- `users`: core user identity (name, email, password, timestamps).
- `user_roles`: role dictionary (e.g., admin, recruiter).
- `permissions`: granular actions; `permission_name`, `description`.
- `role_permissions`: join table mapping `user_roles` ↔ `permissions`.
- Relationship notes:
  - A user can have one role via `employees.user_role_id` or separate assignment model if needed.
  - `role_permissions.user_role_id → user_roles.id`, `role_permissions.permission_id → permissions.id`.

## Organization Structure
- `directorates`, `group`, `divisions`, `departments`, `sub_departments`: hierarchical units.
- `employee_positions`: job titles/positions in the org.
- `employees`: links a `user` to the org units and position; includes HR fields.
- Relationship notes:
  - `employees.user_id → users.id`, `employees.employee_position_id → employee_positions.id`.
  - Optional foreign keys for `directorates_id`, `group_id`, `division_id`, `department_id`, `sub_department_id`.

## Reference Dictionaries
- Dictionaries for UI filters and normalization: `job_roles`, `job_vacancy_statuses`, `employment_types`, `candidate_last_educations`, `religions`, `marital_statuses`, `nationalities`, `language_proficiencies`, `genders`, `social_media`, `document_types`.

## Geo & Address
- `provinces`, `cities` (FK to `provinces`), `subdistricties` (FK to `cities`), `postal_codes` (FK to `subdistricties`).
- `candidate_addreseses`, `candidate_current_addreseses` capture normalized address references per candidate/user.

## Job Vacancies & Applications
- `job_vacancy_durations`: duration in days for posting lifetime.
- `job_vacancies`: vacancy definition linking to roles, position, status, duration, employment type, org units; salary band and requirements.
- `application_statuses`: overall application state (e.g., submitted, rejected).
- `application_pipelines`: pipeline stages (e.g., screening, interview).
- `application_pipeline_statuses`: per-stage status (e.g., pass/fail).
- `candidate_salaries`: tracks compensation expectations.
- `candidate_applications`: relation joining `candidates` ↔ `job_vacancies` plus status, fit score, submission date.
- `candidate_application_pipelines`: per-application stage tracking with status and notes.

## Candidates & Profiles
- `candidates`: core candidate record and denormalized personal fields.
- `candidate_work_experiences`, `candidate_organization_experiences`: history and roles.
- `candidate_educations`: education records; last education also referenced in `candidates`.
- `candidate_families`, `candidate_families_lintasarta`: familial data.
- `candidate_social_media`: links to social platforms.
- `candidate_skills`: freeform skills with ratings.
- `candidate_certification`: certifications with files.
- `candidate_documents`: uploaded docs and extracted text.

## Tables & Columns
- user_roles: id, role_name (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- job_roles: id, job_role_name (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- directorates: id, directorate_name (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- group: id, group_name (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- divisions: id, division_name (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- departments: id, department_name (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- sub_departments: id, sub_department_name (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- employee_positions: id, employee_position (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- application_statuses: id, application_status (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- application_pipelines: id, application_pipeline (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- application_pipeline_statuses: id, application_pipeline_status (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- job_vacancy_statuses: id, job_vacancy_status (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- candidate_last_educations: id, candidate_education (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- job_vacancy_durations: id, days_duration (NUMBER), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- employment_types: id, employment_type (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- document_types: id, document_type (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- religions: id, religion (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- marital_statuses: id, marital_status (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- nationalities: id, nationality (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- language_proficiencies: id, language_proficiency (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- genders: id, gender (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- social_media: id, social_media (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- provinces: id, province (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- cities: id, provinces_id, cities (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- subdistricties: id, cities_id, subdistricties (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- postal_codes: id, subdistrict_id, postal_codes (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- permissions: id, permission_name (STRING), description (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- role_permissions: id, user_role_id, permission_id, created_at (TIMESTAMP), updated_at (TIMESTAMP)
- employees: id, user_id, user_role_id, employee_position_id, directorates_id (NULLABLE), group_id (NULLABLE), division_id (NULLABLE), department_id (NULLABLE), sub_department_id (NULLABLE), employee_identification_number (STRING), phone_number (VARCHAR), date_of_birth (DATE), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- candidate_addreseses: id, user_id, province_id, candidate_address (STRING), city_id, subdistrict_id, postal_code_id
- candidate_current_addreseses: id, user_id, province_id, candidate_address (STRING), city_id, subdistrict_id, postal_code_id
- users: id, name (STRING), email (STRING), email_verified_at (TIMESTAMP)(NULLABLE), password (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- job_vacancies: id, job_role_id, employee_position_id, job_vacancy_status_id, job_vacancy_durations_id, employment_type_id, directorates_id (NULLABLE), group_id (NULLABLE), division_id (NULLABLE), department_id (NULLABLE), sub_department_id (NULLABLE), job_requirement (TEXT), job_qualification (TEXT), job_vacancy_closed_at (DATE)(NULLABLE), city_location (STRING), min_salary (FLOAT)(NULLABLE), max_salary (FLOAT)(NULLABLE), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- candidates: id, candidate_education_id, religion_id, nationality_id, language_proficieny_id, candidate_address_id, candidate_current_address_id, candidate_education_id, candidate_school (STRING), candidate_fullname (STRING), candidate_nickname (STRING), candidate_email (STRING), city_domicile (STRING), date_of_birth (DATE), place_of_birth (DATE), id_card_number (VARCHAR), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- candidate_salaries: id, candidate_id, current_salary (STRING)(NULLABLE), expectation_salary (STRING)(NULLABLE)
- candidate_applications: id, job_vacancies_id, candidates_id, candidate_salary_id, application_status_id, fit_score (FLOAT), submission_date (DATE), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- candidate_work_experiences: id, candidate_id, company_name (STRING), job_title (STRING), job_type (ENUM), field_of_work (ENUM), industry (ENUM), employment_started_date (DATE), employment_ended_date (DATE), work_experience_description (TEXT), country (ENUM), reason_for_resignation (TEXT)(NULLABLE), benefit (TEXT)(NULLABLE), reference_name (STRING), phone_number (STRING), relationship (ENUM), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- candidate_organization_experiences: id, candidate_id, organization_name (STRING), role (STRING), organization_experience_started_date (DATE), organization_experience_ended_date (DATE), organization_experience_description (TEXT), location (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- candidate_educations: id, candidate_last_education_id, candidate_school (STRING), candidate_major (STRING), candidate_gpa (STRING), candidate_max_gpa (STRING), candidate_country (STRING), candidate_started_year_study (DATE), candidate_ended_year_study (DATE)
- candidate_families: id, candidate_id, family_status (ENUM), family_name (STRING), family_job (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- candidate_families_lintasarta: id, candidate_id, family_status (ENUM), family_name (STRING), family_position (STRING)
- candidate_social_media: id, candidate_id, candidate_social_media_id, candidate_social_media_url (TEXT)
- candidate_skills: id, candidate_id, candidate_skills (TEXT), candidate_rating (ENUM)(1-5), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- candidate_certification: id, candidate_id, certification_title (TEXT), institution_name (STRING), location (STRING), certification_start_date (DATE), certification_ended_date (DATE), certification_description (TEXT)(NULLABLE), file_path (STRING), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- candidate_application_pipelines: id, candidate_id, candidate_application_id, application_pipeline_id, application_pipeline_status_id, notes (STRING)(NULLABLE), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- candidate_documents: id, candidate_id, document_type_id, file_path (STRING), extracted_text (LONGTEXT)(NULLABLE), created_at (TIMESTAMP), updated_at (TIMESTAMP)

## Conventions
- All tables have `id` as primary key.
- Timestamps: `created_at`, `updated_at` when present; nullable fields explicitly marked.
- Foreign keys follow `<entity>_id` naming.
- Dictionaries store human-readable names and are referenced by other entities.

## Relationship Summary (selected)
- `employees.user_id → users.id`, `employees.user_role_id → user_roles.id`.
- `cities.provinces_id → provinces.id`, `subdistricties.cities_id → cities.id`, `postal_codes.subdistrict_id → subdistricties.id`.
- `job_vacancies.job_role_id → job_roles.id`, `job_vacancies.employee_position_id → employee_positions.id`, `job_vacancies.job_vacancy_status_id → job_vacancy_statuses.id`, `job_vacancies.job_vacancy_durations_id → job_vacancy_durations.id`, `job_vacancies.employment_type_id → employment_types.id`.
- `candidate_applications.job_vacancies_id → job_vacancies.id`, `candidate_applications.candidates_id → candidates.id`, `candidate_applications.application_status_id → application_statuses.id`, `candidate_applications.candidate_salary_id → candidate_salaries.id`.
- `candidate_application_pipelines.candidate_application_id → candidate_applications.id`, `candidate_application_pipelines.application_pipeline_id → application_pipelines.id`, `candidate_application_pipelines.application_pipeline_status_id → application_pipeline_statuses.id`.

## Next Steps
- Convert this ERD into `prisma/schema.prisma` models with explicit relations.
- Add cascading rules (on delete/update) and unique indexes for emails/IDs.