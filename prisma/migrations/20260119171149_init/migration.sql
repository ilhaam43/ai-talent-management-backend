-- CreateEnum
CREATE TYPE "TalentPoolSourceType" AS ENUM ('MANUAL_UPLOAD', 'GOOGLE_DRIVE', 'ONEDRIVE');

-- CreateEnum
CREATE TYPE "TalentPoolBatchStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED');

-- CreateEnum
CREATE TYPE "TalentPoolQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "TalentPoolHRStatus" AS ENUM ('PENDING', 'REVIEWED', 'SHORTLISTED', 'PROCESSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICANT_QUALIFIED', 'JOB_VACANCY_CREATED', 'JOB_VACANCY_UPDATED', 'TALENT_POOL_COMPLETE');

-- CreateTable
CREATE TABLE "talent_pool_batches" (
    "id" TEXT NOT NULL,
    "batch_name" TEXT,
    "uploaded_by_id" TEXT NOT NULL,
    "source_type" "TalentPoolSourceType" NOT NULL DEFAULT 'MANUAL_UPLOAD',
    "source_url" TEXT,
    "total_files" INTEGER NOT NULL,
    "processed_files" INTEGER NOT NULL DEFAULT 0,
    "failed_files" INTEGER NOT NULL DEFAULT 0,
    "status" "TalentPoolBatchStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_pool_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_pool_queue" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "status" "TalentPoolQueueStatus" NOT NULL DEFAULT 'PENDING',
    "error_msg" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "talent_pool_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_pool_candidates" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "linkedin" TEXT,
    "education_data" JSONB,
    "work_experience_data" JSONB,
    "skills_data" JSONB,
    "certifications_data" JSONB,
    "organization_data" JSONB,
    "cv_file_url" TEXT NOT NULL,
    "cv_file_name" TEXT NOT NULL,
    "hr_status" "TalentPoolHRStatus" NOT NULL DEFAULT 'PENDING',
    "hr_notes" TEXT,
    "processed_to_step" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_pool_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_pool_screenings" (
    "id" TEXT NOT NULL,
    "talent_pool_candidate_id" TEXT NOT NULL,
    "job_vacancy_id" TEXT NOT NULL,
    "fit_score" DECIMAL(5,2) NOT NULL,
    "ai_match_status" "AiMatchStatus" NOT NULL,
    "ai_insight" TEXT,
    "ai_interview" TEXT,
    "ai_core_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "talent_pool_screenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "talent_pool_screenings_talent_pool_candidate_id_job_vacancy_key" ON "talent_pool_screenings"("talent_pool_candidate_id", "job_vacancy_id");

-- AddForeignKey
ALTER TABLE "talent_pool_batches" ADD CONSTRAINT "talent_pool_batches_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_pool_queue" ADD CONSTRAINT "talent_pool_queue_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "talent_pool_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_pool_candidates" ADD CONSTRAINT "talent_pool_candidates_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "talent_pool_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_pool_screenings" ADD CONSTRAINT "talent_pool_screenings_talent_pool_candidate_id_fkey" FOREIGN KEY ("talent_pool_candidate_id") REFERENCES "talent_pool_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_pool_screenings" ADD CONSTRAINT "talent_pool_screenings_job_vacancy_id_fkey" FOREIGN KEY ("job_vacancy_id") REFERENCES "job_vacancies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
