using Pss.FhirProcessor.Engine.Navigation.Predicates;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Navigation.Predicates;

/// <summary>
/// Phase 3.1 tests for predicate parser
/// </summary>
public class PredicateParserTests
{
    [Fact]
    public void Parse_EqualsExpression_Valid()
    {
        // Arrange
        var whereClause = "display='Doctor B'";
        
        // Act
        var result = PredicateParser.Parse(whereClause);
        
        // Assert
        Assert.IsType<EqualsExpression>(result);
        var equals = (EqualsExpression)result!;
        Assert.Equal("display", equals.Path);
        Assert.Equal("Doctor B", equals.Value);
    }
    
    [Fact]
    public void Parse_ExistsExpression_Valid()
    {
        // Arrange
        var whereClause = "system.exists()";
        
        // Act
        var result = PredicateParser.Parse(whereClause);
        
        // Assert
        Assert.IsType<ExistsExpression>(result);
        var exists = (ExistsExpression)result!;
        Assert.Equal("system", exists.Path);
    }
    
    [Fact]
    public void Parse_EmptyExpression_Valid()
    {
        // Arrange
        var whereClause = "coding.empty()";
        
        // Act
        var result = PredicateParser.Parse(whereClause);
        
        // Assert
        Assert.IsType<EmptyExpression>(result);
        var empty = (EmptyExpression)result!;
        Assert.Equal("coding", empty.Path);
    }
    
    [Fact]
    public void Parse_InvalidSyntax_ReturnsNull()
    {
        // Arrange
        var whereClause = "invalid syntax here";
        
        // Act
        var result = PredicateParser.Parse(whereClause);
        
        // Assert - fail safely
        Assert.Null(result);
    }
    
    [Fact]
    public void Parse_EmptyString_ReturnsNull()
    {
        // Arrange
        var whereClause = "";
        
        // Act
        var result = PredicateParser.Parse(whereClause);
        
        // Assert
        Assert.Null(result);
    }
    
    [Fact]
    public void Parse_NestedPath_Valid()
    {
        // Arrange
        var whereClause = "code.coding.system='http://loinc.org'";
        
        // Act
        var result = PredicateParser.Parse(whereClause);
        
        // Assert
        Assert.IsType<EqualsExpression>(result);
        var equals = (EqualsExpression)result!;
        Assert.Equal("code.coding.system", equals.Path);
        Assert.Equal("http://loinc.org", equals.Value);
    }
    
    [Fact]
    public void Parse_AndExpression_Valid()
    {
        // Arrange
        var whereClause = "system='http://loinc.org' and code='12345'";
        
        // Act
        var result = PredicateParser.Parse(whereClause);
        
        // Assert
        Assert.IsType<AndExpression>(result);
        var and = (AndExpression)result!;
        Assert.IsType<EqualsExpression>(and.Left);
        Assert.IsType<EqualsExpression>(and.Right);
    }
    
    [Fact]
    public void Parse_OrExpression_Valid()
    {
        // Arrange
        var whereClause = "system.exists() or value.exists()";
        
        // Act
        var result = PredicateParser.Parse(whereClause);
        
        // Assert
        Assert.IsType<OrExpression>(result);
        var or = (OrExpression)result!;
        Assert.IsType<ExistsExpression>(or.Left);
        Assert.IsType<ExistsExpression>(or.Right);
    }
    
    [Fact]
    public void Parse_CaseInsensitive_Valid()
    {
        // Arrange
        var whereClause = "system='test' AND code='123'";
        
        // Act
        var result = PredicateParser.Parse(whereClause);
        
        // Assert
        Assert.IsType<AndExpression>(result);
    }
    
    [Fact]
    public void Parse_MixedExpression_Valid()
    {
        // Arrange - Mix of exists and equality
        var whereClause = "system.exists() and code='12345'";
        
        // Act
        var result = PredicateParser.Parse(whereClause);
        
        // Assert
        Assert.IsType<AndExpression>(result);
        var and = (AndExpression)result!;
        Assert.IsType<ExistsExpression>(and.Left);
        Assert.IsType<EqualsExpression>(and.Right);
    }
}
