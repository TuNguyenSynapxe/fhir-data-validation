using FluentAssertions;
using Hl7.Fhir.Model;
using Hl7.Fhir.Introspection;
using Hl7.Fhir.Specification.Source;
using Microsoft.Extensions.Logging.Abstractions;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.SdValidation;
using Pss.FhirProcessor.Engine.SdValidation.Validators;
using Pss.FhirProcessor.Engine.SdValidation.PathResolution;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.StructureDefinition;

/// <summary>
/// Phase 3.3: Tests for complex datatype pattern matching.
/// Pattern semantics: "actual MUST contain at least the structure and values in pattern"
/// </summary>
public class PatternValueComplexTypeValidatorTests
{
    private readonly PatternValueValidator _validator;
    private readonly ElementPathResolver _pathResolver;
    private readonly ModelInspector _inspector;

    public PatternValueComplexTypeValidatorTests()
    {
        _pathResolver = new ElementPathResolver(NullLogger<ElementPathResolver>.Instance);
        _validator = new PatternValueValidator(
            NullLogger<PatternValueValidator>.Instance,
            _pathResolver);
        _inspector = ModelInspector.ForAssembly(typeof(Bundle).Assembly);
    }

    #region Coding Tests

    [Fact]
    public void Coding_PatternWithSystemAndCode_MatchesActualWithExtras_ReturnsNull()
    {
        // Arrange: Pattern has system+code, actual has extras (version, display)
        var bundle = new Bundle
        {
            Meta = new Meta
            {
                Security = new List<Coding>
                {
                    new Coding
                    {
                        System = "http://example.org/sec",
                        Code = "test",
                        Version = "1.0",
                        Display = "Test Security"
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.meta.security",
            kind: SdConstraintKind.Pattern,
            expected: new Coding { System = "http://example.org/sec", Code = "test" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Coding pattern with extras test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().BeNull("pattern matches even with extra fields in actual");
    }

    [Fact]
    public void Coding_CodeMismatch_ReturnsError()
    {
        // Arrange
        var bundle = new Bundle
        {
            Meta = new Meta
            {
                Security = new List<Coding>
                {
                    new Coding { System = "http://example.org/sec", Code = "wrong" }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.meta.security",
            kind: SdConstraintKind.Pattern,
            expected: new Coding { System = "http://example.org/sec", Code = "test" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Code mismatch test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().NotBeNull();
        result!.ErrorCode.Should().Be("SD_PATTERN_MISMATCH");
    }

    #endregion

    #region CodeableConcept Tests

    [Fact]
    public void CodeableConcept_OneMatchingCodingAmongMany_ReturnsNull()
    {
        // Arrange: Actual has multiple codings, one matches pattern
        var bundle = new Bundle
        {
            Meta = new Meta
            {
                Tag = new List<Coding>
                {
                    new Coding { System = "http://example.org/other", Code = "OTHER" },
                    new Coding { System = "http://example.org/tags", Code = "test" },
                    new Coding { System = "http://example.org/another", Code = "ANOTHER" }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.meta.tag",
            kind: SdConstraintKind.Pattern,
            expected: new Coding { System = "http://example.org/tags", Code = "test" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Coding pattern among many test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().BeNull("one matching coding should satisfy pattern");
    }

    [Fact]
    public void CodeableConcept_NoMatchingCodings_ReturnsError()
    {
        // Arrange
        var bundle = new Bundle
        {
            Meta = new Meta
            {
                Tag = new List<Coding>
                {
                    new Coding { System = "http://example.org/wrong", Code = "WRONG" }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.meta.tag",
            kind: SdConstraintKind.Pattern,
            expected: new Coding { System = "http://example.org/tags", Code = "test" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "No matching codings test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().NotBeNull();
        result!.ErrorCode.Should().Be("SD_PATTERN_MISMATCH");
    }

    #endregion

    #region Quantity Tests

    [Fact]
    public void Quantity_PatternValueAndUnit_MatchesActual_ReturnsNull()
    {
        // Arrange
        var bundle = new Bundle
        {
            Meta = new Meta
            {
                Extension = new List<Extension>
                {
                    new Extension
                    {
                        Url = "http://example.org/ext",
                        Value = new Quantity
                        {
                            Value = 185,
                            System = "http://unitsofmeasure.org",
                            Code = "cm",
                            Unit = "centimeters"
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.meta.extension.value",
            kind: SdConstraintKind.Pattern,
            expected: new Quantity { Value = 185, Unit = "centimeters" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Quantity pattern test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().BeNull("pattern matches with value and unit");
    }

    [Fact]
    public void Quantity_UnitMismatch_ReturnsError()
    {
        // Arrange
        var bundle = new Bundle
        {
            Meta = new Meta
            {
                Extension = new List<Extension>
                {
                    new Extension
                    {
                        Url = "http://example.org/ext",
                        Value = new Quantity
                        {
                            Value = 185,
                            System = "http://unitsofmeasure.org",
                            Code = "cm",
                            Unit = "meters"
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.meta.extension.value",
            kind: SdConstraintKind.Pattern,
            expected: new Quantity { Value = 185, Unit = "centimeters" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Quantity unit mismatch test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().NotBeNull();
        result!.ErrorCode.Should().Be("SD_PATTERN_MISMATCH");
    }

    #endregion

    #region Identifier Tests

    [Fact]
    public void Identifier_PatternSystemAndValue_MatchesActual_ReturnsNull()
    {
        // Arrange
        var bundle = new Bundle
        {
            Identifier = new Identifier
            {
                System = "http://hospital.example.org/bundles",
                Value = "12345",
                Use = Identifier.IdentifierUse.Official
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.identifier",
            kind: SdConstraintKind.Pattern,
            expected: new Identifier { System = "http://hospital.example.org/bundles", Value = "12345" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Identifier pattern test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().BeNull("pattern matches even with extra 'use' field");
    }

    [Fact]
    public void Identifier_ValueMismatch_ReturnsError()
    {
        // Arrange
        var bundle = new Bundle
        {
            Identifier = new Identifier
            {
                System = "http://hospital.example.org/bundles",
                Value = "67890"
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.identifier",
            kind: SdConstraintKind.Pattern,
            expected: new Identifier { System = "http://hospital.example.org/bundles", Value = "12345" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Identifier value mismatch test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().NotBeNull();
        result!.ErrorCode.Should().Be("SD_PATTERN_MISMATCH");
    }

    #endregion

    #region HumanName Tests

    [Fact]
    public void HumanName_PatternFamilyAndGiven_MatchesActual_ReturnsNull()
    {
        // Arrange: Actual has all pattern fields plus extras
        var bundle = new Bundle
        {
            Meta = new Meta
            {
                Extension = new List<Extension>
                {
                    new Extension
                    {
                        Url = "http://example.org/name",
                        Value = new HumanName
                        {
                            Family = "Smith",
                            Given = new[] { "John", "Michael", "Jr" },
                            Use = HumanName.NameUse.Official
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.meta.extension.value",
            kind: SdConstraintKind.Pattern,
            expected: new HumanName { Family = "Smith", Given = new[] { "John", "Michael" } },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "HumanName pattern test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().BeNull("pattern matches - given order doesn't matter and extras allowed");
    }

    [Fact]
    public void HumanName_MissingGiven_ReturnsError()
    {
        // Arrange
        var bundle = new Bundle
        {
            Meta = new Meta
            {
                Extension = new List<Extension>
                {
                    new Extension
                    {
                        Url = "http://example.org/name",
                        Value = new HumanName
                        {
                            Family = "Smith",
                            Given = new[] { "John" }
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.meta.extension.value",
            kind: SdConstraintKind.Pattern,
            expected: new HumanName { Family = "Smith", Given = new[] { "John", "Michael" } },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "HumanName missing given test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().NotBeNull();
        result!.ErrorCode.Should().Be("SD_PATTERN_MISMATCH");
    }

    #endregion

    #region Address Tests

    [Fact]
    public void Address_PatternCityAndPostalCode_MatchesActual_ReturnsNull()
    {
        // Arrange
        var bundle = new Bundle
        {
            Meta = new Meta
            {
                Extension = new List<Extension>
                {
                    new Extension
                    {
                        Url = "http://example.org/addr",
                        Value = new Address
                        {
                            City = "Boston",
                            PostalCode = "02134",
                            State = "MA",
                            Country = "USA",
                            Line = new[] { "123 Main St", "Apt 4" }
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.meta.extension.value",
            kind: SdConstraintKind.Pattern,
            expected: new Address { City = "Boston", PostalCode = "02134" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Address pattern test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().BeNull("pattern matches with city and postal code");
    }

    [Fact]
    public void Address_MissingCity_ReturnsError()
    {
        // Arrange
        var bundle = new Bundle
        {
            Meta = new Meta
            {
                Extension = new List<Extension>
                {
                    new Extension
                    {
                        Url = "http://example.org/addr",
                        Value = new Address
                        {
                            PostalCode = "02134",
                            State = "MA"
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.meta.extension.value",
            kind: SdConstraintKind.Pattern,
            expected: new Address { City = "Boston", PostalCode = "02134" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Address missing city test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().NotBeNull();
        result!.ErrorCode.Should().Be("SD_PATTERN_MISMATCH");
    }

    #endregion
}
