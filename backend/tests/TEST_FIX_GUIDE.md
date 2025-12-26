# Test Fix Guide — UnifiedErrorModelBuilder API Changes

## Overview
Multiple test files have compilation errors due to API changes made during Phase 7/8 refactorings. These are **NOT related to Phase 0** but need to be fixed for the test suite to pass.

## Root Cause
Two API changes to UnifiedErrorModelBuilder:

1. **Constructor Change** (Phase 0 preparation):
   ```csharp
   // OLD
   new UnifiedErrorModelBuilder(navigationService)
   
   // NEW  
   new UnifiedErrorModelBuilder(navigationService, logger)
   ```

2. **From*Async Method Changes** (Phase 7/8 SmartPath integration):
   ```csharp
   // OLD
   FromFirelyIssuesAsync(outcome, bundleJson, cancellationToken)
   FromRuleErrorsAsync(errors, bundleJson, cancellationToken)
   FromCodeMasterErrorsAsync(errors, bundleJson, cancellationToken)
   FromReferenceErrorsAsync(errors, bundleJson, cancellationToken)
   FromSpecHintIssuesAsync(issues, bundleJson, cancellationToken)
   
   // NEW
   FromFirelyIssuesAsync(outcome, bundleJson, bundle, cancellationToken)
   FromRuleErrorsAsync(errors, bundleJson, bundle, cancellationToken)
   FromCodeMasterErrorsAsync(errors, bundleJson, bundle, cancellationToken)
   FromReferenceErrorsAsync(errors, bundleJson, bundle, cancellationToken)
   FromSpecHintIssuesAsync(issues, bundleJson, bundle, cancellationToken)
   ```

## Affected Files

### 1. SpecHintInstanceScopedTests.cs
✅ **FIXED** — Mock logger added

```csharp
// Fixed in Phase 0
var mockLogger = new Mock<ILogger<UnifiedErrorModelBuilder>>();
_errorBuilder = new UnifiedErrorModelBuilder(_navigationService, mockLogger.Object);
```

---

### 2. SpecHintMetadataTests.cs
**3 Errors** — Needs mock logger + Bundle parameter

**Line 21** — Constructor error:
```csharp
// CURRENT (broken)
_errorBuilder = new UnifiedErrorModelBuilder(_navigationService);

// FIX
using Microsoft.Extensions.Logging;
using Moq;

var mockLogger = new Mock<ILogger<UnifiedErrorModelBuilder>>();
_errorBuilder = new UnifiedErrorModelBuilder(_navigationService, mockLogger.Object);
```

**Lines 51, 94** — FromSpecHintIssuesAsync errors:
```csharp
// CURRENT (broken)
var errors = await _errorBuilder.FromSpecHintIssuesAsync(issues, bundleJson);

// FIX (parse Bundle from JSON)
var bundle = _parser.Parse<Bundle>(bundleJson);
var errors = await _errorBuilder.FromSpecHintIssuesAsync(issues, bundleJson, bundle, CancellationToken.None);
```

---

### 3. TestHelper.cs
**1 Error** — Needs mock logger

**Line 227** — Constructor error:
```csharp
// CURRENT (broken)
var errorBuilder = new UnifiedErrorModelBuilder(navigationService);

// FIX
using Microsoft.Extensions.Logging;
using Moq;

var mockLogger = new Mock<ILogger<UnifiedErrorModelBuilder>>();
var errorBuilder = new UnifiedErrorModelBuilder(navigationService, mockLogger.Object);
```

---

### 4. UnifiedErrorModelBuilderTests.cs  
**27 Errors** — Needs mock logger + Bundle parameter on ALL From*Async calls

**Line 20** — Constructor error (same fix as above)

**Lines 97, 480, 567, 609, 683, 877, 889** — FromFirelyIssuesAsync errors:
```csharp
// CURRENT (broken)
var errors = await _errorBuilder.FromFirelyIssuesAsync(outcome, bundleJson);

// FIX
var parser = new FhirJsonParser();
var bundle = parser.Parse<Bundle>(bundleJson);
var errors = await _errorBuilder.FromFirelyIssuesAsync(outcome, bundleJson, bundle, CancellationToken.None);
```

**Lines 140, 181, 220, 261, 449, 538, 684, 710, 750, 788** — FromRuleErrorsAsync errors:
```csharp
// CURRENT (broken)
var errors = await _errorBuilder.FromRuleErrorsAsync(ruleErrors, bundleJson);

// FIX
var parser = new FhirJsonParser();
var bundle = parser.Parse<Bundle>(bundleJson);
var errors = await _errorBuilder.FromRuleErrorsAsync(ruleErrors, bundleJson, bundle, CancellationToken.None);
```

**Lines 300, 339, 685, 724** — FromCodeMasterErrorsAsync errors:
```csharp
// CURRENT (broken)
var errors = await _errorBuilder.FromCodeMasterErrorsAsync(cmErrors, bundleJson);

// FIX
var parser = new FhirJsonParser();
var bundle = parser.Parse<Bundle>(bundleJson);
var errors = await _errorBuilder.FromCodeMasterErrorsAsync(cmErrors, bundleJson, bundle, CancellationToken.None);
```

**Lines 374, 415, 686, 841** — FromReferenceErrorsAsync errors:
```csharp
// CURRENT (broken)
var errors = await _errorBuilder.FromReferenceErrorsAsync(refErrors, bundleJson);

// FIX
var parser = new FhirJsonParser();
var bundle = parser.Parse<Bundle>(bundleJson);
var errors = await _errorBuilder.FromReferenceErrorsAsync(refErrors, bundleJson, bundle, CancellationToken.None);
```

---

## Fix Strategy

### Option A: Manual Fix (Safest)
Fix each test file individually following the patterns above:
1. Add using statements for Moq and Microsoft.Extensions.Logging
2. Add mock logger to constructor
3. Parse Bundle from JSON where needed
4. Pass bundle parameter to all From*Async calls

### Option B: Automated Script
Create a script to apply these changes programmatically (higher risk of formatting issues).

### Option C: Revert API Changes
If Bundle parameter is not essential, consider making it optional:
```csharp
// Make Bundle optional with default null
public async Task<List<ValidationError>> FromFirelyIssuesAsync(
    OperationOutcome outcome, 
    string rawBundleJson, 
    Bundle? bundle = null,  // <-- Optional
    CancellationToken cancellationToken = default)
```

**Recommendation:** Option A for reliability, or Option C if Bundle is only needed in some scenarios.

---

## Testing After Fix

After applying fixes:
```bash
cd backend
dotnet build
dotnet test --no-build
```

Expected outcome:
- ✅ 0 compilation errors
- ✅ All tests pass (or only pre-existing failures remain)

---

## Additional Notes

- The Bundle parameter is required for SmartPath navigation with where() clauses
- For tests that don't exercise navigation, passing `null` may be acceptable
- Check test intent: does the test need full navigation or just error building?
- Consider adding a helper method to parse Bundle from JSON for tests:
  
  ```csharp
  private Bundle ParseBundle(string json)
  {
      return new FhirJsonParser().Parse<Bundle>(json);
  }
  ```
