using Xunit;
using Pss.FhirProcessor.Engine.Models;
using System.Text.Json;

namespace Pss.FhirProcessor.Engine.Tests.Phase4;

/// <summary>
/// PHASE 4 ENFORCEMENT TESTS
/// These tests ensure that Message field cannot be reintroduced to backend models
/// If any test fails, Phase 4 contract has been violated
/// </summary>
public class NoLegacyMessageAllowedTests
{
    [Fact]
    public void RuleValidationError_ShouldNotHave_MessageProperty()
    {
        // PHASE 4: Message property must not exist on RuleValidationError
        var type = typeof(RuleValidationError);
        var messageProperty = type.GetProperty("Message");
        
        Assert.Null(messageProperty);
    }
    
    [Fact]
    public void CodeMasterValidationError_ShouldNotHave_MessageProperty()
    {
        // PHASE 4: Message property must not exist on CodeMasterValidationError
        var type = typeof(CodeMasterValidationError);
        var messageProperty = type.GetProperty("Message");
        
        Assert.Null(messageProperty);
    }
    
    [Fact]
    public void ReferenceValidationError_ShouldNotHave_MessageProperty()
    {
        // PHASE 4: Message property must not exist on ReferenceValidationError
        var type = typeof(ReferenceValidationError);
        var messageProperty = type.GetProperty("Message");
        
        Assert.Null(messageProperty);
    }
    
    [Fact]
    public void RuleDefinition_ShouldNotHave_MessageProperty()
    {
        // PHASE 4: Message property must not exist on RuleDefinition
        var type = typeof(RuleDefinition);
        var messageProperty = type.GetProperty("Message");
        
        Assert.Null(messageProperty);
    }
    
    [Fact]
    public void RuleSet_WithMissingErrorCode_ShouldFail_Deserialization()
    {
        // PHASE 4: Rules without errorCode must be rejected at deserialization
        var legacyRuleJson = @"{
            ""projectId"": ""test"",
            ""rules"": [
                {
                    ""id"": ""rule-1"",
                    ""type"": ""Required"",
                    ""resourceType"": ""Observation"",
                    ""path"": ""Observation.value"",
                    ""severity"": ""error"",
                    ""message"": ""This is a legacy message""
                }
            ]
        }";
        
        // Deserialization should throw JsonException because errorCode is required
        var exception = Assert.Throws<JsonException>(() => 
        {
            JsonSerializer.Deserialize<RuleSet>(legacyRuleJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        });
        
        Assert.Contains("errorCode", exception.Message);
    }
    
    [Fact]
    public void RuleSet_WithErrorCode_ShouldDeserialize_Successfully()
    {
        // PHASE 4: Rules with errorCode should work perfectly
        var validRuleJson = @"{
            ""projectId"": ""test"",
            ""rules"": [
                {
                    ""id"": ""rule-1"",
                    ""type"": ""Required"",
                    ""resourceType"": ""Observation"",
                    ""path"": ""Observation.value"",
                    ""severity"": ""error"",
                    ""errorCode"": ""FIELD_REQUIRED"",
                    ""userHint"": ""Blood pressure reading""
                }
            ]
        }";
        
        var ruleSet = JsonSerializer.Deserialize<RuleSet>(validRuleJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        
        Assert.NotNull(ruleSet);
        Assert.NotNull(ruleSet.Rules);
        Assert.Single(ruleSet.Rules);
        
        var rule = ruleSet.Rules[0];
        Assert.Equal("FIELD_REQUIRED", rule.ErrorCode);
        Assert.Equal("Blood pressure reading", rule.UserHint);
    }
    
    [Fact]
    public void RuleValidationError_CanBeCreated_WithoutMessage()
    {
        // PHASE 4: Creating RuleValidationError without Message should compile and work
        var error = new RuleValidationError
        {
            RuleId = "test-rule",
            RuleType = "Required",
            Severity = "error",
            ResourceType = "Observation",
            Path = "Observation.value",
            ErrorCode = "FIELD_REQUIRED"
        };
        
        Assert.Equal("FIELD_REQUIRED", error.ErrorCode);
        Assert.Equal("test-rule", error.RuleId);
        
        // Verify that Message property doesn't exist
        var type = error.GetType();
        Assert.Null(type.GetProperty("Message"));
    }
    
    [Fact]
    public void CodeMasterValidationError_CanBeCreated_WithoutMessage()
    {
        // PHASE 4: Creating CodeMasterValidationError without Message should compile and work
        var error = new CodeMasterValidationError
        {
            Severity = "error",
            ResourceType = "Observation",
            Path = "Observation.component[0]",
            ErrorCode = "UNKNOWN_SCREENING_TYPE"
        };
        
        Assert.Equal("UNKNOWN_SCREENING_TYPE", error.ErrorCode);
        
        // Verify that Message property doesn't exist
        var type = error.GetType();
        Assert.Null(type.GetProperty("Message"));
    }
    
    [Fact]
    public void ReferenceValidationError_CanBeCreated_WithoutMessage()
    {
        // PHASE 4: Creating ReferenceValidationError without Message should compile and work
        var error = new ReferenceValidationError
        {
            Severity = "error",
            ResourceType = "Observation",
            Path = "Observation.subject",
            ErrorCode = "REFERENCE_NOT_FOUND"
        };
        
        Assert.Equal("REFERENCE_NOT_FOUND", error.ErrorCode);
        
        // Verify that Message property doesn't exist
        var type = error.GetType();
        Assert.Null(type.GetProperty("Message"));
    }
    
    [Fact]
    public void ValidationError_MessageField_IsAllowedFor_FhirErrors()
    {
        // ValidationError (unified model) still has Message for FHIR structural errors
        // This is intentional - only FHIR source can emit prose
        var error = new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            Message = "Invalid date format (from Firely SDK)",
            ErrorCode = "INVALID_DATE"
        };
        
        Assert.Equal("Invalid date format (from Firely SDK)", error.Message);
        Assert.Equal("FHIR", error.Source);
    }
    
    [Fact]
    public void ValidationError_MessageField_ShouldBeEmpty_ForBusinessErrors()
    {
        // ValidationError for business rules should have empty Message
        // Frontend uses ErrorCode for all business rule messages
        var error = new ValidationError
        {
            Source = "Business",
            Severity = "error",
            Message = string.Empty, // Backend does not emit prose
            ErrorCode = "FIELD_REQUIRED"
        };
        
        Assert.Empty(error.Message);
        Assert.Equal("Business", error.Source);
        Assert.Equal("FIELD_REQUIRED", error.ErrorCode);
    }
}
