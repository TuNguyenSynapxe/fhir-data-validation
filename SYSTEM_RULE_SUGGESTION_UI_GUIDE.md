# How to See System Rule Suggestions in the UI

## 📍 Location: Playground Validation Panel

The System Rule Suggestions feature is integrated into the **Playground Validation Panel**.

## 🎯 How to Access

### Step 1: Navigate to Playground
1. Start the backend server: 
   ```bash
   cd backend/src/Pss.FhirProcessor.Playground.Api
   dotnet run
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open browser: `http://localhost:5173`

4. Go to **Playground** page

### Step 2: Enable Debug Mode
1. In the **Validation Panel** (right sidebar), look for the mode toggle
2. Click the **"Debug"** button to enable debug mode
   - **Fast mode** (default): Skips lint and suggestions for performance
   - **Debug mode**: Includes lint validation, SPEC_HINT, and **System Rule Suggestions**

### Step 3: Run Validation
1. Load or paste a FHIR bundle in the bundle editor
2. Optionally load rules and CodeMaster definitions
3. Click **"Run Validation"** button

### Step 4: View Suggestions
After validation completes, you'll see:

1. **Validation errors** (if any) at the top
2. **System Rule Suggestions panel** below errors (if suggestions were generated)

The suggestions panel will show:
- 💡 Header: "System Rule Suggestions (X)" with count
- Blue background to distinguish from errors
- Each suggestion shows:
  - Icon based on rule type (🔒 FixedValue, 📋 AllowedValues, etc.)
  - Rule type and confidence level badge
  - FHIRPath expression (e.g., `Patient.gender`)
  - Reasoning explanation
  - Rule parameters
  - Sample evidence (resource count, example values)
  - **Accept** (green) and **Reject** (gray) buttons

## 🎨 Visual Structure

```
┌─────────────────────────────────────────┐
│ Validation Panel                        │
├─────────────────────────────────────────┤
│ ⚙️ Mode: [Fast] [Debug] ✓              │
│ 🔄 Run Validation  🔃 Reset             │
├─────────────────────────────────────────┤
│                                         │
│ ❌ Validation Errors (if any)           │
│ ├─ Error 1                             │
│ ├─ Error 2                             │
│ └─ Error 3                             │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│ 💡 System Rule Suggestions (3)          │
│ ┌───────────────────────────────────┐  │
│ │ 🔒 FixedValue • HIGH CONFIDENCE   │  │
│ │ Patient.gender                     │  │
│ │ Reasoning: Field has same value... │  │
│ │ Evidence: 12 resources analyzed    │  │
│ │ [✓ Accept] [✗ Reject]             │  │
│ └───────────────────────────────────┘  │
│ ┌───────────────────────────────────┐  │
│ │ 📋 AllowedValues • MEDIUM          │  │
│ │ Observation.status                 │  │
│ │ ...                                │  │
│ └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

## ✨ Features

### Confidence Badges
- **HIGH** (green): ≥5 samples with consistent pattern
- **MEDIUM** (yellow): 2-4 samples with reasonable pattern
- **LOW** (gray): Reserved for future use

### Rule Type Icons
- 🔒 **FixedValue**: All values are identical
- 📋 **AllowedValues**: Small finite set (2-5 values)
- 🏥 **CodeSystem**: Consistent Coding.system usage
- ⚠️ **Required**: Field present in 100% of samples
- 📊 **ArrayLength**: Stable array size patterns

### Action Buttons
- **✓ Accept** (green): Creates a new rule from the suggestion
  - Currently shows placeholder alert
  - TODO: Integrate with rule editor
- **✗ Reject** (gray): Dismisses the suggestion
  - Currently logs to console
  - TODO: Persist dismissal

## 🔍 When Suggestions Appear

Suggestions are generated when:
1. ✅ **Debug mode** is enabled
2. ✅ **Firely validation** succeeds (no structural FHIR errors)
3. ✅ **Patterns are detected** in sample data
4. ✅ **No overlap** with SPEC_HINT or existing rules

Suggestions will **NOT** appear when:
- ❌ Fast mode is enabled (performance optimization)
- ❌ Firely validation fails with structural errors
- ❌ No clear patterns are detected
- ❌ All patterns are already covered by rules or SPEC_HINT

## 📊 Example Scenarios

### Scenario 1: Fixed Value Detected
**Input**: Bundle with 5 Observations, all have `status: "final"`

**Suggestion**:
```
🔒 FixedValue • HIGH CONFIDENCE
Observation.status

Reasoning: Field 'status' has the same value across all 5 
observed instances. This suggests it may be a constant in 
your implementation.

Rule Parameters: value: final
Evidence: 5 resources analyzed | Examples: final

[✓ Accept] [✗ Reject]
```

### Scenario 2: Allowed Values Detected
**Input**: Bundle with 20 Patients, gender is one of ["male", "female", "unknown"]

**Suggestion**:
```
📋 AllowedValues • MEDIUM CONFIDENCE
Patient.gender

Reasoning: Field 'gender' uses a small set of 3 distinct 
values. Consider restricting to these allowed values.

Rule Parameters: values: [male, female, unknown]
Evidence: 20 resources analyzed | Examples: male, female, unknown

[✓ Accept] [✗ Reject]
```

### Scenario 3: CodeSystem Detected
**Input**: Bundle with 15 Observations, all use `http://loinc.org` system

**Suggestion**:
```
🏥 CodeSystem • HIGH CONFIDENCE
Observation.code

Reasoning: All observed codings use the same system: 
'http://loinc.org'. Consider enforcing this code system.

Rule Parameters: system: http://loinc.org
Evidence: 15 resources analyzed | Examples: http://loinc.org

[✓ Accept] [✗ Reject]
```

## 🚀 Next Steps

### For Users
1. **Test the feature** with your own FHIR bundles
2. **Review suggestions** and assess quality
3. **Accept useful suggestions** to create rules quickly
4. **Provide feedback** on suggestion quality

### For Developers
1. **Implement rule creation** from accepted suggestions
   - Pre-fill rule editor with suggestion data
   - Auto-generate rule ID
   - Validate before saving

2. **Implement suggestion dismissal**
   - Persist dismissed suggestions
   - Don't show again for same bundle

3. **Add suggestion history**
   - Track accepted vs rejected
   - Show statistics
   - Learn from user preferences

4. **Enhance pattern detection**
   - Add Array Length detector
   - Add Regex pattern detector
   - Improve confidence scoring

## 📝 Code Reference

### Files Modified
- `frontend/src/api/projects.ts` - Added `SystemRuleSuggestion` type and `suggestions` field
- `frontend/src/components/playground/Validation/ValidationPanel.tsx` - Integrated `SuggestionsPanel`

### Files Created
- `frontend/src/components/SuggestionsPanel.tsx` - New component for displaying suggestions

### Backend Files (Already Complete)
- `backend/src/Pss.FhirProcessor.Engine/Models/SystemRuleSuggestion.cs`
- `backend/src/Pss.FhirProcessor.Engine/Services/SystemRuleSuggestionService.cs`
- `backend/src/Pss.FhirProcessor.Engine/Interfaces/ISystemRuleSuggestionService.cs`

---

**Status**: ✅ UI Integration Complete  
**Testing**: Ready for user testing  
**Production**: Not recommended until rule creation is implemented
