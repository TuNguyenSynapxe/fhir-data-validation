namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Request model for saving validation settings
/// </summary>
public class SaveValidationSettingsRequest
{
    public required string ValidationSettingsJson { get; set; }
}
