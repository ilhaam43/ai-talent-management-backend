/*
  Warnings:

  - You are about to drop the column `interviewer_id` on the `candidate_application_pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `candidate_application_pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `candidate_application_pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_date` on the `candidate_application_pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_end_time` on the `candidate_application_pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_start_time` on the `candidate_application_pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `stage_score` on the `candidate_application_pipelines` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InterviewMethod" AS ENUM ('ONLINE', 'ONSITE');

-- DropForeignKey
ALTER TABLE "candidate_application_pipelines" DROP CONSTRAINT "candidate_application_pipelines_interviewer_id_fkey";

-- AlterTable
ALTER TABLE "candidate_application_pipelines" DROP COLUMN "interviewer_id",
DROP COLUMN "link",
DROP COLUMN "location",
DROP COLUMN "scheduled_date",
DROP COLUMN "scheduled_end_time",
DROP COLUMN "scheduled_start_time",
DROP COLUMN "stage_score",
ADD COLUMN     "employeeId" TEXT;

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "profile_photo_url" TEXT;

-- CreateTable
CREATE TABLE "candidate_interview_data" (
    "id" TEXT NOT NULL,
    "candidate_application_pipeline_id" TEXT NOT NULL,
    "scheduled_date" DATE,
    "scheduled_start_time" TIMESTAMPTZ(6),
    "scheduled_end_time" TIMESTAMPTZ(6),
    "interview_link" TEXT,
    "hr_interview_score" DECIMAL(5,2),
    "user_interview_score" DECIMAL(5,2),
    "interview_method" "InterviewMethod" NOT NULL,
    "interview_location" TEXT,
    "interviewer_name" TEXT,
    "interviewer_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_interview_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_online_assessments" (
    "id" TEXT NOT NULL,
    "candidate_application_pipeline_id" TEXT NOT NULL,
    "assessment_link" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "vendor_result_file_url" TEXT,
    "vendor_result_file_name" TEXT,
    "role_fit_score" INTEGER,
    "parsed_result_summary" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_online_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_interview_data_candidate_application_pipeline_id_key" ON "candidate_interview_data"("candidate_application_pipeline_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_online_assessments_candidate_application_pipeline_key" ON "candidate_online_assessments"("candidate_application_pipeline_id");

-- AddForeignKey
ALTER TABLE "candidate_application_pipelines" ADD CONSTRAINT "candidate_application_pipelines_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_interview_data" ADD CONSTRAINT "candidate_interview_data_candidate_application_pipeline_id_fkey" FOREIGN KEY ("candidate_application_pipeline_id") REFERENCES "candidate_application_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_online_assessments" ADD CONSTRAINT "candidate_online_assessments_candidate_application_pipelin_fkey" FOREIGN KEY ("candidate_application_pipeline_id") REFERENCES "candidate_application_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
