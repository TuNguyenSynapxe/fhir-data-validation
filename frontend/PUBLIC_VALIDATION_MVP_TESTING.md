# Public Validation MVP - Testing Guide

**Date:** 4 January 2026  
**Status:** MVP Ready for Testing  
**Features:** Anonymous validation, Project listing, Project-based validation

---

## 🚀 Quick Start

### Prerequisites

- .NET 8.0 SDK
- Node.js 18+ with npm
- PostgreSQL (for project data)

### 1. Start Backend API

```bash
cd backend/src/Pss.FhirProcessor.Playground.Api
dotnet run
```

Backend will start at: `http://localhost:5000`

### 2. Start Frontend

```bash
cd frontend
npm install  # First time only
npm run dev
```

Frontend will start at: `http://localhost:5173`

---

## 📋 Available Routes

### Public Validation Routes (MVP)

| Route | Description |
|-------|-------------|
| `/validate` | Anonymous FHIR bundle validation (no project rules) |
| `/public/projects` | List all published validation projects |
| `/public/projects/{slug}` | View project details and metadata |
| `/public/projects/{slug}/validate` | Validate bundle with project-specific rules |

### Existing Authoring Routes (Not MVP)

| Route | Description |
|-------|-------------|
| `/` | Project management (authoring) |
| `/projects/{projectId}/*` | Rule authoring playground |

---

## 🧪 Testing Scenarios

### Scenario 1: Anonymous Validation

**Route:** `/validate`

**Steps:**
1. Navigate to `http://localhost:5173/validate`
2. Click "Load Example" to populate sample FHIR bundle
3. Select FHIR Version (default: R4)
4. Select Validation Mode:
   - **Standard**: Runtime validation only
   - **Full**: Includes SpecHints (advisory)
5. Click "Validate Bundle"

**Expected Results:**
- Validation results grouped by enforcement:
  - **Must Fix** (red): STRUCTURE, FIRELY errors
  - **Recommended** (yellow): LINT, SPEC_HINT warnings
- Each issue shows:
  - Path (FHIRPath + JSON pointer)
  - Message
  - Explanation (if available)
  - Error code

**Test Data:**
```json
{
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "example",
        "identifier": [
          {
            "system": "http://example.org/mrn",
            "value": "12345"
          }
        ],
        "name": [
          {
            "family": "Doe",
            "given": ["John"]
          }
        ]
      }
    }
  ]
}
```

---

### Scenario 2: Browse Published Projects

**Route:** `/public/projects`

**Steps:**
1. Navigate to `http://localhost:5173/public/projects`
2. View list of published projects

**Expected Results:**
- Grid of project cards showing:
  - Project name
  - Description
  - Slug
  - Published date
- Click card to navigate to project details

**Prerequisites:**
- Database must have published projects
- Insert test data:
```sql
INSERT INTO projects (slug, name, description, ruleset_json, status, published_at)
VALUES (
    'sg-core-patient',
    'SG Core Patient Validation',
    'Validates patient resources against Singapore Core IG',
    '{
        "version": "1.0",
        "fhirVersion": "R4",
        "project": "sg-core-patient",
        "rules": [
            {
                "id": "patient-nric-required",
                "enforcement": "MUST_FIX",
                "ruleType": "RequiredField",
                "appliesToResourceType": "Patient",
                "appliesTo": "identifier.where(system='http://sg.gov.nric')",
                "message": "NRIC identifier is required",
                "hint": "Every patient must have an NRIC identifier"
            }
        ],
        "codeSystems": []
    }'::jsonb,
    'published',
    NOW()
);
```

---

### Scenario 3: View Project Details

**Route:** `/public/projects/{slug}`

**Steps:**
1. Navigate to `/public/projects/sg-core-patient`
2. View project metadata

**Expected Results:**
- Project header with:
  - Name
  - Description
  - Status (published)
  - Published date
- Metadata statistics:
  - Number of business rules
  - Number of code systems
  - FHIR version
- "Validate Bundle with This Project" CTA button
- Note explaining rules are applied during validation (raw rules NOT shown for security)

---

### Scenario 4: Project-Based Validation

**Route:** `/public/projects/{slug}/validate`

**Steps:**
1. Navigate to `/public/projects/sg-core-patient/validate`
2. See project banner at top showing:
   - Project name
   - Rule count
   - FHIR version
3. Click "Load Example" to populate bundle
4. Click "Validate Bundle"

**Expected Results:**
- Validation runs with project's business rules
- Results show both:
  - **Must Fix**: Structural errors + Business rule violations
  - **Recommended**: Lint + SpecHint warnings
- Banner confirms: "This validation will apply [Project Name]'s [N] business rules"

**Test Invalid Bundle:**
```json
{
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "example",
        "name": [
          {
            "family": "Doe",
            "given": ["John"]
          }
        ]
      }
    }
  ]
}
```
**Expected:** Rule violation for missing NRIC identifier (if project has such rule)

---

## 🔍 API Endpoints (Backend)

### Anonymous Validation
```bash
curl -X POST http://localhost:5000/api/validate \
  -H "Content-Type: application/json" \
  -d '{
    "bundleJson": "{...}",
    "fhirVersion": "R4",
    "validationMode": "standard"
  }'
```

### List Published Projects
```bash
curl http://localhost:5000/api/public/projects
```

### Get Project Details
```bash
curl http://localhost:5000/api/public/projects/sg-core-patient
```

### Validate with Project
```bash
curl -X POST http://localhost:5000/api/public/projects/sg-core-patient/validate \
  -H "Content-Type: application/json" \
  -d '{
    "bundleJson": "{...}",
    "fhirVersion": "R4",
    "validationMode": "standard"
  }'
```

---

## 🐛 Troubleshooting

### Frontend Build Errors

**Issue:** TypeScript errors in existing files (not public validation MVP)
```
src/playground/components/RuleSuggestion.tsx
src/components/ValidationPanel.tsx
```

**Solution:** These are pre-existing errors unrelated to MVP. Public validation pages are error-free.

**Workaround:** Use `npm run dev` (Vite ignores type errors in dev mode)

### Backend Not Running

**Issue:** 404 errors when calling API

**Solution:**
```bash
cd backend/src/Pss.FhirProcessor.Playground.Api
dotnet run
```
Verify: `http://localhost:5000/api/public/projects` returns JSON

### No Projects Found

**Issue:** `/public/projects` shows "No Published Projects"

**Solution:** Insert test data into PostgreSQL database (see Scenario 2 SQL above)

### CORS Errors

**Issue:** Cross-origin request blocked

**Solution:** Vite proxy is configured in `vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```
Ensure backend is running on port 5000.

---

## ✅ MVP Checklist

### Pages
- [x] `/validate` - Anonymous validation
- [x] `/public/projects` - Project listing
- [x] `/public/projects/{slug}` - Project details
- [x] `/public/projects/{slug}/validate` - Project validation

### Components
- [x] BundleEditor - Monaco JSON editor with parse error detection
- [x] ValidationResultPanel - Grouped results (Must Fix vs Recommended)
- [x] RuleList - Human-readable rule cards (no raw JSON)

### API Integration
- [x] POST `/api/validate` - Anonymous validation
- [x] GET `/api/public/projects` - List projects
- [x] GET `/api/public/projects/{slug}` - Get project
- [x] POST `/api/public/projects/{slug}/validate` - Project validation

### UX Requirements
- [x] No raw JSON blobs for rules
- [x] Clear separation: "What rules were applied" vs "What failed"
- [x] Grouped validation results by enforcement
- [x] Path display (FHIRPath + JSON pointer)
- [x] Example bundle loader
- [x] FHIR version selector
- [x] Validation mode selector (Standard/Full)

---

## 📝 Out of Scope (Not MVP)

- ❌ Authentication / OTP
- ❌ Rule authoring/editing
- ❌ AI suggestions
- ❌ Saving bundles
- ❌ Validation history
- ❌ Coverage analytics
- ❌ Draft project access (published only)

---

## 🎯 Next Steps

1. **Database Setup**: Create `projects` table and insert test data
2. **Integration Testing**: Test end-to-end validation flow
3. **Error Handling**: Verify graceful failures (404, 400, 500)
4. **Performance**: Test with large bundles (>100KB)
5. **Documentation**: API documentation (Swagger)

---

## 📞 Support

**Issues:** File in GitHub repository  
**Questions:** Slack #fhir-validation  
**Backend Docs:** `/backend/README.md`  
**Frontend Docs:** `/frontend/README.md`
