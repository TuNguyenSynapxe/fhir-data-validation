using System.Text.Json;
using Pss.FhirProcessor.Engine.Navigation.Predicates;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Navigation.Predicates;

/// <summary>
/// Phase 3.1 tests for predicate engine
/// </summary>
public class JsonPredicateEvaluatorTests
{
    private readonly JsonPredicateEvaluator _evaluator;
    
    public JsonPredicateEvaluatorTests()
    {
        _evaluator = new JsonPredicateEvaluator();
    }
    
    [Fact]
    public void Evaluate_EqualsExpression_Matches()
    {
        // Arrange
        var json = Parse(@"{ ""display"": ""Doctor B"" }");
        var expression = new EqualsExpression("display", "Doctor B");
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert
        Assert.True(result);
    }
    
    [Fact]
    public void Evaluate_EqualsExpression_DoesNotMatch()
    {
        // Arrange
        var json = Parse(@"{ ""display"": ""Doctor A"" }");
        var expression = new EqualsExpression("display", "Doctor B");
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert
        Assert.False(result);
    }
    
    [Fact]
    public void Evaluate_ExistsExpression_PropertyExists()
    {
        // Arrange
        var json = Parse(@"{ ""system"": ""http://loinc.org"" }");
        var expression = new ExistsExpression("system");
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert
        Assert.True(result);
    }
    
    [Fact]
    public void Evaluate_ExistsExpression_PropertyMissing()
    {
        // Arrange
        var json = Parse(@"{ ""display"": ""Test"" }");
        var expression = new ExistsExpression("system");
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert
        Assert.False(result);
    }
    
    [Fact]
    public void Evaluate_EmptyExpression_EmptyString()
    {
        // Arrange
        var json = Parse(@"{ ""value"": """" }");
        var expression = new EmptyExpression("value");
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert
        Assert.True(result);
    }
    
    [Fact]
    public void Evaluate_EmptyExpression_NonEmpty()
    {
        // Arrange
        var json = Parse(@"{ ""value"": ""test"" }");
        var expression = new EmptyExpression("value");
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert
        Assert.False(result);
    }
    
    [Fact]
    public void Evaluate_EmptyExpression_EmptyArray()
    {
        // Arrange
        var json = Parse(@"{ ""coding"": [] }");
        var expression = new EmptyExpression("coding");
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert
        Assert.True(result);
    }
    
    [Fact]
    public void Evaluate_EmptyExpression_NonEmptyArray()
    {
        // Arrange
        var json = Parse(@"{ ""coding"": [{ ""code"": ""123"" }] }");
        var expression = new EmptyExpression("coding");
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert
        Assert.False(result);
    }
    
    [Fact]
    public void Evaluate_AndExpression_BothTrue()
    {
        // Arrange
        var json = Parse(@"{ ""system"": ""http://loinc.org"", ""code"": ""12345"" }");
        var expression = new AndExpression(
            new EqualsExpression("system", "http://loinc.org"),
            new EqualsExpression("code", "12345")
        );
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert
        Assert.True(result);
    }
    
    [Fact]
    public void Evaluate_AndExpression_LeftFalse()
    {
        // Arrange
        var json = Parse(@"{ ""system"": ""http://snomed.org"", ""code"": ""12345"" }");
        var expression = new AndExpression(
            new EqualsExpression("system", "http://loinc.org"),
            new EqualsExpression("code", "12345")
        );
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert - short-circuit on left false
        Assert.False(result);
    }
    
    [Fact]
    public void Evaluate_OrExpression_BothFalse()
    {
        // Arrange
        var json = Parse(@"{ ""display"": ""Test"" }");
        var expression = new OrExpression(
            new ExistsExpression("system"),
            new ExistsExpression("value")
        );
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert
        Assert.False(result);
    }
    
    [Fact]
    public void Evaluate_OrExpression_LeftTrue()
    {
        // Arrange
        var json = Parse(@"{ ""system"": ""http://loinc.org"" }");
        var expression = new OrExpression(
            new ExistsExpression("system"),
            new ExistsExpression("value")
        );
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert - short-circuit on left true
        Assert.True(result);
    }
    
    [Fact]
    public void Evaluate_OrExpression_RightTrue()
    {
        // Arrange
        var json = Parse(@"{ ""value"": ""12345"" }");
        var expression = new OrExpression(
            new ExistsExpression("system"),
            new ExistsExpression("value")
        );
        
        // Act
        var result = _evaluator.Evaluate(json, expression);
        
        // Assert
        Assert.True(result);
    }
    
    private JsonElement Parse(string json)
    {
        return JsonDocument.Parse(json).RootElement;
    }
}
