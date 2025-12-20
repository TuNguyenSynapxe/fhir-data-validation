# Rule Message Template System - Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                             │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                        RuleEditorModal.tsx                                │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Rule Form (type, path, params, severity)                           │ │
│  │  ┌─────────────────────────────────────────────────────────────┐   │ │
│  │  │           MessageEditor Component                            │   │ │
│  │  │  ┌──────────────────────────────────────────────────────┐   │   │ │
│  │  │  │  Textarea (editable message)                         │   │   │ │
│  │  │  │  "Patient.name.family is required."                  │   │   │ │
│  │  │  └──────────────────────────────────────────────────────┘   │   │ │
│  │  │                                                               │   │ │
│  │  │  Available Tokens: [resource] [path] [fullPath] [expected]  │   │ │
│  │  │                    (clickable buttons with tooltips)         │   │ │
│  │  │                                                               │   │ │
│  │  │  ┌──────────────────────────────────────────────────────┐   │   │ │
│  │  │  │  Live Preview:                                       │   │   │ │
│  │  │  │  "Patient.name.family is required."                  │   │   │ │
│  │  │  └──────────────────────────────────────────────────────┘   │   │ │
│  │  └─────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BUSINESS LOGIC LAYER                             │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                    ruleMessageTemplates.ts                                │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  generateDefaultMessage(context)                                   │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │  Input: RuleContext { resourceType, path, ruleType, ... }   │ │ │
│  │  │  Output: "{fullPath} is required."                           │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  resolveMessageTokens(template, context)                           │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │  Input: "{fullPath} is required."                            │ │ │
│  │  │  Context: { resourceType: "Patient", path: "name.family" }   │ │ │
│  │  │  Output: "Patient.name.family is required."                  │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  getAvailableTokens(ruleType)                                      │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │  Input: "FixedValue"                                         │ │ │
│  │  │  Output: [GLOBAL_TOKENS + FixedValue_TOKENS]                │ │ │
│  │  │    - { name: "resource", description: "...", example: "..." }│ │ │
│  │  │    - { name: "expected", description: "...", example: "..." }│ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA MODEL LAYER                                │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  Rule Interface                                                           │
│  {                                                                        │
│    id: string                    // "rule-1"                              │
│    type: string                  // "Required"                            │
│    resourceType: string          // "Patient"                             │
│    path: string                  // "name.family"                         │
│    severity: string              // "error"                               │
│    message: string               // "{fullPath} is required."             │
│    params?: Record<string, any>  // { min: 1, max: 5 }                   │
│    isMessageCustomized?: boolean // false = auto-gen, true = user-edited │
│  }                                                                        │
└──────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                              DATA FLOW
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  1. USER CREATES RULE                                                    │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  User selects: type="Required", path="name.family"
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  2. AUTO-GENERATION CHECK                                                │
│     isMessageCustomized = false  →  Generate default message             │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  Call: generateDefaultMessage({ resourceType, path, ruleType })
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  3. TEMPLATE SELECTION                                                   │
│     DEFAULT_MESSAGE_TEMPLATES["Required"]                                │
│     Returns: "{fullPath} is required."                                   │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  Template set in form state
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  4. DISPLAY IN EDITOR                                                    │
│     MessageEditor shows:                                                 │
│     - Textarea with "{fullPath} is required."                            │
│     - Token buttons for current rule type                                │
│     - Live preview (resolved)                                            │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  User clicks token or types
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  5. USER INTERACTION                                                     │
│     Options:                                                             │
│     a) Click token → Insert at cursor                                    │
│     b) Type freely → Edit message                                        │
│     c) Click reset → Regenerate default                                  │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  Any edit: isMessageCustomized = true
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  6. LIVE PREVIEW                                                         │
│     Call: resolveMessageTokens(message, context)                         │
│     Replace tokens with actual values                                    │
│     Show: "Patient.name.family is required."                             │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  User saves rule
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  7. PERSIST TO BACKEND                                                   │
│     Rule saved with:                                                     │
│     - message: "{fullPath} is required."                                 │
│     - isMessageCustomized: true/false                                    │
└─────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                           AUTO-GENERATION LOGIC
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  useEffect(() => {                                                       │
│    if (!isMessageCustomized && path) {                                   │
│      if (ruleTypeChanged OR pathChanged OR paramsChanged) {              │
│        message = generateDefaultMessage(context);                        │
│      }                                                                    │
│    }                                                                      │
│  }, [type, path, params, isMessageCustomized]);                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────┐         ┌──────────────────────┐
│  isMessageCustomized │         │  isMessageCustomized  │
│       = false        │         │       = true          │
│  (auto-generated)    │         │  (user-edited)        │
└──────────────────────┘         └──────────────────────┘
         │                                  │
         │ Change type/path/params          │ Change type/path/params
         ▼                                  ▼
  ✅ Message auto-updates            ❌ Message stays same
         │                                  │
         │                                  │ User clicks "Reset"
         │                                  ▼
         │                           Set isMessageCustomized = false
         │                           Regenerate default message
         │                                  │
         └──────────────────────────────────┘
                        │
                        ▼
              Auto-generation enabled


═══════════════════════════════════════════════════════════════════════════
                            TOKEN RESOLUTION
═══════════════════════════════════════════════════════════════════════════

Input Template:
┌─────────────────────────────────────────────────────────────────────────┐
│  "{fullPath} must be exactly \"{expected}\"."                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
Context:
┌─────────────────────────────────────────────────────────────────────────┐
│  {                                                                        │
│    resourceType: "Patient",                                              │
│    path: "gender",                                                       │
│    ruleType: "FixedValue",                                               │
│    severity: "error",                                                    │
│    params: { value: "male" }                                             │
│  }                                                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
Resolution Steps:
┌─────────────────────────────────────────────────────────────────────────┐
│  1. Replace {fullPath}  → "Patient.gender"                               │
│  2. Replace {expected}  → "male"                                         │
│  3. Remove unresolved tokens                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
Output:
┌─────────────────────────────────────────────────────────────────────────┐
│  "Patient.gender must be exactly \"male\"."                              │
└─────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                             COMPONENT TREE
═══════════════════════════════════════════════════════════════════════════

PlaygroundPage
  │
  └─ RightPanel
       │
       └─ RulesPanel
            │
            ├─ RuleList
            │    │
            │    └─ RuleGroup
            │         │
            │         └─ RuleRow
            │
            └─ RuleEditorModal  ← Opens when Add/Edit clicked
                 │
                 ├─ Rule Form Fields
                 │    ├─ Type dropdown
                 │    ├─ Path selector
                 │    ├─ Parameter fields
                 │    └─ Severity radio
                 │
                 └─ MessageEditor  ← Token system component
                      ├─ Textarea (editable)
                      ├─ Token buttons (clickable)
                      ├─ Tooltips (hover)
                      └─ Preview (live)


═══════════════════════════════════════════════════════════════════════════
                             SECURITY MODEL
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  Token Resolution Process                                                │
│                                                                           │
│  Input: "{fullPath} is {expression}"                                     │
│  Context: { expression: "${console.log('evil')}" }                       │
│                                                                           │
│  Step 1: String replacement ONLY                                         │
│    resolved = template.replace(/\{expression\}/g, String(value))         │
│                                                                           │
│  Step 2: NO eval(), NO Function(), NO template literals                  │
│    ✅ Safe: String(value) converts to literal string                     │
│    ❌ Unsafe: eval(value) would execute code                             │
│                                                                           │
│  Step 3: Remove unresolved tokens                                        │
│    resolved = resolved.replace(/\{[^}]+\}/g, '')                         │
│                                                                           │
│  Output: "Patient.name is $" (curly braces stripped, code not executed)  │
└─────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                          FILE DEPENDENCIES
═══════════════════════════════════════════════════════════════════════════

ruleMessageTemplates.ts
  │
  │ (exports)
  ├─ generateDefaultMessage()
  ├─ resolveMessageTokens()
  ├─ getAvailableTokens()
  ├─ GLOBAL_TOKENS
  ├─ RULE_TYPE_TOKENS
  └─ DEFAULT_MESSAGE_TEMPLATES
       │
       │ (imported by)
       ├─ MessageEditor.tsx
       │    │
       │    └─ (imported by)
       │         └─ RuleEditorModal.tsx
       │              │
       │              └─ (imported by)
       │                   └─ RulesPanel.tsx
       │                        │
       │                        └─ (imported by)
       │                             └─ RightPanel.tsx
       │                                  │
       │                                  └─ (imported by)
       │                                       └─ PlaygroundPage.tsx
       │
       └─ __tests__/ruleMessageTemplates.test.ts
            (29 test cases)


═══════════════════════════════════════════════════════════════════════════
