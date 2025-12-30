using System.Text.Json;
using Pss.FhirProcessor.Engine.Models;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for RuleDefinition deserialization behavior with optional ErrorCode field.
/// Validates that ErrorCode is backend-owned and not required during rule authoring.
/// </summary>
public class RuleDefinitionSerializationTests
{
    [Fact]
    public void RuleDefinition_Deserializes_WithoutErrorCode()
    {
        // Arrange - JSON without errorCode (frontend stops sending it)
        var json = """
        {
            "id": "test-rule-001",
            "type": "Required",
            "resourceType": "Patient",
            "fieldPath": "name.family",
            "instanceScope": {
                "kind": "all"
            },
            "severity": "error"
        }
        """;

        // Act
        var rule = JsonSerializer.Deserialize<RuleDefinition>(json);

        // Assert
        Assert.NotNull(rule);
        Assert.Equal("test-rule-001", rule.Id);
        Assert.Equal("Required", rule.Type);
        Assert.Equal("Patient", rule.ResourceType);
        Assert.Equal("name.family", rule.FieldPath);
        Assert.Null(rule.ErrorCode); // ErrorCode is null when not provided
    }

    [Fact]
    public void RuleDefinition_Deserializes_WithErrorCode_BackwardCompatibility()
    {
        // Arrange - JSON with errorCode (existing rules.json files)
        var json = """
        {
            "id": "test-rule-002",
            "type": "Required",
            "resourceType": "Patient",
            "fieldPath": "name.family",
            "instanceScope": {
                "kind": "all"
            },
            "severity": "error",
            "errorCode": "FIELD_REQUIRED"
        }
        """;

        // Act
        var rule = JsonSerializer.Deserialize<RuleDefinition>(json);

        // Assert
        Assert.NotNull(rule);
        Assert.Equal("test-rule-002", rule.Id);
        Assert.Equal("FIELD_REQUIRED", rule.ErrorCode); // Backward compatibility preserved
    }

    [Fact]
    public void RuleDefinition_Serializes_WithNullErrorCode()
    {
        // Arrange - Rule created without errorCode
        var rule = new RuleDefinition
        {
            Id = "test-rule-003",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = "name.family",
            InstanceScope = new AllInstances(),
            Severity = "error",
            ErrorCode = null // Explicitly null
        };

        // Act
        var json = JsonSerializer.Serialize(rule);
        var deserialized = JsonSerializer.Deserialize<RuleDefinition>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Equal("test-rule-003", deserialized.Id);
        Assert.Null(deserialized.ErrorCode); // Null preserved through serialization
    }

    [Fact]
    public void RuleDefinition_Serializes_WithoutErrorCode_Property()
    {
        // Arrange - Rule with errorCode not set (default nullable behavior)
        var rule = new RuleDefinition
        {
            Id = "test-rule-004",
            Type = "ArrayLength",
            ResourceType = "Patient",
            FieldPath = "name",
            InstanceScope = new AllInstances(),
            Severity = "error"
            // ErrorCode not specified
        };

        // Act
        var json = JsonSerializer.Serialize(rule);

        // Assert - Verify JSON does not include errorCode field when null
        // JsonIgnore(WhenWritingNull) ensures null values are omitted
        Assert.DoesNotContain("\"errorCode\":", json);
    }

    [Fact]
    public void QuestionAnswer_Deserializes_WithoutErrorCode()
    {
        // Arrange - QuestionAnswer rule without errorCode (runtime-determined)
        var json = """
        {
            "id": "qa-rule-001",
            "type": "QuestionAnswer",
            "resourceType": "Observation",
            "fieldPath": "component",
            "instanceScope": {
                "kind": "all"
            },
            "severity": "error",
            "params": {
                "questionSetId": "smoking-status"
            }
        }
        """;

        // Act
        var rule = JsonSerializer.Deserialize<RuleDefinition>(json);

        // Assert
        Assert.NotNull(rule);
        Assert.Equal("QuestionAnswer", rule.Type);
        Assert.Null(rule.ErrorCode); // ErrorCode not required for QuestionAnswer
        Assert.NotNull(rule.Params);
        Assert.Equal("smoking-status", rule.Params["questionSetId"].ToString());
    }

    [Fact]
    public void CustomFHIRPath_Deserializes_WithoutErrorCode()
    {
        // Arrange - CustomFHIRPath rule without errorCode (backend-determined)
        var json = """
        {
            "id": "custom-rule-001",
            "type": "CustomFHIRPath",
            "resourceType": "Patient",
            "fieldPath": "gender.exists()",
            "instanceScope": {
                "kind": "all"
            },
            "severity": "error"
        }
        """;

        // Act
        var rule = JsonSerializer.Deserialize<RuleDefinition>(json);

        // Assert
        Assert.NotNull(rule);
        Assert.Equal("CustomFHIRPath", rule.Type);
        Assert.Null(rule.ErrorCode); // Backend determines CUSTOMFHIRPATH_CONDITION_FAILED at runtime
    }

    [Fact]
    public void AllRuleTypes_Deserialize_WithoutErrorCode()
    {
        // Arrange - Test all common rule types without errorCode
        var ruleTypes = new[]
        {
            ("Required", "name.family"),
            ("FixedValue", "gender"),
            ("AllowedValues", "gender"),
            ("Pattern", "identifier.value"),
            ("ArrayLength", "name"),
            ("CodeSystem", "maritalStatus.coding"),
            ("CustomFHIRPath", "gender.exists()"),
            ("QuestionAnswer", "component")
        };

        foreach (var (type, fieldPath) in ruleTypes)
        {
            var json = $$"""
            {
                "id": "{{type.ToLower()}}-rule",
                "type": "{{type}}",
                "resourceType": "Patient",
                "fieldPath": "{{fieldPath}}",
                "instanceScope": {
                    "kind": "all"
                },
                "severity": "error"
            }
            """;

            // Act
            var rule = JsonSerializer.Deserialize<RuleDefinition>(json);

            // Assert
            Assert.NotNull(rule);
            Assert.Equal(type, rule.Type);
            Assert.Null(rule.ErrorCode); // All rule types work without errorCode
        }
    }
}
