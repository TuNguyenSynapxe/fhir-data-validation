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
/// Phase 2.4: Enforcement mode tests for RequiredBindingValidator.
/// Validates that Strict mode produces errors, Permissive mode produces warnings.
/// </summary>
public class RequiredBindingEnforcementModeTests : IDisposable
{
    private readonly RequiredBindingValidator _validator;
    private readonly SdEnforcementMode _originalMode;

    public RequiredBindingEnforcementModeTests()
    {
        var pathResolver = new ElementPathResolver(NullLogger<ElementPathResolver>.Instance);
        _validator = new RequiredBindingValidator(
            NullLogger<RequiredBindingValidator>.Instance,
            pathResolver);
        _originalMode = SdEnforcementPolicy.CurrentMode;
    }

    public void Dispose()
    {
        // Reset policy mode after each test
        SdEnforcementPolicy.CurrentMode = _originalMode;
    }

    [Fact]
    public void Validate_StrictMode_EntireSystemValueSet_ReturnsError()
    {
        // Arrange
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Strict;

        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        var valueSet = new ValueSet
        {
            Url = "http://test.org/ValueSet/bundle-types",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        System = "http://hl7.org/fhir/bundle-type"
                        // NO Concept list = entire system (ambiguous)
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/bundle-types",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Required binding test"
        );

        var resolver = new InMemoryResourceResolver(valueSet);
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().NotBeNull();
        error!.ErrorCode.Should().Be("SD_REQUIRED_BINDING_AMBIGUOUS_VALUESET");
        error.Severity.Should().Be("error");
        error.Details.Should().ContainKey("policyMode");
        error.Details["policyMode"].Should().Be("Strict");
        error.Details.Should().ContainKey("violationReason");
        error.Details["violationReason"].Should().Be("EntireSystemValueSet");
    }

    [Fact]
    public void Validate_PermissiveMode_EntireSystemValueSet_ReturnsWarning()
    {
        // Arrange
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Permissive;

        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        var valueSet = new ValueSet
        {
            Url = "http://test.org/ValueSet/bundle-types",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        System = "http://hl7.org/fhir/bundle-type"
                        // NO Concept list = entire system (ambiguous)
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/bundle-types",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Required binding test"
        );

        var resolver = new InMemoryResourceResolver(valueSet);
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().NotBeNull();
        error!.ErrorCode.Should().Be("SD_REQUIRED_BINDING_AMBIGUOUS_VALUESET");
        error.Severity.Should().Be("warning");
        error.Details.Should().ContainKey("policyMode");
        error.Details["policyMode"].Should().Be("Permissive");
        error.Details.Should().ContainKey("violationReason");
        error.Details["violationReason"].Should().Be("EntireSystemValueSet");
    }

    [Fact]
    public void Validate_BothModes_ExplicitConceptMatch_ReturnsNoError()
    {
        // Test Strict mode
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Strict;
        var strictError = ValidateWithExplicitConcept();
        strictError.Should().BeNull("explicit concept match should pass in Strict mode");

        // Test Permissive mode
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Permissive;
        var permissiveError = ValidateWithExplicitConcept();
        permissiveError.Should().BeNull("explicit concept match should pass in Permissive mode");
    }

    [Fact]
    public void Validate_BothModes_ExplicitConceptMismatch_ReturnsError()
    {
        // Test Strict mode
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Strict;
        var strictError = ValidateWithExplicitConceptMismatch();
        strictError.Should().NotBeNull("explicit concept mismatch should fail in Strict mode");
        strictError!.ErrorCode.Should().Be("SD_REQUIRED_BINDING_INVALID_CODE");
        strictError.Severity.Should().Be("error");

        // Test Permissive mode
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Permissive;
        var permissiveError = ValidateWithExplicitConceptMismatch();
        permissiveError.Should().NotBeNull("explicit concept mismatch should fail in Permissive mode");
        permissiveError!.ErrorCode.Should().Be("SD_REQUIRED_BINDING_INVALID_CODE");
        permissiveError.Severity.Should().Be("error");
    }

    [Fact]
    public void Validate_StrictMode_FilteredInclude_ReturnsError()
    {
        // Arrange
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Strict;

        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        var valueSet = new ValueSet
        {
            Url = "http://test.org/ValueSet/bundle-types",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        System = "http://hl7.org/fhir/bundle-type",
                        Filter = new List<ValueSet.FilterComponent>
                        {
                            new ValueSet.FilterComponent
                            {
                                Property = "concept",
                                Op = FilterOperator.IsA,
                                Value = "Collection"
                            }
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/bundle-types",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Required binding test"
        );

        var resolver = new InMemoryResourceResolver(valueSet);
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().NotBeNull();
        error!.ErrorCode.Should().Be("SD_REQUIRED_BINDING_AMBIGUOUS_VALUESET");
        error.Severity.Should().Be("error");
        error.Details["violationReason"].Should().Be("FilteredInclude");
    }

    [Fact]
    public void Validate_PermissiveMode_FilteredInclude_ReturnsWarning()
    {
        // Arrange
        SdEnforcementPolicy.CurrentMode = SdEnforcementMode.Permissive;

        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        var valueSet = new ValueSet
        {
            Url = "http://test.org/ValueSet/bundle-types",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        System = "http://hl7.org/fhir/bundle-type",
                        Filter = new List<ValueSet.FilterComponent>
                        {
                            new ValueSet.FilterComponent
                            {
                                Property = "concept",
                                Op = FilterOperator.IsA,
                                Value = "Collection"
                            }
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/bundle-types",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Required binding test"
        );

        var resolver = new InMemoryResourceResolver(valueSet);
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().NotBeNull();
        error!.ErrorCode.Should().Be("SD_REQUIRED_BINDING_AMBIGUOUS_VALUESET");
        error.Severity.Should().Be("warning");
        error.Details["violationReason"].Should().Be("FilteredInclude");
    }

    // Helper methods
    private Models.ValidationError? ValidateWithExplicitConcept()
    {
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        var valueSet = new ValueSet
        {
            Url = "http://test.org/ValueSet/bundle-types",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        System = "http://hl7.org/fhir/bundle-type",
                        Concept = new List<ValueSet.ConceptReferenceComponent>
                        {
                            new ValueSet.ConceptReferenceComponent { Code = "Collection" }
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/bundle-types",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Required binding test"
        );

        var resolver = new InMemoryResourceResolver(valueSet);
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        return _validator.Validate(constraint, context);
    }

    private Models.ValidationError? ValidateWithExplicitConceptMismatch()
    {
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Document
        };

        var valueSet = new ValueSet
        {
            Url = "http://test.org/ValueSet/bundle-types",
            Compose = new ValueSet.ComposeComponent
            {
                Include = new List<ValueSet.ConceptSetComponent>
                {
                    new ValueSet.ConceptSetComponent
                    {
                        System = "http://hl7.org/fhir/bundle-type",
                        Concept = new List<ValueSet.ConceptReferenceComponent>
                        {
                            new ValueSet.ConceptReferenceComponent { Code = "Collection" }
                            // "Document" not in list
                        }
                    }
                }
            }
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/bundle-types",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Required binding test"
        );

        var resolver = new InMemoryResourceResolver(valueSet);
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        return _validator.Validate(constraint, context);
    }

    /// <summary>
    /// In-memory resource resolver for testing (no HTTP, no file system)
    /// </summary>
    private class InMemoryResourceResolver : IResourceResolver
    {
        private readonly Dictionary<string, Resource> _resources = new();

        public InMemoryResourceResolver(params Resource[] resources)
        {
            foreach (var resource in resources)
            {
                if (resource is ValueSet vs && !string.IsNullOrEmpty(vs.Url))
                {
                    _resources[vs.Url] = vs;
                }
            }
        }

        public Resource? ResolveByCanonicalUri(string uri)
        {
            _resources.TryGetValue(uri, out var resource);
            return resource;
        }

        public Resource? ResolveByUri(string uri) => ResolveByCanonicalUri(uri);
    }
}
