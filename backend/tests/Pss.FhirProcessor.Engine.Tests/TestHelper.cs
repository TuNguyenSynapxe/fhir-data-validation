using System.Text.Json;
using Moq;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Navigation.Structure;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Validation;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Navigation.Structure;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;

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
            Id = "patient-001"
        };

        // Set gender - use enum for standard values, GenderElement.ObjectValue for truly custom values
        if (gender != null)
        {
            switch (gender.ToLower())
            {
                case "male":
                    patient.Gender = AdministrativeGender.Male;
                    break;
                case "female":
                    patient.Gender = AdministrativeGender.Female;
                    break;
                case "other":
                    patient.Gender = AdministrativeGender.Other;
                    break;
                case "unknown":
                    patient.Gender = AdministrativeGender.Unknown;
                    break;
                default:
                    // For custom values not in the enum, use ObjectValue on GenderElement
                    patient.GenderElement = new Code<AdministrativeGender>();
                    patient.GenderElement.ObjectValue = gender;
                    break;
            }
        }

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
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var mockTerminologyService = new Mock<ITerminologyService>();
        
        // Phase3: Use real implementations instead of mocks to support FieldPath + InstanceScope
        var resourceSelectorLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<ResourceSelector>.Instance;
        var resourceSelector = new ResourceSelector(resourceSelectorLogger);
        var fieldPathValidator = new FieldPathValidator();
        
        return new FhirPathRuleEngine(
            modelResolver, 
            logger, 
            mockTerminologyService.Object,
            resourceSelector,
            fieldPathValidator);
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
        var jsonResolver = new JsonPointerResolver(new NullFhirStructureHintProvider());
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<SmartPathNavigationService>.Instance;
        return new SmartPathNavigationService(jsonResolver, logger);
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
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<UnifiedErrorModelBuilder>.Instance;
        var classifierLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<BaseRuleClassifier>.Instance;
        var classifier = new BaseRuleClassifier(classifierLogger);
        return new UnifiedErrorModelBuilder(navigationService, logger, classifier);
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

        // Create REAL structural validator for contract tests
        var structuralValidator = CreateJsonNodeStructuralValidator();

        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<ValidationPipeline>.Instance;
        return new ValidationPipeline(
            structuralValidator,
            lintService,
            specHintService,
            firelyService,
            ruleEngine,
            codeMasterEngine,
            referenceResolver,
            errorModelBuilder,
            suggestionService,
            logger);
    }
    
    public static IJsonNodeStructuralValidator CreateJsonNodeStructuralValidator()
    {
        var schemaService = CreateFhirSchemaService();
        var enumIndex = CreateEnumIndex();
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<JsonNodeStructuralValidator>.Instance;
        return new JsonNodeStructuralValidator(schemaService, enumIndex, logger);
    }
    
    public static IFhirEnumIndex CreateEnumIndex()
    {
        var modelResolver = CreateModelResolver();
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirEnumIndex>.Instance;
        return new FhirEnumIndex(modelResolver, logger);
    }
    
    public static ISystemRuleSuggestionService CreateSystemRuleSuggestionService()
    {
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<SystemRuleSuggestionService>.Instance;
        return new SystemRuleSuggestionService(logger);
    }
}
