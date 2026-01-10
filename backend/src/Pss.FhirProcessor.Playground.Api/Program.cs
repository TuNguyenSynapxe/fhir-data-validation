using Microsoft.EntityFrameworkCore;
using Npgsql;
using Pss.FhirProcessor.Engine.DependencyInjection;
using Pss.FhirProcessor.Engine.Navigation.Structure;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Repositories;
using Pss.FhirProcessor.Playground.Api.Commands;
using Pss.FhirProcessor.Playground.Api.Services;
using Pss.FhirProcessor.Playground.Api.Storage;
using Serilog;
using Serilog.Events;

// Configure Serilog early for startup logging
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("System", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        path: "logs/fhir-processor-.log",
        rollingInterval: RollingInterval.Day,
        rollOnFileSizeLimit: true,
        fileSizeLimitBytes: 10 * 1024 * 1024, // 10MB
        retainedFileCountLimit: 7,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

try
{
    Log.Information("Starting FHIR Processor V2 API");

    // Check for command-line commands
    if (args.Length > 0 && args[0] == "import-fhir-examples")
    {
        var host = Host.CreateDefaultBuilder(args)
            .UseSerilog()
            .Build();

        var exitCode = await ImportExamplesCommand.ExecuteAsync(args, host);
        Log.Information("Import command completed with exit code {ExitCode}", exitCode);
        return exitCode;
    }

    var builder = WebApplication.CreateBuilder(args);

    // Replace default logging with Serilog
    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithMachineName()
        .Enrich.WithThreadId());

    // Add services to the container
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();

    // Register FhirProcessor.Engine services
    builder.Services.AddFhirProcessorEngine();

    // PLAYGROUND OVERRIDES: Use KnownFhirStructureHintProvider + FallbackToFirst policy for tolerant navigation
    // Engine defaults:
    //   - NullFhirStructureHintProvider (strict structure assumptions)
    //   - EntryResolutionPolicy.Strict (requires explicit entryIndex)
    // Playground overrides:
    //   - KnownFhirStructureHintProvider (10 resource types with known repeating fields)
    //   - EntryResolutionPolicy.FallbackToFirst (allows implicit entry[0] fallback)
    builder.Services.AddSingleton<IFhirStructureHintProvider, KnownFhirStructureHintProvider>();
    builder.Services.AddScoped<Pss.FhirProcessor.Engine.Navigation.IJsonPointerResolver>(sp =>
    {
        var structureHints = sp.GetRequiredService<IFhirStructureHintProvider>();
        return new Pss.FhirProcessor.Engine.Navigation.JsonPointerResolver(
            structureHints, 
            Pss.FhirProcessor.Engine.Navigation.EntryResolutionPolicy.FallbackToFirst);
    });
    Log.Information("Playground configured with KnownFhirStructureHintProvider + FallbackToFirst policy for tolerant navigation");

    // Register Terminology Services (Phase 2)
    // Configure base data path for file-based storage
    var baseDataPath = builder.Configuration.GetValue<string>("TerminologyDataPath") 
        ?? Path.Combine(Directory.GetCurrentDirectory(), "data", "terminology");
    builder.Services.AddTerminologyServices(baseDataPath);
    Log.Information("Terminology services configured with data path: {DataPath}", baseDataPath);

    // Register Persistence Layer (PostgreSQL for all project operations)
    // Shared connection for both public and admin operations
    builder.Services.AddScoped<NpgsqlConnection>(sp =>
    {
        var connString = builder.Configuration.GetConnectionString("PostgreSQL");
        if (string.IsNullOrWhiteSpace(connString))
        {
            Log.Warning("PostgreSQL connection string not configured - persistence layer will be unavailable");
            throw new InvalidOperationException("PostgreSQL connection string 'PostgreSQL' is not configured");
        }
        return new NpgsqlConnection(connString);
    });
    
    // Register Entity Framework Core DbContext
    builder.Services.AddDbContext<FhirProcessorDbContext>(options =>
    {
        var connString = builder.Configuration.GetConnectionString("PostgreSQL");
        options.UseNpgsql(connString);
    });
    
    // Register PostgresProjectRepository for both public and admin use
    builder.Services.AddScoped<Pss.FhirProcessor.Persistence.Repositories.IProjectRepository, PostgresProjectRepository>();
    
    // Register BundleProfileRepository for multi-bundle support
    builder.Services.AddScoped<Pss.FhirProcessor.Persistence.Repositories.IBundleProfileRepository>(sp =>
    {
        var connString = builder.Configuration.GetConnectionString("PostgreSQL");
        var logger = sp.GetRequiredService<ILogger<PostgresBundleProfileRepository>>();
        return new PostgresBundleProfileRepository(connString!, logger);
    });
    
    Log.Information("Persistence layer configured with PostgreSQL (admin + public + bundle profiles)");

    // Register Playground API services (authoring services now use PostgreSQL)
    builder.Services.AddScoped<IProjectService, ProjectService>();
    builder.Services.AddScoped<IRuleService, RuleService>();

    // Register Phase 7.2 Import Services
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.Import.SimplifierPackageParser>();
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.Import.ArtifactClassifier>();
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.Import.StructureDefinitionClassifier>(); // Phase 10.0
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.Import.StructureDefinitionRuleGenerator>();
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.Import.ProjectImportService>();
    Log.Information("Import services registered (Phase 7.2 + 7.3 + 10.0)");

    // Register Phase 7.4 Query Services (read-only)
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.Queries.ProjectQueryService>();
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.Queries.ProjectArtifactQueryService>();
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.Queries.ProjectBundleQueryService>();
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.Queries.ProjectRuleQueryService>();
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.Queries.ProjectStructureDefinitionQueryService>(); // Phase 10.1
    Log.Information("Query services registered (Phase 7.4 + 10.1 - read-only)");

    // Register Phase 9.4 Rule Management Command Service (manual rule CRUD)
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.Commands.ProjectRuleCommandService>();
    Log.Information("Rule management command service registered (Phase 9.4 - manual rule CRUD)");

    // Register Phase 8.3 Bundle Profile Resolution Service
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.BundleProfiles.IBundleProfileResolutionService,
        Pss.FhirProcessor.Application.Projects.BundleProfiles.BundleProfileResolutionService>();
    Log.Information("Bundle profile resolution service registered (Phase 8.3)");

    // Register Phase 8.1 Validation Execution Service
    builder.Services.AddScoped<Pss.FhirProcessor.Application.ValidationExecution.Interfaces.IProjectValidationExecutionService,
        Pss.FhirProcessor.Application.ValidationExecution.ProjectValidationExecutionService>();
    Log.Information("Validation execution service registered (Phase 8.1)");

    // Register Phase 9.5a Public Validation Service
    builder.Services.AddScoped<Pss.FhirProcessor.Application.Public.IPublicValidationService,
        Pss.FhirProcessor.Application.Public.PublicValidationService>();
    Log.Information("Public validation service registered (Phase 9.5a - read-only anonymous access)");

    // Add CORS for frontend
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
    });

    var app = builder.Build();

    // Configure the HTTP request pipeline
    app.UseSerilogRequestLogging(options =>
    {
        options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        options.GetLevel = (httpContext, elapsed, ex) => ex != null
            ? LogEventLevel.Error
            : elapsed > 10000
                ? LogEventLevel.Warning
                : LogEventLevel.Debug;
    });

    app.UseCors();
    app.UseHttpsRedirection();
    app.MapControllers();

    Log.Information("FHIR Processor V2 API started successfully");
    app.Run();

    return 0;
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
    return 1;
}
finally
{
    Log.CloseAndFlush();
}

// Make Program accessible for integration tests
public partial class Program { }
