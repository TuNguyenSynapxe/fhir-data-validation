using System.Text.RegularExpressions;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Validates field paths to ensure they are relative to a resource instance.
/// BLOCKS invalid paths that contain instance scope notation.
/// </summary>
public interface IFieldPathValidator
{
    /// <summary>
    /// Validates a field path. Throws ArgumentException if invalid.
    /// </summary>
    void ValidateFieldPath(string fieldPath, string resourceType);
    
    /// <summary>
    /// Checks if a field path is valid without throwing.
    /// </summary>
    (bool IsValid, string? ErrorMessage) CheckFieldPath(string fieldPath, string resourceType);
}

public class FieldPathValidator : IFieldPathValidator
{
    public void ValidateFieldPath(string fieldPath, string resourceType)
    {
        var (isValid, errorMessage) = CheckFieldPath(fieldPath, resourceType);
        if (!isValid)
        {
            throw new ArgumentException(errorMessage, nameof(fieldPath));
        }
    }

    public (bool IsValid, string? ErrorMessage) CheckFieldPath(string fieldPath, string resourceType)
    {
        if (string.IsNullOrWhiteSpace(fieldPath))
        {
            return (false, "Field path cannot be empty");
        }

        // Rule 1: Must NOT start with resource type
        if (fieldPath.StartsWith($"{resourceType}.", StringComparison.OrdinalIgnoreCase) ||
            fieldPath.Equals(resourceType, StringComparison.OrdinalIgnoreCase))
        {
            return (false, $"Field path must not start with resource type '{resourceType}'. " +
                          $"Got: '{fieldPath}'. Use InstanceScope for resource filtering.");
        }

        // Rule 2: Must NOT contain [*] (array wildcard)
        if (fieldPath.Contains("[*]"))
        {
            return (false, $"Field path must not contain '[*]'. " +
                          $"Got: '{fieldPath}'. FHIRPath handles array traversal implicitly.");
        }

        // Rule 3: Must NOT contain [0] or other numeric indices at resource level
        // Allow indices in nested paths like "name[0].family"
        if (Regex.IsMatch(fieldPath, @"^\[\d+\]"))
        {
            return (false, $"Field path must not start with array index. " +
                          $"Got: '{fieldPath}'. Use InstanceScope.FirstInstance for single resource.");
        }

        // Rule 4: Must NOT contain resource-level .where()
        // Heuristic: .where() at the start or after resource type is resource-level
        if (Regex.IsMatch(fieldPath, @"^\.?where\s*\(", RegexOptions.IgnoreCase))
        {
            return (false, $"Field path must not start with '.where()'. " +
                          $"Got: '{fieldPath}'. Use InstanceScope.FilteredInstances for resource filtering.");
        }

        // Rule 5: Must NOT contain Bundle or entry references
        if (fieldPath.Contains("Bundle.", StringComparison.OrdinalIgnoreCase) ||
            fieldPath.Contains("entry.", StringComparison.OrdinalIgnoreCase))
        {
            return (false, $"Field path must not reference Bundle structure. " +
                          $"Got: '{fieldPath}'. Paths are evaluated relative to individual resources.");
        }

        return (true, null);
    }
}
