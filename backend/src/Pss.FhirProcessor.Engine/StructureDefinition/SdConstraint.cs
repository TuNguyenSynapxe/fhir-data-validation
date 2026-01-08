namespace Pss.FhirProcessor.Engine.SdValidation;

/// <summary>
/// Phase 2.2: Extracted StructureDefinition constraint.
/// 
/// Pure data model representing a single SD constraint.
/// Created by SdConstraintExtractor.
/// Consumed by constraint validators.
/// 
/// This is NOT a validator - just a data container.
/// </summary>
public sealed class SdConstraint
{
    /// <summary>
    /// FHIRPath element path (e.g., "Bundle.entry", "Patient.name.given")
    /// </summary>
    public string ElementPath { get; }

    /// <summary>
    /// Constraint category
    /// </summary>
    public SdConstraintKind Kind { get; }

    /// <summary>
    /// Expected value or constraint data.
    /// Type varies by Kind:
    /// - Cardinality: (int min, int? max)
    /// - FixedValue: object (FHIR primitive or complex type)
    /// - RequiredBinding: string (ValueSet canonical URL)
    /// - Pattern: object (FHIR element pattern)
    /// - Invariant: (string key, string expression)
    /// </summary>
    public object Expected { get; }

    /// <summary>
    /// Source StructureDefinition canonical URL
    /// Used for error traceability
    /// </summary>
    public string SourceProfile { get; }

    /// <summary>
    /// Human-readable description from SD (optional)
    /// </summary>
    public string? Description { get; }

    public SdConstraint(
        string elementPath,
        SdConstraintKind kind,
        object expected,
        string sourceProfile,
        string? description = null)
    {
        ElementPath = elementPath ?? throw new ArgumentNullException(nameof(elementPath));
        Kind = kind;
        Expected = expected ?? throw new ArgumentNullException(nameof(expected));
        SourceProfile = sourceProfile ?? throw new ArgumentNullException(nameof(sourceProfile));
        Description = description;
    }
}
