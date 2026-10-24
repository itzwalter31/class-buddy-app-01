# Role-Based School Management: Database Proposal

**Proposal only. Do not execute this SQL or run a migration without explicit approval.**
No database was queried or changed while preparing this proposal.

## Authorization prerequisite

The existing `public.users` migration defines `role TEXT DEFAULT 'teacher'` and an
update policy that permits users to update their own row. That policy does not
restrict updates to profile columns, so a user can change their own `role` or
`school_id`. The signup flow must not assign a role or school. Before relying on
`public.users.role` for authorization, deploy an approved policy change after
confirming that `school_id` exists and that the grants match the deployed
Supabase roles.

Proposed SQL, conditional on that preflight:

```sql
BEGIN;

ALTER TABLE public.users
  ALTER COLUMN role DROP DEFAULT;

DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;
CREATE POLICY "Users can create their own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND role IS NULL
    AND school_id IS NULL
  );

REVOKE UPDATE ON TABLE public.users FROM PUBLIC, anon, authenticated;
GRANT UPDATE (full_name, school_name, avatar_url, updated_at)
  ON TABLE public.users TO authenticated;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMIT;
```

This proposal changes permissions and the signup default, but does not rewrite
existing user records. An authorized server-side provisioning path must assign
roles and school membership. Confirm the `anon`/`authenticated` grants and
service-role behavior in a non-production environment before approval.

## Subject and teacher assignment models

Add a `Subject` table with a generated text ID, `school_id`, `class_id`, `name`,
and timestamps. Enforce `UNIQUE(class_id, name)`, and restrict deletion of a
class or school while subjects reference it.

Add a `TeacherAssignment` join table with `teacher_id` (UUID referencing
`users.id`), `school_id`, `class_id`, `subject_id`, and a unique key on
`(teacher_id, subject_id)`. The service must verify that the teacher, subject,
class, and school all belong together; the database should enforce composite
school-scoped foreign keys where the existing column mappings allow it.

**Mapping blocker:** the current Prisma schema declares `Class.schoolId` without
`@map("school_id")`, while the untracked class migration draft adds `school_id`.
The current Prisma schema also requires a non-null class school and `Restrict`
deletion, while that draft creates a nullable column with `SET NULL`. Align and
verify those mappings and existing rows before writing executable DDL.

## Student account link

Add a nullable, unique `Student.user_id` UUID referencing `users.id` to support a
verified student-to-account link. Do not populate it by matching email, name, or
student number. Link existing students only through an authorized verification
process; enforce that linked student and user belong to the same school.

## Attendance uniqueness

The current `Attendance.date` is a timestamp and the existing records have not
been inspected. A unique key on `(student_id, date)` would not guarantee one
record per calendar day when timestamps differ. First approve a non-production
data inventory and decide whether attendance is unique per student/day or per
attendance session. Then propose a date-only/session key and a duplicate
resolution plan. Do not delete or overwrite historical attendance.

## Existing migration drafts

The untracked drafts under `backend/prisma/migrations/` were not modified or
applied. Review their ordering, nullable school IDs, foreign-key delete actions,
and existing-row backfill requirements before adding them to any deployable
migration history.

## Safe checks and commands

These checks do not apply migrations:

```powershell
npm run build
npm --prefix backend run build
npx --no-install tsc --noEmit
npx --no-install eslint src\components\AppShell.tsx src\routes\classes.tsx src\routes\auth.tsx src\lib\api.ts src\lib\user-service.ts
```

Prisma schema validation can be run with a local placeholder URL because it
does not connect to the database:

```powershell
$env:DATABASE_URL = 'postgresql://validation:validation@localhost:5432/validation'
& backend\node_modules\.bin\prisma.cmd validate --schema backend\prisma\schema.prisma
```

Do not run `prisma migrate deploy`, `prisma db push`, or any SQL from this
proposal until the schema mappings and existing data are reviewed and explicitly
approved.
