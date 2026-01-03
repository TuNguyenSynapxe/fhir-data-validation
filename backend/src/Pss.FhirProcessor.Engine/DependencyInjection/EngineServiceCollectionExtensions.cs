using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Navigation.Structure;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Services.Terminology;
using Pss.FhirProcessor.Engine.Services.Questions;
using Pss.FhirProcessor.Engine.Validation;
using Pss.FhirProcessor.Engine.Validation.QuestionAnswer;
using Pss.FhirProcessor.Engine.RuleSuggestion.Interfaces;
using Pss.FhirProcessor.Engine.RuleSuggestion.Services;

namespace Pss.FhirProcessor.Engine.DependencyInjection;

/// <summary>
/// Dependency injection registration for FhirProcessor.Engine
/// Supports two modes:
/// 1. Runtime-only (AddRuntimeValidation): Core validation without authoring features
/// 2. Full authoring (AddFhirProcessorEngine): Includes SpecHint, QuestionAnswer, Rule Suggestion
/// </summary>
public static class EngineServiceCollectionExtensions
{
    /// <summary>
    /// Registers RUNTIME-ONLY validation services (DLL-safe, no file I/O)
    /// Includes: Structural validation, Firely validation, Business rules, CodeMaster, References
    /// Excludes: SpecHint auto-generation, QuestionAnswer validation, Rule suggestion
    /// </summary>
    public static IServiceCollection AddRuntimeValidation(this IServiceCollection services)
    {
        // CORE: FHIR Model and Schema Services (stateless, DLL-safe)
        services.AddSingleton<IFhirModelResolverService, FhirR4ModelResolverService>();
        services.AddSingleton<IFhirSampleProvider, FhirSampleProvider>();
        services.AddScoped<ISchemaExpansionService, SchemaExpansionService>();
        services.AddScoped<IFhirSchemaService, FhirSchemaService>();
        
        // CORE: Navigation and Path Resolution (deterministic, no file I/O)
        services.AddScoped<IBundlePathExplorer, BundlePathExplorer>();
        services.AddScoped<IFhirPathValidationService, FhirPathValidationService>();
        services.AddSingleton<IFhirStructureHintProvider, NullFhirStructureHintProvider>();
        services.AddScoped<IJsonPointerResolver>(sp =>
        {
            var structureHints = sp.GetRequiredService<IFhirStructureHintProvider>();
            return new JsonPointerResolver(structureHints, EntryResolutionPolicy.Strict);
        });
        services.AddScoped<ISmartPathNavigationService, SmartPathNavigationService>();
        
        // CORE: Validation Pipeline (runtime-safe)
        services.AddScoped<IValidationPipeline, ValidationPipeline>();
        services.AddScoped<ILintValidationService, LintValidationService>();
        services.AddScoped<IJsonNodeStructuralValidator, JsonNodeStructuralValidator>();
        services.AddSingleton<IFhirEnumIndex, FhirEnumIndex>();
        services.AddScoped<IFirelyValidationService, FirelyValidationService>();
        services.AddScoped<IFhirPathRuleEngine, FhirPathRuleEngine>();
        services.AddScoped<ICodeMasterEngine, CodeMasterEngine>();
        services.AddScoped<IReferenceResolver, ReferenceResolver>();
        
        // CORE: Error Model and Classification (deterministic)
        services.AddScoped<IUnifiedErrorModelBuilder, UnifiedErrorModelBuilder>();
        services.AddScoped<Validation.ISeverityResolver, Validation.SeverityResolver>();
        services.AddSingleton<BaseRuleClassifier>();
        services.AddSingleton<Models.ValidationErrorDetailsValidator>();
        
        // CORE: Instance Scope Resolution (structured validation)
        services.AddScoped<IResourceSelector, ResourceSelector>();
        services.AddScoped<IFieldPathValidator, FieldPathValidator>();
        
        return services;
    }
    
    /// <summary>
    /// Registers AUTHORING services (requires file I/O, for development/playground)
    /// Includes: SpecHint auto-generation, QuestionAnswer validation, Rule suggestion, Governance
    /// Requires: AddRuntimeValidation() to be called first
    /// </summary>
    public static IServiceCollection AddAuthoringServices(this IServiceCollection services)
    {
        // AUTHORING: SpecHint Auto-Generation (requires specs folder)
        services.AddSingleton<Hl7SpecHintGenerator>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<Hl7SpecHintGenerator>>();
            return new Hl7SpecHintGenerator(logger);
        });
        services.AddScoped<ISpecHintService>(sp =>
        {
            var generator = sp.GetRequiredService<Hl7SpecHintGenerator>();
            var logger = sp.GetRequiredService<ILogger<SpecHintService>>();
            return new SpecHintService(generator, logger);
        });
        
        // AUTHORING: Rule Governance and Quality (deterministic pattern analysis)
        services.AddScoped<Governance.IRuleReviewEngine, Governance.RuleReviewEngine>();
        services.AddScoped<IBundleFlattener, BundleFlattener>();
        services.AddScoped<IConfidenceScorer, ConfidenceScorer>();
        services.AddScoped<IRuleSuggestionEngine, RuleSuggestionEngine>();
        services.AddScoped<ISystemRuleSuggestionService, SystemRuleSuggestionService>();
        
        return services;
    }
    
    /// <summary>
    /// Registers ALL FhirProcessor.Engine services (runtime + authoring)
    /// Convenience method for full feature set (Playground, development environments)
    /// </summary>
    public static IServiceCollection AddFhirProcessorEngine(this IServiceCollection services)
    {
        // Register runtime-only validation services (DLL-safe core)
        services.AddRuntimeValidation();
        
        // Register authoring services (SpecHint, Rule Suggestion, Governance)
        services.AddAuthoringServices();

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

        // Register QuestionSet services (Phase 3B)
        services.AddScoped<IQuestionSetService>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<QuestionSetService>>();
            return new QuestionSetService(logger);
        });

        // Register QuestionAnswer validation services (Phase 3D)
        services.AddScoped<IQuestionAnswerContextProvider, DefaultQuestionAnswerContextProvider>();
        services.AddScoped<QuestionAnswerValueExtractor>();
        services.AddScoped<QuestionAnswerValidator>();

        return services;
    }
}
