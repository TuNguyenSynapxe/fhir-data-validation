# Feature Implementation Guides

This directory contains detailed implementation guides for specific features in the FHIR Processor V2 frontend.

## 📚 Available Guides

### Core Features
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Integration patterns and examples
- **[VALIDATION_STATE_IMPLEMENTATION.md](./VALIDATION_STATE_IMPLEMENTATION.md)** - Validation state machine
- **[VALIDATION_LABELING_REFACTOR.md](./VALIDATION_LABELING_REFACTOR.md)** - Validation source labeling
- **[VALIDATION_GATING_IMPLEMENTATION.md](./VALIDATION_GATING_IMPLEMENTATION.md)** - Enable/disable validation layers

### Rule Creation
- **[TREE_RULE_CREATION_README.md](./TREE_RULE_CREATION_README.md)** - Tree-based rule creation
- **[RULE_EDITOR_REFACTOR.md](./RULE_EDITOR_REFACTOR.md)** - Rule editor alignment with backend
- **[TERMINOLOGY_IMPLEMENTATION.md](./TERMINOLOGY_IMPLEMENTATION.md)** - Terminology constraint rules
- **[ARRAY_LENGTH_IMPLEMENTATION.md](./ARRAY_LENGTH_IMPLEMENTATION.md)** - Array length validation

### UI/UX Enhancements
- **[TREEVIEW_FOCUS_IMPLEMENTATION.md](./TREEVIEW_FOCUS_IMPLEMENTATION.md)** - Tree view focus behavior
- **[NON_BLOCKING_WARNINGS.md](./NON_BLOCKING_WARNINGS.md)** - Non-blocking warnings support
- **[VALIDATED_STATE_ENHANCEMENTS.md](./VALIDATED_STATE_ENHANCEMENTS.md)** - Validation state persistence

### Refactoring Documentation
- **[PHASE2B_EXECUTIVE_SUMMARY.md](./PHASE2B_EXECUTIVE_SUMMARY.md)** - Phase-2B prop grouping summary
- **[PHASE2B_PROP_GROUPING_REFACTOR.md](./PHASE2B_PROP_GROUPING_REFACTOR.md)** - Detailed Phase-2B documentation

## 🎯 Quick Reference

### For Integration Work
Start with [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - shows how to integrate validation panels, error displays, and context usage.

### For Rule Creation
See [TREE_RULE_CREATION_README.md](./TREE_RULE_CREATION_README.md) for the tree-based rule creation system and [RULE_EDITOR_REFACTOR.md](./RULE_EDITOR_REFACTOR.md) for manual rule editing.

### For Validation Work
Check [VALIDATION_STATE_IMPLEMENTATION.md](./VALIDATION_STATE_IMPLEMENTATION.md) for state machine logic and [VALIDATION_LABELING_REFACTOR.md](./VALIDATION_LABELING_REFACTOR.md) for source labeling.

### For Understanding Past Refactors
See [PHASE2B_EXECUTIVE_SUMMARY.md](./PHASE2B_EXECUTIVE_SUMMARY.md) for the prop grouping refactor and [PHASE2B_PROP_GROUPING_REFACTOR.md](./PHASE2B_PROP_GROUPING_REFACTOR.md) for detailed changes.

## 📋 Feature Status

| Feature | Status | Documentation |
|---------|--------|---------------|
| Validation State Machine | ✅ Complete | VALIDATION_STATE_IMPLEMENTATION.md |
| Tree-Based Rule Creation | ✅ Complete | TREE_RULE_CREATION_README.md |
| Terminology Constraints | ✅ Complete | TERMINOLOGY_IMPLEMENTATION.md |
| Validation Source Labeling | ✅ Complete | VALIDATION_LABELING_REFACTOR.md |
| Array Length Validation | ✅ Complete | ARRAY_LENGTH_IMPLEMENTATION.md |
| Non-Blocking Warnings | ✅ Complete | NON_BLOCKING_WARNINGS.md |
| Validation Gating | ✅ Complete | VALIDATION_GATING_IMPLEMENTATION.md |
| Validated State Persistence | ✅ Complete | VALIDATED_STATE_ENHANCEMENTS.md |
| Rule Editor Backend Alignment | ✅ Complete | RULE_EDITOR_REFACTOR.md |
| Tree View Focus | ✅ Complete | TREEVIEW_FOCUS_IMPLEMENTATION.md |
| Prop Grouping (Phase-2B) | ✅ Complete | PHASE2B_EXECUTIVE_SUMMARY.md |

## 🔗 Related Documentation

- **[../README.md](../README.md)** - Documentation navigation index
- **[../ARCHITECTURE.md](../ARCHITECTURE.md)** - Frontend architecture overview
- **[../VALIDATION_FLOW.md](../VALIDATION_FLOW.md)** - Validation pipeline details
- **[../REFACTORING_HISTORY.md](../REFACTORING_HISTORY.md)** - Chronological refactoring history
