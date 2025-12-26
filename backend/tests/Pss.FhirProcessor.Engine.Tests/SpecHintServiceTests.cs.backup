using Xunit;
using Pss.FhirProcessor.Engine.Services;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Task = System.Threading.Tasks.Task;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for SpecHintService - advisory HL7 required field hints
/// </summary>
public class SpecHintServiceTests
{
    private readonly SpecHintService _service;
    private readonly FhirJsonParser _parser;

    public SpecHintServiceTests()
    {
        _service = new SpecHintService();
        _parser = new FhirJsonParser();
    }

    [Fact]
    public async Task Encounter_WithoutStatus_ReturnsSpecHint()
    {
        // Arrange - Encounter missing required 'status' field
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""IMP""
                    }
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert
        Assert.NotEmpty(issues);
        var statusIssue = issues.FirstOrDefault(i => i.Path.Contains("status"));
        Assert.NotNull(statusIssue);
        Assert.Equal("Encounter", statusIssue.ResourceType);
        Assert.Equal("warning", statusIssue.Severity);
        Assert.Contains("HL7 FHIR R4", statusIssue.Reason);
    }

    [Fact]
    public async Task Encounter_WithStatus_NoSpecHint()
    {
        // Arrange - Encounter with required 'status' field
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001"",
                    ""status"": ""finished"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""IMP""
                    }
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert
        var statusIssues = issues.Where(i => i.Path.Contains("Encounter.status")).ToList();
        Assert.Empty(statusIssues);
    }

    [Fact]
    public async Task Observation_WithoutStatus_ReturnsSpecHint()
    {
        // Arrange - Observation missing required 'status' field
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Observation"",
                    ""id"": ""obs-001"",
                    ""code"": {
                        ""coding"": [{
                            ""system"": ""http://loinc.org"",
                            ""code"": ""8480-6""
                        }]
                    }
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert
        Assert.NotEmpty(issues);
        var statusIssue = issues.FirstOrDefault(i => i.Path.Contains("status"));
        Assert.NotNull(statusIssue);
        Assert.Equal("Observation", statusIssue.ResourceType);
    }

    [Fact]
    public async Task Observation_WithoutCode_ReturnsSpecHint()
    {
        // Arrange - Observation missing required 'code' field
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Observation"",
                    ""id"": ""obs-001"",
                    ""status"": ""final""
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert
        Assert.NotEmpty(issues);
        var codeIssue = issues.FirstOrDefault(i => i.Path.Contains("code"));
        Assert.NotNull(codeIssue);
        Assert.Equal("Observation", codeIssue.ResourceType);
    }

    [Fact]
    public async Task Patient_WithoutIdentifier_ReturnsSpecHint()
    {
        // Arrange - Patient missing required 'identifier' field
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""pat-001"",
                    ""name"": [{
                        ""family"": ""Doe""
                    }]
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert
        Assert.NotEmpty(issues);
        var identifierIssue = issues.FirstOrDefault(i => i.Path.Contains("identifier"));
        Assert.NotNull(identifierIssue);
        Assert.Equal("Patient", identifierIssue.ResourceType);
    }

    [Fact]
    public async Task Organization_WithoutName_ReturnsSpecHint()
    {
        // Arrange - Organization missing required 'name' field
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Organization"",
                    ""id"": ""org-001"",
                    ""identifier"": [{
                        ""value"": ""ORG123""
                    }]
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert
        Assert.NotEmpty(issues);
        var nameIssue = issues.FirstOrDefault(i => i.Path.Contains("name"));
        Assert.NotNull(nameIssue);
        Assert.Equal("Organization", nameIssue.ResourceType);
    }

    [Fact]
    public async Task EmptyBundle_NoSpecHints()
    {
        // Arrange - Empty bundle
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": []
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert
        Assert.Empty(issues);
    }

    [Fact]
    public async Task MultipleResources_MultipleMissingFields_ReturnsAllHints()
    {
        // Arrange - Multiple resources with missing required fields
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Encounter"",
                        ""id"": ""enc-001"",
                        ""class"": {
                            ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                            ""code"": ""IMP""
                        }
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Observation"",
                        ""id"": ""obs-001"",
                        ""code"": {
                            ""coding"": [{
                                ""system"": ""http://loinc.org"",
                                ""code"": ""8480-6""
                            }]
                        }
                    }
                }
            ]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert
        Assert.NotEmpty(issues);
        Assert.Contains(issues, i => i.ResourceType == "Encounter" && i.Path.Contains("status"));
        Assert.Contains(issues, i => i.ResourceType == "Observation" && i.Path.Contains("status"));
    }

    [Fact]
    public async Task UnsupportedFhirVersion_ReturnsEmptyList()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001""
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R5");

        // Assert
        Assert.Empty(issues); // R5 catalog doesn't exist yet
    }
}
