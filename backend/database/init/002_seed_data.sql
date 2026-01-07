-- =============================================================================
-- FHIR Processor V2 - Seed Data
-- =============================================================================
-- Description: Initial test data for development and testing
-- Created: 2026-01-04
-- =============================================================================

-- Sample Project 1: SG Core Patient Validation
INSERT INTO projects (
    slug, 
    name, 
    description, 
    ruleset_json, 
    status, 
    published_at
)
VALUES (
    'sg-core-patient',
    'Singapore Core Patient Validation',
    'Validates FHIR Patient resources against Singapore Core IG requirements',
    '{
        "rules": [
            {
                "id": "sg-patient-nric",
                "path": "Patient.identifier.where(system=''http://schemas.singhealth.com.sg/fhir/NamingSystem/nric'').exists()",
                "severity": "error",
                "message": "Patient must have NRIC identifier"
            }
        ],
        "codeSystems": [],
        "constraints": []
    }'::JSONB,
    'published',
    NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Sample Project 2: Observation Validation
INSERT INTO projects (
    slug, 
    name, 
    description, 
    ruleset_json, 
    status, 
    published_at
)
VALUES (
    'basic-observation',
    'Basic Observation Validation',
    'Validates FHIR Observation resources with common clinical constraints',
    '{
        "rules": [
            {
                "id": "obs-effective-date",
                "path": "Observation.effective.exists()",
                "severity": "error",
                "message": "Observation must have an effective date"
            },
            {
                "id": "obs-value-exists",
                "path": "Observation.value.exists() or Observation.dataAbsentReason.exists()",
                "severity": "error",
                "message": "Observation must have either a value or data absent reason"
            }
        ],
        "codeSystems": [],
        "constraints": []
    }'::JSONB,
    'published',
    NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Sample Project 3: Draft Project (not visible on public pages)
INSERT INTO projects (
    slug, 
    name, 
    description, 
    ruleset_json, 
    status
)
VALUES (
    'draft-medication',
    'Medication Validation (Draft)',
    'Work in progress validation rules for medication resources',
    '{
        "rules": [],
        "codeSystems": [],
        "constraints": []
    }'::JSONB,
    'draft'
) ON CONFLICT (slug) DO NOTHING;

-- Verify seed data
DO $$
DECLARE
    project_count INTEGER;
    published_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO project_count FROM projects;
    SELECT COUNT(*) INTO published_count FROM projects WHERE status = 'published';
    
    RAISE NOTICE 'Seed data loaded: % total projects, % published', project_count, published_count;
END $$;
