using System.CommandLine;

namespace Pss.FhirProcessor.RuleMigration;

/// <summary>
/// PHASE 5: Legacy Rule Migration Tool
/// Entry point for command-line tool
/// 
/// Usage:
///   dotnet run -- migrate --input rules.json --output rules.migrated.json
/// </summary>
class Program
{
    static async Task<int> Main(string[] args)
    {
        var rootCommand = new RootCommand("FHIR Processor V2 - Legacy Rule Migration Tool (Phase 5)");

        var migrateCommand = new Command("migrate", "Migrate legacy rules to ErrorCode-First format");

        var inputOption = new Option<FileInfo>(
            aliases: new[] { "--input", "-i" },
            description: "Input rules.json file path"
        ) { IsRequired = true };

        var outputOption = new Option<FileInfo>(
            aliases: new[] { "--output", "-o" },
            description: "Output rules.migrated.json file path"
        ) { IsRequired = true };

        var reportOption = new Option<FileInfo?>(
            aliases: new[] { "--report", "-r" },
            description: "Migration report output path (default: <output>.report.json)",
            getDefaultValue: () => null
        );

        migrateCommand.AddOption(inputOption);
        migrateCommand.AddOption(outputOption);
        migrateCommand.AddOption(reportOption);

        migrateCommand.SetHandler(MigrateRules, inputOption, outputOption, reportOption);

        rootCommand.AddCommand(migrateCommand);

        return await rootCommand.InvokeAsync(args);
    }

    static void MigrateRules(FileInfo inputFile, FileInfo outputFile, FileInfo? reportFile)
    {
        try
        {
            Console.WriteLine("🔒 PHASE 5 — Legacy Rule Migration Tool");
            Console.WriteLine("========================================");
            Console.WriteLine();

            // Validate input file exists
            if (!inputFile.Exists)
            {
                Console.Error.WriteLine($"❌ Error: Input file not found: {inputFile.FullName}");
                Environment.Exit(1);
            }

            Console.WriteLine($"📂 Input:  {inputFile.FullName}");
            Console.WriteLine($"📂 Output: {outputFile.FullName}");
            Console.WriteLine();

            // Load input ruleset
            Console.WriteLine("📖 Loading input ruleset...");
            var inputRuleSet = RuleMigrationEngine.LoadFromFile(inputFile.FullName);
            Console.WriteLine($"   Found {inputRuleSet.Rules.Count} rules");
            Console.WriteLine();

            // Run migration
            Console.WriteLine("🔄 Running migration...");
            var engine = new RuleMigrationEngine();
            var (migratedRuleSet, migrationReport) = engine.Migrate(inputRuleSet);

            // Add file paths to report
            migrationReport.InputFile = inputFile.FullName;
            migrationReport.OutputFile = outputFile.FullName;

            // Display summary
            Console.WriteLine();
            Console.WriteLine("📊 Migration Summary:");
            Console.WriteLine($"   Total Rules:            {migrationReport.Summary.TotalRules}");
            Console.WriteLine($"   ✅ Unchanged:           {migrationReport.Summary.Unchanged}");
            Console.WriteLine($"   ⚠️  Auto-Migrated:       {migrationReport.Summary.AutoMigrated}");
            Console.WriteLine($"   ❌ Manual Review Needed: {migrationReport.Summary.ManualReviewRequired}");
            Console.WriteLine();

            // Save migrated ruleset
            Console.WriteLine("💾 Saving migrated ruleset...");
            RuleMigrationEngine.SaveToFile(migratedRuleSet, outputFile.FullName);
            Console.WriteLine($"   ✅ Saved: {outputFile.FullName}");

            // Save migration report
            var reportPath = reportFile?.FullName ?? $"{outputFile.FullName}.report.json";
            Console.WriteLine();
            Console.WriteLine("📝 Saving migration report...");
            RuleMigrationEngine.SaveReportToFile(migrationReport, reportPath);
            Console.WriteLine($"   ✅ Saved: {reportPath}");

            // Show manual review items if any
            if (migrationReport.Summary.ManualReviewRequired > 0)
            {
                Console.WriteLine();
                Console.WriteLine("⚠️  MANUAL REVIEW REQUIRED:");
                Console.WriteLine("   The following rules could not be automatically migrated:");
                Console.WriteLine();

                foreach (var entry in migrationReport.Rules.Where(r => r.Status == "REQUIRES_MANUAL_REVIEW"))
                {
                    Console.WriteLine($"   • Rule ID: {entry.RuleId}");
                    Console.WriteLine($"     Type:    {entry.RuleType}");
                    Console.WriteLine($"     Reason:  {entry.Reason}");
                    Console.WriteLine();
                }

                Console.WriteLine("   These rules have been EXCLUDED from the output file.");
                Console.WriteLine("   Please manually add appropriate errorCode values and re-run migration.");
            }

            Console.WriteLine();
            Console.WriteLine("✅ Migration complete!");
            
            Environment.Exit(migrationReport.Summary.ManualReviewRequired > 0 ? 2 : 0);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine();
            Console.Error.WriteLine($"❌ Migration failed: {ex.Message}");
            Console.Error.WriteLine();
            Console.Error.WriteLine(ex.StackTrace);
            Environment.Exit(1);
        }
    }
}
