using Pss.FhirProcessor.Engine.Catalogs;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Authoring;

namespace Pss.FhirProcessor.Engine.Examples;

/// <summary>
/// Examples demonstrating how to use LintRuleCatalog.
/// This is for documentation purposes only.
/// </summary>
public static class LintRuleCatalogUsageExamples
{
    /// <summary>
    /// Example: Get rule metadata by ID
    /// </summary>
    public static void Example_GetRuleById()
    {
        var rule = LintRuleCatalog.GetRuleById("LINT_INVALID_JSON");
        
        if (rule != null)
        {
            Console.WriteLine($"Rule: {rule.Title}");
            Console.WriteLine($"Category: {rule.Category}");
            Console.WriteLine($"Severity: {rule.Severity}");
            Console.WriteLine($"Confidence: {rule.Confidence}");
            Console.WriteLine($"Description: {rule.Description}");
            Console.WriteLine($"Disclaimer: {rule.Disclaimer}");
        }
    }

    /// <summary>
    /// Example: Get all rules for a specific FHIR version
    /// </summary>
    public static void Example_GetRulesForVersion()
    {
        var r4Rules = LintRuleCatalog.GetRulesForVersion("R4");
        
        Console.WriteLine($"Total rules for R4: {r4Rules.Count()}");
        
        foreach (var rule in r4Rules)
        {
            Console.WriteLine($"- {rule.Id}: {rule.Title}");
        }
    }

    /// <summary>
    /// Example: Get rules by category
    /// </summary>
    public static void Example_GetRulesByCategory()
    {
        var schemaRules = LintRuleCatalog.GetRulesByCategory(LintRuleCategory.SchemaShape);
        
        Console.WriteLine("Schema-based rules:");
        foreach (var rule in schemaRules)
        {
            Console.WriteLine($"- {rule.Id}: {rule.Title}");
            Console.WriteLine($"  Confidence: {rule.Confidence}");
            Console.WriteLine($"  {rule.Description}");
        }
    }

    /// <summary>
    /// Example: Browse all available rules
    /// </summary>
    public static void Example_BrowseAllRules()
    {
        Console.WriteLine($"Total lint rules: {LintRuleCatalog.AllRules.Count}");
        Console.WriteLine();

        foreach (var category in Enum.GetValues<LintRuleCategory>())
        {
            var rulesInCategory = LintRuleCatalog.GetRulesByCategory(category);
            Console.WriteLine($"{category} ({rulesInCategory.Count()} rules):");
            
            foreach (var rule in rulesInCategory)
            {
                Console.WriteLine($"  [{rule.Severity}] {rule.Id}: {rule.Title}");
            }
            Console.WriteLine();
        }
    }

    /// <summary>
    /// Example: Use rule metadata in validation service
    /// </summary>
    public static QualityFinding Example_CreateIssueFromCatalog(string ruleId)
    {
        var rule = LintRuleCatalog.GetRuleById(ruleId);
        
        if (rule == null)
        {
            throw new InvalidOperationException($"Rule not found: {ruleId}");
        }

        return new QualityFinding
        {
            RuleId = rule.Id,
            Severity = rule.Severity,
            Message = $"{rule.Description} {rule.Disclaimer}",
            Details = new Dictionary<string, object>
            {
                ["ruleTitle"] = rule.Title,
                ["confidence"] = rule.Confidence,
                ["category"] = rule.Category.ToString()
            }
        };
    }

    /// <summary>
    /// Example: Filter rules by confidence level
    /// </summary>
    public static void Example_FilterByConfidence()
    {
        var highConfidenceRules = LintRuleCatalog.AllRules
            .Where(r => r.Confidence == "high")
            .ToList();
        
        Console.WriteLine($"High confidence rules: {highConfidenceRules.Count}");
        
        var mediumConfidenceRules = LintRuleCatalog.AllRules
            .Where(r => r.Confidence == "medium")
            .ToList();
        
        Console.WriteLine($"Medium confidence rules: {mediumConfidenceRules.Count}");
    }

    /// <summary>
    /// Example: Check if a rule applies to a specific FHIR version
    /// </summary>
    public static bool Example_IsRuleApplicable(string ruleId, string fhirVersion)
    {
        var rule = LintRuleCatalog.GetRuleById(ruleId);
        
        if (rule == null)
        {
            return false;
        }

        return rule.ApplicableFhirVersions.Contains(fhirVersion);
    }
}
