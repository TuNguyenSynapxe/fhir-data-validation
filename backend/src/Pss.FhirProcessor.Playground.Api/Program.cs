using Pss.FhirProcessor.Engine.DependencyInjection;
using Pss.FhirProcessor.Playground.Api.Commands;
using Pss.FhirProcessor.Playground.Api.Services;
using Pss.FhirProcessor.Playground.Api.Storage;

// Check for command-line commands
if (args.Length > 0 && args[0] == "import-fhir-examples")
{
    var host = Host.CreateDefaultBuilder(args)
        .ConfigureLogging(logging =>
        {
            logging.ClearProviders();
            logging.AddConsole();
        })
        .Build();

    var exitCode = await ImportExamplesCommand.ExecuteAsync(args, host);
    return exitCode;
}

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Register FhirProcessor.Engine services
builder.Services.AddFhirProcessorEngine();

// Register Playground API services
builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
builder.Services.AddScoped<IProjectService, ProjectService>();

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
app.UseCors();
app.UseHttpsRedirection();
app.MapControllers();

app.Run();

return 0;

// Make Program accessible for integration tests
public partial class Program { }
