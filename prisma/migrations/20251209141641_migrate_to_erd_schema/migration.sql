-- Rename Candidate table to candidates
ALTER TABLE "Candidate" RENAME TO "candidates";

-- Rename existing columns in candidates table to match new schema
ALTER TABLE "candidates" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "candidates" RENAME COLUMN "updatedAt" TO "updated_at";

-- Migrate existing email to candidateEmail and name to candidateFullname
-- First add the new columns
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "candidate_email" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "candidate_fullname" TEXT;

-- Copy data from old columns to new columns
UPDATE "candidates" SET "candidate_email" = "email" WHERE "candidate_email" IS NULL;
UPDATE "candidates" SET "candidate_fullname" = "name" WHERE "candidate_fullname" IS NULL;

-- Add all new nullable columns from ERD schema
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "candidate_education_id" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "religion_id" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "nationality_id" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "language_proficieny_id" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "candidate_address_id" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "candidate_current_address_id" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "candidate_school" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "candidate_nickname" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "city_domicile" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "place_of_birth" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "id_card_number" TEXT;

-- Note: Keeping email, password, name columns for now to preserve authentication data
-- These can be removed in a future migration if not needed

-- Rename columns in candidate_documents table
ALTER TABLE "candidate_documents" RENAME COLUMN "candidateId" TO "candidate_id";
ALTER TABLE "candidate_documents" RENAME COLUMN "documentTypeId" TO "document_type_id";
ALTER TABLE "candidate_documents" RENAME COLUMN "originalFilename" TO "original_filename";
ALTER TABLE "candidate_documents" RENAME COLUMN "filePath" TO "file_path";
ALTER TABLE "candidate_documents" RENAME COLUMN "mimeType" TO "mime_type";
ALTER TABLE "candidate_documents" RENAME COLUMN "fileSize" TO "file_size";
ALTER TABLE "candidate_documents" RENAME COLUMN "extractedText" TO "extracted_text";
ALTER TABLE "candidate_documents" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "candidate_documents" RENAME COLUMN "updatedAt" TO "updated_at";

-- Make some fields nullable to match new schema
ALTER TABLE "candidate_documents" ALTER COLUMN "original_filename" DROP NOT NULL;
ALTER TABLE "candidate_documents" ALTER COLUMN "mime_type" DROP NOT NULL;
ALTER TABLE "candidate_documents" ALTER COLUMN "file_size" DROP NOT NULL;

-- Rename columns in document_types table
ALTER TABLE "document_types" RENAME COLUMN "documentType" TO "document_type";
ALTER TABLE "document_types" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "document_types" RENAME COLUMN "updatedAt" TO "updated_at";

-- Drop old foreign key constraints
ALTER TABLE "candidate_documents" DROP CONSTRAINT IF EXISTS "candidate_documents_candidateId_fkey";
ALTER TABLE "candidate_documents" DROP CONSTRAINT IF EXISTS "candidate_documents_documentTypeId_fkey";

-- Drop old unique index
DROP INDEX IF EXISTS "document_types_documentType_key";

-- Recreate foreign key constraints with new column names
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate unique index with new column name
CREATE UNIQUE INDEX "document_types_document_type_key" ON "document_types"("document_type");

-- Note: The rest of the ERD schema tables will be created by Prisma in subsequent migrations
-- This migration only handles the existing tables that need column renaming

