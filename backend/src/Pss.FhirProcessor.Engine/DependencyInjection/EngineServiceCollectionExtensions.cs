using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Services.Terminology;
using Pss.FhirProcessor.Engine.Services.Questions;
using Pss.FhirProcessor.Engine.Validation.QuestionAnswer;

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
        // Register FHIR R4 Model Resolver as Singleton (expensive to initialize, thread-safe)
        // NOTE: FHIR R5 support will be added in a future release by introducing FhirR5ModelResolverService and a factory
        services.AddSingleton<IFhirModelResolverService, FhirR4ModelResolverService>();
        
        // Register FHIR Sample Provider as Singleton (caches samples at startup)
        services.AddSingleton<IFhirSampleProvider, FhirSampleProvider>();
        
        // Register schema and exploration services
        services.AddScoped<ISchemaExpansionService, SchemaExpansionService>();
        services.AddScoped<IFhirSchemaService, FhirSchemaService>();
        services.AddScoped<IBundlePathExplorer, BundlePathExplorer>();
        services.AddScoped<IFhirPathValidationService, FhirPathValidationService>();
        
        // Register validation services
        services.AddScoped<IValidationPipeline, ValidationPipeline>();
        services.AddScoped<ILintValidationService, LintValidationService>(); // Pre-FHIR best-effort lint layer
        
        // Register Hl7SpecHintGenerator for auto-generating hints
        services.AddSingleton<Hl7SpecHintGenerator>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<Hl7SpecHintGenerator>>();
            return new Hl7SpecHintGenerator(logger);
        });
        
        // Register SpecHintService with auto-generation support
        services.AddScoped<ISpecHintService>(sp =>
        {
            var generator = sp.GetRequiredService<Hl7SpecHintGenerator>();
            var logger = sp.GetRequiredService<ILogger<SpecHintService>>();
            return new SpecHintService(generator, logger);
        });
        
        services.AddScoped<IFirelyValidationService, FirelyValidationService>();
        services.AddScoped<IFhirPathRuleEngine, FhirPathRuleEngine>();
        services.AddScoped<ICodeMasterEngine, CodeMasterEngine>();
        services.AddScoped<IReferenceResolver, ReferenceResolver>();
        services.AddScoped<ISmartPathNavigationService, SmartPathNavigationService>();
        services.AddScoped<IUnifiedErrorModelBuilder, UnifiedErrorModelBuilder>();
        
        // Register System Rule Suggestion Service (deterministic pattern analysis)
        services.AddScoped<ISystemRuleSuggestionService, SystemRuleSuggestionService>();

        return services;
    }

    /// <summary>
    /// Registers terminology authoring services (Phase 2)
    /// Requires baseDataPath configuration for file-based storage
    /// </summary>
    public static IServiceCollection AddTerminologyServices(this IServiceCollection services, string baseDataPath)
    {
        // Register terminology CRUD services with file-based storage
        services.AddScoped<ITerminologyService>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<TerminologyService>>();
            return new TerminologyService(logger, baseDataPath);
        });

        services.AddScoped<IConstraintService>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<ConstraintService>>();
            return new ConstraintService(logger, baseDataPath);
        });

        // Register Rule Advisory service
        services.AddScoped<IRuleAdvisoryService, RuleAdvisoryService>();

        // Register Question services (Phase 3A)
        services.AddScoped<IQuestionService>(sp =>
        {
            return new QuestionService(baseDataPath);
        });

        // Register QuestionAnswer validation services (Phase 3D)
        services.AddScoped<QuestionAnswerValueExtractor>();
        services.AddScoped<QuestionAnswerValidator>();

        return services;
    }
}
