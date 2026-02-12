-- Migration: Create Rule Collections System
-- This migration creates the rule collections tables and updates existing tables

-- Create rule_collection table
CREATE TABLE IF NOT EXISTS rule_collection (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rule_collection_tenant_id ON rule_collection(tenant_id);

-- Create rule_collection_team table (many-to-many)
CREATE TABLE IF NOT EXISTS rule_collection_team (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES rule_collection(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(collection_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_rule_collection_team_collection_id ON rule_collection_team(collection_id);
CREATE INDEX IF NOT EXISTS idx_rule_collection_team_team_id ON rule_collection_team(team_id);

-- Add collection_id to team_productivity_rule
ALTER TABLE team_productivity_rule 
ADD COLUMN IF NOT EXISTS collection_id INTEGER REFERENCES rule_collection(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_team_productivity_rule_collection_id ON team_productivity_rule(collection_id);

-- Add suggested_collection_id to unclassified_app
ALTER TABLE unclassified_app
ADD COLUMN IF NOT EXISTS suggested_collection_id INTEGER REFERENCES rule_collection(id) ON DELETE SET NULL;

-- Optional: Create default collections from existing rules
-- This is a data migration that can be run separately if needed
-- It groups existing rules by team and creates a default collection for each team

-- Note: This migration script should be run manually or via a migration tool
-- It does not automatically migrate existing data to preserve backward compatibility
