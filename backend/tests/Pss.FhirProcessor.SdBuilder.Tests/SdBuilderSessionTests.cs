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
        Assert.NotNull(element.Binding);
        Assert.Equal(BindingStrength.Required, element.Binding.Strength);
        Assert.Equal("http://hl7.org/fhir/ValueSet/test", element.Binding.ValueSetUrl);
    }

    [Fact]
    public void SetBinding_WithNull_ClearsBinding()
    {
        // Arrange
        var designState = CreateTestDesignState();
        var session = new SdBuilderSession(designState);
        var element = designState.Elements[0];
        element.Binding = new BindingConfig
        {
            Strength = BindingStrength.Required,
            ValueSetUrl = "http://example.com/vs"
        };

        // Act
        session.SetBinding(element.Path, null);

        // Assert
        Assert.Null(element.Binding);
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
            Url = "http://hl7.org/fhir/StructureDefinition/patient-birthPlace"
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
        var ext1 = new ExtensionConfig { Url = "http://example.com/ext1" };
        var ext2 = new ExtensionConfig { Url = "http://example.com/ext2" };

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
        var extension = new ExtensionConfig { Url = "http://example.com/ext" };
        element.Extensions.Add(extension);

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
        session.AddExtension(element.Path, new ExtensionConfig { Url = "http://test.com/ext" });

        // Assert - Verify all changes applied
        Assert.True(element.IsIncluded);
        Assert.NotNull(element.OverrideCardinality);
        Assert.Equal(1, element.OverrideCardinality.Min);
        Assert.NotNull(element.Binding);
        Assert.Equal(BindingStrength.Extensible, element.Binding.Strength);
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
                    BaseTypeCode = "HumanName",
                    IsIncluded = false,
                    OverrideCardinality = null,
                    Binding = null,
                    Extensions = new List<ExtensionConfig>()
                },
                new ElementDesignState
                {
                    Path = "Patient.gender",
                    BaseCardinality = new Cardinality(0, "1"),
                    BaseTypeCode = "code",
                    IsIncluded = true,
                    OverrideCardinality = null,
                    Binding = null,
                    Extensions = new List<ExtensionConfig>()
                }
            }
        };
    }
}
