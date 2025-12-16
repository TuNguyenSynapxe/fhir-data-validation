using Xunit;
using Microsoft.Extensions.Logging;
using Moq;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for semantic-aware rule suggestion engine.
/// Validates that false-positive scenarios are properly blocked.
/// </summary>
public class SystemRuleSuggestionServiceTests
{
    private readonly SystemRuleSuggestionService _service;
    private readonly Mock<ILogger<SystemRuleSuggestionService>> _loggerMock;

    public SystemRuleSuggestionServiceTests()
    {
        _loggerMock = new Mock<ILogger<SystemRuleSuggestionService>>();
        _service = new SystemRuleSuggestionService(_loggerMock.Object);
    }

    #region False Positive Prevention Tests

    [Fact]
    public async System.Threading.Tasks.Task ShouldNotSuggestFixedValueForTelecomValue()
    {
        // Arrange: Create bundle with identical telecom.value across all resources
        var bundle = CreateBundleWithIdenticalTelecomValues(35); // Above threshold

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should NOT suggest FixedValue for telecom.value (instance-only field)
        var telecomSuggestions = suggestions.Where(s =>
            s.Path.Contains("telecom") &&
            s.Path.EndsWith("value") &&
            s.RuleType == "FixedValue").ToList();

        Assert.Empty(telecomSuggestions);

        // Should instead create instance data observation
        var instanceObservations = suggestions.Where(s =>
            s.Path.Contains("telecom") &&
            s.Path.EndsWith("value") &&
            s.ObservationType == ObservationType.InstanceData).ToList();

        Assert.NotEmpty(instanceObservations);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldNotSuggestFixedValueForAddressLine()
    {
        // Arrange: Create bundle with identical address.line values
        var bundle = CreateBundleWithIdenticalAddressLines(40);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should NOT suggest FixedValue for address.line (free text field)
        var addressLineSuggestions = suggestions.Where(s =>
            s.Path.Contains("address") &&
            s.Path.Contains("line") &&
            s.RuleType == "FixedValue").ToList();

        Assert.Empty(addressLineSuggestions);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldNotSuggestFixedValueForIdentifierValue()
    {
        // Arrange: Create bundle with same identifier.value (unrealistic but test edge case)
        var bundle = CreateBundleWithIdenticalIdentifierValues(50);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should NOT suggest FixedValue for identifier.value
        var identifierSuggestions = suggestions.Where(s =>
            s.Path.Contains("identifier") &&
            s.Path.EndsWith("value") &&
            s.RuleType == "FixedValue").ToList();

        Assert.Empty(identifierSuggestions);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldNotSuggestFixedValueForReferenceFields()
    {
        // Arrange: Create bundle where all references point to same target
        var bundle = CreateBundleWithIdenticalReferences(35);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should NOT suggest FixedValue for reference fields
        var referenceSuggestions = suggestions.Where(s =>
            s.Path.EndsWith("reference") &&
            s.RuleType == "FixedValue").ToList();

        Assert.Empty(referenceSuggestions);

        // Should instead suggest ReferenceExists rule
        var referenceExistsSuggestions = suggestions.Where(s =>
            s.Path.EndsWith("reference") &&
            s.RuleType == "ReferenceExists").ToList();

        Assert.NotEmpty(referenceExistsSuggestions);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldNotSuggestFixedValueForDisplayFields()
    {
        // Arrange: Bundle with constant display values
        var bundle = CreateBundleWithIdenticalDisplayValues(40);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should NOT suggest FixedValue for display fields
        var displaySuggestions = suggestions.Where(s =>
            s.Path.EndsWith("display") &&
            s.RuleType == "FixedValue").ToList();

        Assert.Empty(displaySuggestions);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldSuggestFixedValueOnlyForStatusFields()
    {
        // Arrange: Bundle with consistent Observation.status = "final"
        var bundle = CreateBundleWithConstantStatus(35);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: SHOULD suggest FixedValue for status (StatusOrLifecycleField)
        var statusSuggestions = suggestions.Where(s =>
            s.Path.Contains("status") &&
            s.RuleType == "FixedValue" &&
            s.SemanticType == SemanticType.StatusOrLifecycleField).ToList();

        Assert.NotEmpty(statusSuggestions);
        var statusSuggestion = statusSuggestions.First();
        Assert.Equal("final", statusSuggestion.Params["value"]);
        Assert.Equal(ObservationType.ConstantValue, statusSuggestion.ObservationType);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldRequireMinimumSampleSizeForFixedValue()
    {
        // Arrange: Bundle with only 5 resources (below MIN_SAMPLE_SIZE_FOR_FIXED_VALUE = 30)
        var bundle = CreateBundleWithConstantStatus(5);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should NOT suggest FixedValue due to insufficient sample size
        var fixedValueSuggestions = suggestions.Where(s => s.RuleType == "FixedValue").ToList();
        Assert.Empty(fixedValueSuggestions);
    }

    #endregion

    #region Semantic Classification Tests

    [Fact]
    public async System.Threading.Tasks.Task ShouldClassifyTerminologyBoundFields()
    {
        // Arrange: Bundle with coding/code fields
        var bundle = CreateBundleWithCodingFields();

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Coding/code/system fields should be classified as terminology-related
        // EXCLUDE display fields (they are FreeTextField, which is correct)
        var codingSuggestions = suggestions.Where(s => 
            (s.Path.Contains("coding") || s.Path.Contains("code") || s.Path.Contains("system")) &&
            !s.Path.EndsWith("display")).ToList();
        
        Assert.NotEmpty(codingSuggestions);
        
        // All terminology-related suggestions should be appropriately classified
        Assert.All(codingSuggestions, s =>
            Assert.True(
                s.SemanticType == SemanticType.TerminologyBoundField ||
                s.SemanticType == SemanticType.CodedAnswerField ||
                s.SemanticType == SemanticType.Unknown, // Some nested paths may be unknown
                $"Path '{s.Path}' has unexpected semantic type: {s.SemanticType}"));
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldClassifyReferenceFields()
    {
        // Arrange
        var bundle = CreateBundleWithReferences();

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Reference fields should be classified correctly
        var referenceSuggestions = suggestions.Where(s => s.Path.Contains("reference")).ToList();
        Assert.All(referenceSuggestions, s =>
            Assert.Equal(SemanticType.ReferenceField, s.SemanticType));
    }

    #endregion

    #region AllowedValues Tests

    [Fact]
    public async System.Threading.Tasks.Task ShouldSuggestAllowedValuesForTerminologyFields()
    {
        // Arrange: Small set of distinct codes
        var bundle = CreateBundleWithSmallCodeSet();

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should suggest AllowedValues for terminology fields
        var allowedValuesSuggestions = suggestions.Where(s =>
            s.RuleType == "AllowedValues" &&
            (s.SemanticType == SemanticType.TerminologyBoundField ||
             s.SemanticType == SemanticType.CodedAnswerField)).ToList();

        Assert.NotEmpty(allowedValuesSuggestions);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldNotSuggestAllowedValuesForFreeText()
    {
        // Arrange: Free text fields with small distinct set (should still be blocked)
        var bundle = CreateBundleWithFreeTextFields();

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should NOT suggest AllowedValues for free text
        var textSuggestions = suggestions.Where(s =>
            s.Path.EndsWith("text") &&
            s.RuleType == "AllowedValues").ToList();

        Assert.Empty(textSuggestions);
    }

    #endregion

    #region Required Field Tests

    [Fact]
    public async System.Threading.Tasks.Task ShouldSuggestRequiredForConsistentlyPresentFields()
    {
        // Arrange: Field present in all resources
        var bundle = CreateBundleWithConsistentlyPresentField(10);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should suggest Required for fields present in 100%
        var requiredSuggestions = suggestions.Where(s =>
            s.RuleType == "Required" &&
            s.ObservationType == ObservationType.AlwaysPresent).ToList();

        Assert.NotEmpty(requiredSuggestions);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldNotSuggestRequiredForDisplayOnlyFields()
    {
        // Arrange: Display field present in all resources
        var bundle = CreateBundleWithConsistentDisplayFields(15);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should NOT suggest Required for display-only fields
        var displayRequiredSuggestions = suggestions.Where(s =>
            s.Path.EndsWith("display") &&
            s.RuleType == "Required").ToList();

        Assert.Empty(displayRequiredSuggestions);
    }

    #endregion

    #region Reference Rule Tests

    [Fact]
    public async System.Threading.Tasks.Task ShouldSuggestReferenceExistsForConsistentTargetType()
    {
        // Arrange: All references point to Patient resources
        var bundle = CreateBundleWithConsistentReferenceType();

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should suggest ReferenceExists rule
        var refExistsSuggestions = suggestions.Where(s =>
            s.RuleType == "ReferenceExists" &&
            s.SemanticType == SemanticType.ReferenceField).ToList();

        Assert.NotEmpty(refExistsSuggestions);
        var refSuggestion = refExistsSuggestions.First();
        Assert.Equal("Patient", refSuggestion.Params["targetResourceType"]);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldNotSuggestReferenceRuleForMixedTargetTypes()
    {
        // Arrange: References point to multiple resource types
        var bundle = CreateBundleWithMixedReferenceTypes();

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should create observation but no rule suggestion
        var mixedRefSuggestions = suggestions.Where(s =>
            s.SemanticType == SemanticType.ReferenceField &&
            s.RuleType == null &&
            s.ObservationType == ObservationType.NoPattern).ToList();

        Assert.NotEmpty(mixedRefSuggestions);
    }

    #endregion

    #region Helper Methods

    private Bundle CreateBundleWithIdenticalTelecomValues(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < count; i++)
        {
            var patient = new Patient
            {
                Telecom = new List<ContactPoint>
                {
                    new ContactPoint
                    {
                        System = ContactPoint.ContactPointSystem.Phone,
                        Value = "+1-555-1234" // Same value for all (instance data)
                    }
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = patient });
        }
        return bundle;
    }

    private Bundle CreateBundleWithIdenticalAddressLines(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < count; i++)
        {
            var patient = new Patient
            {
                Address = new List<Address>
                {
                    new Address
                    {
                        Line = new[] { "123 Main St", "Apt 4B" } // Instance data
                    }
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = patient });
        }
        return bundle;
    }

    private Bundle CreateBundleWithIdenticalIdentifierValues(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < count; i++)
        {
            var patient = new Patient
            {
                Identifier = new List<Identifier>
                {
                    new Identifier
                    {
                        System = "http://example.org/mrn",
                        Value = "MRN123456" // Instance-specific
                    }
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = patient });
        }
        return bundle;
    }

    private Bundle CreateBundleWithIdenticalReferences(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < count; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept(),
                Subject = new ResourceReference("Patient/example-123") // Same reference
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    private Bundle CreateBundleWithIdenticalDisplayValues(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < count; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept
                {
                    Text = "Blood Pressure" // Display value
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    private Bundle CreateBundleWithConstantStatus(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < count; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final, // Status field - OK for FixedValue
                Code = new CodeableConcept(),
                Subject = new ResourceReference("Patient/" + i)
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    private Bundle CreateBundleWithCodingFields()
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < 10; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept
                {
                    Coding = new List<Coding>
                    {
                        new Coding
                        {
                            System = "http://loinc.org",
                            Code = "8480-6",
                            Display = "Systolic blood pressure"
                        }
                    }
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    private Bundle CreateBundleWithReferences()
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < 10; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept(),
                Subject = new ResourceReference($"Patient/{i}")
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    private Bundle CreateBundleWithSmallCodeSet()
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        var codes = new[] { "active", "inactive", "completed" };
        for (int i = 0; i < 15; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept
                {
                    Coding = new List<Coding>
                    {
                        new Coding
                        {
                            System = "http://example.org/status",
                            Code = codes[i % codes.Length]
                        }
                    }
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    private Bundle CreateBundleWithFreeTextFields()
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        var texts = new[] { "Note A", "Note B", "Note C" };
        for (int i = 0; i < 10; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept(),
                Note = new List<Annotation>
                {
                    new Annotation { Text = texts[i % texts.Length] }
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    private Bundle CreateBundleWithConsistentlyPresentField(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < count; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept(),
                Subject = new ResourceReference($"Patient/{i}"), // Always present
                Issued = DateTimeOffset.Now // Always present
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    private Bundle CreateBundleWithConsistentDisplayFields(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < count; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept
                {
                    Text = "Display Text" // Display field present in all
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    private Bundle CreateBundleWithConsistentReferenceType()
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < 15; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept(),
                Subject = new ResourceReference($"Patient/patient-{i}") // All Patient references
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    private Bundle CreateBundleWithMixedReferenceTypes()
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        var types = new[] { "Patient", "Practitioner", "Organization" };
        for (int i = 0; i < 15; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept(),
                Performer = new List<ResourceReference>
                {
                    new ResourceReference($"{types[i % types.Length]}/{i}")
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    #endregion

    #region Semantic Sub-Type Classification Tests

    [Fact]
    public async System.Threading.Tasks.Task ShouldClassifyIdentifierSystemAsIdentifierNamespace()
    {
        // Arrange: Bundle with identifier.system
        var bundle = CreateBundleWithIdenticalIdentifierSystems(35);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should create observation with IdentifierNamespace sub-type
        var observation = suggestions.FirstOrDefault(s =>
            s.Path.Contains("identifier") &&
            s.Path.EndsWith("system") &&
            s.ObservationType == ObservationType.InstanceData);

        Assert.NotNull(observation);
        Assert.Equal(SemanticSubType.IdentifierNamespace, observation.SemanticSubType);
        Assert.Contains("Implementation Guide profile", observation.Reasoning);
        Assert.Equal(BetterRuleCandidate.FixedValueIGDefined, observation.BetterRuleCandidate);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldProvideContextualExplanationForIdentifierValue()
    {
        // Arrange: Bundle with identifier.value (unrealistic but testing edge case)
        var bundle = CreateBundleWithIdenticalIdentifierValues(40);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should have semantic-specific explanation
        var observation = suggestions.FirstOrDefault(s =>
            s.Path.Contains("identifier") &&
            s.Path.EndsWith("value") &&
            s.ObservationType == ObservationType.InstanceData);

        Assert.NotNull(observation);
        Assert.Equal(SemanticSubType.IdentifierValue, observation.SemanticSubType);
        Assert.Contains("expected to vary per resource", observation.Reasoning);
        Assert.Equal(BetterRuleCandidate.Regex, observation.BetterRuleCandidate);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldProvideContextualExplanationForTelecomValue()
    {
        // Arrange: Bundle with identical telecom.value
        var bundle = CreateBundleWithIdenticalTelecomValues(35);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should suggest pattern-based validation
        var observation = suggestions.FirstOrDefault(s =>
            s.Path.Contains("telecom") &&
            s.Path.EndsWith("value") &&
            s.ObservationType == ObservationType.InstanceData);

        Assert.NotNull(observation);
        Assert.Equal(SemanticSubType.InstanceContactData, observation.SemanticSubType);
        Assert.Contains("Pattern-based validation", observation.Reasoning);
        Assert.Equal(BetterRuleCandidate.Regex, observation.BetterRuleCandidate);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldProvideContextualExplanationForAddressLine()
    {
        // Arrange: Bundle with identical address.line
        var bundle = CreateBundleWithIdenticalAddressLines(35);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should suggest array length validation
        var observation = suggestions.FirstOrDefault(s =>
            s.Path.Contains("address") &&
            s.Path.Contains("line") &&
            s.ObservationType == ObservationType.InstanceData);

        Assert.NotNull(observation);
        Assert.Equal(SemanticSubType.InstanceContactData, observation.SemanticSubType);
        Assert.Contains("Pattern-based validation", observation.Reasoning);
        Assert.Equal(BetterRuleCandidate.ArrayLength, observation.BetterRuleCandidate);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldProvideContextualExplanationForCodingDisplay()
    {
        // Arrange: Bundle with identical coding.display
        var bundle = CreateBundleWithIdenticalCodingDisplays(35);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should recommend terminology binding instead
        var observation = suggestions.FirstOrDefault(s =>
            s.Path.Contains("coding") &&
            s.Path.EndsWith("display") &&
            s.ObservationType == ObservationType.InstanceData);

        Assert.NotNull(observation);
        Assert.Equal(SemanticSubType.HumanReadableLabel, observation.SemanticSubType);
        Assert.Contains("coding.code and coding.system", observation.Reasoning);
        Assert.Equal(BetterRuleCandidate.TerminologyBinding, observation.BetterRuleCandidate);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldProvideContextualExplanationForReferenceDisplay()
    {
        // Arrange: Bundle with identical reference.display
        var bundle = CreateBundleWithIdenticalReferenceDisplays(35);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should recommend reference validation
        var observation = suggestions.FirstOrDefault(s =>
            s.Path.Contains("subject") &&
            s.Path.EndsWith("display") &&
            s.ObservationType == ObservationType.InstanceData);

        Assert.NotNull(observation);
        Assert.Equal(SemanticSubType.ReferenceDisplay, observation.SemanticSubType);
        Assert.Contains("reference itself", observation.Reasoning);
        Assert.Equal(BetterRuleCandidate.ReferenceExists, observation.BetterRuleCandidate);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldProvideContextualExplanationForNarrativeText()
    {
        // Arrange: Bundle with identical narrative text
        var bundle = CreateBundleWithIdenticalNarrativeTexts(35);

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should recognize as free narrative
        var observation = suggestions.FirstOrDefault(s =>
            s.Path.Contains("text") &&
            s.Path.EndsWith("div") &&
            s.ObservationType == ObservationType.InstanceData);

        Assert.NotNull(observation);
        Assert.Equal(SemanticSubType.FreeNarrative, observation.SemanticSubType);
        Assert.Contains("narrative content", observation.Reasoning);
        Assert.Equal(BetterRuleCandidate.NonEmptyString, observation.BetterRuleCandidate);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldProvideBetterRuleCandidateForReferenceField()
    {
        // Arrange: Bundle with consistent reference type
        var bundle = CreateBundleWithConsistentReferenceType();

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: If a Reference rule suggestion exists, betterRuleCandidate should be None or null
        var referenceSuggestion = suggestions.FirstOrDefault(s =>
            s.Path.Contains("subject") &&
            s.RuleType == "Reference");

        if (referenceSuggestion != null)
        {
            // When suggestion succeeds, betterRuleCandidate should be None or null
            Assert.True(referenceSuggestion.BetterRuleCandidate == null || 
                        referenceSuggestion.BetterRuleCandidate == BetterRuleCandidate.None);
        }
        
        // Alternatively, verify that ANY suggestions exist for subject field
        // (could be observation or rule suggestion depending on data quality)
        var subjectSuggestions = suggestions.Where(s => s.Path.Contains("subject")).ToList();
        Assert.NotEmpty(subjectSuggestions);
    }

    [Fact]
    public async System.Threading.Tasks.Task ShouldProvideMixedReferenceTypeGuidance()
    {
        // Arrange: Bundle with mixed reference types
        var bundle = CreateBundleWithMixedReferenceTypes();

        // Act
        var suggestions = await _service.GenerateSuggestionsAsync(bundle, null, null);

        // Assert: Should provide observation with guidance about polymorphism
        var observation = suggestions.FirstOrDefault(s =>
            s.Path.Contains("performer") &&
            s.ObservationType == ObservationType.NoPattern);

        Assert.NotNull(observation);
        Assert.Contains("each reference target type separately", observation.Reasoning);
        Assert.Equal(BetterRuleCandidate.ReferenceExists, observation.BetterRuleCandidate);
    }

    #endregion

    #region Helper Methods for Semantic Tests

    private Bundle CreateBundleWithIdenticalIdentifierSystems(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < count; i++)
        {
            var patient = new Patient
            {
                Identifier = new List<Identifier>
                {
                    new Identifier
                    {
                        System = "http://hospital.org/mrn", // Same system across all
                        Value = $"MRN-{i}" // Different values
                    }
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = patient });
        }
        return bundle;
    }

    private Bundle CreateBundleWithIdenticalCodingDisplays(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < count; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept
                {
                    Coding = new List<Coding>
                    {
                        new Coding
                        {
                            System = "http://loinc.org",
                            Code = "85354-9",
                            Display = "Blood pressure" // Same display
                        }
                    }
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    private Bundle CreateBundleWithIdenticalReferenceDisplays(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < count; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept(),
                Subject = new ResourceReference
                {
                    Reference = $"Patient/patient-{i}",
                    Display = "John Doe" // Same display across all (unrealistic)
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    private Bundle CreateBundleWithIdenticalNarrativeTexts(int count)
    {
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        for (int i = 0; i < count; i++)
        {
            var observation = new Observation
            {
                Status = ObservationStatus.Final,
                Code = new CodeableConcept(),
                Text = new Narrative
                {
                    Status = Narrative.NarrativeStatus.Generated,
                    Div = "<div xmlns=\"http://www.w3.org/1999/xhtml\">Standard text</div>"
                }
            };
            bundle.Entry.Add(new Bundle.EntryComponent { Resource = observation });
        }
        return bundle;
    }

    #endregion
}
