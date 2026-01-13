namespace Pss.FhirProcessor.SdBuilder.Engine;

using Pss.FhirProcessor.SdBuilder.Abstractions;
using Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Pre-export validation for StructureDefinition design state.
/// Performs design-time consistency checks only (NOT instance validation).
/// </summary>
public static class SdDesignValidator
{
    /// <summary>
    /// Validates a ResourceDesignState for authoring consistency.
    /// </summary>
    /// <param name="design">The design state to validate.</param>
    /// <param name="sdRepo">StructureDefinition repository for extension resolution.</param>
    /// <param name="terminology">Terminology registry for ValueSet resolution.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Validation result with errors and warnings.</returns>
    public static async Task<SdValidationResult> ValidateAsync(
        ResourceDesignState design,
        IStructureDefinitionRepository sdRepo,
        ITerminologyRegistry terminology,
        CancellationToken ct)
    {
        if (design == null) throw new ArgumentNullException(nameof(design));
        if (sdRepo == null) throw new ArgumentNullException(nameof(sdRepo));
        if (terminology == null) throw new ArgumentNullException(nameof(terminology));

        var result = new SdValidationResult();

        foreach (var element in design.Elements)
        {
            // Rule 1: Required Element Protection
            ValidateRequiredElementProtection(element, result);

            // Rule 2: Cardinality Override Validity
            ValidateCardinalityOverride(element, result);

            // Rule 3: Binding Eligibility
            ValidateBindingEligibility(element, result);

            // Rule 4: ValueSet Resolution
            if (element.Binding != null)
            {
                await ValidateValueSetResolution(element, terminology, result, ct);
            }

            // Rule 5: Extension Resolution
            foreach (var extension in element.Extensions)
            {
                await ValidateExtensionResolution(element, extension, sdRepo, result, ct);
            }

            // Rule 6: Warnings
            GenerateWarnings(element, result);
        }

        return result;
    }

    private static void ValidateRequiredElementProtection(ElementDesignState element, SdValidationResult result)
    {
        // If base requires element (min >= 1) and it's excluded, error
        if (element.BaseCardinality.Min >= 1 && !element.IsIncluded)
        {
            result.AddError(
                "REQUIRED_CANNOT_EXCLUDE",
                $"Required element cannot be excluded (base cardinality {element.BaseCardinality})",
                element.Path);
        }
    }

    private static void ValidateCardinalityOverride(ElementDesignState element, SdValidationResult result)
    {
        if (element.OverrideCardinality == null) return;

        var baseMin = element.BaseCardinality.Min;
        var baseMax = element.BaseCardinality.Max;
        var overrideMin = element.OverrideCardinality.Min;
        var overrideMax = element.OverrideCardinality.Max;

        // Check min constraint: override min cannot be less than base min if base min >= 1
        if (baseMin >= 1 && overrideMin < baseMin)
        {
            result.AddError(
                "CARDINALITY_MIN_TOO_LOW",
                $"Override min ({overrideMin}) cannot be less than base min ({baseMin})",
                element.Path);
        }

        // Check max constraint: override max cannot exceed base max
        if (baseMax != "*" && overrideMax == "*")
        {
            result.AddError(
                "CARDINALITY_MAX_TOO_HIGH",
                $"Override max (*) cannot exceed base max ({baseMax})",
                element.Path);
        }
        else if (baseMax != "*" && overrideMax != "*")
        {
            if (int.TryParse(baseMax, out var baseMaxInt) && int.TryParse(overrideMax, out var overrideMaxInt))
            {
                if (overrideMaxInt > baseMaxInt)
                {
                    result.AddError(
                        "CARDINALITY_MAX_TOO_HIGH",
                        $"Override max ({overrideMax}) cannot exceed base max ({baseMax})",
                        element.Path);
                }
            }
        }
    }

    private static void ValidateBindingEligibility(ElementDesignState element, SdValidationResult result)
    {
        if (element.Binding == null) return;

        // Binding only allowed for coded types
        var allowedTypes = new[] { "code", "Coding", "CodeableConcept" };
        if (!allowedTypes.Contains(element.BaseTypeCode))
        {
            result.AddError(
                "BINDING_INVALID_TYPE",
                $"Binding not allowed for type '{element.BaseTypeCode}'. Only code, Coding, or CodeableConcept are permitted.",
                element.Path);
        }
    }

    private static async Task ValidateValueSetResolution(
        ElementDesignState element,
        ITerminologyRegistry terminology,
        SdValidationResult result,
        CancellationToken ct)
    {
        var valueSetUrl = element.Binding!.ValueSetUrl;
        var exists = await terminology.ValueSetExistsAsync(valueSetUrl, ct);

        if (!exists)
        {
            result.AddError(
                "VALUESET_NOT_FOUND",
                $"ValueSet not found: {valueSetUrl}",
                element.Path);
        }
    }

    private static async Task ValidateExtensionResolution(
        ElementDesignState element,
        ExtensionConfig extension,
        IStructureDefinitionRepository sdRepo,
        SdValidationResult result,
        CancellationToken ct)
    {
        var extensionSd = await sdRepo.FindByUrlAsync(extension.Url, ct);

        if (extensionSd == null)
        {
            result.AddError(
                "EXTENSION_NOT_FOUND",
                $"Extension StructureDefinition not found: {extension.Url}",
                element.Path);
        }
    }

    private static void GenerateWarnings(ElementDesignState element, SdValidationResult result)
    {
        // Warning: Preferred binding strength
        if (element.Binding != null && element.Binding.Strength == BindingStrength.Preferred)
        {
            result.AddWarning(
                "BINDING_PREFERRED",
                "Preferred binding strength may allow non-conformant codes",
                element.Path);
        }

        // Warning: Tightened cardinality (e.g. 0..* → 1..1)
        if (element.OverrideCardinality != null)
        {
            var baseMin = element.BaseCardinality.Min;
            var overrideMin = element.OverrideCardinality.Min;

            if (overrideMin > baseMin)
            {
                result.AddWarning(
                    "CARDINALITY_TIGHTENED",
                    $"Cardinality tightened from {element.BaseCardinality} to {element.OverrideCardinality}",
                    element.Path);
            }
        }
    }
}
