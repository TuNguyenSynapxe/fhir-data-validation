namespace Pss.FhirProcessor.Engine.Navigation;

/// <summary>
/// DLL-SAFE: Controls how bundle entry selection is resolved when entryIndex is not explicitly provided.
/// 
/// Purpose: Make implicit fallback behavior explicit, deterministic, and policy-driven.
/// Used by JsonPointerResolver to decide whether to infer entryIndex from resourceType.
/// </summary>
public enum EntryResolutionPolicy
{
    /// <summary>
    /// STRICT: entryIndex MUST be provided explicitly. No inference or fallback is allowed.
    /// 
    /// Use case: Runtime/DLL scenarios where deterministic behavior is required.
    /// Behavior: If entryIndex is null, navigation returns null immediately.
    /// 
    /// Default for Engine.
    /// </summary>
    Strict,

    /// <summary>
    /// PREFER EXPLICIT: Use entryIndex if provided; otherwise allow controlled fallback.
    /// 
    /// Use case: Scenarios where explicit is preferred but fallback is acceptable.
    /// Behavior: 
    /// - If entryIndex provided → use it
    /// - If entryIndex null + resourceType provided → fallback to first match
    /// - If both null → return null
    /// 
    /// Balanced approach between strict and permissive.
    /// </summary>
    PreferExplicit,

    /// <summary>
    /// FALLBACK TO FIRST: Allow fallback to first matching resource entry.
    /// 
    /// Use case: Authoring / Playground scenarios where ergonomic behavior is desired.
    /// Behavior: Always attempt to resolve entry by resourceType if entryIndex not provided.
    /// 
    /// Default for Playground (explicit override).
    /// </summary>
    FallbackToFirst
}
