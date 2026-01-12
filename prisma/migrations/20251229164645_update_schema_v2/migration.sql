/*
  Warnings:

  - You are about to drop the column `application_status_id` on the `candidate_applications` table. All the data in the column will be lost.
  - The `job_type` column on the `candidate_work_experiences` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `application_statuses` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `application_latest_status_id` to the `candidate_applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `application_pipeline_id` to the `candidate_applications` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `candidate_rating` on the `candidate_skills` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `division_id` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `directorate_id` to the `divisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `directorate_id` to the `groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job_vacancy_reason_id` to the `job_vacancies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department_id` to the `sub_departments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AiMatchStatus" AS ENUM ('STRONG MATCH', 'MATCH', 'NOT MATCH');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL-TIME', 'PART-TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "CandidateRating" AS ENUM ('1', '2', '3', '4', '5');

-- DropForeignKey
ALTER TABLE "candidate_applications" DROP CONSTRAINT "candidate_applications_application_status_id_fkey";

-- AlterTable
ALTER TABLE "candidate_applications" DROP COLUMN "application_status_id",
ADD COLUMN     "ai_insight" TEXT,
ADD COLUMN     "ai_match_status" "AiMatchStatus",
ADD COLUMN     "application_latest_status_id" TEXT NOT NULL,
ADD COLUMN     "application_pipeline_id" TEXT NOT NULL,
ADD COLUMN     "result_summary" TEXT;

-- AlterTable
ALTER TABLE "candidate_skills" DROP COLUMN "candidate_rating",
ADD COLUMN     "candidate_rating" "CandidateRating" NOT NULL;

-- AlterTable
ALTER TABLE "candidate_work_experiences" DROP COLUMN "job_type",
ADD COLUMN     "job_type" "JobType";

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "division_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "divisions" ADD COLUMN     "directorate_id" TEXT NOT NULL,
ADD COLUMN     "group_id" TEXT;

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "directorate_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "job_vacancies" ADD COLUMN     "job_description" TEXT,
ADD COLUMN     "job_vacancy_reason_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sub_departments" ADD COLUMN     "department_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "application_statuses";

-- CreateTable
CREATE TABLE "job_vacancy_reason" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_vacancy_reason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_last_statuses" (
    "id" TEXT NOT NULL,
    "application_last_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_last_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_match_skills" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "candidate_applications_id" TEXT NOT NULL,
    "candidate_match_skill" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_match_skills_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_directorate_id_fkey" FOREIGN KEY ("directorate_id") REFERENCES "directorates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_directorate_id_fkey" FOREIGN KEY ("directorate_id") REFERENCES "directorates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_departments" ADD CONSTRAINT "sub_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_vacancies" ADD CONSTRAINT "job_vacancies_job_vacancy_reason_id_fkey" FOREIGN KEY ("job_vacancy_reason_id") REFERENCES "job_vacancy_reason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_application_latest_status_id_fkey" FOREIGN KEY ("application_latest_status_id") REFERENCES "application_last_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_application_pipeline_id_fkey" FOREIGN KEY ("application_pipeline_id") REFERENCES "application_pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_match_skills" ADD CONSTRAINT "candidate_match_skills_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_match_skills" ADD CONSTRAINT "candidate_match_skills_candidate_applications_id_fkey" FOREIGN KEY ("candidate_applications_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
