using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Validates Observation.component question/answer codes against CodeMaster definitions
/// </summary>
public interface ICodeMasterEngine
{
    /// <summary>
    /// Validates Observation.component[*] structure:
    /// - Question codes must exist in CodeMaster
    /// - Answer values must be in allowed list
    /// - Screening-type alignment
    /// - Multi-value vs single-value correctness
    /// </summary>
    Task<List<CodeMasterValidationError>> ValidateAsync(Bundle bundle, CodeMasterDefinition codeMaster, CancellationToken cancellationToken = default);
}
