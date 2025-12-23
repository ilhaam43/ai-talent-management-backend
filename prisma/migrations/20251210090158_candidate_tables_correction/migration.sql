/*
  Warnings:

  - You are about to drop the column `user_id` on the `candidate_addreseses` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `candidate_current_addreseses` table. All the data in the column will be lost.
  - You are about to drop the column `candidate_address_id` on the `candidates` table. All the data in the column will be lost.
  - You are about to drop the column `candidate_current_address_id` on the `candidates` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[candidate_id]` on the table `candidate_addreseses` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[candidate_id]` on the table `candidate_current_addreseses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `candidate_id` to the `candidate_addreseses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `candidate_id` to the `candidate_current_addreseses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `candidates` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "candidates" DROP CONSTRAINT "candidates_candidate_address_id_fkey";

-- DropForeignKey
ALTER TABLE "candidates" DROP CONSTRAINT "candidates_candidate_current_address_id_fkey";

-- AlterTable
ALTER TABLE "candidate_addreseses" DROP COLUMN "user_id",
ADD COLUMN     "candidate_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "candidate_current_addreseses" DROP COLUMN "user_id",
ADD COLUMN     "candidate_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "candidate_address_id",
DROP COLUMN "candidate_current_address_id",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "candidate_addreseses_candidate_id_key" ON "candidate_addreseses"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_current_addreseses_candidate_id_key" ON "candidate_current_addreseses"("candidate_id");

-- AddForeignKey
ALTER TABLE "candidate_addreseses" ADD CONSTRAINT "candidate_addreseses_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_current_addreseses" ADD CONSTRAINT "candidate_current_addreseses_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
