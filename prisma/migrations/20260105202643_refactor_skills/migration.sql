/*
  Warnings:

  - You are about to drop the column `skill` on the `job_vacancy_skills` table. All the data in the column will be lost.
  - Added the required column `skill_id` to the `job_vacancy_skills` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "job_vacancy_skills" DROP COLUMN "skill",
ADD COLUMN     "skill_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "skill_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_skill_name_key" ON "skills"("skill_name");

-- AddForeignKey
ALTER TABLE "job_vacancy_skills" ADD CONSTRAINT "job_vacancy_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
