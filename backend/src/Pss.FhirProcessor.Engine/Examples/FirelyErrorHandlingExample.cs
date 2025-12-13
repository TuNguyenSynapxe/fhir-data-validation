using System.Text.Json;
using Pss.FhirProcessor.Engine.Services;

namespace Pss.FhirProcessor.Engine.Examples;

/// <summary>
/// Demonstrates the improved Firely exception handling
/// Shows how different error types are now captured with full context
/// </summary>
public class FirelyErrorHandlingExample
{
    /// <summary>
    /// Example 1: Invalid enum value error
    /// Before: "Failed to parse FHIR Bundle - bundle is null or empty"
    /// After: Detailed error with field name, invalid value, and allowed values
    /// </summary>
    public static void ExampleInvalidEnumValue()
    {
        Console.WriteLine("=== Example 1: Invalid Enum Value ===\n");
        
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-1"",
                    ""status"": ""completed"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""AMB""
                    }
                }
            }]
        }";
        
        // Simulate the exception that Firely would throw
        var exception = new Exception("Literal 'completed' is not a valid value for enumeration 'Encounter.StatusCode'");
        
        var error = FirelyExceptionMapper.MapToValidationError(exception, bundleJson);
        
        Console.WriteLine($"Error Code: {error.ErrorCode}");
        Console.WriteLine($"Resource Type: {error.ResourceType}");
        Console.WriteLine($"Field Path: {error.Path}");
        Console.WriteLine($"Message: {error.Message}");
        
        if (error.Details != null)
        {
            Console.WriteLine("\nDetails:");
            Console.WriteLine($"  Actual Value: {error.Details["actualValue"]}");
            Console.WriteLine($"  Enum Type: {error.Details["enumType"]}");
            
            if (error.Details.ContainsKey("allowedValues"))
            {
                var allowed = error.Details["allowedValues"] as List<string>;
                Console.WriteLine($"  Allowed Values: {string.Join(", ", allowed ?? new List<string>())}");
            }
        }
        
        Console.WriteLine("\n" + new string('-', 60) + "\n");
    }
    
    /// <summary>
    /// Example 2: Unknown element error
    /// Before: Generic "INVALID_BUNDLE"
    /// After: Specific field identified as unknown
    /// </summary>
    public static void ExampleUnknownElement()
    {
        Console.WriteLine("=== Example 2: Unknown Element ===\n");
        
        var exception = new Exception("Encountered unknown element 'customField' while parsing resource");
        
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        Console.WriteLine($"Error Code: {error.ErrorCode}");
        Console.WriteLine($"Path: {error.Path}");
        Console.WriteLine($"Message: {error.Message}");
        
        Console.WriteLine("\n" + new string('-', 60) + "\n");
    }
    
    /// <summary>
    /// Example 3: Type mismatch error
    /// Before: Generic parsing error
    /// After: Clear indication of expected vs actual type
    /// </summary>
    public static void ExampleTypeMismatch()
    {
        Console.WriteLine("=== Example 3: Type Mismatch ===\n");
        
        var exception = new Exception("Cannot convert value 'abc' to type 'integer'");
        
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        Console.WriteLine($"Error Code: {error.ErrorCode}");
        Console.WriteLine($"Message: {error.Message}");
        
        if (error.Details != null)
        {
            Console.WriteLine($"Expected Type: {error.Details["expectedType"]}");
        }
        
        Console.WriteLine("\n" + new string('-', 60) + "\n");
    }
    
    /// <summary>
    /// Example 4: Mandatory element missing
    /// Before: Generic error
    /// After: Specific field identified as mandatory
    /// </summary>
    public static void ExampleMandatoryMissing()
    {
        Console.WriteLine("=== Example 4: Mandatory Element Missing ===\n");
        
        var exception = new Exception("Mandatory element 'resourceType' is missing");
        
        var error = FirelyExceptionMapper.MapToValidationError(exception, null);
        
        Console.WriteLine($"Error Code: {error.ErrorCode}");
        Console.WriteLine($"Missing Field: {error.Path}");
        Console.WriteLine($"Message: {error.Message}");
        
        Console.WriteLine("\n" + new string('-', 60) + "\n");
    }
    
    /// <summary>
    /// Runs all examples
    /// </summary>
    public static void RunAllExamples()
    {
        Console.WriteLine("\n" + new string('=', 60));
        Console.WriteLine("FIRELY EXCEPTION HANDLING IMPROVEMENTS");
        Console.WriteLine(new string('=', 60) + "\n");
        
        ExampleInvalidEnumValue();
        ExampleUnknownElement();
        ExampleTypeMismatch();
        ExampleMandatoryMissing();
        
        Console.WriteLine("\n" + new string('=', 60));
        Console.WriteLine("KEY IMPROVEMENTS:");
        Console.WriteLine("- Preserved Firely exception details");
        Console.WriteLine("- Extracted resource type, field path, invalid values");
        Console.WriteLine("- Provided allowed enum values for correction");
        Console.WriteLine("- Enabled JSON pointer navigation to error location");
        Console.WriteLine("- Distinguished between empty bundle, JSON errors, and FHIR errors");
        Console.WriteLine(new string('=', 60) + "\n");
    }
}
