# FHIR R5 Schema Endpoint

## Overview

The schema endpoint provides a flattened, hierarchical representation of FHIR R5 resource structures. This enables frontend applications to dynamically build forms, display schema trees, and validate data against the official FHIR R5 specification.

## Endpoint

### Get Resource Schema

```
GET /api/fhir/schema/{resourceType}?version=R5
```

**Parameters:**
- `resourceType` (path, required): FHIR resource type name (e.g., "Patient", "Observation")
- `version` (query, optional): FHIR version (default: "R5", only R5 currently supported)

**Response:** `FhirSchemaNode` (JSON)

**Status Codes:**
- `200 OK`: Schema retrieved successfully
- `400 Bad Request`: Invalid resource type or unsupported version
- `404 Not Found`: Resource type not found in R5 specification
- `500 Internal Server Error`: Server error occurred

### Get Available Resource Types

```
GET /api/fhir/schema
```

**Response:** List of available FHIR R5 resource types

**Status Codes:**
- `200 OK`: List retrieved successfully

## Response Schema

### FhirSchemaNode

```json
{
  "path": "Patient.name.family",
  "elementName": "family",
  "type": "string",
  "choiceTypes": [],
  "isArray": false,
  "isChoice": false,
  "min": 0,
  "max": "1",
  "description": "Family name (often called 'Surname')",
  "short": "Family name",
  "isBackbone": false,
  "isRequired": false,
  "children": []
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Full FHIRPath (e.g., "Patient.name.family") |
| `elementName` | string | Element name without parent prefix (e.g., "family") |
| `type` | string | FHIR data type (e.g., "string", "HumanName", "code") |
| `choiceTypes` | string[] | List of possible types for choice elements (e.g., ["string", "Coding"]) |
| `isArray` | boolean | True if element can have multiple values (max = "*") |
| `isChoice` | boolean | True if element is a choice type (e.g., value[x]) |
| `min` | integer | Minimum cardinality (0 or 1 typically) |
| `max` | string | Maximum cardinality ("1", "*", or specific number) |
| `description` | string | Element description from StructureDefinition |
| `short` | string | Short description for display |
| `isBackbone` | boolean | True if element is a backbone element (inline complex type) |
| `isRequired` | boolean | True if element is required (min >= 1) |
| `children` | FhirSchemaNode[] | Child elements (recursive) |

## Example Requests

### 1. Get Patient Schema

```bash
curl -X GET "http://localhost:5000/api/fhir/schema/Patient?version=R5"
```

**Response:**
```json
{
  "path": "Patient",
  "elementName": "Patient",
  "type": "Patient",
  "choiceTypes": [],
  "isArray": false,
  "isChoice": false,
  "min": 0,
  "max": "1",
  "description": "Information about an individual or animal receiving health care services",
  "short": "Information about an individual or animal receiving health care services",
  "isBackbone": false,
  "isRequired": false,
  "children": [
    {
      "path": "Patient.identifier",
      "elementName": "identifier",
      "type": "Identifier",
      "choiceTypes": [],
      "isArray": true,
      "isChoice": false,
      "min": 0,
      "max": "*",
      "description": "An identifier for this patient",
      "short": "An identifier for this patient",
      "isBackbone": false,
      "isRequired": false,
      "children": [...]
    },
    {
      "path": "Patient.name",
      "elementName": "name",
      "type": "HumanName",
      "choiceTypes": [],
      "isArray": true,
      "isChoice": false,
      "min": 0,
      "max": "*",
      "description": "A name associated with the patient",
      "short": "A name associated with the patient",
      "isBackbone": false,
      "isRequired": false,
      "children": [
        {
          "path": "Patient.name.family",
          "elementName": "family",
          "type": "string",
          "choiceTypes": [],
          "isArray": false,
          "isChoice": false,
          "min": 0,
          "max": "1",
          "description": "Family name (often called 'Surname')",
          "short": "Family name",
          "isBackbone": false,
          "isRequired": false,
          "children": []
        },
        {
          "path": "Patient.name.given",
          "elementName": "given",
          "type": "string",
          "choiceTypes": [],
          "isArray": true,
          "isChoice": false,
          "min": 0,
          "max": "*",
          "description": "Given names (not always 'first'). Includes middle names",
          "short": "Given names",
          "isBackbone": false,
          "isRequired": false,
          "children": []
        }
      ]
    }
  ]
}
```

### 2. Get Observation Schema

```bash
curl -X GET "http://localhost:5000/api/fhir/schema/Observation?version=R5"
```

### 3. Get Available Resource Types

```bash
curl -X GET "http://localhost:5000/api/fhir/schema"
```

**Response:**
```json
{
  "version": "R5",
  "count": 23,
  "resourceTypes": [
    "AllergyIntolerance",
    "Bundle",
    "CarePlan",
    "Claim",
    "Condition",
    "Coverage",
    "Device",
    "DiagnosticReport",
    "DocumentReference",
    "Encounter",
    "Goal",
    "Immunization",
    "Location",
    "Medication",
    "MedicationRequest",
    "Observation",
    "Organization",
    "Patient",
    "Practitioner",
    "PractitionerRole",
    "Procedure",
    "ServiceRequest",
    "Specimen"
  ]
}
```

## Implementation Details

### Architecture

1. **FhirSchemaNode (DTO)**: Represents a node in the schema tree
2. **IFhirSchemaService (Interface)**: Service contract for schema retrieval
3. **FhirSchemaService (Implementation)**: Loads StructureDefinitions and builds trees
4. **SchemaController (API)**: REST endpoint for accessing schemas

### How It Works

1. **Load StructureDefinition**: Uses `IFhirModelResolverService` to load R5 StructureDefinition by canonical URL
2. **Walk Snapshot**: Iterates through all elements in the snapshot (not differential)
3. **Build Tree**: Constructs hierarchical tree based on element paths
4. **Handle Special Cases**:
   - **Choice Types**: Elements with `[x]` suffix or multiple types
   - **Backbone Elements**: Inline complex types defined within resource
   - **Arrays**: Elements with `max = "*"`
   - **Required Fields**: Elements with `min >= 1`

### Choice Types

Choice type elements (e.g., `value[x]`) can have multiple possible types:

```json
{
  "path": "Observation.value[x]",
  "elementName": "value[x]",
  "type": "value[x]",
  "choiceTypes": ["Quantity", "CodeableConcept", "string", "boolean", "integer"],
  "isChoice": true
}
```

### Backbone Elements

Backbone elements are complex types defined inline:

```json
{
  "path": "Patient.contact",
  "elementName": "contact",
  "type": "BackboneElement",
  "isBackbone": true,
  "children": [
    {
      "path": "Patient.contact.relationship",
      "elementName": "relationship",
      "type": "CodeableConcept"
    }
  ]
}
```

## Use Cases

### 1. Frontend Form Builder

Use the schema to dynamically generate forms:
- Display all available fields
- Show required vs optional fields
- Handle arrays and nested objects
- Provide type-specific input controls

### 2. Tree View Navigation

Build an interactive tree view of FHIR resources:
- Show parent-child relationships
- Display cardinality constraints
- Indicate required fields
- Navigate to specific elements

### 3. Validation Rule Builder

Use schema to build validation rules:
- Select paths from schema tree
- Understand data types for validation logic
- Check cardinality constraints
- Validate against FHIR R5 specification

### 4. Documentation

Generate documentation from schema:
- List all fields and their descriptions
- Show cardinality and requirements
- Explain choice types
- Display type hierarchies

## Error Handling

### Invalid Resource Type

```bash
GET /api/fhir/schema/InvalidType?version=R5
```

**Response (404):**
```json
{
  "error": "Resource type not found",
  "message": "FHIR R5 StructureDefinition not found for resource type: InvalidType",
  "resourceType": "InvalidType"
}
```

### Unsupported Version

```bash
GET /api/fhir/schema/Patient?version=R4
```

**Response (400):**
```json
{
  "error": "Unsupported FHIR version",
  "message": "Only R5 is currently supported",
  "requestedVersion": "R4"
}
```

## Performance Considerations

1. **Singleton Model Resolver**: FHIR R5 specification loaded once at startup
2. **Cached StructureDefinitions**: Firely SDK caches loaded definitions
3. **Scoped Service**: FhirSchemaService is scoped to avoid memory leaks
4. **Lazy Loading**: Schemas loaded on-demand, not pre-built

## Testing

### Manual Testing

```bash
# Test Patient schema
curl http://localhost:5000/api/fhir/schema/Patient?version=R5 | jq

# Test Observation schema
curl http://localhost:5000/api/fhir/schema/Observation?version=R5 | jq

# Get available types
curl http://localhost:5000/api/fhir/schema | jq

# Test error cases
curl http://localhost:5000/api/fhir/schema/InvalidType?version=R5
curl http://localhost:5000/api/fhir/schema/Patient?version=R4
```

### Integration with Frontend

```typescript
// Fetch Patient schema
const response = await fetch('/api/fhir/schema/Patient?version=R5');
const schema = await response.json();

// Build tree view
function renderSchemaTree(node: FhirSchemaNode, level = 0) {
  console.log('  '.repeat(level) + node.elementName + 
              (node.isRequired ? ' *' : '') +
              (node.isArray ? ' []' : ''));
  
  node.children.forEach(child => renderSchemaTree(child, level + 1));
}

renderSchemaTree(schema);
```

## Future Enhancements

1. **Query Parameters**: Filter by element type, cardinality, etc.
2. **Flattened View**: Option to return flat list instead of tree
3. **Example Values**: Include example values from StructureDefinition
4. **Binding Information**: Include terminology bindings for coded elements
5. **R4 Support**: Add support for FHIR R4 alongside R5
6. **Caching**: Add response caching for better performance
7. **Pagination**: For very large schemas, support pagination
