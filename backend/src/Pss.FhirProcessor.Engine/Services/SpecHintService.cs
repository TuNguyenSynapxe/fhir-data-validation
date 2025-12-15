using System.Reflection;
using System.Text.Json;
using Hl7.Fhir.Model;
using Hl7.Fhir.FhirPath;
using Hl7.FhirPath;
using Hl7.Fhir.ElementModel;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Provides advisory hints about HL7 FHIR required fields.
/// This is non-blocking and non-enforcing - purely informational.
/// Spec hints are loaded from versioned JSON catalogs.
/// </summary>
public class SpecHintService : ISpecHintService
{
    private readonly Dictionary<string, SpecHintCatalog> _catalogCache = new();
    private readonly SemaphoreSlim _cacheLock = new(1, 1);
    private readonly FhirPathCompiler _compiler;

    public SpecHintService()
    {
        _compiler = new FhirPathCompiler();
    }

    public async Task<List<SpecHintIssue>> CheckAsync(Bundle bundle, string fhirVersion, CancellationToken cancellationToken = default)
    {
        var issues = new List<SpecHintIssue>();

        // Load the appropriate spec hints catalog for the FHIR version
        var catalog = await LoadCatalogAsync(fhirVersion, cancellationToken);
        if (catalog == null || catalog.Hints.Count == 0)
        {
            // No hints available for this version
            return issues;
        }

        // Check each resource in the bundle
        if (bundle.Entry != null)
        {
            for (int i = 0; i < bundle.Entry.Count; i++)
            {
                var entry = bundle.Entry[i];
                if (entry.Resource == null)
                    continue;

                var resourceType = entry.Resource.TypeName;
                var resourceId = entry.Resource.Id;
                var jsonPointer = $"/entry/{i}/resource";

                // Check if we have hints for this resource type
                if (catalog.Hints.TryGetValue(resourceType, out var hints))
                {
                    foreach (var hint in hints)
                    {
                        // METADATA-DRIVEN: Check IsConditional flag explicitly
                        if (hint.IsConditional)
                        {
                            // Conditional hint - requires condition evaluation
                            var conditionalIssues = EvaluateConditionalHint(entry.Resource, hint, resourceType, resourceId, jsonPointer);
                            issues.AddRange(conditionalIssues);
                        }
                        else
                        {
                            // Simple required field - always evaluate
                            if (IsFieldMissing(entry.Resource, hint.Path))
                            {
                                issues.Add(new SpecHintIssue
                                {
                                    ResourceType = resourceType,
                                    ResourceId = resourceId,
                                    Path = $"{resourceType}.{hint.Path}",
                                    Reason = hint.Reason,
                                    Severity = hint.Severity,
                                    JsonPointer = jsonPointer,
                                    IsConditional = false,
                                    Condition = null,
                                    AppliesToEach = false
                                });
                            }
                        }
                    }
                }
            }
        }

        return issues;
    }

    /// <summary>
    /// Evaluates a conditional hint - METADATA-DRIVEN.
    /// Requires IsConditional=true and valid Condition.
    /// Handles both single-value and array scenarios based on AppliesToEach flag.
    /// </summary>
    private List<SpecHintIssue> EvaluateConditionalHint(
        Resource resource,
        SpecHint hint,
        string resourceType,
        string resourceId,
        string jsonPointer)
    {
        var issues = new List<SpecHintIssue>();

        try
        {
            // SAFETY: Validate metadata before proceeding
            if (string.IsNullOrWhiteSpace(hint.Condition))
            {
                // Invalid metadata: IsConditional=true but no condition provided
                // Skip hint (don't throw exception)
                return issues;
            }

            // Evaluate the condition
            var conditionMet = EvaluateCondition(resource, hint.Condition);
            
            if (!conditionMet)
            {
                // Condition not met, skip this hint
                return issues;
            }

            // Condition is met, now check the required field
            if (hint.AppliesToEach)
            {
                // Apply validation to each item in the collection
                // Extract parent path from the full path (e.g., "communication" from "communication.language")
                var parts = hint.Path.Split('.');
                if (parts.Length < 2)
                {
                    // Invalid path for appliesToEach, fall back to simple check
                    if (IsFieldMissing(resource, hint.Path))
                    {
                        issues.Add(CreateIssue(resourceType, resourceId, hint, jsonPointer));
                    }
                    return issues;
                }

                var parentPath = parts[0];
                var childPath = string.Join(".", parts.Skip(1));

                // Get all parent elements (e.g., all communication entries)
                var parentElements = GetCollectionElements(resource, parentPath);
                
                // Check each parent element for the required child field
                for (int i = 0; i < parentElements.Count; i++)
                {
                    var parentElement = parentElements[i];
                    if (IsFieldMissingInElement(parentElement, childPath))
                    {
                        // Create issue for this specific array item with metadata
                        issues.Add(new SpecHintIssue
                        {
                            ResourceType = resourceType,
                            ResourceId = resourceId,
                            Path = $"{resourceType}.{parentPath}[{i}].{childPath}",
                            Reason = hint.Reason,
                            Severity = hint.Severity,
                            JsonPointer = $"{jsonPointer}/{parentPath}/{i}",
                            IsConditional = true,
                            Condition = hint.Condition,
                            AppliesToEach = true
                        });
                    }
                }
            }
            else
            {
                // Validate once at resource level
                if (IsFieldMissing(resource, hint.Path))
                {
                    issues.Add(CreateIssue(resourceType, resourceId, hint, jsonPointer));
                }
            }
        }
        catch
        {
            // If evaluation fails, skip this hint (conservative approach)
            // Don't emit warnings for evaluation errors
        }

        return issues;
    }

    /// <summary>
    /// Evaluates a FHIRPath condition expression
    /// Returns true if condition evaluates to true, false otherwise
    /// </summary>
    private bool EvaluateCondition(Resource resource, string condition)
    {
        try
        {
            var compiled = _compiler.Compile(condition);
            var typedElement = resource.ToTypedElement();
            var scopedNode = new ScopedNode(typedElement);
            var result = compiled(scopedNode, new EvaluationContext());
            var resultList = result.ToList();

            // Check if result is true (boolean true or non-empty collection)
            if (!resultList.Any())
                return false;

            // Check for explicit boolean true
            var firstResult = resultList.First();
            if (firstResult is ITypedElement te && te.Value is bool boolValue)
            {
                return boolValue;
            }

            // Non-empty result means condition is met
            return true;
        }
        catch
        {
            // If condition evaluation fails, assume not met (conservative)
            return false;
        }
    }

    /// <summary>
    /// Gets all elements in a collection at the specified path
    /// </summary>
    private List<ITypedElement> GetCollectionElements(Resource resource, string path)
    {
        try
        {
            var compiled = _compiler.Compile(path);
            var typedElement = resource.ToTypedElement();
            var scopedNode = new ScopedNode(typedElement);
            var result = compiled(scopedNode, new EvaluationContext());
            
            return result.OfType<ITypedElement>().ToList();
        }
        catch
        {
            return new List<ITypedElement>();
        }
    }

    /// <summary>
    /// Checks if a field is missing within a specific typed element.
    /// Evaluates FHIRPath relative to the given element.
    /// </summary>
    private bool IsFieldMissingInElement(ITypedElement element, string childPath)
    {
        try
        {
            // Compile FHIRPath expression for the child field
            var compiled = _compiler.Compile(childPath);
            
            // Create scoped node for the parent element
            var scopedNode = new ScopedNode(element);
            
            // Evaluate FHIRPath relative to this element
            var result = compiled(scopedNode, new EvaluationContext());
            var resultList = result.ToList();

            // If no results, field is missing
            if (!resultList.Any())
                return true;

            // Check if all results are empty
            return resultList.All(r => IsEmptyValue(r));
        }
        catch
        {
            // If evaluation fails, assume field exists (conservative)
            return false;
        }
    }

    /// <summary>
    /// Creates a SpecHintIssue from a hint with full metadata.
    /// Metadata drives error formatting (no path-based inference).
    /// </summary>
    private SpecHintIssue CreateIssue(string resourceType, string resourceId, SpecHint hint, string jsonPointer)
    {
        return new SpecHintIssue
        {
            ResourceType = resourceType,
            ResourceId = resourceId,
            Path = $"{resourceType}.{hint.Path}",
            Reason = hint.Reason,
            Severity = hint.Severity,
            JsonPointer = jsonPointer,
            IsConditional = hint.IsConditional,
            Condition = hint.Condition,
            AppliesToEach = hint.AppliesToEach
        };
    }

    /// <summary>
    /// Checks if a field is missing (null or empty) using FHIRPath evaluation
    /// </summary>
    private bool IsFieldMissing(Resource resource, string path)
    {
        try
        {
            // Compile the FHIRPath expression
            var compiled = _compiler.Compile(path);
            
            // Convert Resource POCO to ITypedElement
            var typedElement = resource.ToTypedElement();
            var scopedNode = new ScopedNode(typedElement);
            
            // Evaluate the FHIRPath expression
            var result = compiled(scopedNode, new EvaluationContext());
            var resultList = result.ToList();
            
            // If no results, field is missing
            if (!resultList.Any())
                return true;

            // Check if all results are empty/null
            return resultList.All(r => IsEmptyValue(r));
        }
        catch
        {
            // If FHIRPath evaluation fails, assume field exists (conservative approach)
            return false;
        }
    }

    /// <summary>
    /// Checks if a value is effectively empty.
    /// For complex types (CodeableConcept, HumanName, etc.), checks if they have children.
    /// </summary>
    private bool IsEmptyValue(object value)
    {
        if (value == null)
            return true;

        // Handle ITypedElement from FHIRPath evaluation
        if (value is ITypedElement te)
        {
            var elementValue = te.Value;
            
            // For primitive types, check the value
            if (elementValue != null)
            {
                if (elementValue is string s && string.IsNullOrWhiteSpace(s))
                    return true;
                return false; // Has non-empty primitive value
            }
            
            // For complex types (Value is null), check if has children
            // Complex types like CodeableConcept, HumanName, Address, etc. have .Value=null
            // but contain child elements. They're NOT empty if they have children.
            return !te.Children().Any();
        }

        // Handle raw string values
        if (value is string str)
            return string.IsNullOrWhiteSpace(str);

        // Handle enumerables
        if (value is System.Collections.IEnumerable enumerable && value is not string)
            return !enumerable.Cast<object>().Any();

        return false;
    }

    /// <summary>
    /// Loads the spec hints catalog for the given FHIR version
    /// Catalogs are cached in memory after first load
    /// </summary>
    private async Task<SpecHintCatalog?> LoadCatalogAsync(string fhirVersion, CancellationToken cancellationToken)
    {
        // Normalize version to catalog file name
        var catalogKey = fhirVersion.ToUpperInvariant();
        var catalogFileName = catalogKey switch
        {
            "R4" or "4.0.1" => "fhir-spec-hints-r4.json",
            _ => null
        };

        if (catalogFileName == null)
        {
            // Unsupported version
            return null;
        }

        // Check cache first
        if (_catalogCache.TryGetValue(catalogKey, out var cached))
        {
            return cached;
        }

        // Load from embedded resource
        await _cacheLock.WaitAsync(cancellationToken);
        try
        {
            // Double-check after acquiring lock
            if (_catalogCache.TryGetValue(catalogKey, out cached))
            {
                return cached;
            }

            var assembly = Assembly.GetExecutingAssembly();
            var resourceName = $"Pss.FhirProcessor.Engine.Catalogs.{catalogFileName}";

            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream == null)
            {
                // Catalog file not found
                _catalogCache[catalogKey] = new SpecHintCatalog { Version = fhirVersion, Hints = new() };
                return _catalogCache[catalogKey];
            }

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            var catalog = await JsonSerializer.DeserializeAsync<SpecHintCatalog>(stream, options, cancellationToken);
            if (catalog != null)
            {
                _catalogCache[catalogKey] = catalog;
                return catalog;
            }

            // Failed to deserialize
            _catalogCache[catalogKey] = new SpecHintCatalog { Version = fhirVersion, Hints = new() };
            return _catalogCache[catalogKey];
        }
        catch
        {
            // On error, cache empty catalog to avoid repeated failures
            _catalogCache[catalogKey] = new SpecHintCatalog { Version = fhirVersion, Hints = new() };
            return _catalogCache[catalogKey];
        }
        finally
        {
            _cacheLock.Release();
        }
    }
}
