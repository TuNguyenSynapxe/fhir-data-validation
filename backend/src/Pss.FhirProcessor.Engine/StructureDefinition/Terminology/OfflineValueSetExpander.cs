using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Firely;

namespace Pss.FhirProcessor.Engine.SdValidation.Terminology;

/// <summary>
/// Phase 3.4: Offline-only ValueSet expander for StructureDefinition validation.
/// 
/// Expands ValueSets using only explicit, offline-resolvable content.
/// Supports nested ValueSet imports with cycle detection.
/// Deterministic, explainable, no external calls.
/// </summary>
public class OfflineValueSetExpander : IOfflineValueSetExpander
{
    private readonly ILogger<OfflineValueSetExpander> _logger;

    public OfflineValueSetExpander(ILogger<OfflineValueSetExpander> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Expands a ValueSet to an explicit set of (system, code) pairs.
    /// Phase 3.4: Supports nested imports with cycle detection.
    /// </summary>
    public ValueSetExpansionResult Expand(
        ValueSet root,
        FirelyValidationContext context,
        CancellationToken ct)
    {
        var codes = new HashSet<(string System, string Code)>();
        var issues = new List<ValueSetExpansionIssue>();
        var visitedCanonicals = new HashSet<string>(StringComparer.Ordinal);

        _logger.LogDebug("Expanding ValueSet '{Url}'", root.Url);

        ExpandRecursive(root, context, codes, issues, visitedCanonicals, ct);

        _logger.LogDebug(
            "Expanded ValueSet '{Url}' → {CodeCount} codes, {IssueCount} issues",
            root.Url,
            codes.Count,
            issues.Count);

        return new ValueSetExpansionResult
        {
            Codes = codes,
            Issues = issues
        };
    }

    /// <summary>
    /// Recursively expands a ValueSet, tracking visited canonicals to detect cycles.
    /// </summary>
    private void ExpandRecursive(
        ValueSet valueSet,
        FirelyValidationContext context,
        HashSet<(string System, string Code)> codes,
        List<ValueSetExpansionIssue> issues,
        HashSet<string> visitedCanonicals,
        CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        var canonical = valueSet.Url;
        if (string.IsNullOrEmpty(canonical))
        {
            _logger.LogWarning("ValueSet has no canonical URL, skipping");
            return;
        }

        // Cycle detection
        if (visitedCanonicals.Contains(canonical))
        {
            _logger.LogDebug("Cyclic ValueSet reference detected: {Url}", canonical);
            issues.Add(new ValueSetExpansionIssue
            {
                ValueSetUrl = canonical,
                Reason = SdViolationReason.CyclicValueSetReference
            });
            return;
        }

        visitedCanonicals.Add(canonical);

        try
        {
            // Phase 3.4: Expand compose.include
            if (valueSet.Compose?.Include != null)
            {
                foreach (var include in valueSet.Compose.Include)
                {
                    ExpandInclude(include, canonical, context, codes, issues, visitedCanonicals, ct);
                }
            }

            // Phase 3.4: Expand pre-computed expansion.contains
            if (valueSet.Expansion?.Contains != null)
            {
                foreach (var contain in valueSet.Expansion.Contains)
                {
                    if (!string.IsNullOrEmpty(contain.System) && !string.IsNullOrEmpty(contain.Code))
                    {
                        codes.Add((contain.System, contain.Code));
                        _logger.LogTrace(
                            "Added code from expansion: {System}|{Code}",
                            contain.System,
                            contain.Code);
                    }
                }
            }
        }
        finally
        {
            // Remove from visited set after processing (allow reuse in other branches)
            visitedCanonicals.Remove(canonical);
        }
    }

    /// <summary>
    /// Expands a single compose.include element.
    /// Handles explicit concepts, nested ValueSet imports, filters, and entire-system includes.
    /// </summary>
    private void ExpandInclude(
        ValueSet.ConceptSetComponent include,
        string parentValueSetUrl,
        FirelyValidationContext context,
        HashSet<(string System, string Code)> codes,
        List<ValueSetExpansionIssue> issues,
        HashSet<string> visitedCanonicals,
        CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        // Check for filters (Phase 2.4 behavior: reject)
        if (include.Filter != null && include.Filter.Any())
        {
            _logger.LogDebug(
                "ValueSet '{Url}' has filtered include (system: {System})",
                parentValueSetUrl,
                include.System);
            issues.Add(new ValueSetExpansionIssue
            {
                ValueSetUrl = parentValueSetUrl,
                Reason = SdViolationReason.FilteredInclude
            });
            return; // Cannot expand filtered includes
        }

        // Phase 3.4: Handle nested ValueSet imports
        if (include.ValueSetElement != null && include.ValueSetElement.Any())
        {
            _logger.LogDebug(
                "ValueSet '{Url}' imports {Count} nested ValueSets",
                parentValueSetUrl,
                include.ValueSetElement.Count);

            foreach (var valueSetRef in include.ValueSetElement)
            {
                var nestedUrl = valueSetRef.Value;
                if (string.IsNullOrEmpty(nestedUrl))
                {
                    continue;
                }

                _logger.LogTrace("Resolving nested ValueSet: {Url}", nestedUrl);

                var nestedValueSet = context.Resolver.ResolveByCanonicalUri(nestedUrl) as ValueSet;
                if (nestedValueSet == null)
                {
                    _logger.LogDebug(
                        "Cannot resolve nested ValueSet '{NestedUrl}' in '{ParentUrl}'",
                        nestedUrl,
                        parentValueSetUrl);
                    issues.Add(new ValueSetExpansionIssue
                    {
                        ValueSetUrl = nestedUrl,
                        Reason = SdViolationReason.UnresolvableValueSet
                    });
                    continue;
                }

                // Recursive expansion with cycle detection
                ExpandRecursive(nestedValueSet, context, codes, issues, visitedCanonicals, ct);
            }

            // After processing imports, check if there are also explicit concepts
            if (include.Concept == null || !include.Concept.Any())
            {
                return; // No explicit concepts, only imports
            }
        }

        // Phase 3.4: Expand explicit concepts
        if (include.Concept != null && include.Concept.Any())
        {
            var system = include.System;
            if (string.IsNullOrEmpty(system))
            {
                _logger.LogWarning(
                    "ValueSet '{Url}' has concepts without system, skipping",
                    parentValueSetUrl);
                return;
            }

            foreach (var concept in include.Concept)
            {
                if (!string.IsNullOrEmpty(concept.Code))
                {
                    codes.Add((system, concept.Code));
                    _logger.LogTrace(
                        "Added explicit concept: {System}|{Code}",
                        system,
                        concept.Code);
                }
            }
        }
        else
        {
            // Phase 2.4 behavior: Entire CodeSystem include (ambiguous)
            _logger.LogDebug(
                "ValueSet '{Url}' includes entire CodeSystem '{System}'",
                parentValueSetUrl,
                include.System);
            issues.Add(new ValueSetExpansionIssue
            {
                ValueSetUrl = parentValueSetUrl,
                Reason = SdViolationReason.EntireSystemValueSet
            });
        }
    }
}
