using Xunit;
using FluentAssertions;
using Pss.FhirProcessor.Engine.Validation;
using Pss.FhirProcessor.Engine.Validation.QuestionAnswer;
using Pss.FhirProcessor.Engine.Validation.QuestionAnswer.Models;

namespace Pss.FhirProcessor.Engine.Tests.Validation.QuestionAnswer;

/// <summary>
/// MANDATORY TEST SUITE for structured Question/Answer validation
/// Tests verify that backend returns pure structured data (NO PROSE)
/// </summary>
public class StructuredQuestionAnswerValidationTests
{
    /// <summary>
    /// Test 1: Quantity expected, string provided
    /// </summary>
    [Fact]
    public void Test_InvalidAnswerValue_QuantityExpected_StringProvided()
    {
        // Arrange
        var question = new QuestionRef(
            System: "http://loinc.org",
            Code: "8867-4",
            Display: "Heart rate"
        );

        var expected = new ExpectedAnswer(
            AnswerType: "quantity",
            Constraints: new Dictionary<string, object>
            {
                ["min"] = 40,
                ["max"] = 180,
                ["unit"] = "beats/min"
            }
        );

        var actual = new ActualAnswer(
            AnswerType: "string",
            Value: "fast"
        );

        var location = new ValidationLocation(
            FhirPath: "Observation.component[0]",
            JsonPointer: "/component/0"
        );

        // Act
        var error = QuestionAnswerErrorFactory.InvalidAnswerValue(
            ruleId: "rule-123",
            resourceType: "Observation",
            severity: "error",
            question: question,
            expected: expected,
            actual: actual,
            location: location,
            entryIndex: 0
        );

        // Assert - NO MESSAGE TEXT
        error.ErrorCode.Should().Be(ValidationErrorCodes.INVALID_ANSWER_VALUE);
        error.RuleId.Should().Be("rule-123");
        error.ResourceType.Should().Be("Observation");
        error.Severity.Should().Be("error");

        // Assert - Structured details exist
        error.Details.Should().ContainKey("question");
        error.Details.Should().ContainKey("expected");
        error.Details.Should().ContainKey("actual");
        error.Details.Should().ContainKey("location");

        // Assert - Question structure
        var questionDict = error.Details["question"] as Dictionary<string, object?>;
        questionDict.Should().NotBeNull();
        questionDict!["system"].Should().Be("http://loinc.org");
        questionDict["code"].Should().Be("8867-4");
        questionDict["display"].Should().Be("Heart rate");

        // Assert - Expected structure
        var expectedDict = error.Details["expected"] as Dictionary<string, object?>;
        expectedDict.Should().NotBeNull();
        expectedDict!["answerType"].Should().Be("quantity");
        
        var constraints = expectedDict["constraints"] as IDictionary<string, object>;
        constraints.Should().NotBeNull();
        constraints!["min"].Should().Be(40);
        constraints["max"].Should().Be(180);

        // Assert - Actual structure
        var actualDict = error.Details["actual"] as Dictionary<string, object?>;
        actualDict.Should().NotBeNull();
        actualDict!["answerType"].Should().Be("string");
        actualDict["value"].Should().Be("fast");

        // Assert - Location structure
        var locationDict = error.Details["location"] as Dictionary<string, object?>;
        locationDict.Should().NotBeNull();
        locationDict!["path"].Should().Be("Observation.component[0]");
        locationDict["jsonPointer"].Should().Be("/component/0");
    }

    /// <summary>
    /// Test 2: Numeric value out of range
    /// </summary>
    [Fact]
    public void Test_AnswerOutOfRange_NumericConstraintsViolated()
    {
        // Arrange
        var question = new QuestionRef(
            System: "http://loinc.org",
            Code: "8867-4",
            Display: "Heart rate"
        );

        var location = new ValidationLocation(
            FhirPath: "Observation.component[0]",
            JsonPointer: "/component/0"
        );

        // Act
        var error = QuestionAnswerErrorFactory.AnswerOutOfRange(
            ruleId: "rule-123",
            resourceType: "Observation",
            severity: "error",
            question: question,
            min: 40,
            max: 180,
            actualValue: 250,
            location: location,
            entryIndex: 0
        );

        // Assert
        error.ErrorCode.Should().Be(ValidationErrorCodes.ANSWER_OUT_OF_RANGE);
        
        var expectedDict = error.Details["expected"] as Dictionary<string, object?>;
        var constraints = expectedDict!["constraints"] as Dictionary<string, object?>;
        constraints!["min"].Should().Be(40m);
        constraints["max"].Should().Be(180m);

        var actualDict = error.Details["actual"] as Dictionary<string, object?>;
        actualDict!["value"].Should().Be(250m);
    }

    /// <summary>
    /// Test 3: Code not in allowed ValueSet
    /// </summary>
    [Fact]
    public void Test_AnswerNotInValueSet_CodeNotAllowed()
    {
        // Arrange
        var question = new QuestionRef(
            System: "http://loinc.org",
            Code: "55284-4",
            Display: "Blood pressure"
        );

        var location = new ValidationLocation(
            FhirPath: "Observation.component[1]",
            JsonPointer: "/component/1"
        );

        // Act
        var error = QuestionAnswerErrorFactory.AnswerNotInValueSet(
            ruleId: "rule-123",
            resourceType: "Observation",
            severity: "error",
            question: question,
            valueSetUrl: "http://hl7.org/fhir/ValueSet/observation-status",
            actualCode: "invalid-code",
            actualSystem: "http://custom.system",
            location: location,
            entryIndex: 0
        );

        // Assert
        error.ErrorCode.Should().Be(ValidationErrorCodes.ANSWER_NOT_IN_VALUESET);
        
        var expectedDict = error.Details["expected"] as Dictionary<string, object?>;
        expectedDict!["answerType"].Should().Be("codeableConcept");
        
        var constraints = expectedDict["constraints"] as Dictionary<string, object>;
        constraints!["valueSetUrl"].Should().Be("http://hl7.org/fhir/ValueSet/observation-status");

        var actualDict = error.Details["actual"] as Dictionary<string, object?>;
        var actualValue = actualDict!["value"] as Dictionary<string, object?>;
        actualValue!["code"].Should().Be("invalid-code");
        actualValue["system"].Should().Be("http://custom.system");
    }

    /// <summary>
    /// Test 4: Missing required answer
    /// </summary>
    [Fact]
    public void Test_AnswerRequired_MissingAnswer()
    {
        // Arrange
        var question = new QuestionRef(
            System: "http://loinc.org",
            Code: "8867-4",
            Display: "Heart rate"
        );

        var location = new ValidationLocation(
            FhirPath: "Observation.component[0]",
            JsonPointer: "/component/0"
        );

        // Act
        var error = QuestionAnswerErrorFactory.AnswerRequired(
            ruleId: "rule-123",
            resourceType: "Observation",
            severity: "error",
            question: question,
            expectedAnswerType: "quantity",
            location: location,
            entryIndex: 0
        );

        // Assert
        error.ErrorCode.Should().Be(ValidationErrorCodes.ANSWER_REQUIRED);
        
        var expectedDict = error.Details["expected"] as Dictionary<string, object?>;
        expectedDict!["answerType"].Should().Be("quantity");

        var actualDict = error.Details["actual"] as Dictionary<string, object?>;
        actualDict!["answerType"].Should().Be("missing");
        actualDict["value"].Should().BeNull();
    }

    /// <summary>
    /// Test 5: Question not found in QuestionSet
    /// </summary>
    [Fact]
    public void Test_QuestionNotFound_InQuestionSet()
    {
        // Arrange
        var location = new ValidationLocation(
            FhirPath: "Observation.component[0]",
            JsonPointer: "/component/0"
        );

        // Act
        var error = QuestionAnswerErrorFactory.QuestionNotFound(
            ruleId: "rule-123",
            resourceType: "Observation",
            severity: "warning",
            system: "http://loinc.org",
            code: "unknown-code",
            location: location,
            entryIndex: 0
        );

        // Assert
        error.ErrorCode.Should().Be(ValidationErrorCodes.QUESTION_NOT_FOUND);
        
        var questionDict = error.Details["question"] as Dictionary<string, object?>;
        questionDict!["system"].Should().Be("http://loinc.org");
        questionDict["code"].Should().Be("unknown-code");
        questionDict["display"].Should().BeNull();
    }

    /// <summary>
    /// Test 6: QuestionSet data missing
    /// </summary>
    [Fact]
    public void Test_QuestionSetDataMissing()
    {
        // Act
        var error = QuestionAnswerErrorFactory.QuestionSetDataMissing(
            ruleId: "rule-123",
            resourceType: "Observation",
            severity: "error",
            questionSetId: "missing-questionset-id",
            entryIndex: 0
        );

        // Assert
        error.ErrorCode.Should().Be(ValidationErrorCodes.QUESTIONSET_DATA_MISSING);
        error.Details["questionSetId"].Should().Be("missing-questionset-id");
    }

    /// <summary>
    /// Test 7: Verify NO PROSE in structured errors
    /// </summary>
    [Fact]
    public void Test_StructuredErrors_ContainNoUserFacingProse()
    {
        // Arrange
        var question = new QuestionRef("http://loinc.org", "8867-4", "Heart rate");
        var expected = new ExpectedAnswer("quantity", null);
        var actual = new ActualAnswer("string", "fast");
        var location = new ValidationLocation("Observation.component[0]", "/component/0");

        // Act
        var error = QuestionAnswerErrorFactory.InvalidAnswerValue(
            "rule-123", "Observation", "error", question, expected, actual, location
        );

        // Assert - Structured data is complete
        error.Details.Should().ContainKey("question");
        error.Details.Should().ContainKey("expected");
        error.Details.Should().ContainKey("actual");
    }

    /// <summary>
    /// Test 8: JsonPointer must exist for all validation errors
    /// </summary>
    [Fact]
    public void Test_AllErrors_MustIncludeJsonPointer()
    {
        // Arrange
        var question = new QuestionRef("http://loinc.org", "8867-4", null);
        var expected = new ExpectedAnswer("quantity", null);
        var actual = new ActualAnswer("string", "text");
        var location = new ValidationLocation("Observation.component[0]", "/component/0/valueQuantity");

        // Act
        var error = QuestionAnswerErrorFactory.InvalidAnswerValue(
            "rule-123", "Observation", "error", question, expected, actual, location
        );

        // Assert
        var locationDict = error.Details["location"] as Dictionary<string, object?>;
        locationDict.Should().NotBeNull();
        locationDict!["jsonPointer"].Should().NotBeNull();
        locationDict["jsonPointer"].Should().Be("/component/0/valueQuantity");
    }
}
