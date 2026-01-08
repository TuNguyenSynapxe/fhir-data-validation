using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Hl7.Fhir.Specification.Source;
using Hl7.Fhir.Specification.Snapshot;
using Hl7.Fhir.Introspection;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Simplifier;

namespace Pss.FhirProcessor.Engine.Firely;

/// <summary>
/// FHIR R5 spec provider using Firely SDK R5.
/// 
/// Phase 2.1: Firely is a SPEC PROVIDER, NOT A VALIDATOR.
/// This service:
/// - Parses R5 Bundle JSON to POCOs
/// - Loads StructureDefinitions via resolver
/// - Generates snapshots when needed
/// - Builds FirelyValidationContext for validation pipeline
/// 
/// Validation decisions remain in ValidationPipeline layers.
/// NO Validator.Validate() calls.
/// NO legacy validation packages.
/// </summary>
public class FirelyR5ValidationService : IFirelyValidationService
{
    private readonly ILogger<FirelyR5ValidationService> _logger;
    private readonly ISimplifierPackageReader _packageReader;
    private readonly ILoggerFactory _loggerFactory;

    public FirelyR5ValidationService(
        ILogger<FirelyR5ValidationService> logger,
        ISimplifierPackageReader packageReader,
        ILoggerFactory loggerFactory)
    {
        _logger = logger;
        _packageReader = packageReader;
        _loggerFactory = loggerFactory;
    }

    /// <summary>
    /// Builds Firely validation context for R5 Bundle.
    /// 
    /// Phase 2.1: Context building, NOT validation.
    /// Returns OperationOutcome for backward compatibility with IFirelyValidationService,
    /// but actual validation happens in ValidationPipeline layers.
    /// 
    /// This method:
    /// 1. Parses Bundle JSON
    /// 2. Builds resolver (package + core R5)
    /// 3. Generates snapshots
    /// 4. Performs basic structural checks (Bundle.type required, etc.)
    /// 
    /// Semantic validation is delegated to pipeline validators.
    /// </summary>
    public async Task<OperationOutcome> ValidateAsync(
        string bundleJson,
        string fhirVersion,
        string? bundleProfileStructureDefinitionJson = null,
        string? bundleProfileCanonicalUrl = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation(
                "Building Firely R5 context for {Length} chars of JSON, profile: {Profile}",
                bundleJson?.Length ?? 0,
                bundleProfileCanonicalUrl ?? "(none)");

            // Step 1: Parse Bundle JSON to R5 POCO
            Bundle bundle;
            try
            {
                var parser = new FhirJsonParser();
                bundle = parser.Parse<Bundle>(bundleJson);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse R5 Bundle JSON");
                return new OperationOutcome
                {
                    Issue = new List<OperationOutcome.IssueComponent>
                    {
                        new OperationOutcome.IssueComponent
                        {
                            Severity = OperationOutcome.IssueSeverity.Error,
                            Code = OperationOutcome.IssueType.Structure,
                            Diagnostics = $"Invalid R5 JSON format: {ex.Message}"
                        }
                    }
                };
            }

            // Step 2: Build resource resolver (package + core R5)
            SimplifierPackage? package = null;
            if (!string.IsNullOrWhiteSpace(bundleProfileStructureDefinitionJson))
            {
                package = await ParseInlineProfileAsPackageAsync(
                    bundleProfileStructureDefinitionJson, 
                    cancellationToken);
            }

            var coreResolver = ZipSource.CreateValidationSource();
            var compositeLogger = _loggerFactory.CreateLogger<CompositeResourceResolver>();
            var resolver = new CompositeResourceResolver(
                package, 
                coreResolver, 
                compositeLogger);

            // Step 3: Validate profile exists if requested
            if (!string.IsNullOrWhiteSpace(bundleProfileCanonicalUrl))
            {
                var profile = resolver.ResolveByCanonicalUri(bundleProfileCanonicalUrl);
                if (profile == null)
                {
                    return new OperationOutcome
                    {
                        Issue = new List<OperationOutcome.IssueComponent>
                        {
                            new OperationOutcome.IssueComponent
                            {
                                Severity = OperationOutcome.IssueSeverity.Error,
                                Code = OperationOutcome.IssueType.NotFound,
                                Diagnostics = $"Bundle profile '{bundleProfileCanonicalUrl}' not found in resolver. " +
                                             "Ensure the profile is included in the Simplifier package or core R5 spec."
                            }
                        }
                    };
                }

                if (profile is not StructureDefinition)
                {
                    return new OperationOutcome
                    {
                        Issue = new List<OperationOutcome.IssueComponent>
                        {
                            new OperationOutcome.IssueComponent
                            {
                                Severity = OperationOutcome.IssueSeverity.Error,
                                Code = OperationOutcome.IssueType.Invalid,
                                Diagnostics = $"Resolved resource '{bundleProfileCanonicalUrl}' is not a StructureDefinition (found: {profile.TypeName})"
                            }
                        }
                    };
                }

                // Inject profile into Bundle.Meta.Profile
                bundle.Meta ??= new Meta();
                bundle.Meta.Profile ??= new List<string>();
                var profileList = bundle.Meta.Profile as List<string> ?? bundle.Meta.Profile.ToList();
                if (!profileList.Contains(bundleProfileCanonicalUrl))
                {
                    profileList.Add(bundleProfileCanonicalUrl);
                    bundle.Meta.Profile = profileList;
                    _logger.LogInformation("Injected profile into Bundle.Meta.Profile: {Profile}", bundleProfileCanonicalUrl);
                }
            }

            // Step 4: Generate snapshots explicitly (Phase 2.1 requirement)
            if (package != null)
            {
                await EnsureSnapshotsExplicitlyAsync(package, resolver, cancellationToken);
            }

            // Step 5: Basic structural checks (Phase 2.1: minimal, explicit)
            // Full semantic validation happens in ValidationPipeline layers
            var outcome = PerformBasicStructuralChecks(bundle);

            _logger.LogInformation(
                "Firely R5 context built successfully: {IssueCount} structural issues",
                outcome.Issue.Count);

            return outcome;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error building Firely R5 context");
            return new OperationOutcome
            {
                Issue = new List<OperationOutcome.IssueComponent>
                {
                    new OperationOutcome.IssueComponent
                    {
                        Severity = OperationOutcome.IssueSeverity.Fatal,
                        Code = OperationOutcome.IssueType.Exception,
                        Diagnostics = $"Context build exception: {ex.Message}"
                    }
                }
            };
        }
    }

    /// <summary>
    /// Builds Firely validation context.
    /// 
    /// Phase 2.1: Explicit context builder for validation pipeline.
    /// Provides Bundle, Resolver, ModelInspector for downstream validators.
    /// </summary>
    public async Task<FirelyValidationContext> BuildContextAsync(
        string bundleJson,
        IEnumerable<string> profileUrls,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Building FirelyValidationContext for profiles: {Profiles}", 
            string.Join(", ", profileUrls));

        // Parse Bundle
        var parser = new FhirJsonParser();
        var bundle = parser.Parse<Bundle>(bundleJson);

        // Build resolver
        var coreResolver = ZipSource.CreateValidationSource();
        var compositeLogger = _loggerFactory.CreateLogger<CompositeResourceResolver>();
        var resolver = new CompositeResourceResolver(null, coreResolver, compositeLogger);

        // Get ModelInspector
        var modelInspector = ModelInspector.ForAssembly(typeof(Bundle).Assembly);

        return new FirelyValidationContext(bundle, resolver, modelInspector);
    }

    /// <summary>
    /// Performs basic structural checks only.
    /// Phase 2.1: Minimal checks - semantic validation delegated to pipeline.
    /// </summary>
    private OperationOutcome PerformBasicStructuralChecks(Bundle bundle)
    {
        var outcome = new OperationOutcome { Issue = new List<OperationOutcome.IssueComponent>() };

        // Check 1: Bundle.type is required (FHIR R5 invariant)
        if (bundle.Type == null)
        {
            outcome.Issue.Add(new OperationOutcome.IssueComponent
            {
                Severity = OperationOutcome.IssueSeverity.Error,
                Code = OperationOutcome.IssueType.Required,
                Diagnostics = "Bundle.type is required (FHIR R5 core constraint)"
            });
        }

        // Check 2: Entry resources exist (warning only)
        if (bundle.Entry != null)
        {
            for (int i = 0; i < bundle.Entry.Count; i++)
            {
                var entry = bundle.Entry[i];
                if (entry.Resource == null)
                {
                    outcome.Issue.Add(new OperationOutcome.IssueComponent
                    {
                        Severity = OperationOutcome.IssueSeverity.Warning,
                        Code = OperationOutcome.IssueType.Required,
                        Diagnostics = $"Bundle.entry[{i}].resource is empty"
                    });
                }
            }
        }

        // Phase 2.1: NO semantic validation here
        // That belongs in ValidationPipeline layers

        return outcome;
    }

    /// <summary>
    /// Phase 2: Temporary method to parse inline StructureDefinition JSON as a "package".
    /// Future: Replace with actual Simplifier .zip package upload.
    /// </summary>
    private async Task<SimplifierPackage?> ParseInlineProfileAsPackageAsync(
        string structureDefinitionJson,
        CancellationToken cancellationToken)
    {
        try
        {
            var parser = new FhirJsonParser();
            var sd = parser.Parse<StructureDefinition>(structureDefinitionJson);

            if (string.IsNullOrEmpty(sd.Url))
            {
                _logger.LogWarning("StructureDefinition has no canonical URL, skipping");
                return null;
            }

            _logger.LogInformation("Parsed inline StructureDefinition: {Url}", sd.Url);

            // Create a minimal "package" with just this profile
            return new SimplifierPackage
            {
                Name = "inline-profile",
                Version = "1.0.0",
                FhirVersions = new List<string> { "5.0.0" },
                Dependencies = new Dictionary<string, string>(),
                StructureDefinitions = new Dictionary<string, StructureDefinition>
                {
                    [StripVersion(sd.Url)] = sd
                },
                ValueSets = new Dictionary<string, ValueSet>(),
                CodeSystems = new Dictionary<string, CodeSystem>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse inline StructureDefinition JSON");
            return null;
        }
    }

    /// <summary>
    /// Phase 2.1: Explicit snapshot generation with fail-fast behavior.
    /// Generates snapshots for all profiles in package if missing.
    /// Throws exception immediately if snapshot generation fails.
    /// </summary>
    private async System.Threading.Tasks.Task EnsureSnapshotsExplicitlyAsync(
        SimplifierPackage package,
        IResourceResolver resolver,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Starting explicit snapshot generation for {Count} profiles", 
            package.StructureDefinitions.Count);

        var generator = new SnapshotGenerator(resolver, SnapshotGeneratorSettings.CreateDefault());

        foreach (var (url, sd) in package.StructureDefinitions)
        {
            if (sd.Snapshot == null || sd.Snapshot.Element.Count == 0)
            {
                _logger.LogInformation("Generating snapshot for {Url}", url);

                try
                {
                    await System.Threading.Tasks.Task.Run(() => generator.Update(sd), cancellationToken);
                    
                    // Phase 2.1: Explicit verification
                    if (sd.Snapshot == null || sd.Snapshot.Element.Count == 0)
                    {
                        throw new InvalidOperationException(
                            $"Snapshot generation reported success but snapshot is still missing for '{url}'");
                    }

                    _logger.LogDebug("Snapshot generated: {ElementCount} elements for {Url}", 
                        sd.Snapshot.Element.Count, url);
                }
                catch (Exception ex)
                {
                    // Phase 2.1: Fail-fast
                    var errorMsg = $"Failed to generate snapshot for '{url}': {ex.Message}. " +
                                   "Ensure all dependencies (base profiles, extensions) are available in resolver.";
                    _logger.LogError(ex, errorMsg);
                    throw new InvalidOperationException(errorMsg, ex);
                }
            }
            else
            {
                _logger.LogDebug("Snapshot already exists for {Url} ({ElementCount} elements)", 
                    url, sd.Snapshot.Element.Count);
            }
        }

        _logger.LogInformation("Explicit snapshot generation complete for {Count} profiles", 
            package.StructureDefinitions.Count);
    }

    private static string StripVersion(string canonicalUrl)
    {
        var pipeIndex = canonicalUrl.IndexOf('|');
        return pipeIndex >= 0 ? canonicalUrl.Substring(0, pipeIndex) : canonicalUrl;
    }
}
