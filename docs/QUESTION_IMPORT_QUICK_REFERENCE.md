# CSV/JSON Question Import - Quick Reference

## Overview
Section B of the Question Authoring screen now supports CSV and JSON import for bulk question creation. Only **String (Enum)** answer types are supported.

## Import Tab Location
Navigate to: **Projects → Question Sets → Create New → Section B → Import Tab**

## Lock Behavior
Imported questions have the following fields **LOCKED**:
- ✅ `system` (locked)
- ✅ `code` (locked)  
- ✅ `answerType` (locked - always String Enum)
- ❌ `display` (editable)
- ❌ `description` (editable)
- ❌ `enumConfig.allowedValues` (editable in Section C)
- ❌ `enumConfig.allowMultiple` (editable in Section C)
- ❌ `enumConfig.multipleValueSeparator` (editable in Section C)

## CSV Format

### Required Headers
```
system,code,display,description,allowed_values,allow_multiple,separator
```

### Field Specifications
- **system**: URL string (required)
- **code**: Unique code string (required)
- **display**: Question text (required)
- **description**: Optional description
- **allowed_values**: Delimited string using `,`, `|`, or `;` (required)
- **allow_multiple**: `true` or `false` (optional, defaults to `false`)
- **separator**: `,`, `|`, or `;` (required only if `allow_multiple=true`)

### Validation Rules
1. **Auto-detection**: Delimiter automatically detected (comma, pipe, semicolon)
2. **Duplicates**: Case-insensitive duplicate checking for system+code
3. **Empty values**: Trimmed and filtered from `allowed_values`
4. **Required fields**: Validates presence of system, code, display, allowed_values

### Example
```csv
system,code,display,description,allowed_values,allow_multiple,separator
http://example.org/questions,Q001,What is your age?,Patient age in years,0-18|19-30|31-50|51-65|65+,false,
http://example.org/questions,Q002,Select your symptoms,Common symptoms reported,"Fever,Cough,Headache,Fatigue,Nausea",true,","
http://example.org/questions,Q003,Blood type,Patient blood type,A+;A-;B+;B-;O+;O-;AB+;AB-,false,
```

## JSON Format

### Schema
```json
{
  "format": "pss-question-import",
  "version": "1.0",
  "questions": [
    {
      "system": "http://example.org/questions",
      "code": "Q001",
      "display": "What is your age?",
      "description": "Patient age in years (optional)",
      "answer": {
        "type": "string-enum",
        "values": ["0-18", "19-30", "31-50", "51-65", "65+"],
        "allowMultiple": false,
        "separator": ","
      }
    }
  ]
}
```

### Field Specifications
- **format**: Must be `"pss-question-import"` (required)
- **version**: Must be `"1.0"` (required)
- **questions**: Array of question objects (required)
  - **system**: URL string (required)
  - **code**: Unique code string (required)
  - **display**: Question text (required)
  - **description**: Optional description
  - **answer**: Object (required)
    - **type**: Must be `"string-enum"` (required)
    - **values**: Non-empty array of unique strings (required)
    - **allowMultiple**: Boolean (optional, defaults to `false`)
    - **separator**: `,`, `|`, or `;` (required only if `allowMultiple=true`)

### Validation Rules
1. **Schema validation**: Enforces format and version
2. **Answer type**: Only `string-enum` supported
3. **Values array**: Must be non-empty and contain unique values
4. **Separator**: Required when `allowMultiple=true`
5. **Duplicates**: Case-insensitive duplicate checking for system+code

## UI Components

### Import Tab Features
1. **Drag & Drop**: Upload CSV/JSON files
2. **File Browser**: Click to select files
3. **Validation Summary**: Shows total questions, errors, warnings
4. **Preview Table**: First 5 questions displayed
5. **Error Display**: Row-level error messages with field context
6. **Import Button**: Disabled until blocking errors = 0

### Validation Summary Cards
- **Total Questions**: Count of successfully parsed questions
- **Errors (Blocking)**: Critical errors preventing import
- **Warnings**: Non-blocking issues

### Preview Table Columns
- **System**: CodeSystem URL
- **Code**: Question code
- **Display**: Question text
- **Enum Values**: Count of allowed values

## Error Handling

### Error Structure
```typescript
interface ImportValidationError {
  rowIndex?: number;      // 1-based row number (CSV) or array index (JSON)
  field?: string;         // Field name with error
  message: string;        // Human-readable error message
  severity: 'error' | 'warning';
}
```

### Common Errors
- ❌ **Missing required fields**: system, code, display, allowed_values
- ❌ **Duplicate system+code**: Case-insensitive check
- ❌ **Invalid format**: Wrong file type or schema
- ❌ **Empty values array**: Must have at least 1 allowed value
- ❌ **Missing separator**: Required when `allowMultiple=true`
- ⚠️ **Empty allowed_values**: Filtered out automatically
- ⚠️ **Missing description**: Optional field

## Import Flow

1. **Upload File**: Drag/drop or browse CSV/JSON
2. **Auto-Parse**: System detects format and parses
3. **Validation**: Checks required fields, duplicates, format
4. **Preview**: View first 5 questions
5. **Review Errors**: Fix blocking errors if any
6. **Import**: Click "Import X Questions"
7. **Section C**: Auto-scroll to configuration section
8. **Lock Applied**: system/code/answerType locked immediately

## Post-Import Editing

### Locked Fields (Section C)
These fields are **disabled** with lock icon indicators:
- System URL
- Code
- Answer Type (always String Enum)

### Editable Fields (Section C)
These fields remain **fully editable**:
- Display text (question text)
- Description
- Enum values (add/remove/reorder)
- Allow multiple selection
- Multiple value separator

### Lock UI Indicators
- 🔒 Lock icon in collapsed view
- 🔒 Lock icon next to locked fields in expanded view
- Tooltip: "Question Locked - Referenced by validation rules/mappings"
- Disabled styling: Gray background, reduced opacity

## Files Modified

### Core Logic
- `parseImport.ts`: CSV/JSON parsing and validation
- `QuestionImportTab.tsx`: Import UI component
- `QuestionAuthoringScreen.tsx`: Integration and handler

### Type Updates
- `questionAuthoring.types.ts`: Updated `StagedQuestion` interface
- Added `sourceType: 'import'` for imported questions
- Added `isLocked: boolean` flag

### Sample Files
- `examples/question-import-sample.csv`: CSV template
- `examples/question-import-sample.json`: JSON template

## Technical Notes

### Parser Functions
```typescript
// CSV parser
parseCsvQuestions(csvContent: string): ImportResult

// JSON parser  
parseJsonQuestions(jsonContent: string): ImportResult

// Return type
interface ImportResult {
  questions: ParsedQuestion[];
  errors: ImportValidationError[];
  warnings: ImportValidationError[];
}
```

### Integration Points
1. **Section B**: Import tab added alongside Terminology/Manual tabs
2. **Section C**: Lock UI already implemented, automatically respects `isLocked` flag
3. **Save Logic**: Uses `coding` field (system, code, display) for backend API

### State Management
- Imported questions added to `stagedQuestions` array
- `isLocked: true` set on all imported questions
- Auto-switch back to Terminology tab after import
- Auto-scroll to Section C for configuration

## Usage Example

### Step 1: Create Question Set (Section A)
1. Enter Question Set Name: "Patient Intake Form"
2. Add Description (optional)
3. Click "Continue to Add Questions"

### Step 2: Import Questions (Section B - Import Tab)
1. Switch to "Import" tab
2. Upload `question-import-sample.csv` or `question-import-sample.json`
3. Review validation summary (should show 4 questions, 0 errors)
4. Preview first 5 questions in table
5. Click "Import 4 Questions"

### Step 3: Configure Questions (Section C)
1. Auto-scrolled to Section C
2. Expand each question
3. Observe locked fields (system, code, answer type)
4. Edit display text if needed
5. Add/modify enum values as needed
6. Save Question Set

## Best Practices

1. **Prepare data carefully**: Ensure system+code uniqueness
2. **Use consistent delimiters**: Pick one delimiter per file
3. **Test with samples**: Use provided examples first
4. **Review preview**: Always check first 5 questions
5. **Fix errors before import**: Blocking errors prevent import
6. **Edit in Section C**: Enum values can be modified after import
7. **Lock awareness**: Understand what fields are immutable

## Troubleshooting

### Import button disabled
- Check error count > 0
- Review error messages
- Fix blocking errors in source file
- Re-upload corrected file

### Missing questions in preview
- Check if questions array empty
- Verify required fields present
- Look for parsing errors

### Duplicate system+code error
- Make each system+code combination unique
- Case-insensitive check applies
- Update codes or systems to resolve

### Separator validation error
- Required when `allowMultiple=true`
- Must be `,`, `|`, or `;`
- Add separator field in CSV or JSON

### Lock not working in Section C
- Verify `isLocked: true` in state
- Check question `sourceType === 'import'`
- Inspect lock icon visibility
