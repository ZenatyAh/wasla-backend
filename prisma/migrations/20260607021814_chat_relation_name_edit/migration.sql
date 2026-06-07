/*
  Warnings:

  - You are about to drop the column `joinAt` on the `conversation_participants` table. All the data in the column will be lost.
  - You are about to drop the column `DeletedAt` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the `_ConversationToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ConversationToUser" DROP CONSTRAINT "_ConversationToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_ConversationToUser" DROP CONSTRAINT "_ConversationToUser_B_fkey";

-- AlterTable
ALTER TABLE "conversation_participants" DROP COLUMN "joinAt",
ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "DeletedAt",
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "_ConversationToUser";
