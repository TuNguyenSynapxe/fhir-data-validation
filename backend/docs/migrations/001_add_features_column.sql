-- Migration: Add Features Column to Projects Table
-- Date: 2025-12-17
-- Purpose: Add per-project feature flags for controlling access to experimental features

-- ============================================================================
-- PostgreSQL Migration (for future database implementation)
-- ============================================================================

-- Add features column with default empty JSON object
ALTER TABLE projects
ADD COLUMN features JSONB DEFAULT '{}'::jsonb;

-- Update existing rows to have empty features object (backward compatible)
UPDATE projects
SET features = '{}'::jsonb
WHERE features IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.features IS 'Per-project feature flags stored as JSONB. Controls access to experimental/preview features. Default: {}';

-- ============================================================================
-- Example: Enable treeRuleAuthoring for a specific project
-- ============================================================================

-- Enable for specific project
UPDATE projects
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{treeRuleAuthoring}',
  'true'::jsonb
)
WHERE id = 'your-project-id-here';

-- Verify
SELECT id, name, features FROM projects WHERE id = 'your-project-id-here';

-- ============================================================================
-- Example: Disable feature for a project
-- ============================================================================

UPDATE projects
SET features = jsonb_set(
  features,
  '{treeRuleAuthoring}',
  'false'::jsonb
)
WHERE id = 'your-project-id-here';

-- ============================================================================
-- Example: Query projects with feature enabled
-- ============================================================================

SELECT id, name, features
FROM projects
WHERE features->>'treeRuleAuthoring' = 'true';

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- ALTER TABLE projects DROP COLUMN features;

-- ============================================================================
-- Notes for File-Based Storage (Current Implementation)
-- ============================================================================

-- The current implementation uses file-based JSON storage.
-- To enable the feature for a project:
-- 1. Locate the project JSON file in ProjectStorage/{projectId}.json
-- 2. Add or update the featuresJson field:
--    "featuresJson": "{\"treeRuleAuthoring\":true}"
-- 3. Restart the API or let it reload on next request
--
-- The API will automatically deserialize this into the Features object
-- and return it in API responses as:
-- "features": { "treeRuleAuthoring": true }

-- ============================================================================
-- Security Notes
-- ============================================================================

-- Feature flags are PER PROJECT, not global
-- Default state is false (opt-in)
-- No automatic enabling
-- Requires manual database/file update to enable
-- Safe to add to existing projects (backward compatible)
