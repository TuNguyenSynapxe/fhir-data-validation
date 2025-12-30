using Pss.FhirProcessor.Engine.Models;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Unit tests for RuleIdentity helper.
/// Phase 2A: Tests for centralized rule structural identity logic.
/// </summary>
public class RuleIdentityTests
{
    [Fact]
    public void GetIdentityKey_SameRule_ReturnsSameKey()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "rule1",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = "name.family",
            InstanceScope = new AllInstances(),
            ErrorCode = "MISSING_FAMILY_NAME"
        };

        // Act
        var key1 = RuleIdentity.GetIdentityKey(rule);
        var key2 = RuleIdentity.GetIdentityKey(rule);

        // Assert
        Assert.Equal(key1, key2);
        Assert.Equal("Required|name.family|all", key1);
    }

    [Fact]
    public void GetIdentityKey_SameFieldPathDifferentInstanceScope_ReturnsDifferentKeys()
    {
        // Arrange
        var rule1 = new RuleDefinition
        {
            Id = "rule1",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = "name.family",
            InstanceScope = new AllInstances(),
            ErrorCode = "MISSING_FAMILY_NAME"
        };

        var rule2 = new RuleDefinition
        {
            Id = "rule2",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = "name.family",
            InstanceScope = new FirstInstance(),
            ErrorCode = "MISSING_FAMILY_NAME"
        };

        // Act
        var key1 = RuleIdentity.GetIdentityKey(rule1);
        var key2 = RuleIdentity.GetIdentityKey(rule2);

        // Assert
        Assert.NotEqual(key1, key2);
        Assert.Equal("Required|name.family|all", key1);
        Assert.Equal("Required|name.family|first", key2);
    }

    [Fact]
    public void GetIdentityKey_SameFieldPathDifferentFilteredInstances_ReturnsDifferentKeys()
    {
        // Arrange
        var rule1 = new RuleDefinition
        {
            Id = "rule1",
            Type = "Required",
            ResourceType = "Observation",
            FieldPath = "component.value",
            InstanceScope = new FilteredInstances { ConditionFhirPath = "code='X'" },
            ErrorCode = "MISSING_VALUE"
        };

        var rule2 = new RuleDefinition
        {
            Id = "rule2",
            Type = "Required",
            ResourceType = "Observation",
            FieldPath = "component.value",
            InstanceScope = new FilteredInstances { ConditionFhirPath = "code='Y'" },
            ErrorCode = "MISSING_VALUE"
        };

        // Act
        var key1 = RuleIdentity.GetIdentityKey(rule1);
        var key2 = RuleIdentity.GetIdentityKey(rule2);

        // Assert
        Assert.NotEqual(key1, key2);
        Assert.Contains("filter:", key1);
        Assert.Contains("filter:", key2);
        Assert.Contains("code='X'", key1);
        Assert.Contains("code='Y'", key2);
    }

    [Fact]
    public void GetIdentityKey_DifferentType_ReturnsDifferentKeys()
    {
        // Arrange
        var rule1 = new RuleDefinition
        {
            Id = "rule1",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = "name.family",
            InstanceScope = new AllInstances(),
            ErrorCode = "MISSING_FAMILY_NAME"
        };

        var rule2 = new RuleDefinition
        {
            Id = "rule2",
            Type = "ArrayLength",
            ResourceType = "Patient",
            FieldPath = "name.family",
            InstanceScope = new AllInstances(),
            ErrorCode = "INVALID_LENGTH"
        };

        // Act
        var key1 = RuleIdentity.GetIdentityKey(rule1);
        var key2 = RuleIdentity.GetIdentityKey(rule2);

        // Assert
        Assert.NotEqual(key1, key2);
        Assert.Equal("Required|name.family|all", key1);
        Assert.Equal("ArrayLength|name.family|all", key2);
    }

    [Fact]
    public void GetIdentityKey_DifferentFieldPath_ReturnsDifferentKeys()
    {
        // Arrange
        var rule1 = new RuleDefinition
        {
            Id = "rule1",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = "name.family",
            InstanceScope = new AllInstances(),
            ErrorCode = "MISSING_FAMILY_NAME"
        };

        var rule2 = new RuleDefinition
        {
            Id = "rule2",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = "name.given",
            InstanceScope = new AllInstances(),
            ErrorCode = "MISSING_GIVEN_NAME"
        };

        // Act
        var key1 = RuleIdentity.GetIdentityKey(rule1);
        var key2 = RuleIdentity.GetIdentityKey(rule2);

        // Assert
        Assert.NotEqual(key1, key2);
        Assert.Equal("Required|name.family|all", key1);
        Assert.Equal("Required|name.given|all", key2);
    }

    [Fact]
    public void GetIdentityKey_NullInstanceScope_UsesNoneKey()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "rule1",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = "name.family",
            InstanceScope = null,
            ErrorCode = "MISSING_FAMILY_NAME"
        };

        // Act
        var key = RuleIdentity.GetIdentityKey(rule);

        // Assert
        Assert.Equal("Required|name.family|none", key);
    }

    [Fact]
    public void GetIdentityKey_FromComponents_MatchesRuleDefinitionKey()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "rule1",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = "name.family",
            InstanceScope = new AllInstances(),
            ErrorCode = "MISSING_FAMILY_NAME"
        };

        // Act
        var keyFromRule = RuleIdentity.GetIdentityKey(rule);
        var keyFromComponents = RuleIdentity.GetIdentityKey(rule.Type, rule.FieldPath, rule.InstanceScope);

        // Assert
        Assert.Equal(keyFromRule, keyFromComponents);
    }

    [Fact]
    public void AreEqual_SameIdentity_ReturnsTrue()
    {
        // Arrange
        var rule1 = new RuleDefinition
        {
            Id = "rule1",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = "name.family",
            InstanceScope = new AllInstances(),
            ErrorCode = "MISSING_FAMILY_NAME"
        };

        var rule2 = new RuleDefinition
        {
            Id = "rule2", // Different ID
            Type = "Required",
            ResourceType = "Patient", // Same Type
            FieldPath = "name.family", // Same FieldPath
            InstanceScope = new AllInstances(), // Same InstanceScope
            ErrorCode = "DIFFERENT_ERROR" // Different ErrorCode
        };

        // Act
        var areEqual = RuleIdentity.AreEqual(rule1, rule2);

        // Assert
        Assert.True(areEqual);
    }

    [Fact]
    public void AreEqual_DifferentInstanceScope_ReturnsFalse()
    {
        // Arrange
        var rule1 = new RuleDefinition
        {
            Id = "rule1",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = "name.family",
            InstanceScope = new AllInstances(),
            ErrorCode = "MISSING_FAMILY_NAME"
        };

        var rule2 = new RuleDefinition
        {
            Id = "rule2",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = "name.family",
            InstanceScope = new FirstInstance(),
            ErrorCode = "MISSING_FAMILY_NAME"
        };

        // Act
        var areEqual = RuleIdentity.AreEqual(rule1, rule2);

        // Assert
        Assert.False(areEqual);
    }

    [Fact]
    public void InstanceScopeEquals_BothNull_ReturnsTrue()
    {
        // Act
        var result = RuleIdentity.InstanceScopeEquals(null, null);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void InstanceScopeEquals_OneNull_ReturnsFalse()
    {
        // Arrange
        var scope = new AllInstances();

        // Act
        var result1 = RuleIdentity.InstanceScopeEquals(scope, null);
        var result2 = RuleIdentity.InstanceScopeEquals(null, scope);

        // Assert
        Assert.False(result1);
        Assert.False(result2);
    }

    [Fact]
    public void InstanceScopeEquals_SameType_ReturnsTrue()
    {
        // Arrange
        var scope1 = new AllInstances();
        var scope2 = new AllInstances();

        // Act
        var result = RuleIdentity.InstanceScopeEquals(scope1, scope2);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void InstanceScopeEquals_DifferentType_ReturnsFalse()
    {
        // Arrange
        var scope1 = new AllInstances();
        var scope2 = new FirstInstance();

        // Act
        var result = RuleIdentity.InstanceScopeEquals(scope1, scope2);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void InstanceScopeEquals_SameFilteredInstancesWithSameCondition_ReturnsTrue()
    {
        // Arrange
        var scope1 = new FilteredInstances { ConditionFhirPath = "code='X'" };
        var scope2 = new FilteredInstances { ConditionFhirPath = "code='X'" };

        // Act
        var result = RuleIdentity.InstanceScopeEquals(scope1, scope2);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void InstanceScopeEquals_SameFilteredInstancesWithDifferentCondition_ReturnsFalse()
    {
        // Arrange
        var scope1 = new FilteredInstances { ConditionFhirPath = "code='X'" };
        var scope2 = new FilteredInstances { ConditionFhirPath = "code='Y'" };

        // Act
        var result = RuleIdentity.InstanceScopeEquals(scope1, scope2);

        // Assert
        Assert.False(result);
    }
}
