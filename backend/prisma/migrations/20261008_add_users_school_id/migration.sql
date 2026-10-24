-- Add nullable school_id to users without changing existing rows
ALTER TABLE "public"."users"
ADD COLUMN "school_id" TEXT;

-- Index school_id for lookup and foreign-key performance
CREATE INDEX IF NOT EXISTS "users_school_id_idx"
ON "public"."users"("school_id");

-- Link users to schools while preserving users if a school is deleted
ALTER TABLE "public"."users"
ADD CONSTRAINT "users_school_id_fkey"
FOREIGN KEY ("school_id")
REFERENCES "public"."School"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
