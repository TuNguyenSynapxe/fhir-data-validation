using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Hl7.Fhir.Introspection;
using Hl7.Fhir.Specification;

namespace Pss.FhirProcessor.Engine.Firely;

/// <summary>
/// Context object containing Firely R5 spec metadata for validation.
/// 
/// Phase 2.1: Firely is a spec provider, NOT a validator.
/// This context provides:
/// - Parsed R5 Bundle POCO
/// - Resource resolver (for StructureDefinitions, etc.)
/// - Model inspector (for POCO introspection)
/// 
/// Validation decisions remain in the validation pipeline.
/// </summary>
public sealed class FirelyValidationContext
{
    /// <summary>
    /// Parsed R5 Bundle POCO
    /// </summary>
    public Bundle Bundle { get; }
    
    /// <summary>
    /// Resource resolver for StructureDefinitions, ValueSets, CodeSystems
    /// </summary>
    public IResourceResolver Resolver { get; }
    
    /// <summary>
    /// Model inspector for POCO introspection and FHIRPath evaluation
    /// </summary>
    public ModelInspector ModelInspector { get; }

    public FirelyValidationContext(
        Bundle bundle,
        IResourceResolver resolver,
        ModelInspector modelInspector)
    {
        Bundle = bundle ?? throw new ArgumentNullException(nameof(bundle));
        Resolver = resolver ?? throw new ArgumentNullException(nameof(resolver));
        ModelInspector = modelInspector ?? throw new ArgumentNullException(nameof(modelInspector));
    }
}
