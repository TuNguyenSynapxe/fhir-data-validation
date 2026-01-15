using System.CommandLine;
using Pss.FhirProcessor.Terminology.ImportTool;

var rootCommand = new RootCommand("HL7 R5 Terminology Import Tool");

var generateCommand = new Command("generate-hl7-r5", "Generate HL7 R5 terminology registry from FHIR package");

var inputOption = new Option<string>(
    aliases: new[] { "--input", "-i" },
    description: "Path to HL7 R5 package folder containing CodeSystem-*.json and ValueSet-*.json files")
{
    IsRequired = true
};

var outputOption = new Option<string>(
    aliases: new[] { "--output", "-o" },
    description: "Output directory for generated registry JSON files")
{
    IsRequired = true
};

generateCommand.AddOption(inputOption);
generateCommand.AddOption(outputOption);

generateCommand.SetHandler(async (string inputPath, string outputPath) =>
{
    try
    {
        Console.WriteLine($"HL7 R5 Terminology Import Tool");
        Console.WriteLine($"Input:  {inputPath}");
        Console.WriteLine($"Output: {outputPath}");
        Console.WriteLine();

        var importer = new Hl7R5Importer();
        var result = await importer.ImportAsync(inputPath, outputPath);

        Console.WriteLine($"✓ Imported {result.CodeSystemCount} CodeSystems");
        Console.WriteLine($"✓ Imported {result.ValueSetCount} ValueSets");
        Console.WriteLine($"✓ Generated {result.IndexEntryCount} search index entries");

        if (result.Warnings.Count > 0)
        {
            Console.WriteLine();
            Console.WriteLine($"⚠ {result.Warnings.Count} warnings:");
            foreach (var warning in result.Warnings.Take(10))
            {
                Console.WriteLine($"  - {warning}");
            }
            if (result.Warnings.Count > 10)
            {
                Console.WriteLine($"  ... and {result.Warnings.Count - 10} more");
            }
        }

        Console.WriteLine();
        Console.WriteLine("✓ Registry generation complete");
        Environment.Exit(0);
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"✗ Error: {ex.Message}");
        Environment.Exit(1);
    }
}, inputOption, outputOption);

rootCommand.AddCommand(generateCommand);
return await rootCommand.InvokeAsync(args);
