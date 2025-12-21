using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Models;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Services;

/// <summary>
/// Tests for ValidationExplanationService ruleType normalization.
/// Ensures inconsistent UI formats (ArrayLength, ARRAY_LENGTH, array-length) 
/// all route to correct high-confidence templates.
/// </summary>
public class ValidationExplanationServiceNormalizationTests
{
    [Theory]
    [InlineData("Required", "high")]
    [InlineData("REQUIRED", "high")]
    [InlineData("required", "high")]
    [InlineData("REQUIRED_FIELD", "high")] // Underscores removed
    public void Required_Variants_Return_High_Confidence(string ruleType, string expectedConfidence)
    {
        // Act
        var result = ValidationExplanationService.ForProjectRule(
            ruleType, 
            "Patient.gender", 
            ruleExplanation: null, 
            metadata: null
        );
        
        // Assert
        Assert.Equal(expectedConfidence, result.Confidence);
        Assert.Contains("requires the field", result.What);
        Assert.NotNull(result.How);
    }
    
    [Theory]
    [InlineData("ArrayLength", "high")]
    [InlineData("ARRAY_LENGTH", "high")]
    [InlineData("array-length", "high")]
    [InlineData("Cardinality", "high")]
    [InlineData("CARDINALITY", "high")]
    [InlineData("ArraySize", "high")]
    [InlineData("ARRAY_SIZE", "high")]
    public void ArrayLength_Variants_Return_High_Confidence(string ruleType, string expectedConfidence)
    {
        // Act
        var result = ValidationExplanationService.ForProjectRule(
            ruleType, 
            "Patient.name", 
            ruleExplanation: null, 
            metadata: null
        );
        
        // Assert
        Assert.Equal(expectedConfidence, result.Confidence);
        Assert.Contains("how many items", result.What);
        Assert.NotNull(result.How);
    }
    
    [Theory]
    [InlineData("FixedValue", "high")]
    [InlineData("FIXED_VALUE", "high")]
    [InlineData("fixed-value", "high")]
    public void FixedValue_Variants_Return_High_Confidence(string ruleType, string expectedConfidence)
    {
        // Act
        var result = ValidationExplanationService.ForProjectRule(
            ruleType, 
            "Patient.gender", 
            ruleExplanation: null, 
            metadata: null
        );
        
        // Assert
        Assert.Equal(expectedConfidence, result.Confidence);
        Assert.Contains("fixed value", result.What);
        Assert.NotNull(result.How);
    }
    
    [Theory]
    [InlineData("AllowedValues", "high")]
    [InlineData("ALLOWED_VALUES", "high")]
    [InlineData("allowed-values", "high")]
    public void AllowedValues_Variants_Return_High_Confidence(string ruleType, string expectedConfidence)
    {
        // Act
        var result = ValidationExplanationService.ForProjectRule(
            ruleType, 
            "Patient.gender", 
            ruleExplanation: null, 
            metadata: null
        );
        
        // Assert
        Assert.Equal(expectedConfidence, result.Confidence);
        Assert.Contains("predefined set", result.What);
        Assert.NotNull(result.How);
    }
    
    [Theory]
    [InlineData("CodeSystem", "medium")]
    [InlineData("CODE_SYSTEM", "medium")]
    [InlineData("code-system", "medium")]
    [InlineData("ValueSet", "medium")]
    [InlineData("VALUE_SET", "medium")]
    [InlineData("value-set", "medium")]
    public void CodeSystem_Variants_Return_Medium_Confidence(string ruleType, string expectedConfidence)
    {
        // Act
        var result = ValidationExplanationService.ForProjectRule(
            ruleType, 
            "Patient.maritalStatus", 
            ruleExplanation: null, 
            metadata: null
        );
        
        // Assert
        Assert.Equal(expectedConfidence, result.Confidence);
        Assert.Contains("correct code system", result.What);
        Assert.NotNull(result.How);
    }
    
    [Theory]
    [InlineData("Regex", "medium")]
    [InlineData("REGEX", "medium")]
    [InlineData("Pattern", "medium")]
    [InlineData("PATTERN", "medium")]
    public void Regex_Variants_Return_Medium_Confidence(string ruleType, string expectedConfidence)
    {
        // Act
        var result = ValidationExplanationService.ForProjectRule(
            ruleType, 
            "Patient.identifier.value", 
            ruleExplanation: null, 
            metadata: null
        );
        
        // Assert
        Assert.Equal(expectedConfidence, result.Confidence);
        Assert.Contains("validates the format", result.What);
        Assert.NotNull(result.How);
    }
    
    [Theory]
    [InlineData("CustomFHIRPath", "low")]
    [InlineData("CUSTOM_FHIR_PATH", "low")]
    [InlineData("custom-fhir-path", "low")]
    [InlineData("FHIRPath", "low")]
    [InlineData("FHIR_PATH", "low")]
    public void CustomFHIRPath_Variants_Return_Low_Confidence(string ruleType, string expectedConfidence)
    {
        // Act
        var result = ValidationExplanationService.ForProjectRule(
            ruleType, 
            "Patient.contact", 
            ruleExplanation: null, 
            metadata: null
        );
        
        // Assert
        Assert.Equal(expectedConfidence, result.Confidence);
        Assert.Contains("project-specific condition", result.What);
        Assert.NotNull(result.How);
    }
    
    [Fact]
    public void Unknown_RuleType_Returns_Medium_Confidence_Fallback()
    {
        // Act
        var result = ValidationExplanationService.ForProjectRule(
            "UnknownRuleType", 
            "Patient.custom", 
            ruleExplanation: null, 
            metadata: null
        );
        
        // Assert
        Assert.Equal("medium", result.Confidence);
        Assert.Contains("project-specific requirements", result.What);
        Assert.Null(result.How); // Fallback has no "how"
    }
    
    [Fact]
    public void ArrayLength_With_Metadata_Includes_Details()
    {
        // Arrange
        var metadata = new Dictionary<string, object>
        {
            ["min"] = 1,
            ["max"] = 5,
            ["actualCount"] = 0
        };
        
        // Act
        var result = ValidationExplanationService.ForProjectRule(
            "ARRAY_LENGTH", 
            "Patient.name", 
            ruleExplanation: null, 
            metadata: metadata
        );
        
        // Assert
        Assert.Equal("high", result.Confidence);
        Assert.Contains("Current item count: 0", result.How);
        Assert.Contains("Allowed range: 1 to 5", result.How);
    }
    
    [Fact]
    public void FixedValue_With_Metadata_Includes_ExpectedAndActual()
    {
        // Arrange
        var metadata = new Dictionary<string, object>
        {
            ["expectedValue"] = "male",
            ["actualValue"] = "female"
        };
        
        // Act
        var result = ValidationExplanationService.ForProjectRule(
            "FIXED_VALUE", 
            "Patient.gender", 
            ruleExplanation: null, 
            metadata: metadata
        );
        
        // Assert
        Assert.Equal("high", result.Confidence);
        Assert.Contains("Expected value: male", result.How);
        Assert.Contains("Actual value: female", result.How);
    }
    
    [Fact]
    public void AllowedValues_With_Metadata_Lists_Values()
    {
        // Arrange
        var metadata = new Dictionary<string, object>
        {
            ["actualValue"] = "unknown",
            ["allowedValues"] = new List<string> { "male", "female", "other" }
        };
        
        // Act
        var result = ValidationExplanationService.ForProjectRule(
            "ALLOWED_VALUES", 
            "Patient.gender", 
            ruleExplanation: null, 
            metadata: metadata
        );
        
        // Assert
        Assert.Equal("high", result.Confidence);
        Assert.Contains("The value `unknown` is not allowed", result.How);
        Assert.Contains("- male", result.How);
        Assert.Contains("- female", result.How);
        Assert.Contains("- other", result.How);
    }
    
    [Fact]
    public void CodeSystem_With_Metadata_Includes_SystemUrl()
    {
        // Arrange
        var metadata = new Dictionary<string, object>
        {
            ["codeSystem"] = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus"
        };
        
        // Act
        var result = ValidationExplanationService.ForProjectRule(
            "VALUE_SET", // Test VALUESET alias
            "Patient.maritalStatus", 
            ruleExplanation: null, 
            metadata: metadata
        );
        
        // Assert
        Assert.Equal("medium", result.Confidence);
        Assert.Contains("Expected code system: http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", result.How);
    }
}
