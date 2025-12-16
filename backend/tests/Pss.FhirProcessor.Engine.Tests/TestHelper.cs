using System.Text.Json;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Services;

namespace Pss.FhirProcessor.Engine.Tests;

public static class TestHelper
{
    private static readonly string FixturesPath = Path.Combine(
        Directory.GetCurrentDirectory(), 
        "..", "..", "..", "Fixtures");

    public static string LoadFixture(string filename)
    {
        var path = Path.Combine(FixturesPath, filename);
        return File.ReadAllText(path);
    }

    public static Bundle LoadBundleFixture(string filename)
    {
        var json = LoadFixture(filename);
        var parser = new FhirJsonParser();
        return parser.Parse<Bundle>(json);
    }

    public static RuleSet LoadRuleSetFixture(string filename)
    {
        var json = LoadFixture(filename);
        return JsonSerializer.Deserialize<RuleSet>(json) 
            ?? throw new InvalidOperationException("Failed to deserialize rules");
    }

    public static CodeMasterDefinition LoadCodeMasterFixture(string filename)
    {
        var json = LoadFixture(filename);
        return JsonSerializer.Deserialize<CodeMasterDefinition>(json) 
            ?? throw new InvalidOperationException("Failed to deserialize CodeMaster");
    }

    public static CodeMasterDefinition CreateSampleCodeMaster()
    {
        return new CodeMasterDefinition
        {
            Version = "1.0",
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "MH-001",
                    Display = "Maternal Health Screening",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "SQ-001",
                            Display = "Gestational Age",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "28 weeks" },
                                new AnswerDefinition { Code = "32 weeks" },
                                new AnswerDefinition { Code = "36 weeks" }
                            }
                        },
                        new QuestionDefinition
                        {
                            Code = "SQ-002",
                            Display = "Risk Factors",
                            MultiValue = true,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "hypertension" },
                                new AnswerDefinition { Code = "diabetes" },
                                new AnswerDefinition { Code = "anemia" }
                            }
                        }
                    }
                }
            }
        };
    }

    public static Bundle CreateSimplePatientBundle(
        string? familyName = "Doe",
        string? gender = "female",
        string? nric = "S1234567D")
    {
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>()
        };

        var patient = new Patient
        {
            Id = "patient-001",
            Gender = gender switch
            {
                "male" => AdministrativeGender.Male,
                "female" => AdministrativeGender.Female,
                _ => null
            }
        };

        if (familyName != null)
        {
            patient.Name = new List<HumanName>
            {
                new HumanName { Family = familyName, Given = new[] { "John" } }
            };
        }

        if (nric != null)
        {
            patient.Identifier = new List<Identifier>
            {
                new Identifier
                {
                    System = "http://example.org/nric",
                    Value = nric
                }
            };
        }

        bundle.Entry.Add(new Bundle.EntryComponent
        {
            FullUrl = "urn:uuid:patient-001",
            Resource = patient
        });

        return bundle;
    }

    public static Bundle CreateBundleWithReferences()
    {
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>()
        };

        var patient = new Patient
        {
            Id = "patient-001",
            Gender = AdministrativeGender.Female
        };

        var encounter = new Encounter
        {
            Id = "encounter-001",
            Status = Encounter.EncounterStatus.Finished,
            Class = new Coding("http://terminology.hl7.org/CodeSystem/v3-ActCode", "AMB"),
            Subject = new ResourceReference("urn:uuid:patient-001")
        };

        var observation = new Observation
        {
            Id = "observation-001",
            Status = ObservationStatus.Final,
            Code = new CodeableConcept("http://example.org/screening", "MH-001"),
            Subject = new ResourceReference("urn:uuid:patient-001"),
            Encounter = new ResourceReference("urn:uuid:encounter-001")
        };

        bundle.Entry.Add(new Bundle.EntryComponent
        {
            FullUrl = "urn:uuid:patient-001",
            Resource = patient
        });

        bundle.Entry.Add(new Bundle.EntryComponent
        {
            FullUrl = "urn:uuid:encounter-001",
            Resource = encounter
        });

        bundle.Entry.Add(new Bundle.EntryComponent
        {
            FullUrl = "urn:uuid:observation-001",
            Resource = observation
        });

        return bundle;
    }

    public static IFhirPathRuleEngine CreateRuleEngine()
    {
        var modelResolver = CreateModelResolver();
        return new FhirPathRuleEngine(modelResolver);
    }

    public static ICodeMasterEngine CreateCodeMasterEngine()
    {
        return new CodeMasterEngine();
    }

    public static IReferenceResolver CreateReferenceResolver()
    {
        return new ReferenceResolver();
    }

    public static ISmartPathNavigationService CreateNavigationService()
    {
        return new SmartPathNavigationService();
    }

    public static IFirelyValidationService CreateFirelyValidationService()
    {
        var modelResolver = CreateModelResolver();
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FirelyValidationService>.Instance;
        return new FirelyValidationService(modelResolver, logger);
    }
    
    private static IFhirModelResolverService CreateModelResolver()
    {
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        return new FhirR4ModelResolverService(logger);
    }

    public static IUnifiedErrorModelBuilder CreateErrorModelBuilder()
    {
        var navigationService = CreateNavigationService();
        return new UnifiedErrorModelBuilder(navigationService);
    }

    public static ILintValidationService CreateLintValidationService()
    {
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<LintValidationService>.Instance;
        var schemaService = CreateFhirSchemaService();
        return new LintValidationService(logger, schemaService);
    }
    
    public static IFhirSchemaService CreateFhirSchemaService()
    {
        var modelResolver = CreateModelResolver();
        var expansionService = CreateSchemaExpansionService();
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirSchemaService>.Instance;
        return new FhirSchemaService(modelResolver, expansionService, logger);
    }
    
    public static ISchemaExpansionService CreateSchemaExpansionService()
    {
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<SchemaExpansionService>.Instance;
        return new SchemaExpansionService(logger);
    }

    public static IValidationPipeline CreateValidationPipeline()
    {
        var lintService = CreateLintValidationService();
        var specHintService = new SpecHintService();
        var firelyService = CreateFirelyValidationService();
        var ruleEngine = CreateRuleEngine();
        var codeMasterEngine = CreateCodeMasterEngine();
        var referenceResolver = CreateReferenceResolver();
        var errorModelBuilder = CreateErrorModelBuilder();
        var suggestionService = CreateSystemRuleSuggestionService();

        return new ValidationPipeline(
            lintService,
            specHintService,
            firelyService,
            ruleEngine,
            codeMasterEngine,
            referenceResolver,
            errorModelBuilder,
            suggestionService);
    }
    
    public static ISystemRuleSuggestionService CreateSystemRuleSuggestionService()
    {
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<SystemRuleSuggestionService>.Instance;
        return new SystemRuleSuggestionService(logger);
    }
}
