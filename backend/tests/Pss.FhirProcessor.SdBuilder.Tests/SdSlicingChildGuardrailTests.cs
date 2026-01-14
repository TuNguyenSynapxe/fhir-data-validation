namespace Pss.FhirProcessor.SdBuilder.Tests;

using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Hl7.Fhir.Specification.Source;
using Moq;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Pss.FhirProcessor.SdBuilder.Export;
using Xunit;

/// <summary>
/// Phase 2.2: Guardrail tests for slice child constraints.
/// These tests enforce architectural boundaries and safety guarantees.
/// </summary>
public sealed class SdSlicingChildGuardrailTests
{
    /// <summary>
    /// Guardrail A: No implicit parent creation.
    /// Adding slice child constraints must NOT introduce unexpected differential elements.
    /// </summary>
    [Fact]
    public void SliceChildConstraints_DoNotCreateImplicitParentElements()
    {
        // Arrange
        var baseSd = GetObservationStructureDefinition();
        var design = SdDesignInitializer.Create("Observation", baseSd, VisibilityMode.Full);
        var session = new SdBuilderSession(design);

        // Configure slicing on Observation.component
        session.ConfigureSlicing("Observation.component", false, SlicingRules.Open, new List<SliceDiscriminator>
        {
            new(DiscriminatorType.Pattern, "code")
        });

        // Add systolic slice with child constraints
        session.AddSlice("Observation.component", "systolic");
        session.SetSliceElementCardinality("Observation.component", "systolic", "valueQuantity.value", new Cardinality(1, "1"));

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/TestObservation",
            Name = "TestObservation",
            Version = "1.0.0",
            Status = "draft",
            Description = "Test"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert - Only expected elements should exist in differential
        var differential = exported.Differential.Element;
        var componentElements = differential.Where(e => e.Path.StartsWith("Observation.component")).ToList();

        // Expected: slicing parent, slice root, child constraint only (3 elements)
        Assert.Equal(3, componentElements.Count);

        // Verify each expected element
        Assert.Contains(componentElements, e => e.Path == "Observation.component" && e.Slicing != null); // Slicing parent
        Assert.Contains(componentElements, e => e.Path == "Observation.component" && e.SliceName == "systolic"); // Slice root
        Assert.Contains(componentElements, e => e.Path == "Observation.component.valueQuantity.value" && 
                                                 e.ElementId == "Observation.component:systolic.valueQuantity.value"); // Child constraint

        // Verify no unexpected parent nodes were created
        Assert.DoesNotContain(componentElements, e => e.Path == "Observation.component.valueQuantity" && e.SliceName == null);
    }

    /// <summary>
    /// Guardrail B: No evaluation of fixed/pattern values.
    /// FixedValueJson and PatternValueJson are treated as opaque payloads.
    /// The system must NOT parse, validate, or execute any JSON content.
    /// </summary>
    [Fact]
    public async System.Threading.Tasks.Task SliceChildConstraints_DoNotEvaluateFixedValues()
    {
        // Arrange
        var baseSd = GetObservationStructureDefinition();
        var design = SdDesignInitializer.Create("Observation", baseSd, VisibilityMode.Full);
        var session = new SdBuilderSession(design);

        // Configure slicing
        session.ConfigureSlicing("Observation.component", false, SlicingRules.Open, new List<SliceDiscriminator>
        {
            new(DiscriminatorType.Pattern, "code")
        });

        session.AddSlice("Observation.component", "systolic");

        // Set potentially malicious fixed value (must be treated as opaque string)
        var evilFixedValue = new
        {
            malicious = "$where: evil()",
            nested = new { script = "<script>alert('xss')</script>" }
        };
        session.SetSliceElementFixedValue("Observation.component", "systolic", "code", evilFixedValue);

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/TestObservation",
            Name = "TestObservation",
            Version = "1.0.0",
            Status = "draft",
            Description = "Test"
        };

        // Act - Should NOT throw exception or evaluate the value
        var validationResult = await SdDesignValidator.ValidateAsync(design, 
            new Moq.Mock<Abstractions.IStructureDefinitionRepository>().Object, 
            new Moq.Mock<Abstractions.ITerminologyRegistry>().Object, 
            CancellationToken.None);

        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert - No exceptions thrown (authoring-only, no execution)
        Assert.NotNull(exported);
        Assert.False(validationResult.HasErrors);

        // Verify the fixed value exists in design state (opaque storage)
        var componentElement = design.Elements.FirstOrDefault(e => e.Path == "Observation.component");
        Assert.NotNull(componentElement);
        var systolicSlice = componentElement.Slices["systolic"];
        var childConstraint = systolicSlice.ChildConstraints.FirstOrDefault(c => c.ElementPath == "code");
        Assert.NotNull(childConstraint);
        Assert.NotNull(childConstraint.FixedValue);
        Assert.Equal(evilFixedValue, childConstraint.FixedValue); // Stored verbatim, not evaluated
    }

    /// <summary>
    /// Guardrail C: Base StructureDefinition immutability.
    /// The base SD must never be mutated during any operation.
    /// </summary>
    [Fact]
    public async System.Threading.Tasks.Task SliceChildConstraints_DoNotMutateBaseSD()
    {
        // Arrange
        var baseSd = GetObservationStructureDefinition();
        
        // Serialize base SD to JSON before any operations
        var serializer = new FhirJsonSerializer();
        var originalJson = serializer.SerializeToString(baseSd);

        var design = SdDesignInitializer.Create("Observation", baseSd, VisibilityMode.Full);
        var session = new SdBuilderSession(design);

        // Configure slicing with child constraints
        session.ConfigureSlicing("Observation.component", false, SlicingRules.Open, new List<SliceDiscriminator>
        {
            new(DiscriminatorType.Pattern, "code")
        });
        
        session.AddSlice("Observation.component", "systolic");
        session.SetSliceElementCardinality("Observation.component", "systolic", "valueQuantity.value", new Cardinality(1, "1"));
        session.SetSliceElementBinding("Observation.component", "systolic", "code", new BindingConfig
        {
            Strength = Domain.BindingStrength.Required,
            ValueSetUrl = "http://example.org/vs"
        });

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/TestObservation",
            Name = "TestObservation",
            Version = "1.0.0",
            Status = "draft",
            Description = "Test"
        };

        // Act - Run full lifecycle: validate and export
        var mockRepo = new Moq.Mock<Abstractions.IStructureDefinitionRepository>();
        mockRepo.Setup(r => r.FindByUrlAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(baseSd);

        var mockTerminology = new Moq.Mock<Abstractions.ITerminologyRegistry>();
        mockTerminology.Setup(t => t.ValueSetExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await SdDesignValidator.ValidateAsync(design, mockRepo.Object, mockTerminology.Object, CancellationToken.None);
        var exported = SdExporter.Export(design, baseSd, meta);

        // Serialize base SD again after all operations
        var currentJson = serializer.SerializeToString(baseSd);

        // Assert - Base SD must be identical (byte-for-byte)
        Assert.Equal(originalJson, currentJson);
        Assert.NotNull(exported); // Export succeeded
        Assert.NotNull(exported.Differential); // Differential created
        Assert.Null(exported.Snapshot); // No snapshot generated
    }

    private StructureDefinition GetObservationStructureDefinition()
    {
        var resolver = ZipSource.CreateValidationSource();
        var observationSd = resolver.ResolveByCanonicalUri("http://hl7.org/fhir/StructureDefinition/Observation") as StructureDefinition;

        if (observationSd == null)
            throw new InvalidOperationException("Failed to load Observation StructureDefinition");

        return observationSd;
    }
}
