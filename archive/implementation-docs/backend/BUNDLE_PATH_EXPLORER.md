# FHIR Bundle Path Explorer Endpoint

## Overview

The bundle path explorer endpoint recursively walks through a FHIR bundle JSON and extracts all element paths, including array indices. This is useful for debugging, form building, path selection, and understanding bundle structure.

## Endpoint

### Extract Bundle Paths

```
POST /api/fhir/bundle/paths
```

**Request Body:**
```json
{
  "bundleJson": "<JSON-encoded FHIR bundle>"
}
```

**Response:** `BundlePathResult` (JSON)

**Status Codes:**
- `200 OK`: Paths extracted successfully
- `400 Bad Request`: Invalid JSON or missing bundle
- `500 Internal Server Error`: Server error occurred

## Request Format

### BundlePathRequest

```json
{
  "bundleJson": "{\"resourceType\":\"Bundle\",\"type\":\"collection\",\"entry\":[...]}"
}
```

**Fields:**
- `bundleJson` (string, required): JSON-encoded FHIR bundle or single resource

## Response Schema

### BundlePathResult

```json
{
  "paths": [
    "Patient.id",
    "Patient.name[0].family",
    "Patient.name[0].given[0]",
    "Observation.component[0].code.coding[0].system",
    "Observation.component[1].valueString"
  ],
  "totalPaths": 5,
  "pathsByResourceType": {
    "Patient": [
      "Patient.id",
      "Patient.name[0].family",
      "Patient.name[0].given[0]"
    ],
    "Observation": [
      "Observation.component[0].code.coding[0].system",
      "Observation.component[1].valueString"
    ]
  },
  "resourceTypes": ["Observation", "Patient"],
  "totalResources": 2
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `paths` | string[] | All unique paths found (sorted alphabetically) |
| `totalPaths` | integer | Total number of unique paths |
| `pathsByResourceType` | object | Paths grouped by resource type |
| `resourceTypes` | string[] | List of resource types found (sorted) |
| `totalResources` | integer | Total number of resources processed |

## Example Requests

### 1. Extract Paths from Bundle

```bash
curl -X POST http://localhost:5000/api/fhir/bundle/paths \
  -H "Content-Type: application/json" \
  -d '{
    "bundleJson": "{\"resourceType\":\"Bundle\",\"type\":\"collection\",\"entry\":[{\"resource\":{\"resourceType\":\"Patient\",\"id\":\"123\",\"name\":[{\"family\":\"Doe\",\"given\":[\"John\",\"Michael\"]}],\"birthDate\":\"1980-01-01\"}}]}"
  }'
```

**Response:**
```json
{
  "paths": [
    "Patient.birthDate",
    "Patient.id",
    "Patient.name",
    "Patient.name[0]",
    "Patient.name[0].family",
    "Patient.name[0].given",
    "Patient.name[0].given[0]",
    "Patient.name[0].given[1]",
    "Patient.resourceType"
  ],
  "totalPaths": 9,
  "pathsByResourceType": {
    "Patient": [
      "Patient.birthDate",
      "Patient.id",
      "Patient.name",
      "Patient.name[0]",
      "Patient.name[0].family",
      "Patient.name[0].given",
      "Patient.name[0].given[0]",
      "Patient.name[0].given[1]",
      "Patient.resourceType"
    ]
  },
  "resourceTypes": ["Patient"],
  "totalResources": 1
}
```

### 2. Extract Paths from Complex Bundle

```bash
curl -X POST http://localhost:5000/api/fhir/bundle/paths \
  -H "Content-Type: application/json" \
  -d '{
    "bundleJson": "{\"resourceType\":\"Bundle\",\"type\":\"collection\",\"entry\":[{\"resource\":{\"resourceType\":\"Patient\",\"id\":\"pat1\",\"name\":[{\"family\":\"Smith\"}]}},{\"resource\":{\"resourceType\":\"Observation\",\"id\":\"obs1\",\"status\":\"final\",\"code\":{\"coding\":[{\"system\":\"http://loinc.org\",\"code\":\"8867-4\"}]},\"component\":[{\"code\":{\"text\":\"Systolic\"},\"valueQuantity\":{\"value\":120}},{\"code\":{\"text\":\"Diastolic\"},\"valueQuantity\":{\"value\":80}}]}}]}"
  }'
```

**Response:**
```json
{
  "paths": [
    "Observation.code",
    "Observation.code.coding",
    "Observation.code.coding[0]",
    "Observation.code.coding[0].code",
    "Observation.code.coding[0].system",
    "Observation.component",
    "Observation.component[0]",
    "Observation.component[0].code",
    "Observation.component[0].code.text",
    "Observation.component[0].valueQuantity",
    "Observation.component[0].valueQuantity.value",
    "Observation.component[1]",
    "Observation.component[1].code",
    "Observation.component[1].code.text",
    "Observation.component[1].valueQuantity",
    "Observation.component[1].valueQuantity.value",
    "Observation.id",
    "Observation.resourceType",
    "Observation.status",
    "Patient.id",
    "Patient.name",
    "Patient.name[0]",
    "Patient.name[0].family",
    "Patient.resourceType"
  ],
  "totalPaths": 24,
  "pathsByResourceType": {
    "Patient": [
      "Patient.id",
      "Patient.name",
      "Patient.name[0]",
      "Patient.name[0].family",
      "Patient.resourceType"
    ],
    "Observation": [
      "Observation.code",
      "Observation.code.coding",
      "Observation.code.coding[0]",
      "Observation.code.coding[0].code",
      "Observation.code.coding[0].system",
      "Observation.component",
      "Observation.component[0]",
      "Observation.component[0].code",
      "Observation.component[0].code.text",
      "Observation.component[0].valueQuantity",
      "Observation.component[0].valueQuantity.value",
      "Observation.component[1]",
      "Observation.component[1].code",
      "Observation.component[1].code.text",
      "Observation.component[1].valueQuantity",
      "Observation.component[1].valueQuantity.value",
      "Observation.id",
      "Observation.resourceType",
      "Observation.status"
    ]
  },
  "resourceTypes": ["Observation", "Patient"],
  "totalResources": 2
}
```

### 3. Extract Paths from Single Resource (Not Bundle)

```bash
curl -X POST http://localhost:5000/api/fhir/bundle/paths \
  -H "Content-Type: application/json" \
  -d '{
    "bundleJson": "{\"resourceType\":\"Patient\",\"id\":\"123\",\"name\":[{\"family\":\"Doe\"}]}"
  }'
```

**Response:**
```json
{
  "paths": [
    "Patient.id",
    "Patient.name",
    "Patient.name[0]",
    "Patient.name[0].family",
    "Patient.resourceType"
  ],
  "totalPaths": 5,
  "pathsByResourceType": {
    "Patient": [
      "Patient.id",
      "Patient.name",
      "Patient.name[0]",
      "Patient.name[0].family",
      "Patient.resourceType"
    ]
  },
  "resourceTypes": ["Patient"],
  "totalResources": 1
}
```

## Implementation Details

### Architecture

1. **BundlePathResult (DTO)**: Response model containing paths and metadata
2. **IBundlePathExplorer (Interface)**: Service contract for path extraction
3. **BundlePathExplorer (Implementation)**: Recursive JSON walker
4. **BundleExplorerController (API)**: REST endpoint

### Path Extraction Logic

#### 1. Bundle Processing
- Detects if input is Bundle or single resource
- For Bundles: processes each `entry.resource`
- For single resources: processes directly

#### 2. Resource Type Detection
- Reads `resourceType` property
- Uses as path prefix (e.g., "Patient", "Observation")
- Groups paths by resource type

#### 3. Recursive Walking
- **Objects**: Enumerate properties, recurse into values
- **Arrays**: Track indices (e.g., `[0]`, `[1]`), recurse into items
- **Primitives**: Terminal nodes (path already tracked)

#### 4. Path Building
- Start with resource type
- Append property names with `.`
- Append array indices with `[n]`
- Example: `Patient.name[0].given[1]`

#### 5. Filtering
- **Skipped properties**: `meta`, `text`, `contained`
- Reason: These are metadata/narrative, not core data

### Path Format

| Element Type | Path Format | Example |
|--------------|-------------|---------|
| Simple property | `Resource.property` | `Patient.id` |
| Nested property | `Resource.parent.child` | `Patient.name.family` |
| Array element | `Resource.property[index]` | `Patient.name[0]` |
| Array nested | `Resource.property[i].child[j]` | `Patient.name[0].given[1]` |
| Choice type | `Resource.value[x]` | `Observation.valueString` |

### Skipped Properties

The following properties are intentionally skipped:

1. **`meta`**: Metadata about the resource (version, last updated, etc.)
2. **`text`**: Human-readable narrative
3. **`contained`**: Contained resources (to avoid confusion with main bundle entries)

## Use Cases

### 1. Path Selection UI

Build a dropdown or tree view for selecting element paths:

```typescript
// Fetch paths from bundle
const response = await fetch('/api/fhir/bundle/paths', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bundleJson: myBundleJson })
});

const result = await response.json();

// Populate dropdown
const pathSelect = document.getElementById('pathSelect');
result.paths.forEach(path => {
  const option = document.createElement('option');
  option.value = path;
  option.textContent = path;
  pathSelect.appendChild(option);
});
```

### 2. Validation Rule Builder

Use extracted paths to build FHIRPath validation rules:

```typescript
// Get paths grouped by resource type
const patientPaths = result.pathsByResourceType['Patient'];

// Build rule
const rule = {
  resourceType: 'Patient',
  path: patientPaths[2], // e.g., "Patient.name[0].family"
  type: 'Required',
  severity: 'error',
  message: 'Family name is required'
};
```

### 3. Data Inspector

Display all paths and their values for debugging:

```typescript
// Show structure
console.log(`Bundle contains ${result.totalResources} resources:`);
result.resourceTypes.forEach(type => {
  const paths = result.pathsByResourceType[type];
  console.log(`  ${type}: ${paths.length} paths`);
  paths.forEach(path => console.log(`    - ${path}`));
});
```

### 4. Form Field Generator

Generate form fields dynamically based on paths:

```typescript
// Filter for specific paths
const nameFields = result.paths.filter(p => p.includes('.name'));

// Generate inputs
nameFields.forEach(path => {
  const input = document.createElement('input');
  input.name = path;
  input.placeholder = path;
  form.appendChild(input);
});
```

## Error Handling

### Invalid JSON

```bash
POST /api/fhir/bundle/paths
{
  "bundleJson": "{ invalid json"
}
```

**Response (400):**
```json
{
  "error": "Invalid JSON",
  "message": "Invalid JSON format",
  "details": "..." 
}
```

### Empty Bundle

```bash
POST /api/fhir/bundle/paths
{
  "bundleJson": ""
}
```

**Response (400):**
```json
{
  "error": "Invalid request",
  "message": "Bundle JSON is required"
}
```

## Performance Considerations

1. **Memory Efficient**: Uses `JsonDocument` for streaming JSON parsing
2. **HashSet Deduplication**: Ensures unique paths only
3. **Single Pass**: Walks JSON structure once
4. **Sorted Output**: Paths sorted alphabetically for consistent results

## Integration Examples

### Frontend Integration

```typescript
interface BundlePathResult {
  paths: string[];
  totalPaths: number;
  pathsByResourceType: Record<string, string[]>;
  resourceTypes: string[];
  totalResources: number;
}

async function extractBundlePaths(bundleJson: string): Promise<BundlePathResult> {
  const response = await fetch('/api/fhir/bundle/paths', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bundleJson })
  });
  
  if (!response.ok) {
    throw new Error('Failed to extract paths');
  }
  
  return await response.json();
}

// Usage
const result = await extractBundlePaths(myBundle);
console.log(`Found ${result.totalPaths} paths in ${result.totalResources} resources`);
```

### Testing with cURL

```bash
# Save bundle to file
cat > bundle.json << 'EOF'
{
  "resourceType": "Bundle",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "name": [{"family": "Smith", "given": ["John"]}]
      }
    }
  ]
}
EOF

# Extract paths
curl -X POST http://localhost:5000/api/fhir/bundle/paths \
  -H "Content-Type: application/json" \
  -d "{\"bundleJson\": $(jq -c . bundle.json | jq -R .)}"
```

## Limitations

1. **No Value Extraction**: Returns paths only, not values
2. **No Type Information**: Doesn't include data types
3. **Skips Metadata**: `meta`, `text`, `contained` are excluded
4. **String-Based**: Paths are strings, not structured objects

## Future Enhancements

1. **Include Values**: Option to return path-value pairs
2. **Type Information**: Include data type for each path
3. **Filter Options**: Filter by resource type, path pattern
4. **Path Validation**: Validate paths against FHIR schema
5. **JSON Pointer**: Option to return JSON Pointer format
6. **Compressed Format**: Option for compact representation
