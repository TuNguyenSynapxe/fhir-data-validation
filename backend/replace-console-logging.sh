#!/bin/bash

# Replace Console.WriteLine with proper ILogger calls in FhirPathRuleEngine.cs

FILE="src/Pss.FhirProcessor.Engine/Services/FhirPathRuleEngine.cs"

echo "Replacing Console.WriteLine with ILogger calls in $FILE..."

# ValidateJsonAsync - starting message
sed -i '' 's/Console\.WriteLine("\[ValidateJsonAsync\] No rules to validate");/_logger.LogDebug("ValidateJsonAsync: No rules to validate");/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] Starting with {ruleSet\.Rules\.Count} rules");/_logger.LogDebug("ValidateJsonAsync starting with {RuleCount} rules", ruleSet.Rules.Count);/g' "$FILE"

# ValidateJsonAsync - entry processing
sed -i '' 's/Console\.WriteLine("\[ValidateJsonAsync\] No '\''entry'\'' array in bundle");/_logger.LogWarning("ValidateJsonAsync: No '\''entry'\'' array in bundle");/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] Found {entryCount} bundle entries");/_logger.LogDebug("ValidateJsonAsync found {EntryCount} bundle entries", entryCount);/g' "$FILE"

# ValidateJsonAsync - entry details
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] Entry {entryIndex}: No resource property");/_logger.LogWarning("ValidateJsonAsync Entry {EntryIndex}: No resource property", entryIndex);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] Entry {entryIndex}: No resourceType in resource");/_logger.LogWarning("ValidateJsonAsync Entry {EntryIndex}: No resourceType in resource", entryIndex);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] Entry {entryIndex}: Empty resourceType");/_logger.LogWarning("ValidateJsonAsync Entry {EntryIndex}: Empty resourceType", entryIndex);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] Entry {entryIndex}: Found resource type '\''{resourceType}'\''");/_logger.LogTrace("ValidateJsonAsync Entry {EntryIndex}: Found resource type {ResourceType}", entryIndex, resourceType);/g' "$FILE"

# ValidateJsonAsync - rule evaluation
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] No rules for resource type: {resourceType}");/_logger.LogTrace("ValidateJsonAsync: No rules for resource type {ResourceType}", resourceType);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] Evaluating {matchingRules\.Count} rules for {resourceType} at entry {entryIndex}");/_logger.LogDebug("ValidateJsonAsync: Evaluating {RuleCount} rules for {ResourceType} at entry {EntryIndex}", matchingRules.Count, resourceType, entryIndex);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] Entry {entryIndex}: Could not get ISourceNode for resource");/_logger.LogWarning("ValidateJsonAsync Entry {EntryIndex}: Could not get ISourceNode for resource", entryIndex);/g' "$FILE"

# ValidateJsonAsync - rule results
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] Rule {rule\.Id} ({rule\.Type}) produced {ruleErrors\.Count} error(s)");/_logger.LogTrace("ValidateJsonAsync: Rule {RuleId} ({RuleType}) produced {ErrorCount} errors", rule.Id, rule.Type, ruleErrors.Count);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] Error validating rule {rule\.Id}: {ex\.Message}");/_logger.LogError("ValidateJsonAsync: Error validating rule {RuleId}: {ErrorMessage}", rule.Id, ex.Message);/g' "$FILE"

# ValidateJsonAsync - final results
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] Error parsing JSON: {ex\.Message}");/_logger.LogError("ValidateJsonAsync: Error parsing JSON: {ErrorMessage}", ex.Message);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ValidateJsonAsync\] Returning {errors\.Count} total errors");/_logger.LogDebug("ValidateJsonAsync returning {TotalErrors} total errors", errors.Count);/g' "$FILE"

# ARRAYLENGTH DEBUG - detailed logging
sed -i '' 's/Console\.WriteLine($"\[ARRAYLENGTH DEBUG\] Rule {rule\.Id}, Original Path: {rule\.Path}, Clean Path: {cleanPath}, Parts: {string\.Join(", ", pathParts)}");/_logger.LogTrace("ArrayLength validation: Rule {RuleId}, Path: {OriginalPath} -> {CleanPath}, Parts: {PathParts}", rule.Id, rule.Path, cleanPath, string.Join(", ", pathParts));/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ARRAYLENGTH DEBUG\] Simple path '\''{targetArrayName}'\'': found {arrayNode\.Count} elements");/_logger.LogTrace("ArrayLength: Simple path {ArrayName} has {ElementCount} elements", targetArrayName, arrayNode.Count);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ARRAYLENGTH DEBUG\] Parent '\''{pathParts\[0\]}'\'': found {parentNodes\.Count} elements");/_logger.LogTrace("ArrayLength: Parent {ParentName} has {ElementCount} elements", pathParts[0], parentNodes.Count);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ARRAYLENGTH DEBUG\] Specific index requested: \[{specificIndex}\]");/_logger.LogTrace("ArrayLength: Checking specific index [{SpecificIndex}]", specificIndex);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ARRAYLENGTH DEBUG\] Skipping parent\[{parentIndex}\] (only checking \[{specificIndex}\])");/_logger.LogTrace("ArrayLength: Skipping parent[{ParentIndex}] (only checking [{SpecificIndex}])", parentIndex, specificIndex);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ARRAYLENGTH DEBUG\] Parent\[{parentIndex}\]\.{targetArrayName}: found {arrayElements\.Count} elements");/_logger.LogTrace("ArrayLength: Parent[{ParentIndex}].{ArrayName} has {ElementCount} elements", parentIndex, targetArrayName, arrayElements.Count);/g' "$FILE"

# ARRAYLENGTH VALIDATE
sed -i '' 's/Console\.WriteLine($"\[ARRAYLENGTH VALIDATE\] Count: {count}, Rule Params: {(rule\.Params != null ? string\.Join(", ", rule\.Params\.Select(kv => $"{kv\.Key}={kv\.Value}")) : "null")}");/_logger.LogTrace("ArrayLength validation: Count={Count}, Params={Params}", count, rule.Params != null ? string.Join(", ", rule.Params.Select(kv => $"{kv.Key}={kv.Value}")) : "null");/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ARRAYLENGTH VALIDATE\] Min constraint: {min}, Count: {count}, Violation: {count < min}");/_logger.LogTrace("ArrayLength: Min constraint {Min}, Count {Count}, Violation: {Violation}", min, count, count < min);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ARRAYLENGTH VALIDATE\] Max constraint: {max}, Count: {count}, Violation: {count > max}");/_logger.LogTrace("ArrayLength: Max constraint {Max}, Count {Count}, Violation: {Violation}", max, count, count > max);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ARRAYLENGTH VALIDATE\] HasError: {hasError}, Will add error: {hasError}");/_logger.LogTrace("ArrayLength validation result: HasError={HasError}", hasError);/g' "$FILE"

# ValidateRequired
sed -i '' 's/Console\.WriteLine($"\[ValidateRequired\] Rule: {rule\.Id}, Path: {rule\.Path}, ResourceType: {rule\.ResourceType}");/_logger.LogTrace("ValidateRequired: Rule {RuleId}, Path {Path}, ResourceType {ResourceType}", rule.Id, rule.Path, rule.ResourceType);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ValidateRequired\] Result count: {result?\.Count() ?? 0}");/_logger.LogTrace("ValidateRequired: Result count {ResultCount}", result?.Count() ?? 0);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ValidateRequired\] Value: '\''{strValue}'\'', IsNullOrWhiteSpace: {string\.IsNullOrWhiteSpace(strValue)}");/_logger.LogTrace("ValidateRequired: Value={Value}, IsEmpty={IsEmpty}", strValue, string.IsNullOrWhiteSpace(strValue));/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"\[ValidateRequired\] isMissing: {isMissing}, isAllEmpty: {isAllEmpty}");/_logger.LogTrace("ValidateRequired: IsMissing={IsMissing}, IsAllEmpty={IsAllEmpty}", isMissing, isAllEmpty);/g' "$FILE"

# Other console lines
sed -i '' 's/Console\.WriteLine($"\[ValidateRuleOnSourceNode\] Rule type {rule\.Type} not yet implemented for JSON fallback");/_logger.LogWarning("ValidateRuleOnSourceNode: Rule type {RuleType} not yet implemented for JSON fallback", rule.Type);/g' "$FILE"
sed -i '' 's/Console\.WriteLine($"Error in ValidateRuleOnSourceNode: {ex\.Message}");/_logger.LogError("Error in ValidateRuleOnSourceNode: {ErrorMessage}", ex.Message);/g' "$FILE"

echo "Console.WriteLine replacement complete!"
