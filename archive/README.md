# Archive - Implementation Documentation & Reports

This directory contains archived implementation documentation, audit reports, phase completions, and test scripts.

## Structure

```
archive/
├── audit-reports/            # System audits and health checks
├── phase-completions/        # Phase completion summaries (PHASE_1 - PHASE_11)
├── implementation-summaries/ # Implementation and testing summaries
├── implementation-docs/      # Legacy feature implementation docs
│   ├── backend/              # Backend implementations
│   ├── frontend/             # Frontend UI implementations
│   ├── frontend-features/    # Feature-specific implementations
│   └── docs/                 # Documentation implementations
└── test-scripts/             # Test scripts and sample data
```

## Current Project Root

Only essential documentation remains at the project root:
- `README.md` - Project overview and setup instructions
- `PROJECT_STRUCTURE.md` - Current project organization
- `CHANGELOG.md` - Version history and changes

## Archived Categories

### Audit Reports
System health checks and audits from various development phases:
- AUTO_RULE_GENERATION_AUDIT_REPORT.md
- FIRELY_VALIDATION_AUDIT_REPORT.md
- REPOSITORY_STRUCTURE_AUDIT_REPORT.md
- RULE_SYSTEM_AUDIT_REPORT.md
- SD_CENTRIC_UI_AUDIT_REPORT.md
- VALIDATION_ENGINE_AUDIT_REPORT.md
- VALIDATION_ENGINE_BOUNDARY_AUDIT.md
- And phase-specific audits

### Phase Completions
Milestone completion reports (PHASE_1 through PHASE_11):
- Phase completion summaries
- Phase status reports
- Quick reference guides
- Deployment documentation

### Implementation Summaries
Detailed implementation and testing summaries:
- Database migration assessments
- Refactoring plans and summaries
- Testing summaries
- Infrastructure setup documentation

## Implementation Docs

### Root-Level Feature Implementations
- AUTO_SAVE_IMPLEMENTATION.md
- COMPLETE_TERMINOLOGY_IMPLEMENTATION.md
- EXPLANATION_UI_COMPLETE.md
- FEATURE_FLAGS_IMPLEMENTATION.md
- MODE_TABS_IMPLEMENTATION.md
- RESOURCE_SWITCHER_IMPLEMENTATION.md
- RULE_MODE_SELECTOR_IMPLEMENTATION.md
- SCHEMA_GUARDRAILS_IMPLEMENTATION.md
- SEMANTIC_RULE_SUGGESTION_IMPLEMENTATION.md
- SEMANTIC_SUBTYPING_IMPLEMENTATION.md
- SMART_PROPERTY_SUGGESTIONS_IMPLEMENTATION.md
- SYSTEM_RULE_SUGGESTION_IMPLEMENTATION.md
- SYSTEM_RULE_SUGGESTION_UI_GUIDE.md

### Backend Implementations
- BUNDLE_PATH_EXPLORER.md
- FEATURE_FLAG_IMPLEMENTATION.md
- FHIR_R5_MIGRATION.md
- FHIR_SCHEMA_ENDPOINT.md
- MISSING_REQUIRED_FIELD_IMPLEMENTATION.md
- RULETYPE_NORMALIZATION_VISUAL_COMPARISON.md
- TEMPLATE_BASED_EXPLANATIONS.md

### Frontend Implementations
- EXPLANATION_UI_REFACTOR.md
- EXPLANATION_UI_VISUAL_REFERENCE.md
- NESTED_ARRAY_VISUAL_REFERENCE.md
- RULES_TAB_REFACTOR_VISUAL_COMPARISON.md
- RULE_MESSAGE_TEMPLATES_QUICK_REFERENCE.md
- RULE_MESSAGE_TEMPLATE_IMPLEMENTATION_SUMMARY.md
- VALIDATION_GROUPING_REFACTOR.md
- VALIDATION_ICONS_REFACTOR.md

### Feature-Specific
- PHASE2B_EXECUTIVE_SUMMARY.md
- PHASE2B_PROP_GROUPING_REFACTOR.md
- RULE_EDITOR_REFACTOR.md
- VALIDATION_LABELING_REFACTOR.md

### Documentation
- SAMPLE_LABELING_IMPLEMENTATION.md
- SAMPLE_UI_VISUAL_REFERENCE.md
- SCHEMA_REPLACEMENT_IMPLEMENTATION.md
- STATE_PRESERVATION_IMPLEMENTATION.md
- VALIDATION_LABELING_VISUAL_REFERENCE.md
- VALIDATION_UI_REFACTORING.md
- RULES_PANEL_REFACTORING.md

## Test Scripts

- test-hint-generation.csx - C# script for testing hint generation
- test-normalization.csx - C# script for testing rule type normalization
- test-patient-missing-language.json - Sample test data for validation

## Active Documentation

For current implementation status and active documentation, see:
- `/README.md` - Main project README
- `/PROJECT_STRUCTURE.md` - Project structure overview
- `/CHANGELOG.md` - Version history
- `/docs/` - Core specification documents (01-11)
- `/backend/README.md` - Backend documentation

## Note

These archived documents represent completed implementations and historical work. They are kept for reference but should not be considered the source of truth for current system behavior. Always refer to the codebase and active documentation in `/docs/` for current implementation details.
