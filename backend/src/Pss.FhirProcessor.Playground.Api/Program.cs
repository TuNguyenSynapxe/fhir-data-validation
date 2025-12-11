using Pss.FhirProcessor.Engine.DependencyInjection;
using Pss.FhirProcessor.Playground.Api.Services;
using Pss.FhirProcessor.Playground.Api.Storage;

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
