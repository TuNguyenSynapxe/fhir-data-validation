using Hl7.Fhir.Model;
using Pss.FhirProcessor.SdBuilder.Domain;

namespace Pss.FhirProcessor.SdBuilder.Engine;

/// <summary>
/// Imports an existing constraint StructureDefinition into ResourceDesignState.
/// This is a read-only operation that parses differential.element and populates design state.
/// Does NOT perform validation, export, or mutation of inputs.
/// </summary>
public sealed class SdImportEngine
{
    /// <summary>
    /// Imports a constraint StructureDefinition into ResourceDesignState.
    /// </summary>
    /// <param name="baseSd">The base StructureDefinition (core resource like Patient, Observation).</param>
    /// <param name="profileSd">The constraint StructureDefinition with differential.element to import.</param>
    /// <returns>A ResourceDesignState populated from the profile's differential.</returns>
    /// <exception cref="ArgumentNullException">If baseSd or profileSd is null.</exception>
    /// <exception cref="ArgumentException">If profileSd.Derivation is not 'constraint'.</exception>
    /// <remarks>
    /// Import Rules:
    /// - Only processes differential.element (snapshot is ignored)
    /// - Best-effort import: unsupported constraints are skipped, not inferred
    /// - Does not validate correctness of constraints
    /// - Does not mutate input StructureDefinitions
    /// - Deterministic and idempotent
    /// </remarks>
    public ResourceDesignState Import(
        StructureDefinition baseSd,
        StructureDefinition profileSd)
    {
        // Input validation
        ArgumentNullException.ThrowIfNull(baseSd);
        ArgumentNullException.ThrowIfNull(profileSd);

        if (profileSd.Derivation != StructureDefinition.TypeDerivationRule.Constraint)
        {
            throw new ArgumentException(
                $"Profile must be a constraint derivation. Found: {profileSd.Derivation}",
                nameof(profileSd));
        }

        // Step 1: Initialize design state from base SD
        // Read resource type from profile (e.g., "Patient", "Observation")
        var resourceType = profileSd.Type ?? throw new ArgumentException(
            "Profile StructureDefinition must have Type specified",
            nameof(profileSd));

        // Create design state using base SD snapshot with Full visibility mode
        // Note: Metadata (name, title, description) is NOT applied here - handled externally
        var designState = SdDesignInitializer.Create(
            resourceType,
            baseSd,
            VisibilityMode.Full);

        // Step 2: Import cardinality overrides and exclusions from differential.element
        if (profileSd.Differential?.Element != null)
        {
            foreach (var diffElement in profileSd.Differential.Element)
            {
                var elementPath = diffElement.Path;
                if (string.IsNullOrEmpty(elementPath))
                {
                    continue; // Skip malformed elements
                }

                // Find matching element in design state
                var elementDesign = designState.Elements.FirstOrDefault(e => e.Path == elementPath);
                if (elementDesign == null)
                {
                    // Element not in design state - skip (no inference)
                    continue;
                }

                // Check if cardinality is specified in differential
                if (diffElement.Min.HasValue || diffElement.Max != null)
                {
                    var min = diffElement.Min ?? elementDesign.BaseCardinality.Min;
                    var max = diffElement.Max ?? elementDesign.BaseCardinality.Max;

                    // Special case: min=0 AND max=0 means exclusion
                    if (min == 0 && max == "0")
                    {
                        elementDesign.IsIncluded = false;
                        elementDesign.OverrideCardinality = null; // Clear any override
                    }
                    else
                    {
                        // Apply cardinality override
                        elementDesign.OverrideCardinality = new Cardinality(min, max);
                        elementDesign.IsIncluded = true; // Ensure included
                    }
                }

                // Step 3: Import terminology binding if present
                if (diffElement.Binding != null)
                {
                    var fhirStrength = diffElement.Binding.Strength;
                    var valueSetUrl = diffElement.Binding.ValueSet;

                    if (fhirStrength.HasValue && !string.IsNullOrEmpty(valueSetUrl))
                    {
                        // Map FHIR binding strength to domain enum
                        var domainStrength = fhirStrength.Value switch
                        {
                            Hl7.Fhir.Model.BindingStrength.Required => Domain.BindingStrength.Required,
                            Hl7.Fhir.Model.BindingStrength.Extensible => Domain.BindingStrength.Extensible,
                            Hl7.Fhir.Model.BindingStrength.Preferred => Domain.BindingStrength.Preferred,
                            _ => Domain.BindingStrength.Preferred // Default fallback
                        };

                        // Create binding configuration (import as override since it's from differential)
                        elementDesign.OverrideBinding = new BindingConfig
                        {
                            Strength = domainStrength,
                            ValueSetUrl = valueSetUrl
                        };

                        elementDesign.IsIncluded = true; // Ensure included
                    }
                }
            }
        }

        // Step 4: Import slicing configuration and slice roots
        // Need to use a session for slicing operations
        var session = new SdBuilderSession(designState);

        if (profileSd.Differential?.Element != null)
        {
            foreach (var diffElement in profileSd.Differential.Element)
            {
                var elementPath = diffElement.Path;
                if (string.IsNullOrEmpty(elementPath))
                {
                    continue;
                }

                // Step 4a: Detect slicing parent (element with slicing configuration)
                if (diffElement.Slicing != null)
                {
                    var discriminators = new List<SliceDiscriminator>();
                    if (diffElement.Slicing.Discriminator != null)
                    {
                        foreach (var disc in diffElement.Slicing.Discriminator)
                        {
                            var discType = disc.Type switch
                            {
                                ElementDefinition.DiscriminatorType.Value => DiscriminatorType.Value,
                                ElementDefinition.DiscriminatorType.Pattern => DiscriminatorType.Pattern,
                                ElementDefinition.DiscriminatorType.Type => DiscriminatorType.Type,
                                _ => DiscriminatorType.Value // Default fallback
                            };

                            discriminators.Add(new SliceDiscriminator(discType, disc.Path ?? string.Empty));
                        }
                    }

                    var rules = diffElement.Slicing.Rules switch
                    {
                        ElementDefinition.SlicingRules.Closed => Domain.SlicingRules.Closed,
                        _ => Domain.SlicingRules.Open // Default to Open
                    };

                    var ordered = diffElement.Slicing.Ordered ?? false;

                    // Configure slicing on the parent element
                    session.ConfigureSlicing(elementPath, ordered, rules, discriminators);
                }

                // Step 4b: Detect slice roots (element.id format: {path}:{sliceName})
                var elementId = diffElement.ElementId;
                if (!string.IsNullOrEmpty(elementId) && elementId.Contains(':'))
                {
                    // Parse slice name from ElementId
                    var colonIndex = elementId.IndexOf(':');
                    var basePath = elementId.Substring(0, colonIndex);
                    var sliceNamePart = elementId.Substring(colonIndex + 1);

                    // Handle nested paths like "Observation.component:systolic"
                    // The slice name is everything after the colon until the next dot (if any)
                    var dotIndex = sliceNamePart.IndexOf('.');
                    var sliceName = dotIndex >= 0 ? sliceNamePart.Substring(0, dotIndex) : sliceNamePart;

                    // Only process if this is a slice root (no dot in sliceNamePart means it's a root)
                    if (dotIndex < 0 && !string.IsNullOrEmpty(sliceName))
                    {
                        // Add slice
                        session.AddSlice(basePath, sliceName);

                        // Apply slice-level cardinality if specified
                        if (diffElement.Min.HasValue || diffElement.Max != null)
                        {
                            var min = diffElement.Min ?? 0;
                            var max = diffElement.Max ?? "*";
                            session.SetSliceCardinality(basePath, sliceName, new Cardinality(min, max));
                        }

                        // Apply slice-level binding if specified
                        if (diffElement.Binding != null)
                        {
                            var fhirStrength = diffElement.Binding.Strength;
                            var valueSetUrl = diffElement.Binding.ValueSet;

                            if (fhirStrength.HasValue && !string.IsNullOrEmpty(valueSetUrl))
                            {
                                var domainStrength = fhirStrength.Value switch
                                {
                                    Hl7.Fhir.Model.BindingStrength.Required => Domain.BindingStrength.Required,
                                    Hl7.Fhir.Model.BindingStrength.Extensible => Domain.BindingStrength.Extensible,
                                    Hl7.Fhir.Model.BindingStrength.Preferred => Domain.BindingStrength.Preferred,
                                    _ => Domain.BindingStrength.Preferred
                                };

                                session.SetSliceBinding(basePath, sliceName, new BindingConfig
                                {
                                    Strength = domainStrength,
                                    ValueSetUrl = valueSetUrl
                                });
                            }
                        }
                    }
                }
            }

            // Step 5: Import slice child constraints (Phase 2.2)
            foreach (var diffElement in profileSd.Differential.Element)
            {
                var elementId = diffElement.ElementId;
                if (string.IsNullOrEmpty(elementId) || !elementId.Contains(':'))
                {
                    continue; // Not a slice-related element
                }

                // Parse ElementId format: {path}:{sliceName}.{relativePath}
                var colonIndex = elementId.IndexOf(':');
                var basePath = elementId.Substring(0, colonIndex);
                var afterColon = elementId.Substring(colonIndex + 1);

                // Check if this is a slice child (has a dot after the slice name)
                var dotIndex = afterColon.IndexOf('.');
                if (dotIndex < 0)
                {
                    continue; // This is a slice root, not a child element
                }

                var sliceName = afterColon.Substring(0, dotIndex);
                var relativePath = afterColon.Substring(dotIndex + 1);

                if (string.IsNullOrEmpty(sliceName) || string.IsNullOrEmpty(relativePath))
                {
                    continue; // Malformed - skip
                }

                // Check if slice exists - skip if not (no inference)
                var parentElement = designState.Elements.FirstOrDefault(e => e.Path == basePath);
                if (parentElement == null || !parentElement.Slices.ContainsKey(sliceName))
                {
                    continue; // Parent or slice doesn't exist - skip
                }

                // Import cardinality if specified
                if (diffElement.Min.HasValue || diffElement.Max != null)
                {
                    var min = diffElement.Min ?? 0;
                    var max = diffElement.Max ?? "*";
                    session.SetSliceElementCardinality(basePath, sliceName, relativePath, new Cardinality(min, max));
                }

                // Import binding if specified
                if (diffElement.Binding != null)
                {
                    var fhirStrength = diffElement.Binding.Strength;
                    var valueSetUrl = diffElement.Binding.ValueSet;

                    if (fhirStrength.HasValue && !string.IsNullOrEmpty(valueSetUrl))
                    {
                        var domainStrength = fhirStrength.Value switch
                        {
                            Hl7.Fhir.Model.BindingStrength.Required => Domain.BindingStrength.Required,
                            Hl7.Fhir.Model.BindingStrength.Extensible => Domain.BindingStrength.Extensible,
                            Hl7.Fhir.Model.BindingStrength.Preferred => Domain.BindingStrength.Preferred,
                            _ => Domain.BindingStrength.Preferred
                        };

                        session.SetSliceElementBinding(basePath, sliceName, relativePath, new BindingConfig
                        {
                            Strength = domainStrength,
                            ValueSetUrl = valueSetUrl
                        });
                    }
                }

                // Import fixed[x] values (opaque - no evaluation)
                // Note: In ElementDefinition, fixed values use properties like Fixed, FixedString, FixedCode, etc.
                // For now, we'll skip fixed/pattern import as it requires reflection to handle all fixed[x] variants
                // This can be enhanced in the future if needed

                // Import pattern[x] values (opaque - no evaluation)
                // Similar to fixed values, pattern values use properties like Pattern, PatternString, etc.
                // Skipping for now due to complexity of handling all variants
            }
        }

        return designState;
    }
}
