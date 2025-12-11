
# 06. Frontend Requirements — FHIR Processor V2

## 1. Overview
The frontend is a React application used by:
- Synapxe administrators (full access)
- Vendors (read-only access)

The UI provides:
- Bundle viewer
- Error analyzer
- Rule editor
- Playground for validation testing

---

## 2. Core Components

### 2.1 JSON Viewer
Requirements:
- Tree-based viewer
- Expand/collapse support
- Highlight specific JSON pointer
- Auto-scroll to target pointer
- Supports large Bundle files
- Must NOT mutate the bundle in UI

### 2.2 Error Helper Panel
Must display:
- Grouped errors (by source, severity, resourceType)
- Source icons: FHIR, Business, Reference, CodeMaster
- Clickable errors → jump to JSONViewer location
- Summary statistics

Each error card shows:
- ErrorCode
- Message
- Path (FHIRPath-like)
- ResourceType
- JSON pointer (internal)
- Severity

### 2.3 Smart Path Navigator UI
Converts backend navigation info into:
- breadcrumb UI
- clickable tree path
- immediate scrolling into viewer

### 2.4 Rule Editor
- Based on Monaco Editor
- JSON syntax highlighting
- Auto-format
- Validation using JSON Schema
- Side-by-side preview of rules
- Toggle between UI-based form editor vs raw JSON

### 2.5 Playground
Two modes:

#### Admin Mode
- Can upload bundle
- Can edit rules
- Can upload codes/codemaster
- Can re-run validation
- Can publish rules for vendor access

#### Vendor Mode
- Rules locked (read-only)
- Only bundle upload and validation allowed
- Clear disambiguation (badge: “Vendor Mode”)

---

## 3. UX Requirements
- Layout must support side-by-side panes
- Error panel collapsible
- Keyboard shortcuts:
  - Ctrl+Enter → Run validation
  - Ctrl+S → Save rules (admin only)
- JSON viewer must remain performant with bundles > 2MB
- Breadcrumb path always visible

---

## 4. API Integration
Frontend sends:

```
POST /api/validation
{
  bundle: {...},
  rules: {...},
  codes: {...},
  codemaster: {...}
}
```

Receives:
```
{
  errors: [...],
  summary: {...},
  navigation: {...}
}
```

---

## 5. Vendor Access Requirements
- No editing of rules.json
- Read-only CodeSystem / CodeMaster view
- Bundle upload allowed
- Validation results shown identically to admin mode

EOF
