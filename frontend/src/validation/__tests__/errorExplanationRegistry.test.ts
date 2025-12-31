/**
 * Phase 6 - Error Explanation Registry Tests
 */

import {
  errorExplanationRegistry,
  getFallbackExplanation,
  type ErrorExplanation,
} from "../errorExplanationRegistry";

describe("errorExplanationRegistry", () => {
  describe("VALUE_NOT_ALLOWED", () => {
    const handler = errorExplanationRegistry.VALUE_NOT_ALLOWED;

    it("renders correct description when actual value exists", () => {
      const result = handler({
        actual: "invalid",
        allowed: ["valid1", "valid2"],
        valueType: "string",
      });

      expect(result.title).toBe("Value not allowed");
      expect(result.description).toContain('"invalid"');
      expect(result.description).toContain("valid1, valid2");
    });

    it("renders correct description when actual is null", () => {
      const result = handler({
        actual: null,
        allowed: ["valid1", "valid2"],
        valueType: "string",
      });

      expect(result.title).toBe("Value not allowed");
      expect(result.description).toContain("A value is required");
      expect(result.description).toContain("valid1, valid2");
    });

    it("renders correct description when actual is undefined", () => {
      const result = handler({
        actual: undefined,
        allowed: ["valid1", "valid2"],
        valueType: "string",
      });

      expect(result.title).toBe("Value not allowed");
      expect(result.description).toContain("A value is required");
      expect(result.description).toContain("valid1, valid2");
    });

    it("handles missing allowed array with fallback", () => {
      const result = handler({
        actual: "test",
        valueType: "string",
      });

      expect(result).toEqual(getFallbackExplanation());
    });

    it("handles empty allowed array with fallback", () => {
      const result = handler({
        actual: "test",
        allowed: [],
        valueType: "string",
      });

      expect(result).toEqual(getFallbackExplanation());
    });

    it("does NOT access jsonPointer", () => {
      const result = handler({
        actual: "test",
        allowed: ["valid"],
        valueType: "string",
        jsonPointer: "/path/to/field", // Should be ignored
      });

      expect(result.description).not.toContain("/path/to/field");
    });

    it("does NOT access path", () => {
      const result = handler({
        actual: "test",
        allowed: ["valid"],
        valueType: "string",
        path: "Resource.field", // Should be ignored
      });

      expect(result.description).not.toContain("Resource.field");
    });

    it("handles malformed details with fallback", () => {
      const result = handler("not an object");
      expect(result).toEqual(getFallbackExplanation());
    });

    it("does NOT throw on missing details", () => {
      expect(() => handler(undefined)).not.toThrow();
      expect(() => handler(null)).not.toThrow();
    });
  });

  describe("PATTERN_MISMATCH", () => {
    const handler = errorExplanationRegistry.PATTERN_MISMATCH;

    it("uses description if provided", () => {
      const result = handler({
        actual: "abc",
        pattern: "\\d+",
        description: "Must be numeric only",
      });

      expect(result.title).toBe("Invalid format");
      expect(result.description).toBe("Must be numeric only");
    });

    it("uses generic message if description is missing", () => {
      const result = handler({
        actual: "abc",
        pattern: "\\d+",
      });

      expect(result.title).toBe("Invalid format");
      expect(result.description).toContain('"abc"');
      expect(result.description).toContain("does not match");
    });

    it("handles null actual value", () => {
      const result = handler({
        actual: null,
        pattern: "\\d+",
      });

      expect(result.title).toBe("Invalid format");
      expect(result.description).toContain('"null"');
    });

    it("does NOT parse pattern for UI", () => {
      const result = handler({
        actual: "test",
        pattern: "^[A-Z]{3}$", // Regex should not be interpreted
      });

      expect(result.description).not.toContain("three uppercase letters");
      expect(result.description).not.toContain("A-Z");
    });

    it("handles malformed details with fallback", () => {
      const result = handler("not an object");
      expect(result).toEqual(getFallbackExplanation());
    });

    it("does NOT throw on missing details", () => {
      expect(() => handler(undefined)).not.toThrow();
      expect(() => handler(null)).not.toThrow();
    });
  });

  describe("FIXED_VALUE_MISMATCH", () => {
    const handler = errorExplanationRegistry.FIXED_VALUE_MISMATCH;

    it("renders expected and actual values", () => {
      const result = handler({
        actual: "wrong",
        expected: "correct",
      });

      expect(result.title).toBe("Incorrect value");
      expect(result.description).toContain('"correct"');
      expect(result.description).toContain('"wrong"');
    });

    it("handles null actual value", () => {
      const result = handler({
        actual: null,
        expected: "required",
      });

      expect(result.title).toBe("Incorrect value");
      expect(result.description).toContain('"required"');
      expect(result.description).toContain('"null"');
    });

    it("handles missing expected with fallback", () => {
      const result = handler({
        actual: "test",
      });

      expect(result).toEqual(getFallbackExplanation());
    });

    it("handles malformed details with fallback", () => {
      const result = handler("not an object");
      expect(result).toEqual(getFallbackExplanation());
    });

    it("does NOT throw on missing details", () => {
      expect(() => handler(undefined)).not.toThrow();
      expect(() => handler(null)).not.toThrow();
    });
  });

  describe("REQUIRED_FIELD_MISSING", () => {
    const handler = errorExplanationRegistry.REQUIRED_FIELD_MISSING;

    it("renders correct message", () => {
      const result = handler({
        required: true,
      });

      expect(result.title).toBe("Missing required field");
      expect(result.description).toBe("This field is required but was not provided.");
    });

    it("handles malformed details with fallback", () => {
      const result = handler({
        required: false,
      });

      expect(result).toEqual(getFallbackExplanation());
    });

    it("handles missing required flag with fallback", () => {
      const result = handler({});
      expect(result).toEqual(getFallbackExplanation());
    });

    it("handles malformed details with fallback", () => {
      const result = handler("not an object");
      expect(result).toEqual(getFallbackExplanation());
    });

    it("does NOT throw on missing details", () => {
      expect(() => handler(undefined)).not.toThrow();
      expect(() => handler(null)).not.toThrow();
    });
  });

  describe("Fallback behavior", () => {
    it("returns generic message", () => {
      const result = getFallbackExplanation();

      expect(result.title).toBe("Validation issue");
      expect(result.description).toBe("This field does not meet validation requirements.");
    });

    it("logs console.warn for unknown errorCode", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      getFallbackExplanation("UNKNOWN_ERROR_CODE");

      expect(warnSpy).toHaveBeenCalledWith(
        '[ErrorExplanationRegistry] Unknown errorCode: "UNKNOWN_ERROR_CODE"'
      );

      warnSpy.mockRestore();
    });

    it("does NOT log console.warn when errorCode is not provided", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      getFallbackExplanation();

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
