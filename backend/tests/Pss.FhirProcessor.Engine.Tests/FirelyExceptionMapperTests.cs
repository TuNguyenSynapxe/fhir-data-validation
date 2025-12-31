using Xunit;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for improved Firely exception handling
/// Verifies that enum errors, type mismatches, and structural errors are properly captured
/// </summary>
public class FirelyExceptionMapperTests
{
    [Fact]
    public void MapToValidationError_InvalidEnumValue_ExtractsDetails()
    {
        // Arrange
        var exceptionMessage = "Literal 'completed' is not a valid value for enumeration 'Encounter.StatusCode'";
        var exception = new Exception(exceptionMessage);
        var rawBundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""status"": ""completed""
                }
            }]
        }";
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, rawBundleJson);
        
        // Assert
        Assert.Equal("FHIR", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("INVALID_ENUM_VALUE", error.ErrorCode);
        Assert.Equal("Encounter", error.ResourceType);
        Assert.Equal("status", error.Path);
        Assert.Contains("completed", error.Message);
        Assert.Contains("Invalid value", error.Message);
        
        // Check details
        Assert.NotNull(error.Details);
        Assert.Equal("completed", error.Details["actualValue"]);
        Assert.Equal("Encounter.StatusCode", error.Details["enumType"]);
        
        // Should contain allowed values if known
        if (error.Details.ContainsKey("allowedValues"))
        {
            var allowedValues = error.Details["allowedValues"] as List<string>;
            Assert.NotNull(allowedValues);
            Assert.Contains("planned", allowedValues);
            Assert.Contains("in-progress", allowedValues);
        }
    }
    
    [Fact]
    public void MapToValidationError_UnknownElement_ExtractsDetails()
    {
        // Arrange
        var exceptionMessage = "Encountered unknown element 'invalidField' while parsing";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("FHIR", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("UNKNOWN_ELEMENT", error.ErrorCode);
        Assert.Equal("invalidField", error.Path);
        Assert.Contains("Unknown element", error.Message);
        Assert.Contains("not valid in FHIR R4", error.Message);
        
        // Check details
        Assert.NotNull(error.Details);
        Assert.Equal("invalidField", error.Details["unknownElement"]);
    }
    
    [Fact]
    public void MapToValidationError_UnknownElementWithLocation_ExtractsPathAndJsonPointer()
    {
        // Arrange
        var exceptionMessage = "FHIR structural validation error: Type checking the data: Encountered unknown element 'actualPeriod' at location 'Bundle.entry[1].resource[0].actualPeriod[0]' while parsing";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("FHIR", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("UNKNOWN_ELEMENT", error.ErrorCode);
        Assert.Equal("Bundle.entry[1].resource[0].actualPeriod[0]", error.Path);
        Assert.Equal("/entry/1/resource/actualPeriod/0", error.JsonPointer);
        Assert.Contains("Unknown element", error.Message);
        Assert.Contains("actualPeriod", error.Message);
        
        // Check details
        Assert.NotNull(error.Details);
        Assert.Equal("actualPeriod", error.Details["unknownElement"]);
        Assert.Equal("Bundle.entry[1].resource[0].actualPeriod[0]", error.Details["location"]);
    }
    
    [Fact]
    public void MapToValidationError_TypeMismatch_ExtractsDetails()
    {
        // Arrange
        var exceptionMessage = "Cannot convert value 'xyz' to type 'integer'";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("FHIR", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("TYPE_MISMATCH", error.ErrorCode);
        Assert.Contains("type 'integer'", error.Message);
        
        // Check details
        Assert.NotNull(error.Details);
        Assert.Equal("integer", error.Details["expectedType"]);
    }
    
    [Fact]
    public void MapToValidationError_MandatoryMissing_ExtractsDetails()
    {
        // Arrange
        var exceptionMessage = "Mandatory element 'resourceType' is missing";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("FHIR", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("MANDATORY_MISSING", error.ErrorCode);
        Assert.Equal("resourceType", error.Path);
        Assert.Contains("Mandatory element", error.Message);
        Assert.Contains("missing", error.Message);
        
        // Check details
        Assert.NotNull(error.Details);
        Assert.Equal("resourceType", error.Details["missingElement"]);
    }
    
    [Fact]
    public void MapToValidationError_GenericException_ReturnsGenericError()
    {
        // Arrange
        var exceptionMessage = "Some unexpected error occurred";
        var exception = new InvalidOperationException(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("FHIR", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("FHIR_DESERIALIZATION_ERROR", error.ErrorCode);
        Assert.Contains("deserialization failed", error.Message);
        
        // Check details
        Assert.NotNull(error.Details);
        Assert.Equal("InvalidOperationException", error.Details["exceptionType"]);
        Assert.Equal(exceptionMessage, error.Details["fullMessage"]);
    }
    
    [Fact]
    public void MapToValidationError_InvalidPrimitive_Date_ExtractsDetails()
    {
        // Arrange
        var exceptionMessage = "Literal '1960-05-15x' cannot be parsed as a date";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("FHIR", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("FHIR_INVALID_PRIMITIVE", error.ErrorCode);
        Assert.Contains("Invalid date value", error.Message);
        Assert.Contains("1960-05-15x", error.Message);
        
        // Check canonical schema: { actual, expectedType, reason }
        Assert.NotNull(error.Details);
        Assert.Equal("1960-05-15x", error.Details["actual"]);
        Assert.Equal("date", error.Details["expectedType"]);
        Assert.Contains("Cannot parse", error.Details["reason"].ToString());
    }
    
    [Fact]
    public void MapToValidationError_InvalidPrimitive_Boolean_ExtractsDetails()
    {
        // Arrange
        var exceptionMessage = "Literal 'invalid' cannot be parsed as a boolean";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("FHIR", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("FHIR_INVALID_PRIMITIVE", error.ErrorCode);
        Assert.Contains("Invalid boolean value", error.Message);
        Assert.Contains("invalid", error.Message);
        
        // Check canonical schema
        Assert.NotNull(error.Details);
        Assert.Equal("invalid", error.Details["actual"]);
        Assert.Equal("boolean", error.Details["expectedType"]);
        Assert.Contains("Cannot parse", error.Details["reason"].ToString());
    }
    
    [Fact]
    public void MapToValidationError_InvalidPrimitive_Decimal_ExtractsDetails()
    {
        // Arrange
        var exceptionMessage = "Literal 'abc123' cannot be parsed as a decimal";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("FHIR", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("FHIR_INVALID_PRIMITIVE", error.ErrorCode);
        Assert.Contains("Invalid decimal value", error.Message);
        
        // Check canonical schema
        Assert.NotNull(error.Details);
        Assert.Equal("abc123", error.Details["actual"]);
        Assert.Equal("decimal", error.Details["expectedType"]);
    }
}
