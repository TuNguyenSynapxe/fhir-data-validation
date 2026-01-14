namespace Pss.FhirProcessor.SdBuilder.Engine;

using Pss.FhirProcessor.SdBuilder.Abstractions;
using Pss.FhirProcessor.SdBuilder.Domain;
using Hl7.Fhir.Model;
using Task = System.Threading.Tasks.Task;
using DomainBindingStrength = Pss.FhirProcessor.SdBuilder.Domain.BindingStrength;

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

        // Phase 2.2: Load base SD once for slice child constraint validation
        StructureDefinition? baseSd = null;
        if (!string.IsNullOrEmpty(design.BaseCanonicalUrl))
        {
            baseSd = await sdRepo.FindByUrlAsync(design.BaseCanonicalUrl, ct) as StructureDefinition;
        }

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

            // Rule 6: Slicing Validation
            ValidateSlicing(element, design, result);

            // Rule 7: Slice Child Constraint Validation (Phase 2.2)
            ValidateSliceChildConstraints(element, baseSd, result);

            // Rule 8: Warnings
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
        if (element.Binding != null)
        {
            var valueSetUrl = element.Binding.ValueSetUrl;
            var exists = await terminology.ValueSetExistsAsync(valueSetUrl, ct);

            if (!exists)
            {
                result.AddError(
                    "VALUESET_NOT_FOUND",
                    $"ValueSet not found: {valueSetUrl}",
                    element.Path);
            }
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
        if (element.Binding != null && element.Binding.Strength == DomainBindingStrength.Preferred)
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

        // Warning: Closed slicing with no slices
        if (element.Slicing != null && 
            element.Slicing.Rules == SlicingRules.Closed && 
            element.Slices.Count == 0)
        {
            result.AddWarning(
                "SLICING_CLOSED_NO_SLICES",
                "Closed slicing defined but no slices exist. This may be overly restrictive.",
                element.Path);
        }
    }

    private static void ValidateSlicing(ElementDesignState element, ResourceDesignState design, SdValidationResult result)
    {
        // Error: Slicing without discriminator
        if (element.Slicing != null && element.Slicing.Discriminators.Count == 0)
        {
            result.AddError(
                "SLICING_NO_DISCRIMINATOR",
                "Slicing requires at least one discriminator",
                element.Path);
        }

        // Error: Slices defined but no slicing configuration
        if (element.Slices.Count > 0 && element.Slicing == null)
        {
            result.AddError(
                "SLICING_SLICE_WITHOUT_SLICING",
                "Slices are defined but slicing configuration is missing",
                element.Path);
        }

        // Validate each slice
        foreach (var (sliceName, slice) in element.Slices)
        {
            // Error: Empty slice name
            if (string.IsNullOrWhiteSpace(sliceName))
            {
                result.AddError(
                    "SLICING_EMPTY_SLICE_NAME",
                    "Slice name cannot be empty or whitespace",
                    element.Path);
            }
        }

        // Error: Duplicate slice names (case-sensitive)
        var sliceNames = element.Slices.Keys.ToList();
        var duplicates = sliceNames.GroupBy(n => n).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
        
        foreach (var duplicate in duplicates)
        {
            result.AddError(
                "SLICING_DUPLICATE_SLICE_NAME",
                $"Duplicate slice name: {duplicate}",
                element.Path);
        }

        // Error: Discriminator path references unknown element
        if (element.Slicing != null)
        {
            foreach (var discriminator in element.Slicing.Discriminators)
            {
                // Simple check: verify discriminator path isn't completely invalid
                // Full path resolution would require base SD traversal (forbidden)
                // We only check for obvious errors like empty path
                if (string.IsNullOrWhiteSpace(discriminator.Path))
                {
                    result.AddError(
                        "SLICING_UNKNOWN_PATH",
                        "Discriminator path cannot be empty or whitespace",
                        element.Path);
                }
            }
        }
    }

    // ============================================
    // Phase 2.2: Slice Child Constraint Validation
    // ============================================

    private static void ValidateSliceChildConstraints(ElementDesignState element, StructureDefinition? baseSd, SdValidationResult result)
    {
        // Collect all child constraints from all slices
        foreach (var (sliceName, slice) in element.Slices)
        {
            foreach (var constraint in slice.ChildConstraints)
            {
                // ERROR: Child constraint without slicing config
                if (element.Slicing == null)
                {
                    result.AddError(
                        "SLICE_CHILD_WITHOUT_SLICING",
                        $"Slice child constraint exists but parent element is not sliced: {sliceName}.{constraint.ElementPath}",
                        element.Path);
                    continue;
                }

                // ERROR: Slice name mismatch
                if (constraint.SliceName != sliceName)
                {
                    result.AddError(
                        "SLICE_CHILD_WITHOUT_SLICE",
                        $"Slice child constraint references non-existent slice: {constraint.SliceName}",
                        element.Path);
                }

                // ERROR: Empty relative path
                if (string.IsNullOrWhiteSpace(constraint.ElementPath))
                {
                    result.AddError(
                        "SLICE_CHILD_PATH_NOT_FOUND",
                        "Slice child constraint has empty relative path",
                        element.Path);
                }

                // ERROR: Duplicate child constraints (same relative path)
                var duplicates = slice.ChildConstraints
                    .Where(c => c.ElementPath == constraint.ElementPath)
                    .ToList();
                
                if (duplicates.Count > 1)
                {
                    result.AddError(
                        "DUPLICATE_SLICE_CHILD",
                        $"Duplicate child constraint for {sliceName}.{constraint.ElementPath}",
                        element.Path);
                }

                // Phase 2.2: Base SD validation rules
                if (baseSd?.Snapshot?.Element != null)
                {
                    var fullPath = $"{element.Path}.{constraint.ElementPath}";
                    var baseElement = baseSd.Snapshot.Element.FirstOrDefault(e => e.Path == fullPath);

                    if (baseElement != null)
                    {
                        // ERROR: Invalid type for binding
                        if (constraint.Binding != null)
                        {
                            var allowedTypes = new[] { "code", "Coding", "CodeableConcept" };
                            var elementType = baseElement.Type?.FirstOrDefault()?.Code;

                            if (elementType == null || !allowedTypes.Contains(elementType))
                            {
                                result.AddError(
                                    "SLICE_CHILD_INVALID_TYPE_FOR_BINDING",
                                    $"Cannot apply binding to slice child element {sliceName}.{constraint.ElementPath}: element type is '{elementType ?? "unknown"}', must be code|Coding|CodeableConcept",
                                    element.Path);
                            }
                        }

                        // WARNING: Cardinality tightened
                        if (constraint.CardinalityOverride != null)
                        {
                            var baseMin = baseElement.Min ?? 0;
                            var baseMax = baseElement.Max ?? "*";
                            var overrideMin = constraint.CardinalityOverride.Min;
                            var overrideMax = constraint.CardinalityOverride.Max;

                            var minTightened = overrideMin > baseMin;
                            var maxTightened = (overrideMax != "*" && baseMax != "*" && int.Parse(overrideMax) < int.Parse(baseMax)) ||
                                              (overrideMax != "*" && baseMax == "*");

                            if (minTightened || maxTightened)
                            {
                                result.AddWarning(
                                    "SLICE_CHILD_CARDINALITY_TIGHTENED",
                                    $"Slice child element {sliceName}.{constraint.ElementPath} tightens base cardinality from {baseMin}..{baseMax} to {overrideMin}..{overrideMax}",
                                    element.Path);
                            }
                        }
                    }
                }
            }
        }
    }
}
