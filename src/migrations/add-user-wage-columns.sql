-- Optional: run if TypeORM synchronize is disabled.
-- Compensation fields for employee wage estimates (admin-managed).

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS daily_working_hours double precision NULL,
  ADD COLUMN IF NOT EXISTS monthly_wage double precision NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_wage_currency_enum') THEN
    CREATE TYPE "user_wage_currency_enum" AS ENUM ('PKR', 'USD');
  END IF;
END$$;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS wage_currency "user_wage_currency_enum" NULL;
