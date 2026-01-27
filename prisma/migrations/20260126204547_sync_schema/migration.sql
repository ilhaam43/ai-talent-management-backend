-- AlterTable
ALTER TABLE "candidate_applications" ADD COLUMN     "is_talent_pool" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "cv_file_name" TEXT,
ADD COLUMN     "cv_file_url" TEXT,
ADD COLUMN     "linkedin_url" TEXT,
ADD COLUMN     "talent_pool_batch_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_reset_expiry" TIMESTAMP(3),
ADD COLUMN     "password_reset_token" TEXT,
ADD COLUMN     "password_set_required" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_talent_pool_batch_id_fkey" FOREIGN KEY ("talent_pool_batch_id") REFERENCES "talent_pool_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
