/**
 * Phase 6 - explainError() Entry Point Tests
 */

import { explainError, type ValidationError } from "../explainError";
import { getFallbackExplanation } from "../errorExplanationRegistry";

describe("explainError", () => {
  it("returns explanation for known errorCode", () => {
    const error: ValidationError = {
      errorCode: "VALUE_NOT_ALLOWED",
      details: {
        actual: "invalid",
        allowed: ["valid1", "valid2"],
        valueType: "string",
      },
    };

    const result = explainError(error);

    expect(result.title).toBe("Value not allowed");
    expect(result.description).toContain("invalid");
    expect(result.description).toContain("valid1, valid2");
  });

  it("uses fallback for unknown errorCode", () => {
    const error: ValidationError = {
      errorCode: "UNKNOWN_ERROR_CODE",
      details: { foo: "bar" },
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = explainError(error);

    expect(result).toEqual(getFallbackExplanation("UNKNOWN_ERROR_CODE"));
    expect(warnSpy).toHaveBeenCalledWith(
      '[ErrorExplanationRegistry] Unknown errorCode: "UNKNOWN_ERROR_CODE"'
    );

    warnSpy.mockRestore();
  });

  it("handles missing details gracefully", () => {
    const error: ValidationError = {
      errorCode: "VALUE_NOT_ALLOWED",
      // No details provided
    };

    const result = explainError(error);

    // Should return fallback since details are invalid
    expect(result).toEqual(getFallbackExplanation());
  });

  it("handles malformed details gracefully", () => {
    const error: ValidationError = {
      errorCode: "VALUE_NOT_ALLOWED",
      details: "not an object", // Invalid
    };

    const result = explainError(error);

    // Should return fallback since details are invalid
    expect(result).toEqual(getFallbackExplanation());
  });

  it("does NOT throw when error is null", () => {
    expect(() => explainError(null as any)).not.toThrow();
    const result = explainError(null as any);
    expect(result).toEqual(getFallbackExplanation());
  });

  it("does NOT throw when error is undefined", () => {
    expect(() => explainError(undefined as any)).not.toThrow();
    const result = explainError(undefined as any);
    expect(result).toEqual(getFallbackExplanation());
  });

  it("does NOT throw when errorCode is missing", () => {
    const error = { details: { foo: "bar" } } as any;

    expect(() => explainError(error)).not.toThrow();
    const result = explainError(error);
    expect(result).toEqual(getFallbackExplanation());
  });

  it("handles handler throwing an error (should never happen)", async () => {
    // Temporarily break a handler to test error handling
    const { errorExplanationRegistry } = await import("../errorExplanationRegistry");
    const originalHandler = errorExplanationRegistry.VALUE_NOT_ALLOWED;
    
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Replace handler with one that throws
    errorExplanationRegistry.VALUE_NOT_ALLOWED = () => {
      throw new Error("Handler crashed!");
    };

    const error: ValidationError = {
      errorCode: "VALUE_NOT_ALLOWED",
      details: { actual: "test", allowed: ["valid"] },
    };

    const result = explainError(error);

    expect(result).toEqual(getFallbackExplanation());
    expect(errorSpy).toHaveBeenCalled();

    // Restore original handler
    errorExplanationRegistry.VALUE_NOT_ALLOWED = originalHandler;
    errorSpy.mockRestore();
  });

  it("does NOT access error.path", () => {
    const error: any = {
      errorCode: "VALUE_NOT_ALLOWED",
      path: "Resource.field[0]", // Should be ignored
      details: {
        actual: "invalid",
        allowed: ["valid"],
        valueType: "string",
      },
    };

    const result = explainError(error);

    expect(result.description).not.toContain("Resource.field");
  });

  it("does NOT access error.jsonPointer", () => {
    const error: any = {
      errorCode: "VALUE_NOT_ALLOWED",
      jsonPointer: "/entry/0/resource/field", // Should be ignored
      details: {
        actual: "invalid",
        allowed: ["valid"],
        valueType: "string",
      },
    };

    const result = explainError(error);

    expect(result.description).not.toContain("/entry/0/resource/field");
  });

  it("does NOT access error.ruleType", () => {
    const error: any = {
      errorCode: "VALUE_NOT_ALLOWED",
      ruleType: "FhirPath", // Should be ignored
      details: {
        actual: "invalid",
        allowed: ["valid"],
        valueType: "string",
      },
    };

    const result = explainError(error);

    expect(result.description).not.toContain("FhirPath");
  });

  it("does NOT access error.severity", () => {
    const error: any = {
      errorCode: "VALUE_NOT_ALLOWED",
      severity: "error", // Should be ignored
      details: {
        actual: "invalid",
        allowed: ["valid"],
        valueType: "string",
      },
    };

    const result = explainError(error);

    expect(result.description).not.toContain("error");
    expect(result.description).not.toContain("severity");
  });

  it("works correctly with multiple errorCodes", () => {
    const errors: ValidationError[] = [
      {
        errorCode: "VALUE_NOT_ALLOWED",
        details: { actual: "x", allowed: ["a", "b"], valueType: "string" },
      },
      {
        errorCode: "PATTERN_MISMATCH",
        details: { actual: "abc", pattern: "\\d+", description: "Must be numeric" },
      },
      {
        errorCode: "FIXED_VALUE_MISMATCH",
        details: { actual: "wrong", expected: "correct" },
      },
      {
        errorCode: "REQUIRED_FIELD_MISSING",
        details: { required: true },
      },
    ];

    const results = errors.map(explainError);

    expect(results[0].title).toBe("Value not allowed");
    expect(results[1].title).toBe("Invalid format");
    expect(results[2].title).toBe("Incorrect value");
    expect(results[3].title).toBe("Missing required field");
  });
});
