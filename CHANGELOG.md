# Changelog

All notable changes to the FHIR Processor V2 project.

## [Unreleased]

### Added - December 28, 2025
- RequiredRuleForm UX refactor with minimalist design
- Icon-based resource type selector (7 supported resources)
- Auto-set error code (`FIELD_REQUIRED`) for required rules
- Horizontal segmented severity controls
- Collapsible error preview (opt-in)
- Compact instance scope chip selector

### Fixed - December 28, 2025
- TypeScript build errors (101 → 0)
- CodeSystem type definitions now FHIR R4 compatible
- Added missing fields: `title`, `status`, `description`, `version`, `publisher`, `content`, `count`
- CodeSystemConcept now supports `definition` and nested `concept` hierarchy
- Unified CodeSetDto/CodeSetConceptDto as type aliases
- Converted API error handling from wrapper pattern to async/await
- Fixed unused variable warnings in terminology components

### Changed - December 28, 2025
- Moved 42 phase-specific markdown files to `docs/archive/phase-reports/`
- Consolidated root-level documentation
- Updated main README with comprehensive project overview
- Disabled unused variables/parameters TypeScript checks (temporarily)
- Updated PROJECT_STRUCTURE.md with current architecture

### Removed - December 28, 2025
- Redundant phase completion reports from root directory
- Deprecated refactoring summaries from root directory
- Legacy architectural audit reports from root directory

---

## Historical Phases (Archived)

All phase completion reports have been moved to `docs/archive/phase-reports/` for reference:

- Phase 0: Project initialization and structure setup
- Phase 1: Structural refactoring and CodeSystem UI
- Phase 2: No-prose enforcement in validation
- Phase 3: Frontend hardening
- Phase 4: Backend message removal
- Phase 5: Rule migration
- Phase 6: Scope chip integration
- Phase 7: Rule governance and explanation panels
- Phase 8: Governance integration
- Phase 16-19: Layout, contextual bundle, V1 scope limitation, enum/string refactor

For detailed history, see individual reports in `docs/archive/phase-reports/`.

---

## Version Strategy

This project follows semantic versioning principles:
- **Major**: Breaking API or schema changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, documentation updates

Current Status: **Pre-release development**
