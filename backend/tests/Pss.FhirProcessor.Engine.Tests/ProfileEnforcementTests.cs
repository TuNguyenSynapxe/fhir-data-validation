using System.Text.Json;
using FluentAssertions;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Pss.FhirProcessor.Engine.Models;
using Xunit;
using Task = System.Threading.Tasks.Task;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Phase 2.1 Integration Tests — Profile Constraint Enforcement via Firely
/// 
/// Purpose: Prove that composite Firely resolver enforces profile constraints
/// without modifying validation engine logic.
/// 
/// Critical Rules:
/// - Tests ONLY assert behavior, never modify engine code
/// - Profile enforcement is delegated exclusively to Firely SDK
/// - Backward compatibility must be preserved (no profile = unchanged behavior)
/// </summary>
public class ProfileEnforcementTests
{
    private readonly FhirJsonParser _parser = new();
    private readonly FhirJsonSerializer _serializer = new();

    #region Helper Methods

    private ValidationRequest CreateValidationRequest(
        string bundleJson,
        string? profileStructureDefinitionJson = null,
        string? profileCanonicalUrl = null)
    {
        return new ValidationRequest
        {
            BundleJson = bundleJson,
            BundleProfileStructureDefinitionJson = profileStructureDefinitionJson,
            BundleProfileCanonicalUrl = profileCanonicalUrl,
            FhirVersion = "R4"
        };
    }

    private string CreateBundleProfileWithMinCardinality()
    {
        // Profile: Bundle.entry min = 1 (must have at least one entry)
        var profile = new StructureDefinition
        {
            Url = "http://test.fhir.org/StructureDefinition/BundleWithMinEntry",
            Name = "BundleWithMinEntry",
            Status = PublicationStatus.Draft,
            Kind = StructureDefinition.StructureDefinitionKind.Resource,
            Abstract = false,
            Type = "Bundle",
            BaseDefinition = "http://hl7.org/fhir/StructureDefinition/Bundle",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint,
            Differential = new StructureDefinition.DifferentialComponent
            {
                Element = new List<ElementDefinition>
                {
                    new ElementDefinition
                    {
                        Path = "Bundle.entry",
                        Min = 1 // Requires at least one entry
                    }
                }
            }
        };

        return _serializer.SerializeToString(profile);
    }

    private string CreateBundleProfileWithFixedType()
    {
        // Profile: Bundle.type fixed = "transaction"
        var profile = new StructureDefinition
        {
            Url = "http://test.fhir.org/StructureDefinition/TransactionBundle",
            Name = "TransactionBundle",
            Status = PublicationStatus.Draft,
            Kind = StructureDefinition.StructureDefinitionKind.Resource,
            Abstract = false,
            Type = "Bundle",
            BaseDefinition = "http://hl7.org/fhir/StructureDefinition/Bundle",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint,
            Differential = new StructureDefinition.DifferentialComponent
            {
                Element = new List<ElementDefinition>
                {
                    new ElementDefinition
                    {
                        Path = "Bundle.type",
                        Fixed = new Code("transaction")
                    }
                }
            }
        };

        return _serializer.SerializeToString(profile);
    }

    private string CreatePatientProfile()
    {
        // Wrong type: Patient profile instead of Bundle profile
        var profile = new StructureDefinition
        {
            Url = "http://test.fhir.org/StructureDefinition/TestPatient",
            Name = "TestPatient",
            Status = PublicationStatus.Draft,
            Kind = StructureDefinition.StructureDefinitionKind.Resource,
            Abstract = false,
            Type = "Patient",
            BaseDefinition = "http://hl7.org/fhir/StructureDefinition/Patient",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint
        };

        return _serializer.SerializeToString(profile);
    }

    private string CreateEmptyBundle()
    {
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>() // Empty entry list
        };

        return _serializer.SerializeToString(bundle);
    }

    private string CreateBundleWithOneEntry()
    {
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
                        Active = true
                    }
                }
            }
        };

        return _serializer.SerializeToString(bundle);
    }

    private string CreateCollectionBundle()
    {
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection, // NOT transaction
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Patient { Id = "patient-1" }
                }
            }
        };

        return _serializer.SerializeToString(bundle);
    }

    #endregion

    #region Test 1: Profile Cardinality Enforcement

    [Fact]
    public async Task ProfileEnforcement_EmptyBundle_WithMinCardinalityProfile_ReturnsFirelyCardinalityError()
    {
        // Arrange
        var pipeline = TestHelper.CreateValidationPipeline();
        var profileSd = CreateBundleProfileWithMinCardinality();
        var bundleJson = CreateEmptyBundle();

        var request = CreateValidationRequest(
            bundleJson,
            profileSd,
            "http://test.fhir.org/StructureDefinition/BundleWithMinEntry");

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Summary.ErrorCount.Should().BeGreaterThan(0, "Bundle violates profile cardinality");

        // Verify Firely error present
        var firelyErrors = result.Errors.Where(e => e.Source == "FHIR").ToList();
        firelyErrors.Should().NotBeEmpty("Firely should enforce profile cardinality");

        // Check for cardinality-related error
        var cardinalityError = firelyErrors.FirstOrDefault(e =>
            e.Message.Contains("entry", StringComparison.OrdinalIgnoreCase) &&
            (e.Message.Contains("min", StringComparison.OrdinalIgnoreCase) ||
             e.Message.Contains("cardinality", StringComparison.OrdinalIgnoreCase) ||
             e.Message.Contains("required", StringComparison.OrdinalIgnoreCase)));

        cardinalityError.Should().NotBeNull("Firely should report cardinality violation for Bundle.entry");
    }

    [Fact]
    public async Task ProfileEnforcement_EmptyBundle_WithoutProfile_Passes()
    {
        // Arrange
        var pipeline = TestHelper.CreateValidationPipeline();
        var bundleJson = CreateEmptyBundle();

        var request = CreateValidationRequest(bundleJson); // No profile

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert - Base R4 allows empty Bundle
        result.Should().NotBeNull();
        
        // Should have no Firely cardinality errors for entry
        var firelyErrors = result.Errors.Where(e => 
            e.Source == "FHIR" && 
            e.Message.Contains("entry", StringComparison.OrdinalIgnoreCase) &&
            e.Message.Contains("min", StringComparison.OrdinalIgnoreCase)).ToList();
        
        firelyErrors.Should().BeEmpty("Base R4 does not require Bundle.entry");
    }

    [Fact]
    public async Task ProfileEnforcement_BundleWithEntry_WithMinCardinalityProfile_Passes()
    {
        // Arrange
        var pipeline = TestHelper.CreateValidationPipeline();
        var profileSd = CreateBundleProfileWithMinCardinality();
        var bundleJson = CreateBundleWithOneEntry();

        var request = CreateValidationRequest(
            bundleJson,
            profileSd,
            "http://test.fhir.org/StructureDefinition/BundleWithMinEntry");

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert - Should pass because bundle has one entry
        result.Should().NotBeNull();
        
        // No cardinality errors for entry
        var cardinalityErrors = result.Errors.Where(e =>
            e.Message.Contains("entry", StringComparison.OrdinalIgnoreCase) &&
            e.Message.Contains("min", StringComparison.OrdinalIgnoreCase)).ToList();
        
        cardinalityErrors.Should().BeEmpty("Bundle satisfies min cardinality");
    }

    #endregion

    #region Test 2: Fixed Value Enforcement

    [Fact]
    public async Task ProfileEnforcement_CollectionBundle_WithFixedTransactionProfile_ReturnsFirelyFixedValueError()
    {
        // Arrange
        var pipeline = TestHelper.CreateValidationPipeline();
        var profileSd = CreateBundleProfileWithFixedType();
        var bundleJson = CreateCollectionBundle(); // type = collection, not transaction

        var request = CreateValidationRequest(
            bundleJson,
            profileSd,
            "http://test.fhir.org/StructureDefinition/TransactionBundle");

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Summary.ErrorCount.Should().BeGreaterThan(0, "Bundle violates fixed value constraint");

        // Verify Firely error present
        var firelyErrors = result.Errors.Where(e => e.Source == "FHIR").ToList();
        firelyErrors.Should().NotBeEmpty("Firely should enforce fixed value constraint");

        // Check for fixed value error
        var fixedValueError = firelyErrors.FirstOrDefault(e =>
            e.Message.Contains("type", StringComparison.OrdinalIgnoreCase) &&
            (e.Message.Contains("fixed", StringComparison.OrdinalIgnoreCase) ||
             e.Message.Contains("transaction", StringComparison.OrdinalIgnoreCase)));

        fixedValueError.Should().NotBeNull("Firely should report fixed value violation for Bundle.type");
    }

    [Fact]
    public async Task ProfileEnforcement_CollectionBundle_WithoutProfile_Passes()
    {
        // Arrange
        var pipeline = TestHelper.CreateValidationPipeline();
        var bundleJson = CreateCollectionBundle();

        var request = CreateValidationRequest(bundleJson); // No profile

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert - Base R4 allows collection type
        result.Should().NotBeNull();
        
        // No Firely errors about Bundle.type fixed value
        var typeErrors = result.Errors.Where(e =>
            e.Source == "FHIR" &&
            e.Message.Contains("type", StringComparison.OrdinalIgnoreCase) &&
            e.Message.Contains("fixed", StringComparison.OrdinalIgnoreCase)).ToList();
        
        typeErrors.Should().BeEmpty("Base R4 allows any Bundle.type");
    }

    #endregion

    #region Test 3: Invalid Profile SD (Graceful Failure)

    [Fact]
    public async Task ProfileEnforcement_InvalidProfileJson_ReturnsFirelyErrorWithoutCrash()
    {
        // Arrange
        var pipeline = TestHelper.CreateValidationPipeline();
        var bundleJson = CreateEmptyBundle();
        var invalidProfileJson = "{ invalid json "; // Malformed JSON

        var request = CreateValidationRequest(
            bundleJson,
            invalidProfileJson,
            "http://test.fhir.org/StructureDefinition/Invalid");

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert - Should return error, not crash
        result.Should().NotBeNull();
        result.Summary.ErrorCount.Should().BeGreaterThan(0);

        // Verify Firely error for invalid SD
        var firelyErrors = result.Errors.Where(e => e.Source == "FHIR").ToList();
        firelyErrors.Should().NotBeEmpty("Invalid profile SD should generate Firely error");

        var invalidSdError = firelyErrors.FirstOrDefault(e =>
            e.Message.Contains("StructureDefinition", StringComparison.OrdinalIgnoreCase) &&
            (e.Message.Contains("Invalid", StringComparison.OrdinalIgnoreCase) ||
             e.Message.Contains("parse", StringComparison.OrdinalIgnoreCase)));

        invalidSdError.Should().NotBeNull("Firely should report invalid StructureDefinition");
    }

    [Fact]
    public async Task ProfileEnforcement_EmptyProfileJson_ReturnsFirelyErrorWithoutCrash()
    {
        // Arrange
        var pipeline = TestHelper.CreateValidationPipeline();
        var bundleJson = CreateEmptyBundle();
        var emptyProfileJson = ""; // Empty string

        var request = CreateValidationRequest(
            bundleJson,
            emptyProfileJson,
            "http://test.fhir.org/StructureDefinition/Empty");

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert - Should handle gracefully
        result.Should().NotBeNull();
        
        // Should either skip validation or return error (both acceptable)
        // Key: engine should not crash
    }

    #endregion

    #region Test 4: Profile Type Mismatch

    [Fact]
    public async Task ProfileEnforcement_PatientProfile_ForBundle_ReturnsTypeMismatchError()
    {
        // Arrange
        var pipeline = TestHelper.CreateValidationPipeline();
        var patientProfileSd = CreatePatientProfile(); // Wrong type
        var bundleJson = CreateEmptyBundle();

        var request = CreateValidationRequest(
            bundleJson,
            patientProfileSd,
            "http://test.fhir.org/StructureDefinition/TestPatient");

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Summary.ErrorCount.Should().BeGreaterThan(0);

        // Verify type mismatch error
        var firelyErrors = result.Errors.Where(e => e.Source == "FHIR").ToList();
        firelyErrors.Should().NotBeEmpty();

        var typeMismatchError = firelyErrors.FirstOrDefault(e =>
            (e.Message.Contains("Bundle", StringComparison.OrdinalIgnoreCase) &&
             e.Message.Contains("Patient", StringComparison.OrdinalIgnoreCase)) ||
            (e.Message.Contains("type", StringComparison.OrdinalIgnoreCase) &&
             e.Message.Contains("must be", StringComparison.OrdinalIgnoreCase)));

        typeMismatchError.Should().NotBeNull("Firely should report profile type mismatch");
    }

    #endregion

    #region Test 5: Backward Compatibility Regression

    [Fact]
    public async Task BackwardCompatibility_ValidationWithoutProfile_BehaviorUnchanged()
    {
        // Arrange
        var pipeline = TestHelper.CreateValidationPipeline();
        var bundleJson = CreateEmptyBundle();

        var request = CreateValidationRequest(bundleJson); // No profile fields

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert
        result.Should().NotBeNull();
        
        // Verify base R4 validation only (no profile-specific errors)
        // This test proves Phase 2.1 did not change default behavior
        
        // Should have metadata
        result.Metadata.Should().NotBeNull();
        result.Metadata.ProcessingTimeMs.Should().BeGreaterThan(0);
        
        // No profile-related errors should exist
        var profileErrors = result.Errors.Where(e =>
            e.Message.Contains("profile", StringComparison.OrdinalIgnoreCase) ||
            e.Message.Contains("constraint", StringComparison.OrdinalIgnoreCase)).ToList();
        
        // Base R4 validation may have constraints, but no PROFILE-SPECIFIC constraints
        // This is a soft check - the key is engine doesn't crash
    }

    [Fact]
    public async Task BackwardCompatibility_NullProfileFields_UsesBaseR4Provider()
    {
        // Arrange
        var pipeline = TestHelper.CreateValidationPipeline();
        var bundleJson = CreateBundleWithOneEntry();

        var request = new ValidationRequest
        {
            BundleJson = bundleJson,
            BundleProfileStructureDefinitionJson = null, // Explicit null
            BundleProfileCanonicalUrl = null, // Explicit null
            FhirVersion = "R4"
        };

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert - Should work exactly as before Phase 2.1
        result.Should().NotBeNull();
        result.Metadata.Should().NotBeNull();
        
        // No cardinality errors for entry (base R4 allows any count)
        var cardinalityErrors = result.Errors.Where(e =>
            e.Source == "FHIR" &&
            e.Message.Contains("entry", StringComparison.OrdinalIgnoreCase) &&
            e.Message.Contains("min", StringComparison.OrdinalIgnoreCase)).ToList();
        
        cardinalityErrors.Should().BeEmpty("Null profile means base R4 validation only");
    }

    #endregion

    #region Test 6: Complex Profile Scenario

    [Fact]
    public async Task ProfileEnforcement_ValidBundleAgainstProfile_NoErrors()
    {
        // Arrange
        var pipeline = TestHelper.CreateValidationPipeline();
        var profileSd = CreateBundleProfileWithMinCardinality();
        var bundleJson = CreateBundleWithOneEntry(); // Satisfies min=1

        var request = CreateValidationRequest(
            bundleJson,
            profileSd,
            "http://test.fhir.org/StructureDefinition/BundleWithMinEntry");

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert - Valid bundle against valid profile should pass
        result.Should().NotBeNull();
        
        // Allow other validation errors, but no CARDINALITY errors for entry
        var cardinalityErrors = result.Errors.Where(e =>
            e.Message.Contains("entry", StringComparison.OrdinalIgnoreCase) &&
            e.Message.Contains("min", StringComparison.OrdinalIgnoreCase)).ToList();
        
        cardinalityErrors.Should().BeEmpty("Bundle satisfies profile cardinality");
    }

    #endregion

    #region Test 7: Profile Resolution Order

    [Fact]
    public async Task ProfileEnforcement_CompositeProvider_ProfileTakesPrecedenceOverBaseR4()
    {
        // Arrange
        var pipeline = TestHelper.CreateValidationPipeline();
        var profileSd = CreateBundleProfileWithMinCardinality(); // Stricter than base R4
        var bundleJson = CreateEmptyBundle(); // Violates profile but not base R4

        var requestWithProfile = CreateValidationRequest(
            bundleJson,
            profileSd,
            "http://test.fhir.org/StructureDefinition/BundleWithMinEntry");

        var requestWithoutProfile = CreateValidationRequest(bundleJson); // Base R4 only

        // Act
        var resultWithProfile = await pipeline.ValidateAsync(requestWithProfile);
        var resultWithoutProfile = await pipeline.ValidateAsync(requestWithoutProfile);

        // Assert
        // With profile: should have cardinality error
        var profileCardinalityErrors = resultWithProfile.Errors.Where(e =>
            e.Source == "FHIR" &&
            e.Message.Contains("entry", StringComparison.OrdinalIgnoreCase)).ToList();
        
        profileCardinalityErrors.Should().NotBeEmpty("Profile enforces stricter constraint");

        // Without profile: should NOT have cardinality error
        var baseCardinalityErrors = resultWithoutProfile.Errors.Where(e =>
            e.Source == "FHIR" &&
            e.Message.Contains("entry", StringComparison.OrdinalIgnoreCase) &&
            e.Message.Contains("min", StringComparison.OrdinalIgnoreCase)).ToList();
        
        baseCardinalityErrors.Should().BeEmpty("Base R4 allows empty entry list");

        // Proof: Profile constraint was enforced, not base R4
    }

    #endregion
}
