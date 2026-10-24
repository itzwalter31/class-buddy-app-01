ALTER TABLE "public"."Class"
ADD COLUMN "school_id" TEXT;

CREATE INDEX "Class_school_id_idx"
ON "public"."Class"("school_id");

ALTER TABLE "public"."Class"
ADD CONSTRAINT "Class_school_id_fkey"
FOREIGN KEY ("school_id")
REFERENCES "public"."School"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
