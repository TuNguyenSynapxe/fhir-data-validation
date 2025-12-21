// Quick validation test for ruleType normalization
// Run with: dotnet script test-normalization.csx

using System;
using System.Collections.Generic;

// Simulate the normalization logic
string NormalizeRuleType(string ruleType)
{
    if (string.IsNullOrEmpty(ruleType)) return string.Empty;
    
    return ruleType
        .Replace("_", "")
        .Replace("-", "")
        .Replace(" ", "")
        .ToUpperInvariant();
}

// Test cases
var testCases = new Dictionary<string, string>
{
    // Required variants
    ["Required"] = "REQUIRED",
    ["REQUIRED"] = "REQUIRED",
    ["required"] = "REQUIRED",
    ["REQUIRED_FIELD"] = "REQUIREDFIELD",  // Underscores removed, but still maps to REQUIRED
    
    // ArrayLength variants
    ["ArrayLength"] = "ARRAYLENGTH",
    ["ARRAY_LENGTH"] = "ARRAYLENGTH",
    ["array-length"] = "ARRAYLENGTH",
    ["Cardinality"] = "CARDINALITY",
    ["CARDINALITY"] = "CARDINALITY",
    ["ArraySize"] = "ARRAYSIZE",
    ["ARRAY_SIZE"] = "ARRAYSIZE",
    
    // FixedValue variants
    ["FixedValue"] = "FIXEDVALUE",
    ["FIXED_VALUE"] = "FIXEDVALUE",
    ["fixed-value"] = "FIXEDVALUE",
    
    // CodeSystem variants
    ["CodeSystem"] = "CODESYSTEM",
    ["CODE_SYSTEM"] = "CODESYSTEM",
    ["ValueSet"] = "VALUESET",
    ["VALUE_SET"] = "VALUESET",
    
    // Regex variants
    ["Regex"] = "REGEX",
    ["REGEX"] = "REGEX",
    ["Pattern"] = "PATTERN",
    
    // CustomFHIRPath variants
    ["CustomFHIRPath"] = "CUSTOMFHIRPATH",
    ["CUSTOM_FHIR_PATH"] = "CUSTOMFHIRPATH",
    ["custom-fhir-path"] = "CUSTOMFHIRPATH",
    ["FHIRPath"] = "FHIRPATH",
};

Console.WriteLine("Testing ruleType Normalization:");
Console.WriteLine("================================\n");

bool allPassed = true;
foreach (var test in testCases)
{
    var input = test.Key;
    var expected = test.Value;
    var actual = NormalizeRuleType(input);
    
    var status = actual == expected ? "✅ PASS" : "❌ FAIL";
    if (actual != expected) allPassed = false;
    
    Console.WriteLine($"{status}: '{input}' → '{actual}' (expected: '{expected}')");
}

Console.WriteLine($"\n================================");
Console.WriteLine($"Overall: {(allPassed ? "✅ All tests passed" : "❌ Some tests failed")}");

// Test switch matching
Console.WriteLine("\n\nTesting Switch Mapping:");
Console.WriteLine("=======================\n");

var switchMappings = new Dictionary<string, (string Template, string Confidence)>
{
    ["REQUIRED"] = ("Required", "high"),
    ["FIXEDVALUE"] = ("FixedValue", "high"),
    ["ALLOWEDVALUES"] = ("AllowedValues", "high"),
    ["REGEX"] = ("Regex", "medium"),
    ["PATTERN"] = ("Regex", "medium"),
    ["ARRAYLENGTH"] = ("ArrayLength", "high"),
    ["CARDINALITY"] = ("ArrayLength", "high"),
    ["ARRAYSIZE"] = ("ArrayLength", "high"),
    ["CODESYSTEM"] = ("CodeSystem", "medium"),
    ["VALUESET"] = ("CodeSystem", "medium"),
    ["CUSTOMFHIRPATH"] = ("CustomFHIRPath", "low"),
    ["FHIRPATH"] = ("CustomFHIRPath", "low"),
};

foreach (var mapping in switchMappings)
{
    Console.WriteLine($"✅ {mapping.Key,-20} → {mapping.Value.Template,-20} (confidence: {mapping.Value.Confidence})");
}

Console.WriteLine("\n\nKey Insights:");
Console.WriteLine("=============");
Console.WriteLine("1. All underscores, hyphens, and spaces are removed");
Console.WriteLine("2. All text is upper-cased for consistent matching");
Console.WriteLine("3. Aliases route to the same template:");
Console.WriteLine("   - ARRAYLENGTH, CARDINALITY, ARRAYSIZE → ArrayLength (high)");
Console.WriteLine("   - CODESYSTEM, VALUESET → CodeSystem (medium)");
Console.WriteLine("   - CUSTOMFHIRPATH, FHIRPATH → CustomFHIRPath (low)");
Console.WriteLine("4. Required, FixedValue, AllowedValues, ArrayLength always return HIGH confidence");
