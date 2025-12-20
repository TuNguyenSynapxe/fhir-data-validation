# Smart Path Navigation with Nearest Parent Fallback

## Feature Overview

When clicking on a validation error to navigate to its location in the bundle tree, the system now intelligently handles cases where the exact path doesn't exist by finding and opening the nearest valid parent path.

## Visual Indicators

The SmartPathBreadcrumb component now shows color-coded indicators:

- **Blue** (with Target icon): Path exists exactly - click to navigate directly
- **Red** (with AlertCircle icon): Path not found - click to navigate to nearest available parent
- **Tooltip**: Hovering over red paths shows which parent will be opened

## Implementation

### Core Components

**pathNavigation.ts** (`src/utils/pathNavigation.ts`):
- `validateJsonPointer()`: Checks if a JSON pointer exists in the bundle
- `findNearestValidPath()`: Finds the closest ancestor path that exists
- `canNavigate()`: Determines if navigation is possible

**SmartPathBreadcrumb.tsx**:
- Accepts `bundleJson` and `jsonPointer` props for path validation
- Shows blue/red color based on path existence
- Changes icon from Target → AlertCircle for invalid paths
- Displays helpful tooltip for invalid paths

**PlaygroundPage.tsx** (`handleNavigateToPath`):
- Calls `findNearestValidPath()` before navigation
- Navigates to nearest parent when exact path doesn't exist
- Shows user feedback message when navigating to parent

### Data Flow

```
ValidationError → SmartPathBreadcrumb
  ↓ (bundleJson + jsonPointer)
validateJsonPointer()
  ↓ (path exists?)
Display: Blue (valid) or Red (invalid)
  ↓ (user clicks)
handleNavigateToPath()
  ↓
findNearestValidPath()
  ↓
Navigate to: exact path or nearest parent
```

## Example Scenarios

### Scenario 1: Missing Field

**Error**: `Patient.birthDate is required.`
**Path**: `/entry/0/resource/birthDate`
**Actual**: `birthDate` field doesn't exist in Patient resource

**Behavior**:
- Breadcrumb shows: `Patient › birthDate` (RED with AlertCircle)
- Tooltip: "Path not found. Will navigate to nearest parent: /entry/0/resource"
- Click → Opens Patient resource in tree view
- User feedback: "Path not found. Navigated to nearest parent: /entry/0/resource"

### Scenario 2: Missing Extension

**Error**: `Extension valueCodeableConcept.coding is missing`
**Path**: `/entry/0/resource/extension/0/valueCodeableConcept/coding`
**Actual**: Patient has no `extension` array

**Behavior**:
- Breadcrumb shows path in RED
- Click → Opens Patient resource (nearest valid parent)
- User can see that `extension` doesn't exist

### Scenario 3: Array Index Out of Bounds

**Error**: Validation error on `/entry/5/resource/id`
**Actual**: Bundle only has 3 entries (indices 0-2)

**Behavior**:
- Breadcrumb shows in RED
- Click → Opens `entry` array in tree view
- User can see there are only 3 entries

### Scenario 4: Existing Path

**Error**: `Patient.gender must be one of: male, female, other, unknown`
**Path**: `/entry/0/resource/gender`
**Actual**: Path exists with value `"M"` (invalid)

**Behavior**:
- Breadcrumb shows: `Patient › gender` (BLUE with Target)
- Click → Opens exact path, highlights the field
- User can see the invalid value and fix it

## Algorithm

### Path Validation

```typescript
validateJsonPointer(bundleJson, jsonPointer):
  1. Parse bundle JSON
  2. Split pointer into segments: '/a/b/c' → ['a', 'b', 'c']
  3. Walk the object tree:
     - For objects: check if key exists
     - For arrays: check if index is valid
  4. Return true if path fully traversable, false otherwise
```

### Nearest Parent Finding

```typescript
findNearestValidPath(bundleJson, jsonPointer):
  1. If exact path exists → return { path, isExact: true }
  2. Remove last segment and validate parent
  3. Repeat until valid path found
  4. If no parent found → return root { path: '', isExact: false }
```

## Testing

**Test Coverage** (`pathNavigation.test.ts`):
- ✅ Validate existing paths
- ✅ Reject non-existent paths
- ✅ Handle empty/invalid inputs
- ✅ Handle array indices correctly
- ✅ Return exact path if exists
- ✅ Find nearest parent when path doesn't exist
- ✅ Handle deeply nested non-existent paths
- ✅ Return root for completely invalid paths
- ✅ Handle array index out of bounds
- ✅ Handle special characters (JSON pointer escaping)
- ✅ Handle nested arrays

**All 14 tests passing**

## Benefits

1. **Better UX**: Users can still navigate even when exact path doesn't exist
2. **Visual Feedback**: Color indicators immediately show path validity
3. **Context Awareness**: Opening nearest parent gives users context about what's missing
4. **Error Prevention**: No more "navigation failed" errors for missing paths
5. **Debugging Aid**: Helps users understand bundle structure and identify missing fields

## Future Enhancements

1. **Highlight Missing Segment**: Visual indicator in tree view showing which child is missing
2. **Auto-Expand to Path**: Expand tree to show where missing field should be
3. **Suggest Fix**: Button to add missing field with default value
4. **Path History**: Track navigation history for back/forward navigation
5. **Batch Navigation**: Navigate to multiple validation errors sequentially

## Related Files

- `src/utils/pathNavigation.ts` - Core utilities
- `src/utils/__tests__/pathNavigation.test.ts` - Tests
- `src/components/playground/Validation/SmartPathBreadcrumb.tsx` - Visual component
- `src/pages/PlaygroundPage.tsx` - Navigation handler
- `src/components/playground/Validation/IssueGroupCard.tsx` - Group display
- `src/components/playground/Validation/IssueCard.tsx` - Single issue display
- `src/components/playground/Validation/ValidationResultList.tsx` - Results list
