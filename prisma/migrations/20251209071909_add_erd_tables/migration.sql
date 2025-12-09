/*
  Warnings:

  - You are about to drop the `Users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE');

-- CreateEnum
CREATE TYPE "FieldOfWork" AS ENUM ('IT', 'FINANCE', 'MARKETING', 'HR', 'SALES', 'OPERATIONS', 'OTHER');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('TECHNOLOGY', 'FINANCE', 'HEALTHCARE', 'EDUCATION', 'MANUFACTURING', 'RETAIL', 'CONSULTING', 'OTHER');

-- CreateEnum
CREATE TYPE "Country" AS ENUM ('INDONESIA', 'SINGAPORE', 'MALAYSIA', 'THAILAND', 'PHILIPPINES', 'OTHER');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('COLLEAGUE', 'MANAGER', 'SUBORDINATE', 'CLIENT', 'OTHER');

-- CreateEnum
CREATE TYPE "FamilyStatus" AS ENUM ('FATHER', 'MOTHER', 'SPOUSE', 'CHILD', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "CandidateRating" AS ENUM ('ONE', 'TWO', 'THREE', 'FOUR', 'FIVE');

-- DropIndex
DROP INDEX "Candidate_email_key";

-- AlterTable
ALTER TABLE "candidates" RENAME CONSTRAINT "Candidate_pkey" TO "candidates_pkey";
ALTER TABLE "candidates" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "candidates" ALTER COLUMN "password" DROP NOT NULL;

-- DropTable
DROP TABLE "Users";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "permission_name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "user_role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directorates" (
    "id" TEXT NOT NULL,
    "directorate_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directorates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group" (
    "id" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divisions" (
    "id" TEXT NOT NULL,
    "division_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "department_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_departments" (
    "id" TEXT NOT NULL,
    "sub_department_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_positions" (
    "id" TEXT NOT NULL,
    "employee_position" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_role_id" TEXT NOT NULL,
    "employee_position_id" TEXT NOT NULL,
    "directorates_id" TEXT,
    "group_id" TEXT,
    "division_id" TEXT,
    "department_id" TEXT,
    "sub_department_id" TEXT,
    "employee_identification_number" TEXT,
    "phone_number" TEXT,
    "date_of_birth" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_roles" (
    "id" TEXT NOT NULL,
    "job_role_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_vacancy_statuses" (
    "id" TEXT NOT NULL,
    "job_vacancy_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_vacancy_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_types" (
    "id" TEXT NOT NULL,
    "employment_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_last_educations" (
    "id" TEXT NOT NULL,
    "candidate_education" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_last_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "religions" (
    "id" TEXT NOT NULL,
    "religion" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "religions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marital_statuses" (
    "id" TEXT NOT NULL,
    "marital_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marital_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nationalities" (
    "id" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nationalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "language_proficiencies" (
    "id" TEXT NOT NULL,
    "language_proficiency" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "language_proficiencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genders" (
    "id" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "genders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_media" (
    "id" TEXT NOT NULL,
    "social_media" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinces" (
    "id" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "provinces_id" TEXT NOT NULL,
    "cities" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subdistricties" (
    "id" TEXT NOT NULL,
    "cities_id" TEXT NOT NULL,
    "subdistricts" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subdistricties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postal_codes" (
    "id" TEXT NOT NULL,
    "subdistrict_id" TEXT NOT NULL,
    "postal_codes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postal_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_addreseses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "province_id" TEXT NOT NULL,
    "candidate_address" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "subdistrict_id" TEXT NOT NULL,
    "postal_code_id" TEXT NOT NULL,

    CONSTRAINT "candidate_addreseses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_current_addreseses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "province_id" TEXT NOT NULL,
    "candidate_address" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "subdistrict_id" TEXT NOT NULL,
    "postal_code_id" TEXT NOT NULL,

    CONSTRAINT "candidate_current_addreseses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_vacancy_durations" (
    "id" TEXT NOT NULL,
    "days_duration" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_vacancy_durations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_vacancies" (
    "id" TEXT NOT NULL,
    "job_role_id" TEXT NOT NULL,
    "employee_position_id" TEXT NOT NULL,
    "job_vacancy_status_id" TEXT NOT NULL,
    "job_vacancy_durations_id" TEXT NOT NULL,
    "employment_type_id" TEXT NOT NULL,
    "directorates_id" TEXT,
    "group_id" TEXT,
    "division_id" TEXT,
    "department_id" TEXT,
    "sub_department_id" TEXT,
    "job_requirement" TEXT,
    "job_qualification" TEXT,
    "job_vacancy_closed_at" DATE,
    "city_location" TEXT,
    "min_salary" DOUBLE PRECISION,
    "max_salary" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_vacancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_statuses" (
    "id" TEXT NOT NULL,
    "application_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_pipelines" (
    "id" TEXT NOT NULL,
    "application_pipeline" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_pipeline_statuses" (
    "id" TEXT NOT NULL,
    "application_pipeline_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_pipeline_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_salaries" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "current_salary" TEXT,
    "expectation_salary" TEXT,

    CONSTRAINT "candidate_salaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_applications" (
    "id" TEXT NOT NULL,
    "job_vacancies_id" TEXT NOT NULL,
    "candidates_id" TEXT NOT NULL,
    "candidate_salary_id" TEXT NOT NULL,
    "application_status_id" TEXT NOT NULL,
    "fit_score" DOUBLE PRECISION,
    "submission_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_app_pipelines" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "candidate_application_id" TEXT NOT NULL,
    "application_pipeline_id" TEXT NOT NULL,
    "application_pipeline_status_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_app_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_work_experiences" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "job_type" "JobType" NOT NULL,
    "field_of_work" "FieldOfWork" NOT NULL,
    "industry" "Industry" NOT NULL,
    "employment_started_date" DATE NOT NULL,
    "employment_ended_date" DATE,
    "work_experience_description" TEXT,
    "country" "Country" NOT NULL,
    "reason_for_resignation" TEXT,
    "benefit" TEXT,
    "reference_name" TEXT,
    "phone_number" TEXT,
    "relationship" "Relationship",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_org_experiences" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "organization_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organization_experience_started_date" DATE NOT NULL,
    "organization_experience_ended_date" DATE,
    "organization_experience_description" TEXT,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_org_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_educations" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "candidate_last_education_id" TEXT NOT NULL,
    "candidate_school" TEXT NOT NULL,
    "candidate_major" TEXT,
    "candidate_gpa" TEXT,
    "candidate_max_gpa" TEXT,
    "candidate_country" TEXT,
    "candidate_started_year_study" DATE,
    "candidate_ended_year_study" DATE,

    CONSTRAINT "candidate_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_families" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "family_status" "FamilyStatus" NOT NULL,
    "family_name" TEXT NOT NULL,
    "family_job" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_families_lintasarta" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "family_status" "FamilyStatus" NOT NULL,
    "family_name" TEXT NOT NULL,
    "family_position" TEXT,

    CONSTRAINT "candidate_families_lintasarta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_social_media" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "candidate_social_media_id" TEXT NOT NULL,
    "candidate_social_media_url" TEXT NOT NULL,

    CONSTRAINT "candidate_social_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_skills" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "candidate_skills" TEXT NOT NULL,
    "candidate_rating" "CandidateRating" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_certification" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "certification_title" TEXT NOT NULL,
    "institution_name" TEXT NOT NULL,
    "location" TEXT,
    "certification_start_date" DATE,
    "certification_ended_date" DATE,
    "certification_description" TEXT,
    "file_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_certification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_user_role_id_fkey" FOREIGN KEY ("user_role_id") REFERENCES "user_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_role_id_fkey" FOREIGN KEY ("user_role_id") REFERENCES "user_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_employee_position_id_fkey" FOREIGN KEY ("employee_position_id") REFERENCES "employee_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_directorates_id_fkey" FOREIGN KEY ("directorates_id") REFERENCES "directorates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_sub_department_id_fkey" FOREIGN KEY ("sub_department_id") REFERENCES "sub_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_provinces_id_fkey" FOREIGN KEY ("provinces_id") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subdistricties" ADD CONSTRAINT "subdistricties_cities_id_fkey" FOREIGN KEY ("cities_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postal_codes" ADD CONSTRAINT "postal_codes_subdistrict_id_fkey" FOREIGN KEY ("subdistrict_id") REFERENCES "subdistricties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_addreseses" ADD CONSTRAINT "candidate_addreseses_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_addreseses" ADD CONSTRAINT "candidate_addreseses_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_addreseses" ADD CONSTRAINT "candidate_addreseses_subdistrict_id_fkey" FOREIGN KEY ("subdistrict_id") REFERENCES "subdistricties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_addreseses" ADD CONSTRAINT "candidate_addreseses_postal_code_id_fkey" FOREIGN KEY ("postal_code_id") REFERENCES "postal_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_current_addreseses" ADD CONSTRAINT "candidate_current_addreseses_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_current_addreseses" ADD CONSTRAINT "candidate_current_addreseses_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_current_addreseses" ADD CONSTRAINT "candidate_current_addreseses_subdistrict_id_fkey" FOREIGN KEY ("subdistrict_id") REFERENCES "subdistricties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_current_addreseses" ADD CONSTRAINT "candidate_current_addreseses_postal_code_id_fkey" FOREIGN KEY ("postal_code_id") REFERENCES "postal_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_vacancies" ADD CONSTRAINT "job_vacancies_job_role_id_fkey" FOREIGN KEY ("job_role_id") REFERENCES "job_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_vacancies" ADD CONSTRAINT "job_vacancies_employee_position_id_fkey" FOREIGN KEY ("employee_position_id") REFERENCES "employee_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_vacancies" ADD CONSTRAINT "job_vacancies_job_vacancy_status_id_fkey" FOREIGN KEY ("job_vacancy_status_id") REFERENCES "job_vacancy_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_vacancies" ADD CONSTRAINT "job_vacancies_job_vacancy_durations_id_fkey" FOREIGN KEY ("job_vacancy_durations_id") REFERENCES "job_vacancy_durations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_vacancies" ADD CONSTRAINT "job_vacancies_employment_type_id_fkey" FOREIGN KEY ("employment_type_id") REFERENCES "employment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_vacancies" ADD CONSTRAINT "job_vacancies_directorates_id_fkey" FOREIGN KEY ("directorates_id") REFERENCES "directorates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_vacancies" ADD CONSTRAINT "job_vacancies_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_vacancies" ADD CONSTRAINT "job_vacancies_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_vacancies" ADD CONSTRAINT "job_vacancies_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_vacancies" ADD CONSTRAINT "job_vacancies_sub_department_id_fkey" FOREIGN KEY ("sub_department_id") REFERENCES "sub_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_salaries" ADD CONSTRAINT "candidate_salaries_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_job_vacancies_id_fkey" FOREIGN KEY ("job_vacancies_id") REFERENCES "job_vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_candidates_id_fkey" FOREIGN KEY ("candidates_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_candidate_salary_id_fkey" FOREIGN KEY ("candidate_salary_id") REFERENCES "candidate_salaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_application_status_id_fkey" FOREIGN KEY ("application_status_id") REFERENCES "application_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_app_pipelines" ADD CONSTRAINT "candidate_app_pipelines_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_app_pipelines" ADD CONSTRAINT "candidate_app_pipelines_candidate_application_id_fkey" FOREIGN KEY ("candidate_application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_app_pipelines" ADD CONSTRAINT "candidate_app_pipelines_application_pipeline_id_fkey" FOREIGN KEY ("application_pipeline_id") REFERENCES "application_pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_app_pipelines" ADD CONSTRAINT "candidate_app_pipelines_application_pipeline_status_id_fkey" FOREIGN KEY ("application_pipeline_status_id") REFERENCES "application_pipeline_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_candidate_education_id_fkey" FOREIGN KEY ("candidate_education_id") REFERENCES "candidate_last_educations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_religion_id_fkey" FOREIGN KEY ("religion_id") REFERENCES "religions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_nationality_id_fkey" FOREIGN KEY ("nationality_id") REFERENCES "nationalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_language_proficieny_id_fkey" FOREIGN KEY ("language_proficieny_id") REFERENCES "language_proficiencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_candidate_address_id_fkey" FOREIGN KEY ("candidate_address_id") REFERENCES "candidate_addreseses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_candidate_current_address_id_fkey" FOREIGN KEY ("candidate_current_address_id") REFERENCES "candidate_current_addreseses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_work_experiences" ADD CONSTRAINT "candidate_work_experiences_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_org_experiences" ADD CONSTRAINT "candidate_org_experiences_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_educations" ADD CONSTRAINT "candidate_educations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_educations" ADD CONSTRAINT "candidate_educations_candidate_last_education_id_fkey" FOREIGN KEY ("candidate_last_education_id") REFERENCES "candidate_last_educations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_families" ADD CONSTRAINT "candidate_families_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_families_lintasarta" ADD CONSTRAINT "candidate_families_lintasarta_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_social_media" ADD CONSTRAINT "candidate_social_media_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_social_media" ADD CONSTRAINT "candidate_social_media_candidate_social_media_id_fkey" FOREIGN KEY ("candidate_social_media_id") REFERENCES "social_media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_certification" ADD CONSTRAINT "candidate_certification_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
