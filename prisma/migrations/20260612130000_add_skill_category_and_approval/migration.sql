-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('TECHNICAL', 'GENERAL');

-- AlterTable
ALTER TABLE "skills" ADD COLUMN "category" "SkillCategory" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "skills" ADD COLUMN "is_approved" BOOLEAN NOT NULL DEFAULT true;
