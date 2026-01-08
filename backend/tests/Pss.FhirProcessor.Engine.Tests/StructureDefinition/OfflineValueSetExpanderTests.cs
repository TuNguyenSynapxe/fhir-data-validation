using FluentAssertions;
using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Microsoft.Extensions.Logging.Abstractions;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.SdValidation;
using Pss.FhirProcessor.Engine.SdValidation.Terminology;
using Pss.FhirProcessor.Engine.SdValidation.Validators;
using Pss.FhirProcessor.Engine.SdValidation.PathResolution;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.StructureDefinition;

/// <summary>
/// Phase 3.4: Tests for offline nested ValueSet expansion.
/// Validates that RequiredBindingValidator correctly handles:
/// - Nested ValueSet imports (compose.include.valueSet[])
/// - Cycle detection
/// - Unresolvable imports
/// - Explicit code validation after expansion
/// </summary>
public class OfflineValueSetExpanderTests
{
    private readonly RequiredBindingValidator _validator;
    private readonly IOfflineValueSetExpander _expander;
    private readonly IElementPathResolver _pathResolver;

    public OfflineValueSetExpanderTests()
    {
        _pathResolver = new ElementPathResolver(NullLogger<ElementPathResolver>.Instance);
        _expander = new OfflineValueSetExpander(NullLogger<OfflineValueSetExpander>.Instance);
        _validator = new RequiredBindingValidator(
            NullLogger<RequiredBindingValidator>.Instance,
            _pathResolver,
            _expander);
    }

    /// <summary>
    /// Phase 3.4: Test 1 - Nested ValueSet PASS
    /// VS A includes VS B, VS B includes explicit concepts, code matches → PASS
    /// </summary>
    [Fact]
    public void Validate_NestedValueSet_ValidCode_ReturnsNoError()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        // VS B: Contains explicit concepts
        var valueSetB = new ValueSet
        {
            Url = "http://test.org/ValueSet/nested-b",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        System = "http://hl7.org/fhir/bundle-type",
                        Concept = new List<ValueSet.ConceptReferenceComponent>
                        {
                            new ValueSet.ConceptReferenceComponent { Code = "collection" },
                            new ValueSet.ConceptReferenceComponent { Code = "document" }
                        }
                    }
                }
            }
        };

        // VS A: Imports VS B
        var valueSetA = new ValueSet
        {
            Url = "http://test.org/ValueSet/nested-a",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        ValueSetElement = new List<Canonical>
                        {
                            new Canonical("http://test.org/ValueSet/nested-b")
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/nested-a",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Phase 3.4: Nested ValueSet test"
        );

        var resolver = new InMemoryResourceResolver(valueSetA, valueSetB);
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().BeNull("code 'collection' should be found in nested ValueSet B");
    }

    /// <summary>
    /// Phase 3.4: Test 2 - Nested ValueSet INVALID CODE
    /// VS resolved, code not found → SD_REQUIRED_BINDING_INVALID_CODE
    /// </summary>
    [Fact]
    public void Validate_NestedValueSet_InvalidCode_ReturnsError()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Message // Not in nested ValueSet
        };

        // VS B: Contains explicit concepts (collection, document)
        var valueSetB = new ValueSet
        {
            Url = "http://test.org/ValueSet/nested-b",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        System = "http://hl7.org/fhir/bundle-type",
                        Concept = new List<ValueSet.ConceptReferenceComponent>
                        {
                            new ValueSet.ConceptReferenceComponent { Code = "collection" },
                            new ValueSet.ConceptReferenceComponent { Code = "document" }
                        }
                    }
                }
            }
        };

        // VS A: Imports VS B
        var valueSetA = new ValueSet
        {
            Url = "http://test.org/ValueSet/nested-a",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        ValueSetElement = new List<Canonical>
                        {
                            new Canonical("http://test.org/ValueSet/nested-b")
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/nested-a",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Phase 3.4: Nested ValueSet invalid code test"
        );

        var resolver = new InMemoryResourceResolver(valueSetA, valueSetB);
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().NotBeNull("code 'message' is not in nested ValueSet");
        error!.ErrorCode.Should().Be("SD_REQUIRED_BINDING_INVALID_CODE");
        error.Severity.Should().Be("error");
        error.Details.Should().ContainKey("suppliedCode");
        error.Details["suppliedCode"].Should().Be("message");
    }

    /// <summary>
    /// Phase 3.4: Test 3 - Nested ValueSet UNRESOLVABLE
    /// VS import cannot be resolved, Strict → ERROR, Permissive → WARNING
    /// </summary>
    [Fact]
    public void Validate_NestedValueSet_Unresolvable_Strict_ReturnsError()
    {
        // Arrange
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Strict;

        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        // VS A: Imports VS B (which doesn't exist in resolver)
        var valueSetA = new ValueSet
        {
            Url = "http://test.org/ValueSet/nested-a",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        ValueSetElement = new List<Canonical>
                        {
                            new Canonical("http://test.org/ValueSet/missing-b")
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/nested-a",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Phase 3.4: Unresolvable nested ValueSet test"
        );

        // Resolver only has VS A, not VS B
        var resolver = new InMemoryResourceResolver(valueSetA);
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().NotBeNull("nested ValueSet cannot be resolved");
        error!.ErrorCode.Should().Be("SD_REQUIRED_BINDING_AMBIGUOUS_VALUESET");
        error.Severity.Should().Be("error", "Strict mode should return error");
        error.Details.Should().ContainKey("violationReason");
        error.Details["violationReason"].Should().Be(SdViolationReason.UnresolvableValueSet.ToString());
    }

    [Fact]
    public void Validate_NestedValueSet_Unresolvable_Permissive_ReturnsWarning()
    {
        // Arrange
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Permissive;

        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        // VS A: Imports VS B (which doesn't exist in resolver)
        var valueSetA = new ValueSet
        {
            Url = "http://test.org/ValueSet/nested-a",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        ValueSetElement = new List<Canonical>
                        {
                            new Canonical("http://test.org/ValueSet/missing-b")
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/nested-a",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Phase 3.4: Unresolvable nested ValueSet permissive test"
        );

        // Resolver only has VS A, not VS B
        var resolver = new InMemoryResourceResolver(valueSetA);
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().NotBeNull("nested ValueSet cannot be resolved");
        error!.Severity.Should().Be("warning", "Permissive mode should return warning");
        error.Details["violationReason"].Should().Be(SdViolationReason.UnresolvableValueSet.ToString());

        // Cleanup
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Strict;
    }

    /// <summary>
    /// Phase 3.4: Test 4 - Cyclic ValueSet Reference
    /// A → B → A must not loop, must emit CyclicValueSetReference
    /// </summary>
    [Fact]
    public void Validate_CyclicValueSet_Strict_ReturnsError()
    {
        // Arrange
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Strict;

        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        // VS A: Imports VS B
        var valueSetA = new ValueSet
        {
            Url = "http://test.org/ValueSet/cyclic-a",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        ValueSetElement = new List<Canonical>
                        {
                            new Canonical("http://test.org/ValueSet/cyclic-b")
                        }
                    }
                }
            }
        };

        // VS B: Imports VS A (creates cycle)
        var valueSetB = new ValueSet
        {
            Url = "http://test.org/ValueSet/cyclic-b",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        ValueSetElement = new List<Canonical>
                        {
                            new Canonical("http://test.org/ValueSet/cyclic-a")
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/cyclic-a",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Phase 3.4: Cyclic ValueSet test"
        );

        var resolver = new InMemoryResourceResolver(valueSetA, valueSetB);
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().NotBeNull("cyclic reference should be detected");
        error!.ErrorCode.Should().Be("SD_REQUIRED_BINDING_AMBIGUOUS_VALUESET");
        error.Severity.Should().Be("error", "Strict mode should return error");
        error.Details.Should().ContainKey("violationReason");
        error.Details["violationReason"].Should().Be(SdViolationReason.CyclicValueSetReference.ToString());
    }

    [Fact]
    public void Validate_CyclicValueSet_Permissive_ReturnsWarning()
    {
        // Arrange
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Permissive;

        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        // VS A: Imports VS B
        var valueSetA = new ValueSet
        {
            Url = "http://test.org/ValueSet/cyclic-a",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        ValueSetElement = new List<Canonical>
                        {
                            new Canonical("http://test.org/ValueSet/cyclic-b")
                        }
                    }
                }
            }
        };

        // VS B: Imports VS A (creates cycle)
        var valueSetB = new ValueSet
        {
            Url = "http://test.org/ValueSet/cyclic-b",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        ValueSetElement = new List<Canonical>
                        {
                            new Canonical("http://test.org/ValueSet/cyclic-a")
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/cyclic-a",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Phase 3.4: Cyclic ValueSet permissive test"
        );

        var resolver = new InMemoryResourceResolver(valueSetA, valueSetB);
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().NotBeNull("cyclic reference should be detected");
        error!.Severity.Should().Be("warning", "Permissive mode should return warning");
        error.Details["violationReason"].Should().Be(SdViolationReason.CyclicValueSetReference.ToString());

        // Cleanup
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Strict;
    }
}
