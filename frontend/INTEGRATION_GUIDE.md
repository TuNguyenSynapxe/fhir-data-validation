# Integration Example: Adding Lint Panel to PlaygroundPage

## Step-by-Step Integration

### 1. Update PlaygroundPage State

```tsx
// PlaygroundPage.tsx
import { useState } from 'react';
import LintExplainabilityPanel from '../components/LintExplainabilityPanel';
import type { LintIssue } from '../components/LintExplainabilityPanel';
import ErrorPanel from '../components/ErrorPanel';

export default function PlaygroundPage() {
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [showLintPanel, setShowLintPanel] = useState(false);

  // ... existing code
}
```

### 2. Handle Validation Response

```tsx
const handleValidate = async () => {
  try {
    const result = await projectsApi.validate(projectId, {
      bundleJson: bundle,
      rulesJson: rules,
      codeMasterJson: codeMaster
    });

    setValidationResult(result);

    // Show lint issues if present
    if (result.lintIssues && result.lintIssues.length > 0) {
      setShowLintPanel(true);
    }

    // Show Firely errors separately
    if (result.errors && result.errors.length > 0) {
      setShowErrorPanel(true);
    }
  } catch (error) {
    console.error('Validation failed:', error);
  }
};
```

### 3. Add Panel Toggle Buttons

```tsx
{/* Validation Results Section */}
{validationResult && (
  <div className="flex gap-3 p-4 bg-gray-50 border-t">
    {/* Lint Issues Button */}
    {validationResult.lintIssues && validationResult.lintIssues.length > 0 && (
      <button
        onClick={() => setShowLintPanel(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <FileSearch size={20} />
        <span>
          Lint Pre-Check ({validationResult.lintIssues.length})
        </span>
        <span className="px-2 py-0.5 bg-blue-500 rounded text-xs">
          Best-effort
        </span>
      </button>
    )}

    {/* Firely Errors Button */}
    {validationResult.errors && validationResult.errors.length > 0 && (
      <button
        onClick={() => setShowErrorPanel(true)}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        <AlertCircle size={20} />
        <span>
          Validation Errors ({validationResult.errors.length})
        </span>
        <span className="px-2 py-0.5 bg-red-500 rounded text-xs">
          Authoritative
        </span>
      </button>
    )}

    {/* Success State */}
    {(!validationResult.errors || validationResult.errors.length === 0) &&
     (!validationResult.lintIssues || validationResult.lintIssues.length === 0) && (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle size={20} />
        <span className="font-medium">All validations passed!</span>
      </div>
    )}
  </div>
)}
```

### 4. Render Both Panels

```tsx
return (
  <div className="playground-container">
    {/* ... existing playground UI ... */}

    {/* Lint Panel (Blue theme, best-effort) */}
    {showLintPanel && validationResult?.lintIssues && (
      <LintExplainabilityPanel
        lintIssues={validationResult.lintIssues}
        fhirVersion={validationResult.metadata?.fhirVersion}
        onClose={() => setShowLintPanel(false)}
      />
    )}

    {/* Error Panel (Red theme, authoritative) */}
    {showErrorPanel && validationResult && (
      <ErrorPanel
        validationResult={validationResult}
        onClose={() => setShowErrorPanel(false)}
      />
    )}
  </div>
);
```

## User Flow Example

### Scenario 1: Lint Issues Only (Quick Feedback)

```
User clicks "Validate"
  ↓
Lint validation runs (fast, synchronous)
  ↓
Lint panel appears with 5 pre-validation issues
  ↓
User reviews structural problems
  ↓
User fixes JSON/structure issues
  ↓
User clicks "Validate" again
  ↓
No lint issues → Firely validation runs
  ↓
Firely results shown in separate panel
```

### Scenario 2: Both Lint and Firely Issues

```
User clicks "Validate"
  ↓
Both validations run
  ↓
Two buttons appear:
  - "Lint Pre-Check (3)" [Blue]
  - "Validation Errors (7)" [Red]
  ↓
User clicks Lint button → Reviews best-effort checks
User clicks Error button → Reviews authoritative Firely errors
  ↓
User understands distinction between helpers and final validation
```

### Scenario 3: Progressive Disclosure

```tsx
// Option: Auto-show lint panel, require manual trigger for Firely
const handleQuickCheck = async () => {
  // Run only lint validation (backend endpoint)
  const lintResult = await projectsApi.lintCheck(projectId);
  
  if (lintResult.lintIssues.length > 0) {
    setShowLintPanel(true);
    // Don't run Firely yet - let user fix lint issues first
  } else {
    // No lint issues, proceed to full validation
    handleFullValidation();
  }
};

// Add two buttons:
<button onClick={handleQuickCheck}>Quick Pre-Check</button>
<button onClick={handleFullValidation}>Full FHIR Validation</button>
```

## Best Practices

### ✅ DO

1. **Keep panels separate**: Don't mix lint and Firely errors in same UI
2. **Use color coding**: Blue for lint, Red for Firely
3. **Label clearly**: "Best-effort" vs "Authoritative"
4. **Allow toggling**: Users should be able to view either panel
5. **Show context**: Pass FHIR version to lint panel
6. **Quick feedback**: Show lint issues immediately for fast iteration

### ❌ DON'T

1. **Don't merge panels**: Lint and Firely should remain distinct
2. **Don't override Firely**: Lint never replaces authoritative validation
3. **Don't edit rules from panel**: Keep it read-only
4. **Don't skip Firely**: Even if lint passes, run Firely validation
5. **Don't confuse users**: Make it clear lint ≠ final validation

## Summary Stats Integration

```tsx
// Show summary with breakdown
<div className="validation-summary">
  <div className="stat-card">
    <h3>Pre-Validation (Lint)</h3>
    <div className="count">{validationResult.summary.lintErrorCount || 0}</div>
    <span className="badge-blue">Best-effort</span>
  </div>
  
  <div className="stat-card">
    <h3>FHIR Validation (Firely)</h3>
    <div className="count">{validationResult.summary.fhirErrorCount}</div>
    <span className="badge-red">Authoritative</span>
  </div>
  
  <div className="stat-card">
    <h3>Business Rules</h3>
    <div className="count">{validationResult.summary.businessErrorCount}</div>
  </div>
  
  <div className="stat-card">
    <h3>Code Master</h3>
    <div className="count">{validationResult.summary.codeMasterErrorCount}</div>
  </div>
</div>
```

## Backend API Update

Ensure your validation endpoint returns lint issues:

```csharp
// ProjectsController.cs
[HttpPost("{id}/validate")]
public async Task<ActionResult<ValidationResponse>> ValidateProject(string id)
{
    var project = await _projectService.GetByIdAsync(id);
    if (project == null) return NotFound();

    // Run lint validation first (fast)
    var lintIssues = await _lintService.ValidateAsync(project.BundleJson);

    // Run full validation pipeline
    var validationResult = await _validationPipeline.ValidateAsync(new ValidationRequest
    {
        BundleJson = project.BundleJson,
        RulesJson = project.RulesJson,
        CodeMasterJson = project.CodeMasterJson,
        FhirVersion = project.FhirVersion
    });

    return Ok(new ValidationResponse
    {
        Errors = validationResult.Errors,           // Firely + Business + CodeMaster
        LintIssues = lintIssues,                    // Lint pre-validation
        Summary = new ValidationSummary
        {
            TotalErrors = validationResult.Errors.Count,
            FhirErrorCount = validationResult.Errors.Count(e => e.Source == "FHIR"),
            BusinessErrorCount = validationResult.Errors.Count(e => e.Source == "BUSINESS"),
            LintErrorCount = lintIssues.Count,       // Add this
            // ... other counts
        },
        Metadata = validationResult.Metadata
    });
}
```

## Mobile Responsiveness

The LintExplainabilityPanel is responsive:

```css
/* Already included in component via Tailwind */
.max-w-6xl    /* Large screens: 6xl max width */
.w-full       /* Full width on small screens */
.max-h-[90vh] /* Never exceed 90% viewport height */
.overflow-y-auto /* Scrollable content */
.p-4          /* Consistent padding */
```

## Testing Checklist

- [ ] Lint panel opens when lint issues present
- [ ] Panel closes with X button or Close button
- [ ] Categories expand/collapse correctly
- [ ] Individual issues expand to show details
- [ ] Confidence badges display correctly
- [ ] FHIR version shown in summary
- [ ] Paths (JSON Pointer, FHIR Path) displayed
- [ ] Details section shows custom fields
- [ ] Disclaimers visible and readable
- [ ] Blue theme distinct from error panel
- [ ] "Best-effort" messaging clear
- [ ] Panel scrollable when content overflows
- [ ] No rule editing possible (read-only)
- [ ] Works on mobile/tablet/desktop

---

**Ready to integrate!** The LintExplainabilityPanel is production-ready and follows all architectural requirements.
