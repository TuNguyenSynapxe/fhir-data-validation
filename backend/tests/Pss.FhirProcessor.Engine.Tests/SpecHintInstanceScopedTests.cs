using Xunit;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Navigation.Structure;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;
using Pss.FhirProcessor.Engine.Models;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Microsoft.Extensions.Logging;
using Moq;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for Phase 8: Instance-Scoped SPEC_HINT Error Navigation
/// Validates that SPEC_HINT errors are emitted per failing instance with correct jsonPointer
/// </summary>
public class SpecHintInstanceScopedTests
{
    private readonly SpecHintService _specHintService;
    private readonly UnifiedErrorModelBuilder _errorBuilder;
    private readonly SmartPathNavigationService _navigationService;

    public SpecHintInstanceScopedTests()
    {
        var jsonResolver = new JsonPointerResolver(new NullFhirStructureHintProvider());
        var navLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<SmartPathNavigationService>.Instance;
        _navigationService = new SmartPathNavigationService(jsonResolver, navLogger);
        var mockLogger = new Mock<ILogger<UnifiedErrorModelBuilder>>();
        var classifierLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<BaseRuleClassifier>.Instance;
        var classifier = new BaseRuleClassifier(classifierLogger);
        _errorBuilder = new UnifiedErrorModelBuilder(_navigationService, mockLogger.Object, classifier);
        _specHintService = new SpecHintService();
    }

    [Fact]
    public async System.Threading.Tasks.Task SpecHint_MultipleObservations_OnlyFailingInstancesGetErrors()
    {
        // Arrange: Bundle with 3 Observations - 1 has status, 2 missing status
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-with-status",
                        Status = ObservationStatus.Final, // HAS STATUS
                        Code = new CodeableConcept
                        {
                            Coding = new List<Coding>
                            {
                                new Coding("http://loinc.org", "12345-6", "Test")
                            }
                        }
                    }
                },
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-missing-status-1",
                        // MISSING STATUS
                        Code = new CodeableConcept
                        {
                            Coding = new List<Coding>
                            {
                                new Coding("http://loinc.org", "67890-1", "Test 2")
                            }
                        }
                    }
                },
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-missing-status-2",
                        // MISSING STATUS
                        Code = new CodeableConcept
                        {
                            Coding = new List<Coding>
                            {
                                new Coding("http://loinc.org", "11111-2", "Test 3")
                            }
                        }
                    }
                }
            }
        };

        var serializer = new FhirJsonSerializer(new SerializerSettings { Pretty = true });
        var bundleJson = serializer.SerializeToString(bundle);

        // Act: Run SPEC_HINT validation
        var specHintIssues = await _specHintService.CheckAsync(bundleJson, "R4", bundle);
        var errors = await _errorBuilder.FromSpecHintIssuesAsync(specHintIssues, bundleJson, bundle);

        // Assert: EXACTLY 2 errors (for the 2 observations missing status)
        var statusErrors = errors.Where(e => e.Path?.Contains("Observation.status") == true).ToList();
        Assert.Equal(2, statusErrors.Count);

        // Assert: First failing instance (entry[1])
        var error1 = statusErrors.FirstOrDefault(e => e.JsonPointer == "/entry/1/resource");
        Assert.NotNull(error1);
        Assert.Equal("SPEC_HINT", error1.Source);
        Assert.Equal("/entry/1/resource", error1.JsonPointer);
        Assert.Contains("Observation.status", error1.Path);

        // Assert: Second failing instance (entry[2])
        var error2 = statusErrors.FirstOrDefault(e => e.JsonPointer == "/entry/2/resource");
        Assert.NotNull(error2);
        Assert.Equal("SPEC_HINT", error2.Source);
        Assert.Equal("/entry/2/resource", error2.JsonPointer);
        Assert.Contains("Observation.status", error2.Path);

        // Assert: No error for the first observation (has status)
        var error0 = errors.FirstOrDefault(e => e.JsonPointer == "/entry/0/resource" && e.Path?.Contains("status") == true);
        Assert.Null(error0);
    }

    [Fact]
    public async System.Threading.Tasks.Task SpecHint_CorrectEntryIndex_InJsonPointer()
    {
        // Arrange: Bundle with Patient, Observation (no status), Encounter
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Patient
                    {
                        Id = "patient-1",
                        Name = new List<HumanName> { new HumanName { Family = "Test" } }
                    }
                },
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-no-status",
                        // MISSING STATUS
                        Code = new CodeableConcept()
                    }
                },
                new Bundle.EntryComponent
                {
                    Resource = new Encounter
                    {
                        Id = "enc-1",
                        Status = Encounter.EncounterStatus.Finished,
                        Class = new Coding("http://terminology.hl7.org/CodeSystem/v3-ActCode", "AMB")
                    }
                }
            }
        };

        var serializer = new FhirJsonSerializer(new SerializerSettings { Pretty = true });
        var bundleJson = serializer.SerializeToString(bundle);

        // Act
        var specHintIssues = await _specHintService.CheckAsync(bundleJson, "R4", bundle);
        var errors = await _errorBuilder.FromSpecHintIssuesAsync(specHintIssues, bundleJson, bundle);

        // Assert: Error must point to entry[1] (the Observation at index 1)
        var statusError = errors.FirstOrDefault(e => e.Path?.Contains("Observation.status") == true);
        Assert.NotNull(statusError);
        Assert.Equal("/entry/1/resource", statusError.JsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task SpecHint_AllInstancesValid_NoErrors()
    {
        // Arrange: Bundle with 2 Observations, both have status
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-1",
                        Status = ObservationStatus.Final,
                        Code = new CodeableConcept()
                    }
                },
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-2",
                        Status = ObservationStatus.Preliminary,
                        Code = new CodeableConcept()
                    }
                }
            }
        };

        var serializer = new FhirJsonSerializer(new SerializerSettings { Pretty = true });
        var bundleJson = serializer.SerializeToString(bundle);

        // Act
        var specHintIssues = await _specHintService.CheckAsync(bundleJson, "R4", bundle);
        var errors = await _errorBuilder.FromSpecHintIssuesAsync(specHintIssues, bundleJson, bundle);

        // Assert: No errors for Observation.status
        var statusErrors = errors.Where(e => e.Path?.Contains("Observation.status") == true).ToList();
        Assert.Empty(statusErrors);
    }

    [Fact]
    public async System.Threading.Tasks.Task SpecHint_MixedResourceTypes_EachInstanceScoped()
    {
        // Arrange: Multiple resource types, some missing required fields
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-1",
                        // MISSING STATUS
                        Code = new CodeableConcept()
                    }
                },
                new Bundle.EntryComponent
                {
                    Resource = new Encounter
                    {
                        Id = "enc-1",
                        Status = Encounter.EncounterStatus.Finished,
                        // MISSING CLASS (if it's required by SPEC_HINT)
                    }
                },
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-2",
                        Status = ObservationStatus.Final, // HAS STATUS
                        Code = new CodeableConcept()
                    }
                }
            }
        };

        var serializer = new FhirJsonSerializer(new SerializerSettings { Pretty = true });
        var bundleJson = serializer.SerializeToString(bundle);

        // Act
        var specHintIssues = await _specHintService.CheckAsync(bundleJson, "R4", bundle);
        var errors = await _errorBuilder.FromSpecHintIssuesAsync(specHintIssues, bundleJson, bundle);

        // Assert: Observation.status error should only be for entry[0]
        var obsStatusErrors = errors.Where(e => 
            e.ResourceType == "Observation" && 
            e.Path?.Contains("status") == true
        ).ToList();
        
        Assert.Single(obsStatusErrors);
        Assert.Equal("/entry/0/resource", obsStatusErrors[0].JsonPointer);

        // Assert: Encounter errors (if any) should point to entry[1]
        var encErrors = errors.Where(e => e.ResourceType == "Encounter").ToList();
        if (encErrors.Any())
        {
            Assert.All(encErrors, e => Assert.Equal("/entry/1/resource", e.JsonPointer));
        }
    }
}
