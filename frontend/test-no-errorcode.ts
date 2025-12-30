/**
 * Quick validation test: Verify rules serialize without errorCode
 * 
 * This test demonstrates that all rule types can be created without
 * sending errorCode to the backend.
 */

import { buildRequiredRule } from './components/playground/Rules/rule-types/required/RequiredRuleHelpers';
import { buildPatternRule } from './components/playground/Rules/rule-types/pattern/PatternRuleHelpers';
import { buildFixedValueRule } from './components/playground/Rules/rule-types/fixed-value/FixedValueRuleHelpers';
import { buildAllowedValuesRule } from './components/playground/Rules/rule-types/allowed-values/AllowedValuesRuleHelpers';
import { buildArrayLengthRule } from './components/playground/Rules/rule-types/array-length/ArrayLengthRuleHelpers';
import { buildCustomFHIRPathRule } from './components/playground/Rules/rule-types/custom-fhirpath/CustomFHIRPathRuleHelpers';
import { buildQuestionAnswerRule } from './components/playground/Rules/rule-types/question-answer/QuestionAnswerRuleHelpers';

// Test: Required rule without errorCode
const requiredRule = buildRequiredRule({
  resourceType: 'Patient',
  instanceScope: { kind: 'all' },
  fieldPath: 'name',
  severity: 'error',
  userHint: 'Patient name is required',
});

console.log('✅ Required Rule (no errorCode):', JSON.stringify(requiredRule, null, 2));

// Test: Pattern rule without errorCode
const patternRule = buildPatternRule({
  resourceType: 'Patient',
  instanceScope: { kind: 'all' },
  fieldPath: 'identifier.value',
  pattern: '^[A-Z][0-9]{6}$',
  negate: false,
  caseSensitive: true,
  severity: 'error',
  userHint: 'ID must start with letter followed by 6 digits',
});

console.log('✅ Pattern Rule (no errorCode):', JSON.stringify(patternRule, null, 2));

// Test: FixedValue rule without errorCode
const fixedValueRule = buildFixedValueRule({
  resourceType: 'Patient',
  instanceScope: { kind: 'all' },
  fieldPath: 'active',
  expectedValue: 'true',
  severity: 'error',
  userHint: 'Patient must be active',
});

console.log('✅ FixedValue Rule (no errorCode):', JSON.stringify(fixedValueRule, null, 2));

// Test: AllowedValues rule without errorCode
const allowedValuesRule = buildAllowedValuesRule({
  resourceType: 'Patient',
  instanceScope: { kind: 'all' },
  fieldPath: 'gender',
  allowedValues: ['male', 'female', 'other', 'unknown'],
  severity: 'error',
  userHint: 'Gender must be valid',
});

console.log('✅ AllowedValues Rule (no errorCode):', JSON.stringify(allowedValuesRule, null, 2));

// Test: ArrayLength rule without errorCode
const arrayLengthRule = buildArrayLengthRule({
  resourceType: 'Patient',
  instanceScope: { kind: 'all' },
  arrayPath: 'identifier',
  min: 1,
  max: 5,
  severity: 'error',
  userHint: 'Patient must have 1-5 identifiers',
});

console.log('✅ ArrayLength Rule (no errorCode):', JSON.stringify(arrayLengthRule, null, 2));

// Test: CustomFHIRPath rule without errorCode
const customFHIRPathRule = buildCustomFHIRPathRule({
  resourceType: 'Patient',
  instanceScope: { kind: 'all' },
  expression: 'name.exists() and birthDate.exists()',
  severity: 'error',
  userHint: 'Name and birthdate required',
});

console.log('✅ CustomFHIRPath Rule (no errorCode):', JSON.stringify(customFHIRPathRule, null, 2));

// Test: QuestionAnswer rule without errorCode
const questionAnswerRule = buildQuestionAnswerRule({
  resourceType: 'Observation',
  instanceScope: 'all',
  iterationScope: 'component',
  questionPath: 'code.coding.code',
  questionSetId: 'screening-questions',
  severity: 'error',
  userHint: 'Answer must match question constraints',
});

console.log('✅ QuestionAnswer Rule (no errorCode):', JSON.stringify(questionAnswerRule, null, 2));

// Verify: No rule has errorCode property
const allRules = [
  requiredRule,
  patternRule,
  fixedValueRule,
  allowedValuesRule,
  arrayLengthRule,
  customFHIRPathRule,
  questionAnswerRule,
];

const hasErrorCode = allRules.some(rule => 'errorCode' in rule && rule.errorCode !== undefined);

if (hasErrorCode) {
  console.error('❌ FAIL: Some rules still contain errorCode');
  process.exit(1);
} else {
  console.log('\n✅ SUCCESS: All rules created without errorCode');
  console.log('✅ Frontend refactor complete - errorCode backend-owned');
}
