using Xunit;
using Pss.FhirProcessor.Engine.Services;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Task = System.Threading.Tasks.Task;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for conditional spec hints - "child required IF parent exists" scenarios
/// Tests conditional logic: condition evaluation, appliesToEach, per-item validation
/// </summary>
public class SpecHintConditionalTests
{
    private readonly SpecHintService _service;
    private readonly FhirJsonParser _parser;

    public SpecHintConditionalTests()
    {
        _service = new SpecHintService();
        _parser = new FhirJsonParser();
    }

    #region Patient.communication.language (conditional, appliesToEach=true)

    [Fact]
    public async Task Patient_WithoutCommunication_NoWarning()
    {
        // Arrange - Patient has no communication array
        // Condition: "communication.exists()" → evaluates to false → skip hint
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""identifier"": [{
                        ""system"": ""http://example.org/mrn"",
                        ""value"": ""12345""
                    }]
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert - no warning about communication.language because communication doesn't exist
        var commIssues = issues.Where(i => i.Path.Contains("communication")).ToList();
        Assert.Empty(commIssues);
    }

    [Fact]
    public async Task Patient_WithCommunication_LanguageMissing_ReturnsWarning()
    {
        // Arrange - Patient has communication but language is missing
        // Condition: "communication.exists()" → true
        // appliesToEach: true → check each communication entry
        // Result: should emit warning for communication[0].language
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""identifier"": [{
                        ""system"": ""http://example.org/mrn"",
                        ""value"": ""12345""
                    }],
                    ""communication"": [{
                        ""preferred"": true
                    }]
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert
        var languageIssues = issues.Where(i => i.Path.Contains("communication") && i.Path.Contains("language")).ToList();
        Assert.Single(languageIssues);
        
        var issue = languageIssues[0];
        Assert.Contains("communication[0].language", issue.Path);
        Assert.Contains("Patient", issue.ResourceType);
        Assert.Contains("mandatory", issue.Reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Patient_WithCommunication_LanguagePresent_NoWarning()
    {
        // Arrange - Patient has communication with language field
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""identifier"": [{
                        ""system"": ""http://example.org/mrn"",
                        ""value"": ""12345""
                    }],
                    ""communication"": [{
                        ""language"": {
                            ""coding"": [{
                                ""system"": ""urn:ietf:bcp:47"",
                                ""code"": ""en-US""
                            }]
                        },
                        ""preferred"": true
                    }]
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert - no warning because language is present
        var languageIssues = issues.Where(i => i.Path.Contains("communication") && i.Path.Contains("language")).ToList();
        Assert.Empty(languageIssues);
    }

    [Fact]
    public async Task Patient_MultipleCommunications_MixedValidity_ReturnsWarningsPerItem()
    {
        // Arrange - 3 communication entries: [valid, invalid, invalid]
        // appliesToEach: true → check each item independently
        // Expected: 2 warnings with array indices [1] and [2]
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""identifier"": [{
                        ""system"": ""http://example.org/mrn"",
                        ""value"": ""12345""
                    }],
                    ""communication"": [
                        {
                            ""language"": {
                                ""coding"": [{
                                    ""system"": ""urn:ietf:bcp:47"",
                                    ""code"": ""en-US""
                                }]
                            },
                            ""preferred"": true
                        },
                        {
                            ""preferred"": false
                        },
                        {
                            ""preferred"": false
                        }
                    ]
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert - 2 warnings for indices [1] and [2]
        var languageIssues = issues.Where(i => i.Path.Contains("communication") && i.Path.Contains("language")).ToList();
        Assert.Equal(2, languageIssues.Count);

        Assert.Contains(languageIssues, i => i.Path.Contains("communication[1].language"));
        Assert.Contains(languageIssues, i => i.Path.Contains("communication[2].language"));
    }

    [Fact]
    public async Task Patient_MultipleCommunications_AllValid_NoWarnings()
    {
        // Arrange - all communication entries have language
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""identifier"": [{
                        ""system"": ""http://example.org/mrn"",
                        ""value"": ""12345""
                    }],
                    ""communication"": [
                        {
                            ""language"": {
                                ""coding"": [{
                                    ""system"": ""urn:ietf:bcp:47"",
                                    ""code"": ""en-US""
                                }]
                            }
                        },
                        {
                            ""language"": {
                                ""coding"": [{
                                    ""system"": ""urn:ietf:bcp:47"",
                                    ""code"": ""zh-CN""
                                }]
                            }
                        }
                    ]
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert - no warnings
        var languageIssues = issues.Where(i => i.Path.Contains("communication") && i.Path.Contains("language")).ToList();
        Assert.Empty(languageIssues);
    }

    #endregion

    #region Patient.contact.name (conditional, appliesToEach=true)

    [Fact]
    public async Task Patient_WithoutContact_NoWarning()
    {
        // Arrange - Patient has no contact array
        // Condition: "contact.exists()" → evaluates to false → skip hint
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""identifier"": [{
                        ""system"": ""http://example.org/mrn"",
                        ""value"": ""12345""
                    }]
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert - no warning about contact.name because contact doesn't exist
        var contactIssues = issues.Where(i => i.Path.Contains("contact") && i.Path.Contains("name")).ToList();
        Assert.Empty(contactIssues);
    }

    [Fact]
    public async Task Patient_WithContact_NameMissing_ReturnsWarning()
    {
        // Arrange - Patient has contact but name is missing
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""identifier"": [{
                        ""system"": ""http://example.org/mrn"",
                        ""value"": ""12345""
                    }],
                    ""contact"": [{
                        ""relationship"": [{
                            ""coding"": [{
                                ""system"": ""http://terminology.hl7.org/CodeSystem/v2-0131"",
                                ""code"": ""E""
                            }]
                        }]
                    }]
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert
        var nameIssues = issues.Where(i => i.Path.Contains("contact") && i.Path.Contains("name")).ToList();
        Assert.Single(nameIssues);
        
        var issue = nameIssues[0];
        Assert.Contains("contact[0].name", issue.Path);
        Assert.Contains("Patient", issue.ResourceType);
    }

    [Fact]
    public async Task Patient_WithContact_NamePresent_NoWarning()
    {
        // Arrange - Patient has contact with name
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""identifier"": [{
                        ""system"": ""http://example.org/mrn"",
                        ""value"": ""12345""
                    }],
                    ""contact"": [{
                        ""name"": {
                            ""family"": ""Doe"",
                            ""given"": [""Jane""]
                        }
                    }]
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert - no warning because name is present
        var nameIssues = issues.Where(i => i.Path.Contains("contact") && i.Path.Contains("name")).ToList();
        Assert.Empty(nameIssues);
    }

    #endregion

    #region Backward Compatibility Tests

    [Fact]
    public async Task SimpleHints_StillWork_Encounter_Status()
    {
        // Arrange - test that simple (non-conditional) hints still function
        // Encounter.status has no condition → always checked
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

        // Assert - simple hint still works (no regression)
        var statusIssues = issues.Where(i => i.Path.Contains("Encounter.status")).ToList();
        Assert.NotEmpty(statusIssues);
    }

    [Fact]
    public async Task SimpleHints_StillWork_Patient_Identifier()
    {
        // Arrange - Patient.identifier has no condition → always checked
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""name"": [{
                        ""family"": ""Doe"",
                        ""given"": [""John""]
                    }]
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert - simple hint still works
        var identifierIssues = issues.Where(i => i.Path.Contains("identifier")).ToList();
        Assert.NotEmpty(identifierIssues);
    }

    #endregion

    #region Integration Tests: Multiple Resources with Mixed Hints

    [Fact]
    public async Task Bundle_MultiplePatients_MixedConditionalAndSimpleHints()
    {
        // Arrange - 2 patients:
        // - Patient 1: missing identifier (simple hint) + has communication without language (conditional)
        // - Patient 2: has identifier, no communication
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""id"": ""patient-001"",
                        ""communication"": [{
                            ""preferred"": true
                        }]
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""id"": ""patient-002"",
                        ""identifier"": [{
                            ""system"": ""http://example.org/mrn"",
                            ""value"": ""67890""
                        }]
                    }
                }
            ]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert
        // Patient 1: missing identifier + missing communication[0].language = 2 issues
        // Patient 2: no issues (has identifier, no communication)
        var patient1Issues = issues.Where(i => i.ResourceId == "patient-001").ToList();
        Assert.Equal(2, patient1Issues.Count);
        Assert.Contains(patient1Issues, i => i.Path.Contains("identifier"));
        Assert.Contains(patient1Issues, i => i.Path.Contains("communication[0].language"));

        var patient2Issues = issues.Where(i => i.ResourceId == "patient-002").ToList();
        Assert.Empty(patient2Issues);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task Patient_EmptyCommunicationArray_NoWarning()
    {
        // Arrange - communication is an empty array []
        // Condition: "communication.exists()" → true (array exists)
        // But no items to iterate → no warnings
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""identifier"": [{
                        ""system"": ""http://example.org/mrn"",
                        ""value"": ""12345""
                    }],
                    ""communication"": []
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R4");

        // Assert - no warnings (empty array has no items to validate)
        var languageIssues = issues.Where(i => i.Path.Contains("communication") && i.Path.Contains("language")).ToList();
        Assert.Empty(languageIssues);
    }

    [Fact]
    public async Task UnsupportedFhirVersion_ConditionalHints_ReturnsEmpty()
    {
        // Arrange - FHIR version not R4
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""communication"": [{
                        ""preferred"": true
                    }]
                }
            }]
        }";

        var bundle = _parser.Parse<Bundle>(json);

        // Act
        var issues = await _service.CheckAsync(bundle, "R5");

        // Assert - no issues for unsupported version
        Assert.Empty(issues);
    }

    #endregion
}
