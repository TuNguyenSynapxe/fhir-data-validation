using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Defines which instances of a resource type a validation rule applies to.
/// This is a discriminated union implemented using record inheritance.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "kind")]
[JsonDerivedType(typeof(AllInstances), typeDiscriminator: "all")]
[JsonDerivedType(typeof(FirstInstance), typeDiscriminator: "first")]
[JsonDerivedType(typeof(FilteredInstances), typeDiscriminator: "filter")]
public abstract record InstanceScope
{
    /// <summary>
    /// Validates that this InstanceScope configuration is valid.
    /// </summary>
    public abstract void Validate();
    
    /// <summary>
    /// Returns a stable string key for duplicate detection.
    /// Phase 1: Used to distinguish rules with different instance scopes.
    /// </summary>
    public abstract string ToStableKey();
}

/// <summary>
/// Apply rule to all instances of the resource type in the Bundle.
/// Equivalent to legacy notation: ResourceType[*]
/// </summary>
public record AllInstances : InstanceScope
{
    public override void Validate()
    {
        // Always valid
    }
    
    public override string ToStableKey() => "all";
}

/// <summary>
/// Apply rule to the first instance only.
/// Equivalent to legacy notation: ResourceType[0]
/// </summary>
public record FirstInstance : InstanceScope
{
    public override void Validate()
    {
        // Always valid
    }
    
    public override string ToStableKey() => "first";
}

/// <summary>
/// Apply rule to instances matching a FHIRPath condition.
/// Equivalent to legacy notation: ResourceType.where(condition)
/// </summary>
public record FilteredInstances : InstanceScope
{
    /// <summary>
    /// FHIRPath expression evaluated per resource instance.
    /// Must return boolean or collection (empty = false, non-empty = true).
    /// Examples:
    /// - code.coding.code='HS'
    /// - identifier.system='http://example.org' and identifier.value.exists()
    /// </summary>
    [JsonPropertyName("condition")]
    public required string ConditionFhirPath { get; init; }

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(ConditionFhirPath))
        {
            throw new ArgumentException("FilteredInstances condition cannot be empty");
        }

        // Additional validation: condition must not contain resource type prefix
        // This is evaluated RELATIVE to the resource, not the Bundle
        if (ConditionFhirPath.Contains("Bundle.") || 
            ConditionFhirPath.Contains("entry."))
        {
            throw new ArgumentException(
                $"Filter condition must not reference Bundle structure. Got: {ConditionFhirPath}");
        }
    }
    
    public override string ToStableKey() => $"filter:{ConditionFhirPath}";
}
