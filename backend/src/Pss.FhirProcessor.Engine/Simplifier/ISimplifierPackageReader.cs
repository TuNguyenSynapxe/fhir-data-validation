using Hl7.Fhir.Model;

namespace Pss.FhirProcessor.Engine.Simplifier;

/// <summary>
/// Reads and indexes FHIR resources from Simplifier FHIR packages (.zip format).
/// 
/// Phase 2: R5-only package support
/// - Enforces "fhirVersions": ["5.0.0"]
/// - Rejects non-R5 or mixed-version packages
/// - Indexes StructureDefinition, ValueSet, CodeSystem by canonical URL
/// </summary>
public interface ISimplifierPackageReader
{
    /// <summary>
    /// Reads a Simplifier package from a .zip stream and indexes all conformance resources.
    /// </summary>
    /// <param name="packageStream">Stream containing the .zip package</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Indexed package resources</returns>
    /// <exception cref="InvalidOperationException">
    /// Thrown when:
    /// - package.json is missing or invalid
    /// - fhirVersions is missing or not ["5.0.0"]
    /// - Package contains mixed FHIR versions
    /// </exception>
    Task<SimplifierPackage> ReadPackageAsync(
        Stream packageStream, 
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Represents an indexed Simplifier FHIR package.
/// </summary>
public sealed class SimplifierPackage
{
    /// <summary>
    /// Package name from package.json
    /// </summary>
    public required string Name { get; init; }
    
    /// <summary>
    /// Package version from package.json
    /// </summary>
    public required string Version { get; init; }
    
    /// <summary>
    /// FHIR version(s) declared in package.json
    /// Phase 2: Must be ["5.0.0"]
    /// </summary>
    public required IReadOnlyList<string> FhirVersions { get; init; }
    
    /// <summary>
    /// Package dependencies from package.json
    /// Format: { "package.name": "version" }
    /// </summary>
    public required IReadOnlyDictionary<string, string> Dependencies { get; init; }
    
    /// <summary>
    /// Indexed StructureDefinitions by canonical URL (version suffix stripped)
    /// </summary>
    public required IReadOnlyDictionary<string, StructureDefinition> StructureDefinitions { get; init; }
    
    /// <summary>
    /// Indexed ValueSets by canonical URL (version suffix stripped)
    /// </summary>
    public required IReadOnlyDictionary<string, ValueSet> ValueSets { get; init; }
    
    /// <summary>
    /// Indexed CodeSystems by canonical URL (version suffix stripped)
    /// </summary>
    public required IReadOnlyDictionary<string, CodeSystem> CodeSystems { get; init; }
}
