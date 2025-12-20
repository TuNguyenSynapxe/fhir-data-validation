# Rule Message Template System

## Overview

The Rule Message Template System provides a deterministic, token-based approach to generating and customizing validation error messages for FHIR rules. This system is **NOT AI-based** and operates purely on string templates and token substitution.

## Features

### ✅ Auto-Generation
- Generates sensible default messages based on rule type
- Updates automatically when rule type, path, or parameters change
- Only regenerates if the user hasn't manually customized the message

### ✅ Token System
- Tokenized templates allow dynamic message content
- Global tokens available for all rules (resource, path, fullPath, etc.)
- Rule-type-specific tokens (expected, min, max, pattern, etc.)
- Safe token resolution - never executes code

### ✅ User Control
- Messages remain fully editable at all times
- "Reset to default" button to regenerate template
- Live preview shows resolved message
- Token picker with tooltips for discoverability

### ✅ Safety
- No backend changes required
- Advisory warnings don't block saving
- No validation logic changes
- Never executes code from token values

---

## Default Message Templates

### Required
**Template:** `{fullPath} is required.`

**Example:** `Patient.name.family is required.`

### FixedValue
**Template:** `{fullPath} must be exactly "{expected}".`

**Example:** `Patient.gender must be exactly "male".`

### AllowedValues
**Template:** `{fullPath} must be one of the allowed values.`

**Example:** `Patient.gender must be one of the allowed values.`

### Regex
**Template:** `{fullPath} does not match the required format.`

**Example:** `Patient.identifier.value does not match the required format.`

### ArrayLength
**Templates (dynamic based on parameters):**
- With min + max: `{fullPath} must contain between {min} and {max} items.`
- With min only: `{fullPath} must contain at least {min} item(s).`
- With max only: `{fullPath} must contain no more than {max} item(s).`

**Example:** `Patient.name must contain between 1 and 5 items.`

### CodeSystem
**Template:** `{fullPath} must use a valid code from {system}.`

**Example:** `Observation.code.coding must use a valid code from loinc.org.`

### CustomFHIRPath
**Template:** `{fullPath} does not meet the required condition.`

**Example:** `Patient.birthDate does not meet the required condition.`

---

## Available Tokens

### Global Tokens (All Rules)

| Token | Description | Example |
|-------|-------------|---------|
| `{resource}` | The FHIR resource type | `Patient` |
| `{path}` | The field path without resource | `name.family` |
| `{fullPath}` | The complete path with resource | `Patient.name.family` |
| `{ruleType}` | The type of validation rule | `Required` |
| `{severity}` | The severity level | `error` |

### Rule-Type-Specific Tokens

#### FixedValue
| Token | Description | Example |
|-------|-------------|---------|
| `{expected}` | The expected fixed value | `"active"` |
| `{actual}` | The actual value found (runtime) | `"inactive"` |

#### AllowedValues
| Token | Description | Example |
|-------|-------------|---------|
| `{allowed}` | Comma-separated list of allowed values | `"male", "female", "other"` |
| `{count}` | Number of allowed values | `3` |
| `{actual}` | The actual value found (runtime) | `"unknown"` |

#### Regex
| Token | Description | Example |
|-------|-------------|---------|
| `{pattern}` | The regular expression pattern | `^[A-Z]\d$` |
| `{actual}` | The actual value that failed (runtime) | `ABC123` |

**Note:** Curly braces in regex patterns (like `{2}`) will be stripped as they're treated as unresolved tokens. Use simple patterns in messages or reference the pattern by name instead.

#### ArrayLength
| Token | Description | Example |
|-------|-------------|---------|
| `{min}` | Minimum required items | `1` |
| `{max}` | Maximum allowed items | `5` |
| `{actual}` | Actual number of items (runtime) | `0` |

#### CodeSystem
| Token | Description | Example |
|-------|-------------|---------|
| `{system}` | The code system URL (shortened) | `loinc.org` |
| `{code}` | The code value | `8867-4` |
| `{display}` | The display name | `Heart rate` |

#### CustomFHIRPath
| Token | Description | Example |
|-------|-------------|---------|
| `{expression}` | The FHIRPath expression | `name.exists()` |
| `{result}` | The expression result (runtime) | `false` |

---

## Usage Examples

### In Rule Editor

When you open the rule editor, you'll see:

1. **Message Editor** - A textarea with the current message template
2. **Available Tokens** - Clickable token buttons with tooltips
3. **Live Preview** - Shows how the message will appear with tokens resolved

### Auto-Generation Behavior

```typescript
// Rule created - default message generated
const rule = {
  type: 'Required',
  resourceType: 'Patient',
  path: 'name.family',
  message: '{fullPath} is required.',  // Auto-generated
  isMessageCustomized: false
};

// User edits message - customization flag set
rule.message = 'Family name must be provided';
rule.isMessageCustomized = true;

// Rule type changes - message DOES NOT auto-update (customized)
rule.type = 'FixedValue';
// message still: "Family name must be provided"

// User clicks "Reset to default" - flag cleared
rule.isMessageCustomized = false;
// message becomes: "{fullPath} must be exactly \"{expected}\"."

// Path changes - message DOES auto-update (not customized)
rule.path = 'name.given';
// message becomes: "{fullPath} must be exactly \"{expected}\"." (updated)
```

### Creating Custom Messages

```typescript
// Example 1: Simple custom message
message: 'This field is required'

// Example 2: Using tokens
message: 'The field {path} must be present in {resource}'
// Resolves to: "The field name.family must be present in Patient"

// Example 3: Complex message with multiple tokens
message: '{fullPath} expected "{expected}" but received "{actual}"'
// Resolves to: "Patient.gender expected "male" but received "female""

// Example 4: User-friendly message
message: 'Please provide a valid {path} value from: {allowed}'
// Resolves to: "Please provide a valid gender value from: "male", "female", "other""
```

---

## Implementation Details

### Files

```
frontend/src/
├── utils/
│   ├── ruleMessageTemplates.ts          # Core template system
│   └── __tests__/
│       └── ruleMessageTemplates.test.ts # Comprehensive tests
└── components/
    └── playground/
        ├── MessageEditor.tsx             # UI component
        └── Rules/
            └── RuleEditorModal.tsx       # Integration
```

### Key Functions

#### `generateDefaultMessage(context: RuleContext): string`
Generates the default tokenized message template for a rule.

```typescript
const context = {
  resourceType: 'Patient',
  path: 'name.family',
  ruleType: 'Required',
  severity: 'error'
};
const message = generateDefaultMessage(context);
// Returns: "{fullPath} is required."
```

#### `resolveMessageTokens(template: string, context: RuleContext): string`
Resolves all tokens in a message template to their actual values.

```typescript
const template = '{fullPath} must be exactly "{expected}".';
const context = {
  resourceType: 'Patient',
  path: 'gender',
  ruleType: 'FixedValue',
  severity: 'error',
  params: { value: 'male' }
};
const resolved = resolveMessageTokens(template, context);
// Returns: "Patient.gender must be exactly "male"."
```

#### `getAvailableTokens(ruleType: string): Token[]`
Returns all available tokens (global + rule-specific) for a given rule type.

```typescript
const tokens = getAvailableTokens('FixedValue');
// Returns: [
//   { name: 'resource', description: '...', example: 'Patient' },
//   { name: 'path', description: '...', example: 'name.family' },
//   { name: 'fullPath', description: '...', example: 'Patient.name.family' },
//   { name: 'ruleType', description: '...', example: 'Required' },
//   { name: 'severity', description: '...', example: 'error' },
//   { name: 'expected', description: '...', example: '"active"' },
//   { name: 'actual', description: '...', example: '"inactive"' }
// ]
```

### Data Flow

```
1. User opens rule editor
   ↓
2. RuleEditorModal checks isMessageCustomized flag
   ↓
3a. If false → Auto-generate default message
3b. If true → Keep existing message
   ↓
4. MessageEditor displays message with:
   - Editable textarea
   - Available tokens (clickable)
   - Live preview (resolved)
   ↓
5. User edits message
   ↓
6. isMessageCustomized = true
   ↓
7. Auto-generation disabled until user clicks "Reset"
```

### Auto-Generation Logic

```typescript
useEffect(() => {
  if (!formData.isMessageCustomized && formData.path) {
    const hasChanged = 
      prevRuleTypeRef.current !== formData.type ||
      prevPathRef.current !== formData.path ||
      paramsChanged;
    
    if (hasChanged) {
      const defaultMessage = generateDefaultMessage(context);
      setFormData(prev => ({ ...prev, message: defaultMessage }));
    }
  }
}, [formData.type, formData.path, formData.params, formData.isMessageCustomized]);
```

---

## Security Considerations

### No Code Execution
The token resolution system never executes code. All token values are converted to strings and inserted literally.

```typescript
// Example: Malicious input attempt
params: { value: '${console.log("injected")}' }
// Result in message: "$" (curly braces stripped as unresolved tokens)
// Code is NEVER executed
```

### Token Sanitization
- Unresolved tokens are removed (replaced with empty string)
- Curly braces in values are treated as potential tokens and removed
- No nested token resolution
- No template string evaluation

### Safe Defaults
- Always falls back gracefully if context is missing
- Never throws errors during resolution
- Returns empty string for missing values

---

## Testing

Comprehensive test suite covers:
- ✅ Default message generation for all rule types
- ✅ Token resolution (global + rule-specific)
- ✅ Security (no code execution)
- ✅ Edge cases (empty paths, unknown tokens, etc.)

Run tests:
```bash
npm test -- ruleMessageTemplates.test.ts --run
```

---

## Future Enhancements (Not Implemented)

Potential future improvements:
- Escape sequences for literal curly braces in patterns
- Multi-language message templates
- Message library/templates marketplace
- Batch message generation for multiple rules
- Message validation (ensure required tokens are present)

---

## Troubleshooting

### Messages not auto-updating
- Check if `isMessageCustomized` is `true` (user edited)
- Click "Reset to default" to re-enable auto-generation

### Tokens not resolving
- Verify token name matches exactly (case-sensitive)
- Check that required params are present in context
- Ensure rule type supports that token

### Curly braces in patterns disappearing
- This is expected behavior (security feature)
- Use descriptive text instead of showing regex pattern
- Example: "must match required format" instead of "must match {pattern}"

---

## API Reference

### Types

```typescript
export type RuleType = 
  | 'Required' 
  | 'FixedValue' 
  | 'AllowedValues' 
  | 'Regex' 
  | 'ArrayLength' 
  | 'CodeSystem' 
  | 'CustomFHIRPath'
  | string;

export interface Token {
  name: string;
  description: string;
  example: string;
}

export interface RuleContext {
  resourceType: string;
  path: string;
  ruleType: string;
  severity: string;
  params?: Record<string, any>;
  actual?: any;      // Runtime context
  result?: any;      // Runtime context
}

export interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
  isMessageCustomized?: boolean;
}
```

### Constants

```typescript
export const GLOBAL_TOKENS: Token[];
export const RULE_TYPE_TOKENS: Record<string, Token[]>;
export const DEFAULT_MESSAGE_TEMPLATES: Record<string, (context: RuleContext) => string>;
```

### Functions

```typescript
export function generateDefaultMessage(context: RuleContext): string;
export function resolveMessageTokens(template: string, context: RuleContext): string;
export function getAvailableTokens(ruleType: string): Token[];
export function formatTokenDisplay(tokenName: string): string;
export function shouldAutoGenerateMessage(currentMessage: string, context: RuleContext): boolean;
```

---

## Acceptance Criteria ✅

- [x] Each rule type generates a sensible default message
- [x] Users can freely customize messages
- [x] Tokens are discoverable and understandable
- [x] Preview prevents surprises
- [x] No breaking changes to validation or rule execution
- [x] Deterministic behavior (no AI)
- [x] Safe token resolution (no code execution)
- [x] Auto-generation respects user customization
- [x] Reset to default functionality
- [x] Comprehensive test coverage

---

## Contact

For questions or issues related to the Rule Message Template System, please refer to the project documentation or contact the development team.
