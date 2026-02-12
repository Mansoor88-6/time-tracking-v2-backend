-- Migration: Add Rule Type Fields for Domain/URL-Based Rules
-- This migration adds support for domain-level and URL-level productivity rules

-- Add rule_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE rule_type AS ENUM ('app_name', 'domain', 'url_exact', 'url_pattern');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add rule_type column with default value
ALTER TABLE team_productivity_rule
ADD COLUMN IF NOT EXISTS rule_type rule_type DEFAULT 'app_name'::rule_type;

-- Add pattern column for URL patterns
ALTER TABLE team_productivity_rule
ADD COLUMN IF NOT EXISTS pattern VARCHAR(500) NULL;

-- Add is_domain_rule flag for quick filtering
ALTER TABLE team_productivity_rule
ADD COLUMN IF NOT EXISTS is_domain_rule BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_productivity_rule_rule_type 
ON team_productivity_rule(rule_type);

CREATE INDEX IF NOT EXISTS idx_team_productivity_rule_is_domain_rule 
ON team_productivity_rule(is_domain_rule);

-- Create composite index for domain rule queries
CREATE INDEX IF NOT EXISTS idx_team_productivity_rule_domain_lookup 
ON team_productivity_rule(rule_type, is_domain_rule, app_type) 
WHERE rule_type IN ('domain', 'url_exact', 'url_pattern');

-- Update existing rules to set is_domain_rule flag where appropriate
-- Rules with appType='web' and appName containing a domain pattern
UPDATE team_productivity_rule
SET is_domain_rule = true
WHERE app_type = 'web' 
  AND app_name ~ '^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$'
  AND rule_type = 'app_name';

-- Note: This migration preserves all existing data
-- All existing rules will have rule_type='app_name' by default
-- Admins can gradually migrate to domain/URL rules via the UI
