/*
  Warnings:

  - A unique constraint covering the columns `[hrAdminId]` on the table `companies` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "hrAdminId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "guide_dismissed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otp_code" TEXT,
ADD COLUMN     "otp_expiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_key" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "last_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_sessions_session_key_key" ON "chat_sessions"("session_key");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_hrAdminId_key" ON "companies"("hrAdminId");

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_hrAdminId_fkey" FOREIGN KEY ("hrAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
