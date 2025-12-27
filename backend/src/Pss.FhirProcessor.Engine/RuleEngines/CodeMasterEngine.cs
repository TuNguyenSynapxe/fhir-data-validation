using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.RuleEngines;

/// <summary>
/// Validates Observation.component question/answer codes against CodeMaster definitions
/// </summary>
public class CodeMasterEngine : ICodeMasterEngine
{
    public async Task<List<CodeMasterValidationError>> ValidateAsync(Bundle bundle, CodeMasterDefinition codeMaster, CancellationToken cancellationToken = default)
    {
        var errors = new List<CodeMasterValidationError>();
        
        if (codeMaster?.ScreeningTypes == null || !codeMaster.ScreeningTypes.Any())
            return errors;
        
        // Find all Observation resources in bundle
        var observations = bundle.Entry
            .Where(e => e.Resource is Observation)
            .Select((e, i) => new { Observation = (Observation)e.Resource, Index = i })
            .ToList();
        
        foreach (var item in observations)
        {
            var obs = item.Observation;
            var entryIndex = item.Index;
            
            // Get screening type from observation code
            var screeningType = GetScreeningType(obs);
            
            if (string.IsNullOrEmpty(screeningType))
                continue;
            
            // Find matching screening type in CodeMaster
            var screeningDef = codeMaster.ScreeningTypes
                .FirstOrDefault(st => st.Code == screeningType);
            
            if (screeningDef == null)
            {
                errors.Add(new CodeMasterValidationError
                {
                    Severity = "error",
                    ResourceType = "Observation",
                    Path = "Observation.code",
                    ErrorCode = "UNKNOWN_SCREENING_TYPE",
                    Details = new Dictionary<string, object>
                    {
                        ["screeningType"] = screeningType
                    },
                    EntryIndex = entryIndex,
                    ResourceId = obs.Id
                });
                continue;
            }
            
            // Validate each component
            if (obs.Component != null)
            {
                for (int compIdx = 0; compIdx < obs.Component.Count; compIdx++)
                {
                    var component = obs.Component[compIdx];
                    var componentErrors = ValidateComponent(component, screeningDef, entryIndex, compIdx, obs.Id);
                    errors.AddRange(componentErrors);
                }
            }
        }
        
        return await System.Threading.Tasks.Task.FromResult(errors);
    }
    
    private string? GetScreeningType(Observation observation)
    {
        // Look for screening type in observation.code.coding
        if (observation.Code?.Coding != null)
        {
            foreach (var coding in observation.Code.Coding)
            {
                // Adjust system matching based on your CodeMaster setup
                if (!string.IsNullOrEmpty(coding.Code))
                    return coding.Code;
            }
        }
        
        return null;
    }
    
    private List<CodeMasterValidationError> ValidateComponent(
        Observation.ComponentComponent component,
        ScreeningType screeningDef,
        int entryIndex,
        int componentIndex,
        string resourceId)
    {
        var errors = new List<CodeMasterValidationError>();
        
        // Get question code
        var questionCode = component.Code?.Coding?.FirstOrDefault()?.Code;
        
        if (string.IsNullOrEmpty(questionCode))
        {
            errors.Add(new CodeMasterValidationError
            {
                Severity = "error",
                ResourceType = "Observation",
                Path = $"Observation.component[{componentIndex}].code",
                ErrorCode = "MISSING_QUESTION_CODE",
                EntryIndex = entryIndex,
                ResourceId = resourceId
            });
            return errors;
        }
        
        // Find question definition in CodeMaster
        var questionDef = screeningDef.Questions
            .FirstOrDefault(q => q.Code == questionCode);
        
        if (questionDef == null)
        {
            errors.Add(new CodeMasterValidationError
            {
                Severity = "error",
                ResourceType = "Observation",
                Path = $"Observation.component[{componentIndex}].code",
                ErrorCode = "INVALID_QUESTION_CODE",
                Details = new Dictionary<string, object>
                {
                    ["questionCode"] = questionCode,
                    ["screeningType"] = screeningDef.Code
                },
                EntryIndex = entryIndex,
                ResourceId = resourceId
            });
            return errors;
        }
        
        // Validate answer values
        var answerErrors = ValidateAnswers(component, questionDef, entryIndex, componentIndex, resourceId);
        errors.AddRange(answerErrors);
        
        return errors;
    }
    
    private List<CodeMasterValidationError> ValidateAnswers(
        Observation.ComponentComponent component,
        QuestionDefinition questionDef,
        int entryIndex,
        int componentIndex,
        string resourceId)
    {
        var errors = new List<CodeMasterValidationError>();
        
        if (questionDef.AllowedAnswers == null || !questionDef.AllowedAnswers.Any())
            return errors;
        
        // Extract answer value(s)
        var answerValues = new List<string>();
        
        if (component.Value is CodeableConcept cc)
        {
            foreach (var coding in cc.Coding ?? Enumerable.Empty<Coding>())
            {
                if (!string.IsNullOrEmpty(coding.Code))
                    answerValues.Add(coding.Code);
            }
        }
        else if (component.Value is Coding coding)
        {
            if (!string.IsNullOrEmpty(coding.Code))
                answerValues.Add(coding.Code);
        }
        else if (component.Value is FhirString str)
        {
            if (!string.IsNullOrEmpty(str.Value))
                answerValues.Add(str.Value);
        }
        else if (component.Value is Integer intVal)
        {
            answerValues.Add(intVal.Value.ToString());
        }
        else if (component.Value is FhirBoolean boolVal)
        {
            answerValues.Add(boolVal.Value.ToString()?.ToLower() ?? "");
        }
        
        // Check multi-value constraint
        if (!questionDef.MultiValue && answerValues.Count > 1)
        {
            errors.Add(new CodeMasterValidationError
            {
                Severity = "error",
                ResourceType = "Observation",
                Path = $"Observation.component[{componentIndex}].value",
                ErrorCode = "MULTIPLE_VALUES_NOT_ALLOWED",
                Details = new Dictionary<string, object>
                {
                    ["questionCode"] = questionDef.Code,
                    ["valueCount"] = answerValues.Count
                },
                EntryIndex = entryIndex,
                ResourceId = resourceId
            });
        }
        
        // Validate each answer against allowed values
        var allowedCodes = questionDef.AllowedAnswers
            .Select(a => a.Code ?? "")
            .Where(c => !string.IsNullOrEmpty(c))
            .ToList();
        
        foreach (var answerValue in answerValues)
        {
            if (!allowedCodes.Contains(answerValue))
            {
                errors.Add(new CodeMasterValidationError
                {
                    Severity = "error",
                    ResourceType = "Observation",
                    Path = $"Observation.component[{componentIndex}].value",
                    ErrorCode = "INVALID_ANSWER_VALUE",
                    Details = new Dictionary<string, object>
                    {
                        ["actualValue"] = answerValue,
                        ["allowedValues"] = allowedCodes
                    },
                    EntryIndex = entryIndex,
                    ResourceId = resourceId
                });
            }
        }
        
        return errors;
    }
}