-- Offline time approval requests (run manually if synchronize is disabled)
CREATE TABLE IF NOT EXISTS offline_time_requests (
  id SERIAL PRIMARY KEY,
  "tenantId" integer NOT NULL,
  "userId" integer NOT NULL,
  "startAt" timestamptz NOT NULL,
  "endAt" timestamptz NOT NULL,
  description text NOT NULL,
  category varchar(20) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  "reviewedByUserId" integer,
  "reviewedAt" timestamptz,
  "declineReason" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offline_time_requests_tenant_status
  ON offline_time_requests ("tenantId", status);
CREATE INDEX IF NOT EXISTS idx_offline_time_requests_user
  ON offline_time_requests ("userId");

-- Optional: group rows from one multi-segment submit (run if synchronize is disabled)
-- ALTER TABLE offline_time_requests ADD COLUMN IF NOT EXISTS "submitBatchId" varchar(36);
