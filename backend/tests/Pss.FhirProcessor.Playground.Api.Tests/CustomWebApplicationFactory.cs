using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Pss.FhirProcessor.Playground.Api.Storage;

namespace Pss.FhirProcessor.Playground.Api.Tests;

/// <summary>
/// Custom WebApplicationFactory for integration testing with isolated storage
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _tempStoragePath;

    public CustomWebApplicationFactory()
    {
        _tempStoragePath = Path.Combine(Path.GetTempPath(), $"FhirProcessor_Test_{Guid.NewGuid()}");
        Directory.CreateDirectory(_tempStoragePath);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, config) =>
        {
            // Override storage path with temp directory
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ProjectStorage:Path"] = _tempStoragePath
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace ProjectRepository with test implementation if needed
            // Currently using the default implementation with temp storage
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            // Cleanup temp storage folder
            try
            {
                if (Directory.Exists(_tempStoragePath))
                {
                    Directory.Delete(_tempStoragePath, true);
                }
            }
            catch
            {
                // Best effort cleanup
            }
        }

        base.Dispose(disposing);
    }
}
