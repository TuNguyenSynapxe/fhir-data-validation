# Import Questions Feature

## Overview
The Import Questions feature allows bulk importing of pre-configured String (Enum) questions into Question Sets via CSV or JSON files.

## Supported File Formats

### CSV Format
```csv
system,conceptCode,questionText,allowedValues,allowMultiple,separator
http://example.org/fhir,blood-type,What is your blood type?,A+|A-|B+|B-,false,|
```

**Field Specifications:**
- `system` - FHIR terminology system URL (required)
- `conceptCode` - Concept code identifier (required)
- `questionText` - Display text for the question (required)
- `allowedValues` - Separator-delimited string of allowed values (required)
- `allowMultiple` - Boolean: `true` or `false` (required)
- `separator` - Character used to delimit allowed values (optional, defaults to comma)

**Notes:**
- Header row is required
- Each data row must contain all required fields
- The `separator` field specifies which character is used in the `allowedValues` field
- Common separators: comma (`,`), pipe (`|`), semicolon (`;`)

### JSON Format
```json
[
  {
    "system": "http://example.org/fhir/terminology",
    "conceptCode": "blood-type",
    "questionText": "What is your blood type?",
    "allowedValues": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "allowMultiple": false,
    "separator": ","
  }
]
```

**Field Specifications:**
- `system` - FHIR terminology system URL (required)
- `conceptCode` - Concept code identifier (required)
- `questionText` - Display text for the question (required)
- `allowedValues` - Array of strings (required)
- `allowMultiple` - Boolean value (required)
- `separator` - String character (optional, defaults to comma)

**Notes:**
- Root element must be an array
- Each object must contain all required fields
- `allowedValues` must be an array of strings

## Import Process

### Step 1: Upload File
1. Click the "Import" button in the Question Set editor
2. Drag and drop a file or click to browse
3. Only `.csv` and `.json` files are accepted

### Step 2: Validation
The system validates each question:
- All required fields are present
- Field values are properly formatted
- `allowedValues` contains at least one value (parsed from CSV or array from JSON)

### Step 3: Preview
- View all parsed questions in a table
- See validation status for each question (Valid ✓ or Invalid ✗)
- Review error details for invalid questions
- Import is blocked if any question is invalid

### Step 4: Import
- Click "Import N Questions" button
- All questions are created as String (Enum) type
- Questions are added to the selected Question Set
- Configure drawer does NOT auto-open (questions are fully configured on import)

## Error Handling

### File-Level Errors
- **Wrong file type**: Only .csv and .json files are supported
- **Empty file**: CSV must have header + data rows, JSON must have array with items
- **Missing header**: CSV must have all required field names in header
- **Invalid JSON**: JSON must be valid and parsable

### Row-Level Errors
Each question is validated individually and errors are displayed inline:
- Missing system
- Missing conceptCode
- Missing questionText
- Missing allowedValues
- Missing allowMultiple
- Invalid allowedValues format (for JSON, must be an array)

**Partial Import Prevention**: If any question has validation errors, the entire import is blocked until the file is corrected.

## Sample Files
Sample files are provided in `/examples/`:
- `import-questions-sample.csv` - CSV format example
- `import-questions-sample.json` - JSON format example

## Technical Details

### Storage Format
Imported questions are stored with:
- `answerType`: "String"
- `code.system`: From import file
- `code.code`: From `conceptCode` field
- `code.display`: From `questionText` field
- `text`: From `questionText` field
- `constraints.regex`: JSON string containing configuration:
  ```json
  {
    "allowedValues": ["value1", "value2"],
    "allowMultiple": false,
    "separator": ","
  }
  ```

### Question Set Integration
- Questions are created as Question entities first
- Question references are then added to the Question Set
- References are marked as `required: false` by default
- The Question Set is updated atomically (all or nothing)

## Limitations
- **Answer Type**: Only String (Enum) questions are supported
- **No Partial Import**: All questions must be valid before importing
- **No Auto-Configure**: Questions are fully configured on import, Configure drawer does not open automatically
- **No Terminology Modification**: Import does not create or modify CodeSystem or terminology data

## Future Enhancements
- Support for other answer types (Integer, Date, etc.)
- Bulk update of existing questions
- Template generation from existing Question Sets
- Validation rule import
