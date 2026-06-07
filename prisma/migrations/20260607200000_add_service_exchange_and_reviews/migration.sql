-- CreateEnum
CREATE TYPE "ServiceExchangeStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "service_exchanges" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER,
    "provider_id" INTEGER NOT NULL,
    "consumer_id" INTEGER NOT NULL,
    "time_credits" INTEGER NOT NULL,
    "status" "ServiceExchangeStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "service_exchange_id" INTEGER NOT NULL,
    "reviewer_id" INTEGER NOT NULL,
    "reviewee_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_exchanges_provider_id_status_idx" ON "service_exchanges"("provider_id", "status");

-- CreateIndex
CREATE INDEX "service_exchanges_consumer_id_status_idx" ON "service_exchanges"("consumer_id", "status");

-- CreateIndex
CREATE INDEX "service_exchanges_status_completed_at_idx" ON "service_exchanges"("status", "completed_at");

-- CreateIndex
CREATE INDEX "reviews_reviewee_id_created_at_idx" ON "reviews"("reviewee_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_service_exchange_id_reviewer_id_key" ON "reviews"("service_exchange_id", "reviewer_id");

-- AddForeignKey
ALTER TABLE "service_exchanges" ADD CONSTRAINT "service_exchanges_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_exchanges" ADD CONSTRAINT "service_exchanges_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_exchanges" ADD CONSTRAINT "service_exchanges_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_service_exchange_id_fkey" FOREIGN KEY ("service_exchange_id") REFERENCES "service_exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
