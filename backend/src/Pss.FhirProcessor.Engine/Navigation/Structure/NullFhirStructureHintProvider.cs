namespace Pss.FhirProcessor.Engine.Navigation.Structure;

/// <summary>
/// DLL-SAFE: Default structural hint provider.
/// Makes no assumptions; forces explicit navigation.
/// 
/// This is the default implementation for runtime scenarios where
/// structural hints are not available or needed.
/// </summary>
public sealed class NullFhirStructureHintProvider : IFhirStructureHintProvider
{
    /// <summary>
    /// Returns false for all properties (no repeating assumptions).
    /// </summary>
    public bool IsRepeating(string resourceType, string propertyPath) => false;

    /// <summary>
    /// Returns false for all properties (no reference assumptions).
    /// </summary>
    public bool IsReference(string resourceType, string propertyPath) => false;
}
