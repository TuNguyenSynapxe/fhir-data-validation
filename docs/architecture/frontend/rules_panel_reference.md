# Rules Panel - Quick Reference Guide

## Overview
The Rules Panel provides an IDE-style interface for managing FHIR validation rules in your project.

## Layout

```
┌─────────────────────────────────────────────────────────┐
│ Rules                    [Export] [+ Add] [Save]        │
├─────────────────────────────────────────────────────────┤
│ [Search FHIRPath or message...]                         │
│ [Resource] [Rule Type] [Severity] [Origin]              │
├────────────┬────────────────────────────────────────────┤
│ Resources  │ Patient → Required (3)                     │
│            │   ▸ name.family  Required·Error·Project   │
│ All (25)   │   ▸ birthDate    Required·Error·Project   │
│ Patient (12)│   ▸ gender       Required·Error·Project   │
│ Observ. (8)│                                            │
│ Encounter(5)│ Patient → FixedValue (2)                  │
│            │   ▸ active       FixedValue·Warn·Advisory  │
└────────────┴────────────────────────────────────────────┘
```

## Quick Actions

### Add a Rule
1. Click **[+ Add Rule]** button
2. Modal opens with rule editor
3. Fill in: Resource Type, FHIRPath, Rule Type, Message
4. Click **Save**
5. Click **[Save Rules]** to persist

### Edit a Rule
1. Click rule row to expand
2. Click **Edit** icon (pencil)
3. Modify fields in modal
4. Click **Save**

### Delete a Rule
1. Click **Delete** icon (trash) on rule row
2. Confirm deletion
3. Click **[Save Rules]** to persist

### Enable/Disable a Rule
1. Click **Eye** icon on rule row
2. Disabled rules shown with reduced opacity
3. Click **[Save Rules]** to persist

## Filtering Rules

### By Search Query
Type in search box to filter by:
- FHIRPath expression
- Rule message text

### By Resource Navigator
Click resource type in left sidebar:
- Shows only rules for that resource
- Click "All Resources" to clear

### By Dropdowns
Use filter dropdowns to refine:
- **Resource Type**: Patient, Observation, etc.
- **Rule Type**: Required, FixedValue, CodeSystem, etc.
- **Severity**: Error, Warning, Information
- **Origin**: 
  - **Project** (purple) - Manually created
  - **HL7 Advisory** (blue) - System suggested
  - **Suggested** (indigo) - AI suggested

**Note**: All filters work together (AND logic)

## Navigate to Bundle Field

### From Rule FHIRPath
1. Expand a rule by clicking the row
2. In expanded view, click the **FHIRPath code** snippet
3. Bundle panel automatically switches to Tree View
4. Tree expands to the target field
5. Field is highlighted and scrolled into view

### Example Flow
```
Rule: Patient.name.family
  ↓ (Click FHIRPath)
Bundle Tree View:
  entry
    └─ 0
        └─ resource (Patient)
            └─ name
                └─ 0
                    └─ family ← HIGHLIGHTED
```

## Understanding Rule Badges

### Severity
- **Error** (Red): Validation will fail
- **Warning** (Yellow): Advisory, validation continues
- **Information** (Blue): Informational only

### Origin
- **Project** (Purple): Your custom business rules
- **HL7 Advisory** (Blue): System-suggested best practices
- **Suggested** (Indigo): AI-generated suggestions (future)

## Rule Grouping

Rules are grouped hierarchically:

```
ResourceType → RuleType
  └─ Individual rules
```

**Example**:
```
Patient → Required
  ▸ name.family
  ▸ birthDate
  ▸ gender

Patient → FixedValue
  ▸ active
  ▸ text.status
```

## Export Rules

Click **[Export]** to download `rules.json`:

```json
{
  "version": "1.0",
  "fhirVersion": "R4",
  "rules": [
    {
      "id": "rule-123",
      "type": "Required",
      "resourceType": "Patient",
      "path": "name.family",
      "severity": "error",
      "message": "Family name is required"
    }
  ]
}
```

## Tips & Tricks

### Finding Rules Quickly
1. Use **search** for partial text matches
2. Use **navigator** for resource-level filtering
3. Use **dropdowns** for precise filtering
4. Combine all three for laser-focused results

### Organizing Rules
1. Group similar rules by resource type
2. Use consistent naming in messages
3. Set appropriate severities (error vs warning)
4. Add origin metadata for tracking

### Debugging Rules
1. Click FHIRPath to navigate to bundle
2. Check "Why this rule exists" for explanation
3. Use Test & Validate to see rule in action
4. Check Validation Panel for rule results

### Keyboard Navigation
- **Tab**: Move between elements
- **Enter**: Expand/collapse groups and rules
- **Space**: Activate buttons
- **Esc**: Close modals

## Troubleshooting

### Rule Not Appearing
- Check if filters are hiding it
- Clear all filters (select "All" options)
- Check search box is empty
- Verify rule was saved

### FHIRPath Navigation Not Working
- Ensure rule has valid `path` field
- Check Bundle panel has data loaded
- Verify path exists in current bundle
- Check browser console for errors

### Rules Not Saving
- Check for validation errors in modal
- Ensure required fields are filled
- Click **[Save Rules]** after changes
- Check network tab for API errors

### Performance Issues
- Use filters to reduce visible rules
- Collapse unnecessary groups
- Clear search when not needed
- Consider splitting rules into multiple projects

## Best Practices

### Rule Design
✅ **DO**:
- Use descriptive messages
- Set appropriate severity levels
- Document complex FHIRPath expressions
- Test rules with sample data

❌ **DON'T**:
- Create duplicate rules
- Use overly broad paths
- Mix validation concerns
- Forget to save changes

### Organization
✅ **DO**:
- Group related rules by resource
- Use consistent naming conventions
- Mark origin for tracking
- Export backups regularly

❌ **DON'T**:
- Create flat unorganized lists
- Mix different FHIR versions
- Leave rules enabled unnecessarily
- Forget to document custom logic

## Related Documentation

- [Rule DSL Specification](./03_rule_dsl_spec.md)
- [Validation Pipeline](./05_validation_pipeline.md)
- [Smart Path Navigation](./07_smart_path_navigation.md)
- [Rule Explainability](./09_ai_assisted_ruleset_generation.md)
- [Full Implementation Guide](./RULES_PANEL_REFACTORING.md)

## Support

Issues or questions?
1. Check this guide first
2. Review component documentation
3. Test with example data
4. Check browser console for errors

---

**Version**: 1.0  
**Last Updated**: December 15, 2025
