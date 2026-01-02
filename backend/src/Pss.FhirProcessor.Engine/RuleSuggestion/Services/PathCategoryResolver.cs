namespace Pss.FhirProcessor.Engine.RuleSuggestion.Services;

/// <summary>
/// Classifies FHIR paths into semantic categories for suppression and risk assessment.
/// Helps prevent identity leakage and inappropriate rule suggestions.
/// </summary>
public static class PathCategoryResolver
{
    /// <summary>
    /// Determine the semantic category of a FHIR path
    /// </summary>
    public static PathCategory Classify(string fullPath)
    {
        var lowerPath = fullPath.ToLowerInvariant();
        
        // Identity fields (highest risk)
        if (IsIdentifier(lowerPath))
            return PathCategory.Identifier;
        
        // References to other resources
        if (IsReference(lowerPath))
            return PathCategory.Reference;
        
        // Terminology bindings
        if (IsTerminology(lowerPath))
            return PathCategory.Terminology;
        
        // Structural enums (status, type fields)
        if (IsStructuralEnum(lowerPath))
            return PathCategory.StructuralEnum;
        
        // Contact information
        if (IsContact(lowerPath))
            return PathCategory.Contact;
        
        // Free-text address components
        if (IsAddressFreeText(lowerPath))
            return PathCategory.AddressFreeText;
        
        // Extension metadata
        if (IsExtensionMetadata(lowerPath))
            return PathCategory.ExtensionMetadata;
        
        // Free-text fields
        if (IsFreeText(lowerPath))
            return PathCategory.FreeText;
        
        return PathCategory.Other;
    }
    
    private static bool IsIdentifier(string path)
    {
        // .id or .identifier.value
        if (path.EndsWith(".id") || path.Contains("identifier.value"))
            return true;
        
        // urn:uuid: patterns
        return false; // This would be checked at value level
    }
    
    private static bool IsReference(string path)
    {
        // Any .reference field
        return path.Contains(".reference");
    }
    
    private static bool IsTerminology(string path)
    {
        // .code, .system, .coding
        return path.Contains(".code") || 
               path.Contains(".system") || 
               path.Contains(".coding");
    }
    
    private static bool IsStructuralEnum(string path)
    {
        // Common FHIR structural enum fields
        var parts = path.Split('.');
        var lastPart = parts.LastOrDefault()?.ToLowerInvariant() ?? "";
        
        return lastPart is "status" or "type" or "use" or "intent" or "priority";
    }
    
    private static bool IsContact(string path)
    {
        // telecom.value (phone, email, etc.)
        return path.Contains("telecom") && path.Contains("value");
    }
    
    private static bool IsAddressFreeText(string path)
    {
        // address.line (free text, not postal code)
        return path.Contains("address") && path.Contains("line");
    }
    
    private static bool IsExtensionMetadata(string path)
    {
        // extension.url
        return path.Contains("extension") && path.Contains("url");
    }
    
    private static bool IsFreeText(string path)
    {
        // .display, .text, .name.text, narrative fields
        var parts = path.Split('.');
        var lastPart = parts.LastOrDefault()?.ToLowerInvariant() ?? "";
        
        return lastPart is "display" or "text" or "narrative" ||
               path.Contains("name.text") ||
               path.Contains("text.div");
    }
}

/// <summary>
/// Semantic categories for FHIR paths
/// </summary>
public enum PathCategory
{
    /// <summary>
    /// Identity fields (.id, .identifier.value)
    /// HIGH RISK: Should not have FixedValue/AllowedValues suggestions
    /// </summary>
    Identifier,
    
    /// <summary>
    /// References to other resources (.reference)
    /// HIGH RISK: Should not have FixedValue/AllowedValues suggestions
    /// </summary>
    Reference,
    
    /// <summary>
    /// Terminology bindings (.code, .system, .coding)
    /// Use CodeSystem rules instead
    /// </summary>
    Terminology,
    
    /// <summary>
    /// Structural FHIR enums (.status, .type, .use)
    /// Already validated by Firely, low value for custom rules
    /// </summary>
    StructuralEnum,
    
    /// <summary>
    /// Contact information (telecom.value)
    /// Good candidate for Regex rules
    /// </summary>
    Contact,
    
    /// <summary>
    /// Free-text address components (address.line)
    /// Should NOT have pattern-based rules
    /// </summary>
    AddressFreeText,
    
    /// <summary>
    /// Extension metadata (extension.url)
    /// Should NOT have AllowedValues/FixedValue
    /// </summary>
    ExtensionMetadata,
    
    /// <summary>
    /// Free-text fields (.display, .text, .narrative)
    /// Should NOT have pattern-based rules
    /// </summary>
    FreeText,
    
    /// <summary>
    /// Other fields not matching specific categories
    /// </summary>
    Other
}
