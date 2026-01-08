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
/// Phase 3.2: Tests for complex datatype fixed value validation.
/// Tests Coding, CodeableConcept, Quantity, Identifier matching using Bundle top-level properties.
/// </summary>
public class FixedValueComplexTypeValidatorTests
{
    private readonly FixedValueValidator _validator;
    private readonly ElementPathResolver _pathResolver;
    private readonly ModelInspector _inspector;

    public FixedValueComplexTypeValidatorTests()
    {
        _pathResolver = new ElementPathResolver(NullLogger<ElementPathResolver>.Instance);
        _validator = new FixedValueValidator(
            NullLogger<FixedValueValidator>.Instance,
            _pathResolver);
        _inspector = ModelInspector.ForAssembly(typeof(Bundle).Assembly);
    }

    [Fact]
    public void Coding_MatchingSystemAndCode_ReturnsNull()
    {
        // Arrange
        var bundle = new Bundle
        {
            Meta = new Meta
            {
                Security = new List<Coding>
                {
                    new Coding { System = "http://example.org/sec", Code = "test" }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.meta.security",
            kind: SdConstraintKind.FixedValue,
            expected: new Coding { System = "http://example.org/sec", Code = "test" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Coding match test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().BeNull();
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
            kind: SdConstraintKind.FixedValue,
            expected: new Coding { System = "http://example.org/sec", Code = "test" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Code mismatch test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().NotBeNull();
        result!.ErrorCode.Should().Be("SD_FIXED_VALUE_MISMATCH");
    }

    [Fact]
    public void CodeableConcept_OneMatchingCodingAmongMany_ReturnsNull()
    {
        // Arrange: Bundle.meta.tag is List<Coding>, test if one matches
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
            kind: SdConstraintKind.FixedValue,
            expected: new Coding { System = "http://example.org/tags", Code = "test" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Coding match among many test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().BeNull("one matching coding should pass");
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
            kind: SdConstraintKind.FixedValue,
            expected: new Coding { System = "http://example.org/tags", Code = "test" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "No matching codings test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().NotBeNull();
        result!.ErrorCode.Should().Be("SD_FIXED_VALUE_MISMATCH");
    }

    [Fact]
    public void Quantity_MatchingValueSystemCode_ReturnsNull()
    {
        // Arrange: Use Bundle.timestamp which is instant (primitive), so we test with a custom extension
        // Actually, let's use a simpler approach - just test the matching logic is sound
        // by using Patient.birthDate which is a date, but we'll cheat and put a Quantity in meta.extension
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
            kind: SdConstraintKind.FixedValue,
            expected: new Quantity { Value = 185, System = "http://unitsofmeasure.org", Code = "cm", Unit = "centimeters" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Quantity match test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().BeNull("matching quantity should pass");
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
                            Unit = "meters"  // Wrong
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.meta.extension.value",
            kind: SdConstraintKind.FixedValue,
            expected: new Quantity { Value = 185, System = "http://unitsofmeasure.org", Code = "cm", Unit = "centimeters" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Quantity mismatch test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().NotBeNull();
        result!.ErrorCode.Should().Be("SD_FIXED_VALUE_MISMATCH");
    }

    [Fact]
    public void Identifier_MatchingSystemAndValue_ReturnsNull()
    {
        // Arrange
        var bundle = new Bundle
        {
            Identifier = new Identifier
            {
                System = "http://hospital.example.org/bundles",
                Value = "12345"
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.identifier",
            kind: SdConstraintKind.FixedValue,
            expected: new Identifier { System = "http://hospital.example.org/bundles", Value = "12345" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Identifier match test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().BeNull("matching identifier should pass");
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
            kind: SdConstraintKind.FixedValue,
            expected: new Identifier { System = "http://hospital.example.org/bundles", Value = "12345" },
            sourceProfile: "http://example.org/StructureDefinition/TestProfile",
            description: "Identifier mismatch test"
        );

        var context = new FirelyValidationContext(bundle, new CachedResolver(new MultiResolver()), _inspector);

        // Act
        var result = _validator.Validate(constraint, context);

        // Assert
        result.Should().NotBeNull();
        result!.ErrorCode.Should().Be("SD_FIXED_VALUE_MISMATCH");
    }
}
