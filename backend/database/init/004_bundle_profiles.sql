-- Migration 004: Add bundle_profiles table for multi-bundle support
-- Purpose: Enable multiple Bundle StructureDefinitions per project
-- Backward Compatibility: Preserves existing sample_bundle_json column

-- Create bundle_profiles table
CREATE TABLE IF NOT EXISTS bundle_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Profile metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    canonical_url VARCHAR(500) NOT NULL,
    
    -- StructureDefinition JSON (from Simplifier package or manual entry)
    structure_definition_json TEXT NOT NULL,
    
    -- Is this the default profile for this project?
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique canonical URL per project
    CONSTRAINT uq_project_canonical UNIQUE (project_id, canonical_url)
);

-- Partial unique index for is_default (allows multiple false, only one true per project)
CREATE UNIQUE INDEX idx_bundle_profiles_project_default 
    ON bundle_profiles (project_id, is_default) 
    WHERE is_default = TRUE;

-- Index for fast lookups
CREATE INDEX idx_bundle_profiles_project_id ON bundle_profiles(project_id);
CREATE INDEX idx_bundle_profiles_canonical ON bundle_profiles(canonical_url);

-- Migrate existing sample_bundle_json to bundle_profiles
-- Only migrate projects that have a sample_bundle_json value
INSERT INTO bundle_profiles (
    project_id, 
    name, 
    description,
    canonical_url, 
    structure_definition_json, 
    is_default
)
SELECT 
    id AS project_id,
    name || ' - Default Bundle' AS name,
    'Migrated from existing sample bundle' AS description,
    'http://hl7.org/fhir/StructureDefinition/Bundle' AS canonical_url,
    COALESCE(sample_bundle_json, '{}') AS structure_definition_json,
    TRUE AS is_default
FROM projects
WHERE sample_bundle_json IS NOT NULL
ON CONFLICT (project_id, canonical_url) DO NOTHING;

-- NOTE: We DO NOT drop sample_bundle_json column yet
-- This ensures backward compatibility during transition period
-- Column can be removed in a future migration after verifying stability

-- Add comment to table
COMMENT ON TABLE bundle_profiles IS 'Bundle StructureDefinition profiles for validation scenarios. Multiple profiles can exist per project.';
COMMENT ON COLUMN bundle_profiles.canonical_url IS 'FHIR canonical URL of the Bundle StructureDefinition';
COMMENT ON COLUMN bundle_profiles.structure_definition_json IS 'Full StructureDefinition JSON for profile validation';
COMMENT ON COLUMN bundle_profiles.is_default IS 'Whether this is the default profile when none is explicitly selected';
