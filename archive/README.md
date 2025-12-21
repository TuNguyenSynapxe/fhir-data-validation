# Archive - Implementation Documentation & Test Scripts

This directory contains archived implementation documentation and test scripts that have been consolidated for reference.

## Structure

```
archive/
├── implementation-docs/
│   ├── backend/          # Backend feature implementations
│   ├── frontend/         # Frontend UI implementations
│   ├── frontend-features/# Feature-specific implementations
│   └── docs/             # Documentation implementations
└── test-scripts/         # Test scripts and sample data
```

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
- `/docs/` - Core specification documents (01-11)
- `/backend/README.md` - Backend documentation
- `/backend/QUICK_START.md` - Backend quick start guide
- `/CONTEXT_BADGE_IMPLEMENTATION.md` - Latest feature implementation (TreeView context badges)
- `/PROJECT_STRUCTURE.md` - Project structure overview

## Note

These archived documents represent completed implementations and historical refactoring work. They are kept for reference but should not be considered the source of truth for current system behavior. Always refer to the codebase and active documentation for current implementation details.
