using Xunit;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Navigation.Structure;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Task = System.Threading.Tasks.Task;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests that verify SPEC_HINT is fully metadata-driven with no implicit inference.
/// </summary>
public class SpecHintMetadataTests
{
    private readonly SpecHintService _specHintService;
    private readonly UnifiedErrorModelBuilder _errorBuilder;
    private readonly FhirJsonParser _parser;

    public SpecHintMetadataTests()
    {
        _specHintService = new SpecHintService();
        var jsonResolver = new JsonPointerResolver(new NullFhirStructureHintProvider());
        var navLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<SmartPathNavigationService>.Instance;
        var navService = new SmartPathNavigationService(jsonResolver, navLogger);
        var builderLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<UnifiedErrorModelBuilder>.Instance;
        var classifierLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<BaseRuleClassifier>.Instance;
        var classifier = new BaseRuleClassifier(classifierLogger);
        _errorBuilder = new UnifiedErrorModelBuilder(navService, builderLogger, classifier);
        _parser = new FhirJsonParser();
    }

    [Fact]
    public async Task ConditionalHint_ErrorDetails_ContainMetadata()
    {
        // Arrange - Patient with communication missing language (conditional hint)
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
        var issues = await _specHintService.CheckAsync(bundle, "R4");
        var errors = await _errorBuilder.FromSpecHintIssuesAsync(issues, json, null);

        // Assert
        var conditionalError = errors.FirstOrDefault(e => e.Path.Contains("communication") && e.Path.Contains("language"));
        Assert.NotNull(conditionalError);
        
        // Verify metadata in Details
        Assert.True(conditionalError.Details.ContainsKey("isConditional"));
        Assert.True((bool)conditionalError.Details["isConditional"]);
        
        Assert.True(conditionalError.Details.ContainsKey("condition"));
        Assert.Equal("communication.exists()", conditionalError.Details["condition"]);
        
        Assert.True(conditionalError.Details.ContainsKey("appliesToEach"));
        Assert.True((bool)conditionalError.Details["appliesToEach"]);
        
        // Verify error code
        Assert.Equal("SPEC_REQUIRED_CONDITIONAL", conditionalError.ErrorCode);
    }

    [Fact]
    public async Task SimpleHint_ErrorDetails_ShowNonConditional()
    {
        // Arrange - Patient missing identifier (simple hint)
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
        var issues = await _specHintService.CheckAsync(bundle, "R4");
        var errors = await _errorBuilder.FromSpecHintIssuesAsync(issues, json, null);

        // Assert
        var simpleError = errors.FirstOrDefault(e => e.Path.Contains("identifier"));
        Assert.NotNull(simpleError);
        
        // Verify metadata shows non-conditional
        Assert.True(simpleError.Details.ContainsKey("isConditional"));
        Assert.False((bool)simpleError.Details["isConditional"]);
        
        Assert.True(simpleError.Details.ContainsKey("appliesToEach"));
        Assert.False((bool)simpleError.Details["appliesToEach"]);
        
        // condition should not be in details for simple hints
        Assert.False(simpleError.Details.ContainsKey("condition"));
        
        // Verify error code
        Assert.Equal("MISSING_REQUIRED_FIELD", simpleError.ErrorCode);
    }

    [Fact]
    public async Task SpecHintIssue_CarriesMetadataFromHint()
    {
        // Arrange - Patient with communication missing language
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
        var issues = await _specHintService.CheckAsync(bundle, "R4");

        // Assert
        var conditionalIssue = issues.FirstOrDefault(i => i.Path.Contains("communication") && i.Path.Contains("language"));
        Assert.NotNull(conditionalIssue);
        
        // Verify SpecHintIssue carries metadata
        Assert.True(conditionalIssue.IsConditional);
        Assert.Equal("communication.exists()", conditionalIssue.Condition);
        Assert.True(conditionalIssue.AppliesToEach);
    }
}
