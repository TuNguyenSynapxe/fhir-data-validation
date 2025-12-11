using Microsoft.Extensions.DependencyInjection;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Services;

namespace Pss.FhirProcessor.Engine.DependencyInjection;

/// <summary>
/// Dependency injection registration for FhirProcessor.Engine
/// </summary>
public static class EngineServiceCollectionExtensions
{
    /// <summary>
    /// Registers all FhirProcessor.Engine services
    /// </summary>
    public static IServiceCollection AddFhirProcessorEngine(this IServiceCollection services)
    {
        services.AddScoped<IValidationPipeline, ValidationPipeline>();
        services.AddScoped<IFirelyValidationService, FirelyValidationService>();
        services.AddScoped<IFhirPathRuleEngine, FhirPathRuleEngine>();
        services.AddScoped<ICodeMasterEngine, CodeMasterEngine>();
        services.AddScoped<IReferenceResolver, ReferenceResolver>();
        services.AddScoped<ISmartPathNavigationService, SmartPathNavigationService>();
        services.AddScoped<IUnifiedErrorModelBuilder, UnifiedErrorModelBuilder>();

        return services;
    }
}
