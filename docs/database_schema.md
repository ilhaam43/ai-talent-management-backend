# Database Schema Definition

This document defines the database tables and columns based on the `prisma/schema.prisma` file.

## Identity & RBAC

### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `name` | String | | |
| `email` | String | Unique | |
| `email_verified_at` | DateTime | Nullable | |
| `password` | String | | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |

### `user_roles`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `role_name` | String | | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |

### `permissions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `permission_name` | String | | |
| `description` | String | Nullable, Text | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |

### `role_permissions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `user_role_id` | String | FK (user_roles.id) | |
| `permission_id` | String | FK (permissions.id) | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |

## Organization Structure

### `directorates`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `directorate_name` | String | | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |

### `groups`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `directorate_id` | String | FK (directorates.id) | |
| `group_name` | String | | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |

### `divisions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `directorate_id` | String | FK (directorates.id) | |
| `group_id` | String | Nullable, FK (groups.id) | |
| `division_name` | String | | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |

### `departments`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `division_id` | String | FK (divisions.id) | |
| `department_name` | String | | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |

### `sub_departments`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `department_id` | String | FK (departments.id) | |
| `sub_department_name` | String | | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |

### `employee_positions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `employee_position` | String | | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |

### `employees`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `user_id` | String | FK (users.id) | |
| `user_role_id` | String | FK (user_roles.id) | |
| `employee_position_id` | String | FK (employee_positions.id) | |
| `directorate_id` | String | Nullable, FK | |
| `group_id` | String | Nullable, FK | |
| `division_id` | String | Nullable, FK | |
| `department_id` | String | Nullable, FK | |
| `sub_department_id` | String | Nullable, FK | |
| `employee_identification_number` | String | Unique | |
| `phone_number` | String | Nullable | |
| `date_of_birth` | DateTime | Nullable, Date | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |

## Reference Dictionaries

*(Generic structure for most reference tables: id, name, timestamps)*

- **`job_roles`**: `job_role_name`
- **`job_vacancy_statuses`**: `job_vacancy_status`
- **`job_vacancy_reason`**: `reason`
- **`employment_types`**: `employment_type`
- **`candidate_last_educations`**: `candidate_education`
- **`religions`**: `religion`
- **`marital_statuses`**: `marital_status`
- **`nationalities`**: `nationality`
- **`language_proficiencies`**: `language_proficiency`
- **`genders`**: `gender`
- **`social_media`**: `social_media`
- **`document_types`**: `document_type` (Unique)

## Geo & Address

### `provinces`, `cities`, `subdistricts`, `postal_codes`
Hierarchical tables linking `postal_codes` -> `subdistricts` -> `cities` -> `provinces`.

### `candidate_addresses` & `candidate_current_addresses`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `user_id` | String | FK (users.id) | |
| `province` | String | | |
| `city` | String | | |
| `subdistrict` | String | | |
| `postal_code` | String | | |
| `candidate_address` | String | Text | |
| `created_at` | DateTime | Default(now()) | |

## Job Vacancies & Applications

### `job_vacancy_durations`
- `days_duration` (Int)

### `job_vacancies`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `job_role_id` | String | FK | |
| `employee_position_id` | String | FK | |
| `job_vacancy_status_id` | String | FK | |
| `job_vacancy_duration_id` | String | FK | |
| `job_vacancy_reason_id` | String | FK | |
| `employment_type_id` | String | FK | |
| `directorate_id` | String | Nullable, FK | |
| `group_id` | String | Nullable, FK | |
| `division_id` | String | Nullable, FK | |
| `department_id` | String | Nullable, FK | |
| `sub_department_id` | String | Nullable, FK | |
| `job_requirement` | String | Nullable, Text | |
| `job_description` | String | Nullable, Text | |
| `job_qualification` | String | Nullable, Text | |
| `job_vacancy_closed_at` | DateTime | Nullable, Date | |
| `city_location` | String | Nullable | |
| `min_salary` | Decimal | Nullable, (15,2) | |
| `max_salary` | Decimal | Nullable, (15,2) | |
| `created_at` | DateTime | Default(now()) | |

### `application_pipelines` & `application_pipeline_statuses` & `application_last_statuses`
Reference tables for application flow.

### `candidate_salaries`
- `current_salary` (Decimal), `expectation_salary` (Decimal)

### `candidate_applications`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `job_vacancy_id` | String | FK | |
| `candidate_id` | String | FK | |
| `candidate_salary_id` | String | FK | |
| `application_latest_status_id` | String | FK | |
| `application_pipeline_id` | String | FK | |
| `fit_score` | Decimal | Nullable, (5,2) | |
| `ai_insight`, `ai_interview`... | Text | Nullable | AI fields |
| `submission_date` | DateTime | Date | |

### `candidate_match_skills`
- `candidate_id`, `candidate_applications_id`, `candidate_match_skill`

## Candidates & Profiles

### `candidates`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `user_id` | String | FK (users.id) | |
| `candidate_fullname` | String | Nullable | |
| `candidate_email` | String | Nullable, Unique | |
| `id_card_number` | String | Nullable, Unique | |
| ... | ... | ... | Many profile FKs and fields |

### Sub-tables
- **`candidate_work_experiences`**: History of work.
- **`candidate_organization_experiences`**: History of organizations.
- **`candidate_educations`**: Educational background.
- **`candidate_families`**: Family members.
- **`candidate_families_lintasarta`**: Family members in Lintasarta.
- **`candidate_social_media`**: Social links.
- **`candidate_skills`**: Skills with rating.
- **`candidate_certifications`**: Certifications.
- **`candidate_documents`**: Uploaded docs with extracted text.

### `skills`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `skill_name` | String | Unique | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |

### `job_vacancy_skills`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, UUID | |
| `job_vacancy_id` | String | FK (job_vacancies.id) | |
| `skill_id` | String | FK (skills.id) | |
| `created_at` | DateTime | Default(now()) | |
| `updated_at` | DateTime | UpdatedAt | |
