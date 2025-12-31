# Phase 3 Test Migration Summary

**Date**: 2025-12-30

## Overview
Completing Phase 3: Test Migration after Path → FieldPath + InstanceScope refactor.

**Build Status**: ✅ SUCCESS
**Test Status**: ❌ 81 failures (9 in Tests, 2 in Api.Tests, 70 in Engine.Tests)

## Critical Issues Identified

### Issue 1: Hard-coded Error Code (FIXED)
**File**: `FhirPathRuleEngine.cs:336`
**Problem**: JSON fallback path used `ErrorCode = "MANDATORY_MISSING"` instead of `rule.ErrorCode`
**Fix**: Changed to `ErrorCode = rule.ErrorCode ?? ValidationErrorCodes.FIELD_REQUIRED`
**Status**: ✅ FIXED

### Issue 2: RuleValidationError.Path Format Mismatch (Category B)
**Files**: RequiredRuleExecutionTests.cs, FhirPathRuleEngineTests.cs, and many others
**Problem**: Tests expect `error.Path = "Patient.birthDate"` but RuleValidationError.Path now contains just FieldPath ("birthDate")
**Root Cause**: After migration, RuleDefinition uses FieldPath (without resource prefix), and errors inherit this format
**Category**: B – Assertion update needed
**Fix Required**: Update all `error.Path.Should().Be("Patient.X")` to `error.Path.Should().Be("X")`

### Issue 3: Configuration Error Tests (Category B/C)
**Files**: FhirPathRuleEngineTests.cs (multiple *_MissingParam_ReturnsConfigurationError tests)
**Problem**: Tests expect RULE_CONFIGURATION_ERROR but get empty results
**Status**: Needs investigation - may be execution bug or test infrastructure issue

### Issue 4: Governance Tests (Category A/B)
**Files**: RuleReviewEngineTests.cs
**Problems**:
- BroadPath_IsWarning: May expect legacy Path-based warnings
- EmptyPath_IsBlocked, RootLevelPath_IsBlocked: Need to verify FieldPath validation
- QuestionAnswerWithQuestionSetId_IsOK: May have path-related expectations

##Test Failure Categories

### Category A - Obsolete Expectations (0 identified)
*Tests asserting removed behavior (legacy heuristics, Path semantics, etc.)*

### Category B - Assertion Updates Needed (~60 tests)
*Tests checking correct behavior but with wrong assertions*

**Pattern 1**: error.Path format mismatch
- File: RequiredRuleExecutionTests.cs
- Lines: 78, 103, 133, 160, 190, 216, 245, 276, etc.
- Fix: Change `error.Path.Should().Be("Patient.X")` → `error.Path.Should().Be("X")`

**Pattern 2**: Governance path validation expectations
- File: RuleReviewEngineTests.cs  
- Tests: BroadPath_IsWarning, EmptyPath_IsBlocked, RootLevelPath_IsBlocked, etc.
- Fix: Update to FieldPath expectations

### Category C - Real Bug Candidates (~20 tests)
*Tests failing due to possible execution bugs*

**Pattern 1**: Configuration error tests failing
- Files: FhirPathRuleEngineTests.cs (Pss.FhirProcessor.Tests + Engine.Tests)
- Tests: All *_MissingParam_ReturnsConfigurationError tests
- Issue: Assert.Single() fails - collection is empty
- Status: NEEDS INVESTIGATION - parameter validation may not be running

**Pattern 2**: SmartPath navigation tests
- File: SmartPathNavigationServiceTests.cs
- Multiple path resolution tests failing
- Status: NEEDS INVESTIGATION

### Category D - Infrastructure Drift (~1 test)
*Ordering, formatting, non-semantic differences*

- ValidationExplanationServiceNormalizationTests.Required_Variants_Return_High_Confidence
  - REQUIRED_FIELD returns "medium" instead of "high" confidence
  - Likely normalization logic issue

## Action Plan

### Phase 1: Fix Category B Assertions (PRIORITY)
1. Update RequiredRuleExecutionTests.cs error.Path assertions
2. Update FhirPathRuleEngineTests.cs error.Path assertions
3. Update governance test expectations

### Phase 2: Investigate Category C Bugs
1. Debug configuration error validation
2. Check SmartPath navigation changes
3. Verify QuestionAnswer iteration logic

### Phase 3: Handle Category D
1. Update confidence normalization for REQUIRED_FIELD

## Next Steps
1. Start with RequiredRuleExecutionTests.cs - update all error.Path assertions
2. Move to FhirPathRuleEngineTests.cs
3. Address governance tests
4. Investigate configuration validation bugs
