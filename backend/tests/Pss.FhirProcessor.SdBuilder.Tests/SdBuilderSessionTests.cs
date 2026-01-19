namespace Pss.FhirProcessor.SdBuilder.Tests;

using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Xunit;

/// <summary>
/// Tests for SdBuilderSession controlled mutations.
/// </summary>
public sealed class SdBuilderSessionTests
{
    [Fact]
    public void Constructor_WithValidDesignState_Succeeds()
    {
        // Arrange
        var designState = CreateTestDesignState();

        // Act
        var session = new SdBuilderSession(designState);

        // Assert
        Assert.NotNull(session);
        Assert.Same(designState, session.DesignState);
    }

    [Fact]
    public void Constructor_WithNullDesignState_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new SdBuilderSession(null!));
    }

    [Fact]
    public void ToggleInclude_ExistingElement_ChangesInclusion()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);
        var element = designState.Elements[0];
        var originalIncluded = element.IsIncluded;

        // Act
        session.ToggleInclude(element.Path, !originalIncluded);

        // Assert
        Assert.Equal(!originalIncluded, element.IsIncluded);
    }

    [Fact]
    public void ToggleInclude_NonExistentElement_ThrowsInvalidOperationException()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);

        // Act & Assert
        var ex = Assert.Throws<InvalidOperationException>(() => 
            session.ToggleInclude("Patient.nonExistent", true));
        
        Assert.Contains("Element not found", ex.Message);
    }

    [Fact]
    public void SetCardinalityOverride_WithValidCardinality_SetsOverride()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);
        var element = designState.Elements[0];
        var newCardinality = new Cardinality(1, "1");

        // Act
        session.SetCardinalityOverride(element.Path, newCardinality);

        // Assert
        Assert.NotNull(element.OverrideCardinality);
        Assert.Equal(1, element.OverrideCardinality.Min);
        Assert.Equal("1", element.OverrideCardinality.Max);
    }

    [Fact]
    public void SetCardinalityOverride_WithNull_ClearsOverride()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);
        var element = designState.Elements[0];
        element.OverrideCardinality = new Cardinality(1, "1");

        // Act
        session.SetCardinalityOverride(element.Path, null);

        // Assert
        Assert.Null(element.OverrideCardinality);
    }

    [Fact]
    public void SetBinding_WithValidBinding_SetsBinding()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);
        var element = designState.Elements[0];
        var binding = new BindingConfig
        {
            Strength = BindingStrength.Required,
            ValueSetUrl = "http://hl7.org/fhir/ValueSet/test"
        };

        // Act
        session.SetBinding(element.Path, binding);

        // Assert
        Assert.NotNull(element.OverrideBinding);
        Assert.Equal(BindingStrength.Required, element.OverrideBinding.Strength);
        Assert.Equal("http://hl7.org/fhir/ValueSet/test", element.OverrideBinding.ValueSetUrl);
    }

    [Fact]
    public void SetBinding_WithNull_ClearsBinding()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);
        var element = designState.Elements[0];
        element.OverrideBinding = new BindingConfig
        {
            Strength = BindingStrength.Required,
            ValueSetUrl = "http://example.com/vs"
        };

        // Act
        session.SetBinding(element.Path, null);

        // Assert
        Assert.Null(element.OverrideBinding);
    }

    [Fact]
    public void AddExtension_WithValidExtension_AddsToCollection()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);
        var element = designState.Elements[0];
        var extension = new ExtensionConfig
        {
            Url = "http://hl7.org/fhir/StructureDefinition/patient-birthPlace",
            Name = "patientBirthPlace"
        };

        // Act
        session.AddExtension(element.Path, extension);

        // Assert
        Assert.Single(element.Extensions);
        Assert.Equal("http://hl7.org/fhir/StructureDefinition/patient-birthPlace", 
            element.Extensions[0].Url);
    }

    [Fact]
    public void AddExtension_WithNullExtension_ThrowsArgumentNullException()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);
        var element = designState.Elements[0];

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => 
            session.AddExtension(element.Path, null!));
    }

    [Fact]
    public void AddExtension_MultipleExtensions_AddsAll()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);
        var element = designState.Elements[0];
        var ext1 = new ExtensionConfig { Url = "http://example.com/ext1", Name = "ext1" };
        var ext2 = new ExtensionConfig { Url = "http://example.com/ext2", Name = "ext2" };

        // Act
        session.AddExtension(element.Path, ext1);
        session.AddExtension(element.Path, ext2);

        // Assert
        Assert.Equal(2, element.Extensions.Count);
        Assert.Contains(element.Extensions, e => e.Url == "http://example.com/ext1");
        Assert.Contains(element.Extensions, e => e.Url == "http://example.com/ext2");
    }

    [Fact]
    public void RemoveExtension_ExistingExtension_RemovesAndReturnsTrue()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);
        var element = designState.Elements[0];
        var extension = new ExtensionConfig { Url = "http://example.com/ext", Name = "ext" };
        session.AddExtension(element.Path, extension);

        // Act
        var result = session.RemoveExtension(element.Path, "http://example.com/ext");

        // Assert
        Assert.True(result);
        Assert.Empty(element.Extensions);
    }

    [Fact]
    public void RemoveExtension_NonExistentExtension_ReturnsFalse()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);
        var element = designState.Elements[0];

        // Act
        var result = session.RemoveExtension(element.Path, "http://example.com/nonExistent");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void SetVisibilityMode_ChangesDesignStateMode()
    {
        // Arrange
        var designState = CreateTestDesignState();
        designState.VisibilityMode = VisibilityMode.Minimal;
        var session = new SdBuilderSession(designState);

        // Act
        session.SetVisibilityMode(VisibilityMode.Full);

        // Assert
        Assert.Equal(VisibilityMode.Full, designState.VisibilityMode);
    }

    [Fact]
    public void Session_MultipleOperations_MaintainState()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);
        var element = designState.Elements[0];

        // Act - Perform multiple operations
        session.ToggleInclude(element.Path, true);
        session.SetCardinalityOverride(element.Path, new Cardinality(1, "*"));
        session.SetBinding(element.Path, new BindingConfig 
        { 
            Strength = BindingStrength.Extensible,
            ValueSetUrl = "http://test.com/vs"
        });
        session.AddExtension(element.Path, new ExtensionConfig { Url = "http://test.com/ext", Name = "ext" });

        // Assert - Verify all changes applied
        Assert.True(element.IsIncluded);
        Assert.NotNull(element.OverrideCardinality);
        Assert.Equal(1, element.OverrideCardinality.Min);
        Assert.NotNull(element.OverrideBinding);
        Assert.Equal(BindingStrength.Extensible, element.OverrideBinding.Strength);
        Assert.Single(element.Extensions);
    }

    private ResourceDesignState CreateTestDesignState()
    {
        return new ResourceDesignState
        {
            ResourceType = "Patient",
            BaseCanonicalUrl = "http://hl7.org/fhir/StructureDefinition/Patient",
            VisibilityMode = VisibilityMode.Minimal,
            Elements = new List<ElementDesignState>
            {
                new ElementDesignState
                {
                    Path = "Patient.name",
                    BaseCardinality = new Cardinality(0, "*"),
                    TypeCodes = new[] { "HumanName" },
                    IsIncluded = false,
                    OverrideCardinality = null,
                    OverrideBinding = null
                },
                new ElementDesignState
                {
                    Path = "Patient.gender",
                    BaseCardinality = new Cardinality(0, "1"),
                    TypeCodes = new[] { "code" },
                    IsIncluded = true,
                    OverrideCardinality = null,
                    OverrideBinding = null
                },
                new ElementDesignState
                {
                    Path = "Patient.identifier",
                    BaseCardinality = new Cardinality(0, "*"),
                    TypeCodes = new[] { "Identifier" },
                    IsIncluded = true,
                    OverrideCardinality = null,
                    OverrideBinding = null,
                }
            }
        };
    }

    // ===== PHASE 2.1 SLICING TESTS =====

    [Fact]
    public void ConfigureSlicing_CreatesSlicingConfig()
    {
        // Arrange
        var design = CreateTestDesignState();
        var session = new SdBuilderSession(design);
        var discriminators = new List<SliceDiscriminator>
        {
            new SliceDiscriminator(DiscriminatorType.Value, "system")
        };

        // Act
        session.ConfigureSlicing("Patient.identifier", true, SlicingRules.Closed, discriminators);

        // Assert
        var element = design.Elements.First(e => e.Path == "Patient.identifier");
        Assert.NotNull(element.Slicing);
        Assert.True(element.Slicing.Ordered);
        Assert.Equal(SlicingRules.Closed, element.Slicing.Rules);
        Assert.Single(element.Slicing.Discriminators);
        Assert.Equal(DiscriminatorType.Value, element.Slicing.Discriminators[0].Type);
        Assert.Equal("system", element.Slicing.Discriminators[0].Path);
    }

    [Fact]
    public void AddSlice_AutoCreatesSlicingConfig()
    {
        // Arrange
        var design = CreateTestDesignState();
        var session = new SdBuilderSession(design);

        // Act
        session.AddSlice("Patient.identifier", "MRN");

        // Assert
        var element = design.Elements.First(e => e.Path == "Patient.identifier");
        Assert.NotNull(element.Slicing);
        Assert.True(element.Slices.ContainsKey("MRN"));
        Assert.Equal("MRN", element.Slices["MRN"].SliceName);
    }

    [Fact]
    public void AddSlice_WithExistingSlicing_AddsSlice()
    {
        // Arrange
        var design = CreateTestDesignState();
        var session = new SdBuilderSession(design);
        var discriminators = new List<SliceDiscriminator>
        {
            new SliceDiscriminator(DiscriminatorType.Value, "system")
        };
        session.ConfigureSlicing("Patient.identifier", false, SlicingRules.Open, discriminators);

        // Act
        session.AddSlice("Patient.identifier", "NRIC");
        session.AddSlice("Patient.identifier", "MRN");

        // Assert
        var element = design.Elements.First(e => e.Path == "Patient.identifier");
        Assert.Equal(2, element.Slices.Count);
        Assert.True(element.Slices.ContainsKey("NRIC"));
        Assert.True(element.Slices.ContainsKey("MRN"));
    }

    [Fact]
    public void AddSlice_IdempotentBehavior()
    {
        // Arrange
        var design = CreateTestDesignState();
        var session = new SdBuilderSession(design);

        // Act - Add same slice twice
        session.AddSlice("Patient.identifier", "MRN");
        session.AddSlice("Patient.identifier", "MRN");

        // Assert - Should not duplicate
        var element = design.Elements.First(e => e.Path == "Patient.identifier");
        Assert.Single(element.Slices);
    }

    [Fact]
    public void RemoveSlice_RemovesExistingSlice()
    {
        // Arrange
        var design = CreateTestDesignState();
        var session = new SdBuilderSession(design);
        session.AddSlice("Patient.identifier", "MRN");
        session.AddSlice("Patient.identifier", "NRIC");

        // Act
        var removed = session.RemoveSlice("Patient.identifier", "MRN");

        // Assert
        Assert.True(removed);
        var element = design.Elements.First(e => e.Path == "Patient.identifier");
        Assert.Single(element.Slices);
        Assert.False(element.Slices.ContainsKey("MRN"));
        Assert.True(element.Slices.ContainsKey("NRIC"));
    }

    [Fact]
    public void RemoveSlice_NonExistentSlice_ReturnsFalse()
    {
        // Arrange
        var design = CreateTestDesignState();
        var session = new SdBuilderSession(design);

        // Act
        var removed = session.RemoveSlice("Patient.identifier", "NonExistent");

        // Assert
        Assert.False(removed);
    }

    [Fact]
    public void SetSliceCardinality_SetsOverride()
    {
        // Arrange
        var design = CreateTestDesignState();
        var session = new SdBuilderSession(design);
        session.AddSlice("Patient.identifier", "MRN");
        var cardinality = new Cardinality(1, "1");

        // Act
        session.SetSliceCardinality("Patient.identifier", "MRN", cardinality);

        // Assert
        var element = design.Elements.First(e => e.Path == "Patient.identifier");
        var slice = element.Slices["MRN"];
        Assert.NotNull(slice.OverrideCardinality);
        Assert.Equal(1, slice.OverrideCardinality.Min);
        Assert.Equal("1", slice.OverrideCardinality.Max);
    }

    [Fact]
    public void SetSliceCardinality_WithNull_ClearsOverride()
    {
        // Arrange
        var design = CreateTestDesignState();
        var session = new SdBuilderSession(design);
        session.AddSlice("Patient.identifier", "MRN");
        session.SetSliceCardinality("Patient.identifier", "MRN", new Cardinality(1, "1"));

        // Act
        session.SetSliceCardinality("Patient.identifier", "MRN", null);

        // Assert
        var element = design.Elements.First(e => e.Path == "Patient.identifier");
        var slice = element.Slices["MRN"];
        Assert.Null(slice.OverrideCardinality);
    }

    [Fact]
    public void SetSliceBinding_SetsBinding()
    {
        // Arrange
        var design = CreateTestDesignState();
        var session = new SdBuilderSession(design);
        session.AddSlice("Patient.identifier", "MRN");
        var binding = new BindingConfig
        {
            Strength = BindingStrength.Required,
            ValueSetUrl = "http://example.org/fhir/ValueSet/mrn-types"
        };

        // Act
        session.SetSliceBinding("Patient.identifier", "MRN", binding);

        // Assert
        var element = design.Elements.First(e => e.Path == "Patient.identifier");
        var slice = element.Slices["MRN"];
        Assert.NotNull(slice.Binding);
        Assert.Equal(BindingStrength.Required, slice.Binding.Strength);
        Assert.Equal("http://example.org/fhir/ValueSet/mrn-types", slice.Binding.ValueSetUrl);
    }

    [Fact]
    public void SetSliceFixedValue_StoresValue()
    {
        // Arrange
        var design = CreateTestDesignState();
        var session = new SdBuilderSession(design);
        session.AddSlice("Patient.identifier", "MRN");

        // Act
        session.SetSliceFixedValue("Patient.identifier", "MRN", "system", "http://hospital.org/mrn");

        // Assert
        var element = design.Elements.First(e => e.Path == "Patient.identifier");
        var slice = element.Slices["MRN"];
        Assert.Single(slice.FixedValues);
        Assert.Equal("http://hospital.org/mrn", slice.FixedValues["system"]);
    }

    [Fact]
    public void SetSlicePatternValue_StoresValue()
    {
        // Arrange
        var design = CreateTestDesignState();
        var session = new SdBuilderSession(design);
        session.AddSlice("Patient.identifier", "NRIC");

        // Act
        session.SetSlicePatternValue("Patient.identifier", "NRIC", "use", "official");

        // Assert
        var element = design.Elements.First(e => e.Path == "Patient.identifier");
        var slice = element.Slices["NRIC"];
        Assert.Single(slice.PatternValues);
        Assert.Equal("official", slice.PatternValues["use"]);
    }

    [Fact]
    public void SetSliceFixedValue_OverwritesExistingValue()
    {
        // Arrange
        var design = CreateTestDesignState();
        var session = new SdBuilderSession(design);
        session.AddSlice("Patient.identifier", "MRN");
        session.SetSliceFixedValue("Patient.identifier", "MRN", "system", "http://old.org");

        // Act
        session.SetSliceFixedValue("Patient.identifier", "MRN", "system", "http://new.org");

        // Assert
        var element = design.Elements.First(e => e.Path == "Patient.identifier");
        var slice = element.Slices["MRN"];
        Assert.Single(slice.FixedValues);
        Assert.Equal("http://new.org", slice.FixedValues["system"]);
    }
}
