using System.Text.Json;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Helper for generating stable structural identity keys for rules.
/// Phase 2A: Centralized identity logic to ensure consistency across governance and services.
/// 
/// Two rules have the same identity if and only if they have:
/// - Same Type (e.g., "Required", "ArrayLength")
/// - Same FieldPath (e.g., "name.family")
/// - Same InstanceScope (structural equality via ToStableKey())
/// </summary>
public static class RuleIdentity
{
    /// <summary>
    /// Generate a stable identity key from RuleDefinition.
    /// Returns format: "Type|FieldPath|ScopeKey"
    /// </summary>
    public static string GetIdentityKey(RuleDefinition rule)
    {
        if (rule == null)
            throw new ArgumentNullException(nameof(rule));
        
        var type = rule.Type ?? string.Empty;
        var fieldPath = rule.FieldPath ?? string.Empty;
        var scopeKey = rule.InstanceScope?.ToStableKey() ?? "none";
        
        return $"{type}|{fieldPath}|{scopeKey}";
    }
    
    /// <summary>
    /// Generate a stable identity key from individual components.
    /// Useful for comparing API models that may not have RuleDefinition structure.
    /// </summary>
    public static string GetIdentityKey(string ruleType, string? fieldPath, InstanceScope? instanceScope)
    {
        var type = ruleType ?? string.Empty;
        var path = fieldPath ?? string.Empty;
        var scopeKey = instanceScope?.ToStableKey() ?? "none";
        
        return $"{type}|{path}|{scopeKey}";
    }
    
    /// <summary>
    /// Generate identity key from components where InstanceScope is a serialized object.
    /// Deserializes the scope to get proper structural key.
    /// Used for API models where InstanceScope may be JsonElement or object.
    /// </summary>
    public static string GetIdentityKey(string ruleType, string? fieldPath, object? instanceScopeObject)
    {
        var type = ruleType ?? string.Empty;
        var path = fieldPath ?? string.Empty;
        
        // Try to get scope key from object
        var scopeKey = GetScopeKeyFromObject(instanceScopeObject);
        
        return $"{type}|{path}|{scopeKey}";
    }
    
    /// <summary>
    /// Compare two rules for structural identity equality.
    /// </summary>
    public static bool AreEqual(RuleDefinition rule1, RuleDefinition rule2)
    {
        if (rule1 == null || rule2 == null)
            return false;
        
        return GetIdentityKey(rule1) == GetIdentityKey(rule2);
    }
    
    /// <summary>
    /// Compare two InstanceScope objects for structural equality.
    /// Handles both strongly-typed InstanceScope and serialized objects (JsonElement).
    /// </summary>
    public static bool InstanceScopeEquals(object? scope1, object? scope2)
    {
        // Both null = equal
        if (scope1 == null && scope2 == null)
            return true;
        
        // One null, one not = not equal
        if (scope1 == null || scope2 == null)
            return false;
        
        var key1 = GetScopeKeyFromObject(scope1);
        var key2 = GetScopeKeyFromObject(scope2);
        
        return key1 == key2;
    }
    
    /// <summary>
    /// Extract stable scope key from an object that may be InstanceScope or JsonElement.
    /// </summary>
    private static string GetScopeKeyFromObject(object? scopeObject)
    {
        if (scopeObject == null)
            return "none";
        
        // If it's already an InstanceScope, use ToStableKey()
        if (scopeObject is InstanceScope scope)
            return scope.ToStableKey();
        
        // Otherwise, serialize to JSON and deserialize to get proper structure
        // This handles JsonElement from API deserialization
        try
        {
            var json = JsonSerializer.Serialize(scopeObject);
            var deserializedScope = JsonSerializer.Deserialize<InstanceScope>(json);
            return deserializedScope?.ToStableKey() ?? "none";
        }
        catch
        {
            // Fallback: use JSON string comparison
            return JsonSerializer.Serialize(scopeObject);
        }
    }
}
