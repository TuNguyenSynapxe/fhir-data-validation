# Rule Message Templates - Quick Reference

## 🎯 Quick Start

### Basic Workflow
1. Open rule editor (Add/Edit rule)
2. See auto-generated message with tokens
3. Click tokens to insert or type freely
4. See live preview below
5. Click "Reset to default" anytime

---

## 📝 Global Tokens (All Rules)

```
{resource}    →  Patient
{path}        →  name.family
{fullPath}    →  Patient.name.family
{ruleType}    →  Required
{severity}    →  error
```

---

## 🔧 Rule-Specific Tokens

### FixedValue
```
{expected}    →  "male"
{actual}      →  "female"  (runtime)
```

### AllowedValues
```
{allowed}     →  "male", "female", "other"
{count}       →  3
{actual}      →  "unknown"  (runtime)
```

### Regex
```
{pattern}     →  ^[A-Z]\d$
{actual}      →  "ABC123"  (runtime)
```

### ArrayLength
```
{min}         →  1
{max}         →  5
{actual}      →  0  (runtime)
```

### CodeSystem
```
{system}      →  loinc.org
{code}        →  8867-4
{display}     →  Heart rate
```

### CustomFHIRPath
```
{expression}  →  name.exists()
{result}      →  false  (runtime)
```

---

## 📋 Default Templates

| Rule Type | Template |
|-----------|----------|
| **Required** | `{fullPath} is required.` |
| **FixedValue** | `{fullPath} must be exactly "{expected}".` |
| **AllowedValues** | `{fullPath} must be one of the allowed values.` |
| **Regex** | `{fullPath} does not match the required format.` |
| **ArrayLength** | `{fullPath} must contain between {min} and {max} items.` |
| **CodeSystem** | `{fullPath} must use a valid code from {system}.` |
| **CustomFHIRPath** | `{fullPath} does not meet the required condition.` |

---

## 💡 Examples

### Simple
```
{fullPath} is required.
→ Patient.name.family is required.
```

### With Expected Value
```
{fullPath} must be exactly "{expected}".
→ Patient.gender must be exactly "male".
```

### Custom Friendly
```
Please provide a valid {path} for the patient.
→ Please provide a valid birthDate for the patient.
```

### Detailed Error
```
{fullPath} expected "{expected}" but received "{actual}".
→ Patient.gender expected "male" but received "female".
```

---

## 🎨 UI Features

### Message Editor
- **Textarea**: Edit message freely
- **Tokens**: Click to insert at cursor
- **Tooltips**: Hover for token info
- **Preview**: See resolved message
- **Reset**: Return to default template

### Auto-Generation
- ✅ Generates on rule type change
- ✅ Generates on path change
- ✅ Generates on parameter change
- ❌ Stops when you edit manually
- ✅ Resumes when you click reset

---

## 🔒 Security Notes

- ✅ No code execution
- ✅ Safe string replacement only
- ✅ Unknown tokens removed silently
- ✅ Curly braces in values stripped

---

## ⚠️ Known Limitations

**Regex Patterns:**
- `{2}` in patterns becomes empty
- Use "required format" instead

**Object Values:**
- Shows `[object Object]`
- Use specific fields instead

**Nested Tokens:**
- `{outer{inner}}` not supported
- Use flat structure

---

## 🔄 Customization States

### Auto-Generated (Default)
```typescript
message: "{fullPath} is required."
isMessageCustomized: false
// Changes to rule → message updates
```

### User Customized
```typescript
message: "Date of birth is mandatory"
isMessageCustomized: true
// Changes to rule → message stays same
```

### Reset to Default
```typescript
// Click "Reset to default" button
isMessageCustomized: false
// Changes to rule → message updates again
```

---

## 📚 See Also

- **Full Documentation**: `RULE_MESSAGE_TEMPLATE_SYSTEM.md`
- **Implementation Details**: `RULE_MESSAGE_TEMPLATE_IMPLEMENTATION_SUMMARY.md`
- **Usage Examples**: `src/utils/__examples__/ruleMessageTemplates.examples.ts`
- **Tests**: `src/utils/__tests__/ruleMessageTemplates.test.ts`

---

**Quick Tip:** Hover over any token button to see what it resolves to!
