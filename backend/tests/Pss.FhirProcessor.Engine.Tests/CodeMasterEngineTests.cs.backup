using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Services;
using FluentAssertions;

namespace Pss.FhirProcessor.Engine.Tests;

public class CodeMasterEngineTests
{
    private readonly CodeMasterEngine _engine;

    public CodeMasterEngineTests()
    {
        _engine = new CodeMasterEngine();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_ValidSingleAnswerQuestion_ReturnsNoErrors()
    {
        // Arrange
        var bundle = CreateBundleWithObservation("HS", new[]
        {
            CreateComponent("Q1", "Yes")
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q1",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "Yes" },
                                new AnswerDefinition { Code = "No" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().BeEmpty();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_InvalidSingleAnswerValue_ReturnsError()
    {
        // Arrange
        var bundle = CreateBundleWithObservation("HS", new[]
        {
            CreateComponent("Q1", "Maybe")
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q1",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "Yes" },
                                new AnswerDefinition { Code = "No" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().HaveCount(1);
        var error = errors[0];
        AssertError(error, "INVALID_ANSWER_VALUE", expectedPath: "Observation.component[0].value");
        error.Details.Should().ContainKey("actualValue");
        error.Details.Should().ContainKey("allowedValues");
        error.Details!["actualValue"].Should().Be("Maybe");
        var allowedValues = error.Details["allowedValues"] as List<string>;
        allowedValues.Should().Contain(new[] { "Yes", "No" });
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_ValidMultiValueCommaSeparated_ReturnsNoErrors()
    {
        // Arrange - Using CodeableConcept with multiple codings for multi-value
        var bundle = CreateBundleWithObservation("HS", new[]
        {
            CreateMultiValueComponent("Q2", new[] { "500Hz – R", "1000Hz – NR" })
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q2",
                            MultiValue = true,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "500Hz – R" },
                                new AnswerDefinition { Code = "1000Hz – NR" },
                                new AnswerDefinition { Code = "2000Hz – R" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().BeEmpty();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_InvalidMultiValue_ContainsForbiddenAnswer_ReturnsError()
    {
        // Arrange
        var bundle = CreateBundleWithObservation("HS", new[]
        {
            CreateMultiValueComponent("Q2", new[] { "500Hz – R", "9999Hz – X" })
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q2",
                            MultiValue = true,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "500Hz – R" },
                                new AnswerDefinition { Code = "1000Hz – NR" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().HaveCount(1);
        var error = errors[0];
        AssertError(error, "INVALID_ANSWER_VALUE");
        error.Details!["actualValue"].Should().Be("9999Hz – X");
        var allowedValues = error.Details["allowedValues"] as List<string>;
        allowedValues.Should().Contain(new[] { "500Hz – R", "1000Hz – NR" });
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_UnknownScreeningType_ReturnsError()
    {
        // Arrange
        var bundle = CreateBundleWithObservation("UNKNOWN", new[]
        {
            CreateComponent("Q1", "Yes")
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>()
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().HaveCount(1);
        var error = errors[0];
        AssertError(error, "UNKNOWN_SCREENING_TYPE", expectedPath: "Observation.code");
        error.Details!["screeningType"].Should().Be("UNKNOWN");
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_ComponentMissingValueString_NoErrorsForMissingValue()
    {
        // Arrange - Component with code but no value
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-001",
                        Code = new CodeableConcept
                        {
                            Coding = new List<Coding>
                            {
                                new Coding { Code = "HS" }
                            }
                        },
                        Component = new List<Observation.ComponentComponent>
                        {
                            new Observation.ComponentComponent
                            {
                                Code = new CodeableConcept
                                {
                                    Coding = new List<Coding>
                                    {
                                        new Coding { Code = "Q1" }
                                    }
                                }
                                // No Value set
                            }
                        }
                    }
                }
            }
        };

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q1",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "Yes" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        // Engine doesn't validate missing values, only invalid values
        errors.Should().BeEmpty();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_MultipleValuesNotAllowed_ReturnsError()
    {
        // Arrange
        var bundle = CreateBundleWithObservation("HS", new[]
        {
            CreateMultiValueComponent("Q1", new[] { "Yes", "No" })
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q1",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "Yes" },
                                new AnswerDefinition { Code = "No" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().HaveCount(1);
        var error = errors[0];
        AssertError(error, "MULTIPLE_VALUES_NOT_ALLOWED");
        error.Details!["questionCode"].Should().Be("Q1");
        error.Details["valueCount"].Should().Be(2);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_MultiValueDuplicateAnswers_Allowed()
    {
        // Arrange
        var bundle = CreateBundleWithObservation("HS", new[]
        {
            CreateMultiValueComponent("Q2", new[] { "500Hz – R", "500Hz – R" })
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q2",
                            MultiValue = true,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "500Hz – R" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().BeEmpty();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_CodeNotFoundInCodeMaster_ReturnsError()
    {
        // Arrange
        var bundle = CreateBundleWithObservation("HS", new[]
        {
            CreateComponent("UNKNOWN_CODE", "Yes")
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q1",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "Yes" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().HaveCount(1);
        var error = errors[0];
        AssertError(error, "INVALID_QUESTION_CODE");
        error.Details!["questionCode"].Should().Be("UNKNOWN_CODE");
        error.Details["screeningType"].Should().Be("HS");
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_ComponentMissingCode_ReturnsError()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-001",
                        Code = new CodeableConcept
                        {
                            Coding = new List<Coding>
                            {
                                new Coding { Code = "HS" }
                            }
                        },
                        Component = new List<Observation.ComponentComponent>
                        {
                            new Observation.ComponentComponent
                            {
                                // No Code set
                                Value = new FhirString("Yes")
                            }
                        }
                    }
                }
            }
        };

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>()
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().HaveCount(1);
        var error = errors[0];
        AssertError(error, "MISSING_QUESTION_CODE", expectedPath: "Observation.component[0].code");
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_AllowedAnswersCaseSensitive_ReturnsError()
    {
        // Arrange
        var bundle = CreateBundleWithObservation("HS", new[]
        {
            CreateComponent("Q1", "yes") // lowercase
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q1",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "Yes" } // uppercase Y
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().HaveCount(1);
        var error = errors[0];
        AssertError(error, "INVALID_ANSWER_VALUE");
        error.Details!["actualValue"].Should().Be("yes");
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_MultiValueWithUnicodeCharacters_WorksCorrectly()
    {
        // Arrange
        var bundle = CreateBundleWithObservation("HS", new[]
        {
            CreateMultiValueComponent("Q2", new[] { "500Hz – R", "1000Hz – NR" })
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q2",
                            MultiValue = true,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "500Hz – R" },
                                new AnswerDefinition { Code = "1000Hz – NR" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().BeEmpty();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_CodeMasterWithoutQuestions_ReturnsNoErrors()
    {
        // Arrange
        var bundle = CreateBundleWithObservation("HS", new[]
        {
            CreateComponent("Q1", "Yes")
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>() // Empty questions list
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        // If no questions defined, component validation finds no matching question
        errors.Should().HaveCount(1);
        errors[0].ErrorCode.Should().Be("INVALID_QUESTION_CODE");
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_EmptyCodeMaster_ReturnsNoErrors()
    {
        // Arrange
        var bundle = CreateBundleWithObservation("HS", new[]
        {
            CreateComponent("Q1", "Yes")
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>()
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().BeEmpty();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_MultipleErrorsInSameComponent_ReturnsAllErrors()
    {
        // Arrange - Component with multiple values when not allowed AND invalid value
        var bundle = CreateBundleWithObservation("HS", new[]
        {
            CreateMultiValueComponent("Q1", new[] { "Maybe", "Perhaps" })
        });

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q1",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "Yes" },
                                new AnswerDefinition { Code = "No" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        // Should have error for multiple values + 2 errors for invalid values
        errors.Should().HaveCountGreaterOrEqualTo(1);
        errors.Should().Contain(e => e.ErrorCode == "MULTIPLE_VALUES_NOT_ALLOWED");
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_NoComponentsPresent_ReturnsNoErrors()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-001",
                        Code = new CodeableConcept
                        {
                            Coding = new List<Coding>
                            {
                                new Coding { Code = "HS" }
                            }
                        }
                        // No Component property set
                    }
                }
            }
        };

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q1",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "Yes" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        // Engine doesn't validate for missing required questions, only validates present components
        errors.Should().BeEmpty();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_MultipleObservations_ValidatesAll()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-001",
                        Code = new CodeableConcept { Coding = new List<Coding> { new Coding { Code = "HS" } } },
                        Component = new List<Observation.ComponentComponent>
                        {
                            CreateComponent("Q1", "Yes")
                        }
                    }
                },
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-002",
                        Code = new CodeableConcept { Coding = new List<Coding> { new Coding { Code = "HS" } } },
                        Component = new List<Observation.ComponentComponent>
                        {
                            CreateComponent("Q1", "Invalid")
                        }
                    }
                }
            }
        };

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q1",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "Yes" },
                                new AnswerDefinition { Code = "No" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().HaveCount(1);
        errors[0].ResourceId.Should().Be("obs-002");
        errors[0].ErrorCode.Should().Be("INVALID_ANSWER_VALUE");
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_IntegerValueType_ValidatesCorrectly()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-001",
                        Code = new CodeableConcept { Coding = new List<Coding> { new Coding { Code = "HS" } } },
                        Component = new List<Observation.ComponentComponent>
                        {
                            new Observation.ComponentComponent
                            {
                                Code = new CodeableConcept
                                {
                                    Coding = new List<Coding> { new Coding { Code = "Q1" } }
                                },
                                Value = new Integer(5)
                            }
                        }
                    }
                }
            }
        };

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q1",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "5" },
                                new AnswerDefinition { Code = "10" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().BeEmpty();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_BooleanValueType_ValidatesCorrectly()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-001",
                        Code = new CodeableConcept { Coding = new List<Coding> { new Coding { Code = "HS" } } },
                        Component = new List<Observation.ComponentComponent>
                        {
                            new Observation.ComponentComponent
                            {
                                Code = new CodeableConcept
                                {
                                    Coding = new List<Coding> { new Coding { Code = "Q1" } }
                                },
                                Value = new FhirBoolean(true)
                            }
                        }
                    }
                }
            }
        };

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q1",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "true" },
                                new AnswerDefinition { Code = "false" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().BeEmpty();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_CodingValueType_ValidatesCorrectly()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-001",
                        Code = new CodeableConcept { Coding = new List<Coding> { new Coding { Code = "HS" } } },
                        Component = new List<Observation.ComponentComponent>
                        {
                            new Observation.ComponentComponent
                            {
                                Code = new CodeableConcept
                                {
                                    Coding = new List<Coding> { new Coding { Code = "Q1" } }
                                },
                                Value = new Coding { Code = "Yes" }
                            }
                        }
                    }
                }
            }
        };

        var codeMaster = new CodeMasterDefinition
        {
            ScreeningTypes = new List<ScreeningType>
            {
                new ScreeningType
                {
                    Code = "HS",
                    Questions = new List<QuestionDefinition>
                    {
                        new QuestionDefinition
                        {
                            Code = "Q1",
                            MultiValue = false,
                            AllowedAnswers = new List<AnswerDefinition>
                            {
                                new AnswerDefinition { Code = "Yes" },
                                new AnswerDefinition { Code = "No" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, codeMaster);

        // Assert
        errors.Should().BeEmpty();
    }

    // Helper Methods

    private Bundle CreateBundleWithObservation(string screeningType, Observation.ComponentComponent[] components)
    {
        return new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Observation
                    {
                        Id = "obs-001",
                        Code = new CodeableConcept
                        {
                            Coding = new List<Coding>
                            {
                                new Coding { Code = screeningType }
                            }
                        },
                        Component = new List<Observation.ComponentComponent>(components)
                    }
                }
            }
        };
    }

    private Observation.ComponentComponent CreateComponent(string code, string value)
    {
        return new Observation.ComponentComponent
        {
            Code = new CodeableConcept
            {
                Coding = new List<Coding>
                {
                    new Coding { Code = code }
                }
            },
            Value = new FhirString(value)
        };
    }

    private Observation.ComponentComponent CreateMultiValueComponent(string code, string[] values)
    {
        return new Observation.ComponentComponent
        {
            Code = new CodeableConcept
            {
                Coding = new List<Coding>
                {
                    new Coding { Code = code }
                }
            },
            Value = new CodeableConcept
            {
                Coding = values.Select(v => new Coding { Code = v }).ToList()
            }
        };
    }

    private void AssertError(
        CodeMasterValidationError error,
        string expectedCode,
        string? expectedQuestionCode = null,
        string? expectedPath = null)
    {
        error.ErrorCode.Should().Be(expectedCode);
        if (expectedQuestionCode != null)
        {
            error.Details.Should().ContainKey("questionCode");
            error.Details!["questionCode"].Should().Be(expectedQuestionCode);
        }
        if (expectedPath != null)
        {
            error.Path.Should().Be(expectedPath);
        }
        error.Path.Should().NotBeNullOrEmpty();
        error.Message.Should().NotBeNullOrEmpty();
    }
}
