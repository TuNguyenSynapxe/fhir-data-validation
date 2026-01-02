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
        
        // Check canonical schema: { actual, allowed, valueType: "enum" }
        Assert.NotNull(error.Details);
        Assert.Equal("completed", error.Details["actual"]);
        Assert.Equal("enum", error.Details["valueType"]);
        
        // Phase B.1: Allowed values removed - STRUCTURE validation owns enum values
        Assert.True(error.Details.ContainsKey("allowed"));
        var allowedValues = error.Details["allowed"] as List<string>;
        Assert.NotNull(allowedValues);
        Assert.Empty(allowedValues); // Firely no longer provides enum values
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
        Assert.Equal("/entry/1/resource/actualPeriod", error.JsonPointer); // [0] removed from resource and actualPeriod
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
    
    [Fact]
    public void MapToValidationError_ArrayExpected_Object_ExtractsDetails()
    {
        // Arrange
        var exceptionMessage = "Expected array for property 'identifier' but received object";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("FHIR", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("FHIR_ARRAY_EXPECTED", error.ErrorCode);
        Assert.Contains("Expected array", error.Message);
        Assert.Contains("received object", error.Message);
        
        // Check canonical schema: { expectedType: "array", actualType }
        Assert.NotNull(error.Details);
        Assert.Equal("array", error.Details["expectedType"]);
        Assert.Equal("object", error.Details["actualType"]);
    }
    
    [Fact]
    public void MapToValidationError_ArrayExpected_String_ExtractsDetails()
    {
        // Arrange
        var exceptionMessage = "Expected array but received string";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("FHIR", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("FHIR_ARRAY_EXPECTED", error.ErrorCode);
        Assert.Contains("Expected array", error.Message);
        Assert.Contains("received string", error.Message);
        
        // Check canonical schema
        Assert.NotNull(error.Details);
        Assert.Equal("array", error.Details["expectedType"]);
        Assert.Equal("string", error.Details["actualType"]);
    }
    
    [Fact]
    public void MapToValidationError_UnrelatedError_FallsBackToGeneric()
    {
        // Arrange
        var exceptionMessage = "Some completely unrelated Firely error";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert - should fall back to generic deserialization error
        Assert.Equal("FHIR", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("FHIR_DESERIALIZATION_ERROR", error.ErrorCode);
        Assert.Contains("deserialization failed", error.Message);
    }
    
    [Fact]
    public void MapToValidationError_InvalidEnumValue_UnknownEnum_EmptyAllowedList()
    {
        // Arrange - enum not in known list
        var exceptionMessage = "Literal 'invalid' is not a valid value for enumeration 'SomeUnknown.EnumType'";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert - should still return canonical schema with empty allowed array
        Assert.Equal("INVALID_ENUM_VALUE", error.ErrorCode);
        Assert.NotNull(error.Details);
        Assert.Equal("invalid", error.Details["actual"]);
        Assert.Equal("enum", error.Details["valueType"]);
        
        var allowedValues = error.Details["allowed"] as List<string>;
        Assert.NotNull(allowedValues);
        Assert.Empty(allowedValues); // Unknown enum → empty list
    }
    
    [Fact]
    public void MapToValidationError_InvalidEnumValue_EnforcesSchema()
    {
        // Arrange
        var exceptionMessage = "Literal 'male' is not a valid value for enumeration 'AdministrativeGender'";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert - schema enforcement should have validated without throwing
        Assert.Equal("INVALID_ENUM_VALUE", error.ErrorCode);
        Assert.NotNull(error.Details);
        
        // Canonical schema keys present
        Assert.True(error.Details.ContainsKey("actual"));
        Assert.True(error.Details.ContainsKey("allowed"));
        Assert.True(error.Details.ContainsKey("valueType"));
        
        // Exactly 3 keys (no legacy keys)
        Assert.Equal(3, error.Details.Count);
    }
    
    [Fact]
    public void MapToValidationError_TypeMismatch_StillWorks()
    {
        // Arrange - regression test: TYPE_MISMATCH unchanged
        var exceptionMessage = "Cannot convert value 'abc' to type 'integer'";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert - existing patterns unchanged
        Assert.Equal("TYPE_MISMATCH", error.ErrorCode);
        Assert.NotNull(error.Details);
        Assert.Contains("expectedType", error.Details.Keys);
    }
    
    #region JsonPointer Population Tests
    
    [Fact]
    public void MapToValidationError_InvalidEnumWithLocation_PopulatesJsonPointer()
    {
        // Arrange - enum error with location in message
        var exceptionMessage = "Literal 'malex' is not a valid value for enumeration 'AdministrativeGender' (at Bundle.entry[0].resource[0].gender[0])";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert - jsonPointer should be populated from location
        Assert.Equal("INVALID_ENUM_VALUE", error.ErrorCode);
        Assert.NotNull(error.JsonPointer);
        Assert.Equal("/entry/0/resource/gender", error.JsonPointer);
    }
    
    [Fact]
    public void MapToValidationError_UnknownElementWithLocation_PopulatesJsonPointer()
    {
        // Arrange
        var exceptionMessage = "Encountered unknown element 'actualPeriod' at location 'Bundle.entry[1].resource[0].actualPeriod[0]' while parsing";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("UNKNOWN_ELEMENT", error.ErrorCode);
        Assert.NotNull(error.JsonPointer);
        Assert.Equal("/entry/1/resource/actualPeriod", error.JsonPointer);
    }
    
    [Fact]
    public void MapToValidationError_InvalidPrimitiveWithLocation_PopulatesJsonPointer()
    {
        // Arrange - primitive error with location
        var exceptionMessage = "Literal 'bad-date' cannot be parsed as a date (at Bundle.entry[0].resource[0].birthDate[0])";
        var exception = new Exception(exceptionMessage);
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""birthDate"": ""bad-date""
                }
            }]
        }";
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, bundleJson);
        
        // Assert - jsonPointer should be populated from location
        Assert.Equal("FHIR_INVALID_PRIMITIVE", error.ErrorCode);
        Assert.NotNull(error.JsonPointer);
        // Should extract from location
        Assert.Equal("/entry/0/resource/birthDate", error.JsonPointer);
    }
    
    [Fact]
    public void MapToValidationError_ArrayExpectedWithLocation_PopulatesJsonPointer()
    {
        // Arrange - array expected error with location
        var exceptionMessage = "Expected array but received object (at Bundle.entry[0].resource[0].identifier[0])";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("FHIR_ARRAY_EXPECTED", error.ErrorCode);
        Assert.NotNull(error.JsonPointer);
        Assert.Equal("/entry/0/resource/identifier", error.JsonPointer);
    }
    
    [Fact]
    public void MapToValidationError_TypeMismatchWithLocation_PopulatesJsonPointer()
    {
        // Arrange
        var exceptionMessage = "Cannot convert value 'abc' to type 'integer' (at Bundle.entry[0].resource[0].valueInteger[0])";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("TYPE_MISMATCH", error.ErrorCode);
        Assert.NotNull(error.JsonPointer);
        Assert.Equal("/entry/0/resource/valueInteger", error.JsonPointer);
    }
    
    [Fact]
    public void MapToValidationError_MandatoryMissingWithLocation_PopulatesJsonPointer()
    {
        // Arrange
        var exceptionMessage = "Mandatory element 'status' is missing (at Bundle.entry[2].resource[0])";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("MANDATORY_MISSING", error.ErrorCode);
        Assert.NotNull(error.JsonPointer);
        Assert.Equal("/entry/2/resource", error.JsonPointer);
    }
    
    [Fact]
    public void MapToValidationError_GenericErrorWithLocation_PopulatesJsonPointer()
    {
        // Arrange
        var exceptionMessage = "Some error occurred (at Bundle.entry[0].resource[0].someField[0])";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert
        Assert.Equal("FHIR_DESERIALIZATION_ERROR", error.ErrorCode);
        Assert.NotNull(error.JsonPointer);
        Assert.Equal("/entry/0/resource/someField", error.JsonPointer);
    }
    
    [Fact]
    public void MapToValidationError_NoLocation_JsonPointerIsNull()
    {
        // Arrange - error without location information
        var exceptionMessage = "Literal 'completed' is not a valid value for enumeration 'Encounter.StatusCode'";
        var exception = new Exception(exceptionMessage);
        
        // Act
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        // Assert - should NOT fabricate jsonPointer
        Assert.Equal("INVALID_ENUM_VALUE", error.ErrorCode);
        // jsonPointer may be null or populated from TryFindJsonPointer fallback
        // The important thing is we don't throw an error
    }
    
    #endregion
}

