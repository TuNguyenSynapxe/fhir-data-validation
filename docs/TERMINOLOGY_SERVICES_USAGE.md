# Terminology Services Usage Examples

## Overview
This document demonstrates how to use the Phase 2 terminology authoring services.

## Service Interfaces

### ITerminologyService
Manages CodeSystems with CRUD operations and concept lookup.

### IConstraintService
Manages TerminologyConstraints with filtering capabilities.

### IRuleAdvisoryService
Detects and reports issues in terminology authoring.

---

## Example 1: Creating and Saving a CodeSystem

```csharp
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models.Terminology;

public class TerminologyAuthoringExample
{
    private readonly ITerminologyService _terminologyService;
    
    public TerminologyAuthoringExample(ITerminologyService terminologyService)
    {
        _terminologyService = terminologyService;
    }
    
    public async Task CreateScreeningCodeSystemAsync(string projectId)
    {
        // Create a new CodeSystem
        var codeSystem = new CodeSystem
        {
            Url = "http://example.org/fhir/CodeSystem/screening-types",
            Name = "ScreeningTypes",
            Title = "Screening Types",
            Status = "draft",
            Description = "Types of screening assessments",
            Publisher = "PSS Team",
            Content = "complete",
            Concept = new List<CodeSystemConcept>
            {
                new CodeSystemConcept
                {
                    Code = "mental-health",
                    Display = "Mental Health Screening",
                    Definition = "Screening for mental health conditions"
                },
                new CodeSystemConcept
                {
                    Code = "substance-use",
                    Display = "Substance Use Screening",
                    Definition = "Screening for substance use disorders"
                },
                new CodeSystemConcept
                {
                    Code = "social-determinants",
                    Display = "Social Determinants Screening",
                    Definition = "Screening for social determinants of health"
                }
            }
        };
        
        // Save the CodeSystem (creates new file or overwrites existing)
        await _terminologyService.SaveCodeSystemAsync(projectId, codeSystem);
        
        Console.WriteLine($"CodeSystem saved: {codeSystem.Url}");
    }
}
```

---

## Example 2: Loading and Modifying a CodeSystem

```csharp
public async Task ModifyCodeSystemAsync(string projectId)
{
    // Load existing CodeSystem
    var url = "http://example.org/fhir/CodeSystem/screening-types";
    var codeSystem = await _terminologyService.GetCodeSystemByUrlAsync(url);
    
    if (codeSystem == null)
    {
        Console.WriteLine("CodeSystem not found");
        return;
    }
    
    // Add a new concept
    codeSystem.Concept.Add(new CodeSystemConcept
    {
        Code = "developmental",
        Display = "Developmental Screening",
        Definition = "Screening for developmental milestones"
    });
    
    // Change a concept's code (will trigger Rule Advisory for broken references)
    var mentalHealthConcept = codeSystem.Concept.FirstOrDefault(c => c.Code == "mental-health");
    if (mentalHealthConcept != null)
    {
        mentalHealthConcept.Code = "screening-mental-health"; // Code changed!
        mentalHealthConcept.Display = "Mental Health Screening (Updated)";
    }
    
    // Save changes (last-write-wins, no locking)
    await _terminologyService.SaveCodeSystemAsync(projectId, codeSystem);
    
    Console.WriteLine("CodeSystem updated successfully");
    Console.WriteLine("NOTE: Run advisory detection to check for broken references");
}
```

---

## Example 3: Creating a Terminology Constraint

```csharp
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models.Terminology;

public class ConstraintAuthoringExample
{
    private readonly IConstraintService _constraintService;
    
    public ConstraintAuthoringExample(IConstraintService constraintService)
    {
        _constraintService = constraintService;
    }
    
    public async Task CreateObservationConstraintAsync(string projectId)
    {
        // Create a terminology constraint for Observation.category
        var constraint = new TerminologyConstraint
        {
            Id = "TERM-OBS-001",
            Name = "Observation Category Screening Types",
            Description = "Constrains Observation.category to screening types",
            ResourceType = "Observation",
            Path = "Observation.category.coding",
            ConstraintType = "binding",
            BindingStrength = "required",
            ValueSetUrl = "http://example.org/fhir/CodeSystem/screening-types",
            AllowedAnswers = new List<AllowedAnswer>
            {
                new AllowedAnswer
                {
                    System = "http://example.org/fhir/CodeSystem/screening-types",
                    Code = "mental-health",
                    Display = "Mental Health Screening"
                },
                new AllowedAnswer
                {
                    System = "http://example.org/fhir/CodeSystem/screening-types",
                    Code = "substance-use",
                    Display = "Substance Use Screening"
                },
                new AllowedAnswer
                {
                    System = "http://example.org/fhir/CodeSystem/screening-types",
                    Code = "social-determinants",
                    Display = "Social Determinants Screening"
                }
            },
            Severity = "error",
            Message = "Observation category must be one of the allowed screening types",
            Active = true
        };
        
        // Save the constraint
        await _constraintService.SaveConstraintAsync(projectId, constraint);
        
        Console.WriteLine($"Constraint saved: {constraint.Id}");
    }
}
```

---

## Example 4: Detecting Rule Advisories

```csharp
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models.Terminology;

public class RuleAdvisoryExample
{
    private readonly IRuleAdvisoryService _advisoryService;
    
    public RuleAdvisoryExample(IRuleAdvisoryService advisoryService)
    {
        _advisoryService = advisoryService;
    }
    
    public async Task DetectBrokenReferencesAsync(string projectId)
    {
        // Generate advisories for all constraints and CodeSystems
        var advisories = await _advisoryService.GenerateAdvisoriesAsync(projectId);
        
        Console.WriteLine($"\n=== Rule Advisory Report ===");
        Console.WriteLine($"Found {advisories.Count} advisories\n");
        
        // Group by severity
        var errors = advisories.Where(a => a.Severity == AdvisorySeverity.Error).ToList();
        var warnings = advisories.Where(a => a.Severity == AdvisorySeverity.Warning).ToList();
        var info = advisories.Where(a => a.Severity == AdvisorySeverity.Info).ToList();
        
        // Display errors
        if (errors.Any())
        {
            Console.WriteLine($"ERRORS ({errors.Count}):");
            foreach (var advisory in errors)
            {
                Console.WriteLine($"  [{advisory.AdvisoryCode}] {advisory.Message}");
                if (advisory.Context.ConstraintId != null)
                {
                    Console.WriteLine($"    Constraint: {advisory.Context.ConstraintId}");
                }
                if (advisory.Context.System != null && advisory.Context.Code != null)
                {
                    Console.WriteLine($"    Reference: {advisory.Context.System}#{advisory.Context.Code}");
                }
                if (advisory.SuggestedActions != null && advisory.SuggestedActions.Any())
                {
                    Console.WriteLine($"    Suggested Actions:");
                    foreach (var action in advisory.SuggestedActions)
                    {
                        Console.WriteLine($"      - {action}");
                    }
                }
                Console.WriteLine();
            }
        }
        
        // Display warnings
        if (warnings.Any())
        {
            Console.WriteLine($"\nWARNINGS ({warnings.Count}):");
            foreach (var advisory in warnings)
            {
                Console.WriteLine($"  [{advisory.AdvisoryCode}] {advisory.Message}");
            }
        }
        
        // Display info
        if (info.Any())
        {
            Console.WriteLine($"\nINFORMATION ({info.Count}):");
            foreach (var advisory in info)
            {
                Console.WriteLine($"  [{advisory.AdvisoryCode}] {advisory.Message}");
            }
        }
    }
}
```

---

## Example 5: Scenario - Code Change Breaks Constraint

### Step 1: Initial State
```csharp
// CodeSystem has concept with code "mental-health"
var codeSystem = new CodeSystem
{
    Url = "http://example.org/fhir/CodeSystem/screening-types",
    Concept = new List<CodeSystemConcept>
    {
        new CodeSystemConcept { Code = "mental-health", Display = "Mental Health" }
    }
};

// Constraint references "mental-health"
var constraint = new TerminologyConstraint
{
    Id = "TERM-001",
    AllowedAnswers = new List<AllowedAnswer>
    {
        new AllowedAnswer
        {
            System = "http://example.org/fhir/CodeSystem/screening-types",
            Code = "mental-health"
        }
    }
};
```

### Step 2: User Changes Code
```csharp
// User renames the code
var concept = codeSystem.Concept.First();
concept.Code = "screening-mental-health"; // Changed!

// Save CodeSystem (no blocking)
await _terminologyService.SaveCodeSystemAsync("project-123", codeSystem);
```

### Step 3: Run Advisory Detection
```csharp
var advisories = await _advisoryService.GenerateAdvisoriesAsync("project-123");

// Advisory generated:
// {
//   "advisoryCode": "CODE_NOT_FOUND",
//   "severity": "Error",
//   "message": "Code 'mental-health' not found in CodeSystem 'http://example.org/fhir/CodeSystem/screening-types'",
//   "context": {
//     "system": "http://example.org/fhir/CodeSystem/screening-types",
//     "code": "mental-health",
//     "constraintId": "TERM-001"
//   },
//   "suggestedActions": [
//     "Add code 'mental-health' to CodeSystem",
//     "Remove this allowed answer from constraint 'TERM-001'",
//     "Update the allowed answer to reference an existing code"
//   ]
// }
```

### Step 4: User Fixes the Issue
```csharp
// Option 1: Update constraint to use new code
var constraint = await _constraintService.GetConstraintByIdAsync("TERM-001");
var allowedAnswer = constraint.AllowedAnswers.First();
allowedAnswer.Code = "screening-mental-health"; // Updated!
await _constraintService.SaveConstraintAsync("project-123", constraint);

// Option 2: Revert code change in CodeSystem
concept.Code = "mental-health"; // Reverted
await _terminologyService.SaveCodeSystemAsync("project-123", codeSystem);
```

---

## Example 6: API Endpoint Usage

### GET /api/projects/{id}/terminology/advisories

```bash
# Request
curl -X GET http://localhost:5000/api/projects/123e4567-e89b-12d3-a456-426614174000/terminology/advisories

# Response
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "advisoryCount": 2,
  "advisories": [
    {
      "advisoryCode": "CODE_NOT_FOUND",
      "severity": "Error",
      "message": "Code 'mental-health' not found in CodeSystem 'http://example.org/fhir/CodeSystem/screening-types'",
      "context": {
        "system": "http://example.org/fhir/CodeSystem/screening-types",
        "code": "mental-health",
        "constraintId": "TERM-OBS-001",
        "resourceType": "Observation",
        "path": "Observation.category.coding"
      },
      "suggestedActions": [
        "Add code 'mental-health' to CodeSystem 'http://example.org/fhir/CodeSystem/screening-types'",
        "Remove this allowed answer from constraint 'TERM-OBS-001'",
        "Update the allowed answer to reference an existing code"
      ],
      "timestamp": "2025-12-21T15:30:00Z"
    },
    {
      "advisoryCode": "MISSING_DISPLAY",
      "severity": "Warning",
      "message": "Concept 'developmental' in CodeSystem 'http://example.org/fhir/CodeSystem/screening-types' is missing display text",
      "context": {
        "system": "http://example.org/fhir/CodeSystem/screening-types",
        "code": "developmental"
      },
      "suggestedActions": [
        "Add display text to improve readability",
        "Ignore if display text is not required for this use case"
      ],
      "timestamp": "2025-12-21T15:30:00Z"
    }
  ],
  "generatedAt": "2025-12-21T15:30:00Z"
}
```

---

## Example 7: Filtering Constraints

```csharp
public class ConstraintFilteringExample
{
    private readonly IConstraintService _constraintService;
    
    public ConstraintFilteringExample(IConstraintService constraintService)
    {
        _constraintService = constraintService;
    }
    
    public async Task FindConstraintsByResourceTypeAsync(string projectId)
    {
        // Get all constraints for Observation resources
        var observationConstraints = await _constraintService
            .ListConstraintsByResourceTypeAsync(projectId, "Observation");
        
        Console.WriteLine($"Found {observationConstraints.Count} Observation constraints:");
        foreach (var constraint in observationConstraints)
        {
            Console.WriteLine($"  - {constraint.Id}: {constraint.Name}");
        }
    }
    
    public async Task FindConstraintsReferencingCodeSystemAsync(string projectId)
    {
        // Find which constraints reference a specific CodeSystem
        var codeSystemUrl = "http://example.org/fhir/CodeSystem/screening-types";
        var constraints = await _constraintService
            .ListConstraintsByCodeSystemAsync(projectId, codeSystemUrl);
        
        Console.WriteLine($"Found {constraints.Count} constraints referencing CodeSystem:");
        foreach (var constraint in constraints)
        {
            Console.WriteLine($"  - {constraint.Id}: {constraint.ResourceType}.{constraint.Path}");
        }
    }
}
```

---

## Best Practices

### 1. Save Early, Save Often
- No locking means last-write-wins
- Save changes immediately to avoid conflicts
- No auto-save: user must explicitly save

### 2. Run Advisory Detection After Changes
```csharp
// After modifying CodeSystem or constraints
await _terminologyService.SaveCodeSystemAsync(projectId, codeSystem);
var advisories = await _advisoryService.GenerateAdvisoriesAsync(projectId);

if (advisories.Any(a => a.Severity == AdvisorySeverity.Error))
{
    Console.WriteLine("⚠️ Errors detected! Review advisories before continuing.");
}
```

### 3. Use Descriptive Constraint IDs
```csharp
// Good: Descriptive ID
var constraint = new TerminologyConstraint
{
    Id = "TERM-OBS-CATEGORY-SCREENING",  // Clear purpose
    Name = "Observation Category Screening Types Binding"
};

// Bad: Opaque ID
var constraint = new TerminologyConstraint
{
    Id = "TC001",  // What does this constrain?
};
```

### 4. Always Set Display Text
```csharp
// Good: Includes display
new CodeSystemConcept
{
    Code = "mental-health",
    Display = "Mental Health Screening",
    Definition = "Screening for mental health conditions"
};

// Warning: Missing display (will trigger advisory)
new CodeSystemConcept
{
    Code = "mental-health"
};
```

### 5. Check Advisories Before Release
```csharp
public async Task<bool> IsProjectReadyForReleaseAsync(string projectId)
{
    var advisories = await _advisoryService.GenerateAdvisoriesAsync(projectId);
    
    var errors = advisories.Where(a => a.Severity == AdvisorySeverity.Error).ToList();
    
    if (errors.Any())
    {
        Console.WriteLine($"❌ Cannot release: {errors.Count} errors found");
        return false;
    }
    
    Console.WriteLine("✅ No errors found, project ready for release");
    return true;
}
```

---

## Unit Test Examples

```csharp
using Xunit;
using Moq;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models.Terminology;

public class RuleAdvisoryServiceTests
{
    [Fact]
    public async Task GenerateAdvisories_CodeNotFound_ReturnsError()
    {
        // Arrange
        var mockTerminologyService = new Mock<ITerminologyService>();
        var mockConstraintService = new Mock<IConstraintService>();
        
        mockTerminologyService
            .Setup(s => s.FindConceptAsync("http://example.org/CodeSystem/test", "nonexistent", default))
            .ReturnsAsync((CodeSystemConcept?)null);
        
        var constraint = new TerminologyConstraint
        {
            Id = "TEST-001",
            ResourceType = "Observation",
            Path = "Observation.code",
            AllowedAnswers = new List<AllowedAnswer>
            {
                new AllowedAnswer
                {
                    System = "http://example.org/CodeSystem/test",
                    Code = "nonexistent"
                }
            }
        };
        
        mockConstraintService
            .Setup(s => s.ListConstraintsAsync("project-1", default))
            .ReturnsAsync(new List<TerminologyConstraint> { constraint });
        
        mockTerminologyService
            .Setup(s => s.ListCodeSystemsAsync("project-1", default))
            .ReturnsAsync(new List<CodeSystem>());
        
        var service = new RuleAdvisoryService(
            Mock.Of<ILogger<RuleAdvisoryService>>(),
            mockTerminologyService.Object,
            mockConstraintService.Object
        );
        
        // Act
        var advisories = await service.GenerateAdvisoriesAsync("project-1");
        
        // Assert
        Assert.Single(advisories);
        Assert.Equal("CODE_NOT_FOUND", advisories[0].AdvisoryCode);
        Assert.Equal(AdvisorySeverity.Error, advisories[0].Severity);
        Assert.Equal("TEST-001", advisories[0].Context.ConstraintId);
    }
}
```

---

## Summary

Phase 2 provides:
- **CRUD operations** for CodeSystems and Constraints
- **Rule Advisory detection** for broken references
- **Non-blocking workflow** (advisories are informational)
- **File-based storage** (simple, version-control friendly)
- **API endpoint** for on-demand advisory generation

**Key Principle:** Everything is editable; advisories help maintain quality without enforcing it.
