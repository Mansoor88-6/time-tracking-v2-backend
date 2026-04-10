-- Production runbook: one rule collection per team
-- Run only after backup. Resolve duplicate team rows before adding UNIQUE(team_id).

-- 1) Preview teams assigned to more than one collection
-- SELECT team_id, COUNT(*) AS n, array_agg(collection_id ORDER BY collection_id) AS collection_ids
-- FROM rule_collection_team
-- GROUP BY team_id
-- HAVING COUNT(*) > 1;

-- 2) Example: keep the smallest collection_id per team and delete other assignments
-- (Adjust strategy if you prefer "most rules" or manual picks.)
-- DELETE FROM rule_collection_team rct
-- USING (
--   SELECT team_id, MIN(collection_id) AS keep_id
--   FROM rule_collection_team
--   GROUP BY team_id
--   HAVING COUNT(*) > 1
-- ) x
-- WHERE rct.team_id = x.team_id AND rct.collection_id <> x.keep_id;

-- 3) Point productivity rules at the surviving collection for each team
-- UPDATE team_productivity_rule tpr
-- SET collection_id = rct.collection_id
-- FROM rule_collection_team rct
-- WHERE rct.team_id = tpr.team_id
--   AND (tpr.collection_id IS DISTINCT FROM rct.collection_id);

-- 4) Replace composite unique with unique on team_id only
-- DROP CONSTRAINT name may differ; find with:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'rule_collection_team'::regclass;

ALTER TABLE rule_collection_team DROP CONSTRAINT IF EXISTS rule_collection_team_collection_id_team_id_key;

ALTER TABLE rule_collection_team
  ADD CONSTRAINT rule_collection_team_team_id_key UNIQUE (team_id);
