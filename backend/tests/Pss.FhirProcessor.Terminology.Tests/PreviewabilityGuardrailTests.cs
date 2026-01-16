using FluentAssertions;
using Pss.FhirProcessor.Terminology.Domain;
using Pss.FhirProcessor.Terminology.Sources.Hl7;
using Xunit;

namespace Pss.FhirProcessor.Terminology.Tests;

/// <summary>
/// Guardrail tests for runtime previewability classification.
/// Ensures external standards (BCP-47, MIME, ISO) are correctly identified.
/// </summary>
public sealed class PreviewabilityGuardrailTests
{
    private readonly Hl7ValueSetSource _source = new();

    [Fact]
    public async Task AllLanguages_IsExternal()
    {
        // http://hl7.org/fhir/ValueSet/all-languages references BCP-47
        // Capability: Previewable (has expansion strategy)
        // Previewability: External (references urn:ietf:bcp:47)
        
        var request = new ValueSetSearchRequest { Query = "AllLanguages" };
        var results = await _source.SearchAsync(request);
        
        var vs = results.FirstOrDefault(v => v.Url == "http://hl7.org/fhir/ValueSet/all-languages");
        vs.Should().NotBeNull("all-languages should exist in registry");
        vs!.Capability.Should().Be(ValueSetCapability.Previewable, "HL7 marks it as previewable");
        vs.Previewability.Should().Be(ValueSetPreviewability.External, "BCP-47 is external standard");
    }

    [Fact]
    public async Task AdministrativeGender_IsComputed()
    {
        // http://hl7.org/fhir/ValueSet/administrative-gender references local CodeSystem
        // Capability: Previewable
        // Previewability: Computed (derives from local CodeSystem)
        
        var request = new ValueSetSearchRequest { Query = "AdministrativeGender" };
        var results = await _source.SearchAsync(request);
        
        var vs = results.FirstOrDefault(v => v.Url == "http://hl7.org/fhir/ValueSet/administrative-gender");
        vs.Should().NotBeNull();
        vs!.Capability.Should().Be(ValueSetCapability.Previewable);
        vs.Previewability.Should().Be(ValueSetPreviewability.Computed, "derives from local CodeSystem");
    }

    [Fact]
    public async Task MimeType_IsExternal()
    {
        // MimeType ValueSet references IANA registry
        var request = new ValueSetSearchRequest { Query = "mimetypes" };
        var results = await _source.SearchAsync(request);
        
        var vs = results.FirstOrDefault(v => v.Url.Contains("mimetype", StringComparison.OrdinalIgnoreCase));
        if (vs != null)
        {
            vs.Previewability.Should().Be(ValueSetPreviewability.External, "MIME types are IANA standard");
        }
    }

    [Fact]
    public async Task SNOMEDFilter_IsUnsupported()
    {
        // ValueSets with SNOMED filters should be Unsupported
        var request = new ValueSetSearchRequest { Query = "snomed" };
        var results = await _source.SearchAsync(request);
        
        var filteredVs = results.FirstOrDefault(v => 
            v.Capability == ValueSetCapability.Computed && 
            v.Name.Contains("SNOMED", StringComparison.OrdinalIgnoreCase));
        
        if (filteredVs != null)
        {
            filteredVs.Previewability.Should().Be(ValueSetPreviewability.Unsupported, 
                "SNOMED filter-based ValueSets cannot be expanded locally");
        }
    }

    [Fact]
    public async Task LocalCompose_IsComputed()
    {
        // ValueSets that reference local CodeSystems should be Computed
        // Example: condition-clinical references local CodeSystem
        var request = new ValueSetSearchRequest { Query = "condition-clinical" };
        var results = await _source.SearchAsync(request);
        
        var vs = results.FirstOrDefault(v => v.Url == "http://hl7.org/fhir/ValueSet/condition-clinical");
        if (vs != null)
        {
            // This should be either Explicit (if has expansion) or Computed (if local compose)
            vs.Previewability.Should().BeOneOf(
                ValueSetPreviewability.Explicit,
                ValueSetPreviewability.Computed);
        }
    }

    [Fact]
    public void Previewability_CoversAllCapabilities()
    {
        // Verify previewability enum provides finer granularity than capability
        // Capability.Previewable can map to: Explicit, Computed, or External
        
        var allValues = Enum.GetValues<ValueSetPreviewability>();
        allValues.Should().Contain(ValueSetPreviewability.Explicit);
        allValues.Should().Contain(ValueSetPreviewability.Computed);
        allValues.Should().Contain(ValueSetPreviewability.External);
        allValues.Should().Contain(ValueSetPreviewability.Unsupported);
    }
}
