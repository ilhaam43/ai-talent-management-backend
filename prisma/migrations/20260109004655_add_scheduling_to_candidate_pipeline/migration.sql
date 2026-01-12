-- AlterTable
ALTER TABLE "candidate_application_pipelines" ADD COLUMN     "interviewer_id" TEXT,
ADD COLUMN     "link" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "scheduled_date" DATE,
ADD COLUMN     "scheduled_end_time" TIMESTAMPTZ,
ADD COLUMN     "scheduled_start_time" TIMESTAMPTZ,
ADD COLUMN     "stage_score" DECIMAL(5,2);

-- AddForeignKey
ALTER TABLE "candidate_application_pipelines" ADD CONSTRAINT "candidate_application_pipelines_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
