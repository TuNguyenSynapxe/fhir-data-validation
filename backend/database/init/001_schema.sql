-- =============================================================================
-- FHIR Processor V2 - Database Schema Initialization
-- =============================================================================
-- Description: Initial schema for validation projects and rulesets
-- Created: 2026-01-04
-- Database: PostgreSQL 16+
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Table: projects
-- =============================================================================
-- Stores validation project metadata and rulesets
-- Each project represents a complete validation configuration
-- =============================================================================

CREATE TABLE IF NOT EXISTS projects (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Project Identifiers
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Validation Ruleset (JSON)
    ruleset_json JSONB NOT NULL,
    
    -- Project Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    
    -- Metadata (optional, for future use)
    features JSONB DEFAULT '{}'::JSONB,
    
    -- Indexing
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Fast lookup by slug (most common query)
CREATE INDEX idx_projects_slug ON projects(slug);

-- Fast filtering by status (published projects listing)
CREATE INDEX idx_projects_status ON projects(status);

-- Fast ordering by published date
CREATE INDEX idx_projects_published_at ON projects(published_at DESC)
    WHERE status = 'published';

-- Full-text search on name and description (optional, for search feature)
CREATE INDEX idx_projects_search ON projects 
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- =============================================================================
-- Triggers
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Initial Data (Optional)
-- =============================================================================

-- Sample project for testing (optional, can be removed)
INSERT INTO projects (slug, name, description, ruleset_json, status, published_at)
VALUES (
    'sample-validation-project',
    'Sample Validation Project',
    'A sample project for testing FHIR validation with basic rules',
    '{"rules": [], "codeSystems": [], "constraints": []}'::JSONB,
    'published',
    NOW()
) ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Verify table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
    ) THEN
        RAISE NOTICE 'Table projects created successfully';
    ELSE
        RAISE EXCEPTION 'Failed to create table projects';
    END IF;
END $$;
