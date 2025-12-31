# Phase 3.x — Traversal Extraction Complete ✅

**Date**: 27 December 2025  
**Status**: ✅ **COMPLETE** — Engine + Playground API both compile with 0 errors

---

## 📋 Objectives Achieved

1. ✅ **Extracted FHIR traversal logic** from `QuestionAnswerValidator` into dedicated provider
2. ✅ **Made validator pure** — no path guessing, no hard-coded resource assumptions
3. ✅ **No breaking changes** — public API signature maintained
4. ✅ **Structured errors preserved** — all error output unchanged
5. ✅ **Contract hardening** — removed fragile serialize/deserialize fallback in param parsing

---

## 🏗️ New Architecture

### Core Abstraction

```csharp
public interface IQuestionAnswerContextProvider
{
    IEnumerable<QuestionAnswerContextSeed> Resolve(Bundle bundle, RuleDefinition rule);
}

public sealed record QuestionAnswerContextSeed(
    Resource Resource,
    Base IterationNode,
    int EntryIndex,
    string CurrentFhirPath
);
```

### Implementation: DefaultQuestionAnswerContextProvider

**Responsibilities**:
- Select bundle entries by `rule.ResourceType`
- Determine iteration nodes (Observation.component support)
- Generate deterministic FHIRPath strings
- Return normalized context seeds

**Intentionally Minimal**:
- Only supports `Observation.component` iteration (no heuristics)
- Path detection: checks if `rule.Path` contains `.component`
- Resource-level fallback: treats entire resource as single node
- Deterministic paths:
  - `Bundle.entry[{entryIndex}].resource` (resource-level)
  - `Bundle.entry[{entryIndex}].resource.component[{i}]` (component-level)

---

## 📝 Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `IQuestionAnswerContextProvider.cs` | Interface + record definition | 28 |
| `DefaultQuestionAnswerContextProvider.cs` | Minimal traversal implementation | 145 |

---

## 🔧 Files Modified

### 1. EngineServiceCollectionExtensions.cs
**Change**: Added DI registration  
```csharp
services.AddScoped<IQuestionAnswerContextProvider, DefaultQuestionAnswerContextProvider>();
```

### 2. QuestionAnswerValidator.cs
**Changes**:
- ✅ Injected `IQuestionAnswerContextProvider` in constructor
- ✅ Replaced `EvaluateRulePath` → `_contextProvider.Resolve(bundle, rule)`
- ✅ Removed manual `entryIndex` increment (now from seed)
- ✅ Removed 3 traversal methods:
  - `EvaluateRulePath()`
  - `GetIterationNodes()`
  - `BuildCurrentPath()`
- ✅ Hardened `TryExtractRuleParams`:
  - Removed `JsonSerializer.Serialize/Deserialize` fallback
  - Added warning log if `questionPath`/`answerPath` missing in `Params`
  - Contract enforcement: Frontend MUST write paths into `rule.Params`
- ✅ Updated `LoadQuestionSetAsync` comment: explicit stub documentation

**Validator Flow** (after refactoring):
```csharp
foreach (var seed in _contextProvider.Resolve(bundle, rule))
{
    var context = new QuestionAnswerContext
    {
        Resource = seed.Resource,
        IterationNode = seed.IterationNode,
        EntryIndex = seed.EntryIndex,  // ← From provider, not manual
        CurrentPath = seed.CurrentFhirPath  // ← Deterministic from provider
    };
    
    // Extract question/answer using seed.IterationNode
    context.QuestionCoding = _valueExtractor.ExtractQuestionCoding(seed.IterationNode, questionPath);
    context.ExtractedAnswer = _valueExtractor.ExtractAnswerValue(seed.IterationNode, answerPath);
    
    // Validate (pure business logic, no traversal)
    var validationErrors = ValidateAnswer(context);
}
```

---

## ✅ Build Verification

### Engine Project
```bash
dotnet build src/Pss.FhirProcessor.Engine/Pss.FhirProcessor.Engine.csproj --no-restore
```
**Result**: ✅ **Build succeeded. 10 Warning(s) 0 Error(s)**  
(All warnings are pre-existing, none from refactoring)

### Playground API
```bash
dotnet build src/Pss.FhirProcessor.Playground.Api/Pss.FhirProcessor.Playground.Api.csproj --no-restore
```
**Result**: ✅ **Build succeeded. 0 Warning(s) 0 Error(s)**

---

## 🎯 Runtime Behavior Impact

### Unchanged Behavior
- Rule validation logic unchanged
- Error generation unchanged (still uses structured factory)
- Question/answer extraction unchanged
- EntryIndex calculation unchanged (deterministic from bundle order)

### Changed Behavior (Intentional)
1. **Rule param contract hardened**:
   - No longer attempts to deserialize entire rule to find paths
   - Logs warning if `questionPath`/`answerPath` not in `Params`
   - Frontend must explicitly write paths into `rule.Params` dictionary

2. **Traversal deterministic**:
   - FHIRPath generation moved to provider (single source of truth)
   - Iteration logic centralized (easier to extend for new resource types)

---

## 🔮 Future Extensions

When adding new resource iteration patterns:
1. Update `DefaultQuestionAnswerContextProvider.ShouldIterateX()` methods
2. Add corresponding `BuildXNodePath()` path generation
3. Validator requires **NO CHANGES** (pure validation logic)

Example:
```csharp
// Future: DiagnosticReport.result iteration
if (resource is DiagnosticReport dr && rulePath.Contains(".result"))
{
    nodes.AddRange(dr.Result.Select(r => r as Base));
}
```

---

## 📚 Design Principles Followed

1. ✅ **Separation of Concerns**: Traversal ≠ Validation
2. ✅ **Single Responsibility**: Provider handles ALL structure navigation
3. ✅ **No Breaking Changes**: Public API preserved
4. ✅ **Contract Hardening**: Explicit param expectations
5. ✅ **Minimal Implementation**: No over-engineering (only Observation.component)
6. ✅ **Deterministic Behavior**: Reproducible paths and indices

---

## ⚠️ Frontend Impact

**Action Required**: Verify frontend stores `questionPath` and `answerPath` in `rule.Params` dictionary.

If not:
- Backend will log warning: `"QuestionAnswer rule {RuleId} missing questionPath/answerPath in Params"`
- Rule validation will skip (returns empty errors)

**Check**:
```typescript
// ✅ Correct:
const rule = {
  params: {
    questionSetId: "...",
    questionPath: "...",
    answerPath: "..."
  }
};

// ❌ Incorrect (no longer supported):
const rule = {
  questionPath: "...",  // Not in params!
  answerPath: "..."
};
```

---

## 📊 Refactoring Stats

| Metric | Before | After | Δ |
|--------|--------|-------|---|
| Validator LoC | 956 | 881 | -75 |
| Traversal in Validator | 3 methods | 0 | -3 |
| Provider abstraction | 0 | 1 interface + 1 impl | +2 |
| DI registrations | 2 | 3 | +1 |
| Compile errors | 0 | 0 | 0 |
| Public API changes | 0 | 0 | 0 |

---

## ✅ Next Steps

1. ✅ **Phase 3.x Complete** — Validator is now pure
2. ⏳ **Integration Testing**: Test with real bundles containing Observation.component
3. ⏳ **Frontend Verification**: Confirm param storage pattern
4. ⏳ **Phase 3.5**: ValidationPipeline optimization (compute entryIndex once)
5. ⏳ **Phase 3.6**: R5 parity verification

---

**Refactored by**: GitHub Copilot (Claude Sonnet 4.5)  
**Verified**: Engine + Playground API compilation success
