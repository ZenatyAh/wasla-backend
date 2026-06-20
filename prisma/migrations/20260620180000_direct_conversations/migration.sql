-- AlterTable
ALTER TABLE "conversations" ALTER COLUMN "postId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "directKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "conversations_directKey_key" ON "conversations"("directKey");
