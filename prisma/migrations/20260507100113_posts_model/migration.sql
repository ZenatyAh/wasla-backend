/*
  Warnings:

  - You are about to drop the column `post_type` on the `posts` table. All the data in the column will be lost.
  - Changed the type of `category` on the `posts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('OFFER', 'REQUEST');

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "post_type",
DROP COLUMN "category",
ADD COLUMN     "category" "PostCategory" NOT NULL;

-- DropEnum
DROP TYPE "PostType";
