# Phase 3A: Question Storage + API Implementation Summary

## Overview
Phase 3A implements backend Question storage with FHIR-pure architecture, strict validation, file-based JSON storage, and complete CRUD API endpoints.

## Architecture

### Separation of Concerns
- **Questions**: Semantic questions with answer types and constraints (new in Phase 3A)
- **CodeSystems**: Terminology sets representing allowed values for Code-type questions (Phase 2)
- Questions may reference CodeSystems via ValueSet bindings, but are separate domain entities

### Storage Strategy
- File-based JSON storage under `{dataRoot}/{projectId}/`
- One file per question: `question_{questionId}.json`
- Same pattern as CodeSystems: `codesystem_{codeSystemId}.json`

## Implementation Complete

### ✅ Domain Models (Engine/Models/Questions/)
1. **QuestionAnswerType.cs**
   - Enum: Code, Quantity, Integer, Decimal, String, Boolean

2. **QuestionConstraints.cs**
   - Min, Max (numeric types)
   - Precision (decimal/quantity)
   - MaxLength, Regex (string)

3. **QuestionUnit.cs**
   - UCUM units for Quantity answers
   - System: http://unitsofmeasure.org
   - Code, Display

4. **ValueSetBinding.cs**
   - Canonical URL to ValueSet
   - BindingStrength: required | extensible | preferred

5. **Question.cs**
   - Id: stable identifier
   - Code: Coding (FHIR Coding type)
   - AnswerType: QuestionAnswerType
   - Unit?: for Quantity
   - Constraints?: answer constraints
   - ValueSet?: for Code
   - Metadata: text, description, timestamps

### ✅ Validation (Engine/Validation/Questions/)
1. **QuestionValidator.cs**
   - Strict validation per answer type
   - Enforces answer-type-specific rules:
     - **Code**: requires ValueSet, no Unit, no numeric constraints
     - **Quantity**: requires Unit, no ValueSet, no string constraints
     - **Integer**: no Unit/ValueSet, no Precision, whole numbers only
     - **Decimal**: no Unit/ValueSet, no string constraints
     - **String**: no Unit/ValueSet, no numeric constraints
     - **Boolean**: no Unit/ValueSet, no constraints at all
   - Validates Min < Max, Regex patterns, UCUM codes

### ✅ Service Layer (Engine/Services/Questions/)
1. **IQuestionService.cs**
   - ListQuestionsAsync
   - GetQuestionAsync
   - CreateQuestionAsync
   - UpdateQuestionAsync
   - DeleteQuestionAsync

2. **QuestionService.cs**
   - File-based JSON storage
   - Automatic validation via QuestionValidator
   - Timestamp management (CreatedAt/UpdatedAt)
   - Error handling for not-found, validation failures

### ✅ API Layer (Playground.Api/)
1. **DTOs (Dtos/Questions/)**
   - QuestionDto
   - CreateQuestionDto
   - QuestionConstraintsDto
   - QuestionUnitDto
   - ValueSetBindingDto
   - CodingDto
   - QuestionMetadataDto

2. **QuestionsController.cs**
   - `GET /api/projects/{projectId}/questions` - List all questions
   - `GET /api/projects/{projectId}/questions/{questionId}` - Get question
   - `POST /api/projects/{projectId}/questions` - Create question
   - `PUT /api/projects/{projectId}/questions/{questionId}` - Update question
   - `DELETE /api/projects/{projectId}/questions/{questionId}` - Delete question
   - Complete error handling (400/404/500)
   - Mapping helpers between domain and DTO

### ✅ Dependency Injection
Updated `EngineServiceCollectionExtensions.AddTerminologyServices()`:
```csharp
services.AddScoped<IQuestionService>(sp =>
{
    return new QuestionService(baseDataPath);
});
```

## Validation Rules Reference

### Code Type
✅ Requires: ValueSet binding
❌ Cannot have: Unit, numeric constraints

### Quantity Type
✅ Requires: Unit (UCUM)
❌ Cannot have: ValueSet, string constraints
✅ Optional: Min, Max, Precision

### Integer Type
✅ Optional: Min, Max (whole numbers only)
❌ Cannot have: Unit, ValueSet, Precision, string constraints

### Decimal Type
✅ Optional: Min, Max, Precision
❌ Cannot have: Unit, ValueSet, string constraints

### String Type
✅ Optional: MaxLength, Regex
❌ Cannot have: Unit, ValueSet, numeric constraints

### Boolean Type
❌ Cannot have: Unit, ValueSet, any constraints

## File Structure
```
backend/src/Pss.FhirProcessor.Engine/
├── Models/Questions/
│   ├── Question.cs
│   ├── QuestionAnswerType.cs
│   ├── QuestionConstraints.cs
│   ├── QuestionUnit.cs
│   └── ValueSetBinding.cs
├── Services/Questions/
│   ├── IQuestionService.cs
│   └── QuestionService.cs
└── Validation/Questions/
    └── QuestionValidator.cs

backend/src/Pss.FhirProcessor.Playground.Api/
├── Controllers/
│   └── QuestionsController.cs
└── Dtos/Questions/
    ├── QuestionDto.cs
    ├── QuestionConstraintsDto.cs
    ├── QuestionUnitDto.cs
    ├── ValueSetBindingDto.cs
    └── CodingDto.cs
```

## Build Status
✅ Engine project: 0 errors, 0 warnings
✅ API project: 0 errors, 0 warnings
✅ All Question-related code compiles cleanly

## Example Usage

### Create a Quantity Question
```json
POST /api/projects/project1/questions
{
  "code": {
    "system": "http://loinc.org",
    "code": "29463-7",
    "display": "Body Weight"
  },
  "answerType": "Quantity",
  "unit": {
    "system": "http://unitsofmeasure.org",
    "code": "kg",
    "display": "kilograms"
  },
  "constraints": {
    "min": 0,
    "max": 500,
    "precision": 1
  },
  "text": "What is the patient's body weight?",
  "description": "Body weight in kilograms"
}
```

### Create a Code Question
```json
POST /api/projects/project1/questions
{
  "code": {
    "system": "http://example.org/questions",
    "code": "smoking-status",
    "display": "Smoking Status"
  },
  "answerType": "Code",
  "valueSet": {
    "url": "http://example.org/codesystem/smoking-status",
    "bindingStrength": "required"
  },
  "text": "What is the patient's smoking status?",
  "description": "Current smoking status"
}
```

## Next Steps (Frontend Integration - Phase 3B)
1. Create Question API service (frontend/src/api/questionApi.ts)
2. Create Question list UI component
3. Create Question form for creating/editing
4. Integrate with QuestionAnswerRuleForm (replaces CodeSystem selector)
5. Update rule authoring to use Questions instead of CodeSystems

## Notes
- Questions are fully validated on create/update
- File storage pattern matches CodeSystems for consistency
- FHIR Coding type used for Question.Code
- Timestamps auto-managed (CreatedAt/UpdatedAt)
- Service layer handles all validation before persistence
- Controller provides clean REST API with proper HTTP status codes

---
**Phase 3A Complete**: Backend Question storage infrastructure ready for frontend integration.
