using FluentAssertions;
using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Microsoft.Extensions.Logging.Abstractions;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.SdValidation;
using Pss.FhirProcessor.Engine.SdValidation.Validators;
using Pss.FhirProcessor.Engine.SdValidation.PathResolution;
using Pss.FhirProcessor.Engine.SdValidation.Terminology;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.StructureDefinition;

/// <summary>
/// Phase 2.3: Minimal unit tests for RequiredBindingValidator
/// Tests required binding strength with in-memory ValueSet expansion only
/// </summary>
public class RequiredBindingValidatorTests
{
    private readonly RequiredBindingValidator _validator;

    public RequiredBindingValidatorTests()
    {
        var pathResolver = new ElementPathResolver(NullLogger<ElementPathResolver>.Instance);
        var expander = new OfflineValueSetExpander(NullLogger<OfflineValueSetExpander>.Instance);
        _validator = new RequiredBindingValidator(
            NullLogger<RequiredBindingValidator>.Instance,
            pathResolver,
            expander);
    }

    [Fact]
    public void Validate_ValidRequiredBinding_ReturnsNoError()
    {
        // Arrange
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
                            new ValueSet.ConceptReferenceComponent { Code = "collection" },
                            new ValueSet.ConceptReferenceComponent { Code = "document" }
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
        error.Should().BeNull();
    }

    [Fact]
    public void Validate_InvalidCode_ReturnsError()
    {
        // Arrange
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
                            new ValueSet.ConceptReferenceComponent { Code = "collection" }
                            // "Document" not in ValueSet
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
        error!.ErrorCode.Should().Be("SD_REQUIRED_BINDING_INVALID_CODE");
    }

    [Fact]
    public void Validate_MissingCodedElement_ReturnsError()
    {
        // Arrange
        var bundle = new Bundle();
        // Bundle.Type not set

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
                            new ValueSet.ConceptReferenceComponent { Code = "collection" }
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
        error!.ErrorCode.Should().Be("SD_REQUIRED_BINDING_MISSING");
    }

    [Fact]
    public void Validate_ValueSetNotResolved_ReturnsError()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        var constraint = new SdConstraint(
            elementPath: "Bundle.type",
            kind: SdConstraintKind.RequiredBinding,
            expected: "http://test.org/ValueSet/nonexistent",
            sourceProfile: "http://test.org/StructureDefinition/TestProfile",
            description: "Required binding test"
        );

        var resolver = new InMemoryResourceResolver(); // Empty resolver
        var context = new FirelyValidationContext(
            bundle,
            resolver,
            Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly)
        );

        // Act
        var error = _validator.Validate(constraint, context);

        // Assert
        error.Should().NotBeNull();
        error!.ErrorCode.Should().Be("SD_REQUIRED_BINDING_VALUESET_NOT_RESOLVED");
    }

    /// <summary>
    /// Phase 2.4: Entire-system include must be rejected (ambiguous, non-deterministic)
    /// </summary>
    [Fact]
    public void Validate_EntireSystemInclude_ReturnsAmbiguousError()
    {
        // Arrange
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
        error.Details.Should().ContainKey("reason");
        error.Details["reason"].Should().Be("entire-system-include");
    }

    /// <summary>
    /// Phase 2.4: Filter-based includes must be rejected (cannot validate deterministically)
    /// </summary>
    [Fact]
    public void Validate_FilterBasedInclude_ReturnsAmbiguousError()
    {
        // Arrange
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
        error.Details.Should().ContainKey("reason");
        error.Details["reason"].Should().Be("filter-not-supported");
    }

    /// <summary>
    /// Phase 2.4: ValueSet imports must be rejected (cannot resolve transitively)
    /// </summary>
    [Fact]
    public void Validate_ValueSetImport_ReturnsAmbiguousError()
    {
        // Arrange
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
                        ValueSetElement = new List<Canonical>
                        {
                            new Canonical("http://test.org/ValueSet/imported")
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
        error.Details.Should().ContainKey("reason");
        error.Details["reason"].Should().Be("imported-valueset-not-supported");
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
