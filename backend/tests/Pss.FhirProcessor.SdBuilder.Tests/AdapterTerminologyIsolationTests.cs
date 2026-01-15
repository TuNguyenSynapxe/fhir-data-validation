using System.Reflection;
using System.Text;
using FluentAssertions;
using Pss.FhirProcessor.SdBuilder.Adapters.R5;
using Pss.FhirProcessor.Terminology.Abstractions;
using Xunit;

namespace Pss.FhirProcessor.SdBuilder.Tests;

/// <summary>
/// Architectural guardrail tests: Enforces that adapters NEVER hardcode terminology data.
/// These tests ensure single source of truth for ValueSets (Terminology DLL only).
/// </summary>
public sealed class AdapterTerminologyIsolationTests
{
    private static readonly string[] ForbiddenHl7ValueSetUrls = new[]
    {
        "http://hl7.org/fhir/ValueSet/administrative-gender",
        "http://hl7.org/fhir/ValueSet/marital-status",
        "http://hl7.org/fhir/ValueSet/observation-status",
        "http://hl7.org/fhir/ValueSet/observation-category",
        "http://hl7.org/fhir/ValueSet/condition-clinical",
        "http://hl7.org/fhir/ValueSet/condition-ver-status",
        "http://hl7.org/fhir/ValueSet/identifier-use",
        "http://hl7.org/fhir/ValueSet/contact-point-system",
        "http://hl7.org/fhir/ValueSet/address-use",
        "http://hl7.org/fhir/ValueSet/name-use"
    };

    [Fact]
    public void SdFhirR5Adapter_MustNotContainHardcodedHl7ValueSetUrls()
    {
        // ARCHITECTURAL RULE: Adapters must NOT contain hardcoded HL7 ValueSet URLs.
        // All terminology data must come from ITerminologyService (Terminology DLL).
        
        var adapterType = typeof(SdFhirR5Adapter);
        var assemblyPath = adapterType.Assembly.Location;
        
        // Read compiled assembly as binary to scan for string constants
        var dllBytes = File.ReadAllBytes(assemblyPath);
        var dllContent = Encoding.UTF8.GetString(dllBytes);
        
        // Check for forbidden HL7 ValueSet URLs
        var foundUrls = new List<string>();
        foreach (var forbiddenUrl in ForbiddenHl7ValueSetUrls)
        {
            if (dllContent.Contains(forbiddenUrl, StringComparison.Ordinal))
            {
                foundUrls.Add(forbiddenUrl);
            }
        }
        
        foundUrls.Should().BeEmpty(
            "SdFhirR5Adapter must NOT hardcode HL7 ValueSet URLs. " +
            "All ValueSet data must come from ITerminologyService. " +
            "Found forbidden URLs: " + string.Join(", ", foundUrls));
    }

    [Fact]
    public void SdFhirR5Adapter_MustNotContainGenericHl7FhirValueSetPattern()
    {
        // ARCHITECTURAL RULE: Adapters must NOT contain any hl7.org/fhir/ValueSet references.
        
        var adapterType = typeof(SdFhirR5Adapter);
        var assemblyPath = adapterType.Assembly.Location;
        
        // Read compiled assembly to check for generic HL7 ValueSet pattern
        var dllBytes = File.ReadAllBytes(assemblyPath);
        var dllContent = Encoding.UTF8.GetString(dllBytes);
        
        // Check for generic HL7 ValueSet URL pattern (case-sensitive)
        var forbiddenPattern = "hl7.org/fhir/ValueSet";
        
        dllContent.Should().NotContain(forbiddenPattern,
            "SdFhirR5Adapter must NOT contain any 'hl7.org/fhir/ValueSet' references. " +
            "All ValueSet lookup must delegate to ITerminologyService.");
    }

    [Fact]
    public void SdFhirR5Adapter_MustNotHaveInitializeValueSetMethods()
    {
        // ARCHITECTURAL RULE: Adapters must NOT contain initialization methods for ValueSets.
        
        var adapterType = typeof(SdFhirR5Adapter);
        
        var methods = adapterType.GetMethods(
            BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Static | BindingFlags.Instance);
        
        var forbiddenMethodPatterns = new[] 
        { 
            "InitializeKnownValueSets",
            "InitializePreviewRegistry",
            "InitializeValueSets",
            "LoadValueSets",
            "SeedValueSets",
            "HardcodedValueSets"
        };
        
        var forbiddenMethods = methods
            .Where(m => forbiddenMethodPatterns.Any(pattern => 
                m.Name.Contains(pattern, StringComparison.OrdinalIgnoreCase)))
            .Select(m => m.Name)
            .ToList();
        
        forbiddenMethods.Should().BeEmpty(
            "SdFhirR5Adapter must NOT contain ValueSet initialization methods. " +
            "Found forbidden methods: " + string.Join(", ", forbiddenMethods));
    }

    [Fact]
    public void SdFhirR5Adapter_MustInjectITerminologyService()
    {
        // ARCHITECTURAL RULE: Adapters MUST receive ITerminologyService via constructor injection.
        
        var adapterType = typeof(SdFhirR5Adapter);
        var constructors = adapterType.GetConstructors();
        
        constructors.Should().NotBeEmpty("SdFhirR5Adapter must have at least one public constructor");
        
        var primaryConstructor = constructors.First();
        var parameters = primaryConstructor.GetParameters();
        
        parameters.Should().Contain(
            p => p.ParameterType == typeof(ITerminologyService),
            "SdFhirR5Adapter constructor must accept ITerminologyService parameter for DI injection. " +
            "Found parameters: " + string.Join(", ", parameters.Select(p => p.ParameterType.Name)));
    }

    [Fact]
    public void SdFhirR5Adapter_MustNotHaveValueSetFields()
    {
        // ARCHITECTURAL RULE: Adapters must NOT store ValueSet data in fields.
        
        var adapterType = typeof(SdFhirR5Adapter);
        
        var fields = adapterType.GetFields(
            BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Static | BindingFlags.Instance);
        
        var forbiddenFieldPatterns = new[] 
        { 
            "_knownValueSets",
            "_previewByUrl",
            "_valueSetRegistry",
            "_valueSetCache",
            "_hardcodedValueSets"
        };
        
        var forbiddenFields = fields
            .Where(f => forbiddenFieldPatterns.Any(pattern => 
                f.Name.Contains(pattern, StringComparison.OrdinalIgnoreCase)))
            .Select(f => f.Name)
            .ToList();
        
        forbiddenFields.Should().BeEmpty(
            "SdFhirR5Adapter must NOT have fields storing hardcoded ValueSet data. " +
            "Found forbidden fields: " + string.Join(", ", forbiddenFields));
    }

    [Fact]
    public void SdFhirR5Adapter_MustNotContainCodeSystemUrls()
    {
        // ARCHITECTURAL RULE: Adapters must NOT hardcode HL7 CodeSystem URLs either.
        
        var adapterType = typeof(SdFhirR5Adapter);
        var assemblyPath = adapterType.Assembly.Location;
        
        var dllBytes = File.ReadAllBytes(assemblyPath);
        var dllContent = Encoding.UTF8.GetString(dllBytes);
        
        var forbiddenPattern = "hl7.org/fhir/CodeSystem";
        
        dllContent.Should().NotContain(forbiddenPattern,
            "SdFhirR5Adapter must NOT contain 'hl7.org/fhir/CodeSystem' references. " +
            "All CodeSystem lookup must delegate to ITerminologyService.");
    }

    [Fact]
    public void SdFhirR5Adapter_AllPublicMethodsMustBeDelegatingOnly()
    {
        // ARCHITECTURAL RULE: Adapter's ValueSet-related methods must delegate to ITerminologyService.
        // This test verifies adapter doesn't implement terminology logic.
        
        var adapterType = typeof(SdFhirR5Adapter);
        var methods = adapterType.GetMethods(BindingFlags.Public | BindingFlags.Instance);
        
        var valueSetMethods = methods
            .Where(m => 
                m.Name.Contains("ValueSet", StringComparison.OrdinalIgnoreCase) ||
                m.Name.Contains("Search", StringComparison.OrdinalIgnoreCase) ||
                m.Name.Contains("Preview", StringComparison.OrdinalIgnoreCase))
            .ToList();
        
        // If adapter has ValueSet methods, ensure it has ITerminologyService field
        if (valueSetMethods.Any())
        {
            var fields = adapterType.GetFields(BindingFlags.NonPublic | BindingFlags.Instance);
            var hasTerminologyServiceField = fields.Any(f => f.FieldType == typeof(ITerminologyService));
            
            hasTerminologyServiceField.Should().BeTrue(
                "SdFhirR5Adapter has ValueSet-related methods but doesn't store ITerminologyService field. " +
                "Adapter must delegate to ITerminologyService, not implement terminology logic. " +
                "ValueSet methods found: " + string.Join(", ", valueSetMethods.Select(m => m.Name)));
        }
    }
}
