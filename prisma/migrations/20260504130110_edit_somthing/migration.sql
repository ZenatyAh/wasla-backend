/*
  Warnings:

  - Changed the type of `type` on the `POST` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `skill_type` on the `user_skills` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "skill_type" AS ENUM ('OFFER', 'REQUEST');

-- AlterTable
ALTER TABLE "POST" DROP COLUMN "type",
ADD COLUMN     "type" "skill_type" NOT NULL;

-- AlterTable
ALTER TABLE "user_skills" DROP COLUMN "skill_type",
ADD COLUMN     "skill_type" "skill_type" NOT NULL;

-- DropEnum
DROP TYPE "ServiceType";

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_user_id_skill_id_skill_type_key" ON "user_skills"("user_id", "skill_id", "skill_type");
