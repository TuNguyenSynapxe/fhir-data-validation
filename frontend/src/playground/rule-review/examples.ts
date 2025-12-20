/**
 * Rule Review Module - Usage Examples
 * 
 * This file demonstrates how to use the Rule Review v1 module.
 * 
 * ⚠️ REMEMBER: Rule Review is ADVISORY ONLY
 * - Never block user actions based on review results
 * - Display issues as informational feedback only
 * - All issues are 'info' or 'warning' level
 */

import { reviewRules, getIssueCounts, filterIssuesBySeverity } from './index';
import type { Rule } from '../../types/rightPanelProps';

// Example 1: Basic Usage
function exampleBasicUsage() {
  const rules: Rule[] = [
    {
      id: 'rule-1',
      type: 'required',
      resourceType: 'Patient',
      path: 'Patient.identifier',
      severity: 'error',
      message: 'Patient must have an identifier',
    },
    {
      id: 'rule-2',
      type: 'required',
      resourceType: 'Patient',
      path: 'Patient.name',
      severity: 'error',
      message: 'Patient must have a name',
    },
  ];

  const bundleJson = JSON.stringify({
    resourceType: 'Bundle',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: 'patient-1',
          identifier: [{ system: 'http://example.com', value: '12345' }],
          // Note: 'name' field is missing
        },
      },
    ],
  });

  const result = reviewRules(rules, bundleJson);

  console.log('Review Result:', result);
  console.log('Issues found:', result.issues.length);
  
  // Display issues to user (advisory only)
  result.issues.forEach(issue => {
    console.log(`[${issue.severity.toUpperCase()}] ${issue.message}`);
    if (issue.details) {
      console.log(`  Details: ${issue.details}`);
    }
  });
}

// Example 2: Using Utilities
function exampleWithUtilities() {
  const rules: Rule[] = [
    {
      id: 'rule-1',
      type: 'required',
      resourceType: 'Patient',
      path: 'Patient.identifier',
      severity: 'error',
      message: 'Identifier required',
    },
    {
      id: 'rule-2',
      type: 'required',
      resourceType: 'Observation',
      path: 'Observation.value',
      severity: 'error',
      message: 'Value required',
    },
  ];

  const bundleJson = JSON.stringify({
    resourceType: 'Bundle',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          identifier: [{ value: '123' }],
        },
      },
      // Note: No Observation resource
    ],
  });

  const result = reviewRules(rules, bundleJson);

  // Get counts
  const counts = getIssueCounts(result);
  console.log(`Total issues: ${counts.total}`);
  console.log(`Warnings: ${counts.warning}, Info: ${counts.info}`);

  // Filter by severity
  const warnings = filterIssuesBySeverity(result, 'warning');
  const infos = filterIssuesBySeverity(result, 'info');

  console.log('Warning issues:', warnings);
  console.log('Info issues:', infos);
}

// Example 3: Without Bundle (Partial Analysis)
function exampleWithoutBundle() {
  const rules: Rule[] = [
    {
      id: 'rule-1',
      type: 'required',
      resourceType: 'Patient',
      path: 'Patient.identifier',
      severity: 'error',
      message: 'Identifier required',
    },
    {
      id: 'rule-2',
      type: 'required',
      resourceType: 'Patient',
      path: 'Patient.identifier',
      severity: 'error',
      message: 'Identifier required', // Duplicate!
    },
  ];

  // Review without bundle - only duplicate detection works
  const result = reviewRules(rules);

  console.log('Review without bundle:');
  console.log('Issues found:', result.issues.length);
  console.log('Metadata:', result.metadata);
  
  // Should detect the duplicate rule
  result.issues.forEach(issue => {
    if (issue.type === 'DUPLICATE_RULE') {
      console.log(`Duplicate detected: ${issue.message}`);
    }
  });
}

// Example 4: Array Handling Detection
function exampleArrayHandling() {
  const rules: Rule[] = [
    {
      id: 'rule-1',
      type: 'required',
      resourceType: 'Patient',
      path: 'Patient.identifier', // Array path without indexing
      severity: 'error',
      message: 'Identifier required',
    },
    {
      id: 'rule-2',
      type: 'required',
      resourceType: 'Patient',
      path: 'Patient.name[0]', // Array path with explicit index
      severity: 'error',
      message: 'First name required',
    },
  ];

  const result = reviewRules(rules);

  console.log('Array handling review:');
  result.issues.forEach(issue => {
    if (issue.type === 'ARRAY_HANDLING_MISSING') {
      console.log(`Array handling issue: ${issue.message}`);
    }
  });
}

// TODO: Future UI Integration Example
// function exampleUIIntegration() {
//   // This will be implemented when integrating into Rules UI
//   
//   const { result, isReviewing } = useRuleReview(rules, bundleJson, {
//     enabled: true,
//     debounceMs: 500,
//   });
//
//   return (
//     <div>
//       {result.issues.length > 0 && (
//         <div className="advisory-panel">
//           <h3>Rule Quality Suggestions (Advisory)</h3>
//           {result.issues.map(issue => (
//             <div key={issue.ruleId} className={`issue-${issue.severity}`}>
//               {issue.message}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

export {
  exampleBasicUsage,
  exampleWithUtilities,
  exampleWithoutBundle,
  exampleArrayHandling,
};
