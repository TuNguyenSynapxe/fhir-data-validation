-- ============================================================================
-- Migration: 003_admin_support.sql
-- Purpose: Extend projects table to support admin authoring features
-- Date: 2026-01-05
-- ============================================================================

-- Add missing columns for admin functionality
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS fhir_version VARCHAR(10) DEFAULT 'R4' NOT NULL,
ADD COLUMN IF NOT EXISTS codemaster_json JSONB,
ADD COLUMN IF NOT EXISTS sample_bundle_json TEXT,
ADD COLUMN IF NOT EXISTS validation_settings_json JSONB;

-- Update existing trigger to handle updated_at if not exists
-- (The trigger was created in 001_schema.sql, but we ensure it exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_projects_updated_at') THEN
        CREATE TRIGGER update_projects_updated_at
            BEFORE UPDATE ON projects
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Update existing records to have default fhir_version
UPDATE projects SET fhir_version = 'R4' WHERE fhir_version IS NULL;

-- Add index for fhir_version (useful for filtering)
CREATE INDEX IF NOT EXISTS idx_projects_fhir_version ON projects(fhir_version);

-- Add comment for documentation
COMMENT ON COLUMN projects.fhir_version IS 'FHIR version for validation (e.g., R4, R5)';
COMMENT ON COLUMN projects.codemaster_json IS 'CodeMaster definitions stored as JSONB';
COMMENT ON COLUMN projects.sample_bundle_json IS 'Sample FHIR bundle for testing (stored as TEXT due to size)';
COMMENT ON COLUMN projects.validation_settings_json IS 'Runtime validation settings separate from rules';

-- Verify migration
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'projects'
    AND column_name IN ('fhir_version', 'codemaster_json', 'sample_bundle_json', 'validation_settings_json');
    
    IF column_count = 4 THEN
        RAISE NOTICE '✅ Migration 003_admin_support completed successfully. Added 4 columns.';
    ELSE
        RAISE WARNING '⚠️  Migration may be incomplete. Expected 4 new columns, found %', column_count;
    END IF;
END
$$;
