// Test script for slicing constraint extraction
const { extractConstraints } = require('./src/utils/sdConstraintExtractor.ts');

// Sample SD with slicing (similar to Observation with component slices)
const testSD = {
  resourceType: 'StructureDefinition',
  name: 'TestObservationBP',
  differential: {
    element: [
      // Base element with slicing definition
      {
        path: 'Observation.component',
        slicing: {
          discriminator: [
            {
              type: 'pattern',
              path: 'code'
            }
          ],
          rules: 'closed'
        }
      },
      // Systolic slice
      {
        path: 'Observation.component',
        sliceName: 'systolic',
        min: 1,
        max: '1',
        patternCodeableConcept: {
          coding: [{
            system: 'http://loinc.org',
            code: '8480-6'
          }]
        }
      },
      // Diastolic slice
      {
        path: 'Observation.component',
        sliceName: 'diastolic',
        min: 1,
        max: '1',
        fixedCodeableConcept: {
          coding: [{
            system: 'http://loinc.org',
            code: '8462-4'
          }]
        }
      }
    ]
  }
};

const rules = extractConstraints(testSD);

console.log('\n=== Slicing Extraction Test ===\n');
console.log(`Total rules extracted: ${rules.length}\n`);

// Group by category
const categories = {};
rules.forEach(rule => {
  if (!categories[rule.category]) {
    categories[rule.category] = [];
  }
  categories[rule.category].push(rule);
});

Object.keys(categories).forEach(category => {
  console.log(`\n${category} (${categories[category].length}):`);
  categories[category].forEach(rule => {
    console.log(`  - ${rule.title}`);
    console.log(`    ${rule.explanation}`);
    if (rule.slicingMetadata) {
      console.log(`    Metadata: ${JSON.stringify(rule.slicingMetadata, null, 2)}`);
    }
  });
});

console.log('\n=== Test Complete ===\n');
