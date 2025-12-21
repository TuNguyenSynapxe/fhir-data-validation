using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Pss.FhirProcessor.Engine.Services;
using Microsoft.Extensions.Logging;

// Test script to debug hint generation
var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole().SetMinimumLevel(LogLevel.Debug));
var logger = loggerFactory.CreateLogger<Hl7SpecHintGenerator>();

var generator = new Hl7SpecHintGenerator(logger);

var sdDirectory = "/Users/tunguyen/Library/CloudStorage/OneDrive-Personal/Synapxe/PSS_V2/fhir_processor_v2/backend/specs/fhir/r4/StructureDefinitions";

Console.WriteLine($"Loading StructureDefinitions from: {sdDirectory}");
Console.WriteLine($"Directory exists: {Directory.Exists(sdDirectory)}");

if (Directory.Exists(sdDirectory))
{
    var files = Directory.GetFiles(sdDirectory, "StructureDefinition-Patient.json");
    Console.WriteLine($"Found {files.Length} Patient StructureDefinition files");
    
    var hints = generator.GenerateHints(sdDirectory, "R4");
    
    Console.WriteLine($"\nTotal resource types with hints: {hints.Count}");
    
    if (hints.TryGetValue("Patient", out var patientHints))
    {
        Console.WriteLine($"\nPatient hints: {patientHints.Count}");
        
        var commHints = patientHints.Where(h => h.Path.Contains("communication")).ToList();
        Console.WriteLine($"\nCommunication-related hints: {commHints.Count}");
        
        foreach (var hint in commHints)
        {
            Console.WriteLine($"\nPath: {hint.Path}");
            Console.WriteLine($"IsConditional: {hint.IsConditional}");
            Console.WriteLine($"Condition: {hint.Condition}");
            Console.WriteLine($"AppliesToEach: {hint.AppliesToEach}");
            Console.WriteLine($"Reason: {hint.Reason}");
        }
    }
    else
    {
        Console.WriteLine("\nNo Patient hints found!");
    }
}
