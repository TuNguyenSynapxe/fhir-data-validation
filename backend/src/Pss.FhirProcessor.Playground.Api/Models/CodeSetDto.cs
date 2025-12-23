namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// PHASE 1 — CodeSet DTO (Lean Terminology Model)
/// 
/// SCOPE: Simple lookup tables with code + display only
/// 
/// Contains ONLY:
/// - url (canonical identifier)
/// - name (human-readable)
/// - concepts[] (code + display pairs)
/// 
/// PHASE 1 LIMITATION: Does NOT include:
/// - version, status, date, publisher
/// - description, copyright, contact
/// - valueSet, filter, hierarchy
/// 
/// TODO (Phase 2): Add version, status, description fields
/// TODO (Phase 2): Add ValueSet reference
/// 
/// See: /docs/TERMINOLOGY_PHASE_1.md
/// </summary>
public class CodeSetDto
{
    /// <summary>
    /// Canonical URL that uniquely identifies this CodeSet
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Human-friendly name of the CodeSet
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Concepts defined in this CodeSet (PHASE 1: code + display only)
    /// </summary>
    public List<CodeSetConceptDto> Concepts { get; set; } = new();
}

/// <summary>
/// PHASE 1 — Concept DTO (Code + Display Only)
/// 
/// SCOPE: Minimal concept representation
/// 
/// Contains ONLY:
/// - code (unique identifier within CodeSet)
/// - display (human-readable label)
/// 
/// PHASE 1 LIMITATION: Does NOT include:
/// - definition (explanatory text)
/// - designation[] (alternate labels, translations)
/// - property[] (additional metadata)
/// - concept[] (child concepts, hierarchy)
/// 
/// TODO (Phase 2): Add definition field
/// TODO (Phase 2): Add designation[] for multi-language support
/// TODO (Phase 2): Add property[] for custom metadata
/// TODO (Phase 2): Add concept[] for hierarchical CodeSystems
/// 
/// See: /docs/TERMINOLOGY_PHASE_1.md
/// </summary>
public class CodeSetConceptDto
{
    /// <summary>
    /// Code that identifies this concept (primary key within CodeSet)
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable display text (PHASE 1: single language only)
    /// </summary>
    public string? Display { get; set; }
}
