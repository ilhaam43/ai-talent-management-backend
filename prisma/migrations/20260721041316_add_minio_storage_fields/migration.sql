-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('LOCAL', 'MINIO');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- AlterTable
ALTER TABLE "candidate_documents" ADD COLUMN     "bucket" TEXT,
ADD COLUMN     "mime_type" TEXT,
ADD COLUMN     "object_key" TEXT,
ADD COLUMN     "original_name" TEXT,
ADD COLUMN     "size_bytes" INTEGER,
ADD COLUMN     "storage_type" "StorageType" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN     "upload_status" "UploadStatus" NOT NULL DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "cv_storage_type" "StorageType" NOT NULL DEFAULT 'LOCAL';

-- AlterTable
ALTER TABLE "talent_pool_queue" ADD COLUMN     "object_key" TEXT;
