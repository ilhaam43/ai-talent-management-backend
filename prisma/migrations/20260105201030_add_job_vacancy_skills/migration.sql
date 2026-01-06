-- AlterTable
ALTER TABLE "candidate_applications" ADD COLUMN     "ai_core_value" TEXT,
ADD COLUMN     "ai_interview" TEXT;

-- CreateTable
CREATE TABLE "job_vacancy_skills" (
    "id" TEXT NOT NULL,
    "job_vacancy_id" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_vacancy_skills_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "job_vacancy_skills" ADD CONSTRAINT "job_vacancy_skills_job_vacancy_id_fkey" FOREIGN KEY ("job_vacancy_id") REFERENCES "job_vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
