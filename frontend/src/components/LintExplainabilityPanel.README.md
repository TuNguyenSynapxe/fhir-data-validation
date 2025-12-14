# LintExplainabilityPanel Component

## Overview

The `LintExplainabilityPanel` is a read-only React component that provides comprehensive visualization and explanation of lint validation issues detected during FHIR data pre-validation. It emphasizes that lint checks are **best-effort** and **non-blocking**, with Firely validation remaining the final authority.

## Key Features

### ✅ Grouped Visualization
- **By Category**: Json, Structure, SchemaShape, Primitive, Compatibility
- **By Severity**: Error, Warning, Info
- Collapsible sections for better navigation

### ✅ Rich Context Display
- **Rule Information**: Rule ID, title, description
- **Confidence Badges**: High, Medium, Low indicators
- **Location Details**: 
  - Resource type
  - JSON Pointer paths
  - FHIR Path expressions
- **Additional Context**: Custom details per issue
- **Version Information**: FHIR version (R4/R5) context

### ✅ Clear Communication
- **Best-effort disclaimer** prominently displayed
- **Non-blocking nature** explicitly stated
- **Firely authority** repeatedly emphasized
- **Rule-specific disclaimers** for each issue type

### ✅ User Experience
- Collapsible categories and issues
- Clear visual distinction from Firely errors (blue theme vs validation error themes)
- "Best-effort pre-validation" explicit labeling
- Read-only interface - no editing capabilities
- Responsive layout with proper overflow handling

## Usage

### Basic Integration

```tsx
import LintExplainabilityPanel from '../components/LintExplainabilityPanel';
import type { LintIssue } from '../components/LintExplainabilityPanel';

function MyComponent() {
  const [showLintPanel, setShowLintPanel] = useState(false);
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);

  // After validation
  const handleValidation = async () => {
    const response = await validateProject(projectId);
    
    // Separate lint issues from Firely errors
    if (response.lintIssues && response.lintIssues.length > 0) {
      setLintIssues(response.lintIssues);
      setShowLintPanel(true);
    }
  };

  return (
    <>
      {/* Your main UI */}
      <button onClick={handleValidation}>Validate</button>

      {/* Lint Panel Modal */}
      {showLintPanel && (
        <LintExplainabilityPanel
          lintIssues={lintIssues}
          fhirVersion="R4"
          onClose={() => setShowLintPanel(false)}
        />
      )}
    </>
  );
}
```

### With Validation Response

```tsx
interface ValidationResponse {
  errors: ValidationError[];        // Firely errors
  lintIssues?: LintIssue[];        // Lint pre-validation issues
  summary: ValidationSummary;
  metadata: ValidationMetadata;
}

// Show lint panel BEFORE or ALONGSIDE Firely errors
const response = await projectsApi.validate(projectId);

// Option 1: Show lint issues first for quick feedback
if (response.lintIssues?.length > 0) {
  setShowLintPanel(true);
}

// Option 2: Allow toggling between lint and Firely panels
<div className="flex gap-2">
  {response.lintIssues?.length > 0 && (
    <button onClick={() => setActivePanel('lint')}>
      Lint Issues ({response.lintIssues.length})
    </button>
  )}
  {response.errors?.length > 0 && (
    <button onClick={() => setActivePanel('firely')}>
      Firely Errors ({response.errors.length})
    </button>
  )}
</div>
```

## Data Structure

### LintIssue Interface

```typescript
export interface LintIssue {
  // Rule identification (matches LintRuleCatalog)
  ruleId: string;              // e.g., "LINT_INVALID_DATE"
  category: string;            // "Json" | "Structure" | "SchemaShape" | "Primitive" | "Compatibility"
  
  // Severity and confidence
  severity: string;            // "error" | "warning" | "info"
  confidence: string;          // "high" | "medium" | "low"
  
  // Descriptive content from catalog
  title: string;               // Short title
  description: string;         // Detailed explanation
  message: string;             // Specific occurrence message
  disclaimer?: string;         // Best-effort disclaimer
  
  // Location information
  resourceType?: string;       // e.g., "Patient", "Observation"
  jsonPointer?: string;        // e.g., "/entry/0/resource/birthDate"
  fhirPath?: string;          // e.g., "Bundle.entry[0].resource.birthDate"
  
  // Additional context
  details?: Record<string, unknown>;  // Custom key-value pairs
}
```

### Example Lint Issue

```typescript
const exampleIssue: LintIssue = {
  ruleId: "LINT_R5_FIELD_IN_R4",
  category: "Compatibility",
  severity: "error",
  confidence: "medium",
  title: "R5-Only Field Used in R4",
  description: "This field is only available in FHIR R5 but the bundle is declared as R4.",
  message: "Field 'Encounter.actualPeriod' is R5-only, use 'Encounter.period' in R4",
  disclaimer: "Version compatibility check based on known R5/R4 differences. May not be exhaustive. Firely will validate against the specified FHIR version.",
  resourceType: "Encounter",
  jsonPointer: "/entry/2/resource/actualPeriod",
  fhirPath: "Bundle.entry[2].resource.actualPeriod",
  details: {
    field: "actualPeriod",
    fhirVersion: "R4",
    availableIn: "R5",
    alternative: "Use 'period' field in R4"
  }
};
```

## Component Props

```typescript
interface LintExplainabilityPanelProps {
  lintIssues: LintIssue[];    // Array of lint issues to display
  fhirVersion?: string;       // FHIR version context (e.g., "R4", "R5")
  onClose: () => void;        // Close handler
}
```

## Categories

### 1. Json Category 🔵
Fundamental JSON syntax and parsing issues.
- `LINT_EMPTY_INPUT`
- `LINT_INVALID_JSON`
- `LINT_ROOT_NOT_OBJECT`

**Theme**: Purple/Blue tones

### 2. Structure Category 🏗️
FHIR Bundle and resource structural requirements.
- `LINT_MISSING_RESOURCE_TYPE`
- `LINT_NOT_BUNDLE`
- `LINT_ENTRY_NOT_ARRAY`
- `LINT_ENTRY_MISSING_RESOURCE`

**Theme**: Blue tones

### 3. SchemaShape Category 📐
Schema-based type expectations.
- `LINT_EXPECTED_ARRAY`
- `LINT_EXPECTED_OBJECT`

**Theme**: Indigo tones

### 4. Primitive Category 🔢
FHIR primitive data type validation.
- `LINT_INVALID_DATE`
- `LINT_INVALID_DATETIME`
- `LINT_BOOLEAN_AS_STRING`

**Theme**: Pink tones

### 5. Compatibility Category 🔄
Version-specific field compatibility (R4 ↔ R5).
- `LINT_R5_FIELD_IN_R4`
- `LINT_DEPRECATED_R4_FIELD`

**Theme**: Teal tones

## Design Principles

### 🚫 Non-Blocking
- Lint issues **never prevent** Firely validation from running
- Panel is informational and educational
- No validation errors are "final" until Firely confirms

### 📚 Explainability
- Every issue includes:
  - What went wrong (message)
  - Why it matters (description)
  - Where it occurred (paths)
  - How confident we are (badge)
  - Important caveats (disclaimer)

### 🎨 Visual Distinction
- **Blue/teal color scheme** (vs red/yellow for Firely errors)
- **"Lint Pre-Validation Report"** header
- **"Best-effort"** terminology throughout
- **Shield icons** for confidence/protection context

### 🔒 Read-Only
- No editing capabilities
- No rule configuration from this panel
- Pure visualization and explanation

## Demo Page

Access the interactive demo at `/lint-demo` route:

```
http://localhost:5173/lint-demo
```

The demo showcases:
- All 5 lint categories
- Multiple severity levels
- Various confidence levels
- Different scenario filters (All, Errors Only, Warnings Only, Compatibility)
- Interactive expansion/collapse
- Real sample data from all rule types

## Integration Checklist

When integrating LintExplainabilityPanel:

- [ ] Ensure backend returns `lintIssues` array in validation response
- [ ] Separate lint issues from Firely errors in UI state
- [ ] Display lint panel separately from error panel
- [ ] Use blue/teal theme to distinguish from validation errors
- [ ] Include "best-effort" language in triggers/buttons
- [ ] Pass FHIR version if available for context
- [ ] Allow users to close/dismiss the panel
- [ ] Consider showing lint issues BEFORE triggering full validation (quick feedback)

## Backend Integration

The component expects lint issues in this format from the API:

```csharp
// Backend: LintIssue.cs
public class LintIssue
{
    public string RuleId { get; set; }
    public string Category { get; set; }
    public string Severity { get; set; }
    public string Confidence { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public string Message { get; set; }
    public string? Disclaimer { get; set; }
    public string? ResourceType { get; set; }
    public string? JsonPointer { get; set; }
    public string? FhirPath { get; set; }
    public Dictionary<string, object>? Details { get; set; }
}
```

Validation response should include:

```csharp
public class ValidationResponse
{
    public List<ValidationError> Errors { get; set; }       // Firely
    public List<LintIssue>? LintIssues { get; set; }       // Lint
    public ValidationSummary Summary { get; set; }
    public ValidationMetadata Metadata { get; set; }
}
```

## Styling

The component uses Tailwind CSS with a blue/teal theme:

- **Primary**: Blue-600
- **Backgrounds**: Blue-50, Indigo-50
- **Borders**: Blue-200, Blue-300
- **Category colors**: Purple, Blue, Indigo, Pink, Teal
- **Icons**: Lucide React icons

## Accessibility

- Semantic HTML structure
- Proper ARIA labels on interactive elements
- Keyboard navigation support via native button elements
- Clear visual hierarchy
- High contrast text
- Focus states on interactive elements

## Browser Compatibility

Tested with:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Requires:
- React 18+
- Lucide React icons
- Tailwind CSS

## Related Components

- **ErrorPanel**: Displays Firely validation errors (separate from lint)
- **JsonViewer**: For viewing source FHIR JSON
- **ValidationPipeline**: Backend service that generates lint issues

## Future Enhancements

Potential improvements:
- [ ] Export lint report to JSON/CSV
- [ ] Link to documentation for each rule
- [ ] Show historical lint issue trends
- [ ] Integration with IDE/editor navigation
- [ ] Filtering by confidence level
- [ ] Search within lint issues

## Support

For questions or issues:
1. Review backend `LintRuleCatalog.cs` for rule definitions
2. Check `LintValidationService.cs` for rule implementation
3. See `LintDemoPage.tsx` for integration examples
4. Consult FHIR Processor V2 architecture docs

---

**Remember**: Lint issues are **best-effort helpers**, not **authoritative validators**. Always defer to Firely for final FHIR validation results.
