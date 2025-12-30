using Xunit;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Microsoft.Extensions.Logging.Abstractions;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Services;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for structured InstanceScope resource selection.
/// Covers AllInstances, FirstInstance, and FilteredInstances behaviors.
/// </summary>
public class ResourceSelectorTests
{
    private readonly ResourceSelector _selector;

    public ResourceSelectorTests()
    {
        _selector = new ResourceSelector(NullLogger<ResourceSelector>.Instance);
    }

    #region A. Resource Selection - AllInstances

    [Fact]
    public void SelectResources_AllInstances_ReturnsAllMatchingResources()
    {
        // Arrange
        var bundle = CreateBundleWithMultiplePatients(3);
        var scope = new AllInstances();

        // Act
        var results = _selector.SelectResources(bundle, "Patient", scope).ToList();

        // Assert
        Assert.Equal(3, results.Count);
        Assert.Equal(0, results[0].EntryIndex);
        Assert.Equal(1, results[1].EntryIndex);
        Assert.Equal(2, results[2].EntryIndex);
    }

    [Fact]
    public void SelectResources_AllInstances_FiltersCorrectResourceType()
    {
        // Arrange
        var bundle = CreateBundleWithMixedResources();
        var scope = new AllInstances();

        // Act
        var patients = _selector.SelectResources(bundle, "Patient", scope).ToList();
        var observations = _selector.SelectResources(bundle, "Observation", scope).ToList();

        // Assert
        Assert.Equal(2, patients.Count);
        Assert.Equal(1, observations.Count);
    }

    [Fact]
    public void SelectResources_AllInstances_EmptyBundleReturnsEmpty()
    {
        // Arrange
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        var scope = new AllInstances();

        // Act
        var results = _selector.SelectResources(bundle, "Patient", scope).ToList();

        // Assert
        Assert.Empty(results);
    }

    #endregion

    #region B. Resource Selection - FirstInstance

    [Fact]
    public void SelectResources_FirstInstance_ReturnsOnlyFirstResource()
    {
        // Arrange
        var bundle = CreateBundleWithMultiplePatients(3);
        var scope = new FirstInstance();

        // Act
        var results = _selector.SelectResources(bundle, "Patient", scope).ToList();

        // Assert
        Assert.Single(results);
        Assert.Equal(0, results[0].EntryIndex);
        Assert.Equal("patient-1", results[0].Resource.Id);
    }

    [Fact]
    public void SelectResources_FirstInstance_EmptyBundleReturnsEmpty()
    {
        // Arrange
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        var scope = new FirstInstance();

        // Act
        var results = _selector.SelectResources(bundle, "Patient", scope).ToList();

        // Assert
        Assert.Empty(results);
    }

    #endregion

    #region C. Resource Selection - FilteredInstances

    [Fact]
    public void SelectResources_FilteredInstances_MatchesCorrectSubset()
    {
        // Arrange
        var bundle = CreateBundleWithGenderedPatients();
        var scope = new FilteredInstances { ConditionFhirPath = "gender = 'male'" };

        // Act
        var results = _selector.SelectResources(bundle, "Patient", scope).ToList();

        // Assert
        Assert.Equal(2, results.Count);
        Assert.All(results, r => Assert.Equal("male", ((Patient)r.Resource).Gender.ToString().ToLower()));
    }

    [Fact]
    public void SelectResources_FilteredInstances_SkipsNonMatchingResources()
    {
        // Arrange
        var bundle = CreateBundleWithGenderedPatients();
        var scope = new FilteredInstances { ConditionFhirPath = "gender = 'female'" };

        // Act
        var results = _selector.SelectResources(bundle, "Patient", scope).ToList();

        // Assert
        Assert.Single(results);
        Assert.Equal("female", ((Patient)results[0].Resource).Gender.ToString().ToLower());
    }

    [Fact]
    public void SelectResources_FilteredInstances_NestedArrayCondition()
    {
        // Arrange
        var bundle = CreateBundleWithObservations();
        var scope = new FilteredInstances 
        { 
            ConditionFhirPath = "code.coding.code = 'HEARING'" 
        };

        // Act
        var results = _selector.SelectResources(bundle, "Observation", scope).ToList();

        // Assert
        Assert.Equal(2, results.Count);
        Assert.All(results, r =>
        {
            var obs = (Observation)r.Resource;
            Assert.Contains(obs.Code.Coding, c => c.Code == "HEARING");
        });
    }

    [Fact]
    public void SelectResources_FilteredInstances_NoMatchesReturnsEmpty()
    {
        // Arrange
        var bundle = CreateBundleWithMultiplePatients(3);
        var scope = new FilteredInstances { ConditionFhirPath = "gender = 'other'" };

        // Act
        var results = _selector.SelectResources(bundle, "Patient", scope).ToList();

        // Assert
        Assert.Empty(results);
    }

    [Fact]
    public void SelectResources_FilteredInstances_InvalidConditionThrows()
    {
        // Arrange
        var bundle = CreateBundleWithMultiplePatients(1);
        var scope = new FilteredInstances { ConditionFhirPath = "invalid..syntax" };

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() =>
            _selector.SelectResources(bundle, "Patient", scope).ToList());
    }

    [Fact]
    public void SelectResources_FilteredInstances_BooleanResultHandling()
    {
        // Arrange
        var bundle = CreateBundleWithMultiplePatients(2);
        // birthDate.exists() returns boolean
        var scope = new FilteredInstances { ConditionFhirPath = "birthDate.exists()" };

        // Act
        var results = _selector.SelectResources(bundle, "Patient", scope).ToList();

        // Assert
        Assert.Equal(2, results.Count); // All have birthDate
    }

    #endregion

    #region Test Fixtures

    private Bundle CreateBundleWithMultiplePatients(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };

        for (int i = 1; i <= count; i++)
        {
            bundle.Entry.Add(new Bundle.EntryComponent
            {
                Resource = new Patient
                {
                    Id = $"patient-{i}",
                    Gender = AdministrativeGender.Male,
                    BirthDate = "1990-01-01"
                }
            });
        }

        return bundle;
    }

    private Bundle CreateBundleWithGenderedPatients()
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };

        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-male-1",
                Gender = AdministrativeGender.Male
            }
        });

        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-female-1",
                Gender = AdministrativeGender.Female
            }
        });

        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-male-2",
                Gender = AdministrativeGender.Male
            }
        });

        return bundle;
    }

    private Bundle CreateBundleWithMixedResources()
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };

        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient { Id = "patient-1" }
        });

        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Observation { Id = "obs-1" }
        });

        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient { Id = "patient-2" }
        });

        return bundle;
    }

    private Bundle CreateBundleWithObservations()
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };

        // Observation with HEARING code
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Observation
            {
                Id = "obs-hearing-1",
                Code = new CodeableConcept
                {
                    Coding = new List<Coding>
                    {
                        new Coding("http://loinc.org", "HEARING", "Hearing screening")
                    }
                }
            }
        });

        // Observation with different code
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Observation
            {
                Id = "obs-vision-1",
                Code = new CodeableConcept
                {
                    Coding = new List<Coding>
                    {
                        new Coding("http://loinc.org", "VISION", "Vision screening")
                    }
                }
            }
        });

        // Another HEARING observation
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Observation
            {
                Id = "obs-hearing-2",
                Code = new CodeableConcept
                {
                    Coding = new List<Coding>
                    {
                        new Coding("http://loinc.org", "HEARING", "Hearing screening")
                    }
                }
            }
        });

        return bundle;
    }

    #endregion
}
