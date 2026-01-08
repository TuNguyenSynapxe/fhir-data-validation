using FluentAssertions;
using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Microsoft.Extensions.Logging.Abstractions;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.SdValidation;
using Pss.FhirProcessor.Engine.SdValidation.Validators;
using Pss.FhirProcessor.Engine.SdValidation.PathResolution;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.StructureDefinition;

/// <summary>
/// Phase 2.3: Minimal unit tests for PatternValueValidator
/// Tests primitive pattern matching only (Code, String, Integer, Boolean)
/// </summary>
public class PatternValueValidatorTests
{
    private readonly PatternValueValidator _validator;

    public PatternValueValidatorTests()
    {
        var pathResolver = new ElementPathResolver(NullLogger<ElementPathResolver>.Instance);
        _validator = new PatternValueValidator(
            NullLogger<PatternValueValidator>.Instance,
            pathResolver);
    }

    [Fact]
    public void Validate_PatternMatches_ReturnsNoError()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.Pattern,
            expected: new Code("Collection"),
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Pattern test"
        );

        var context = new FirelyValidationContext(
            bundle,
            new InMemoryResourceResolver(),
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().BeNull();
    }

    [Fact]
    public void Validate_PatternMismatch_ReturnsError()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Document
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.Pattern,
            expected: new Code("Collection"),
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Pattern test"
        );

        var context = new FirelyValidationContext(
            bundle,
            new InMemoryResourceResolver(),
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().NotBeNull();
        error!.ErrorCode.Should().Be("SD_PATTERN_MISMATCH");
    }

    [Fact]
    public void Validate_PatternMissingElement_ReturnsError()
    {
        // Arrange
        var bundle = new Bundle();
        // Bundle.Type not set

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.Pattern,
            expected: new Code("Collection"),
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Pattern test"
        );

        var context = new FirelyValidationContext(
            bundle,
            new InMemoryResourceResolver(),
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().NotBeNull();
        error!.ErrorCode.Should().Be("SD_PATTERN_MISSING");
    }

    /// <summary>
    /// In-memory resource resolver for testing (no HTTP, no file system)
    /// </summary>
    private class InMemoryResourceResolver : IResourceResolver
    {
        public Resource? ResolveByCanonicalUri(string uri) => null;
        public Resource? ResolveByUri(string uri) => null;
    }
}
