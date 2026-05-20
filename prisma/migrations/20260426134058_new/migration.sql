/*
  Warnings:

  - You are about to drop the column `isVerfied` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "isVerfied",
ADD COLUMN     "is_verfied" BOOLEAN NOT NULL DEFAULT false;
