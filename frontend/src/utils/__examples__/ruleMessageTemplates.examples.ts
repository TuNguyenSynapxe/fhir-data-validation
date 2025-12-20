/**
 * Example Usage of Rule Message Template System
 * 
 * This file demonstrates how to use the message template system
 * in various scenarios.
 */

import {
  generateDefaultMessage,
  resolveMessageTokens,
  getAvailableTokens,
  type RuleContext,
} from '../ruleMessageTemplates';

// ============================================
// Example 1: Creating a new Required rule
// ============================================

console.log('\n=== Example 1: Required Rule ===');

const requiredContext: RuleContext = {
  resourceType: 'Patient',
  path: 'name.family',
  ruleType: 'Required',
  severity: 'error',
};

const requiredMessage = generateDefaultMessage(requiredContext);
console.log('Template:', requiredMessage);
// Output: "{fullPath} is required."

const resolvedRequired = resolveMessageTokens(requiredMessage, requiredContext);
console.log('Resolved:', resolvedRequired);
// Output: "Patient.name.family is required."

// ============================================
// Example 2: FixedValue with custom message
// ============================================

console.log('\n=== Example 2: FixedValue Rule ===');

const fixedValueContext: RuleContext = {
  resourceType: 'Patient',
  path: 'gender',
  ruleType: 'FixedValue',
  severity: 'error',
  params: { value: 'male' },
};

// Default message
const defaultFixed = generateDefaultMessage(fixedValueContext);
console.log('Default template:', defaultFixed);
// Output: "{fullPath} must be exactly \"{expected}\"."

console.log('Resolved:', resolveMessageTokens(defaultFixed, fixedValueContext));
// Output: "Patient.gender must be exactly "male"."

// Custom message using tokens
const customFixed = 'The {path} field in {resource} should be set to "{expected}"';
console.log('\nCustom template:', customFixed);
console.log('Resolved:', resolveMessageTokens(customFixed, fixedValueContext));
// Output: "The gender field in Patient should be set to "male""

// ============================================
// Example 3: AllowedValues with runtime context
// ============================================

console.log('\n=== Example 3: AllowedValues Rule ===');

const allowedValuesContext: RuleContext = {
  resourceType: 'Patient',
  path: 'maritalStatus.coding.code',
  ruleType: 'AllowedValues',
  severity: 'error',
  params: {
    codes: ['M', 'S', 'D', 'W'],
  },
  actual: 'X', // Runtime value that failed validation
};

const allowedMessage = generateDefaultMessage(allowedValuesContext);
console.log('Template:', allowedMessage);

const resolvedAllowed = resolveMessageTokens(allowedMessage, allowedValuesContext);
console.log('Resolved:', resolvedAllowed);
// Output: "Patient.maritalStatus.coding.code must be one of the allowed values."

// More detailed custom message
const detailedAllowed = '{fullPath} must be one of: {allowed} (found: "{actual}")';
console.log('\nDetailed template:', detailedAllowed);
console.log('Resolved:', resolveMessageTokens(detailedAllowed, allowedValuesContext));
// Output: "Patient.maritalStatus.coding.code must be one of: "M", "S", "D", "W" (found: "X")"

// ============================================
// Example 4: ArrayLength with different params
// ============================================

console.log('\n=== Example 4: ArrayLength Rule ===');

// Min and Max
const arrayBothContext: RuleContext = {
  resourceType: 'Patient',
  path: 'name',
  ruleType: 'ArrayLength',
  severity: 'error',
  params: { min: 1, max: 5 },
};

console.log('Min + Max:', generateDefaultMessage(arrayBothContext));
console.log('Resolved:', resolveMessageTokens(generateDefaultMessage(arrayBothContext), arrayBothContext));
// Output: "Patient.name must contain between 1 and 5 items."

// Min only
const arrayMinContext: RuleContext = {
  ...arrayBothContext,
  params: { min: 1 },
};

console.log('\nMin only:', generateDefaultMessage(arrayMinContext));
console.log('Resolved:', resolveMessageTokens(generateDefaultMessage(arrayMinContext), arrayMinContext));
// Output: "Patient.name must contain at least 1 item(s)."

// Max only
const arrayMaxContext: RuleContext = {
  ...arrayBothContext,
  params: { max: 10 },
};

console.log('\nMax only:', generateDefaultMessage(arrayMaxContext));
console.log('Resolved:', resolveMessageTokens(generateDefaultMessage(arrayMaxContext), arrayMaxContext));
// Output: "Patient.name must contain no more than 10 item(s)."

// ============================================
// Example 5: CodeSystem validation
// ============================================

console.log('\n=== Example 5: CodeSystem Rule ===');

const codeSystemContext: RuleContext = {
  resourceType: 'Observation',
  path: 'code.coding',
  ruleType: 'CodeSystem',
  severity: 'error',
  params: {
    system: 'http://loinc.org',
    code: '8867-4',
    display: 'Heart rate',
  },
};

const codeSystemMessage = generateDefaultMessage(codeSystemContext);
console.log('Template:', codeSystemMessage);

const resolvedCodeSystem = resolveMessageTokens(codeSystemMessage, codeSystemContext);
console.log('Resolved:', resolvedCodeSystem);
// Output: "Observation.code.coding must use a valid code from loinc.org."

// Detailed message with code info
const detailedCodeSystem = '{fullPath} requires code {code} ("{display}") from {system}';
console.log('\nDetailed template:', detailedCodeSystem);
console.log('Resolved:', resolveMessageTokens(detailedCodeSystem, codeSystemContext));
// Output: "Observation.code.coding requires code 8867-4 ("Heart rate") from loinc.org"

// ============================================
// Example 6: Discovering available tokens
// ============================================

console.log('\n=== Example 6: Available Tokens ===');

const fixedValueTokens = getAvailableTokens('FixedValue');
console.log('FixedValue tokens:');
fixedValueTokens.forEach(token => {
  console.log(`  {${token.name}}: ${token.description}`);
  console.log(`    Example: ${token.example}`);
});

// ============================================
// Example 7: User customization workflow
// ============================================

console.log('\n=== Example 7: User Customization Workflow ===');

// Step 1: Rule created with auto-generated message
const rule = {
  id: 'rule-1',
  type: 'Required',
  resourceType: 'Patient',
  path: 'birthDate',
  severity: 'error',
  message: '{fullPath} is required.',
  isMessageCustomized: false,
};

console.log('Initial rule:');
console.log('  Message:', rule.message);
console.log('  Is customized:', rule.isMessageCustomized);

// Step 2: User edits the message
rule.message = 'Date of birth is mandatory for all patients';
rule.isMessageCustomized = true;

console.log('\nAfter user edit:');
console.log('  Message:', rule.message);
console.log('  Is customized:', rule.isMessageCustomized);

// Step 3: User changes rule type - message DOES NOT auto-update
rule.type = 'FixedValue';
console.log('\nAfter changing rule type (customized, no auto-update):');
console.log('  Type:', rule.type);
console.log('  Message:', rule.message); // Stays the same!

// Step 4: User clicks "Reset to default"
rule.isMessageCustomized = false;
const newContext: RuleContext = {
  resourceType: rule.resourceType,
  path: rule.path,
  ruleType: rule.type,
  severity: rule.severity,
};
rule.message = generateDefaultMessage(newContext);

console.log('\nAfter reset to default:');
console.log('  Message:', rule.message);
console.log('  Is customized:', rule.isMessageCustomized);

// Step 5: Now auto-updates work again
rule.path = 'gender';
rule.message = generateDefaultMessage({
  ...newContext,
  path: rule.path,
});

console.log('\nAfter changing path (auto-updated):');
console.log('  Path:', rule.path);
console.log('  Message:', rule.message);

// ============================================
// Example 8: Complex custom messages
// ============================================

console.log('\n=== Example 8: Complex Custom Messages ===');

// Multi-language friendly
const friendlyContext: RuleContext = {
  resourceType: 'Patient',
  path: 'telecom.value',
  ruleType: 'Regex',
  severity: 'warning',
  params: { pattern: '^\\+?[0-9]{8,15}$' },
};

const friendlyMessage = 'Please enter a valid phone number for {path}. The format should be 8-15 digits, optionally starting with +.';
console.log('Friendly message:', resolveMessageTokens(friendlyMessage, friendlyContext));

// Technical debug message
const debugContext: RuleContext = {
  resourceType: 'Observation',
  path: 'valueQuantity.value',
  ruleType: 'CustomFHIRPath',
  severity: 'error',
  params: { expression: 'value > 0' },
  result: false,
  actual: -5,
};

const debugMessage = '[{severity}] {resource}.{path} failed validation: {expression} returned {result} (actual value: {actual})';
console.log('\nDebug message:', resolveMessageTokens(debugMessage, debugContext));
// Output: "[error] Observation.valueQuantity.value failed validation: value > 0 returned false (actual value: -5)"

// ============================================
// Example 9: Handling edge cases
// ============================================

console.log('\n=== Example 9: Edge Cases ===');

// Empty path (root validation)
const rootContext: RuleContext = {
  resourceType: 'Bundle',
  path: '',
  ruleType: 'Required',
  severity: 'error',
};

console.log('Root validation:');
console.log('  Template:', '{fullPath} is required');
console.log('  Resolved:', resolveMessageTokens('{fullPath} is required', rootContext));
// Output: "Bundle is required"

// Unknown tokens (removed safely)
const unknownTokens = '{fullPath} has {unknownToken} and {anotherUnknown}';
console.log('\nUnknown tokens:');
console.log('  Template:', unknownTokens);
console.log('  Resolved:', resolveMessageTokens(unknownTokens, rootContext));
// Output: "Bundle has  and " (tokens removed)

// Missing params (tokens removed)
const missingParamsContext: RuleContext = {
  resourceType: 'Patient',
  path: 'name',
  ruleType: 'FixedValue',
  severity: 'error',
  // params missing!
};

console.log('\nMissing params:');
console.log('  Template:', '{fullPath} must be "{expected}"');
console.log('  Resolved:', resolveMessageTokens('{fullPath} must be "{expected}"', missingParamsContext));
// Output: "Patient.name must be """ (expected token removed)

console.log('\n=== End of Examples ===\n');

export {};
