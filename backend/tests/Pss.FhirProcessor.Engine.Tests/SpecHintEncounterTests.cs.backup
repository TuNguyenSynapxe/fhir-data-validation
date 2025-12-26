using Xunit;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Services;

namespace Pss.FhirProcessor.Engine.Tests;

public class SpecHintEncounterTests
{
    [Fact]
    public async System.Threading.Tasks.Task MissingEncounterStatus_ShouldGenerateSpecHint()
    {
        // Arrange
        var service = new SpecHintService();
        
        // Create Encounter exactly like in user's bundle - with identifier, period, subject but NO status/class
        var encounter = new Encounter
        {
            Id = "bb7c8a63-0c49-40cf-9b0c-66e8b64d9254"
        };
        encounter.Identifier.Add(new Identifier { System = "test", Value = "test" });
        encounter.Period = new Period { Start = "2025-01-01" };
        encounter.Subject = new ResourceReference("Patient/test");
        // Intentionally missing Status and Class fields
        
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = encounter
                }
            }
        };

        // Act
        var issues = await service.CheckAsync(bundle, "R4");

        // Debug: Print all issues
        System.Console.WriteLine($"=== Encounter Validation Issues ===");
        foreach (var issue in issues)
        {
            System.Console.WriteLine($"Issue: {issue.Path} ({issue.Severity}) - {issue.Reason}");
        }
        System.Console.WriteLine($"Total issues: {issues.Count}");
        System.Console.WriteLine($"Encounter Status set: {encounter.Status != null}");
        System.Console.WriteLine($"Encounter Class set: {encounter.Class != null}");

        // Assert
        Assert.True(issues.Count >= 2, $"Expected at least 2 issues (status + class), got {issues.Count}");
        
        var statusIssue = issues.FirstOrDefault(i => i.Path == "Encounter.status");
        Assert.NotNull(statusIssue);
        
        var classIssue = issues.FirstOrDefault(i => i.Path == "Encounter.class");
        Assert.NotNull(classIssue);
    }

    [Fact]
    public async System.Threading.Tasks.Task MissingEncounterClass_ShouldGenerateSpecHint()
    {
        // Arrange
        var service = new SpecHintService();
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Encounter
                    {
                        Id = "test-encounter",
                        // Missing Class field
                        Status = Encounter.EncounterStatus.Finished,
                        Subject = new ResourceReference("Patient/test-patient")
                    }
                }
            }
        };

        // Act
        var issues = await service.CheckAsync(bundle, "R4");

        // Assert
        var classIssue = issues.FirstOrDefault(i => 
            i.ResourceType == "Encounter" && 
            i.Path == "class");
        
        Assert.NotNull(classIssue);
        Assert.Equal("class", classIssue.Path);
        Assert.Contains("HL7 FHIR R4", classIssue.Reason);
    }
}
