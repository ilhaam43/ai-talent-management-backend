/*
  Warnings:

  - You are about to drop the column `email` on the `candidates` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `candidates` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `candidates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "password";
