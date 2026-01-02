# Bundle Composition Errors - Quick Reference

## For Developers 👨‍💻

### What You'll See

When your bundle doesn't match the expected structure, you'll get an error like this:

```
Bundle structure violation

This bundle does not contain the required set of FHIR resources.

What this means: Your project defines an expected bundle structure 
(resource types and counts). This validation ensures the bundle matches 
that structure. Extra resources not declared in the rule are also invalid.

Expected resources:
• Patient: at least 1
• Observation: exactly 2

Found in bundle:
• Patient: 0
• Observation: 1
• Medication: 3

What's wrong:
❌ Missing 1 Patient resource (expected 1, found 0)
❌ Missing 1 Observation resource (expected 2, found 1)
⚠️ Unexpected Medication: 3 resources not declared in rule

How to fix: Add 1 Patient resource; Add 1 Observation resource; 
Remove 3 Medication resources or update the project rule to allow them
```

---

## Understanding the Symbols

| Symbol | Meaning | Action |
|--------|---------|--------|
| ❌ | Missing required resource | Add the resource to your bundle |
| ⚠️ | Unexpected resource | Remove it OR update the project rule |

---

## Common Scenarios

### 1. Missing a Required Resource

**Error**:
```
❌ Missing 1 Patient resource (expected 1, found 0)
```

**Fix**: Add a Patient resource to your bundle.

---

### 2. Not Enough Resources

**Error**:
```
❌ Missing 1 Observation resource (expected 2, found 1)
```

**Fix**: You have 1 Observation but need 2. Add 1 more.

---

### 3. Extra Resource Not Allowed

**Error**:
```
⚠️ Unexpected Medication: 3 resources not declared in rule
```

**Fix**: Either:
- Remove all 3 Medication resources from your bundle, OR
- Ask the project admin to update the rule to allow Medication

---

### 4. Wrong Type of Resource

**Error**:
```
❌ Missing 1 Observation (code = OS) resource (expected 1, found 0)
```

**Fix**: You need a specific type of Observation (with code = OS). 
Check the "code" field in your Observation resources.

---

## Why This Matters

Your project defines a **bundle structure contract** - a specific set of 
resource types and counts that every submitted bundle must contain.

This ensures:
- ✅ All required data is present
- ✅ No unexpected data sneaks in
- ✅ Consistent structure across all submissions
- ✅ Downstream systems can rely on predictable bundle contents

---

## Technical Details

### For Backend Developers

**Details Structure**:
```json
{
  "expected": [
    {
      "id": "Patient",
      "resourceType": "Patient",
      "min": 1,
      "max": 1
    }
  ],
  "actual": [
    {
      "id": "Patient",
      "resourceType": "Patient",
      "count": 0,
      "examples": []
    }
  ],
  "diff": {
    "missing": [
      {
        "expectedId": "Patient",
        "resourceType": "Patient",
        "expectedMin": 1,
        "actualCount": 0,
        "filterLabel": "Patient"
      }
    ],
    "unexpected": []
  }
}
```

**Key Points**:
- Backend computes `diff` explicitly
- Frontend never infers missing/unexpected
- Examples include JSON pointers for navigation

---

### For Frontend Developers

**Rendering Logic**:
```typescript
// Detect bundle composition error
const isBundleComposition = 
  error.errorCode === 'RESOURCE_REQUIREMENT_VIOLATION' && 
  Array.isArray(explanation.expected);

// Render structured Expected/Found/What's Wrong sections
if (isBundleComposition) {
  // Display expected array as bullet list
  // Display actual array as bullet list
  // Display diff.missing with ❌
  // Display diff.unexpected with ⚠️
}
```

**Key Points**:
- Check `errorCode` and structured `expected` array
- Use visual symbols (❌ / ⚠️)
- Separate sections for clarity
- Plain English only

---

## FAQs

**Q: Can I have extra resources in my bundle?**  
A: No, not by default. All resources must be explicitly declared in the project rule.

**Q: What if I need a different bundle structure?**  
A: Ask your project admin to update the bundle composition rule.

**Q: Why do I see "Observation (code = OS)" instead of just "Observation"?**  
A: Some rules filter by specific criteria. You need Observations with that specific code value.

**Q: Can I have more than the minimum required?**  
A: Depends on the rule:
- "At least X" → You can have more than X
- "Exactly X" → You must have exactly X, no more, no less

**Q: What does "rejectUndeclaredResources" mean?**  
A: It means the bundle is "closed" - only resource types explicitly listed in the rule are allowed.

---

## Examples by Count Mode

### "At Least" Mode
```
Expected: Patient: at least 1
Found: Patient: 0
❌ Missing 1 Patient resource

Expected: Patient: at least 1  
Found: Patient: 3
✅ OK (3 is at least 1)
```

### "Exactly" Mode
```
Expected: Observation: exactly 2
Found: Observation: 1
❌ Missing 1 Observation resource

Expected: Observation: exactly 2
Found: Observation: 3
❌ Missing -1 Observation resource (you have too many!)

Expected: Observation: exactly 2
Found: Observation: 2
✅ OK
```

---

## Related Documentation

- Full spec: [`BUNDLE_COMPOSITION_VALIDATION_IMPROVEMENTS.md`](./BUNDLE_COMPOSITION_VALIDATION_IMPROVEMENTS.md)
- Error explanation registry: [`errorExplanationRegistry.ts`](../frontend/src/validation/errorExplanationRegistry.ts)
- Validation logic: [`FhirPathRuleEngine.cs`](../backend/src/Pss.FhirProcessor.Engine/RuleEngines/FhirPathRuleEngine.cs)

---

**Need Help?**  
Contact your project administrator or check the project-specific bundle composition rules.
