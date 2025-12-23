# CodeSystem Import Examples

This folder contains example files for importing CodeSystems into the FHIR Processor V2 Terminology Management system.

## File Types

### 1. FHIR JSON Format (`fhir-json-example.json`)

Standard FHIR CodeSystem resource format. This is the recommended format for importing complete CodeSystems with all metadata.

**Required fields:**
- `url` - Canonical URL that uniquely identifies the CodeSystem
- `status` - Publication status: `draft`, `active`, `retired`, or `unknown`
- `concept` - Array of concepts

**Recommended fields:**
- `name` - Computer-friendly name (alphanumeric, hyphens, underscores)
- `title` - Human-friendly display name
- `version` - Business version
- `description` - Natural language description
- `publisher` - Organization or individual responsible
- `content` - Content mode: `complete`, `example`, `fragment`, or `supplement`

**Example structure:**
```json
{
  "resourceType": "CodeSystem",
  "url": "http://example.org/fhir/CodeSystem/my-codes",
  "name": "MyCodes",
  "status": "active",
  "concept": [
    {
      "code": "code1",
      "display": "Code 1",
      "definition": "Description of code 1"
    }
  ]
}
```

### 2. CSV Flat Format (`csv-flat-example.csv`)

Simple table format with one concept per row. Best for flat (non-hierarchical) code lists.

**Required columns:**
- `code` - Unique identifier for the concept
- `display` - Human-readable label

**Optional columns:**
- `definition` - Detailed explanation of the concept

**Example:**
```csv
code,display,definition
active,Active Patient,A patient who is currently receiving care
inactive,Inactive Patient,A patient who is no longer receiving care
```

**Note:** CSV imports require you to provide metadata (url, name, status) in the import dialog.

### 3. CSV Hierarchical Format (`csv-hierarchical-example.csv`)

Table format with parent-child relationships. Use this for hierarchical code systems.

**Required columns:**
- `code` - Unique identifier for the concept
- `display` - Human-readable label

**Optional columns:**
- `definition` - Detailed explanation
- `parentCode` - Code of the parent concept (leave empty for root-level concepts)

**Example:**
```csv
code,display,definition,parentCode
status,Patient Status,Top-level status category,
active,Active,Patient is active,status
active-inpatient,Active Inpatient,Currently admitted,active
```

The hierarchy is automatically reconstructed based on the `parentCode` column.

## Import Process

1. **Select File:** Click the Import button on the Terminology landing page
2. **Upload:** Drag & drop or click to browse for a `.json` or `.csv` file
3. **Preview:** Review parsed data and validation warnings
4. **Metadata:** For CSV imports, enter required metadata (url, name, status)
5. **Import:** Confirm to save the CodeSystem

## Validation Rules

### Non-Blocking (Warnings)
- Missing recommended fields (name, title, description)
- Missing display values for concepts
- Code format suggestions (spaces/special characters)
- URL already exists (will overwrite)

### Blocking (Errors)
- Missing required fields (url, status)
- Invalid status values
- Duplicate concept codes within the same CodeSystem
- Malformed CSV structure
- Invalid JSON format

## Tips

### CSV Tips
- Use commas (`,`) as field separators
- Wrap fields in double quotes (`"`) if they contain commas or newlines
- Escape quotes by doubling them (`""`)
- First row must be the header row
- Skip empty rows (they are ignored)
- Column names are case-insensitive

### JSON Tips
- Must be valid FHIR CodeSystem resource format
- The `resourceType` field is optional for our system (we extract the data)
- Concept codes must be unique within the CodeSystem
- Nested concepts (hierarchies) are supported in the `concept` array

### Best Practices
- Use descriptive, stable canonical URLs (e.g., `http://your-org.org/fhir/CodeSystem/my-codes`)
- Use alphanumeric codes with hyphens/underscores (avoid spaces)
- Always provide display values for better usability
- Add definitions to clarify meaning
- Use semantic versioning for the `version` field (e.g., `1.0.0`, `1.1.0`)
- Set status to `draft` during development, `active` when ready for use

## Troubleshooting

**Import fails with "Missing required column: code"**
- Ensure your CSV has a header row with column names
- Check that the column is named exactly `code` (case-insensitive)

**Import succeeds but concepts are missing**
- Check for empty rows in your CSV
- Verify that required columns have values

**Hierarchy not working**
- Ensure the `parentCode` column exists and is spelled correctly
- Verify that parent codes are defined before they are referenced
- Check for circular references (concept cannot be its own ancestor)

**URL conflict warning**
- The CodeSystem URL already exists in the project
- Import will overwrite the existing CodeSystem
- Change the URL if you want to create a new CodeSystem instead

## Example Use Cases

### Importing External Terminology
Use FHIR JSON format to import standard terminologies like SNOMED CT, ICD-10, or LOINC subsets. These typically come in FHIR format already.

### Importing Custom Vocabularies
Use CSV format for organization-specific code lists like:
- Patient status codes
- Department codes
- Appointment types
- Custom categorizations

### Migrating from Spreadsheets
Convert existing Excel/Google Sheets vocabularies to CSV:
1. Save as CSV
2. Ensure columns match required format
3. Import via the UI

### Testing and Development
Use the provided examples to:
- Test import functionality
- Understand required formats
- Create templates for your own imports
