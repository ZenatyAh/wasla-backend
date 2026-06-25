-- Safe on production DBs baselined before city/area were added to the squashed schema.
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "area" TEXT;
