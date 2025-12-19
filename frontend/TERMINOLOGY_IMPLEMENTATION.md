# Terminology Rules Implementation Summary

## Overview

This document describes the **Terminology Constraint Rules** implementation (v3) for the Tree-Based Rule Creation system. These rules allow users to constrain coding fields based on observed values in sample data.

**Rule Types Added:**
- ✅ **CODE_SYSTEM** - Constrain `coding.system` to a specific code system URI
- ✅ **ALLOWED_CODES** - Constrain `coding.code` to a list of allowed codes

## Core Principle

> **"Terminology rules are inferred from data but enforced by intent."**

Observed values from sample FHIR bundles are presented to users, who select which constraints to enforce. The system generates validation rules based on these selections.

## Architecture

### Workflow

```
1. Backend analyzes sample FHIR bundles
2. Extracts observed terminology values (systems and codes)
3. Frontend displays observed values in tree nodes
4. User selects constraints (system or codes)
5. System creates RuleIntent (CODE_SYSTEM or ALLOWED_CODES)
6. User previews rule
7. User clicks Apply
8. Backend generates Draft rule with message
9. Rule appears in validation pipeline
```

### Design Pattern: Intent-First

**NO direct rule creation**. Users mark intent, system creates rules:

```
Terminology Section Click → Expand Panel → Select Values → Create Intent → Preview → Apply → Backend → Draft Rules
```

## Implementation Details

### 1. Type System (`types/ruleIntent.ts`)

**New RuleIntentTypes:**
```typescript
export type RuleIntentType = 
  | 'REQUIRED' 
  | 'ARRAY_LENGTH' 
  | 'CODE_SYSTEM'      // NEW
  | 'ALLOWED_CODES';   // NEW
```

**New Params Interfaces:**
```typescript
export interface CodeSystemParams {
  system: string; // URI of the code system
}

export interface AllowedCodesParams {
  system?: string;    // Optional: associated code system
  codes: string[];    // Array of allowed code values
}
```

**Updated RuleIntent:**
```typescript
export interface RuleIntent {
  type: RuleIntentType;
  path: string;
  resourceType: string;
  params?: ArrayLengthParams | CodeSystemParams | AllowedCodesParams;
}
```

**Updated DraftRule:**
```typescript
export interface DraftRule {
  id: string;
  type: 'Required' | 'ArrayLength' | 'CodeSystem' | 'AllowedCodes'; // Added terminology types
  resourceType: string;
  path: string;
  severity: 'error' | 'warning';
  message: string;
  status?: 'draft' | 'active';
  params?: ArrayLengthParams | CodeSystemParams | AllowedCodesParams;
}
```

### 2. ObservedValuesPanel Component (`components/rules/ObservedValuesPanel.tsx`)

**Purpose:** Display observed terminology values with selection UI

**Props:**
```typescript
interface Props {
  path: string;
  fieldType: 'system' | 'code';
  observedValues: ObservedValue[];
  existingSystemIntent?: RuleIntent;
  existingCodesIntent?: RuleIntent;
  onIntentChange: (intent: RuleIntent | null) => void;
}

interface ObservedValue {
  value: string;
  count: number;
}
```

**Behavior:**

**System Mode (`fieldType='system'`):**
- Displays observed code systems with observation counts
- Single-select buttons (radio-like behavior)
- Creates CODE_SYSTEM intent with selected system
- Shows blue "Pending" indicator when selected
- Removes intent when cleared

**Code Mode (`fieldType='code'`):**
- Displays observed code values with counts
- Multi-select checkboxes
- Creates ALLOWED_CODES intent with selected codes array
- Shows count of selected codes
- Shows blue "Pending" indicator when selected
- Removes intent when all codes deselected

**Example Render (System Mode):**
```
Observed in Sample Data (8 observations)
┌─────────────────────────────────────────────────┐
│ [Constrain to this system]                      │
│ https://fhir.synapxe.sg/CodeSystem/screening... │
│ (5 observations)                                │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ [Constrain to this system]                      │
│ http://loinc.org                                │
│ (3 observations)                                │
└─────────────────────────────────────────────────┘
```

**Example Render (Code Mode):**
```
Observed in Sample Data (8 observations)
☑ HS (3 observations)
☑ OS (2 observations)
☐ VS (2 observations)
☐ DS (1 observation)

Selected: 2 codes (HS, OS)
```

### 3. TreeNode Integration (`components/rules/TreeNodeWithRuleIntent.tsx`)

**New Props:**
```typescript
interface Props {
  // ... existing props
  observedValues?: ObservedValue[];           // NEW: observed terminology values
  terminologyFieldType?: 'system' | 'code';   // NEW: field type for terminology
}
```

**New State:**
```typescript
const [isTerminologySectionExpanded, setIsTerminologySectionExpanded] = useState(false);
```

**Eligibility Logic:**
```typescript
// Has terminology data
const hasTerminologyData = observedValues && observedValues.length > 0 && terminologyFieldType;

// Check for existing rules
const hasExistingCodeSystemRule = existingRules.some(
  (r) => r.path === element.path && r.type === 'CodeSystem'
);
const hasExistingAllowedCodesRule = existingRules.some(
  (r) => r.path === element.path && r.type === 'AllowedCodes'
);

// Check for pending intents
const isPendingCodeSystemIntent = hasIntent(element.path, 'CODE_SYSTEM');
const isPendingAllowedCodesIntent = hasIntent(element.path, 'ALLOWED_CODES');

// Show terminology section if:
const isEligibleForTerminology = 
  hasTerminologyData && 
  !isRootNode && 
  !isDerivedOrSystem;
  
const showTerminologySection = 
  isEligibleForTerminology && 
  !hasExistingCodeSystemRule && 
  !hasExistingAllowedCodesRule;
```

**UI Components:**

**Toggle Button:**
```tsx
<button
  onClick={toggleTerminologySection}
  className="terminology-toggle"
>
  <span className="orange-badge">🟠 Terminology</span>
  {isPendingCodeSystemIntent || isPendingAllowedCodesIntent ? (
    <span className="blue-indicator">🔵 Pending</span>
  ) : hasExistingCodeSystemRule || hasExistingAllowedCodesRule ? (
    <span className="green-checkmark">✓</span>
  ) : null}
</button>
```

**Collapsible Section:**
```tsx
{isTerminologySectionExpanded && (
  <ObservedValuesPanel
    path={element.path}
    fieldType={terminologyFieldType}
    observedValues={observedValues}
    existingSystemIntent={existingSystemIntent}
    existingCodesIntent={existingCodesIntent}
    onIntentChange={handleTerminologyIntentChange}
  />
)}
```

### 4. Preview Drawer Updates (`components/rules/RulePreviewDrawer.tsx`)

**Message Generation:**
```typescript
function generatePreviewMessage(intent: RuleIntent): string {
  // ... existing cases
  
  if (intent.type === 'CODE_SYSTEM') {
    const system = (intent.params as any)?.system || 'unknown';
    return `${intent.path} must use code system: ${system}`;
  }
  
  if (intent.type === 'ALLOWED_CODES') {
    const codes = (intent.params as any)?.codes || [];
    return `${intent.path} must be one of: ${codes.join(', ')}`;
  }
}
```

**Badge Colors:**
- Required: Blue
- Array Length: Purple
- **CODE_SYSTEM: Orange**
- **ALLOWED_CODES: Orange**

**Params Display:**

**Code System:**
```tsx
{intent.type === 'CODE_SYSTEM' && (
  <div className="params-section">
    <h4>Code System</h4>
    <p className="system-uri break-all">
      {(intent.params as any)?.system}
    </p>
  </div>
)}
```

**Allowed Codes:**
```tsx
{intent.type === 'ALLOWED_CODES' && (
  <div className="params-section">
    <h4>Allowed Codes ({(intent.params as any)?.codes?.length})</h4>
    <div className="code-badges">
      {(intent.params as any)?.codes?.map((code: string) => (
        <span key={code} className="orange-badge">{code}</span>
      ))}
    </div>
  </div>
)}
```

### 5. Validation (`utils/ruleIntentValidation.ts`)

**CODE_SYSTEM Validation:**
```typescript
if (intent.type === 'CODE_SYSTEM') {
  const { system } = (intent.params as any) || {};
  
  // System must be a non-empty string
  if (!system || typeof system !== 'string' || system.trim() === '') {
    errors.push(`${intent.path}: Code system URI must be specified`);
  }
}
```

**ALLOWED_CODES Validation:**
```typescript
if (intent.type === 'ALLOWED_CODES') {
  const { codes } = (intent.params as any) || {};
  
  // Must have at least one code
  if (!codes || !Array.isArray(codes) || codes.length === 0) {
    errors.push(`${intent.path}: At least one allowed code must be specified`);
  }
  
  // No empty codes
  if (Array.isArray(codes)) {
    const emptyCodes = codes.filter(
      (code) => !code || typeof code !== 'string' || code.trim() === ''
    );
    if (emptyCodes.length > 0) {
      errors.push(`${intent.path}: Allowed codes cannot be empty`);
    }
  }
}
```

### 6. Example Page Updates (`examples/TreeRuleCreationExample.tsx`)

**Added Mock Observation Schema:**
```typescript
const MOCK_OBSERVATION_SCHEMA: TreeNode = {
  path: 'Observation',
  name: 'Observation',
  type: ['Resource'],
  cardinality: '1..1',
  children: [
    // ... other fields
    {
      path: 'Observation.code',
      name: 'code',
      type: ['CodeableConcept'],
      cardinality: '1..1',
      children: [
        {
          path: 'Observation.code.coding',
          name: 'coding',
          type: ['Coding'],
          cardinality: '0..*',
          children: [
            {
              path: 'Observation.code.coding.system',
              name: 'system',
              type: ['uri'],
              cardinality: '0..1',
            },
            {
              path: 'Observation.code.coding.code',
              name: 'code',
              type: ['code'],
              cardinality: '0..1',
            },
          ],
        },
      ],
    },
  ],
};
```

**Mock Observed Values:**
```typescript
const OBSERVED_SYSTEMS: Record<string, ObservedValue[]> = {
  'Observation.code.coding.system': [
    { value: 'https://fhir.synapxe.sg/CodeSystem/screening-type', count: 8 },
    { value: 'http://loinc.org', count: 3 },
  ],
};

const OBSERVED_CODES: Record<string, ObservedValue[]> = {
  'Observation.code.coding.code': [
    { value: 'HS', count: 3 },
    { value: 'OS', count: 2 },
    { value: 'VS', count: 2 },
    { value: 'DS', count: 1 },
  ],
};
```

**Schema Switcher:**
```tsx
<button onClick={() => setActiveSchema('patient')}>
  Patient Schema
</button>
<button onClick={() => setActiveSchema('observation')}>
  Observation Schema (Terminology Demo)
</button>
```

**Pass Observed Values to Tree:**
```tsx
const observedSystemValues = OBSERVED_SYSTEMS[node.path];
const observedCodeValues = OBSERVED_CODES[node.path];

let terminologyFieldType: 'system' | 'code' | undefined;
let observedValues: ObservedValue[] | undefined;

if (observedSystemValues) {
  terminologyFieldType = 'system';
  observedValues = observedSystemValues;
} else if (observedCodeValues) {
  terminologyFieldType = 'code';
  observedValues = observedCodeValues;
}

<TreeNodeWithRuleIntent
  // ... other props
  observedValues={observedValues}
  terminologyFieldType={terminologyFieldType}
/>
```

**Updated Pending Display:**
```tsx
{intents.map((intent) => {
  let badgeColor = 'bg-blue-100 text-blue-700';
  let displayType = 'Required';
  
  if (intent.type === 'CODE_SYSTEM') {
    badgeColor = 'bg-orange-100 text-orange-700';
    displayType = 'Code System';
  } else if (intent.type === 'ALLOWED_CODES') {
    badgeColor = 'bg-orange-100 text-orange-700';
    displayType = 'Allowed Codes';
  }
  
  return (
    <li>
      <span className={badgeColor}>{displayType}</span>
      {intent.type === 'CODE_SYSTEM' && (
        <span>{(intent.params as any).system}</span>
      )}
      {intent.type === 'ALLOWED_CODES' && (
        <span>{(intent.params as any).codes.length} code(s)</span>
      )}
    </li>
  );
})}
```

**Mock Rule Creation:**
```typescript
if (intent.type === 'CODE_SYSTEM') {
  const system = (intent.params as any)?.system || 'unknown';
  return {
    ...baseRule,
    type: 'CodeSystem' as const,
    message: `${intent.path} must use code system: ${system}`,
    params: intent.params,
  };
} else if (intent.type === 'ALLOWED_CODES') {
  const codes = (intent.params as any)?.codes || [];
  return {
    ...baseRule,
    type: 'AllowedCodes' as const,
    message: `${intent.path} must be one of: ${codes.join(', ')}`,
    params: intent.params,
  };
}
```

## Backend Integration

### Required Backend Changes

**1. Analyze Sample Bundles**

Backend must extract observed terminology values from uploaded FHIR bundles:

```csharp
// Pseudocode
Dictionary<string, List<ObservedValue>> ExtractTerminologyValues(Bundle bundle)
{
    var result = new Dictionary<string, List<ObservedValue>>();
    
    // For each resource in bundle
    foreach (var resource in bundle.Entry)
    {
        // Find all Coding elements
        var codings = resource.FindAll("Coding");
        
        foreach (var coding in codings)
        {
            var systemPath = $"{coding.Path}.system";
            var codePath = $"{coding.Path}.code";
            
            // Track system values
            if (coding.System != null)
            {
                result[systemPath].Add(new ObservedValue 
                { 
                    Value = coding.System, 
                    Count = 1 
                });
            }
            
            // Track code values
            if (coding.Code != null)
            {
                result[codePath].Add(new ObservedValue 
                { 
                    Value = coding.Code, 
                    Count = 1 
                });
            }
        }
    }
    
    // Aggregate counts
    return AggregateObservedValues(result);
}
```

**2. API Endpoint for Observed Values**

```
GET /api/projects/{projectId}/terminology/observed
```

**Response:**
```json
{
  "Observation.code.coding.system": [
    { "value": "https://fhir.synapxe.sg/CodeSystem/screening-type", "count": 8 },
    { "value": "http://loinc.org", "count": 3 }
  ],
  "Observation.code.coding.code": [
    { "value": "HS", "count": 3 },
    { "value": "OS", "count": 2 },
    { "value": "VS", "count": 2 },
    { "value": "DS", "count": 1 }
  ]
}
```

**3. Bulk Create Rules Endpoint**

Extend `POST /api/rules/bulk` to handle CODE_SYSTEM and ALLOWED_CODES intents.

**Message Templates:**
```csharp
if (intent.Type == "CODE_SYSTEM")
{
    var system = intent.Params.System;
    rule.Message = $"{intent.Path} must use code system: {system}";
}

if (intent.Type == "ALLOWED_CODES")
{
    var codes = string.Join(", ", intent.Params.Codes);
    rule.Message = $"{intent.Path} must be one of: {codes}";
}
```

**Validation:**
```csharp
// CODE_SYSTEM
if (intent.Type == "CODE_SYSTEM")
{
    if (string.IsNullOrWhiteSpace(intent.Params?.System))
    {
        errors.Add($"{intent.Path}: Code system URI must be specified");
    }
}

// ALLOWED_CODES
if (intent.Type == "ALLOWED_CODES")
{
    if (intent.Params?.Codes == null || intent.Params.Codes.Count == 0)
    {
        errors.Add($"{intent.Path}: At least one allowed code must be specified");
    }
    
    if (intent.Params?.Codes?.Any(c => string.IsNullOrWhiteSpace(c)) == true)
    {
        errors.Add($"{intent.Path}: Allowed codes cannot be empty");
    }
}
```

## Testing Recommendations

### Unit Tests

**ObservedValuesPanel.tsx:**
- ✅ Renders observed systems in system mode
- ✅ Renders observed codes in code mode
- ✅ Creates CODE_SYSTEM intent on system selection
- ✅ Creates ALLOWED_CODES intent on code multi-select
- ✅ Shows pending indicator when selected
- ✅ Removes intent when cleared
- ✅ Displays observation counts correctly

**TreeNodeWithRuleIntent.tsx:**
- ✅ Shows Terminology section when observedValues provided
- ✅ Hides section when no observedValues
- ✅ Shows pending indicator on terminology button
- ✅ Shows existing indicator when rule exists
- ✅ Expands/collapses terminology section
- ✅ Passes correct props to ObservedValuesPanel

**RulePreviewDrawer.tsx:**
- ✅ Generates correct message for CODE_SYSTEM
- ✅ Generates correct message for ALLOWED_CODES
- ✅ Shows orange badge for terminology rules
- ✅ Displays system URI in params
- ✅ Displays code badges in params

**ruleIntentValidation.ts:**
- ✅ Validates CODE_SYSTEM requires non-empty system
- ✅ Validates ALLOWED_CODES requires at least one code
- ✅ Validates ALLOWED_CODES rejects empty strings
- ✅ Passes valid CODE_SYSTEM intent
- ✅ Passes valid ALLOWED_CODES intent

### Integration Tests

**Complete Workflow:**
1. Load Observation schema with observed values
2. Expand Observation.code.coding.system node
3. Click "Terminology" section
4. Verify observed systems displayed
5. Click "Constrain to this system" button
6. Verify pending indicator appears
7. Verify CODE_SYSTEM intent added
8. Click "Preview"
9. Verify preview shows correct message
10. Click "Apply"
11. Verify mock rule created
12. Verify rule shows in "Created Rules" section

**Multi-Code Selection:**
1. Expand Observation.code.coding.code node
2. Click "Terminology" section
3. Select 2 codes (HS, OS)
4. Verify ALLOWED_CODES intent with 2 codes
5. Preview and Apply
6. Verify rule message shows "HS, OS"

## Constraints Enforced

### CODE_SYSTEM Rules
- **System URI**: Must be a non-empty string
- **Path**: Must target a `coding.system` field
- **Uniqueness**: One CODE_SYSTEM rule per path

### ALLOWED_CODES Rules
- **Codes Array**: Must have at least one code
- **Code Values**: No empty strings
- **Path**: Must target a `coding.code` field
- **Uniqueness**: One ALLOWED_CODES rule per path

## Future Enhancements

### Potential Improvements
1. **Code System Lookup**: Fetch display names for code systems
2. **Code Display**: Show human-readable labels for codes
3. **System+Code Validation**: Ensure codes exist in specified system
4. **Bulk Selection**: "Select All" / "Deselect All" for codes
5. **Search/Filter**: Filter observed codes by text
6. **Frequency Sorting**: Sort by observation count
7. **ValueSet Integration**: Link to FHIR ValueSets
8. **Code Hierarchies**: Support parent/child code relationships

### Backend API Enhancements
1. **Incremental Analysis**: Update observed values as new bundles uploaded
2. **Caching**: Cache observed values per project
3. **Statistics**: Show percentage of occurrences
4. **Confidence Scores**: Highlight most common values
5. **Anomaly Detection**: Flag unexpected values

## Files Modified

**Type Definitions:**
- ✅ `types/ruleIntent.ts` - Added CODE_SYSTEM and ALLOWED_CODES types, params interfaces

**Components:**
- ✅ `components/rules/ObservedValuesPanel.tsx` - NEW component (200+ lines)
- ✅ `components/rules/TreeNodeWithRuleIntent.tsx` - Added terminology section
- ✅ `components/rules/RulePreviewDrawer.tsx` - Added terminology display

**Utilities:**
- ✅ `utils/ruleIntentValidation.ts` - Added terminology validation

**Examples:**
- ✅ `examples/TreeRuleCreationExample.tsx` - Added Observation schema with observed values

**Documentation:**
- ✅ `TREE_RULE_CREATION_README.md` - Added terminology section
- ✅ `TERMINOLOGY_IMPLEMENTATION.md` - NEW (this document)

## Summary

The Terminology Rules implementation extends the tree-based rule creation system with **observed data-driven constraints** for coding fields. Users see values from sample data and select which to enforce, following the same intent-first workflow as other rule types. The system generates validation rules with clear, system-generated messages.

**Key Principles:**
- ✅ Observed values inform user choices
- ✅ Intent-first design (no direct rule creation)
- ✅ Preview before Apply
- ✅ System-generated messages
- ✅ Draft rule lifecycle
- ✅ Validation before Apply

**Status:** Frontend implementation complete, ready for backend integration.
