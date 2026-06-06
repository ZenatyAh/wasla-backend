-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "trust_rating" DOUBLE PRECISION NOT NULL DEFAULT 0;
