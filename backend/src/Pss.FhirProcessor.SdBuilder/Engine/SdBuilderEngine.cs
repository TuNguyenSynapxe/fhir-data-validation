namespace Pss.FhirProcessor.SdBuilder.Engine;

using Hl7.Fhir.Model;
using Pss.FhirProcessor.SdBuilder.Abstractions;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Export;

/// <summary>
/// Orchestration facade for SD Builder workflow.
/// NO business logic - wires components only.
/// </summary>
public sealed class SdBuilderEngine
{
    private readonly IStructureDefinitionRepository _sdRepository;
    private readonly ITerminologyRegistry _terminology;

    public SdBuilderEngine(
        IStructureDefinitionRepository sdRepository,
        ITerminologyRegistry terminology)
    {
        _sdRepository = sdRepository ?? throw new ArgumentNullException(nameof(sdRepository));
        _terminology = terminology ?? throw new ArgumentNullException(nameof(terminology));
    }

    /// <summary>
    /// Starts a new SD Builder session.
    /// </summary>
    /// <param name="resourceType">Resource type (e.g., "Patient").</param>
    /// <param name="startMode">Minimal or Full initialization mode.</param>
    /// <param name="templateId">Optional template ID to apply.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Initialized session with design state.</returns>
    public async Task<SdBuilderSession> StartAsync(
        string resourceType,
        VisibilityMode startMode,
        string? templateId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(resourceType))
            throw new ArgumentException("Resource type cannot be empty.", nameof(resourceType));

        // Load base StructureDefinition
        var baseUrl = $"http://hl7.org/fhir/StructureDefinition/{resourceType}";
        var baseSdObj = await _sdRepository.FindByUrlAsync(baseUrl, ct);
        
        if (baseSdObj == null)
            throw new InvalidOperationException($"Base StructureDefinition not found: {baseUrl}");

        var baseSd = baseSdObj as StructureDefinition
            ?? throw new InvalidOperationException("Repository did not return a StructureDefinition.");

        // Require snapshot.element
        if (baseSd.Snapshot?.Element == null || baseSd.Snapshot.Element.Count == 0)
            throw new InvalidOperationException($"Base StructureDefinition {baseUrl} must have snapshot.element.");

        // Initialize design state
        var design = SdDesignInitializer.Create(resourceType, baseSd, startMode);

        // Apply template if provided
        if (!string.IsNullOrWhiteSpace(templateId))
        {
            // Template application would go here
            // For now, this is a placeholder for future template support
            // Templates would mutate the design state before returning the session
        }

        // Return session
        return new SdBuilderSession(design);
    }

    /// <summary>
    /// Validates a design state.
    /// </summary>
    /// <param name="design">Design state to validate.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Validation result with errors and warnings.</returns>
    public async Task<SdValidationResult> ValidateAsync(
        ResourceDesignState design,
        CancellationToken ct)
    {
        if (design == null) throw new ArgumentNullException(nameof(design));

        return await SdDesignValidator.ValidateAsync(design, _sdRepository, _terminology, ct);
    }

    /// <summary>
    /// Exports a StructureDefinition from design state.
    /// Blocks if validation errors exist.
    /// </summary>
    /// <param name="design">Design state to export.</param>
    /// <param name="metadata">Metadata for the exported StructureDefinition.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Exported StructureDefinition with differential only.</returns>
    /// <exception cref="InvalidOperationException">Thrown if validation errors exist.</exception>
    public async Task<StructureDefinition> ExportAsync(
        ResourceDesignState design,
        SdMetadata metadata,
        CancellationToken ct)
    {
        if (design == null) throw new ArgumentNullException(nameof(design));
        if (metadata == null) throw new ArgumentNullException(nameof(metadata));

        // Validate first
        var validationResult = await ValidateAsync(design, ct);

        // Block export on validation errors
        if (validationResult.HasErrors)
        {
            var errorMessages = string.Join("; ", validationResult.Issues
                .Where(i => i.Severity == SdValidationSeverity.Error)
                .Select(i => $"{i.Code}: {i.Message}"));
            
            throw new InvalidOperationException(
                $"Cannot export StructureDefinition with validation errors: {errorMessages}");
        }

        // Load base StructureDefinition again (NO caching)
        var baseUrl = design.BaseCanonicalUrl;
        var baseSdObj = await _sdRepository.FindByUrlAsync(baseUrl, ct);
        
        if (baseSdObj == null)
            throw new InvalidOperationException($"Base StructureDefinition not found: {baseUrl}");

        var baseSd = baseSdObj as StructureDefinition
            ?? throw new InvalidOperationException("Repository did not return a StructureDefinition.");

        // Export differential only
        return SdExporter.Export(design, baseSd, metadata);
    }
}
