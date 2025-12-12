using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Playground.Api.Utilities;

namespace Pss.FhirProcessor.Playground.Api.Commands;

/// <summary>
/// Command-line handler for importing FHIR examples
/// Usage: dotnet run -- import-fhir-examples [--force-redownload]
/// </summary>
public static class ImportExamplesCommand
{
    public static async Task<int> ExecuteAsync(string[] args, IHost host)
    {
        var logger = host.Services.GetRequiredService<ILogger<FhirExampleImporter>>();
        var importer = new FhirExampleImporter(logger);

        var forceRedownload = args.Contains("--force-redownload", StringComparer.OrdinalIgnoreCase);

        Console.WriteLine("=".PadRight(70, '='));
        Console.WriteLine("FHIR R4 Example Importer");
        Console.WriteLine("=".PadRight(70, '='));
        Console.WriteLine();
        Console.WriteLine("This utility imports official HL7 FHIR R4 examples from:");
        Console.WriteLine("https://www.hl7.org/fhir/R4/fhir-spec.zip");
        Console.WriteLine();
        Console.WriteLine($"Force Re-download: {forceRedownload}");
        Console.WriteLine();

        var result = await importer.ImportExamplesAsync(forceRedownload);

        Console.WriteLine();
        Console.WriteLine("=".PadRight(70, '='));
        Console.WriteLine("Import Summary");
        Console.WriteLine("=".PadRight(70, '='));
        Console.WriteLine();
        Console.WriteLine($"✓ Imported: {result.ImportedCount} files");
        Console.WriteLine($"⊘ Skipped:  {result.Skipped.Count} files");
        Console.WriteLine($"✗ Errors:   {result.Errors.Count}");
        Console.WriteLine();

        if (result.ImportedFiles.Count > 0)
        {
            Console.WriteLine("Imported by Resource Type:");
            var byResourceType = result.ImportedFiles
                .GroupBy(f => f.ResourceType)
                .OrderBy(g => g.Key);

            foreach (var group in byResourceType)
            {
                Console.WriteLine($"  {group.Key}: {group.Count()} files");
            }
            Console.WriteLine();
        }

        if (result.Errors.Count > 0)
        {
            Console.WriteLine("Errors:");
            foreach (var error in result.Errors.Take(10))
            {
                Console.WriteLine($"  - {error}");
            }
            if (result.Errors.Count > 10)
            {
                Console.WriteLine($"  ... and {result.Errors.Count - 10} more");
            }
            Console.WriteLine();
        }

        Console.WriteLine("=".PadRight(70, '='));
        Console.WriteLine();

        return result.Errors.Count > 0 ? 1 : 0;
    }
}
